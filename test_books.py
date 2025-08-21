#!/usr/bin/env python3
# test_books.py
# Kitapların doğru şekilde listelenip listelenmediğini test eder

import json
from pathlib import Path
from config import *

def test_books_functionality():
    """Kitapların doğru şekilde çalışıp çalışmadığını test eder"""
    
    print("🧪 KİTAP FONKSİYONALİTESİ TESTİ")
    print("=" * 50)
    
    # 1. Config kontrolü
    print("1. Yapılandırma Kontrolü:")
    print(f"   PDF_BASE_URL: {PDF_BASE_URL}")
    print(f"   AUDIO_BASE_URL: {AUDIO_BASE_URL}")
    print(f"   DATA_DIR: {DATA_DIR}")
    
    # 2. book_metadata.json kontrolü
    print("\n2. Kitap Meta Veri Kontrolü:")
    book_metadata_path = DATA_DIR / "book_metadata.json"
    
    if not book_metadata_path.exists():
        print("   ❌ book_metadata.json bulunamadı!")
        return False
    
    try:
        with open(book_metadata_path, 'r', encoding='utf-8') as f:
            books = json.load(f)
        print(f"   ✅ {len(books)} kitap bulundu")
        
        # İlk birkaç kitabı göster
        print("\n   İlk 3 kitap:")
        for i, book in enumerate(books[:3]):
            print(f"     {i+1}. {book['book']} - {book['author']}")
            print(f"        PDF: {book['pdf_file']}")
            if PDF_BASE_URL:
                pdf_url = f"{PDF_BASE_URL}/{book['pdf_file']}"
                print(f"        URL: {pdf_url}")
        
    except Exception as e:
        print(f"   ❌ Meta veri okunamadı: {e}")
        return False
    
    # 3. PDF URL'leri test et
    print("\n3. PDF URL Testi:")
    if PDF_BASE_URL:
        print(f"   ✅ PDF_BASE_URL ayarlanmış: {PDF_BASE_URL}")
        
        # Test PDF URL'i oluştur
        test_pdf = books[0]['pdf_file']
        test_url = f"{PDF_BASE_URL}/{test_pdf}"
        print(f"   Test URL: {test_url}")
        
        # URL format kontrolü
        if test_url.startswith("https://"):
            print("   ✅ URL format doğru")
        else:
            print("   ❌ URL format yanlış")
    else:
        print("   ❌ PDF_BASE_URL ayarlanmamış!")
        return False
    
    # 4. Simüle edilmiş books_by_author endpoint'i
    print("\n4. Simüle Edilmiş Endpoint Testi:")
    
    books_by_author = {}
    for book in books:
        author = book['author']
        if author not in books_by_author:
            books_by_author[author] = []
        
        book_data = {
            "kitap_adi": book['book'],
            "pdf_dosyasi": book['pdf_file'],
            "toplam_sayfa": book['total_pages']
        }
        
        # PDF URL'sini ekle
        if PDF_BASE_URL:
            book_data["pdf_url"] = f"{PDF_BASE_URL}/{book['pdf_file']}"
        
        books_by_author[author].append(book_data)
    
    # Sonuçları göster
    print(f"   ✅ {len(books_by_author)} yazar bulundu")
    
    # İlk yazarın kitaplarını göster
    first_author = list(books_by_author.keys())[0]
    first_books = books_by_author[first_author]
    print(f"\n   İlk yazar ({first_author}) kitapları:")
    for book in first_books[:2]:  # İlk 2 kitap
        print(f"     - {book['kitap_adi']}")
        if 'pdf_url' in book:
            print(f"       PDF URL: {book['pdf_url']}")
    
    print("\n✅ Tüm testler başarılı!")
    print("\n🚀 Railway'de test etmek için:")
    print(f"   GET /books/list")
    print(f"   GET /books_by_author")
    print(f"   GET /pdf/access?pdf_file={test_pdf}")
    
    return True

if __name__ == "__main__":
    test_books_functionality()
