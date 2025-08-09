#!/usr/bin/env python3
"""
Database dosyalarını Backblaze'e yüklemek için yardımcı script.
Kullanım: Bu dosyaları manuel olarak Backblaze'e yükleyip URL'leri download_databases.py'de güncelleyin.
"""
import os

def list_database_files():
    """Yüklenecek database dosyalarını listeler"""
    files_to_upload = [
        "data/articles_database.db",
        "data/audio_database.db", 
        "data/qa_database.db",
        "data/book_metadata.json",
        "data/authors.json",
        "data/yazar_profilleri.py"
    ]
    
    print("🗂️  Backblaze'e yüklenecek dosyalar:")
    print("=" * 50)
    
    total_size = 0
    for file_path in files_to_upload:
        if os.path.exists(file_path):
            size = os.path.getsize(file_path)
            size_mb = size / (1024 * 1024)
            total_size += size
            print(f"✅ {file_path} - {size_mb:.2f} MB")
        else:
            print(f"❌ {file_path} - BULUNAMADI")
    
    total_mb = total_size / (1024 * 1024)
    print("=" * 50)
    print(f"📊 Toplam boyut: {total_mb:.2f} MB")
    
    print("\n📋 Backblaze Upload Talimatları:")
    print("1. Backblaze hesabınıza giriş yapın")
    print("2. 'yediulya-databases' bucket'ını oluşturun (yoksa)")
    print("3. Yukarıdaki dosyaları bucket'a yükleyin")
    print("4. Her dosya için public URL alın")
    print("5. download_databases.py'deki DATABASE_URLS'leri güncelleyin")
    
    print("\n🔗 Beklenen URL formatı:")
    for file_path in files_to_upload:
        filename = os.path.basename(file_path)
        print(f"   {filename}: https://cdn.mihmandar.org/file/yediulya-databases/{filename}")

if __name__ == "__main__":
    list_database_files()
