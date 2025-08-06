FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y git git-lfs && rm -rf /var/lib/apt/lists/*
RUN git clone https://github.com/hasancaglar07/new.git .
RUN git lfs pull
RUN pip install --no-cache-dir -r requirements.txt

# BU SATIR SİLİNDİ: # RUN python create_index.py

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]