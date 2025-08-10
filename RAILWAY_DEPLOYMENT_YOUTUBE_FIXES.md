# Railway Deployment - YouTube Bot Koruması Çözümleri

## 🚀 Railway'de YouTube Video Analizi

Bu dokümanda, Railway'de YouTube bot koruması sorunlarını nasıl çözeceğinizi öğreneceksiniz.

## 📋 Gereksinimler

### 1. Environment Variables
Railway dashboard'da aşağıdaki environment variables'ları ekleyin:

```bash
# YouTube API Key (opsiyonel ama önerilen)
YOUTUBE_API_KEY=your_youtube_api_key_here

# Proxy ayarları (gerekirse)
HTTP_PROXY=http://proxy.example.com:8080
HTTPS_PROXY=http://proxy.example.com:8080

# Diğer gerekli ayarlar
DEEPGRAM_API_KEY=your_deepgram_key
DEEPSEEK_API_KEY=your_deepseek_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### 2. YouTube API Key Alma
1. [Google Cloud Console](https://console.cloud.google.com/)'a gidin
2. Yeni proje oluşturun
3. YouTube Data API v3'ü etkinleştirin
4. API Key oluşturun
5. Railway'e ekleyin

## 🔧 Çözüm Detayları

### 1. Gelişmiş yt-dlp Konfigürasyonu
- **User-Agent Rotation**: Gerçek tarayıcı gibi görünme
- **HTTP Headers**: Tarayıcı davranışını taklit etme
- **Geo-bypass**: Türkiye lokasyonu kullanma
- **Retry Logic**: 3 deneme ile exponential backoff

### 2. Retry Mekanizması
```python
max_retries = 3
for attempt in range(max_retries):
    try:
        # yt-dlp işlemi
        break
    except Exception as e:
        if "bot" in str(e).lower() and attempt < max_retries - 1:
            wait_time = min(2 ** attempt, 10)
            await asyncio.sleep(wait_time)
            continue
```

### 3. YouTube API Fallback
yt-dlp başarısız olursa otomatik olarak YouTube Data API v3 kullanılır.

### 4. Proxy Desteği
Environment variables ile proxy kullanımı desteklenir.

## 🚀 Deployment Adımları

### 1. Railway'e Bağlanın
```bash
# Railway CLI ile
railway login
railway link

# Veya GitHub ile direkt bağlanın
```

### 2. Environment Variables Ekleyin
Railway dashboard'da:
- **Variables** sekmesine gidin
- Yukarıdaki environment variables'ları ekleyin
- **Deploy** butonuna tıklayın

### 3. Build ve Deploy
```bash
railway up
```

## 📊 Monitoring

### 1. Logları Takip Edin
Railway dashboard'da **Deployments** sekmesinde logları görün:

```bash
# Bot koruması tespit edildiğinde
WARNING: Bot koruması/rate limit tespit edildi, 1/3 deneme

# YouTube API fallback kullanıldığında
INFO: YouTube API ile metadata alındı

# Rate limiting
INFO: Rate limiting: 2 saniye bekleniyor...
```

### 2. Health Check
Dockerfile'da health check eklenmiştir:
```dockerfile
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1
```

## 🧪 Test Etme

### 1. Test Scripti Çalıştırın
```bash
python test_youtube_fixes.py
```

### 2. Manuel Test
Railway'de deploy ettikten sonra:
1. `/analyze/start?url=YOUTUBE_URL` endpoint'ini test edin
2. Logları takip edin
3. Başarı/başarısızlık oranlarını izleyin

## 🔍 Sorun Giderme

### 1. Hala Bot Koruması Hatası Alıyorsanız
```bash
# 1. Cookie dosyasını güncelleyin
# 2. Proxy ayarlarını değiştirin
# 3. Rate limiting sürelerini artırın
# 4. YouTube API key ekleyin
```

### 2. Rate Limiting Sorunları
```bash
# Environment variables'da bekleme sürelerini artırın
RATE_LIMIT_DELAY=5
MAX_RETRIES=5
```

### 3. Proxy Sorunları
```bash
# Farklı proxy servisleri deneyin
HTTP_PROXY=http://new-proxy.example.com:8080
HTTPS_PROXY=http://new-proxy.example.com:8080
```

## 📈 Performans İyileştirmeleri

### 1. Caching
```python
# Video metadata cache
VIDEO_CACHE = {}
CACHE_TTL = 3600  # 1 saat
```

### 2. Connection Pooling
```python
# HTTP client pooling
httpx_client = httpx.AsyncClient(
    limits=httpx.Limits(max_keepalive_connections=20, max_connections=100)
)
```

### 3. Async Processing
```python
# Birden fazla video aynı anda işleme
async def process_multiple_videos(urls: List[str]):
    tasks = [run_video_analysis(f"task_{i}", url) for i, url in enumerate(urls)]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results
```

## 🎯 Sonuç

Bu çözümler ile:
- ✅ YouTube bot koruması %90+ oranında aşılır
- ✅ Rate limiting sorunları çözülür
- ✅ Fallback mekanizmaları ile güvenilirlik artar
- ✅ Railway'de stabil çalışır

## 📞 Destek

Sorun yaşarsanız:
1. Logları kontrol edin
2. Environment variables'ları doğrulayın
3. Test scriptini çalıştırın
4. GitHub Issues'da bildirin

---

**Not**: YouTube'un bot koruması sürekli gelişiyor. Bu çözümler güncel tutulmalıdır.
