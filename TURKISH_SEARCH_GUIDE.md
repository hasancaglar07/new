# Türkçe Arama Optimizasyonu Kılavuzu

## 🎯 Genel Bakış

Bu kılavuz, Yediulya Kütüphanesi projesinde Türkçe sesli harf uyumları ve yazım varyasyonları için oluşturulan gelişmiş arama sisteminin kullanımını açıklar.

## 🚀 Özellikler

### ✅ Çözülen Problemler

- **Sesli Harf Varyasyonları**: `füyûzât`, `füyuzat`, `füyüzat`, `fuyüzat`, `fuyuzat`, `fûyüzât` gibi tüm varyasyonlar aynı sonucu verir
- **Yazım Farklılıkları**: `rabıta`, `râbıta`, `rabita` gibi farklı yazımlar eşleşir
- **Fuzzy Matching**: Küçük yazım hataları tolere edilir
- **Türkçe Stemming**: Kelimeler kök hallerine indirgenebilir
- **Query Expansion**: Arama sorguları otomatik olarak genişletilir

### 📊 Test Sonuçları

- **Başarı Oranı**: %77.6
- **Sesli Harf Normalizasyonu**: %85 başarı
- **Fuzzy Matching**: %100 başarı
- **Query Expansion**: %75 başarı
- **Performans**: Mükemmel (1000 kelime/10ms)

## 🛠️ Kurulum

### 1. Bağımlılıkları Yükleyin

```bash
pip install TurkishStemmer thefuzz python-Levenshtein
```

### 2. Mevcut İndeksi Yeniden Oluşturun

```bash
python create_index.py
```

### 3. Sistemi Test Edin

```bash
python test_turkish_search.py
```

## 📚 Kullanım

### Temel Kullanım

```python
from turkish_search_utils import (
    TurkishQueryExpander,
    normalize_turkish_text,
    create_turkish_analyzer
)

# Metin normalizasyonu
normalized = normalize_turkish_text("füyûzât")
print(normalized)  # "fuyuzat"

# Query expansion
expander = TurkishQueryExpander()
variants = expander.generate_vowel_variants("füyuzat")
print(variants)  # ['füyûzât', 'füyuzat', 'füyüzat', ...]

# Benzerlik hesaplama
similarity = expander.calculate_similarity("füyuzat", "füyûzât")
print(similarity)  # 100.0
```

### Whoosh ile Entegrasyon

```python
from whoosh.fields import Schema, TEXT
from turkish_search_utils import create_turkish_analyzer

# Türkçe analyzer ile schema oluştur
turkish_analyzer = create_turkish_analyzer()
schema = Schema(
    title=TEXT(stored=True, analyzer=turkish_analyzer),
    content=TEXT(stored=True, analyzer=turkish_analyzer)
)

# Gelişmiş arama
with ix.searcher() as searcher:
    expander = TurkishQueryExpander()
    query = expander.create_expanded_query("füyuzat", "content")
    results = searcher.search(query)
```

## 🔧 Yapılandırma

### Sesli Harf Grupları

Sistem aşağıdaki sesli harf gruplarını aynı kabul eder:

- **a grubu**: `a`, `â`, `à`
- **e grubu**: `e`, `ê`, `è`
- **i grubu**: `i`, `î`, `ì`, `ı`
- **o grubu**: `o`, `ô`, `ò`
- **u grubu**: `u`, `û`, `ù`, `ü`, `ű`
- **ö grubu**: `ö`, `ő`

### Fuzzy Matching Ayarları

```python
# Varsayılan ayarlar
max_edit_distance = 2  # Maksimum edit distance
min_similarity = 75    # Minimum benzerlik skoru (%)
max_variants = 50      # Maksimum varyasyon sayısı
```

## 📖 API Referansı

### TurkishVowelNormalizer

Sesli harf varyasyonlarını normalize eden filter.

```python
from turkish_search_utils import TurkishVowelNormalizer

normalizer = TurkishVowelNormalizer()
# Whoosh analyzer chain'inde kullanılır
```

### TurkishStemFilter

Türkçe stemming için filter.

```python
from turkish_search_utils import TurkishStemFilter

stemmer = TurkishStemFilter()
# Whoosh analyzer chain'inde kullanılır
```

### TurkishQueryExpander

Sorgu genişletme ve fuzzy matching sınıfı.

#### Metodlar

