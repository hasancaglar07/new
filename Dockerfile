# NIHAI VE GÜVENİLİR DOCKERFILE (Versiyon 2.0 - Kurulum Hataları Düzeltilmiş)

# Adım 1: Temel Python imajı
FROM python:3.11-slim

# Adım 2: Gerekli sistem paketlerini kur
# build-essential: Python kütüphanelerini derlemek için gerekli (faiss-cpu, cryptography vb. için kritik)
# git git-lfs ffmpeg: Projenizin zaten ihtiyaç duyduğu araçlar
# libjpeg-dev zlib1g-dev: Pillow gibi resim işleme kütüphaneleri için
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    git-lfs \
    ffmpeg \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Adım 3: Çalışma dizini
WORKDIR /app

# Adım 4: YENİ YÖNTEM - Repoyu klonla VE LFS dosyalarını çek
# Bu yöntem, LFS dosyalarınızın doğru şekilde gelmesini garantiler.
RUN git clone https://github.com/hasancaglar07/new.git . && git lfs pull

# Adım 5: Python bağımlılıklarını kur
# Artık gerekli sistem araçları kurulu olduğu için bu adım başarılı olacaktır.
RUN pip install --no-cache-dir -r requirements.txt

# Adım 6: Başlatma script'ini çalıştırılabilir yap
RUN chmod +x /app/entrypoint.sh

# Adım 7: Uygulamayı başlatmak için script'i çalıştır
CMD ["/app/entrypoint.sh"]