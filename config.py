# config.py
# Uygulama yapılandırma dosyası

import os
from pathlib import Path
from dotenv import load_dotenv

# .env dosyasını proje kökünden yükle (prod ortam değişkenlerini ezmeden)
load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=False)
# Alternatif: dotfiles engelli ortamlarda 'env.backend' dosyasını da dene
try:
    load_dotenv(dotenv_path=Path(__file__).parent / "env.backend", override=False)
except Exception:
    pass

# Temel dizinler
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
PDF_DIR = DATA_DIR / "pdfler"
INDEX_DIR = DATA_DIR / "whoosh_index"

# Backblaze URL'leri - Environment variable'dan al veya varsayılan kullan
# Trailing slash'leri kaldır (çift slash sorununu önlemek için)
PDF_BASE_URL = os.getenv("PDF_BASE_URL", "https://cdn.mihmandar.org/file/yediulya-pdf-arsivi").rstrip('/')
AUDIO_BASE_URL = os.getenv("AUDIO_BASE_URL", "https://cdn.mihmandar.org/file/yediulya-ses-arsivi").rstrip('/')

# Backblaze B2 API anahtarları (PDF erişimi için)
B2_APPLICATION_KEY_ID = os.getenv("B2_APPLICATION_KEY_ID")
B2_APPLICATION_KEY = os.getenv("B2_APPLICATION_KEY")
B2_BUCKET_NAME = os.getenv("B2_BUCKET_NAME", "yediulya-pdf-arsivi")

# B2 JSON arşivi için ek ayarlar (analiz sonuçları)
B2_JSON_BUCKET_NAME = os.getenv("B2_JSON_BUCKET_NAME", B2_BUCKET_NAME)
B2_JSON_PREFIX = os.getenv("B2_JSON_PREFIX", "video-analyses/")

# Supabase bağlantı ayarları (REST client)
# Not: Artık Postgres DSN yerine Supabase URL + Secret Key kullanıyoruz
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY")

# Eski Postgres parçaları geriye dönük uyumluluk için bırakıldı (kullanılmıyor)
SUPABASE_DB_URL = None
SUPABASE_HOST = os.getenv("SUPABASE_HOST")
SUPABASE_PORT = os.getenv("SUPABASE_PORT", "5432")
SUPABASE_DBNAME = os.getenv("SUPABASE_DBNAME") or os.getenv("SUPABASE_DATABASE")
SUPABASE_USER = os.getenv("SUPABASE_USER")
SUPABASE_PASSWORD = os.getenv("SUPABASE_PASSWORD")

# Turso kaldırıldı – yine de referanslar için güvenli default ekleyelim
TURSO_ANALYSIS_URL = os.getenv("TURSO_ANALYSIS_URL")
TURSO_ANALYSIS_TOKEN = os.getenv("TURSO_ANALYSIS_TOKEN")

# API anahtarları
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
YOUTUBE_API_KEYS = [os.getenv(f"YOUTUBE_API_KEY{i}") for i in range(1, 7) if os.getenv(f"YOUTUBE_API_KEY{i}")]

# Cache ayarları
CACHE_TTL = 3600  # 1 saat

# Debug bilgileri
def print_config():
    """Yapılandırma bilgilerini yazdırır"""
    print("🔍 DEBUG - PDF_BASE_URL:", PDF_BASE_URL)
    print("🔍 DEBUG - AUDIO_BASE_URL:", AUDIO_BASE_URL)
    print("🔍 DEBUG - B2_APPLICATION_KEY_ID:", "***" if B2_APPLICATION_KEY_ID else "None")
    print("🔍 DEBUG - B2_APPLICATION_KEY:", "***" if B2_APPLICATION_KEY else "None")
    print("🔍 DEBUG - B2_BUCKET_NAME:", B2_BUCKET_NAME)
    print("🔍 DEBUG - B2_JSON_BUCKET_NAME:", B2_JSON_BUCKET_NAME)
    print("🔍 DEBUG - B2_JSON_PREFIX:", B2_JSON_PREFIX)
    print("🔍 DEBUG - SUPABASE_URL:", SUPABASE_URL or "None")
    print("🔍 DEBUG - SUPABASE_SECRET_KEY:", "***" if SUPABASE_SECRET_KEY else "None")
    print("🔍 DEBUG - TURSO_ANALYSIS_URL:", TURSO_ANALYSIS_URL)
    print("🔍 DEBUG - TURSO_ANALYSIS_TOKEN:", "***" if TURSO_ANALYSIS_TOKEN else "None")
    print("🔍 DEBUG - DEEPGRAM_API_KEY:", "***" if DEEPGRAM_API_KEY else "None")
    print("🔍 DEBUG - DEEPSEEK_API_KEY:", "***" if DEEPSEEK_API_KEY else "None")
    print("🔍 DEBUG - YOUTUBE_API_KEYS:", len(YOUTUBE_API_KEYS), "keys available")
