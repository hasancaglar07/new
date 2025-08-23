# Dockerfile (Versiyon 3.1 - YouTube Bot Koruması Çözümleri ile)

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
    libffi-dev \
    pkg-config \
    libssl-dev \
    rustc \
    cargo \
    ca-certificates \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# YouTube bot koruması için ek yapılandırmalar
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# YouTube için gerekli environment variables
ENV YOUTUBE_API_KEY=""
ENV HTTP_PROXY=""
ENV HTTPS_PROXY=""

WORKDIR /app

# Önce micro requirements dosyasını kopyalayarak Docker katman önbelleğinden faydalanalım
COPY requirements-micro.txt ./requirements.txt

# LFS sorunu çözüldüğü için artık klonlamaya gerek yok, dosyaları doğrudan kopyalayabiliriz
# Bu, build sürecini hızlandırır.
# NOT: Bu yöntemin çalışması için reponuzda .dockerignore dosyası olmamalıdır.
COPY . .

# LFS dosyaları Railway'de otomatik olarak çekilir, manuel pull'a gerek yok
# RUN git lfs pull

# --- ANA DEĞİŞİKLİK ---
# Bellek sorunlarını aşmak için minimal paket listesi kullanıyoruz
RUN pip install --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt -v

# YouTube bot koruması için ek paketler
RUN pip install --no-cache-dir \
    fake-useragent \
    requests[socks] \
    urllib3

# --------------------

# YouTube cookies dosyası için gerekli izinler
RUN chmod 644 /app/data/youtube-cookies.txt || true

RUN chmod +x /app/entrypoint.sh

# Health check ekle
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

CMD ["/app/entrypoint.sh"]