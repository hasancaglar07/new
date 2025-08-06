# Adım 1: Temel Python imajı
FROM python:3.11-slim

# Adım 2: Gerekli sistem paketlerini kur (git-lfs hala gerekli olabilir)
RUN apt-get update && apt-get install -y git git-lfs && rm -rf /var/lib/apt/lists/*

# Adım 3: Çalışma dizini
WORKDIR /app

# Adım 4: Önce sadece bağımlılık dosyalarını kopyala ve kur
# Bu, kod değişmediği sürece bağımlılıkların tekrar kurulmasını engeller (cache'leme için).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Adım 5: Projenin GERİ KALAN TÜM dosyalarını kopyala
# Bu, /data klasöründeki indirilmiş PDF'leri de kopyalayacaktır.
COPY . .

# Adım 6: Başlatma script'ini çalıştırılabilir yap
RUN chmod +x /app/entrypoint.sh

# Adım 7: Uygulamayı başlatmak için script'i çalıştır
CMD ["/app/entrypoint.sh"]