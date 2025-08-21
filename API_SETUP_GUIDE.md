# 🔑 API Kurulum Rehberi

## 📋 Gerekli API Key'ler

AI Sohbet özelliklerinin tam olarak çalışması için aşağıdaki API key'leri yapılandırmanız gerekiyor:

### 1. 🎤 Deepgram (Ses-Metin Dönüşümü)
**Neden Gerekli**: Kullanıcıların sesli mesaj göndermesi için

**Nasıl Alınır**:
1. [Deepgram Console](https://console.deepgram.com/) adresine gidin
2. Hesap oluşturun (ücretsiz kredi verilir)
3. "API Keys" bölümünden yeni key oluşturun
4. Project ID'yi de not edin

**Yapılandırma**:
```env
DEEPGRAM_API_KEY=your_actual_deepgram_api_key
NEXT_PUBLIC_DEEPGRAM_API_KEY=your_actual_deepgram_api_key
DEEPGRAM_PROJECT_ID=your_project_id
```

### 2. 🔊 ElevenLabs (Metin-Ses Dönüşümü)
**Neden Gerekli**: AI'ın sesli cevap vermesi için

**Nasıl Alınır**:
1. [ElevenLabs](https://elevenlabs.io/) adresine gidin
2. Hesap oluşturun (aylık ücretsiz karakter limiti var)
3. Profile > API Keys bölümünden key alın

**Yapılandırma**:
```env
ELEVENLABS_API_KEY=your_actual_elevenlabs_api_key
```

### 3. 🧠 DeepSeek (AI Cevapları)
**Neden Gerekli**: Akıllı AI cevapları için (şu anda mock response kullanılıyor)

**Nasıl Alınır**:
1. [DeepSeek](https://platform.deepseek.com/) adresine gidin
2. Hesap oluşturun
3. API key oluşturun

**Yapılandırma**:
```env
DEEPSEEK_API_KEY=your_actual_deepseek_api_key
```

## 🛠️ Kurulum Adımları

### 1. Environment Dosyasını Düzenleyin
`frontend/.env.local` dosyasını açın ve gerçek API key'leri girin:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000

# Deepgram API Configuration
DEEPGRAM_API_KEY=sk-deepgram-your-actual-key-here
NEXT_PUBLIC_DEEPGRAM_API_KEY=sk-deepgram-your-actual-key-here
DEEPGRAM_PROJECT_ID=your-project-id-here

# ElevenLabs API Configuration
ELEVENLABS_API_KEY=sk-elevenlabs-your-actual-key-here

# DeepSeek API Configuration
DEEPSEEK_API_KEY=sk-deepseek-your-actual-key-here
```

### 2. Frontend'i Yeniden Başlatın
```bash
cd frontend
npm run dev
```

### 3. Test Edin
1. `/sohbet` sayfasına gidin
2. Mikrofon butonuna tıklayın (ses izni verin)
3. Konuşun ve metin dönüşümünü test edin
4. AI cevabında ses butonuna tıklayın

## 🔧 Sorun Giderme

### Ses Kaydı Çalışmıyor
- ✅ Tarayıcı mikrofon izni verildi mi?
- ✅ Deepgram API key doğru mu?
- ✅ `.env.local` dosyası `frontend` klasöründe mi?

### AI Sesli Konuşmuyor
- ✅ ElevenLabs API key doğru mu?
- ✅ ElevenLabs hesabında kredi var mı?
- ✅ Tarayıcı ses izni verildi mi?

### Fallback Özellikler
**Deepgram Yoksa**: Manuel metin girişi
**ElevenLabs Yoksa**: Tarayıcı TTS (daha basit ses)

## 💰 Maliyet Bilgileri

### Deepgram
- **Ücretsiz**: Aylık 200 dakika
- **Ücretli**: $0.0059/dakika

### ElevenLabs
- **Ücretsiz**: Aylık 10,000 karakter
- **Ücretli**: $5/ay (30,000 karakter)

### DeepSeek
- **Ücretsiz**: Günlük limit var
- **Ücretli**: Token bazlı fiyatlandırma

## 🚀 Hızlı Başlangıç (Test İçin)

Eğer hemen test etmek istiyorsanız:

1. **Sadece Deepgram** ekleyin (ses girişi için)
2. **ElevenLabs olmadan** tarayıcı TTS kullanılır
3. **DeepSeek olmadan** mock responses çalışır

## 📞 Destek

API kurulumunda sorun yaşarsanız:
1. Console'da hata mesajlarını kontrol edin
2. Network tab'ında API çağrılarını inceleyin
3. `.env.local` dosyasının doğru konumda olduğundan emin olun

**Not**: API key'leri asla git'e commit etmeyin! `.env.local` dosyası `.gitignore`'da olmalı.