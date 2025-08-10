import sqlite3
from pathlib import Path
import time
import shutil
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"


def integrity_ok(db_path: Path) -> bool:
    try:
        with sqlite3.connect(str(db_path)) as conn:
            cur = conn.cursor()
            cur.execute("PRAGMA integrity_check;")
            rows = cur.fetchall()
            return len(rows) == 1 and rows[0][0].lower() == "ok"
    except Exception as e:
        logging.warning(f"Integrity check failed for {db_path.name}: {e}")
        return False


def backup_corrupted(db_path: Path) -> None:
    ts = time.strftime("%Y%m%d-%H%M%S")
    backup = db_path.with_suffix(db_path.suffix + f".bak-{ts}")
    try:
        shutil.move(str(db_path), str(backup))
        logging.warning(f"Corrupted DB yedeklendi: {backup.name}")
    except Exception as e:
        logging.error(f"Yedekleme başarısız ({db_path.name}): {e}")


def ensure_db(db_path: Path, init_callable) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    if db_path.exists() and not integrity_ok(db_path):
        backup_corrupted(db_path)
    # init callable gerekli tabloları oluşturur
    init_callable()
    logging.info(f"Hazır: {db_path.name}")


def list_tables(db_path: Path):
    try:
        with sqlite3.connect(str(db_path)) as conn:
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
            return sorted([r[0] for r in cur.fetchall()])
    except Exception:
        return []


def main() -> int:
    from data.db import init_db as init_main
    from data.articles_db import init_db as init_articles
    from data.audio_db import init_db as init_audio

    qa_db = DATA_DIR / "qa_database.db"
    vid_db = DATA_DIR / "video_analyses.db"
    art_db = DATA_DIR / "articles_database.db"
    aud_db = DATA_DIR / "audio_database.db"

    # init_main hem QA'yi hem video_analyses'i kurar
    ensure_db(qa_db, init_main)
    ensure_db(vid_db, init_main)
    ensure_db(art_db, init_articles)
    ensure_db(aud_db, init_audio)

    for p in [qa_db, art_db, aud_db, vid_db]:
        print(p.name, list_tables(p))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


