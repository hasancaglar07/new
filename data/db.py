# data/db.py
# Versiyon 3.2 - Video analizleri için Supabase (Postgres) > SQLite sırası

import sqlite3
import os
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any
from urllib.parse import quote, quote_plus

"""Supabase veri erişim katmanı

Artık doğrudan Postgres (psycopg2) yerine Supabase REST API kullanıyoruz.
Harici paket kurulumu gerektirmeden `httpx` ile istek atıyoruz.
"""

import httpx
from config import SUPABASE_URL, SUPABASE_SECRET_KEY

# Turso kaldırıldı

# B2 JSON mirror
from config import (
    B2_APPLICATION_KEY_ID,
    B2_APPLICATION_KEY,
    B2_JSON_BUCKET_NAME,
    B2_JSON_PREFIX,
)
try:
    from utils.b2_client import B2Client
except Exception:
    B2Client = None  # type: ignore

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Paths ---
REGULAR_DB_PATH = os.path.join(os.path.dirname(__file__), "qa_database.db")
VIDEO_SQLITE_PATH = os.path.join(os.path.dirname(__file__), "video_analyses.db")

_SUPABASE_DISABLED: bool = False
_SUPABASE_DISABLED_REASON: str | None = None


def _get_supabase_http_client() -> Optional[httpx.Client]:
    if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
        return None
    headers = {
        "apikey": SUPABASE_SECRET_KEY,
        "Authorization": f"Bearer {SUPABASE_SECRET_KEY}",
        "Content-Type": "application/json",
    }
    return httpx.Client(base_url=SUPABASE_URL.rstrip("/") + "/rest/v1", headers=headers, timeout=20.0)

# --- Connections ---

def get_regular_connection():
    return sqlite3.connect(REGULAR_DB_PATH)


def get_supabase_connection() -> Optional[httpx.Client]:
    """Supabase REST HTTP client. İlk hatada devre dışı bırakır."""
    global _SUPABASE_DISABLED, _SUPABASE_DISABLED_REASON

    if _SUPABASE_DISABLED:
        return None
    if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
        _SUPABASE_DISABLED = True
        _SUPABASE_DISABLED_REASON = "SUPABASE_URL veya SECRET_KEY eksik"
        logging.warning("Supabase devre dışı: URL veya Secret Key yok. SQLite kullanılacak.")
        return None

    try:
        client = _get_supabase_http_client()
        if client is None:
            raise RuntimeError("HTTP client oluşturulamadı")
        # Basit bir ping: health için küçük bir select dene
        resp = client.get("/video_analysis_tasks", params={"select": "task_id", "limit": 1})
        if resp.status_code in (200, 206):
            logging.info("Supabase REST client hazır.")
            return client
        # 404 tablo yok olabilir; client yine de döndür.
        if resp.status_code == 404:
            logging.info("Supabase REST canlı, tablo bulunamadı (migration bekleniyor).")
            return client
        raise RuntimeError(f"REST ping hatası: {resp.status_code} {resp.text}")
    except Exception as e:
        _SUPABASE_DISABLED = True
        _SUPABASE_DISABLED_REASON = str(e)
        logging.warning(f"Supabase client oluşturulamadı: {e}. SQLite kullanılacak.")
        return None


def get_turso_connection():
    return None


def get_sqlite_connection():
    try:
        conn = sqlite3.connect(VIDEO_SQLITE_PATH)
        logging.info(f"Yerel SQLite video analizi veritabanı başlatıldı: {VIDEO_SQLITE_PATH}")
        return conn
    except Exception as e:
        logging.error(f"SQLite veritabanı başlatılırken hata: {e}")
        return None


def get_persistent_connection():
    """Öncelik: Supabase > SQLite"""
    supa = get_supabase_connection()
    if supa:
        return supa
    turso = get_turso_connection()
    if turso:
        return turso
    return get_sqlite_connection()

# --- Init DBs ---

