# Dockerfile (Versiyon 2.2 - Torch ve FAISS için tam çözüm)

FROM python:3.11-slim

# Gerekli tüm sistem kütüphaneleri (cmake eklendi)
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    git-lfs \
    ffmpeg \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN git clone https://github.com/hasancaglar07/new.git . && git lfs pull

# Python bağımlılıklarını kur (Artık doğru torch versiyonunu bulacak)
RUN pip install --no-cache-dir -r requirements.txt

RUN chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]