# 📚 Kitap Görüntüleme Sorunu - Çözüm Rehberi

## 🔍 Sorun Nedir?

Uygulama çalışıyor ve indeks oluşturuluyor, ancak kitaplar görüntülenmiyor. Loglardan görüldüğü üzere:

```
2025-08-09 23:45:48,743 - INFO - PDF'ler Backblaze'den çekilecek: https://cdn.mihmandar.org/file/yediulya-pdf-arsivi/
2025-08-09 23:45:48,745 - INFO - Mevcut kitap meta verisi yüklendi: 45 kitap
```

**Sorun**: PDF'ler Backblaze'den indeksleniyor ama uygulama çalışırken bu URL'lere erişemiyor.

## ✅ Çözüm Adımları

### 1. Environment Variables Ayarlama

Railway'de aşağıdaki environment variable'ları ayarlayın:

```bash
PDF_BASE_URL=https://cdn.mihmandar.org/file/yediulya-pdf-arsivi
AUDIO_BASE_URL=https://cdn.mihmandar.org/file/yediulya-ses-arsivi
TURSO_ANALYSIS_URL=your_turso_url_here
TURSO_ANALYSIS_TOKEN=your_turso_token_here
DEEPGRAM_API_KEY=your_deepgram_key_here
DEEPSEEK_API_KEY=your_deepseek_key_here
YOUTUBE_API_KEY1=your_youtube_key_here
```

### 2. Railway'de Environment Variables Nasıl Ayarlanır?

1. Railway dashboard'a gidin
2. Projenizi seçin
3. "Variables" sekmesine tıklayın
4. Yukarıdaki değişkenleri ekleyin
5. "Deploy" butonuna tıklayın

### 3. Yeni Endpoint'ler

Uygulamaya aşağıdaki yeni endpoint'ler eklendi:

- **`/books/list`** - Tüm kitapları PDF URL'leri ile listeler
- **`/pdf/access?pdf_file=filename.pdf`** - PDF'e doğrudan erişim
- **`/books_by_author`** - Güncellendi, artık PDF URL'leri de içeriyor

### 4. Test Etme

Environment variable'ları ayarladıktan sonra:

```bash
# Tüm kitapları listele
curl https://your-railway-app.railway.app/books/list

# Belirli bir PDF'e erişim
curl https://your-railway-app.railway.app/pdf/access?pdf_file=ashab_i_kiram_1-m.sami_ramazanoğlu.pdf

# Yazar bazında kitaplar
curl https://your-railway-app.railway.app/books_by_author
```

## 🔧 Teknik Detaylar

### Önceki Durum
- PDF'ler sadece indeks oluşturma sırasında Backblaze'den indiriliyordu
- Uygulama çalışırken PDF'lere erişemiyordu
- `book_metadata.json` dosyası mevcut ama PDF URL'leri eksikti

### Yeni Durum
- PDF'ler Backblaze'den dinamik olarak erişilebilir
- Her kitap için PDF URL'i mevcut
- Uygulama hem yerel hem uzak PDF'lere erişebilir

### Dosya Yapısı
```
├── config.py              # Yapılandırma dosyası
├── main.py                # Ana uygulama (güncellendi)
├── create_index.py        # İndeks oluşturma
├── check_config.py        # Yapılandırma kontrolü
└── data/
    ├── book_metadata.json # Kitap meta verileri
    ├── whoosh_index/      # Arama indeksi
    └── articles_database.db
```

## 🚀 Deployment Sonrası

1. Environment variable'ları ayarlayın
2. Railway'de yeniden deploy edin
3. Uygulama başladığında indeks otomatik oluşturulacak
4. Kitaplar artık görüntülenebilir olacak

## 📝 Notlar

- **PDF_BASE_URL** ve **AUDIO_BASE_URL** zaten doğru değerlere sahip
- **TURSO_ANALYSIS_URL** ve **TURSO_ANALYSIS_TOKEN**'ı kendi değerlerinizle değiştirin
- API anahtarlarını kendi değerlerinizle değiştirin
- Uygulama her başladığında indeks otomatik olarak güncellenir

## 🔍 Hata Ayıklama

Eğer hala sorun yaşıyorsanız:

```bash
# Yapılandırmayı kontrol edin
python check_config.py

# Logları kontrol edin
# Railway dashboard'da "Deployments" > "Logs" sekmesine bakın
```

## 📞 Destek

Sorun devam ederse:
1. Railway loglarını kontrol edin
2. Environment variable'ların doğru ayarlandığından emin olun
3. Uygulamayı yeniden deploy edin
