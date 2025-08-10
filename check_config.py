#!/usr/bin/env python3
# check_config.py
# Yapılandırma kontrolü ve Railway için gerekli environment variable'ları gösterir

import os
from pathlib import Path

def check_config():
    """Mevcut yapılandırmayı kontrol eder ve eksik olanları gösterir"""
    
    print("🔍 YAPILANDIRMA KONTROLÜ")
    print("=" * 50)
    
    # Temel dizinler
    base_dir = Path(__file__).parent
    data_dir = base_dir / "data"
    
    print(f"📁 Base Directory: {base_dir}")
    print(f"📁 Data Directory: {data_dir}")
    print(f"📁 PDF Directory: {data_dir / 'pdfler'}")
    print(f"📁 Index Directory: {data_dir / 'whoosh_index'}")
    
    # Dizin varlığı kontrolü
    print("\n📋 Dizin Kontrolleri:")
    print(f"   Data dir exists: {data_dir.exists()}")
    print(f"   PDF dir exists: {data_dir.exists() and (data_dir / 'pdfler').exists()}")
    print(f"   Index dir exists: {data_dir.exists() and (data_dir / 'whoosh_index').exists()}")
    
    # Environment variables kontrolü
    print("\n🔧 Environment Variables:")
    
    env_vars = {
        "PDF_BASE_URL": "https://cdn.mihmandar.org/file/yediulya-pdf-arsivi",
        "AUDIO_BASE_URL": "https://cdn.mihmandar.org/file/yediulya-ses-arsivi",
        "TURSO_ANALYSIS_URL": "your_turso_url_here",
        "TURSO_ANALYSIS_TOKEN": "your_turso_token_here",
        "DEEPGRAM_API_KEY": "your_deepgram_key_here",
        "DEEPSEEK_API_KEY": "your_deepseek_key_here",
        "YOUTUBE_API_KEY1": "your_youtube_key_here"
    }
    
    for var, default_value in env_vars.items():
        current_value = os.getenv(var)
        status = "✅ SET" if current_value else "❌ NOT SET"
        print(f"   {var}: {status}")
        if current_value:
            if "KEY" in var or "TOKEN" in var:
                print(f"      Value: {'*' * min(len(current_value), 10)}")
            else:
                print(f"      Value: {current_value}")
        else:
            print(f"      Default: {default_value}")
    
    # Dosya varlığı kontrolü
    print("\n📄 Dosya Kontrolleri:")
    
    important_files = [
        "data/book_metadata.json",
        "data/articles_database.db",
        "data/whoosh_index"
    ]
    
    for file_path in important_files:
        full_path = base_dir / file_path
        exists = full_path.exists()
        status = "✅ EXISTS" if exists else "❌ MISSING"
        print(f"   {file_path}: {status}")
        
        if file_path == "data/book_metadata.json" and exists:
            try:
                import json
                with open(full_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                print(f"      Books count: {len(data)}")
            except Exception as e:
                print(f"      Error reading: {e}")
    
    print("\n🚀 RAILWAY DEPLOYMENT İÇİN:")
    print("=" * 50)
    print("Railway'de aşağıdaki environment variable'ları ayarlayın:")
    print()
    
    for var, default_value in env_vars.items():
        if not os.getenv(var):
            print(f"   {var}={default_value}")
    
    print("\n💡 ÖNEMLİ NOTLAR:")
    print("1. PDF_BASE_URL ve AUDIO_BASE_URL zaten doğru değerlere sahip")
    print("2. TURSO_ANALYSIS_URL ve TURSO_ANALYSIS_TOKEN'ı kendi değerlerinizle değiştirin")
    print("3. API anahtarlarını kendi değerlerinizle değiştirin")
    print("4. Railway'de environment variable'ları ayarladıktan sonra uygulamayı yeniden deploy edin")

if __name__ == "__main__":
    check_config()
