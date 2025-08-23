# create_index.py
# Versiyon 2.2 - Backblaze'den PDF'leri indirip indeksleme

import os
from pathlib import Path
import fitz
import logging
import sys
import sqlite3
from bs4 import BeautifulSoup
import json
import requests
import tempfile

from whoosh.index import create_in
from whoosh.fields import Schema, TEXT, ID
from turkish_search_utils import create_turkish_analyzer

# Temel yapılandırma
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- DOSYA YOLLARI ---
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
PDF_DIR = DATA_DIR / "pdfler"
INDEX_DIR = DATA_DIR / "whoosh_index"
ARTICLES_DB_PATH = DATA_DIR / "articles_database.db"
BOOK_METADATA_PATH = DATA_DIR / "book_metadata.json"

# PDF dizini - Environment variable'dan al veya varsayılan kullan
PDF_BASE_URL = os.getenv("PDF_BASE_URL")

# Backblaze B2 API anahtarları
B2_APPLICATION_KEY_ID = os.getenv("B2_APPLICATION_KEY_ID")
B2_APPLICATION_KEY = os.getenv("B2_APPLICATION_KEY")
B2_BUCKET_NAME = os.getenv("B2_BUCKET_NAME", "yediulya-pdf-arsivi")

# HTML'i temiz metne dönüştüren yardımcı fonksiyon
def html_to_text(html_content):
    if not html_content:
        return ""
    soup = BeautifulSoup(html_content, 'html.parser')
    return soup.get_text(separator=' ', strip=True)

def download_pdf_from_backblaze(pdf_filename):
    """Backblaze'den PDF dosyasını indirir ve geçici dosya olarak kaydeder"""
    if not PDF_BASE_URL:
        return None
    
    try:
        # Önce public URL ile dene
        pdf_url = f"{PDF_BASE_URL}/{pdf_filename}"
        logger.info(f"PDF indiriliyor (public): {pdf_url}")
        
        response = requests.get(pdf_url, timeout=30)
        response.raise_for_status()
        
        # Geçici dosya oluştur
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        temp_file.write(response.content)
        temp_file.close()
        
        logger.info(f"PDF başarıyla indirildi: {pdf_filename}")
        return temp_file.name
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            # 401 hatası - API anahtarları ile dene
            if B2_APPLICATION_KEY_ID and B2_APPLICATION_KEY:
                logger.info(f"Public erişim başarısız, API anahtarları ile deneniyor: {pdf_filename}")
                return download_pdf_with_b2_api(pdf_filename)
            else:
                logger.warning(f"PDF erişimi için B2 API anahtarları gerekli: {pdf_filename}")
                return None
        else:
            logger.error(f"PDF indirilemedi {pdf_filename}: {e}")
            return None
    except Exception as e:
        logger.error(f"PDF indirilemedi {pdf_filename}: {e}")
        return None

def download_pdf_with_b2_api(pdf_filename):
    """B2 API anahtarları ile PDF dosyasını indirir"""
    try:
        # B2 API ile dosya indirme (basit implementasyon)
        # Not: Tam B2 API implementasyonu için b2sdk kütüphanesi gerekli
        logger.warning(f"B2 API implementasyonu henüz tamamlanmadı: {pdf_filename}")
        return None
        
    except Exception as e:
        logger.error(f"B2 API ile PDF indirilemedi {pdf_filename}: {e}")
        return None