def init_db():
    # Regular DB
    try:
        with get_regular_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS qa_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, question TEXT NOT NULL, answer TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS articles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, category TEXT NOT NULL,
                    url TEXT UNIQUE NOT NULL, author TEXT, scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            conn.commit()
        logging.info(f"Standart veritabanı '{REGULAR_DB_PATH}' başarıyla başlatıldı.")
    except Exception as e:
        logging.error(f"Standart veritabanı '{REGULAR_DB_PATH}' başlatılırken HATA: {e}")

    # Persistent DB: create table if not exists
    try:
        client = get_persistent_connection()
        if client is None:
            logging.warning("Kalıcı veritabanı bağlantısı kurulamadı. Video analizi geçici olabilir.")
            return
        # Supabase REST
        if isinstance(client, httpx.Client):
            try:
                resp = client.get("/video_analysis_tasks", params={"select": "task_id", "limit": 1})
                if resp.status_code in (200, 206, 404):
                    logging.info("Supabase REST: tablo erişim denemesi tamamlandı.")
            except Exception:
                logging.info("Supabase: 'video_analysis_tasks' tablo kontrolü atlandı.")
        # SQLite
        if isinstance(client, sqlite3.Connection):
            client.execute(
                """
                CREATE TABLE IF NOT EXISTS video_analysis_tasks (
                    task_id TEXT PRIMARY KEY, 
                    status TEXT NOT NULL, 
                    message TEXT, 
                    result TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            client.commit()
            logging.info("SQLite video_analyses tablosu hazır.")
    except Exception as e:
        logging.error(f"Kalıcı video veritabanı başlatılırken HATA: {e}")

# --- Regular QA/Articles (unchanged) ---

def save_qa(question, answer):
    with get_regular_connection() as conn:
        conn.execute("INSERT INTO qa_sessions (question, answer) VALUES (?, ?)", (question, answer))


def get_all_qa():
    with get_regular_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT question, answer, timestamp FROM qa_sessions ORDER BY timestamp DESC")
        return cursor.fetchall()


def save_article(title, content, category, url, author):
    with get_regular_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR IGNORE INTO articles (title, content, category, url, author) VALUES (?, ?, ?, ?, ?)",
            (title, content, category, url, author),
        )
        if cursor.rowcount > 0:
            logging.info(f"Yeni makale veritabanına eklendi: {title}")


def get_all_articles_by_category():
    with get_regular_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT id, title, category, author, url FROM articles ORDER BY category, title"
        ).fetchall()
        articles_by_category = {}
        for row in rows:
            category = row["category"]
            if category not in articles_by_category:
                articles_by_category[category] = []
            articles_by_category[category].append(dict(row))
        return articles_by_category


def get_article_by_id(article_id: int):
    with get_regular_connection() as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM articles WHERE id = ?", (article_id,)).fetchone()
        return dict(row) if row else None

# --- Video Task CRUD (Supabase > SQLite) ---

def _upsert_supabase(task_id: str, status: str, message: Optional[str], result: Optional[Dict[str, Any]]):
    client = get_supabase_connection()
    if not isinstance(client, httpx.Client):
        return False
    try:
        payload = {"task_id": task_id, "status": status, "message": message, "result": result}
        headers = {"Prefer": "resolution=merge-duplicates,return=representation"}
        try:
            resp = client.post(
                "/video_analysis_tasks",
                params={"on_conflict": "task_id"},
                json=payload,
                headers=headers,
            )
        except Exception as e:
            logging.error(f"Supabase UPSERT isteği gönderilemedi: {e}")
            return False
        if resp.status_code in (200, 201, 204):
            return True
        logging.error(f"Supabase UPSERT hatası: {resp.status_code} {resp.text}")
        return False
    except Exception as e:
        logging.error(f"Supabase UPSERT genel hata: {e}")
        return False


def _upsert_sqlite(task_id: str, status: str, message: str | None, result_json: str | None):
    conn = get_sqlite_connection()
    if not conn:
        logging.warning(f"SQLite bağlantısı yok, görev güncellenemedi: {task_id}")
        return
    try:
        sql = (
            "INSERT OR REPLACE INTO video_analysis_tasks "
            "(task_id, status, message, result, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        )
        conn.execute(sql, (task_id, status, message, result_json))
        conn.commit()
    except Exception as e:
        logging.error(f"SQLite UPSERT sırasında hata: {e}")
    finally:
        conn.close()


def update_task(task_id: str, status: str, message: str = None, result: dict = None):
    """Bir görevin durumunu kalıcı veritabanında oluşturur veya günceller.
    'completed' + result durumunda opsiyonel olarak B2 JSON arşivine de yazar."""
    # 1) Supabase
    supa_ok = _upsert_supabase(task_id, status, message, result)
    if not supa_ok:
    # 2) Turso kaldırıldı
        result_json = json.dumps(result, ensure_ascii=False) if result else None
        client = get_turso_connection()
        if client:
            try:
                client.execute(
                    """
                    INSERT INTO video_analysis_tasks (task_id, status, message, result, created_at, updated_at)
                    VALUES (:task_id, :status, :message, :result, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT(task_id) DO UPDATE SET 
                        status=excluded.status,
                        message=excluded.message,
                        result=excluded.result,
                        updated_at=CURRENT_TIMESTAMP
                    """,
                    {"task_id": task_id, "status": status, "message": message, "result": result_json},
                )
                pass
            except Exception as e:
                logging.error(f"SQLite UPSERT fallback: {e}")
                _upsert_sqlite(task_id, status, message, result_json)
        else:
            _upsert_sqlite(task_id, status, message, result_json)
            logging.info(f"Görev güncellendi (SQLite): {task_id} - {status}")

    # B2 JSON mirror (opsiyonel)
    if status == "completed" and result and B2Client and B2_APPLICATION_KEY_ID and B2_APPLICATION_KEY and B2_JSON_BUCKET_NAME:
        try:
            b2 = B2Client(B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY)
            key = f"{B2_JSON_PREFIX.rstrip('/')}/{task_id}.json" if B2_JSON_PREFIX else f"{task_id}.json"
            b2.upload_json(B2_JSON_BUCKET_NAME, key, {"task_id": task_id, "result": result})
            logging.info(f"B2 JSON mirror yazıldı: b2://{B2_JSON_BUCKET_NAME}/{key}")
        except Exception as e:
            logging.warning(f"B2 JSON mirror yazılırken hata: {e}")


def get_task(task_id: str):
    # 1) Supabase
    client = get_supabase_connection()
    if isinstance(client, httpx.Client):
        try:
            params = {
                "select": "task_id,status,message,result,updated_at",
                "task_id": f"eq.{task_id}",
            }
            resp = client.get("/video_analysis_tasks", params=params)
            if resp.status_code not in (200, 206):
                return None
            rows = resp.json() if resp.text else []
            if not rows:
                return None
            return rows[0]
        except Exception as e:
            logging.error(f"Supabase get_task hatası: {e}")
    # 2) Turso kaldırıldı
    # 3) SQLite
    conn = get_sqlite_connection()
    if not conn:
        logging.warning(f"Kalıcı bağlantı yok, görev alınamadı: {task_id}")
        return None
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT task_id, status, message, result, updated_at FROM video_analysis_tasks WHERE task_id = ?",
            (task_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        result_dict = json.loads(row[3]) if row[3] else None
        return {"task_id": row[0], "status": row[1], "message": row[2], "result": result_dict, "updated_at": row[4]}
    except Exception as e:
        logging.error(f"Görev alınırken hata: {e}")
        return None
    finally:
        conn.close()


def get_all_completed_analyses():
    # 1) Supabase
    client = get_supabase_connection()
    if isinstance(client, httpx.Client):
        try:
            params = {
                "select": "task_id,result,updated_at",
                "status": "eq.completed",
                "order": "updated_at.desc",
            }
            resp = client.get("/video_analysis_tasks", params=params)
            if resp.status_code not in (200, 206):
                return {}
            rows = resp.json() if resp.text else []
            history: Dict[str, Any] = {}
            for row in rows:
                video_id = row.get("task_id")
                result_data = row.get("result")
                if isinstance(result_data, str):
                    try:
                        result_data = json.loads(result_data)
                    except Exception:
                        pass
                if video_id and result_data:
                    history[video_id] = result_data
            return history
        except Exception as e:
            logging.error(f"Supabase get_all_completed_analyses hatası: {e}")
    # 2) Turso kaldırıldı
    # 3) SQLite
    conn = get_sqlite_connection()
    if not conn:
        logging.warning("Kalıcı bağlantı yok, geçmiş analizler alınamadı")
        return {}
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT task_id, result FROM video_analysis_tasks 
            WHERE status = 'completed' AND result IS NOT NULL 
            ORDER BY updated_at DESC
            """
        )
        history = {}
        for row in cursor.fetchall():
            video_id = row[0]
            try:
                result_data = json.loads(row[1]) if row[1] else None
                if result_data:
                    history[video_id] = result_data
            except (json.JSONDecodeError, KeyError) as e:
                logging.warning(f"Geçmiş analiz verisi okunurken hata oluştu (ID: {video_id}): {e}")
                continue
        return history
    except Exception as e:
        logging.error(f"Geçmiş alınırken hata: {e}")
        return {}
    finally:
        conn.close()