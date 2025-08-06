# main.py

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List, Optional
from whoosh.index import open_dir
from whoosh.qparser import MultifieldParser, AndGroup
import logging
import os
from pathlib import Path
import fitz  # PyMuPDF
import io
import asyncio
import requests
from dotenv import load_dotenv
import tempfile
import sys
import subprocess
import json
import re
import openai
from deepgram import DeepgramClient, PrerecordedOptions
import yt_dlp
import urllib.parse  # --- YENİ: URL decode işlemi için import edildi ---

# --- Kurulum ve Konfigürasyon ---
load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
app = FastAPI(title="Yediulya İlim Havuzu API", version="1.1.0")

# --- CORS Yapılandırması ---
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

# --- Veri Yolları ve Global Değişkenler ---
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
PDF_DIR = DATA_DIR / "pdfler"
INDEX_DIR = DATA_DIR / "whoosh_index"
VIDEO_CACHE_FILE = DATA_DIR / "video_analysis_cache.json"

ix = None
try:
    ix = open_dir(str(INDEX_DIR))
    logger.info("Whoosh indeksi başarıyla yüklendi.")
except Exception as e:
    logger.error(f"Kritik hata: Whoosh indeksi yüklenemedi: {e}")

# --- API İstemcileri ---
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
deepgram_client = DeepgramClient(DEEPGRAM_API_KEY) if DEEPGRAM_API_KEY else None
deepseek_client = openai.OpenAI(base_url="https://api.deepseek.com", api_key=DEEPSEEK_API_KEY) if DEEPSEEK_API_KEY else None
YOUTUBE_API_KEYS = [os.getenv(f"YOUTUBE_API_KEY{i}") for i in range(1, 7) if os.getenv(f"YOUTUBE_API_KEY{i}")]
YOUTUBE_CHANNEL_IDS = ["UCvhlPtV-1MgZBQPmGjomhsA", "UCfYG6Ij2vIJXXplpottv02Q", "UC0FN4XBgk2Isvv1QmrbFn8w"]


# --- API ENDPOINTS ---

@app.get("/")
def read_root():
    return {"message": "Yediulya API'sine hoş geldiniz!"}

@app.get("/authors")
def get_all_authors():
    if not ix:
        raise HTTPException(status_code=500, detail="Veri indeksi yüklenemedi.")
    with ix.searcher() as s:
        return {"authors": sorted(list(set(f['author'].title() for f in s.all_stored_fields() if 'author' in f)))}

@app.get("/search/books")
async def search_books(q: str, authors: Optional[List[str]] = Query(None)):
    if not ix:
        raise HTTPException(status_code=500, detail="Veri indeksi yüklenemedi.")

    with ix.searcher() as s:
        parser = MultifieldParser(["content", "author"], schema=ix.schema, group=AndGroup)
        user_query = q.lower()
        query_parts = [f"content:({user_query})"]
        if authors:
            author_filter_query = " OR ".join([f'author:"{a.lower()}"' for a in authors])
            query_parts.append(f"({author_filter_query})")
        
        final_query_str = " AND ".join(query_parts)
        parsed_query = parser.parse(final_query_str)
        results = s.search(parsed_query, limit=100)
        
        final_results = [
            {
                "kitap": hit["book"].title(),
                "yazar": hit["author"].title(),
                "sayfa": hit["page"],
                "alinti": hit.highlights("content") or hit["content"][:300],
                "pdf_dosyasi": hit["pdf_file"]
            }
            for hit in results
        ]
        return {"sonuclar": final_results}

# --- YENİ: PDF hakkında bilgi (toplam sayfa sayısı) döndüren endpoint ---
@app.get("/pdf/info")
def get_pdf_info(pdf_file: str):
    try:
        decoded_pdf_file = urllib.parse.unquote(pdf_file)
        pdf_path = PDF_DIR / decoded_pdf_file
        if not pdf_path.is_file():
            raise HTTPException(status_code=404, detail=f"PDF dosyası bulunamadı: {decoded_pdf_file}")
        
        with fitz.open(pdf_path) as doc:
            return {"total_pages": len(doc)}
    except Exception as e:
        logger.error(f"PDF bilgisi alınırken hata: {e}")
        raise HTTPException(status_code=500, detail="PDF bilgisi alınırken bir hata oluştu.")


# --- GÜNCELLENDİ: Hata yönetimi ve URL decode işlemi eklendi ---
@app.get("/pdf/page_image")
def get_page_image(pdf_file: str, page_num: int = Query(..., gt=0)):
    try:
        # --- DÜZELTME: Gelen URL kodlu dosya adını düz metne çevir ---
        decoded_pdf_file = urllib.parse.unquote(pdf_file)
        pdf_path = PDF_DIR / decoded_pdf_file

        if not pdf_path.is_file():
            logger.error(f"PDF dosyası bulunamadı: {pdf_path}")
            raise HTTPException(status_code=404, detail=f"PDF dosyası bulunamadı: {decoded_pdf_file}")

        with fitz.open(pdf_path) as doc:
            if not (0 < page_num <= len(doc)):
                raise HTTPException(status_code=400, detail="Geçersiz sayfa numarası.")
            
            page = doc.load_page(page_num - 1)
            pix = page.get_pixmap(dpi=150)
            img_byte_arr = io.BytesIO()
            pix.save(img_byte_arr, format="png") # PNG formatı daha iyi kalite sunar
            img_byte_arr.seek(0)
            
            return StreamingResponse(img_byte_arr, media_type="image/png")
    except Exception as e:
        logger.error(f"Sayfa resmi oluşturulurken hata: pdf={pdf_file}, page={page_num}, error={e}")
        raise HTTPException(status_code=500, detail="Sayfa resmi işlenirken bir sunucu hatası oluştu.")
