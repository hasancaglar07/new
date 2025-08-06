# backend/main.py

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List, Optional
from whoosh.index import open_dir
from whoosh.qparser import MultifieldParser, AndGroup
import logging
import os
from pathlib import Path
import fitz
import io
import asyncio
import requests
from dotenv import load_dotenv
import tempfile
import sys
import subprocess
import json
from deepgram import DeepgramClient, PrerecordedOptions
import openai
import re
import yt_dlp

# --- Kurulum ve Konfigürasyon ---
dotenv_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=dotenv_path)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
app = FastAPI(title="Yediulya İlim Havuzu API", version="1.0.0")

# --- CORS (Frontend'den Gelen İsteğe İzin Verme) ---
origins = [
    "http://localhost:3000",  # Yerel geliştirme için
    "https://new-git-main-yediulyas-projects.vercel.app", # Vercel'in kendi adresi
    "https://mihmandar.org"  # SİZİN ÖZEL ALAN ADINIZ (EN ÖNEMLİSİ)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
Use

# --- Veri Yolları ve İndekslerin Yüklenmesi ---
try:
    BASE_DIR = Path(__file__).parent
    DATA_DIR = BASE_DIR / "data"
    PDF_DIR = DATA_DIR / "pdfler"
    INDEX_DIR = DATA_DIR / "whoosh_index"
    VIDEO_CACHE_FILE = DATA_DIR / "video_analysis_cache.json"
    ix = open_dir(str(INDEX_DIR))
    logger.info("Whoosh indeksi başarıyla yüklendi.")
except Exception as e:
    logger.error(f"Başlangıç hatası (indeks yüklenemedi): {e}")
    ix = None

# --- API İstemcileri ---
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
deepgram_client = DeepgramClient(DEEPGRAM_API_KEY) if DEEPGRAM_API_KEY else None
deepseek_client = openai.OpenAI(base_url="https://api.deepseek.com", api_key=DEEPSEEK_API_KEY) if DEEPSEEK_API_KEY else None

# --- YouTube API ve Kanalları ---
YOUTUBE_API_KEYS = [os.getenv(f"YOUTUBE_API_KEY{i}") for i in range(1, 7) if os.getenv(f"YOUTUBE_API_KEY{i}")]
YOUTUBE_CHANNEL_IDS = ["UCvhlPtV-1MgZBQPmGjomhsA", "UCfYG6Ij2vIJXXplpottv02Q", "UC0FN4XBgk2Isvv1QmrbFn8w"]

# --- Yardımcı Fonksiyonlar ---
def format_time(s): m, s = divmod(int(s), 60); h, m = divmod(m, 60); return f"{h:02d}:{m:02d}:{s:02d}"
def extract_video_id(url): match = re.search(r"(?:v=|\/|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})", url); return match.group(1) if match else None
def load_video_cache():
    if not VIDEO_CACHE_FILE.exists(): return {}
    with open(VIDEO_CACHE_FILE, 'r', encoding='utf-8') as f:
        try: return json.load(f)
        except json.JSONDecodeError: return {}
def save_video_cache(cache):
    with open(VIDEO_CACHE_FILE, 'w', encoding='utf-8') as f: json.dump(cache, f, ensure_ascii=False, indent=4)
def get_video_metadata(url):
    with yt_dlp.YoutubeDL({'quiet': True, 'skip_download': True, 'no_warnings': True}) as ydl:
        info = ydl.extract_info(url, download=False); return {"title": info.get('title'), "thumbnail": info.get('thumbnail')}

# --- API ENDPOINTS ---

@app.get("/")
def read_root(): return {"message": "Yediulya API'sine hoş geldiniz!"}

@app.get("/authors")
def get_all_authors():
    if not ix: raise HTTPException(500, "Veri indeksi yüklenemedi.")
    with ix.searcher() as s: return {"authors": sorted(list(set(f['author'].title() for f in s.all_stored_fields() if 'author' in f)))}

# ★★★ DÜZELTİLMİŞ KİTAP ARAMA FONKSİYONU ★★★
@app.get("/search/books")
async def search_books(q: str, authors: Optional[List[str]] = Query(None)):
    if not ix:
        raise HTTPException(status_code=500, detail="Veri indeksi yüklenemedi.")

    with ix.searcher() as s:
        # Arama parser'ını 'content' ve 'author' alanları için ayarla
        parser = MultifieldParser(["content", "author"], schema=ix.schema, group=AndGroup)

        # Kullanıcı sorgusunu ve yazar filtresini birleştir
        user_query = q.lower()
        if authors:
            author_filter_query = " OR ".join([f'author:"{a.lower()}"' for a in authors])
            final_query_str = f"({user_query}) AND ({author_filter_query})"
        else:
            final_query_str = user_query

        parsed_query = parser.parse(final_query_str)
        results = s.search(parsed_query, limit=100)

        # Sonuçları işlerken `highlights` metodunu kullan
        final_results = []
        for hit in results:
            final_results.append({
                "kitap": hit["book"].title(),
                "yazar": hit["author"].title(),
                "sayfa": hit["page"],
                # ÖNEMLİ DEĞİŞİKLİK: 'content' yerine 'highlights' kullanılıyor.
                "alinti": hit.highlights("content") or hit["content"][:250],
                "pdf_dosyasi": hit["pdf_file"]
            })

        return {"sonuclar": final_results}

@app.get("/search/videos")
async def search_videos_official_api(q: str):
    if not YOUTUBE_API_KEYS: raise HTTPException(500, "YouTube API anahtarı yok.")
    all_videos = []
    for channel_id in YOUTUBE_CHANNEL_IDS:
        for api_key in YOUTUBE_API_KEYS:
            params = {"part": "snippet", "q": q, "type": "video", "maxResults": 5, "key": api_key, "channelId": channel_id}
            try:
                response = requests.get("https://www.googleapis.com/youtube/v3/search", params=params, timeout=5)
                if response.status_code == 200:
                    for item in response.json().get("items", []):
                        snippet, video_id = item.get("snippet", {}), item.get("id", {}).get("videoId")
                        all_videos.append({"id": video_id, "title": snippet.get("title"), "thumbnail": snippet.get("thumbnails", {}).get("high", {}).get("url"), "channel": snippet.get("channelTitle"), "publishedTime": snippet.get("publishedAt", "").split("T")[0], "link": f"https://www.youtube.com/watch?v={video_id}" if video_id else ""})
                    break
            except requests.exceptions.RequestException as e: logger.error(f"API isteği hatası: {e}"); continue
            if response.status_code == 403: continue
    return {"sonuclar": all_videos}

@app.get("/books_by_author")
async def get_books_by_author():
    if not ix: raise HTTPException(500, "Veri indeksi yüklenemedi.")
    books_data = {}
    with ix.searcher() as s:
        for fields in s.all_stored_fields():
            author, book, pdf = fields.get('author','B').title(), fields.get('book','B').title(), fields.get('pdf_file')
            if author not in books_data: books_data[author] = {}
            if book not in books_data[author]:
                try:
                    pdf_path = PDF_DIR / pdf
                    if pdf_path.is_file():
                        with fitz.open(pdf_path) as doc: books_data[author][book] = {"pdf_dosyasi": pdf, "toplam_sayfa": len(doc)}
                except Exception: continue
    return {"kutuphane": [{"yazar": author, "kitaplar": [{"kitap_adi": title, **details} for title, details in books.items()]} for author, books in sorted(books_data.items())]}

@app.post("/analyze_video")
async def analyze_youtube_video(url: str = Query(..., description="Analiz edilecek YouTube video URL'si")):
    if not deepgram_client or not deepseek_client: raise HTTPException(500, "API anahtarları yapılandırılmamış.")
    video_id = extract_video_id(url)
    if not video_id: raise HTTPException(400, "Geçersiz YouTube URL'si.")
    
    cache = load_video_cache()
    if video_id in cache:
        logger.info(f"Önbellekten bulundu: {video_id}")
        return cache[video_id]

    try:
        logger.info(f"Yeni analiz başlatılıyor: {video_id}")
        metadata = get_video_metadata(url)
        with tempfile.TemporaryDirectory() as temp_dir:
            audio_path = os.path.join(temp_dir, "audio.m4a")
            subprocess.run(['yt-dlp', '-f', 'bestaudio', '-o', audio_path, url], check=True, capture_output=True)
            with open(audio_path, "rb") as audio: source = {'buffer': audio.read()}
            options = PrerecordedOptions(model="nova-2", language="tr", smart_format=True, utterances=True)
            response = await deepgram_client.listen.asyncrest.v("1").transcribe_file(source, options)
            transcript = response.results.utterances
            if not transcript: raise HTTPException(400, "Metin çıkarılamadı.")

            chapters, chunk_text, start_time = [], "", transcript[0].start
            for utt in transcript:
                chunk_text += utt.transcript + " "
                if utt.end - start_time >= 120:
                    comp = deepseek_client.chat.completions.create(model="deepseek-chat", messages=[{"role": "system", "content": "Verilen metnin ana konusunu özetleyen 4-6 kelimelik kısa bir başlık oluştur."}, {"role": "user", "content": chunk_text}], max_tokens=20)
                    title = comp.choices[0].message.content.strip().replace('"', '')
                    chapters.append(f"**{format_time(start_time)}** - {title}")
                    chunk_text, start_time = "", utt.end
            if chunk_text:
                comp = deepseek_client.chat.completions.create(model="deepseek-chat", messages=[{"role": "system", "content": "Verilen metnin ana konusunu özetleyen 4-6 kelimelik kısa bir başlık oluştur."}, {"role": "user", "content": chunk_text}], max_tokens=20)
                title = comp.choices[0].message.content.strip().replace('"', '')
                chapters.append(f"**{format_time(start_time)}** - {title}")

            result = {"title": metadata.get("title"), "thumbnail": metadata.get("thumbnail"), "chapters": chapters}
            cache[video_id] = result
            save_video_cache(cache)
            logger.info(f"Önbelleğe kaydedildi: {video_id}")
            return result
    except Exception as e:
        logger.error(f"Analiz hatası: {e}"); raise HTTPException(500, f"Analiz sırasında hata: {str(e)}")

@app.get("/analysis_history")
def get_analysis_history():
    logger.info("Video analizi geçmişi isteniyor.")
    return load_video_cache()

@app.get("/pdf/info")
def get_pdf_info(pdf_file: str):
    pdf_path = PDF_DIR / pdf_file
    if not pdf_path.is_file(): raise HTTPException(404, "PDF bulunamadı")
    with fitz.open(pdf_path) as doc: return {"total_pages": len(doc)}

@app.get("/pdf/page_image")
def get_page_image(pdf_file: str, page_num: int = Query(..., gt=0)):
    pdf_path = PDF_DIR / pdf_file
    if not pdf_path.is_file(): raise HTTPException(404, "PDF bulunamadı")
    with fitz.open(pdf_path) as doc:
        if page_num > len(doc): raise HTTPException(400, "Geçersiz sayfa")
        page = doc.load_page(page_num - 1); pix = page.get_pixmap(dpi=150); buf = io.BytesIO(pix.tobytes("png"))
        return StreamingResponse(buf, media_type="image/png")