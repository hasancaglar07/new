# Dockerfile (Versiyon 2.1 - Detaylı Loglama ile)

FROM python:3.11-slim

# ... (önceki apt-get komutları aynı kalabilir) ...
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    git-lfs \
    ffmpeg \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN git clone https://github.com/hasancaglar07/new.git . && git lfs pull

# --- DEĞİŞİKLİK BURADA ---
# pip install komutuna '--verbose' bayrağını ekleyerek daha detaylı çıktı alıyoruz.
RUN pip install --no-cache-dir --verbose -r requirements.txt
# -------------------------

RUN chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]