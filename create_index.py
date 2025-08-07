# create_index.py
# Versiyon 2.0 - Hem PDF'leri hem de veritabanındaki makaleleri indeksleyecek şekilde güncellendi.

import os
from pathlib import Path
import fitz  # PyMuPDF
import logging
import sys
import sqlite3 # ★★★ Makale veritabanına bağlanmak için eklendi ★★★
from bs4 import BeautifulSoup # ★★★ HTML temizliği için eklendi ★★★

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
ARTICLES_DB_PATH = DATA_DIR / "articles_database.db" # ★★★ Makale veritabanı yolu eklendi ★★★

# ★★★ HTML'i temiz metne dönüştüren yardımcı fonksiyon ★★★
def html_to_text(html_content):
    """HTML içeriğini temiz metne dönüştürür."""
    if not html_content:
        return ""
    soup = BeautifulSoup(html_content, 'html.parser')
    return soup.get_text(separator=' ', strip=True)

def create_search_index():
    """
    PDF'leri ve veritabanındaki makaleleri tarayarak birleşik bir Whoosh arama indeksi oluşturur.
    """
    if not os.path.exists(INDEX_DIR):
        os.makedirs(INDEX_DIR)
        logger.info(f"İndeks klasörü oluşturuldu: {INDEX_DIR}")

    # ★★★ YENİ, EVRENSEL ŞEMA ★★★
    # Hem kitapları hem de makaleleri tutabilecek genel bir yapı.
    schema = Schema(
        type=ID(stored=True),        # 'book' veya 'article'
        title=TEXT(stored=True),     # Kitap adı veya makale başlığı
        author=TEXT(stored=True),    # Yazar adı
        content=TEXT(stored=True),   # Aranacak ana metin (temizlenmiş)
        source=ID(stored=True),      # Kaynak: PDF dosya adı veya makale URL'si
        page_or_id=ID(stored=True),  # Kitaplar için sayfa no, makaleler için veritabanı ID'si
        category=TEXT(stored=True)   # Makaleler için site adı (kitaplar için boş)
    )

    try:
        ix = create_in(INDEX_DIR, schema)
        writer = ix.writer()
        logger.info("Yeni birleşik arama indeksi oluşturuluyor...")

        # --- BÖLÜM 1: PDF'leri İndeksleme (Mevcut Kodun Uyarlanması) ---
        logger.info(">>> Adım 1: Kitaplar (PDF'ler) indeksleniyor...")
        pdf_files = list(PDF_DIR.glob("*.pdf"))
        
        if not pdf_files:
            logger.warning("İndekslenecek PDF bulunamadı. Bu bir hata değilse devam ediliyor.")
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
                    
                    logger.info(f"Kitap işleniyor: {book_name}")

                    for page_num in range(len(doc)):
                        page = doc.load_page(page_num)
                        text = page.get_text("text")
                        if text:
                            # ★★★ Yeni şemaya göre veri ekleme ★★★
                            writer.add_document(
                                type='book',
                                title=book_name,
                                author=author_name,
                                content=text,
                                source=file_name,
                                page_or_id=str(page_num + 1),
                                category=None # Kitapların kategorisi yok
                            )
                    doc.close()
                except Exception as e:
                    logger.error(f"PDF işlenirken hata oluştu {pdf_path.name}: {e}")
                    continue
        logger.info(">>> Kitapların indekslenmesi tamamlandı.")

        # --- BÖLÜM 2: MAKALELERİ İndeksleme (Yeni Kod) ---
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
        logger.info("Birleşik arama indeksi başarıyla oluşturuldu ve kaydedildi.")

    except Exception as e:
        logger.error(f"İndeks oluşturma sırasında genel bir hata oluştu: {e}")
        sys.exit(1)

if __name__ == "__main__":
    create_search_index()