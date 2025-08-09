# Dockerfile (Versiyon 3.0 - Basitleştirilmiş ve Güvenilir)

FROM python:3.11-slim

# Önce sistem bağımlılıklarını ayrı bir katmanda kuralım
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

# Önce minimal requirements dosyasını kopyalayarak Docker katman önbelleğinden faydalanalım
COPY requirements-minimal.txt ./requirements.txt

# LFS sorunu çözüldüğü için artık klonlamaya gerek yok, dosyaları doğrudan kopyalayabiliriz
# Bu, build sürecini hızlandırır.
# NOT: Bu yöntemin çalışması için reponuzda .dockerignore dosyası olmamalıdır.
COPY . .

# LFS dosyaları Railway'de otomatik olarak çekilir, manuel pull'a gerek yok
# RUN git lfs pull

# --- ANA DEĞİŞİKLİK ---
# Bellek sorunlarını aşmak için minimal paket listesi kullanıyoruz
RUN pip install --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt

# --------------------

RUN chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]