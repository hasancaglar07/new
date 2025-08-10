#!/usr/bin/env python3
# upload_index_to_backblaze.py
# Whoosh indeksini ve gerekli dosyaları Backblaze'e yükler

import os
import shutil
import zipfile
from pathlib import Path
from datetime import datetime

def create_index_package():
    """İndeks ve gerekli dosyaları paketler"""
    
    print("📦 İNDEKS PAKETİ OLUŞTURULUYOR")
    print("=" * 50)
    
    # Temel dizinler
    base_dir = Path(__file__).parent
    data_dir = base_dir / "data"
    
    # Paket dosyası adı
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    package_name = f"whoosh_index_package_{timestamp}.zip"
    package_path = base_dir / package_name
    
    print(f"📁 Paket oluşturuluyor: {package_name}")
    
    try:
        with zipfile.ZipFile(package_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            
            # 1. Whoosh indeksini ekle
            index_dir = data_dir / "whoosh_index"
            if index_dir.exists():
                print(f"   📚 Whoosh indeksi ekleniyor...")
                for file_path in index_dir.rglob("*"):
                    if file_path.is_file():
                        arc_name = f"whoosh_index/{file_path.relative_to(index_dir)}"
                        zipf.write(file_path, arc_name)
                        print(f"      ✅ {file_path.name} eklendi")
            
            # 2. Kitap meta verilerini ekle
            book_metadata = data_dir / "book_metadata.json"
            if book_metadata.exists():
                print(f"   📖 Kitap meta verileri ekleniyor...")
                zipf.write(book_metadata, "book_metadata.json")
                print(f"      ✅ book_metadata.json eklendi")
            
            # 3. Makale veritabanını ekle
            articles_db = data_dir / "articles_database.db"
            if articles_db.exists():
                print(f"   📰 Makale veritabanı ekleniyor...")
                zipf.write(articles_db, "articles_database.db")
                print(f"      ✅ articles_database.db eklendi")
            
            # 4. README dosyası ekle
            readme_content = f"""# Whoosh İndeks Paketi
Oluşturulma Tarihi: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

## İçerik:
- whoosh_index/ - Arama indeksi (134 MB)
- book_metadata.json - Kitap meta verileri (45 kitap)
- articles_database.db - Makale veritabanı (4099 makale)

## Kullanım:
1. Bu zip dosyasını Railway'de data/ klasörüne çıkarın
2. Uygulama otomatik olarak hazır indeksi kullanacak
3. İndeks oluşturma süresi: 0 saniye (önceden hazır)

## Not:
Bu paket her güncelleme sonrası yeniden yüklenmelidir.
"""
            
            zipf.writestr("README.md", readme_content)
            print(f"      ✅ README.md eklendi")
        
        # Paket boyutunu göster
        package_size = package_path.stat().st_size / (1024 * 1024)  # MB
        print(f"\n📦 Paket oluşturuldu: {package_name}")
        print(f"   Boyut: {package_size:.1f} MB")
        print(f"   Konum: {package_path}")
        
        return package_path
        
    except Exception as e:
        print(f"❌ Paket oluşturulamadı: {e}")
        return None

def show_upload_instructions(package_path):
    """Backblaze'e yükleme talimatlarını gösterir"""
    
    print("\n🚀 BACKBLAZE'E YÜKLEME TALİMATLARI")
    print("=" * 50)
    print(f"1. Dosya: {package_path.name}")
    print(f"2. Boyut: {package_path.stat().st_size / (1024 * 1024):.1f} MB")
    print()
    print("📤 Backblaze B2'ye yükleyin:")
    print("   - B2 Console'a gidin")
    print("   - 'yediulya-index' bucket'ını seçin")
    print("   - Bu zip dosyasını yükleyin")
    print()
    print("🔗 URL formatı:")
    print("   https://cdn.mihmandar.org/file/yediulya-index/[dosya_adi]")
    print()
    print("📝 Railway'de kullanım:")
    print("   - Bu zip dosyasını Railway'de data/ klasörüne çıkarın")
    print("   - Uygulama hazır indeksi kullanacak")
    print("   - İndeks oluşturma süresi: 0 saniye!")

def main():
    """Ana fonksiyon"""
    
    print("🚀 WHOOSH İNDEKS PAKETİ OLUŞTURUCU")
    print("=" * 50)
    
    # Paket oluştur
    package_path = create_index_package()
    
    if package_path:
        # Yükleme talimatlarını göster
        show_upload_instructions(package_path)
        
        print(f"\n✅ İşlem tamamlandı!")
        print(f"📦 Paket: {package_path}")
        print(f"🚀 Şimdi bu dosyayı Backblaze'e yükleyin!")
    else:
        print("❌ Paket oluşturulamadı!")

if __name__ == "__main__":
    main()
