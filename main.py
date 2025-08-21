# main.py
# Versiyon 3.5 - Video analizi: Deepgram birincil, YouTube transkript yedek; kalıcı kayıt (Supabase/SQLite)
import logging
import os
import io
import json
import re
import asyncio
import urllib.parse
from pathlib import Path
from typing import List, Optional
import tempfile
import time
import fitz
import requests
import yt_dlp
from openai import AsyncOpenAI
from dotenv import load_dotenv
import httpx
from fastapi.responses import StreamingResponse
from data.audio_db import get_all_audio_by_source, search_audio_chapters
from data.audio_db import get_audio_path_by_id
from data.audio_db import init_db as init_audio_db
from data.vector_db import get_vector_db, init_vector_db
from fastapi import FastAPI, HTTPException, Query, Depends, BackgroundTasks, Response
# CORS middleware import removed
from fastapi.responses import JSONResponse
from whoosh.index import open_dir, Index
from whoosh.qparser import MultifieldParser, AndGroup, QueryParser
from whoosh.searching import Searcher
from data.db import init_db, update_task, get_task, get_all_completed_analyses, save_ai_chat, get_ai_chat_by_slug, get_recent_ai_chats
from data.articles_db import get_all_articles_by_category, get_article_by_id
from data.articles_db import init_db as init_articles_db
from contextlib import asynccontextmanager
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound, CouldNotRetrieveTranscript
# Deepgram SDK (birincil transkripsiyon)
from deepgram import DeepgramClient, PrerecordedOptions

# --- Kurulum ve Global Yapılandırma ---
# .env dosyasını proje kökünden açıkça yükle (lokal çalışmada CWD farklarını engellemek için)
try:
    load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)
except Exception:
    load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Yapılandırma dosyasını import et
try:
    from config import *
    print_config()  # Debug bilgilerini yazdır
except ImportError:
    pass

def _sanitize_proxy_env():
    """Disable placeholder or invalid proxy vars to avoid DNS errors."""
    invalid_values = {"http://proxy.example.com:8080", "https://proxy.example.com:8080", "proxy.example.com", ""}
    for key in ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"]:
        val = os.environ.get(key)
        if val and any(x in val for x in invalid_values):
            os.environ.pop(key, None)
            logger.info(f"Proxy env temizlendi: {key}")

_sanitize_proxy_env()

# --- Lifespan Manager ---
from contextlib import asynccontextmanager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # trust_env=False => sistem proxy env değişkenlerini dikkate alma
    app.state.httpx_client = httpx.AsyncClient(trust_env=False)
    logger.info("httpx client başlatıldı.")
    yield
    await app.state.httpx_client.aclose()
    logger.info("httpx client kapatıldı.")

app = FastAPI(
    title="Mihmandar İlim Havuzu API",
    version="3.5",
    description="Tasavvufi eserlerde, makalelerde ve YouTube videolarında arama yapma API'si. Analiz geçmişi kalıcı veritabanında saklanır.",
    lifespan=lifespan
)
# Remove CORSMiddleware usage entirely
# Cache ve diğer ayarlar
ARTICLES_CACHE = {"data": None, "timestamp": 0}
BOOKS_CACHE = {"data": None, "timestamp": 0}

# Tekil global CORS middleware (herkese açık)
@app.middleware("http")
async def force_cors_headers(request, call_next):
    if request.method == "OPTIONS":
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Max-Age": "86400",
                "Access-Control-Expose-Headers": "*",
                "Vary": "Origin",
            },
        )
    try:
        response = await call_next(request)
    except Exception:
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Max-Age": "86400",
                "Access-Control-Expose-Headers": "*",
                "Vary": "Origin",
            },
        )
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Max-Age"] = "86400"
    response.headers["Access-Control-Expose-Headers"] = "*"
    response.headers["Vary"] = "Origin"
    return response

# DeepSeek client'ı oluştur (opsiyonel)
deepseek_client = AsyncOpenAI(base_url="https://api.deepseek.com", api_key=DEEPSEEK_API_KEY) if DEEPSEEK_API_KEY else None
# Deepgram client'ı oluştur (birincil)
deepgram_client = DeepgramClient(DEEPGRAM_API_KEY) if DEEPGRAM_API_KEY else None

# Database'leri başlat
init_db()  # qa_database.db + video_analyses (Supabase/SQLite)
try:
    init_articles_db()  # articles_database.db
except Exception:
    logger.exception("Makale veritabanı init başarısız oldu")
try:
    init_audio_db()  # audio_database.db
except Exception:
    logger.exception("Audio veritabanı init başarısız oldu")
try:
    init_vector_db()  # FAISS vector database
except Exception:
    logger.exception("Vector veritabanı init başarısız oldu")

# --- Yardımcı Fonksiyonlar ---
def get_whoosh_index():
    try:
        return open_dir(str(INDEX_DIR))
    except Exception as e:
        logger.error(f"Kritik Hata: Whoosh indeksi '{INDEX_DIR}' adresinde bulunamadı: {e}")
        raise HTTPException(status_code=503, detail="Arama servisi şu anda kullanılamıyor.")

def get_searcher(ix: Index = Depends(get_whoosh_index)) -> Searcher:
    return ix.searcher()

def format_time(seconds: float) -> str:
    minutes, seconds = divmod(int(seconds), 60)
    hours, minutes = divmod(minutes, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

def extract_video_id(url: str) -> Optional[str]:
    match = re.search(r"(?:v=|\/|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})", url)
    return match.group(1) if match else None

def download_audio_sync(url: str, task_id: str) -> bytes:
    temp_dir = tempfile.gettempdir()
    temp_filepath = os.path.join(temp_dir, f"{task_id}_audio.m4a")
    # Cookie dosyası (403 azaltmak için)
    cookies_path = Path(__file__).parent / "data" / "youtube-cookies.txt"
    
    # Proxy ayarları: placeholder olmayan değerleri kullan
    proxy_settings = {}
    for k in ('HTTP_PROXY','HTTPS_PROXY','http_proxy','https_proxy'):
        v = os.getenv(k)
        if v and 'proxy.example.com' not in v:
            proxy_settings['proxy'] = v
            break
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': temp_filepath,
        'quiet': True,
        'no_warnings': True,
        'noprogress': True,
        'noplaylist': True,
        'restrictfilenames': True,
        'geo_bypass': True,
        'geo_bypass_country': 'TR',
        'nocheckcertificate': True,
        'extractor_retries': 3,
        'fragment_retries': 3,
        'retries': 3,
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'web', 'ios', 'tv']
            }
        },
        **proxy_settings,  # Proxy varsa ekle
        **({'cookiefile': str(cookies_path)} if cookies_path.exists() else {}),
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Referer': 'https://www.youtube.com/',
            'Origin': 'https://www.youtube.com',
            'X-YouTube-Client-Name': '3',
            'X-YouTube-Client-Version': '17.31.35'
        },
    }
    
    # Retry mekanizması ile ses indirme
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Rate limiting - her istek arasında kısa bekleme
            if attempt > 0:
                wait_time = min(2 ** attempt, 10)  # Max 10 saniye
                logger.info(f"Ses indirme rate limiting: {wait_time} saniye bekleniyor...")
                time.sleep(wait_time)
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
            with open(temp_filepath, 'rb') as f:
                return f.read()
        except Exception as e:
            error_msg = str(e).lower()
            if any(bot_indicator in error_msg for bot_indicator in [
                "sign in to confirm you're not a bot",
                "bot",
                "captcha",
                "rate limit",
                "too many requests"
            ]) and attempt < max_retries - 1:
                logger.warning(f"Ses indirme sırasında bot koruması/rate limit tespit edildi, {attempt + 1}/{max_retries} deneme. Bekleniyor...")
                continue
            else:
                raise e
        finally:
            if os.path.exists(temp_filepath):
                os.remove(temp_filepath)

# Transkript alma yardımcı fonksiyonu (YouTube ücretsiz)
def fetch_youtube_transcript(video_id: str) -> list[dict]:
    preferred_langs = ["tr", "tr-TR", "tr_tr", "tr-TR", "tr"]
    try:
        transcripts = YouTubeTranscriptApi.list_transcripts(video_id)
        for lang in preferred_langs:
            try:
                t = transcripts.find_transcript([lang])
                return t.fetch()
            except (NoTranscriptFound, TranscriptsDisabled, CouldNotRetrieveTranscript):
                continue
        try:
            t = transcripts.find_manually_created_transcript(["en", "de", "ar"])
            return t.translate("tr").fetch()
        except Exception:
            pass
        try:
            t = transcripts.find_generated_transcript(["en", "de", "ar"])
            return t.translate("tr").fetch()
        except Exception:
            pass
    except (NoTranscriptFound, TranscriptsDisabled, CouldNotRetrieveTranscript):
        return []
    except Exception:
        return []
    return []

