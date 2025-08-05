# 1. Adım: Temel işletim sistemi olarak resmi Python imajını kullan
FROM python:3.11-slim

# 2. Adım: Çalışma dizinini ayarla
WORKDIR /app

# 3. Adım: Gerekli sistem paketlerini kur: git ve git-lfs
RUN apt-get update && apt-get install -y git git-lfs && rm -rf /var/lib/apt/lists/*

# 4. Adım: Repoyu doğrudan GitHub'dan klonla
# Bu, .git klasörünün de gelmesini sağlar, böylece LFS çalışır.
# Repo URL'sini kendi reponuzunkiyle değiştirebilirsiniz, ancak bu genel bir yaklaşımdır.
RUN git clone https://github.com/hasancaglar07/new.git .

# 5. Adım: LFS dosyalarını çek
RUN git lfs pull

# 6. Adım: Python bağımlılıklarını kur
RUN pip install --no-cache-dir -r requirements.txt

# 7. Adım: Arama indeksini oluştur
RUN python create_index.py

# 8. Adım: Sunucuyu başlatacak olan komut
# Render'ın portunu kullanmak için $PORT değişkenini kullanıyoruz
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "main:app", "--bind", "0.0.0.0:${PORT}"]