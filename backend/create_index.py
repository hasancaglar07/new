# backend/create_index.py

import os
from pathlib import Path
import fitz  # PyMuPDF
from whoosh.index import create_in
from whoosh.fields import Schema, TEXT, ID
import logging

# Temel yapılandırma
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Proje yollarını tanımla (bu script backend klasöründe olduğu için)
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
PDF_DIR = DATA_DIR / "pdfler"
INDEX_DIR = DATA_DIR / "whoosh_index"

def create_search_index():
    """
    PDF klasörünü tarar ve Whoosh arama indeksini oluşturur.
    Render.com'da her build sırasında çalıştırılmak üzere tasarlanmıştır.
    """
    # 1. İndeks klasörünün var olduğundan emin ol
    if not os.path.exists(INDEX_DIR):
        os.makedirs(INDEX_DIR)
        logger.info(f"İndeks klasörü oluşturuldu: {INDEX_DIR}")

    # 2. Whoosh şemasını tanımla
    schema = Schema(
        book=TEXT(stored=True),
        author=TEXT(stored=True),
        page=ID(stored=True),
        content=TEXT(stored=True),
        pdf_file=ID(stored=True)
    )

    # 3. İndeksi oluştur
    try:
        ix = create_in(INDEX_DIR, schema)
        writer = ix.writer()
        logger.info("Yeni arama indeksi oluşturuluyor...")

        # 4. PDF klasöründeki tüm PDF'leri işle
        pdf_files = list(PDF_DIR.glob("*.pdf"))
        if not pdf_files:
            logger.warning(f"İndekslenecek PDF bulunamadı: {PDF_DIR}")
            return

        for pdf_path in pdf_files:
            try:
                doc = fitz.open(pdf_path)
                file_name = pdf_path.name
                base_name = file_name.replace(".pdf", "").replace("_", " ")

                # Dosya adından yazar ve kitap adını çıkar
                if "-" in base_name:
                    book_part, author_part = base_name.split("-", 1)
                    book_name = book_part.strip().title()
                    author_name = author_part.strip().title()
                else:
                    book_name = base_name.title()
                    author_name = "Bilinmiyor"
                
                logger.info(f"İndeksleniyor: {book_name} - {author_name}")

                # Her sayfayı indekse ekle
                for page_num in range(len(doc)):
                    page = doc.load_page(page_num)
                    text = page.get_text("text")
                    if text:
                        writer.add_document(
                            book=book_name,
                            author=author_name,
                            page=str(page_num + 1),
                            content=text,
                            pdf_file=file_name
                        )
                doc.close()
            except Exception as e:
                logger.error(f"PDF işlenirken hata oluştu {pdf_path.name}: {e}")
                continue
        
        # 5. Yazma işlemini bitir ve indeksi kaydet
        writer.commit()
        logger.info("Arama indeksi başarıyla oluşturuldu ve kaydedildi.")

    except Exception as e:
        logger.error(f"İndeks oluşturma sırasında genel bir hata oluştu: {e}")

if __name__ == "__main__":
    create_search_index()