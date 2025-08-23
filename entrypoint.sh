#!/bin/sh

# Railway için hızlı başlatma - veritabanı indirme işlemlerini arka plana al
echo "Starting server immediately for Railway health checks..."

# Arka planda veritabanı ve indeks indirme
(
    echo "Background: Downloading databases..."
    python download_databases.py
    echo "Background: Database download finished."
    
    echo "Background: Downloading pre-built index from Backblaze..."
    python download_index_from_backblaze.py
    echo "Background: Index download finished."
    
    # Eğer indeks indirilemezse, yeni indeks oluştur
    if [ ! -f "data/whoosh_index/_MAIN_1.toc" ]; then
        echo "Background: Pre-built index not found, creating new index..."
        python create_index.py
        echo "Background: New index creation finished."
    else
        echo "Background: Using pre-built index from Backblaze."
    fi
    
    # Vector DB'yi kontrol et ve gerekirse populate et
    if [ -f "data/vector_db/vector_metadata.db" ] && [ -f "data/vector_db/faiss.index" ]; then
        echo "Background: Vector database already exists, skipping populate."
    else
        echo "Background: Vector database not found, populating..."
        python populate_vector_db.py
        echo "Background: Vector database population finished."
    fi
) &

# Sunucuyu hemen başlat
echo "Starting Gunicorn server..."
gunicorn main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 300 --preload