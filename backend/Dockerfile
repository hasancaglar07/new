# 1. Adım: Temel işletim sistemi olarak resmi Python imajını kullan
# Bu imajın içinde Python ve pip kurulu olarak gelir ve Debian tabanlıdır (apt-get çalışır)
FROM python:3.11-slim

# 2. Adım: Çalışma dizinini ayarla
WORKDIR /app

# 3. Adım: Gerekli sistem paketlerini kur: git ve git-lfs
RUN apt-get update && \
    apt-get install -y git git-lfs && \
    rm -rf /var/lib/apt/lists/*

# 4. Adım: requirements.txt dosyasını kopyala ve bağımlılıkları kur
# Bu adımı erken yaparak Docker'ın katman önbelleğinden faydalanırız
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Adım: Projenin geri kalanını kopyala
COPY . .

# 6. Adım: Her deployda çalışacak olan build script'ini oluştur ve çalıştır
# Bu script, LFS dosyalarını çeker ve arama indeksini oluşturur
RUN echo '#!/bin/bash' > build.sh && \
    echo 'set -e' >> build.sh && \
    echo 'git lfs pull' >> build.sh && \
    echo 'python create_index.py' >> build.sh && \
    chmod +x build.sh

# 7. Adım: Sunucuyu başlatacak olan komut
# Gunicorn'u doğrudan çalıştırıyoruz
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "main:app"]