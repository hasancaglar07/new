# Files overview

Backend (Python):
- main.py: FastAPI app. Video analizi (yt-dlp + Deepgram + YouTube transcript), arama, PDF erişimi, audio stream, analiz geçmişi API'leri.
- config.py: Ortam değişkenleri ve yollar. SUPABASE_URL/SECRET_KEY, Backblaze, YouTube API ayarları.
- data/db.py: Kalıcı veri katmanı. Supabase REST (httpx) ile `video_analysis_tasks` upsert/select; yoksa SQLite fallback.
- data/articles_db.py: Makale veritabanı CRUD.
- data/audio_db.py: Yerel ses kayıtları meta erişimi ve arama.
- download_databases.py / upload_databases_to_backblaze.py / upload_index_to_backblaze.py: Yardımcı veri indirme/yükleme scriptleri.
- create_index.py / format_articles.py / scrape_articles.py: Whoosh indeks ve içerik hazırlık scriptleri.
- utils/b2_client.py: Backblaze B2 istemcisi.
- entrypoint.sh, Dockerfile, railway.json: Deploy çalıştırma ve Railway yapılandırması.
- requirements*.txt: Bağımlılık listeleri.

Data klasörü:
- data/qa_database.db, data/video_analyses.db, data/articles_database.db, data/audio_database.db: SQLite dosyaları.
- data/youtube-cookies.txt: yt-dlp için cookie dosyası.
- data/whoosh_index/*: Arama indeksi.

Frontend (Next.js):
- frontend/src/app/*: Pages ve layout.
- frontend/src/components/*: UI bileşenleri.
- frontend/public/*: Statik varlıklar.

Docs:
- CLEANUP_PLAN.md: Temizlik adımları özeti.
- RAILWAY_DEPLOYMENT_YOUTUBE_FIXES.md, YOUTUBE_BOT_PROTECTION_SOLUTION.md: Teknik notlar.


