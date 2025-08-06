# main.py
# Versiyon 1.2.0 - Arka Plan Görevleri ve Durum Sorgulama Mimarisi

import logging
import os
import io
import json
import re
import asyncio
import urllib.parse
from pathlib import Path
from typing import List, Optional, Dict, Any
import uuid  # Görev ID'si için

import fitz  # PyMuPDF
import requests
import yt_dlp
import openai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from whoosh.index import open_dir, Index
from whoosh.qparser import MultifieldParser, AndGroup
from whoosh.searching import Searcher
from deepgram import DeepgramClient, PrerecordedOptions

# --- 1. Kurulum ve Global Yapılandırma ---
load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Mihmandar İlim Havuzu API",
    version="1.2.0",
    description="Tasavvufi eserlerde ve YouTube videolarında arama ve analiz yapma API'si."
)

# --- 2. CORS (Cross-Origin Resource Sharing) ---
origins = [
    "http://localhost:3000",
    "https://new-git-main-yediulyas-projects.vercel.app",
    "https://mihmandar.org",
    "https://new-mu-self.vercel.app",
    "https://new-yediulyas-projects.vercel.app",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. Sabitler ve Dosya Yolları ---
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
PDF_DIR = DATA_DIR / "pdfler"
INDEX_DIR = DATA_DIR / "whoosh_index"
VIDEO_CACHE_FILE = DATA_DIR / "video_analysis_cache.json"

# API Anahtarları
YOUTUBE_API_KEYS = [os.getenv(f"YOUTUBE_API_KEY{i}") for i in range(1, 7) if os.getenv(f"YOUTUBE_API_KEY{i}")]
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

# API İstemcileri
deepgram_client = DeepgramClient(DEEPGRAM_API_KEY) if DEEPGRAM_API_KEY else None
deepseek_client = openai.OpenAI(base_url="https://api.deepseek.com", api_key=DEEPSEEK_API_KEY) if DEEPSEEK_API_KEY else None

# --- Görev Durumlarını Saklamak İçin Basit In-Memory Veritabanı ---
tasks_db: Dict[str, Dict[str, Any]] = {}

# --- 4. Bağımlılıklar (Dependencies) ve Yardımcı Fonksiyonlar ---

def get_whoosh_index() -> Index:
    try:
        return open_dir(str(INDEX_DIR))
    except Exception as e:
        logger.error(f"Kritik Hata: Whoosh indeksi '{INDEX_DIR}' adresinde bulunamadı: {e}")
        raise HTTPException(status_code=503, detail="Arama servisi şu anda kullanılamıyor.")

def get_searcher(ix: Index = Depends(get_whoosh_index)) -> Searcher:
    return ix.searcher()

def load_video_cache() -> Dict[str, Any]:
    if not VIDEO_CACHE_FILE.exists(): return {}
    with open(VIDEO_CACHE_FILE, 'r', encoding='utf-8') as f:
        try: return json.load(f)
        except json.JSONDecodeError: return {}

def save_video_cache(cache: Dict[str, Any]):
    with open(VIDEO_CACHE_FILE, 'w', encoding='utf-8') as f: json.dump(cache, f, ensure_ascii=False, indent=4)

def format_time(seconds: float) -> str:
    minutes, seconds = divmod(int(seconds), 60)
    hours, minutes = divmod(minutes, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

def extract_video_id(url: str) -> Optional[str]:
    match = re.search(r"(?:v=|\/|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})", url)
    return match.group(1) if match else None

# --- Arka Plan Görev Fonksiyonu ---
async def run_video_analysis(task_id: str, url: str):
    """Bu fonksiyon tüm ağır video analiz işini arka planda yapar."""
    try:
        tasks_db[task_id] = {"status": "processing", "message": "Video bilgileri alınıyor..."}
        metadata = await asyncio.to_thread(yt_dlp.YoutubeDL({'quiet': True, 'skip_download': True}).extract_info, url, download=False)
        
        tasks_db[task_id] = {"status": "processing", "message": "Video sesi indiriliyor..."}
        with yt_dlp.YoutubeDL({'format': 'bestaudio/best', 'outtmpl': '-', 'quiet': True}) as ydl:
            audio_info = await asyncio.to_thread(ydl.extract_info, url, download=True)
            audio_buffer = await asyncio.to_thread(requests.get(audio_info['url']).content)

        tasks_db[task_id] = {"status": "processing", "message": "Ses metne dönüştürülüyor (Deepgram)..."}
        source = {'buffer': audio_buffer}
        options = PrerecordedOptions(model="nova-2", language="tr", smart_format=True, utterances=True)
        response = await deepgram_client.listen.asyncrest.v("1").transcribe_file(source, options)
        
        if not response.results or not response.results.utterances:
            raise ValueError("Videodan metin çıkarılamadı.")

        tasks_db[task_id] = {"status": "processing", "message": "Konu başlıkları oluşturuluyor (AI)..."}
        chapters, chunk_text, start_time = [], "", 0
        utterances = response.results.utterances
        for i, utt in enumerate(utterances):
            if not chunk_text: start_time = utt.start
            chunk_text += utt.transcript + " "
            
            is_last_utterance = i == len(utterances) - 1
            if (utt.end - start_time) >= 120 or (is_last_utterance and chunk_text.strip()):
                comp_res = await deepseek_client.chat.completions.create(model="deepseek-chat", messages=[{"role": "system", "content": "Verilen metnin ana konusunu özetleyen 4-6 kelimelik kısa bir başlık oluştur."}, {"role": "user", "content": chunk_text}], max_tokens=20)
                title = comp_res.choices[0].message.content.strip().replace('"', '')
                chapters.append(f"**{format_time(start_time)}** - {title}")
                chunk_text = ""

        result = {"title": metadata.get("title"), "thumbnail": metadata.get("thumbnail"), "chapters": chapters}
        tasks_db[task_id] = {"status": "completed", "result": result}
        
    except Exception as e:
        logger.error(f"Görev {task_id} sırasında hata oluştu: {e}")
        tasks_db[task_id] = {"status": "error", "message": f"Analiz sırasında bir hata oluştu: {str(e)}"}

# --- 5. API Endpoints ---

@app.get("/")
async def read_root():
    return {"message": "Mihmandar API v1.2.0 Aktif"}

@app.get("/authors")
async def get_all_authors(searcher: Searcher = Depends(get_searcher)):
    def _get_authors():
        authors_set = {f['author'].title() for f in searcher.all_stored_fields() if 'author' in f}
        return {"authors": sorted(list(authors_set))}
    return await asyncio.to_thread(_get_authors)

@app.get("/search/books")
async def search_books(q: str, authors: Optional[List[str]] = Query(None), searcher: Searcher = Depends(get_searcher)):
    def _search():
        parser = MultifieldParser(["content", "author"], schema=searcher.schema, group=AndGroup)
        query_parts = [f"content:({q.lower()})"]
        if authors:
            author_filter = " OR ".join([f'author:"{a.lower()}"' for a in authors])
            query_parts.append(f"({author_filter})")
        
        final_query_str = " AND ".join(query_parts)
        parsed_query = parser.parse(final_query_str)
        results = searcher.search(parsed_query, limit=150)
        
        return {"sonuclar": [{"kitap": hit["book"].title(), "yazar": hit["author"].title(), "sayfa": hit["page"], "alinti": hit.highlights("content") or hit["content"][:300], "pdf_dosyasi": hit["pdf_file"]} for hit in results]}
    return await asyncio.to_thread(_search)

@app.get("/books_by_author")
async def get_books_by_author(searcher: Searcher = Depends(get_searcher)):
    def _process_books():
        books_data = {}
        for fields in searcher.all_stored_fields():
            author, book, pdf_file = fields.get('author', 'Bilinmeyen').title(), fields.get('book', 'Bilinmeyen').title(), fields.get('pdf_file')
            if author not in books_data: books_data[author] = {}
            if book not in books_data[author] and pdf_file:
                 try:
                    if (PDF_DIR / pdf_file).is_file():
                        with fitz.open(PDF_DIR / pdf_file) as doc:
                            books_data[author][book] = {"pdf_dosyasi": pdf_file, "toplam_sayfa": len(doc)}
                 except Exception: continue
        return {"kutuphane": [{"yazar": author, "kitaplar": [{"kitap_adi": title, **details} for title, details in books.items()]} for author, books in sorted(books_data.items())]}
    return await asyncio.to_thread(_process_books)

@app.get("/pdf/page_image")
def get_page_image(pdf_file: str, page_num: int = Query(..., gt=0)):
    try:
        decoded_pdf_file = urllib.parse.unquote(pdf_file)
        pdf_path = PDF_DIR / decoded_pdf_file
        if not pdf_path.is_file(): raise HTTPException(status_code=404, detail=f"PDF bulunamadı: {decoded_pdf_file}")
        with fitz.open(pdf_path) as doc:
            if not (0 < page_num <= len(doc)): raise HTTPException(status_code=400, detail="Geçersiz sayfa.")
            page = doc.load_page(page_num - 1)
            pix = page.get_pixmap(dpi=150)
            return StreamingResponse(io.BytesIO(pix.tobytes("png")), media_type="image/png")
    except Exception as e:
        logger.error(f"Sayfa resmi hatası: pdf={pdf_file}, page={page_num}, error={e}")
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
    if not extract_video_id(url): raise HTTPException(status_code=400, detail="Geçersiz YouTube URL'si.")
    task_id = str(uuid.uuid4())
    tasks_db[task_id] = {"status": "pending", "message": "Görev kuyruğa alındı."}
    background_tasks.add_task(run_video_analysis, task_id, url)
    return JSONResponse(status_code=202, content={"task_id": task_id, "message": "Analiz başlatıldı."})

@app.get("/analyze/status/{task_id}")
async def get_analysis_status(task_id: str):
    task = tasks_db.get(task_id)
    if not task: raise HTTPException(status_code=404, detail="Görev bulunamadı.")
    return task

@app.get("/analysis_history")
async def get_analysis_history():
    return load_video_cache()