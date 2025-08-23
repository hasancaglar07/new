#!/bin/sh

# Adım 1: Database dosyalarını indir (eğer yoksa)
echo "Downloading databases..."
python download_databases.py
echo "Database download finished."

# Adım 2: Hazır indeksi Backblaze'den indir (eğer yoksa)
echo "Downloading pre-built index from Backblaze..."
python download_index_from_backblaze.py
echo "Index download finished."

# Adım 3: Eğer indeks indirilemezse, yeni indeks oluştur
if [ ! -f "data/whoosh_index/_MAIN_1.toc" ]; then
    echo "Pre-built index not found, creating new index..."
    python create_index.py
    echo "New index creation finished."
else
    echo "Using pre-built index from Backblaze."
fi

# Adım 2: Gunicorn sunucusunu başlat.
echo "Starting Gunicorn server..."
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 300