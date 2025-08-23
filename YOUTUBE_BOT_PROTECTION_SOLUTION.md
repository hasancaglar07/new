# YouTube Bot Koruması Sorunu ve Çözümleri

## Sorun
YouTube, otomatik istekleri bot olarak algılayıp "Sign in to confirm you're not a bot" hatası veriyor. Bu, Railway gibi cloud platformlarda sık karşılaşılan bir durum.

## Uygulanan Çözümler

### 1. Gelişmiş yt-dlp Konfigürasyonu
- **User-Agent**: Gerçek tarayıcı gibi görünmek için
- **HTTP Headers**: Tarayıcı davranışını taklit etmek için
- **Geo-bypass**: Türkiye lokasyonu kullanarak
- **Retry mekanizması**: 3 deneme ile exponential backoff
- **Cookie desteği**: Mevcut YouTube cookies kullanımı

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
yt-dlp başarısız olursa YouTube Data API v3 kullanarak metadata alma:
```python
def get_video_metadata_via_api(video_id: str) -> Optional[dict]:
    # YouTube Data API v3 ile metadata alma
```

### 4. Proxy Desteği
Environment variables ile proxy kullanımı:
```bash
HTTP_PROXY=http://proxy.example.com:8080
HTTPS_PROXY=http://proxy.example.com:8080
```

### 5. Rate Limiting
Her istek arasında akıllı bekleme süreleri:
```python
if attempt > 0:
    wait_time = min(2 ** attempt, 10)  # Max 10 saniye
    await asyncio.sleep(wait_time)
```

## Kurulum

### 1. YouTube API Key (Opsiyonel)
```bash
# .env dosyasına ekle
YOUTUBE_API_KEY=your_youtube_api_key_here
```

### 2. Proxy Ayarları (Opsiyonel)
```bash
# .env dosyasına ekle
HTTP_PROXY=http://proxy.example.com:8080
HTTPS_PROXY=http://proxy.example.com:8080
```

### 3. Cookie Dosyası
`data/youtube-cookies.txt` dosyası mevcut ve güncel olmalı.

## Test Etme

1. **Basit test**: Küçük bir YouTube video URL'si ile test edin
2. **Rate limit test**: Birden fazla video arka arkaya analiz edin
3. **Proxy test**: Proxy ayarları ile test edin

## Ek Öneriler

### 1. Rotating User Agents
```python
user_agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    # Daha fazla user agent...
]
```

### 2. IP Rotation
- Farklı proxy servisleri kullanın
- VPN servisleri ile IP değiştirin
- Cloudflare Workers ile proxy oluşturun

### 3. Session Management
```python
# Her istek için yeni session
session = requests.Session()
session.headers.update({'User-Agent': random.choice(user_agents)})
```

### 4. Captcha Solving
Gerekirse captcha solving servisleri entegre edin:
- 2captcha
- Anti-Captcha
- reCAPTCHA solver

## Monitoring

Logları takip edin:
```bash
# Bot koruması tespit edildiğinde
logger.warning("Bot koruması/rate limit tespit edildi")

# YouTube API fallback kullanıldığında
logger.info("YouTube API ile metadata alındı")
```

## Sonuç

Bu çözümler ile YouTube bot koruması büyük ölçüde aşılabilir. Yine de sorun yaşanırsa:

1. **Proxy değiştirin**
2. **Cookie dosyasını güncelleyin**
3. **Rate limiting sürelerini artırın**
4. **YouTube API key ekleyin**
5. **Farklı User-Agent'lar kullanın**

## Not
YouTube'un bot koruması sürekli gelişiyor. Bu çözümler güncel tutulmalı ve yeni yöntemler eklenmelidir.