# YouTube API ile metadata alma (alternatif yöntem)
def get_video_metadata_via_api(video_id: str) -> Optional[dict]:
    """YouTube Data API v3 ile video metadata alma"""
    try:
        # YouTube Data API v3 endpoint
        api_url = f"https://www.googleapis.com/youtube/v3/videos"
        params = {
            'id': video_id,
            'key': os.getenv('YOUTUBE_API_KEY'),  # .env'den al
            'part': 'snippet,contentDetails,statistics'
        }
        
        response = requests.get(api_url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('items'):
                item = data['items'][0]
                snippet = item.get('snippet', {})
                return {
                    'title': snippet.get('title'),
                    'thumbnail': snippet.get('thumbnails', {}).get('high', {}).get('url'),
                    'description': snippet.get('description'),
                    'duration': item.get('contentDetails', {}).get('duration'),
                    'view_count': item.get('statistics', {}).get('viewCount')
                }
    except Exception as e:
        logger.warning(f"YouTube API ile metadata alma hatası: {e}")
    return None

# --- ANA İŞLEV ---
async def run_video_analysis(task_id: str, url: str):
    try:
        update_task(task_id, "processing", message="Video Bilgileri Alınıyor...")
        
        # Gelişmiş yt-dlp konfigürasyonu - bot korumasını aşmak için
        cookies_path = Path(__file__).parent / "data" / "youtube-cookies.txt"
        
        # Proxy ayarları: placeholder olmayan değerleri kullan
        proxy_settings = {}
        for k in ('HTTP_PROXY','HTTPS_PROXY','http_proxy','https_proxy'):
            v = os.getenv(k)
            if v and 'proxy.example.com' not in v:
                proxy_settings['proxy'] = v
                break
        
        ydl_opts = {
            'quiet': True,
            'skip_download': True,
            'no_warnings': True,
            'nocheckcertificate': True,
            'geo_bypass': True,
            'geo_bypass_country': 'TR',
            'extractor_retries': 3,
            'fragment_retries': 3,
            'retries': 3,
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'web', 'ios', 'tv']
                }
            },
            **proxy_settings,  # Proxy varsa ekle
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Referer': 'https://www.youtube.com/',
                'Origin': 'https://www.youtube.com',
                'X-YouTube-Client-Name': '3',
                'X-YouTube-Client-Version': '17.31.35'
            },
            **({'cookiefile': str(cookies_path)} if cookies_path.exists() else {}),
        }
        
        # Retry mekanizması ile metadata alma
        metadata = None
        max_retries = 3
        for attempt in range(max_retries + 1):
            try:
                # Rate limiting - her istek arasında kısa bekleme
                if attempt > 0:
                    wait_time = min(2 ** attempt, 10)  # Max 10 saniye
                    logger.info(f"Rate limiting: {wait_time} saniye bekleniyor...")
                    await asyncio.sleep(wait_time)
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    metadata = await asyncio.to_thread(ydl.extract_info, url, download=False)
                break  # Başarılı olursa döngüden çık
            except Exception as e:
                error_msg = str(e).lower()
                if any(bot_indicator in error_msg for bot_indicator in [
                    "sign in to confirm you're not a bot",
                    "bot",
                    "captcha",
                    "rate limit",
                    "too many requests",
                    "failed to extract any player response"
                ]) and attempt < max_retries:
                    logger.warning(f"Bot koruması/rate limit tespit edildi, {attempt + 1}/{max_retries} deneme. Bekleniyor...")
                    continue
                else:
                    # yt-dlp başarısız olursa YouTube API'yi dene
                    video_id = extract_video_id(url)
                    if video_id:
                        logger.info("yt-dlp başarısız, YouTube API deneniyor...")
                        api_metadata = get_video_metadata_via_api(video_id)
                        if api_metadata:
                            metadata = api_metadata
                            logger.info("YouTube API ile metadata alındı")
                            break
                    raise e
        
        if not metadata:
            raise RuntimeError("Video metadata alınamadı")
            
        video_title = metadata.get("title")
        thumbnail = metadata.get("thumbnail")

        chapters: list[str] = []
        transcript: list[dict] = []

        # 1) Deepgram (birincil)
        if deepgram_client and DEEPGRAM_API_KEY:
            try:
                update_task(task_id, "processing", message="Ses indiriliyor...")
                audio_content = await asyncio.to_thread(download_audio_sync, url, task_id)
                update_task(task_id, "processing", message="Deepgram ile transkripsiyon...")
                try:
                    options = PrerecordedOptions(model="nova-2", language="tr", smart_format=True, utterances=True)
                    # Deepgram SDK senkron çalışıyor; bloklamamak için thread'e al
                    def _dg_transcribe():
                        return deepgram_client.listen.prerecorded.v("1").transcribe_file({"buffer": audio_content}, options)
                    dg_response = await asyncio.to_thread(_dg_transcribe)
                    utterances = (dg_response.results.utterances or []) if getattr(dg_response, 'results', None) else []
                    # Utterances varsa doğrudan başlıklar oluştur
                    chunk_text = ""
                    start_time = 0.0
                    for i, utt in enumerate(utterances):
                        if not chunk_text:
                            start_time = getattr(utt, 'start', 0.0) or 0.0
                        chunk_text += " " + (getattr(utt, 'transcript', '') or '')
                        end_time = getattr(utt, 'end', start_time) or start_time
                        if (end_time - start_time) >= 120 or (i == len(utterances) - 1 and chunk_text.strip()):
                            if deepseek_client:
                                comp_res = await deepseek_client.chat.completions.create(
                                    model="deepseek-chat",
                                    messages=[
                                        {"role": "system", "content": "Verilen metnin ana konusunu özetleyen 4-6 kelimelik kısa bir başlık oluştur."},
                                        {"role": "user", "content": chunk_text.strip()}
                                    ],
                                    max_tokens=20
                                )
                                title = comp_res.choices[0].message.content.strip().replace('"', '')
                            else:
                                words = chunk_text.strip().split()
                                title = " ".join(words[:6]) if words else "Başlık"
                            # Zaman formatı
                            m, s = divmod(int(start_time), 60)
                            h, m = divmod(m, 60)
                            chapters.append(f"**{h:02d}:{m:02d}:{s:02d}** - {title}")
                            chunk_text = ""
                    # Deepgram başarılı ise transcript oluşturmayı atlayabiliriz
                except Exception as e:
                    logger.warning(f"Deepgram transkripsiyon hatası, YouTube transkriptine düşülecek: {e}")
                    chapters = []  # sıfırla ve fallback'e izin ver
            except Exception as e:
                logger.warning(f"Ses indirilemedi, YouTube transkriptine düşülecek: {e}")
                chapters = []
        else:
            logger.info("Deepgram yapılandırılmamış; YouTube transkript fallback kullanılacak.")

        # 2) Fallback: YouTube Transcript
        if not chapters:
            update_task(task_id, "processing", message="Transkript Alınıyor (YouTube)...")
            transcript = fetch_youtube_transcript(task_id) or fetch_youtube_transcript(extract_video_id(url) or "")
            if not transcript:
                raise RuntimeError("Bu video için transkript bulunamadı.")
            update_task(task_id, "processing", message="Başlıklar Oluşturuluyor...")
            chunk_text = ""
            start_time = 0.0
            last_start = 0.0
            for item in transcript:
                if not chunk_text:
                    start_time = item.get("start", 0.0)
                chunk_text += " " + item.get("text", "")
                last_start = item.get("start", start_time)
                duration = item.get("duration", 0.0)
                if (last_start - start_time) + duration >= 120:
                    if deepseek_client:
                        comp_res = await deepseek_client.chat.completions.create(
                            model="deepseek-chat",
                            messages=[
                                {"role": "system", "content": "Verilen metnin ana konusunu özetleyen 4-6 kelimelik kısa bir başlık oluştur."},
                                {"role": "user", "content": chunk_text.strip()}
                            ],
                            max_tokens=20
                        )
                        title = comp_res.choices[0].message.content.strip().replace('"', '')
                    else:
                        words = chunk_text.strip().split()
                        title = " ".join(words[:6]) if words else "Başlık"
                    m, s = divmod(int(start_time), 60)
                    h, m = divmod(m, 60)
                    chapters.append(f"**{h:02d}:{m:02d}:{s:02d}** - {title}")
                    chunk_text = ""
            if chunk_text.strip():
                if deepseek_client:
                    comp_res = await deepseek_client.chat.completions.create(
                        model="deepseek-chat",
                        messages=[
                            {"role": "system", "content": "Verilen metnin ana konusunu özetleyen 4-6 kelimelik kısa bir başlık oluştur."},
                            {"role": "user", "content": chunk_text.strip()}
                        ],
                        max_tokens=20
                    )
                    title = comp_res.choices[0].message.content.strip().replace('"', '')
                else:
                    words = chunk_text.strip().split()
                    title = " ".join(words[:6]) if words else "Başlık"
                m, s = divmod(int(start_time), 60)
                h, m = divmod(m, 60)
                chapters.append(f"**{h:02d}:{m:02d}:{s:02d}** - {title}")

        result = {"title": video_title, "thumbnail": thumbnail, "chapters": chapters}
        update_task(task_id, "completed", result=result)
        logger.info(f"[{task_id}] Analiz başarıyla tamamlandı ve kalıcı veritabanına kaydedildi.")

    except Exception as e:
        logger.error(f"[{task_id}] Görev sırasında HATA oluştu: {e}", exc_info=True)
        update_task(task_id, "error", message=f"Analiz sırasında bir hata oluştu: {str(e)}")

# --- API Endpoints ---
@app.get("/")
async def read_root():
    return {"message": "Mihmandar API v3.5 Aktif"}

# OPTIONS handler kaldırıldı
@app.post("/analyze/start")
async def start_analysis(background_tasks: BackgroundTasks, url: str = Query(..., description="Analiz edilecek YouTube video URL'si")):
    # Anahtar zorunluluğu kaldırıldı: Deepgram yoksa YouTube transkript fallback kullanılacak
      
    video_id = extract_video_id(url)
    if not video_id: raise HTTPException(status_code=400, detail="Geçersiz YouTube URL'si.")
      
    task_id = video_id
    existing_task = get_task(task_id)
    if existing_task and existing_task['status'] == 'completed':
        return JSONResponse(status_code=200, content={"task_id": task_id, "message": "Bu video daha önce analiz edilmiş.", "result": existing_task['result']})
      
    update_task(task_id, "processing", message="Görev Başlatılıyor...")
    background_tasks.add_task(run_video_analysis, task_id, url)
    return JSONResponse(status_code=202, content={"task_id": task_id, "message": "Analiz başlatıldı."})
