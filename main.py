# main.py
# Versiyon 2.0.1 - Eksik import'lar düzeltildi.

import logging
import os
import io
import json
import re
import asyncio
import urllib.parse
from pathlib import Path
from typing import List, Optional

import fitz
import requests
import yt_dlp
from openai import AsyncOpenAI
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from whoosh.index import open_dir, Index
from whoosh.qparser import MultifieldParser, AndGroup, QueryParser
from whoosh.searching import Searcher

# ★★★ EKSİK OLAN IMPORT'LAR BURAYA EKLENDİ ★★★
from deepgram import DeepgramClient, PrerecordedOptions

# Hem ana db'yi hem de makale db'sini import ediyoruz
from data.db import init_db as init_main_db, update_task, get_task, get_all_completed_analyses
from data.articles_db import get_all_articles_by_category, get_article_by_id, init_db as init_articles_db

# --- Kurulum ve Global Yapılandırma ---
load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Mihmandar İlim Havuzu API",
    version="2.0.1",
    description="Tasavvufi eserlerde, makalelerde, YouTube videolarında ve video analizlerinde arama yapma API'si."
)

origins = [
    "http://localhost:3000",
    "https://new-git-main-yediulyas-projects.vercel.app",
    "https://mihmandar.org",
    "https://new-mu-self.vercel.app",
    "https://new-yediulyas-projects.vercel.app",
    "https://new.vercel.app",
]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
PDF_DIR = DATA_DIR / "pdfler"
INDEX_DIR = DATA_DIR / "whoosh_index"

YOUTUBE_API_KEYS = [os.getenv(f"YOUTUBE_API_KEY{i}") for i in range(1, 7) if os.getenv(f"YOUTUBE_API_KEY{i}")]
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

deepgram_client = DeepgramClient(DEEPGRAM_API_KEY) if DEEPGRAM_API_KEY else None
deepseek_client = AsyncOpenAI(base_url="https://api.deepseek.com", api_key=DEEPSEEK_API_KEY) if DEEPSEEK_API_KEY else None


@app.on_event("startup")
async def startup_event():
    init_main_db()
    init_articles_db()

# --- Yardımcı Fonksiyonlar ve Bağımlılıklar ---
def get_whoosh_index() -> Index:
    try: return open_dir(str(INDEX_DIR))
    except Exception as e:
        logger.error(f"Kritik Hata: Whoosh indeksi '{INDEX_DIR}' adresinde bulunamadı: {e}")
        raise HTTPException(status_code=503, detail="Arama servisi şu anda kullanılamıyor.")

def get_searcher(ix: Index = Depends(get_whoosh_index)) -> Searcher:
    return ix.searcher()
    
# (Diğer yardımcı fonksiyonlar - format_time, extract_video_id, download_audio_sync, run_video_analysis - aynı kalıyor)
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
    ydl_opts = {'format': 'bestaudio/best', 'outtmpl': temp_filepath, 'quiet': True, 'no_warnings': True, 'noprogress': True}
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl: ydl.download([url])
        with open(temp_filepath, 'rb') as f: return f.read()
    finally:
        if os.path.exists(temp_filepath): os.remove(temp_filepath)

async def run_video_analysis(task_id: str, url: str):
    try:
        update_task(task_id, "processing", message="Video Bilgileri Alınıyor...")
        with yt_dlp.YoutubeDL({'quiet': True, 'skip_download': True, 'no_warnings': True}) as ydl:
            metadata = await asyncio.to_thread(ydl.extract_info, url, download=False)

        update_task(task_id, "processing", message="Video Sesi İndiriliyor...")
        audio_content = await asyncio.to_thread(download_audio_sync, url, task_id)

        update_task(task_id, "processing", message="Ses Metne Dönüştürülüyor...")
        source = {'buffer': audio_content}
        options = PrerecordedOptions(model="nova-2", language="tr", smart_format=True, utterances=True)
        response = await deepgram_client.listen.asyncrest.v("1").transcribe_file(source, options)
        if not response.results or not response.results.utterances: raise ValueError("Videodan metin çıkarılamadı.")

        update_task(task_id, "processing", message="Konu Başlıkları Oluşturuluyor...")
        chapters, chunk_text, start_time = [], "", 0
        utterances = response.results.utterances
        for i, utt in enumerate(utterances):
            if not chunk_text: start_time = utt.start
            chunk_text += utt.transcript + " "
            if (utt.end - start_time) >= 120 or (i == len(utterances) - 1 and chunk_text.strip()):
                comp_res = await deepseek_client.chat.completions.create(model="deepseek-chat", messages=[{"role": "system", "content": "Verilen metnin ana konusunu özetleyen 4-6 kelimelik kısa bir başlık oluştur."}, {"role": "user", "content": chunk_text}], max_tokens=20)
                title = comp_res.choices[0].message.content.strip().replace('"', '')
                chapters.append(f"**{format_time(start_time)}** - {title}")
                chunk_text = ""
        
        result = {"title": metadata.get("title"), "thumbnail": metadata.get("thumbnail"), "chapters": chapters}
        update_task(task_id, "completed", result=result)
        logger.info(f"[{task_id}] Analiz başarıyla tamamlandı ve veritabanına kaydedildi.")
    except Exception as e:
        logger.error(f"[{task_id}] Görev sırasında HATA oluştu: {e}", exc_info=True)
        update_task(task_id, "error", message=f"Analiz sırasında bir hata oluştu: {str(e)}")