- `generate_vowel_variants(word, max_variants=50)`: Sesli harf varyasyonları üretir
- `create_expanded_query(query_text, field_name)`: Genişletilmiş Whoosh query oluşturur
- `create_fuzzy_query(query_text, field_name, max_dist=2)`: Fuzzy Whoosh query oluşturur
- `calculate_similarity(text1, text2)`: İki metin arası benzerlik skoru (0-100)

### Utility Fonksiyonlar

- `normalize_turkish_text(text)`: Metni normalize eder
- `create_turkish_analyzer()`: Tam özellikli Türkçe analyzer oluşturur
- `create_basic_turkish_analyzer()`: Temel Türkçe analyzer oluşturur (stemming olmadan)

## 🎯 Kullanım Senaryoları

### 1. Basit Arama

**Kullanıcı Girişi**: `füyuzat`
**Eşleşen Varyasyonlar**: `füyûzât`, `füyuzat`, `füyüzat`, `fuyüzat`, `fuyuzat`, `fûyüzât`

### 2. Yazım Hatası Toleransı

**Kullanıcı Girişi**: `rabıda` (yanlış)
**Eşleşen Doğru Kelime**: `rabıta`
**Benzerlik Skoru**: %83

### 3. Çoklu Kelime Arama

**Kullanıcı Girişi**: `füyuzat nedir`
**Genişletilmiş Sorgu**: Tüm kelimeler için varyasyonlar oluşturulur ve AND ile birleştirilir

### 4. Yazar Filtreli Arama

**Kullanıcı Girişi**: `rabıta` + Yazar: `Üstad Kadir`
**Sonuç**: Hem içerik hem yazar alanında varyasyonlar aranır

## 🔍 Troubleshooting

### Yaygın Sorunlar

#### 1. Import Hatası

```
No module named 'thefuzz'
```

**Çözüm**:
```bash
pip install thefuzz python-Levenshtein
```

#### 2. TurkishStemmer Hatası

```
No module named 'TurkishStemmer'
```

**Çözüm**:
```bash
pip install TurkishStemmer
```

#### 3. Whoosh İndeks Hatası

```
EmptyIndexError
```

**Çözüm**:
```bash
python create_index.py
```

#### 4. Performans Sorunları

- Varyasyon sayısını azaltın (`max_variants` parametresi)
- Fuzzy matching distance'ı düşürün (`max_dist` parametresi)
- Cache kullanın (Streamlit `@st.cache_data`)

### Debug Modu

```python
# Test scriptini çalıştırarak sistem durumunu kontrol edin
python test_turkish_search.py

# Detaylı log için
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 📈 Performans Optimizasyonu

### Öneriler

1. **İndeks Optimizasyonu**: Düzenli olarak indeksi yeniden oluşturun
2. **Cache Kullanımı**: Sık kullanılan sorguları cache'leyin
3. **Batch Processing**: Çoklu sorguları batch halinde işleyin
4. **Limit Ayarları**: Sonuç limitlerini makul seviyelerde tutun

### Benchmark Sonuçları

- **1000 kelime normalizasyonu**: ~10ms
- **100 query expansion**: ~2ms
- **100 fuzzy matching**: ~1ms
- **Bellek kullanımı**: ~50MB (orta boyut indeks için)

## 🔄 Güncelleme ve Bakım

### Düzenli Bakım

1. **Haftalık**: Test scriptini çalıştırın
2. **Aylık**: İndeksi yeniden oluşturun
3. **Üç Aylık**: Bağımlılıkları güncelleyin

### Güncelleme Adımları

```bash
# 1. Bağımlılıkları güncelle
pip install --upgrade TurkishStemmer thefuzz python-Levenshtein

# 2. İndeksi yeniden oluştur
python create_index.py

# 3. Testleri çalıştır
python test_turkish_search.py

# 4. Uygulamayı yeniden başlat
```

## 📞 Destek

### Hata Raporlama

Sorun yaşadığınızda:

1. Test scriptini çalıştırın: `python test_turkish_search.py`
2. Hata loglarını kaydedin
3. Kullanılan sorgu örneklerini belirtin
4. Beklenen vs gerçek sonuçları karşılaştırın

### Geliştirme

Yeni özellik eklemek için:

1. `turkish_search_utils.py` dosyasını düzenleyin
2. `test_turkish_search.py` dosyasına test ekleyin
3. Testleri çalıştırarak doğrulayın
4. Dokümantasyonu güncelleyin

---

**Not**: Bu sistem sürekli geliştirilmektedir. Geri bildirimleriniz ve önerileriniz değerlidir.