# ... Diğer tüm endpointleriniz ...
@app.get("/search/all")
async def search_all(q: str, authors: Optional[List[str]] = Query(None), searcher: Searcher = Depends(get_searcher)):
    def _search():
        parser = MultifieldParser(["title", "content", "author"], schema=searcher.schema, group=AndGroup)
        query_parts = [f"({q.lower()})"]
        if authors:
            author_filter = " OR ".join([f'author:"{a.lower()}"' for a in authors])
            query_parts.append(f"({author_filter})")
        final_query_str = " AND ".join(query_parts)
        parsed_query = parser.parse(final_query_str)
        results = searcher.search(parsed_query, limit=150)
        formatted_results = []
        for hit in results:
            result_type = hit.get('type')
            if result_type == 'book':
                formatted_results.append({
                    "type": "book", "kitap": hit["title"], "yazar": hit["author"],
                    "sayfa": hit["page_or_id"], "alinti": hit.highlights("content") or hit.get("content", "")[:300],
                    "pdf_dosyasi": hit["source"]
                })
            elif result_type == 'article':
                formatted_results.append({
                    "type": "article", "id": hit["page_or_id"], "baslik": hit["title"],
                    "yazar": hit["author"], "kategori": hit["category"], "url": hit["source"],
                    "alinti": hit.highlights("content") or hit.get("content", "")[:300]
                })
        return {"sonuclar": formatted_results}
    return await asyncio.to_thread(_search)
@app.get("/articles/by-category")
async def list_articles_by_category():
    now = time.time()
    if ARTICLES_CACHE["data"] and (now - ARTICLES_CACHE["timestamp"] < CACHE_TTL):
        return ARTICLES_CACHE["data"]
    data = get_all_articles_by_category()
    ARTICLES_CACHE["data"] = data
    ARTICLES_CACHE["timestamp"] = now
    return data
