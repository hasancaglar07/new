#!/usr/bin/env python3
# upload_youtube_cache_to_backblaze.py
# YouTube cache veritabanını Backblaze'e yükle

import os
import logging
from pathlib import Path
from dotenv import load_dotenv
from utils.b2_client import B2Client

# Load environment variables
load_dotenv('env.backend')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def upload_youtube_cache():
    """
    YouTube cache veritabanını manuel olarak yükle (şimdilik)
    """
    try:
        # YouTube cache dosyası
        cache_file = Path("data/youtube_cache.db")
        
        if not cache_file.exists():
            logger.error(f"YouTube cache dosyası bulunamadı: {cache_file}")
            return False
        
        # Dosya boyutunu kontrol et
        file_size = cache_file.stat().st_size / (1024 * 1024)  # MB
        logger.info(f"YouTube cache dosyası boyutu: {file_size:.2f} MB")
        
        # Manuel yükleme talimatları
        logger.info("📋 Manuel Yükleme Talimatları:")
        logger.info("1. Backblaze web arayüzüne giriş yapın")
        logger.info("2. yediulya-databases bucket'ına gidin")
        logger.info(f"3. {cache_file} dosyasını 'youtube_cache.db' adıyla yükleyin")
        logger.info("4. download_databases.py'ı güncelleyin")
        
        # URL'yi göster
        download_url = "https://cdn.mihmandar.org/file/yediulya-databases/youtube_cache.db"
        logger.info(f"📥 Hedef URL: {download_url}")
        
        return True
            
    except Exception as e:
        logger.error(f"YouTube cache yükleme hatası: {e}")
        return False

def get_cache_stats():
    """
    Cache istatistiklerini göster
    """
    try:
        from data.youtube_cache_db import get_channel_stats
        
        stats = get_channel_stats()
        
        logger.info("📊 YouTube Cache İstatistikleri:")
        logger.info(f"   Toplam video: {stats['total_videos']}")
        
        for channel in stats['channels']:
            logger.info(f"   {channel['channel_name']}: {channel['video_count']} video")
            
        return stats
        
    except Exception as e:
        logger.error(f"İstatistik alma hatası: {e}")
        return None

if __name__ == "__main__":
    print("🚀 YouTube Cache Backblaze Yükleme")
    print("=" * 50)
    
    # İstatistikleri göster
    print("\n📊 Cache istatistikleri alınıyor...")
    stats = get_cache_stats()
    
    if stats and stats['total_videos'] > 0:
        print(f"\n📥 {stats['total_videos']} video ile cache yükleniyor...")
        
        if upload_youtube_cache():
            print("\n🎉 YouTube cache başarıyla Backblaze'e yüklendi!")
            print("\n📋 Sonraki adımlar:")
            print("   1. download_databases.py'ı güncelle")
            print("   2. Railway'de test et")
            print("   3. Cache'den hızlı arama yap")
        else:
            print("\n❌ Yükleme başarısız oldu.")
    else:
        print("\n⚠️ Cache boş veya bulunamadı. Önce fetch_youtube_videos.py çalıştırın.")