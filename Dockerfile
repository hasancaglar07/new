# NIHAI DOCKERFILE

# Adım 1: Temel Python imajı
FROM python:3.11-slim

# Adım 2: Gerekli sistem paketlerini kur (git, git-lfs)
RUN apt-get update && apt-get install -y git git-lfs && rm -rf /var/lib/apt/lists/*

# Adım 3: Çalışma dizini
WORKDIR /app

# Adım 4: Önce sadece bağımlılık dosyalarını kopyala ve kur
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Adım 5: Projenin GERİ KALAN TÜM dosyalarını kopyala
# Bu, LFS işaretçi dosyalarını ve .gitattributes'ı da kopyalayacak.
COPY . .

# Adım 6: YENİ VE EN ÖNEMLİ KISIM - Git LFS dosyalarını indirmeye zorla
# Kopyalanan dosyaların bir Git reposu olduğunu sisteme tanıtıp LFS pull yapıyoruz.
RUN git init && \
    git config --global user.email "ci@railway.app" && \
    git config --global user.name "Railway CI" && \
    git remote add origin https://github.com/hasancaglar07/new.git && \
    git lfs install && \
    git lfs pull

# Adım 7: Başlatma script'ini çalıştırılabilir yap
RUN chmod +x /app/entrypoint.sh

# Adım 8: Uygulamayı başlatmak için script'i çalıştır
CMD ["/app/entrypoint.sh"]