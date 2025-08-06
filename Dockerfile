# 1. Adım: Temel işletim sistemi
FROM python:3.11-slim

# 2. Adım: Çalışma dizini
WORKDIR /app

# 3. Adım: Sistem paketleri
RUN apt-get update && apt-get install -y git git-lfs && rm -rf /var/lib/apt/lists/*

# 4. Adım: Repoyu klonla
RUN git clone https://github.com/hasancaglar07/new.git .

# 5. Adım: LFS dosyalarını çek
RUN git lfs pull

# 6. Adım: Python bağımlılıklarını kur
RUN pip install --no-cache-dir -r requirements.txt

# 7. Adım: Arama indeksini oluştur
RUN python create_index.py

# --- YENİ ADIMLAR ---
# 8. Adım: Başlatma script'ini kopyala ve çalıştırılabilir yap
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# 9. Adım: Sunucuyu başlatmak için script'i çalıştır
CMD ["/app/entrypoint.sh"]