@app.get("/article/{article_id}")
async def read_article(article_id: int):
    article = get_article_by_id(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Makale bulunamadı.")
    return article

@app.get("/articles/paginated")
async def get_articles_paginated(
    page: int = Query(1, ge=1, description="Sayfa numarası"),
    limit: int = Query(12, ge=1, le=50, description="Sayfa başına makale sayısı"),
    search: str = Query("", description="Arama terimi"),
    category: str = Query("", description="Kategori filtresi")
):
    """
    Sayfalanmış makale listesi döndürür
    """
    try:
        from data.articles_db import get_articles_paginated
        
        result = get_articles_paginated(
            page=page,
            limit=limit,
            search_term=search,
            category=category
        )
        
        return {
            "articles": result["articles"],
            "total_articles": result["total"],
            "total_pages": result["total_pages"],
            "current_page": page,
            "per_page": limit,
            "has_next": page < result["total_pages"],
            "has_prev": page > 1
        }
        
    except Exception as e:
        logger.error(f"Sayfalanmış makaleler alınırken hata: {e}")
        raise HTTPException(status_code=500, detail="Makaleler alınamadı")
@app.get("/authors")
async def get_all_authors(searcher: Searcher = Depends(get_searcher)):
    def _get_authors():
        all_authors = {f['author'].title() for f in searcher.all_stored_fields() if 'author' in f and f['author']}
        return {"authors": sorted(list(all_authors))}
    return await asyncio.to_thread(_get_authors)
@app.get("/books_by_author")
async def get_books_by_author():
    now = time.time()
    if BOOKS_CACHE["data"] and (now - BOOKS_CACHE["timestamp"] < CACHE_TTL):
        return BOOKS_CACHE["data"]
    try:
        with open(DATA_DIR / "book_metadata.json", 'r', encoding='utf-8') as f:
            all_books = json.load(f)
      
        books_by_author_data = {}
        for book_info in all_books:
            author = book_info['author']
            if author not in books_by_author_data:
                books_by_author_data[author] = []
          
            # PDF URL'sini oluştur (Backblaze'den erişim için)
            pdf_url = None
            if PDF_BASE_URL:
                pdf_url = f"{PDF_BASE_URL}/{book_info['pdf_file']}"
            
            books_by_author_data[author].append({
                "kitap_adi": book_info['book'],
                "pdf_dosyasi": book_info['pdf_file'],
                "pdf_url": pdf_url,  # Backblaze URL'si eklendi
                "toplam_sayfa": book_info['total_pages']
            })
        response_data = {"kutuphane": [
            {"yazar": author, "kitaplar": books} for author, books in sorted(books_by_author_data.items())
        ]}
        BOOKS_CACHE["data"] = response_data
        BOOKS_CACHE["timestamp"] = now
        return response_data
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Kitap verileri hazır değil.")
    except Exception as e:
        logger.error(f"Kitap listesi işlenirken hata: {e}")
        raise HTTPException(status_code=500, detail="Kitap listesi işlenemedi.")
@app.get("/search/analyses")
async def search_analyses(q: str, response: Response):
    if not q.strip(): return {"sonuclar": []}
    
    # CORS header'ları kaldırıldı; global middleware zaten ekliyor
    history = get_all_completed_analyses()
    q_lower = q.lower()
    matching_analyses = []
    for video_id, data in history.items():
        if not isinstance(data, dict): continue
        title = data.get("title", "")
        chapters = data.get("chapters", [])
        chapters_text = " ".join(chapters)
        if q_lower in title.lower() or q_lower in chapters_text.lower():
            matching_analyses.append({
                "video_id": video_id, "title": title,
                "thumbnail": data.get("thumbnail"), "chapters": chapters
            })
    return {"sonuclar": matching_analyses}
@app.get("/pdf/info")
async def get_pdf_info(pdf_file: str):
    try:
        # Önce yerel PDF'i kontrol et
        pdf_path = PDF_DIR / urllib.parse.unquote(pdf_file)
        
        if pdf_path.is_file():
            # Yerel PDF varsa onu kullan
            with fitz.open(pdf_path) as doc: 
                return {"total_pages": len(doc)}
        
        elif PDF_BASE_URL:
            # Yerel PDF yoksa Backblaze'den indir
            import tempfile
            import requests
            
            pdf_url = f"{PDF_BASE_URL}/{urllib.parse.unquote(pdf_file)}"
            logger.info(f"PDF bilgisi için Backblaze'den indiriliyor: {pdf_url}")
            
            response = requests.get(pdf_url, timeout=30)
            response.raise_for_status()
            
            # Geçici dosya oluştur
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
            temp_file.write(response.content)
            temp_file.close()
            
            try:
                with fitz.open(temp_file.name) as doc:
                    return {"total_pages": len(doc)}
            finally:
                # Geçici dosyayı sil
                if os.path.exists(temp_file.name):
                    os.unlink(temp_file.name)
        else:
            raise HTTPException(status_code=404, detail=f"PDF bulunamadı ve PDF_BASE_URL ayarlanmamış.")
            
    except Exception as e:
        logger.error(f"PDF bilgisi alınırken hata: {e}")
        raise HTTPException(status_code=500, detail="PDF bilgisi alınamadı.")
@app.get("/books/list")
async def get_all_books():
    """Tüm kitapları PDF URL'leri ile birlikte listeler"""
    try:
        with open(DATA_DIR / "book_metadata.json", 'r', encoding='utf-8') as f:
            all_books = json.load(f)
        
        books_with_urls = []
        for book_info in all_books:
            book_data = {
                "id": len(books_with_urls) + 1,
                "title": book_info['book'],
                "author": book_info['author'],
                "pdf_file": book_info['pdf_file'],
                "total_pages": book_info['total_pages']
            }
            
            # PDF URL'sini ekle
            if PDF_BASE_URL:
                book_data["pdf_url"] = f"{PDF_BASE_URL}/{book_info['pdf_file']}"
                book_data["pdf_download_url"] = f"/pdf/access?pdf_file={urllib.parse.quote(book_info['pdf_file'])}"
            
            books_with_urls.append(book_data)
        
        return {
            "total_books": len(books_with_urls),
            "books": books_with_urls
        }
        
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Kitap verileri hazır değil.")
    except Exception as e:
        logger.error(f"Kitap listesi alınırken hata: {e}")
        raise HTTPException(status_code=500, detail="Kitap listesi alınamadı.")

@app.get("/pdf/access")
async def access_pdf_from_backblaze(pdf_file: str):
    """PDF dosyasına Backblaze'den doğrudan erişim sağlar"""
    if not PDF_BASE_URL:
        raise HTTPException(status_code=404, detail="PDF_BASE_URL ayarlanmamış.")
    
    try:
        pdf_url = f"{PDF_BASE_URL}/{urllib.parse.unquote(pdf_file)}"
        logger.info(f"PDF erişimi için Backblaze'den indiriliyor: {pdf_url}")
        
        # PDF'i Backblaze'den indir
        response = requests.get(pdf_url, timeout=30)
        response.raise_for_status()
        
        # PDF içeriğini döndür
        return Response(
            content=response.content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename={pdf_file}"}
        )
        
    except requests.exceptions.RequestException as e:
        logger.error(f"PDF indirilemedi {pdf_file}: {e}")
        raise HTTPException(status_code=404, detail="PDF bulunamadı veya erişilemedi.")
    except Exception as e:
        logger.error(f"PDF erişiminde hata: {e}")
        raise HTTPException(status_code=500, detail="PDF erişiminde hata oluştu.")

@app.get("/pdf/page_image")
def get_page_image(pdf_file: str, page_num: int = Query(..., gt=0)):
    try:
        # Önce yerel PDF'i kontrol et
        pdf_path = PDF_DIR / urllib.parse.unquote(pdf_file)
        
        if pdf_path.is_file():
            # Yerel PDF varsa onu kullan
            with fitz.open(pdf_path) as doc:
                if not (0 < page_num <= len(doc)): raise HTTPException(status_code=400, detail="Geçersiz sayfa.")
                page = doc.load_page(page_num - 1)
                pix = page.get_pixmap(dpi=150)
                return StreamingResponse(io.BytesIO(pix.tobytes("png")), media_type="image/png")
        
        elif PDF_BASE_URL:
            # Yerel PDF yoksa Backblaze'den indir
            import tempfile
            import requests
            
            pdf_url = f"{PDF_BASE_URL}/{urllib.parse.unquote(pdf_file)}"
            logger.info(f"PDF Backblaze'den indiriliyor: {pdf_url}")
            
            response = requests.get(pdf_url, timeout=30)
            response.raise_for_status()
            
            # Geçici dosya oluştur
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
            temp_file.write(response.content)
            temp_file.close()
            
            try:
                with fitz.open(temp_file.name) as doc:
                    if not (0 < page_num <= len(doc)): raise HTTPException(status_code=400, detail="Geçersiz sayfa.")
                    page = doc.load_page(page_num - 1)
                    pix = page.get_pixmap(dpi=150)
                    return StreamingResponse(io.BytesIO(pix.tobytes("png")), media_type="image/png")
            finally:
                # Geçici dosyayı sil
                if os.path.exists(temp_file.name):
                    os.unlink(temp_file.name)
        else:
            raise HTTPException(status_code=404, detail=f"PDF bulunamadı ve PDF_BASE_URL ayarlanmamış.")
            
    except Exception as e:
        logger.error(f"PDF sayfa resmi işlenirken hata: {e}")
        raise HTTPException(status_code=500, detail="Sayfa resmi işlenirken hata oluştu.")

@app.get("/pdf/page_text")
def get_page_text(pdf_file: str, page_num: int = Query(..., gt=0)):
    """Belirtilen PDF sayfasının düz metnini döndürür."""
    try:
        import tempfile, requests
        # Önce yerel PDF
        pdf_path = PDF_DIR / urllib.parse.unquote(pdf_file)
        if pdf_path.is_file():
            with fitz.open(pdf_path) as doc:
                if not (0 < page_num <= len(doc)):
                    raise HTTPException(status_code=400, detail="Geçersiz sayfa.")
                page = doc.load_page(page_num - 1)
                return {"text": page.get_text("text") or ""}
        # Backblaze
        if not PDF_BASE_URL:
            raise HTTPException(status_code=404, detail="PDF bulunamadı.")
        pdf_url = f"{PDF_BASE_URL}/{urllib.parse.unquote(pdf_file)}"
        resp = requests.get(pdf_url, timeout=30)
        resp.raise_for_status()
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        tmp.write(resp.content); tmp.close()
        try:
            with fitz.open(tmp.name) as doc:
                if not (0 < page_num <= len(doc)):
                    raise HTTPException(status_code=400, detail="Geçersiz sayfa.")
                page = doc.load_page(page_num - 1)
                return {"text": page.get_text("text") or ""}
        finally:
            try:
                os.unlink(tmp.name)
            except Exception:
                pass
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF sayfa metni alınamadı {pdf_file}: {e}")
        raise HTTPException(status_code=500, detail="PDF sayfa metni alınamadı.")
@app.get("/search/videos")
async def search_videos(q: str):
    if not YOUTUBE_API_KEYS:
        # YouTube API anahtarları yoksa boş sonuç döndür (503 yerine graceful degrade)
        return {"sonuclar": []}
    all_videos, channels = [], ["UCvhlPtV-1MgZBQPmGjomhsA", "UCfYG6Ij2vIJXXplpottv02Q", "UC0FN4XBgk2Isvv1QmrbFn8w"]
    for channel_id in channels:
        for api_key in YOUTUBE_API_KEYS:
            params = {"part": "snippet", "q": q, "type": "video", "maxResults": 6, "key": api_key, "channelId": channel_id}
            try:
                response = requests.get("https://www.googleapis.com/youtube/v3/search", params=params, timeout=5)
                if response.status_code == 200:
                    for item in response.json().get("items", []):
                        snippet, video_id = item.get("snippet", {}), item.get("id", {}).get("videoId")
                        if snippet and video_id: all_videos.append({"id": video_id, "title": snippet.get("title"), "thumbnail": snippet.get("thumbnails", {}).get("high", {}).get("url"), "channel": snippet.get("channelTitle"), "publishedTime": snippet.get("publishedAt")})
                    break
                elif response.status_code == 403: continue
            except requests.RequestException: break
    return {"sonuclar": all_videos}
@app.get("/analyze/status/{task_id}")
async def get_analysis_status(task_id: str):
    task = get_task(task_id)
    if not task: raise HTTPException(status_code=404, detail="Görev bulunamadı.")
    return task
# ★★★ ANA DEĞİŞİKLİK BURADA ★★★
@app.get("/analysis_history")
async def get_analysis_history(response: Response):
    """
    Tüm tamamlanmış analizleri getirir ve sunucu tarafı önbelleklemesini engeller.
    """
    # CORS header'ları kaldırıldı; global middleware zaten ekliyor
    
    # Bu başlıklar, Vercel/Railway gibi platformlara bu cevabı asla önbelleğe almamasını söyler.
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
  
    return get_all_completed_analyses()
  
@app.get("/audio/all")
async def list_all_audio_analyses():
    """Tüm analiz edilmiş ses kayıtlarını kaynağa göre gruplayarak listeler."""
    return await asyncio.to_thread(get_all_audio_by_source)
@app.get("/audio/file/{file_name}")
async def stream_audio_from_b2(file_name: str):
    """
    Dosya adını alır, Backblaze URL'sini oluşturur ve sesi stream eder.
    Bu, Railway sunucusu üzerinden bir proxy görevi görür.
    """
    if not AUDIO_BASE_URL:
        raise HTTPException(status_code=503, detail="Ses sunucusu yapılandırılmamış.")

    # URL encode the filename to handle special characters
    import urllib.parse
    encoded_filename = urllib.parse.quote(file_name, safe='')
    remote_url = f"{AUDIO_BASE_URL.rstrip('/')}/{encoded_filename}"
    
    logger.info(f"Streaming audio from: {remote_url}")
    client: httpx.AsyncClient = app.state.httpx_client

    try:
        # HEAD isteği ile önce dosya bilgilerini alıyoruz
        head_resp = await client.head(remote_url)
        head_resp.raise_for_status()

        headers = {
            "Content-Length": head_resp.headers.get("Content-Length"),
            "Accept-Ranges": "bytes",
            "Content-Type": head_resp.headers.get("Content-Type", "audio/mpeg"),
        }

        async def stream_generator():
            async with client.stream("GET", remote_url) as response:
                async for chunk in response.aiter_bytes():
                    yield chunk
        
        return StreamingResponse(stream_generator(), headers=headers)

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP Status Error for {remote_url}: {e.response.status_code}")
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Dosya bulunamadı: {file_name}")
        else:
            raise HTTPException(status_code=e.response.status_code, detail="Stream sırasında sunucu hatası.")
    except Exception as e:
        logger.error(f"Stream hatası for {file_name}: {e}")
        raise HTTPException(status_code=500, detail="Stream sırasında beklenmedik bir hata oluştu.")
@app.get("/search/audio")
async def search_audio(q: str):
    """Konu başlıkları içinde metinsel arama yapar."""
    results = await asyncio.to_thread(search_audio_chapters, q)
    return {"sonuclar": results}
# *** BU ENDPOINT'İ ESKİSİYLE DEĞİŞTİRİN ***
@app.get("/audio/stream/{audio_id}")
async def stream_audio_file_by_id(audio_id: int):
    """Veritabanından ID'ye göre dosya yolunu bulur ve stream eder."""
  
    # Veritabanından bu ID'ye karşılık gelen mp3_path'i al
    relative_path = await asyncio.to_thread(get_audio_path_by_id, audio_id)
  
    if not relative_path:
        raise HTTPException(status_code=404, detail="Ses dosyası kaydı veritabanında bulunamadı.")
    full_path = BASE_DIR / relative_path
    if not full_path.is_file():
        raise HTTPException(status_code=404, detail=f"Ses dosyası diskte bulunamadı: {relative_path}")
  
    def iterfile():
        with open(full_path, mode="rb") as file_like:
            yield from file_like
    return StreamingResponse(iterfile(), media_type="audio/mpeg")

# --- Mobile App API Endpoints ---

@app.get("/cities")
async def get_cities():
    """Türkiye'nin tüm il ve ilçelerini döndürür"""
    cities_data = {
        "cities": [
            {
                "id": 1,
                "name": "Adana",
                "districts": ["Seyhan", "Yüreğir", "Çukurova", "Sarıçam", "Aladağ", "Ceyhan", "Feke", "İmamoğlu", "Karaisalı", "Karataş", "Kozan", "Pozantı", "Saimbeyli", "Tufanbeyli", "Yumurtalık"]
            },
            {
                "id": 6,
                "name": "Ankara",
                "districts": ["Altındağ", "Ayaş", "Bala", "Beypazarı", "Çamlıdere", "Çankaya", "Çubuk", "Elmadağ", "Etimesgut", "Evren", "Gölbaşı", "Güdül", "Haymana", "Kalecik", "Kızılcahamam", "Mamak", "Nallıhan", "Polatlı", "Pursaklar", "Sincan", "Şereflikoçhisar", "Yenimahalle"]
            },
            {
                "id": 7,
                "name": "Antalya",
                "districts": ["Akseki", "Aksu", "Alanya", "Demre", "Döşemealtı", "Elmalı", "Finike", "Gazipaşa", "Gündoğmuş", "İbradı", "Kaş", "Kemer", "Kepez", "Konyaaltı", "Korkuteli", "Kumluca", "Manavgat", "Muratpaşa", "Serik"]
            },
            {
                "id": 34,
                "name": "İstanbul",
                "districts": ["Adalar", "Arnavutköy", "Ataşehir", "Avcılar", "Bağcılar", "Bahçelievler", "Bakırköy", "Başakşehir", "Bayrampaşa", "Beşiktaş", "Beykoz", "Beylikdüzü", "Beyoğlu", "Büyükçekmece", "Çatalca", "Çekmeköy", "Esenler", "Esenyurt", "Eyüpsultan", "Fatih", "Gaziosmanpaşa", "Güngören", "Kadıköy", "Kağıthane", "Kartal", "Küçükçekmece", "Maltepe", "Pendik", "Sancaktepe", "Sarıyer", "Silivri", "Sultanbeyli", "Sultangazi", "Şile", "Şişli", "Tuzla", "Ümraniye", "Üsküdar", "Zeytinburnu"]
            },
            {
                "id": 35,
                "name": "İzmir",
                "districts": ["Aliağa", "Balçova", "Bayındır", "Bayraklı", "Bergama", "Beydağ", "Bornova", "Buca", "Çeşme", "Çiğli", "Dikili", "Foça", "Gaziemir", "Güzelbahçe", "Karabağlar", "Karaburun", "Karşıyaka", "Kemalpaşa", "Kınık", "Kiraz", "Konak", "Menderes", "Menemen", "Narlıdere", "Ödemiş", "Seferihisar", "Selçuk", "Tire", "Torbalı", "Urla"]
            }
        ]
    }
    return cities_data

from typing import Optional

@app.get("/prayer-times")
async def get_prayer_times(city: str = "", district: str = "", latitude: Optional[float] = None, longitude: Optional[float] = None):
    """Belirtilen şehir/ilçe için namaz vakitlerini canlı kaynaktan döndürür (önce vakit.vercel.app, başarısızsa Aladhan/Diyanet)."""
    import datetime as _dt
    from zoneinfo import ZoneInfo

    client: httpx.AsyncClient = app.state.httpx_client

    def _normalize_tr_name(text: str) -> str:
        if not text:
            return text
        mapping = str.maketrans({
            "İ": "I", "I": "I", "ı": "i",
            "Ğ": "G", "ğ": "g",
            "Ş": "S", "ş": "s",
            "Ö": "O", "ö": "o",
            "Ü": "U", "ü": "u",
            "Ç": "C", "ç": "c",
        })
        return text.translate(mapping)

    def _clean(t: str | None) -> str | None:
        if not t:
            return None
        return t.split(" ")[0].strip()

    def _compute_next(times: dict[str, Optional[str]], tz_name: str):
        now = _dt.datetime.now(ZoneInfo(tz_name))
        order = [
            ("İmsak", times.get("imsak")),
            ("Güneş", times.get("gunes")),
            ("Öğle", times.get("ogle")),
            ("İkindi", times.get("ikindi")),
            ("Akşam", times.get("aksam")),
            ("Yatsı", times.get("yatsi")),
        ]
        next_name = next_time_str = None
        remaining_minutes = None
        for name, t in order:
            if not t:
                continue
            hh, mm = [int(x) for x in t.split(":")[:2]]
            candidate = now.replace(hour=hh, minute=mm, second=0, microsecond=0)
            if candidate >= now:
                next_name = name
                next_time_str = f"{hh:02d}:{mm:02d}"
                remaining_minutes = int((candidate - now).total_seconds() // 60)
                break
        if next_name is None and times.get("imsak"):
            hh, mm = [int(x) for x in times["imsak"].split(":")[:2]]
            tomorrow = (now + _dt.timedelta(days=1)).replace(hour=hh, minute=mm, second=0, microsecond=0)
            next_name = "İmsak"
            next_time_str = f"{hh:02d}:{mm:02d}"
            remaining_minutes = int((tomorrow - now).total_seconds() // 60)
        return next_name, next_time_str, remaining_minutes

    # 0) Eğer GPS verisi verildiyse doğrudan Vakit: timesForGPS → Aladhan byCoordinates fallback
    if latitude is not None and longitude is not None:
        try:
            tz_name_guess = "Europe/Istanbul"
            tz_now = _dt.datetime.now(ZoneInfo(tz_name_guess))
            offset_minutes = int(tz_now.utcoffset().total_seconds() // 60) if tz_now.utcoffset() else 180
            today = _dt.date.today().isoformat()

            timesgps_url = "https://vakit.vercel.app/api/timesForGPS"
            tg_params = {
                "lat": latitude,
                "lng": longitude,
                "date": today,
                "days": 1,
                "timezoneOffset": offset_minutes,
                "calculationMethod": "Turkey",
                "lang": "tr",
            }
            rg = await client.get(timesgps_url, params=tg_params, timeout=15)
            rg.raise_for_status()
            payload = rg.json()
            items = payload.get("times") or payload.get("data") or []
            first = (items[0] if isinstance(items, list) and items else items) or {}
            fajr = first.get("fajr") or first.get("imsak") or first.get("Fajr")
            sunrise = first.get("sunrise") or first.get("gunes") or first.get("Sunrise")
            dhuhr = first.get("dhuhr") or first.get("ogle") or first.get("Dhuhr")
            asr = first.get("asr") or first.get("ikindi") or first.get("Asr")
            maghrib = first.get("maghrib") or first.get("aksam") or first.get("Maghrib")
            isha = first.get("isha") or first.get("yatsi") or first.get("Isha")

            times_clean = {
                "imsak": _clean(fajr),
                "gunes": _clean(sunrise),
                "ogle": _clean(dhuhr),
                "ikindi": _clean(asr),
                "aksam": _clean(maghrib),
                "yatsi": _clean(isha),
            }
            next_name, next_time_str, remaining_minutes = _compute_next(times_clean, tz_name_guess)
            return {
                "date": first.get("date") or today,
                "city": city,
                "district": district,
                "times": times_clean,
                "next_prayer": {
                    "name": next_name,
                    "time": next_time_str,
                    "remaining_minutes": remaining_minutes,
                },
                "timezone": tz_name_guess,
                "source": "vakit.vercel.app:gps-direct",
            }
        except Exception as e:
            logger.warning(f"GPS ile Vakit başarısız, Aladhan/coords'a düşülüyor: {e}")
            try:
                api_url = "https://api.aladhan.com/v1/timings"
                params = {"latitude": latitude, "longitude": longitude, "method": 13}
                r = await client.get(api_url, params=params, timeout=15)
                r.raise_for_status()
                payload = r.json()
                if payload.get("code") != 200:
                    raise RuntimeError(f"Servis hatası: {payload.get('status')}")
                data = payload.get("data", {})
                timings = data.get("timings", {})
                tz_name = (data.get("meta", {}) or {}).get("timezone") or "Europe/Istanbul"
                mapping = {
                    "imsak": timings.get("Fajr"),
                    "gunes": timings.get("Sunrise"),
                    "ogle": timings.get("Dhuhr"),
                    "ikindi": timings.get("Asr"),
                    "aksam": timings.get("Maghrib"),
                    "yatsi": timings.get("Isha"),
                }
                clean_times = {k: _clean(v) for k, v in mapping.items()}
                next_name, next_time_str, remaining_minutes = _compute_next(clean_times, tz_name)
                now = _dt.datetime.now(ZoneInfo(tz_name))
                return {
                    "date": data.get("date", {}).get("gregorian", {}).get("date") or now.strftime("%Y-%m-%d"),
                    "city": city,
                    "district": district,
                    "times": clean_times,
                    "next_prayer": {
                        "name": next_name,
                        "time": next_time_str,
                        "remaining_minutes": remaining_minutes,
                    },
                    "timezone": tz_name,
                    "source": "aladhan:coords",
                }
            except Exception as e2:
                logger.error(f"GPS ile de namaz vakitleri alınamadı: {e2}")
                raise HTTPException(status_code=500, detail="Namaz vakitleri alınamadı (GPS)")

    # 1) Vakit API (https://vakit.vercel.app/)
    try:
        today = _dt.date.today().isoformat()
        # Bölge/şehir eşlemesi: district yoksa region=city, city=city
        region = _normalize_tr_name(city)
        city_name = _normalize_tr_name(district or city)
        # Istanbul gibi TR saat dilimi: dakika offset'i
        tz_name_guess = "Europe/Istanbul"
        tz_now = _dt.datetime.now(ZoneInfo(tz_name_guess))
        offset_minutes = int(tz_now.utcoffset().total_seconds() // 60) if tz_now.utcoffset() else 180

        vakit_url = "https://vakit.vercel.app/api/timesFromPlace"
        vakit_params = {
            "country": "Turkey",
            "region": region,
            "city": city_name,
            "date": today,
            "days": 1,
            "timezoneOffset": offset_minutes,
            "calculationMethod": "Turkey",
            "lang": "tr",
        }
        r = await client.get(vakit_url, params=vakit_params, timeout=15)
        r.raise_for_status()
        payload = r.json()

        # Beklenen yapı: { times: [ { date, fajr/sunrise/dhuhr/asr/maghrib/isha ... } ], place: {...} }
        items = payload.get("times") or payload.get("data") or []
        first = (items[0] if isinstance(items, list) and items else items) or {}
        # Anahtar olasılıkları
        fajr = first.get("fajr") or first.get("imsak") or first.get("Fajr")
        sunrise = first.get("sunrise") or first.get("gunes") or first.get("Sunrise")
        dhuhr = first.get("dhuhr") or first.get("ogle") or first.get("Dhuhr")
        asr = first.get("asr") or first.get("ikindi") or first.get("Asr")
        maghrib = first.get("maghrib") or first.get("aksam") or first.get("Maghrib")
        isha = first.get("isha") or first.get("yatsi") or first.get("Isha")

        times_clean = {
            "imsak": _clean(fajr),
            "gunes": _clean(sunrise),
            "ogle": _clean(dhuhr),
            "ikindi": _clean(asr),
            "aksam": _clean(maghrib),
            "yatsi": _clean(isha),
        }
        next_name, next_time_str, remaining_minutes = _compute_next(times_clean, tz_name_guess)
        return {
            "date": first.get("date") or today,
            "city": city,
            "district": district,
            "times": times_clean,
            "next_prayer": {
                "name": next_name,
                "time": next_time_str,
                "remaining_minutes": remaining_minutes,
            },
            "timezone": tz_name_guess,
            "source": "vakit.vercel.app",
        }
    except Exception as e:
        logger.warning(f"Vakit API başarısız, Aladhan'a düşülüyor: {e}")

    # 1b) Alternatif: Coordinates + timesForGPS (Vakit)
    try:
        today = _dt.date.today().isoformat()
        region = _normalize_tr_name(city)
        city_name = _normalize_tr_name(district or city)
        tz_name_guess = "Europe/Istanbul"
        tz_now = _dt.datetime.now(ZoneInfo(tz_name_guess))
        offset_minutes = int(tz_now.utcoffset().total_seconds() // 60) if tz_now.utcoffset() else 180

        coords_url = "https://vakit.vercel.app/api/coordinates"
        coords_params = {"country": "Turkey", "region": region, "city": city_name, "lang": "tr"}
        rc = await client.get(coords_url, params=coords_params, timeout=15)
        rc.raise_for_status()
        coords = rc.json() or {}
        lat = coords.get("lat") or coords.get("latitude")
        lng = coords.get("lng") or coords.get("longitude")
        if lat is None or lng is None:
            raise RuntimeError("Koordinatlar bulunamadı")

        timesgps_url = "https://vakit.vercel.app/api/timesForGPS"
        tg_params = {
            "lat": lat,
            "lng": lng,
            "date": today,
            "days": 1,
            "timezoneOffset": offset_minutes,
            "calculationMethod": "Turkey",
            "lang": "tr",
        }
        rg = await client.get(timesgps_url, params=tg_params, timeout=15)
        rg.raise_for_status()
        payload = rg.json()
        items = payload.get("times") or payload.get("data") or []
        first = (items[0] if isinstance(items, list) and items else items) or {}
        fajr = first.get("fajr") or first.get("imsak") or first.get("Fajr")
        sunrise = first.get("sunrise") or first.get("gunes") or first.get("Sunrise")
        dhuhr = first.get("dhuhr") or first.get("ogle") or first.get("Dhuhr")
        asr = first.get("asr") or first.get("ikindi") or first.get("Asr")
        maghrib = first.get("maghrib") or first.get("aksam") or first.get("Maghrib")
        isha = first.get("isha") or first.get("yatsi") or first.get("Isha")

        times_clean = {
            "imsak": _clean(fajr),
            "gunes": _clean(sunrise),
            "ogle": _clean(dhuhr),
            "ikindi": _clean(asr),
            "aksam": _clean(maghrib),
            "yatsi": _clean(isha),
        }
        next_name, next_time_str, remaining_minutes = _compute_next(times_clean, tz_name_guess)
        return {
            "date": first.get("date") or today,
            "city": city,
            "district": district,
            "times": times_clean,
            "next_prayer": {
                "name": next_name,
                "time": next_time_str,
                "remaining_minutes": remaining_minutes,
            },
            "timezone": tz_name_guess,
            "source": "vakit.vercel.app:gps",
        }
    except Exception as e:
        logger.warning(f"Vakit GPS akışı da başarısız: {e}")

    # 1c) Alternatif: Place ID ile timesForPlace
    try:
        today = _dt.date.today().isoformat()
        region = _normalize_tr_name(city)
        city_name = _normalize_tr_name(district or city)
        tz_name_guess = "Europe/Istanbul"
        tz_now = _dt.datetime.now(ZoneInfo(tz_name_guess))
        offset_minutes = int(tz_now.utcoffset().total_seconds() // 60) if tz_now.utcoffset() else 180

        # Önce coordinates -> place id
        coords_url = "https://vakit.vercel.app/api/coordinates"
        coords_params = {"country": "Turkey", "region": region, "city": city_name, "lang": "tr"}
        rc = await client.get(coords_url, params=coords_params, timeout=15)
        rc.raise_for_status()
        coords = rc.json() or {}
        lat = coords.get("lat") or coords.get("latitude")
        lng = coords.get("lng") or coords.get("longitude")
        if lat is None or lng is None:
            raise RuntimeError("Koordinatlar bulunamadı")

        place_url = "https://vakit.vercel.app/api/place"
        rp = await client.get(place_url, params={"lat": lat, "lng": lng, "lang": "tr"}, timeout=15)
        rp.raise_for_status()
        place = rp.json() or {}
        place_id = place.get("id") or place.get("placeId") or place.get("placeID")
        if not place_id:
            raise RuntimeError("Place ID alınamadı")

        times_place_url = "https://vakit.vercel.app/api/timesForPlace"
        tp = await client.get(times_place_url, params={"id": place_id, "timezoneOffset": offset_minutes, "lang": "tr"}, timeout=15)
        tp.raise_for_status()
        payload = tp.json()
        items = payload.get("times") or payload.get("data") or []
        first = (items[0] if isinstance(items, list) and items else items) or {}
        fajr = first.get("fajr") or first.get("imsak") or first.get("Fajr")
        sunrise = first.get("sunrise") or first.get("gunes") or first.get("Sunrise")
        dhuhr = first.get("dhuhr") or first.get("ogle") or first.get("Dhuhr")
        asr = first.get("asr") or first.get("ikindi") or first.get("Asr")
        maghrib = first.get("maghrib") or first.get("aksam") or first.get("Maghrib")
        isha = first.get("isha") or first.get("yatsi") or first.get("Isha")

        times_clean = {
            "imsak": _clean(fajr),
            "gunes": _clean(sunrise),
            "ogle": _clean(dhuhr),
            "ikindi": _clean(asr),
            "aksam": _clean(maghrib),
            "yatsi": _clean(isha),
        }
        next_name, next_time_str, remaining_minutes = _compute_next(times_clean, tz_name_guess)
        return {
            "date": first.get("date") or today,
            "city": city,
            "district": district,
            "times": times_clean,
            "next_prayer": {
                "name": next_name,
                "time": next_time_str,
                "remaining_minutes": remaining_minutes,
            },
            "timezone": tz_name_guess,
            "source": "vakit.vercel.app:place",
        }
    except Exception as e:
        logger.warning(f"Vakit Place akışı da başarısız: {e}")

    # 2) Fallback: Aladhan (Diyanet method=13)
    try:
        api_url = "https://api.aladhan.com/v1/timingsByCity"
        params = {"city": _normalize_tr_name(city), "country": "Turkey", "method": 13}
        r = await client.get(api_url, params=params, timeout=15)
        r.raise_for_status()
        payload = r.json()
        if payload.get("code") != 200:
            raise RuntimeError(f"Servis hatası: {payload.get('status')}")
        data = payload.get("data", {})
        timings = data.get("timings", {})
        meta = data.get("meta", {})
        tz_name = (meta.get("timezone") or "Europe/Istanbul")
        mapping = {
            "imsak": timings.get("Fajr"),
            "gunes": timings.get("Sunrise"),
            "ogle": timings.get("Dhuhr"),
            "ikindi": timings.get("Asr"),
            "aksam": timings.get("Maghrib"),
            "yatsi": timings.get("Isha"),
        }
        clean_times = {k: _clean(v) for k, v in mapping.items()}
        next_name, next_time_str, remaining_minutes = _compute_next(clean_times, tz_name)
        now = _dt.datetime.now(ZoneInfo(tz_name))
        return {
            "date": data.get("date", {}).get("gregorian", {}).get("date") or now.strftime("%Y-%m-%d"),
            "city": city,
            "district": district,
            "times": clean_times,
            "next_prayer": {
                "name": next_name,
                "time": next_time_str,
                "remaining_minutes": remaining_minutes,
            },
            "timezone": tz_name,
            "source": "aladhan",
        }
    except Exception as e:
        logger.error(f"Namaz vakitleri alınırken hata: {e}")
        raise HTTPException(status_code=500, detail="Namaz vakitleri alınamadı")

@app.get("/qibla-direction")
async def get_qibla_direction(latitude: float, longitude: float):
    """Verilen koordinatlar için kıble yönünü hesaplar"""
    try:
        import math
        
        # Kâbe koordinatları
        kaaba_lat = 21.4225
        kaaba_lon = 39.8262
        
        # Radyana çevir
        lat1 = math.radians(latitude)
        lat2 = math.radians(kaaba_lat)
        delta_lon = math.radians(kaaba_lon - longitude)
        
        # Kıble açısını hesapla
        y = math.sin(delta_lon) * math.cos(lat2)
        x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(delta_lon)
        
        # Açıyı dereceye çevir
        bearing = math.atan2(y, x)
        bearing = math.degrees(bearing)
        bearing = (bearing + 360) % 360
        
        return {
            "qibla_direction": round(bearing, 2),
            "latitude": latitude,
            "longitude": longitude,
            "distance_to_kaaba_km": round(
                6371 * math.acos(
                    math.sin(lat1) * math.sin(lat2) + 
                    math.cos(lat1) * math.cos(lat2) * math.cos(delta_lon)
                ), 2
            )
        }
        
    except Exception as e:
        logger.error(f"Kıble yönü hesaplanırken hata: {e}")
        raise HTTPException(status_code=500, detail="Kıble yönü hesaplanamadı")

# === SOHBET (CHAT) ENDPOINTS ===

from pydantic import BaseModel
from typing import Dict, Any

class ChatMessage(BaseModel):
    message: str
    session_id: str = "default"
    context: Dict[str, Any] = {}

class ChatResponse(BaseModel):
    response: str
    sources: List[Dict[str, Any]] = []
    session_id: str
    confidence: float = 0.0
    processing_time: float = 0.0

@app.post("/chat/message", response_model=ChatResponse)
async def chat_message(chat_request: ChatMessage):
    """
    Ana sohbet endpoint'i - DeepSeek API ile RAG sistemi
    """
    start_time = time.time()
    
    try:
        if not deepseek_client:
            raise HTTPException(status_code=500, detail="DeepSeek API yapılandırılmamış")
        
        # Kullanıcı mesajını temizle ve hazırla
        user_message = chat_request.message.strip()
        if not user_message:
            raise HTTPException(status_code=400, detail="Mesaj boş olamaz")
        
        # RAG sistemi ile ilgili kaynakları ara
        relevant_sources = await search_relevant_content(user_message)
        
        # DeepSeek için context oluştur
        context_text = build_context_from_sources(relevant_sources)
        
        # DeepSeek API çağrısı
        system_prompt = """
Sen Mihmandar Asistanı'sın. Tasavvuf, İslami ilimler ve manevi konularda uzman bir danışmansın.

Görevin:
1. Kullanıcının sorularını anlayıp, verilen kaynaklardan yararlanarak kapsamlı cevaplar vermek
2. Cevaplarını Türkçe, saygılı ve bilge bir üslupla sunmak
3. Kaynaklara atıf yapmak ve güvenilir bilgiler vermek
4. Manevi rehberlik yaparken İslami değerlere uygun davranmak

Kurallar:
- Sadece verilen kaynaklardaki bilgileri kullan
- Kaynak belirtmeden bilgi verme
- Kısa ve öz cevaplar yerine, doyurucu açıklamalar yap
- Konuyu aydınlatan, öğretici bir yaklaşım benimse
"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Kaynak bilgiler:\n{context_text}\n\nSoru: {user_message}"}
        ]
        
        # DeepSeek API çağrısı
        response = await deepseek_client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            max_tokens=2000,
            temperature=0.7,
            top_p=0.9,
            stream=False
        )
        
        assistant_response = response.choices[0].message.content
        processing_time = time.time() - start_time
        
        # Confidence score hesapla (basit heuristik)
        confidence = calculate_response_confidence(assistant_response, relevant_sources)
        
        # AI sohbet geçmişini Supabase'e kaydet
        try:
            sources_for_save = [{
                "id": src.get("id"),
                "title": src.get("title"),
                "type": src.get("type"),
                "author": src.get("author"),
                "score": src.get("score")
            } for src in relevant_sources]
            
            slug = save_ai_chat(user_message, assistant_response, sources_for_save)
            logger.info(f"AI sohbet kaydedildi: {slug}")
        except Exception as e:
            logger.error(f"AI sohbet kaydetme hatası: {e}")
        
        return ChatResponse(
            response=assistant_response,
            sources=relevant_sources,
            session_id=chat_request.session_id,
            confidence=confidence,
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        processing_time = time.time() - start_time
        
        # Fallback response
        return ChatResponse(
            response="Üzgünüm, şu anda size yardımcı olamıyorum. Lütfen daha sonra tekrar deneyin.",
            sources=[],
            session_id=chat_request.session_id,
            confidence=0.0,
            processing_time=processing_time
        )

async def search_relevant_content(query: str, max_results: int = 10) -> List[Dict[str, Any]]:
    """
    FAISS vektör veritabanı ve diğer kaynaklarda anlamsal arama
    """
    sources = []
    
    try:
        # FAISS vektör veritabanında anlamsal arama (birincil)
        try:
            vector_db = get_vector_db()
            vector_results = vector_db.search(query, k=max_results)
            
            for result in vector_results:
                # Vektör sonuçlarını standart formata çevir
                source = {
                    "id": result.get("source_id", ""),
                    "type": result.get("source_type", ""),
                    "title": result.get("title", ""),
                    "author": result.get("author", ""),
                    "content": result.get("content", ""),
                    "page": result.get("page_number"),
                    "url": result.get("url"),
                    "timestamp": result.get("timestamp"),
                    "score": result.get("similarity", 0.0),
                    "search_method": "vector_semantic"
                }
                sources.append(source)
            
            logger.info(f"Vector search returned {len(vector_results)} results")
            
        except Exception as e:
            logger.warning(f"Vector search error: {e}")
            
            # Fallback: Whoosh ile geleneksel arama
            try:
                ix = get_whoosh_index()
                with ix.searcher() as searcher:
                    parser = MultifieldParser(["content", "title", "author"], ix.schema)
                    query_obj = parser.parse(query)
                    results = searcher.search(query_obj, limit=max_results)
                    
                    for result in results:
                        source = {
                            "id": result.get("id", ""),
                            "type": "book" if result.get("type") == "book" else "article",
                            "title": result.get("title", ""),
                            "author": result.get("author", ""),
                            "content": result.get("content", "")[:500] + "...",
                            "page": result.get("page"),
                            "score": result.score * 0.8,  # Vektör aramadan düşük skor
                            "search_method": "whoosh_fallback"
                        }
                        sources.append(source)
                
                logger.info(f"Whoosh fallback returned {len(results)} results")
                
            except Exception as whoosh_error:
                logger.error(f"Whoosh fallback also failed: {whoosh_error}")
        
        # Ek aramalar (vektör aramayı tamamlamak için)
        if len(sources) < max_results:
            # Audio veritabanında ara
            try:
                audio_results = search_audio_chapters(query)
                for audio in audio_results[:3]:  # En fazla 3 ses kaydı
                    # Duplicate check
                    if not any(s.get("id") == str(audio.get("id")) and s.get("type") == "audio" for s in sources):
                        source = {
                            "id": str(audio.get("id")),
                            "type": "audio",
                            "title": audio.get("title", ""),
                            "author": audio.get("speaker", ""),
                            "content": audio.get("description", "")[:300] + "...",
                            "timestamp": audio.get("timestamp"),
                            "score": 0.6,  # Düşük skor (keyword match)
                            "search_method": "audio_keyword"
                        }
                        sources.append(source)
            except Exception as e:
                logger.warning(f"Audio search error: {e}")
            
            # Video analizlerinde ara
            try:
                analyses = get_all_completed_analyses()
                for analysis in analyses[:2]:  # En fazla 2 video analizi
                    if query.lower() in analysis.get("summary", "").lower():
                        # Duplicate check
                        if not any(s.get("id") == analysis.get("task_id") and s.get("type") == "video" for s in sources):
                            source = {
                                "id": analysis.get("task_id"),
                                "type": "video",
                                "title": analysis.get("title", "Video Analizi"),
                                "content": analysis.get("summary", "")[:400] + "...",
                                "url": analysis.get("url"),
                                "score": 0.5,  # Düşük skor (keyword match)
                                "search_method": "video_keyword"
                            }
                            sources.append(source)
            except Exception as e:
                logger.warning(f"Video analysis search error: {e}")
    
    except Exception as e:
        logger.error(f"Search error: {e}")
    
    # Score'a göre sırala ve en iyi sonuçları döndür
    sources.sort(key=lambda x: x.get("score", 0), reverse=True)
    return sources[:max_results]

def build_context_from_sources(sources: List[Dict[str, Any]]) -> str:
    """
    Kaynaklardan context metni oluştur
    """
    if not sources:
        return "İlgili kaynak bulunamadı."
    
    context_parts = []
    
    for i, source in enumerate(sources[:5], 1):  # En fazla 5 kaynak
        source_type = source.get("type", "unknown")
        title = source.get("title", "Başlıksız")
        author = source.get("author", "Bilinmeyen Yazar")
        content = source.get("content", "")
        
        if source_type == "book":
            page_info = f" (Sayfa {source.get('page')})" if source.get('page') else ""
            context_parts.append(f"[{i}] Kitap: {title} - {author}{page_info}\n{content}")
        elif source_type == "article":
            context_parts.append(f"[{i}] Makale: {title} - {author}\n{content}")
        elif source_type == "audio":
            timestamp_info = f" ({source.get('timestamp')})" if source.get('timestamp') else ""
            context_parts.append(f"[{i}] Ses Kaydı: {title} - {author}{timestamp_info}\n{content}")
        elif source_type == "video":
            context_parts.append(f"[{i}] Video Analizi: {title}\n{content}")
    
    return "\n\n".join(context_parts)

def calculate_response_confidence(response: str, sources: List[Dict[str, Any]]) -> float:
    """
    Cevabın güvenilirlik skorunu hesapla
    """
    if not response or not sources:
        return 0.0
    
    # Basit heuristikler
    confidence = 0.5  # Base confidence
    
    # Kaynak sayısına göre artır
    confidence += min(len(sources) * 0.1, 0.3)
    
    # Cevap uzunluğuna göre artır
    if len(response) > 200:
        confidence += 0.1
    if len(response) > 500:
        confidence += 0.1
    
    # Kaynak referansları varsa artır
    if "[" in response and "]" in response:
        confidence += 0.1
    
    return min(confidence, 1.0)

# --- AI History Endpoints ---

@app.get("/ai-history/recent")
async def get_recent_ai_history(limit: int = Query(20, ge=1, le=100)):
    """Son AI sohbetlerini getir"""
    try:
        chats = get_recent_ai_chats(limit)
        return {
            "status": "success",
            "data": chats,
            "count": len(chats)
        }
    except Exception as e:
        logger.error(f"AI geçmişi getirme hatası: {e}")
        raise HTTPException(status_code=500, detail="AI geçmişi getirilemedi")

@app.get("/ai-history/{slug}")
async def get_ai_chat_by_slug_endpoint(slug: str):
    """Slug ile AI sohbet geçmişini getir"""
    try:
        chat = get_ai_chat_by_slug(slug)
        if not chat:
            raise HTTPException(status_code=404, detail="Sohbet bulunamadı")
        
        return {
            "status": "success",
            "data": chat
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI sohbet getirme hatası: {e}")
        raise HTTPException(status_code=500, detail="Sohbet getirilemedi")

@app.get("/sohbet/{slug}")
async def get_chat_page_by_slug(slug: str):
    """SEO uyumlu sohbet sayfası için endpoint"""
    try:
        chat = get_ai_chat_by_slug(slug)
        if not chat:
            raise HTTPException(status_code=404, detail="Sohbet bulunamadı")
        
        # SEO için meta bilgiler ekle
        meta_description = chat['question'][:150] + "..." if len(chat['question']) > 150 else chat['question']
        
        return {
            "status": "success",
            "data": {
                "chat": chat,
                "meta": {
                    "title": f"{chat['question']} - Mihmandar AI",
                    "description": meta_description,
                    "keywords": "mihmandar, ai, sohbet, tasavvuf, islam",
                    "canonical_url": f"/sohbet/{slug}"
                }
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sohbet sayfası getirme hatası: {e}")
        raise HTTPException(status_code=500, detail="Sohbet sayfası getirilemedi")

@app.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    """
    Sohbet geçmişini getir (gelecekte implement edilecek)
    """
    # TODO: Veritabanından sohbet geçmişini getir
    return {"session_id": session_id, "messages": [], "message": "Sohbet geçmişi henüz implement edilmedi"}

@app.delete("/chat/history/{session_id}")
async def clear_chat_history(session_id: str):
    """
    Sohbet geçmişini temizle (gelecekte implement edilecek)
    """
    # TODO: Veritabanından sohbet geçmişini sil
    return {"session_id": session_id, "message": "Sohbet geçmişi temizlendi"}

@app.get("/chat/vector-stats")
async def get_vector_database_stats():
    """
    Vektör veritabanı istatistikleri
    """
    try:
        vector_db = get_vector_db()
        stats = vector_db.get_stats()
        return {
            "status": "success",
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Vector stats error: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

@app.post("/chat/vector-search")
async def vector_search_endpoint(request: dict):
    """
    Doğrudan vektör arama endpoint'i
    """
    try:
        query = request.get("query", "")
        k = request.get("k", 10)
        source_types = request.get("source_types")
        
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        vector_db = get_vector_db()
        results = vector_db.search(query, k=k, source_types=source_types)
        
        return {
            "status": "success",
            "query": query,
            "results": results,
            "count": len(results)
        }
        
    except Exception as e:
        logger.error(f"Vector search endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/add-to-vector-db")
async def add_documents_to_vector_db(request: dict):
    """
    Vektör veritabanına yeni belgeler ekle
    """
    try:
        documents = request.get("documents", [])
        
        if not documents:
            raise HTTPException(status_code=400, detail="Documents are required")
        
        vector_db = get_vector_db()
        vector_ids = vector_db.add_documents(documents)
        
        return {
            "status": "success",
            "added_count": len(vector_ids),
            "vector_ids": vector_ids
        }
        
    except Exception as e:
        logger.error(f"Add documents error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class AdvancedChatRequest(BaseModel):
    message: str
    session_id: str = "default"
    context: Dict[str, Any] = {}
    use_vector_search: bool = True
    max_sources: int = 5
    source_types: Optional[List[str]] = None
    temperature: float = 0.7
    max_tokens: int = 2000

@app.post("/chat/advanced", response_model=ChatResponse)
async def advanced_chat_message(chat_request: AdvancedChatRequest):
    """
    Gelişmiş sohbet endpoint'i - daha fazla kontrol seçeneği
    """
    start_time = time.time()
    
    try:
        if not deepseek_client:
            raise HTTPException(status_code=500, detail="DeepSeek API yapılandırılmamış")
        
        user_message = chat_request.message.strip()
        if not user_message:
            raise HTTPException(status_code=400, detail="Mesaj boş olamaz")
        
        # RAG sistemi ile ilgili kaynakları ara
        if chat_request.use_vector_search:
            relevant_sources = await search_relevant_content(
                user_message, 
                max_results=chat_request.max_sources
            )
            
            # Kaynak türü filtresi uygula
            if chat_request.source_types:
                relevant_sources = [
                    source for source in relevant_sources 
                    if source.get("type") in chat_request.source_types
                ]
        else:
            relevant_sources = []
        
        # Context oluştur
        context_text = build_context_from_sources(relevant_sources)
        
        # Gelişmiş system prompt
        system_prompt = f"""
Sen Mihmandar Asistanı'sın. Tasavvuf, İslami ilimler ve manevi konularda uzman bir danışmansın.

Görevin:
1. Kullanıcının sorularını derinlemesine anlayıp, verilen kaynaklardan yararlanarak kapsamlı cevaplar vermek
2. Cevaplarını Türkçe, saygılı ve bilge bir üslupla sunmak
3. Kaynaklara net atıflar yapmak ([1], [2] şeklinde)
4. Manevi rehberlik yaparken İslami değerlere uygun davranmak
5. Kullanıcıyı daha derin araştırmaya teşvik etmek

Kurallar:
- Sadece verilen kaynaklardaki bilgileri kullan
- Her bilgi için kaynak numarası belirt
- Kısa cevaplar yerine, konuyu aydınlatan detaylı açıklamalar yap
- Eğer kaynaklarda yeterli bilgi yoksa, bunu açıkça belirt
- Kullanıcıyı ilgili sayfalara yönlendir

Kaynak sayısı: {len(relevant_sources)}
Arama yöntemi: {'Vektör tabanlı anlamsal arama' if chat_request.use_vector_search else 'Geleneksel arama'}
"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Kaynak bilgiler:\n{context_text}\n\nSoru: {user_message}"}
        ]
        
        # DeepSeek API çağrısı
        response = await deepseek_client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            max_tokens=chat_request.max_tokens,
            temperature=chat_request.temperature,
            top_p=0.9,
            stream=False
        )
        
        assistant_response = response.choices[0].message.content
        processing_time = time.time() - start_time
        
        # Gelişmiş confidence hesaplama
        confidence = calculate_advanced_confidence(
            assistant_response, 
            relevant_sources, 
            user_message,
            chat_request.use_vector_search
        )
        
        # AI sohbet geçmişini Supabase'e kaydet
        try:
            sources_for_save = [{
                "id": src.get("id"),
                "title": src.get("title"),
                "type": src.get("type"),
                "author": src.get("author"),
                "score": src.get("score")
            } for src in relevant_sources]
            
            slug = save_ai_chat(user_message, assistant_response, sources_for_save)
            logger.info(f"AI sohbet kaydedildi (advanced): {slug}")
        except Exception as e:
            logger.error(f"AI sohbet kaydetme hatası (advanced): {e}")
        
        return ChatResponse(
            response=assistant_response,
            sources=relevant_sources,
            session_id=chat_request.session_id,
            confidence=confidence,
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Advanced chat endpoint error: {e}")
        processing_time = time.time() - start_time
        
        return ChatResponse(
            response="Üzgünüm, şu anda size yardımcı olamıyorum. Lütfen daha sonra tekrar deneyin.",
            sources=[],
            session_id=chat_request.session_id,
            confidence=0.0,
            processing_time=processing_time
        )

def calculate_advanced_confidence(response: str, sources: List[Dict[str, Any]], query: str, used_vector_search: bool) -> float:
    """
    Gelişmiş güvenilirlik skorunu hesapla
    """
    if not response or not sources:
        return 0.1
    
    confidence = 0.3  # Base confidence
    
    # Vektör arama kullanıldıysa bonus
    if used_vector_search:
        confidence += 0.2
    
    # Kaynak sayısına göre artır
    confidence += min(len(sources) * 0.08, 0.25)
    
    # Yüksek similarity skorlu kaynaklar varsa artır
    high_similarity_sources = [s for s in sources if s.get("score", 0) > 0.8]
    if high_similarity_sources:
        confidence += len(high_similarity_sources) * 0.05
    
    # Cevap kalitesi göstergeleri
    if len(response) > 300:
        confidence += 0.1
    if len(response) > 600:
        confidence += 0.1
    
    # Kaynak referansları varsa artır
    reference_count = response.count("[")
    confidence += min(reference_count * 0.03, 0.15)
    
    # Farklı kaynak türleri varsa artır
    source_types = set(s.get("type") for s in sources)
    if len(source_types) > 1:
        confidence += 0.1
    
    return min(confidence, 1.0)