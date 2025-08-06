#!/bin/sh

# Gunicorn'u, Railway'in verdiği PORT değişkeni ile başlat
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT