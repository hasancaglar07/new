#!/usr/bin/env python3
# check_config.py
# Railway deployment için gerekli environment variable'ları kontrol eder

import os
from config import *

def main():
    """Environment variable'ları kontrol eder"""
    
    print("🔍 RAILWAY DEPLOYMENT KONTROLÜ")
    print("=" * 50)
    
    # Backblaze URL'leri
    print("\n📚 BACKBLAZE URL'LERİ:")
    print(f"   PDF_BASE_URL: {PDF_BASE_URL}")
    print(f"   AUDIO_BASE_URL: {AUDIO_BASE_URL}")
    
    # Backblaze B2 API anahtarları
    print("\n🔑 BACKBLAZE B2 API ANAHTARLARI:")
    print(f"   B2_APPLICATION_KEY_ID: {'✅ Ayarlandı' if B2_APPLICATION_KEY_ID else '❌ Eksik'}")
    print(f"   B2_APPLICATION_KEY: {'✅ Ayarlandı' if B2_APPLICATION_KEY else '❌ Eksik'}")
    print(f"   B2_BUCKET_NAME: {B2_BUCKET_NAME}")
    
    # Supabase
    print("\n🗄️ SUPABASE VERİTABANI:")
    print(f"   SUPABASE_DB_URL: {'✅ Ayarlandı' if os.getenv('SUPABASE_DB_URL') or os.getenv('DATABASE_URL') else '❌ Eksik'}")
    
    # API anahtarları
    print("\n🔑 API ANAHTARLARI:")
    print(f"   DEEPGRAM_API_KEY: {'✅ Ayarlandı' if DEEPGRAM_API_KEY else '❌ Eksik'}")
    print(f"   DEEPSEEK_API_KEY: {'✅ Ayarlandı' if DEEPSEEK_API_KEY else '❌ Eksik'}")
    print(f"   YOUTUBE_API_KEYS: {len(YOUTUBE_API_KEYS)} anahtar mevcut")
    
    # Öneriler
    print("\n💡 RAILWAY'DE AYARLANMASI GEREKEN ENVIRONMENT VARIABLE'LAR:")
    print("=" * 60)
    
    required_vars = [
        "PDF_BASE_URL",
        "AUDIO_BASE_URL", 
        "B2_APPLICATION_KEY_ID",
        "B2_APPLICATION_KEY",
        "B2_BUCKET_NAME",
        "SUPABASE_DB_URL",
        "DEEPGRAM_API_KEY",
        "DEEPSEEK_API_KEY"
    ]
    
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"   ✅ {var}: {value[:50]}{'...' if len(value) > 50 else ''}")
        else:
            print(f"   ❌ {var}: EKSİK!")
    
    # Özel notlar
    print("\n📝 ÖZEL NOTLAR:")
    print("   1. PDF_BASE_URL: Backblaze'deki PDF bucket'ının public URL'si")
    print("   2. B2_APPLICATION_KEY_ID: Backblaze B2 API anahtar ID'si")
    print("   3. B2_APPLICATION_KEY: Backblaze B2 API anahtarı")
    print("   4. B2_BUCKET_NAME: PDF'lerin bulunduğu bucket adı")
    
    print("\n🚀 Railway'de bu değişkenleri ayarladıktan sonra deploy edin!")

if __name__ == "__main__":
    main()
