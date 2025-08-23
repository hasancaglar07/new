#!/usr/bin/env python3
"""
YouTube Bot Koruması Çözümlerini Test Etme Scripti
"""

import asyncio
import os
import sys
from pathlib import Path

# Proje kök dizinini Python path'ine ekle
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from main import run_video_analysis, get_video_metadata_via_api, extract_video_id

async def test_youtube_fixes():
    """YouTube bot koruması çözümlerini test et"""
    
    print("🔍 YouTube Bot Koruması Çözümleri Test Ediliyor...")
    print("=" * 60)
    
    # Test URL'leri
    test_urls = [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",  # Rick Roll (kısa video)
        "https://www.youtube.com/watch?v=jNQXAC9IVRw",  # Me at the zoo (ilk YouTube video)
    ]
    
    for i, url in enumerate(test_urls, 1):
        print(f"\n📹 Test {i}: {url}")
        print("-" * 40)
        
        try:
            # Video ID çıkarma testi
            video_id = extract_video_id(url)
            print(f"✅ Video ID: {video_id}")
            
            # YouTube API testi
            if os.getenv('YOUTUBE_API_KEY'):
                print("🔑 YouTube API Key bulundu, test ediliyor...")
                api_metadata = get_video_metadata_via_api(video_id)
                if api_metadata:
                    print(f"✅ YouTube API başarılı: {api_metadata.get('title', 'Başlık yok')}")
                else:
                    print("❌ YouTube API başarısız")
            else:
                print("⚠️  YouTube API Key bulunamadı, .env dosyasına ekleyin")
            
            # Tam analiz testi (sadece metadata alma)
            print("🚀 Tam analiz testi başlatılıyor...")
            task_id = f"test_{i}_{video_id}"
            
            # Sadece metadata alma kısmını test et
            from main import update_task
            try:
                # Test için basit bir update_task fonksiyonu
                def mock_update_task(task_id, status, message=""):
                    print(f"📊 Task {task_id}: {status} - {message}")
                
                # main.py'daki update_task'ı geçici olarak değiştir
                import main
                original_update_task = main.update_task
                main.update_task = mock_update_task
                
                # Sadece metadata alma kısmını test et
                cookies_path = Path(__file__).parent / "data" / "youtube-cookies.txt"
                
                # Proxy ayarları (opsiyonel)
                proxy_settings = {}
                if os.getenv('HTTP_PROXY'):
                    proxy_settings['proxy'] = os.getenv('HTTP_PROXY')
                elif os.getenv('HTTPS_PROXY'):
                    proxy_settings['proxy'] = os.getenv('HTTPS_PROXY')
                
                ydl_opts = {
                    'quiet': True,
                    'skip_download': True,
                    'no_warnings': True,
                    'nocheckcertificate': True,
                    'geo_bypass': True,
                    'geo_bypass_country': 'TR',
                    'extractor_retries': 3,
                    'fragment_retries': 3,
                    'retries': 3,
                    **proxy_settings,
                    'http_headers': {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                        'Accept-Encoding': 'gzip, deflate',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                    },
                    **({'cookiefile': str(cookies_path)} if cookies_path.exists() else {}),
                }
                
                import yt_dlp
                metadata = None
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        if attempt > 0:
                            wait_time = min(2 ** attempt, 10)
                            print(f"⏳ Rate limiting: {wait_time} saniye bekleniyor...")
                            await asyncio.sleep(wait_time)
                        
                        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                            metadata = await asyncio.to_thread(ydl.extract_info, url, download=False)
                        print(f"✅ yt-dlp başarılı (deneme {attempt + 1})")
                        break
                    except Exception as e:
                        error_msg = str(e).lower()
                        if any(bot_indicator in error_msg for bot_indicator in [
                            "sign in to confirm you're not a bot",
                            "bot",
                            "captcha",
                            "rate limit",
                            "too many requests"
                        ]) and attempt < max_retries - 1:
                            print(f"⚠️  Bot koruması/rate limit tespit edildi, {attempt + 1}/{max_retries} deneme")
                            continue
                        else:
                            print(f"❌ yt-dlp hatası: {e}")
                            break
                
                if metadata:
                    print(f"✅ Metadata alındı: {metadata.get('title', 'Başlık yok')}")
                else:
                    print("❌ Metadata alınamadı")
                
                # Orijinal update_task'ı geri yükle
                main.update_task = original_update_task
                
            except Exception as e:
                print(f"❌ Test hatası: {e}")
            
        except Exception as e:
            print(f"❌ Genel hata: {e}")
    
    print("\n" + "=" * 60)
    print("🎯 Test tamamlandı!")
    print("\n💡 Öneriler:")
    print("1. .env dosyasına YOUTUBE_API_KEY ekleyin")
    print("2. Proxy ayarları yapın (gerekirse)")
    print("3. Cookie dosyasını güncelleyin")
    print("4. Rate limiting sürelerini artırın")

if __name__ == "__main__":
    # Environment variables yükle
    from dotenv import load_dotenv
    load_dotenv()
    
    # Test çalıştır
    asyncio.run(test_youtube_fixes())