# --- API Endpoints ---
@app.get("/")
async def read_root(): return {"message": "Mihmandar API v2.0.1 Aktif"}

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
    return await asyncio.to_thread(get_all_articles_by_category)

@app.get("/article/{article_id}")
async def read_article(article_id: int):
    article = await asyncio.to_thread(get_article_by_id, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Makale bulunamadı.")
    return article

@app.get("/authors")
async def get_all_authors(searcher: Searcher = Depends(get_searcher)):
    def _get_authors():
        all_authors = {f['author'].title() for f in searcher.all_stored_fields() if 'author' in f and f['author']}
        return {"authors": sorted(list(all_authors))}
    return await asyncio.to_thread(_get_authors)

@app.get("/books_by_author")
async def get_books_by_author(searcher: Searcher = Depends(get_searcher)):
    def _process_books():
        books_data = {}
        book_results = searcher.search(QueryParser("type", searcher.schema).parse("book"), limit=None)
        for fields in book_results:
            author, book, pdf_file = fields.get('author', 'Bilinmeyen').title(), fields.get('title', 'Bilinmeyen').title(), fields.get('source')
            if author not in books_data: books_data[author] = {}
            if book not in books_data[author] and pdf_file:
                 try:
                    if (PDF_DIR / pdf_file).is_file():
                        with fitz.open(PDF_DIR / pdf_file) as doc:
                            books_data[author][book] = {"pdf_dosyasi": pdf_file, "toplam_sayfa": len(doc)}
                 except Exception: continue
        return {"kutuphane": [{"yazar": author, "kitaplar": [{"kitap_adi": title, **details} for title, details in books.items()]} for author, books in sorted(books_data.items())]}
    return await asyncio.to_thread(_process_books)

# (Geri kalan tüm endpoint'ler - search/analyses, pdf/info, pdf/page_image, search/videos, analyze/start, analyze/status, analysis_history - aynı kalıyor)
# Örnek olarak bir tanesini bırakıyorum, diğerleri sizde tam haliyle durmalı.
@app.get("/search/analyses")
async def search_analyses(q: str):
    if not q.strip(): return {"sonuclar": []}
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
        pdf_path = PDF_DIR / urllib.parse.unquote(pdf_file)
        if not pdf_path.is_file(): raise HTTPException(status_code=404, detail="PDF bulunamadı.")
        with fitz.open(pdf_path) as doc: return {"total_pages": len(doc)}
    except Exception as e:
        raise HTTPException(status_code=500, detail="PDF bilgisi alınamadı.")

@app.get("/pdf/page_image")
def get_page_image(pdf_file: str, page_num: int = Query(..., gt=0)):
    try:
        pdf_path = PDF_DIR / urllib.parse.unquote(pdf_file)
        if not pdf_path.is_file(): raise HTTPException(status_code=404, detail=f"PDF bulunamadı.")
        with fitz.open(pdf_path) as doc:
            if not (0 < page_num <= len(doc)): raise HTTPException(status_code=400, detail="Geçersiz sayfa.")
            page = doc.load_page(page_num - 1)
            pix = page.get_pixmap(dpi=150)
            return StreamingResponse(io.BytesIO(pix.tobytes("png")), media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Sayfa resmi işlenirken hata oluştu.")

@app.get("/search/videos")
async def search_videos(q: str):
    if not YOUTUBE_API_KEYS: raise HTTPException(status_code=503, detail="YouTube servisi yapılandırılmamış.")
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

@app.post("/analyze/start")
async def start_analysis(background_tasks: BackgroundTasks, url: str = Query(..., description="Analiz edilecek YouTube video URL'si")):
    if not deepgram_client or not deepseek_client: raise HTTPException(status_code=503, detail="Video analiz servisi yapılandırılmamış.")
    video_id = extract_video_id(url)
    if not video_id: raise HTTPException(status_code=400, detail="Geçersiz YouTube URL'si.")
    task_id = video_id
    existing_task = get_task(task_id)
    if existing_task and existing_task['status'] == 'completed':
        return JSONResponse(status_code=200, content={"task_id": task_id, "message": "Bu video daha önce analiz edilmiş.", "result": existing_task['result']})
    update_task(task_id, "processing", message="Görev Başlatılıyor...")
    background_tasks.add_task(run_video_analysis, task_id, url)
    return JSONResponse(status_code=202, content={"task_id": task_id, "message": "Analiz başlatıldı."})

@app.get("/analyze/status/{task_id}")
async def get_analysis_status(task_id: str):
    task = get_task(task_id)
    if not task: raise HTTPException(status_code=404, detail="Görev bulunamadı.")
    return task

@app.get("/analysis_history")
async def get_analysis_history():
    return get_all_completed_analyses()