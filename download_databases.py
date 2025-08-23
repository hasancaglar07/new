#!/usr/bin/env python3
"""
Database dosyalarını Backblaze'den indirir.
Railway deployment sırasında çalışır.
"""
import os
import requests
import logging
import zipfile

# Backblaze URL'leri (bu URL'leri Backblaze'e dosyaları yükledikten sonra güncelleyeceğiz)
DATABASE_URLS = {
    "articles_database.db": "https://cdn.mihmandar.org/file/yediulya-databases/articles_database.db",
    "audio_database.db": "https://cdn.mihmandar.org/file/yediulya-databases/audio_database.db", 
    "qa_database.db": "https://cdn.mihmandar.org/file/yediulya-databases/qa_database.db",
    "book_metadata.json": "https://cdn.mihmandar.org/file/yediulya-databases/book_metadata.json",
    "authors.json": "https://cdn.mihmandar.org/file/yediulya-databases/authors.json",
    "vector_db.zip": "https://cdn.mihmandar.org/file/yediulya-databases/vector_db.zip",
    "youtube_cache.db": "https://cdn.mihmandar.org/file/yediulya-databases/youtube_cache.db"
}

def download_file(url, local_path):
    """Dosyayı URL'den indirir"""
    try:
        print(f"İndiriliyor: {url} -> {local_path}")
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()
        
        # Klasörü oluştur
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        # Dosyayı yaz
        with open(local_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"✅ İndirildi: {local_path}")
        return True
    except Exception as e:
        print(f"❌ İndirme hatası {url}: {e}")
        return False

def extract_vector_db_zip(zip_path, extract_to):
    """Vector DB ZIP dosyasını çıkarır"""
    try:
        print(f"📦 ZIP çıkarılıyor: {zip_path} -> {extract_to}")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_to)
        
        # ZIP dosyasını sil
        os.remove(zip_path)
        print(f"✅ ZIP çıkarıldı ve silindi: {zip_path}")
        return True
    except Exception as e:
        print(f"❌ ZIP çıkarma hatası: {e}")
        return False

def ensure_databases():
    """Database dosyalarının mevcut olduğundan emin olur"""
    data_dir = "/app/data"
    
    for db_name, url in DATABASE_URLS.items():
        local_path = os.path.join(data_dir, db_name)
        
        # Vector DB ZIP özel işlemi
        if db_name == "vector_db.zip":
            vector_db_dir = os.path.join(data_dir, "vector_db")
            faiss_index = os.path.join(vector_db_dir, "faiss.index")
            
            # FAISS index zaten varsa atla
            if os.path.exists(faiss_index):
                print(f"✅ Vector DB zaten mevcut: {faiss_index}")
                continue
            
            # ZIP'i indir
            success = download_file(url, local_path)
            if success:
                # ZIP'i çıkar
                extract_vector_db_zip(local_path, data_dir)
            else:
                print(f"⚠️  Vector DB ZIP indirilemedi: {db_name}")
            continue
        
        # Diğer dosyalar için normal işlem
        # Dosya zaten varsa atla
        if os.path.exists(local_path):
            print(f"✅ Zaten mevcut: {local_path}")
            continue
            
        # Dosyayı indir
        success = download_file(url, local_path)
        if not success:
            print(f"⚠️  Database indirilemedi: {db_name}")

if __name__ == "__main__":
    ensure_databases()
