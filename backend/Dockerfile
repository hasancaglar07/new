# 1. Adım: Temel işletim sistemi olarak resmi Python imajını kullan
FROM python:3.11-slim

# 2. Adım: Çalışma dizinini ayarla
WORKDIR /app

# 3. Adım: Gerekli sistem paketlerini kur: git ve git-lfs
# Bu katmanı ayrı tutarak önbelleğe alınmasını sağlıyoruz
RUN apt-get update && \
    apt-get install -y git git-lfs && \
    rm -rf /var/lib/apt/lists/*

# 4. Adım: ÖNCE SADECE requirements.txt'yi kopyala
COPY requirements.txt .

# 5. Adım: ŞİMDİ bağımlılıkları kur. Bu katman, requirements.txt değişmediği sürece
# önbellekten kullanılacak ve deploy'u hızlandıracaktır.
RUN pip install --no-cache-dir -r requirements.txt

# 6. Adım: Projenin geri kalan tüm kodlarını kopyala
COPY . .

# 7. Adım: Her deployda çalışacak olan build script'ini oluştur ve çalıştır
# Bu, kod her değiştiğinde yeniden çalışır
RUN echo '#!/bin/bash' > build.sh && \
    echo 'set -e' >> build.sh && \
    echo 'git lfs pull' >> build.sh && \
    echo 'python create_index.py' >> build.sh && \
    chmod +x build.sh

# 8. Adım: Build script'ini çalıştır
RUN ./build.sh

# 9. Adım: Sunucuyu başlatacak olan komut
# Gunicorn'u doğrudan çalıştırıyoruz
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "main:app", "--bind", "0.0.0.0:10000"]