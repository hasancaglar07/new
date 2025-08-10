#!/usr/bin/env python3
# download_index_from_backblaze.py
# Railway'de Backblaze'den hazır indeksi indirir

import os
import zipfile
import requests
from pathlib import Path
from config import *

def download_and_extract_index():
    """Backblaze'den indeks paketini indirir ve çıkarır"""
    
    print("📥 İNDEKS İNDİRİLİYOR VE ÇIKARILIYOR")
    print("=" * 50)
    
    # Temel dizinler
    base_dir = Path(__file__).parent
    data_dir = base_dir / "data"
    
    # Backblaze'den indeks paketini indir
    # Not: Bu dosyayı manuel olarak yükleyin ve URL'yi güncelleyin; ortam değişkeni ile de geçilebilir
    index_package_url = os.getenv(
        "INDEX_PACKAGE_URL",
        "https://cdn.mihmandar.org/file/yediulya-index/whoosh_index_package_20250810_032102.zip",
    )
    
    print(f"🔗 İndeks paketi indiriliyor: {index_package_url}")
    
    try:
        # İndeks paketini indir
        response = requests.get(index_package_url, timeout=300)  # 5 dakika timeout
        response.raise_for_status()
        
        # Paket dosyasını kaydet
        package_path = base_dir / "whoosh_index_package.zip"
        with open(package_path, 'wb') as f:
            f.write(response.content)
        
        package_size = len(response.content) / (1024 * 1024)  # MB
        print(f"✅ İndeks paketi indirildi: {package_size:.1f} MB")
        
        # Paketi çıkar
        print("📦 Paket çıkarılıyor...")
        
        with zipfile.ZipFile(package_path, 'r') as zipf:
            # data/ klasörünü oluştur
            data_dir.mkdir(exist_ok=True)
            
            # Dosyaları çıkar
            for file_info in zipf.filelist:
                # Dosya yolunu al
                file_path = Path(file_info.filename)
                
                # data/ klasörüne çıkar
                if file_path.parts and file_path.parts[0] == "whoosh_index":
                    # whoosh_index klasörü için
                    target_path = data_dir / file_path
                else:
                    # Diğer dosyalar için
                    target_path = data_dir / file_path.name
                
                # Dizini oluştur
                target_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Dosyayı çıkar
                with zipf.open(file_info) as source, open(target_path, 'wb') as target:
                    target.write(source.read())
                
                print(f"   ✅ {file_path} çıkarıldı")
        
        # Geçici paket dosyasını sil
        package_path.unlink()
        print(f"🗑️ Geçici paket dosyası silindi")
        
        # Sonuçları göster
        print(f"\n🎉 İndeks başarıyla indirildi ve çıkarıldı!")
        print(f"📁 Konum: {data_dir}")
        
        # Dosya varlığını kontrol et
        check_files_exist(data_dir)
        
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ İndeks indirilemedi: {e}")
        print(f"💡 Manuel olarak indirip çıkarın:")
        print(f"   1. {index_package_url} adresinden dosyayı indirin")
        print(f"   2. data/ klasörüne çıkarın")
        return False
        
    except Exception as e:
        print(f"❌ Hata oluştu: {e}")
        return False

def check_files_exist(data_dir):
    """Gerekli dosyaların varlığını kontrol eder"""
    
    print(f"\n📋 DOSYA KONTROLÜ")
    print("=" * 30)
    
    required_files = [
        "whoosh_index",
        "book_metadata.json", 
        "articles_database.db"
    ]
    
    for file_name in required_files:
        file_path = data_dir / file_name
        if file_path.exists():
            if file_path.is_dir():
                # Dizin için dosya sayısını göster
                file_count = len(list(file_path.rglob("*")))
                print(f"   ✅ {file_name}/ ({file_count} dosya)")
            else:
                # Dosya için boyutu göster
                size_mb = file_path.stat().st_size / (1024 * 1024)
                print(f"   ✅ {file_name} ({size_mb:.1f} MB)")
        else:
            print(f"   ❌ {file_name} bulunamadı!")

def main():
    """Ana fonksiyon"""
    
    print("🚀 BACKBLAZE'DEN İNDEKS İNDİRİCİ")
    print("=" * 50)
    
    # Environment variable kontrolü
    if not PDF_BASE_URL:
        print("❌ PDF_BASE_URL ayarlanmamış!")
        print("💡 Railway'de environment variable'ları ayarlayın")
        return
    
    print(f"🔧 PDF_BASE_URL: {PDF_BASE_URL}")
    
    # İndeksi indir ve çıkar
    success = download_and_extract_index()
    
    if success:
        print(f"\n✅ İşlem başarılı!")
        print(f"🚀 Uygulama hazır indeksi kullanacak")
        print(f"⏱️ İndeks oluşturma süresi: 0 saniye!")
    else:
        print(f"\n❌ İşlem başarısız!")
        print(f"💡 Manuel olarak indeksi indirip çıkarın")

if __name__ == "__main__":
    main()
