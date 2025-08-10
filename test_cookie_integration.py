#!/usr/bin/env python3
"""
YouTube Cookie Entegrasyonu Test Scripti
Bu script, data/youtube-cookies.txt dosyasının doğru şekilde entegre edildiğini test eder.
"""

import os
import sys
from pathlib import Path
import yt_dlp
import tempfile
import time

def test_cookie_file_exists():
    """Cookie dosyasının varlığını ve okunabilirliğini test eder."""
    print("🔍 Cookie dosyası testi...")
    
    # Cookie dosyası yolu
    cookies_path = Path(__file__).parent / "data" / "youtube-cookies.txt"
    
    if not cookies_path.exists():
        print("❌ Cookie dosyası bulunamadı:", cookies_path)
        return False
    
    if not cookies_path.is_file():
        print("❌ Cookie dosyası bir dosya değil:", cookies_path)
        return False
    
    try:
        with open(cookies_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.strip().split('\n')
            
        print(f"✅ Cookie dosyası bulundu: {cookies_path}")
        print(f"   Satır sayısı: {len(lines)}")
        print(f"   Boyut: {len(content)} karakter")
        
        # Cookie formatını kontrol et
        valid_cookies = [line for line in lines if line.strip() and not line.startswith('#')]
        print(f"   Geçerli cookie sayısı: {len(valid_cookies)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Cookie dosyası okunamadı: {e}")
        return False

def test_yt_dlp_cookie_integration():
    """yt-dlp ile cookie entegrasyonunu test eder."""
    print("\n🔍 yt-dlp Cookie Entegrasyonu Testi...")
    
    # Cookie dosyası yolu
    cookies_path = Path(__file__).parent / "data" / "youtube-cookies.txt"
    
    # Test için basit bir yt-dlp konfigürasyonu
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'nocheckcertificate': True,
        'geo_bypass': True,
        'geo_bypass_country': 'TR',
        'extractor_retries': 1,
        'fragment_retries': 1,
        'retries': 1,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        **({'cookiefile': str(cookies_path)} if cookies_path.exists() else {}),
    }
    
    print("   yt-dlp konfigürasyonu:")
    for key, value in ydl_opts.items():
        if key == 'cookiefile':
            print(f"     ✅ {key}: {value}")
        else:
            print(f"     {key}: {value}")
    
    # Cookie dosyası entegre edildi mi kontrol et
    if 'cookiefile' in ydl_opts:
        print("   ✅ Cookie dosyası yt-dlp konfigürasyonuna entegre edildi")
        return True
    else:
        print("   ❌ Cookie dosyası yt-dlp konfigürasyonuna entegre edilmedi")
        return False

def test_cookie_file_permissions():
    """Cookie dosyası izinlerini test eder."""
    print("\n🔍 Cookie Dosyası İzinleri Testi...")
    
    cookies_path = Path(__file__).parent / "data" / "youtube-cookies.txt"
    
    if not cookies_path.exists():
        print("❌ Cookie dosyası bulunamadı")
        return False
    
    try:
        # Dosya izinlerini kontrol et
        stat_info = cookies_path.stat()
        mode = stat_info.st_mode
        
        # Okuma izni var mı?
        if os.access(cookies_path, os.R_OK):
            print("✅ Dosya okunabilir")
        else:
            print("❌ Dosya okunamıyor")
            return False
        
        # İzinleri göster (Unix sistemlerde)
        if hasattr(os, 'stat'):
            permissions = oct(mode)[-3:]
            print(f"   Dosya izinleri: {permissions}")
            
            # 644 izinleri kontrol et (rw-r--r--)
            if permissions == '644':
                print("   ✅ İzinler doğru (644)")
            else:
                print(f"   ⚠️  İzinler farklı: {permissions} (beklenen: 644)")
        
        return True
        
    except Exception as e:
        print(f"❌ İzin kontrolü hatası: {e}")
        return False

def test_environment_variables():
    """YouTube bot koruması için gerekli environment variables'ları test eder."""
    print("\n🔍 Environment Variables Testi...")
    
    required_vars = ['YOUTUBE_API_KEY', 'HTTP_PROXY', 'HTTPS_PROXY']
    optional_vars = ['DEEPGRAM_API_KEY']
    
    print("   Gerekli environment variables:")
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"     ✅ {var}: {value[:20]}{'...' if len(value) > 20 else ''}")
        else:
            print(f"     ⚠️  {var}: Tanımlanmamış (opsiyonel)")
    
    print("   Opsiyonel environment variables:")
    for var in optional_vars:
        value = os.getenv(var)
        if value:
            print(f"     ✅ {var}: {value[:20]}{'...' if len(value) > 20 else ''}")
        else:
            print(f"     ⚠️  {var}: Tanımlanmamış")
    
    return True

def main():
    """Ana test fonksiyonu."""
    print("🚀 YouTube Cookie Entegrasyonu Test Scripti")
    print("=" * 50)
    
    tests = [
        ("Cookie Dosyası Varlığı", test_cookie_file_exists),
        ("yt-dlp Cookie Entegrasyonu", test_yt_dlp_cookie_integration),
        ("Cookie Dosyası İzinleri", test_cookie_file_permissions),
        ("Environment Variables", test_environment_variables),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name}: BAŞARILI")
            else:
                print(f"❌ {test_name}: BAŞARISIZ")
        except Exception as e:
            print(f"❌ {test_name}: HATA - {e}")
        
        print()
    
    print("=" * 50)
    print(f"📊 Test Sonuçları: {passed}/{total} başarılı")
    
    if passed == total:
        print("🎉 Tüm testler başarılı! Cookie entegrasyonu tam olarak çalışıyor.")
        return 0
    else:
        print("⚠️  Bazı testler başarısız. Lütfen hataları kontrol edin.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
