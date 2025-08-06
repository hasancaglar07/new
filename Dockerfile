# NIHAI VE GÜVENİLİR DOCKERFILE

# Adım 1: Temel Python imajı
FROM python:3.11-slim

# Adım 2: Gerekli sistem paketlerini kur (ffmpeg eklendi)
RUN apt-get update && apt-get install -y git git-lfs ffmpeg && rm -rf /var/lib/apt/lists/*

# Adım 3: Çalışma dizini
WORKDIR /app

# Adım 4: YENİ YÖNTEM - Repoyu klonla VE LFS dosyalarını çek
# Railway, bu komutu çalıştırdığında GitHub'a erişim izni zaten vardır.
# Bu, kimlik doğrulama sorununu tamamen çözer.
RUN git clone https://github.com/hasancaglar07/new.git . && git lfs pull

# Adım 5: Python bağımlılıklarını kur
RUN pip install --no-cache-dir -r requirements.txt

# Adım 6: Başlatma script'ini çalıştırılabilir yap
# Bu komut artık .gitattributes dosyasını da göreceği için çalışacaktır.
RUN chmod +x /app/entrypoint.sh

# Adım 7: Uygulamayı başlatmak için script'i çalıştır
# entrypoint.sh içinde create_index.py ve gunicorn komutları var.
CMD ["/app/entrypoint.sh"]