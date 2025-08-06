#!/bin/sh

# Adım 1: Arama indeksini oluştur.
# Bu komut, uygulamanın her başladığında çalışarak indeksin var olmasını garantiler.
echo "Starting index creation..."
python create_index.py
echo "Index creation finished."

# Adım 2: Gunicorn sunucusunu başlat.
echo "Starting Gunicorn server..."
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8080 --timeout 300