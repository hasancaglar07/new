#!/usr/bin/env python3
"""
Lokal data/*.db dosyalarını Backblaze 'yediulya-databases' bucket'ına yükler.
Gerekli env:
  B2_APPLICATION_KEY_ID
  B2_APPLICATION_KEY
  B2_JSON_BUCKET_NAME (opsiyonel, default B2_BUCKET_NAME)
  B2_BUCKET_NAME=yediulya-databases
"""
import os
from pathlib import Path
import mimetypes
from typing import Iterable

from utils.b2_client import B2Client

# Dotenv yükle (proje kökü)
try:
    from dotenv import load_dotenv
    ROOT = Path(__file__).resolve().parents[1]
    load_dotenv(ROOT / ".env", override=False)
    load_dotenv(ROOT / "env.backend", override=False)
except Exception:
    pass


def iter_files() -> Iterable[Path]:
    base = Path(__file__).resolve().parents[1] / "data"
    names = [
        "articles_database.db",
        "audio_database.db",
        "qa_database.db",
        "video_analyses.db",
        "book_metadata.json",
        "authors.json",
    ]
    for n in names:
        p = base / n
        if p.exists():
            yield p


def upload_file(b2: B2Client, bucket_name: str, file_path: Path) -> str:
    # Basit upload için B2Client'ta küçük bir yardımcı
    b2.authorize()
    bucket_id = b2.get_bucket_id(bucket_name)
    up = b2.get_upload_url(bucket_id)
    content = file_path.read_bytes()
    import hashlib
    sha1 = hashlib.sha1(content).hexdigest()
    import requests
    headers = {
        "Authorization": up["authorizationToken"],
        "X-Bz-File-Name": file_path.name,
        "Content-Type": mimetypes.guess_type(file_path.name)[0] or "application/octet-stream",
        "X-Bz-Content-Sha1": sha1,
    }
    resp = requests.post(up["uploadUrl"], headers=headers, data=content, timeout=120)
    resp.raise_for_status()
    return file_path.name


def main() -> int:
    key_id = os.getenv("B2_APPLICATION_KEY_ID")
    key = os.getenv("B2_APPLICATION_KEY")
    bucket = os.getenv("B2_BUCKET_NAME", "yediulya-databases")
    if not key_id or not key:
        print("❌ B2 kimlik bilgileri eksik")
        return 1
    b2 = B2Client(key_id, key)
    uploaded = []
    for p in iter_files():
        try:
            name = upload_file(b2, bucket, p)
            print(f"✅ Yüklendi: {name}")
            uploaded.append(name)
        except Exception as e:
            print(f"❌ Yüklenemedi: {p.name} -> {e}")
    print("\n📋 Tamamlananlar:")
    for n in uploaded:
        print(f" - https://cdn.mihmandar.org/file/{bucket}/{n}")
    print("\n➡️  Railway download ayarı için .env'e şu satırı ekleyin:")
    print(f"DATABASES_BASE_URL=https://cdn.mihmandar.org/file/{bucket}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