def create_search_index():
    """
    PDF'leri ve makaleleri tarayarak birleşik Whoosh indeksi ve kitap meta verilerini oluşturur.
    """
    if not os.path.exists(INDEX_DIR):
        os.makedirs(INDEX_DIR)
        logger.info(f"İndeks klasörü oluşturuldu: {INDEX_DIR}")

    # Evrensel Şema - Türkçe Analyzer ile
    turkish_analyzer = create_turkish_analyzer()
    schema = Schema(
        type=ID(stored=True),
        title=TEXT(stored=True, analyzer=turkish_analyzer),
        author=TEXT(stored=True, analyzer=turkish_analyzer),
        content=TEXT(stored=True, analyzer=turkish_analyzer),
        source=ID(stored=True),
        page_or_id=ID(stored=True),
        category=TEXT(stored=True, analyzer=turkish_analyzer)
    )

    try:
        ix = create_in(INDEX_DIR, schema)
        writer = ix.writer()
        logger.info("Yeni birleşik arama indeksi oluşturuluyor...")

        # --- BÖLÜM 1: PDF'leri İşleme ve Meta Veri Toplama ---
        logger.info(">>> Adım 1: Kitaplar (PDF'ler) işleniyor...")
        
        # Önce mevcut meta veriyi yükle
        book_metadata_list = []
        if os.path.exists(BOOK_METADATA_PATH):
            try:
                with open(BOOK_METADATA_PATH, 'r', encoding='utf-8') as f:
                    book_metadata_list = json.load(f)
                logger.info(f"Mevcut kitap meta verisi yüklendi: {len(book_metadata_list)} kitap")
            except Exception as e:
                logger.warning(f"Meta veri yüklenirken hata: {e}")
                book_metadata_list = []
        
        # PDF dosyalarını kontrol et
        pdf_files = list(PDF_DIR.glob("*.pdf"))
        
        if not pdf_files and PDF_BASE_URL:
            logger.info(f"PDF'ler Backblaze'den indirilecek: {PDF_BASE_URL}")
            
            # Her kitap için PDF'i indir ve indeksle
            for book_info in book_metadata_list:
                pdf_filename = book_info['pdf_file']
                temp_pdf_path = download_pdf_from_backblaze(pdf_filename)
                
                if temp_pdf_path:
                    try:
                        doc = fitz.open(temp_pdf_path)
                        book_name = book_info['book']
                        author_name = book_info['author']
                        
                        logger.info(f"Kitap indeksleniyor: {book_name} - {author_name}")
                        
                        # Her sayfayı indeksle
                        for page_num in range(len(doc)):
                            page = doc.load_page(page_num)
                            text = page.get_text("text")
                            if text:
                                writer.add_document(
                                    type='book',
                                    title=book_name,
                                    author=author_name,
                                    content=text,
                                    source=pdf_filename,
                                    page_or_id=str(page_num + 1),
                                    category=None
                                )
                        
                        doc.close()
                        
                        # Geçici dosyayı sil
                        os.unlink(temp_pdf_path)
                        
                    except Exception as e:
                        logger.error(f"PDF işlenirken hata oluştu {pdf_filename}: {e}")
                        if temp_pdf_path and os.path.exists(temp_pdf_path):
                            os.unlink(temp_pdf_path)
                        continue
                else:
                    logger.warning(f"PDF indirilemedi, atlanıyor: {pdf_filename}")
            
            logger.info(">>> Kitapların indekslenmesi tamamlandı (Backblaze'den).")
            
        elif pdf_files:
            # Yerel PDF'ler varsa onları kullan
            logger.info(f"Yerel PDF'ler bulundu: {len(pdf_files)} dosya")
            
            for pdf_path in pdf_files:
                try:
                    doc = fitz.open(pdf_path)
                    file_name = pdf_path.name
                    base_name = file_name.replace(".pdf", "").replace("_", " ")

                    if "-" in base_name:
                        book_part, author_part = base_name.split("-", 1)
                        book_name = book_part.strip().title()
                        author_name = author_part.strip().title()
                    else:
                        book_name = base_name.title()
                        author_name = "Bilinmiyor"
                    
                    # Kitap meta verisini listeye ekle
                    book_metadata_list.append({
                        "author": author_name,
                        "book": book_name,
                        "pdf_file": file_name,
                        "total_pages": len(doc)
                    })
                    
                    logger.info(f"Kitap işleniyor: {book_name}")

                    for page_num in range(len(doc)):
                        page = doc.load_page(page_num)
                        text = page.get_text("text")
                        if text:
                            writer.add_document(
                                type='book',
                                title=book_name,
                                author=author_name,
                                content=text,
                                source=file_name,
                                page_or_id=str(page_num + 1),
                                category=None
                            )
                    doc.close()
                except Exception as e:
                    logger.error(f"PDF işlenirken hata oluştu {pdf_path.name}: {e}")
                    continue
            
            logger.info(">>> Kitapların indekslenmesi tamamlandı (yerel dosyalardan).")
        else:
            logger.warning("PDF bulunamadı ve PDF_BASE_URL ayarlanmamış. Kitaplar indekslenmeyecek.")
        
        # Kitap meta verilerini JSON dosyasına yaz
        with open(BOOK_METADATA_PATH, 'w', encoding='utf-8') as f:
            json.dump(book_metadata_list, f, ensure_ascii=False, indent=2)
        logger.info(f"Kitap meta verileri başarıyla '{BOOK_METADATA_PATH}' dosyasına kaydedildi.")

        # --- BÖLÜM 2: MAKALELERİ İndeksleme ---
        logger.info(">>> Adım 2: Makaleler (Veritabanından) indeksleniyor...")
        if not os.path.exists(ARTICLES_DB_PATH):
            logger.warning("Makale veritabanı bulunamadı. Bu adım atlanıyor.")
        else:
            conn = sqlite3.connect(ARTICLES_DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("SELECT id, title, content, category, url, author FROM articles")
            articles = cursor.fetchall()
            conn.close()
            
            logger.info(f"{len(articles)} adet makale veritabanından okundu.")

            for article in articles:
                clean_content = html_to_text(article['content'])
                if clean_content:
                    writer.add_document(
                        type='article',
                        title=article['title'],
                        author=article['author'],
                        content=clean_content,
                        source=article['url'],
                        page_or_id=str(article['id']),
                        category=article['category']
                    )
            logger.info(">>> Makalelerin indekslenmesi tamamlandı.")

        # --- SON ADIM: İndeksi Kaydetme ---
        writer.commit()
        logger.info("Birleşik arama indeksi ve meta veriler başarıyla oluşturuldu.")

    except Exception as e:
        logger.error(f"İndeks oluşturma sırasında genel bir hata oluştu: {e}")
        sys.exit(1)

if __name__ == "__main__":
    create_search_index()