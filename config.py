# config.py
# Uygulama yapılandırma dosyası

import os
from pathlib import Path

# Temel dizinler
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
PDF_DIR = DATA_DIR / "pdfler"
INDEX_DIR = DATA_DIR / "whoosh_index"

# Backblaze URL'leri - Environment variable'dan al veya varsayılan kullan
PDF_BASE_URL = os.getenv("PDF_BASE_URL", "https://cdn.mihmandar.org/file/yediulya-pdf-arsivi")
AUDIO_BASE_URL = os.getenv("AUDIO_BASE_URL", "https://cdn.mihmandar.org/file/yediulya-ses-arsivi")

# Backblaze B2 API anahtarları (PDF erişimi için)
B2_APPLICATION_KEY_ID = os.getenv("B2_APPLICATION_KEY_ID")
B2_APPLICATION_KEY = os.getenv("B2_APPLICATION_KEY")
B2_BUCKET_NAME = os.getenv("B2_BUCKET_NAME", "yediulya-pdf-arsivi")

# Turso veritabanı ayarları
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
    print("🔍 DEBUG - TURSO_ANALYSIS_URL:", TURSO_ANALYSIS_URL)
    print("🔍 DEBUG - TURSO_ANALYSIS_TOKEN:", "***" if TURSO_ANALYSIS_TOKEN else "None")
    print("🔍 DEBUG - DEEPGRAM_API_KEY:", "***" if DEEPGRAM_API_KEY else "None")
    print("🔍 DEBUG - DEEPSEEK_API_KEY:", "***" if DEEPSEEK_API_KEY else "None")
    print("🔍 DEBUG - YOUTUBE_API_KEYS:", len(YOUTUBE_API_KEYS), "keys available")
