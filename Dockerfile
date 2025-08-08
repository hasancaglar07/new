# Dockerfile (Versiyon 2.3 - Bellek Optimizasyonu ile Nihai Sürüm)

FROM python:3.11-slim

# Gerekli tüm sistem kütüphaneleri
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

# --- ANA DEĞİŞİKLİK BURADA ---
# requirements.txt dosyasındaki her kütüphaneyi tek tek kuruyoruz.
# Bu, bellek (RAM) kullanımını azaltır ve build hatalarını önler.
RUN apt-get update && \
    for requirement in $(cat requirements.txt | grep -v '^--'); do \
        echo ">>> Installing $requirement"; \
        pip install --no-cache-dir "$requirement"; \
    done && \
    # PyTorch gibi özel index gerektirenleri ayrı kur
    pip install --no-cache-dir -r requirements.txt

# --------------------------------

RUN chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]