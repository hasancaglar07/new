# create_index.py
# Versiyon 2.1 - Kitap meta verilerini 'book_metadata.json' dosyasına önceden işler.

import os
from pathlib import Path
import fitz
import logging
import sys
import sqlite3
from bs4 import BeautifulSoup
import json

from whoosh.index import create_in
from whoosh.fields import Schema, TEXT, ID

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

# HTML'i temiz metne dönüştüren yardımcı fonksiyon
def html_to_text(html_content):
    if not html_content:
        return ""
    soup = BeautifulSoup(html_content, 'html.parser')
    return soup.get_text(separator=' ', strip=True)

def create_search_index():
    """
    PDF'leri ve makaleleri tarayarak birleşik Whoosh indeksi ve kitap meta verilerini oluşturur.
    """
    if not os.path.exists(INDEX_DIR):
        os.makedirs(INDEX_DIR)
        logger.info(f"İndeks klasörü oluşturuldu: {INDEX_DIR}")

    # Evrensel Şema
    schema = Schema(
        type=ID(stored=True),
        title=TEXT(stored=True),
        author=TEXT(stored=True),
        content=TEXT(stored=True),
        source=ID(stored=True),
        page_or_id=ID(stored=True),
        category=TEXT(stored=True)
    )

    try:
        ix = create_in(INDEX_DIR, schema)
        writer = ix.writer()
        logger.info("Yeni birleşik arama indeksi oluşturuluyor...")

        # --- BÖLÜM 1: PDF'leri İşleme ve Meta Veri Toplama ---
        logger.info(">>> Adım 1: Kitaplar (PDF'ler) işleniyor...")
        
        # PDF dosyalarını kontrol et
        pdf_files = list(PDF_DIR.glob("*.pdf"))
        book_metadata_list = []

        if not pdf_files:
            if PDF_BASE_URL:
                logger.info(f"PDF'ler Backblaze'den çekilecek: {PDF_BASE_URL}")
                # Backblaze'den PDF listesi al (şimdilik boş liste)
                book_metadata_list = []
            else:
                logger.warning("İndekslenecek PDF bulunamadı ve PDF_BASE_URL ayarlanmamış. Bu bir hata değilse devam ediliyor.")
        else:
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
                    
                    # ★★★ Kitap meta verisini listeye ekle ★★★
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
        
        # ★★★ Toplanan kitap bilgilerini JSON dosyasına yaz ★★★
        with open(BOOK_METADATA_PATH, 'w', encoding='utf-8') as f:
            json.dump(book_metadata_list, f, ensure_ascii=False, indent=2)
        logger.info(f"Kitap meta verileri başarıyla '{BOOK_METADATA_PATH}' dosyasına kaydedildi.")

        logger.info(">>> Kitapların indekslenmesi tamamlandı.")

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