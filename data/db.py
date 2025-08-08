# data/db.py
# Versiyon 3.0 - Analiz geçmişi kalıcı olarak Turso bulut veritabanına taşındı.

import sqlite3
import os
import json
import logging
from pathlib import Path

# Turso ile iletişim kurmak için gerekli kütüphane
import libsql_client

# Hata ayıklama ve bilgi mesajları için logging yapılandırması
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Veritabanı Yollarının ve Bağlantılarının Tanımlanması ---

# 1. Sizin güncellediğiniz, deploy ile değişen yerel veritabanı dosyası.
# Bu, qa_sessions ve articles tablolarını içerir.
REGULAR_DB_PATH = os.path.join(os.path.dirname(__file__), "qa_database.db")

def get_regular_connection():
    """Standart yerel veritabanı için bağlantı oluşturur (qa_database.db)."""
    return sqlite3.connect(REGULAR_DB_PATH)

def get_persistent_connection():
    """Kalıcı Turso bulut veritabanı için bir istemci (client) oluşturur."""
    url = os.getenv("TURSO_ANALYSIS_URL")
    token = os.getenv("TURSO_ANALYSIS_TOKEN")
    
    if not url or not token:
        # Eğer ortam değişkenleri ayarlanmamışsa, hata ver.
        # Bu, uygulamanın yanlış yapılandırılmasını önler.
        raise ValueError("Turso veritabanı için TURSO_ANALYSIS_URL ve TURSO_ANALYSIS_TOKEN ortam değişkenleri ayarlanmalı.")
        
    return libsql_client.create_client_sync(url=url, auth_token=token)

# --- Veritabanı Başlatma ---

def init_db():
    """Tüm gerekli tabloları kendi veritabanlarında başlatır veya oluşturur."""
    
    # === Standart Yerel Veritabanı Tabloları ===
    try:
        with get_regular_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS qa_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, question TEXT NOT NULL, answer TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )""")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS articles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, category TEXT NOT NULL,
                    url TEXT UNIQUE NOT NULL, author TEXT, scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )""")
            conn.commit()
        logging.info(f"Standart veritabanı '{REGULAR_DB_PATH}' başarıyla başlatıldı.")
    except Exception as e:
        logging.error(f"Standart veritabanı '{REGULAR_DB_PATH}' başlatılırken HATA: {e}")

    # === Kalıcı Turso Veritabanı Tablosu ===
    try:
        client = get_persistent_connection()
        client.execute("""
            CREATE TABLE IF NOT EXISTS video_analysis_tasks (
                task_id TEXT PRIMARY KEY, status TEXT NOT NULL, message TEXT, result TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )""")
        logging.info(f"Kalıcı Turso veritabanı bağlantısı başarılı ve tablo hazır.")
    except Exception as e:
        logging.error(f"Kalıcı Turso veritabanı başlatılırken HATA oluştu: {e}")
        # Uygulamanın çökmemesi için burada devam etmesine izin verilir,
        # ancak video analiz özelliği çalışmayacaktır.
        pass

# --- Soru-Cevap ve Makale Fonksiyonları (Yerel DB'de çalışır) ---

def save_qa(question, answer):
    """Soru ve cevabı DB'ye kaydeder."""
    with get_regular_connection() as conn:
        conn.execute("INSERT INTO qa_sessions (question, answer) VALUES (?, ?)", (question, answer))

def get_all_qa():
    """Tüm soru-cevapları getirir."""
    with get_regular_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT question, answer, timestamp FROM qa_sessions ORDER BY timestamp DESC")
        return cursor.fetchall()

def save_article(title, content, category, url, author):
    """Çekilen bir makaleyi veritabanına kaydeder."""
    with get_regular_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT OR IGNORE INTO articles (title, content, category, url, author) VALUES (?, ?, ?, ?, ?)", (title, content, category, url, author))
        if cursor.rowcount > 0:
            logging.info(f"Yeni makale veritabanına eklendi: {title}")

def get_all_articles_by_category():
    """Tüm makaleleri kategorilerine göre gruplanmış şekilde döndürür."""
    with get_regular_connection() as conn:
        conn.row_factory = sqlite3.Row 
        rows = conn.execute("SELECT id, title, category, author, url FROM articles ORDER BY category, title").fetchall()
        articles_by_category = {}
        for row in rows:
            category = row['category']
            if category not in articles_by_category:
                articles_by_category[category] = []
            articles_by_category[category].append(dict(row))
        return articles_by_category

def get_article_by_id(article_id: int):
    """Verilen ID'ye sahip makalenin tüm detaylarını döndürür."""
    with get_regular_connection() as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM articles WHERE id = ?", (article_id,)).fetchone()
        return dict(row) if row else None


# --- GÖREV YÖNETİMİ FONKSİYONLARI (Turso DB'de çalışır) ---

def update_task(task_id: str, status: str, message: str = None, result: dict = None):
    """Bir görevin durumunu Turso veritabanında oluşturur veya günceller."""
    client = get_persistent_connection()
    result_json = json.dumps(result, ensure_ascii=False) if result else None
    
    # Turso/libSQL UPSERT (INSERT OR UPDATE) sözdizimini destekler.
    sql = """
        INSERT INTO video_analysis_tasks (task_id, status, message, result, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(task_id) DO UPDATE SET
            status=excluded.status,
            message=excluded.message,
            result=excluded.result,
            updated_at=CURRENT_TIMESTAMP
    """
    client.execute(sql, (task_id, status, message, result_json))

def get_task(task_id: str):
    """Turso veritabanından bir görevin durumunu alır."""
    client = get_persistent_connection()
    rs = client.execute("SELECT task_id, status, message, result, updated_at FROM video_analysis_tasks WHERE task_id = ?", (task_id,))
    
    if len(rs.rows) == 0:
        return None
    
    row = rs.rows[0]
    result_dict = json.loads(row[3]) if row[3] else None
    # 'updated_at' sütununu da döndürmek için ekledik.
    return {"task_id": row[0], "status": row[1], "message": row[2], "result": result_dict, "updated_at": row[4]}

def get_all_completed_analyses():
    """Turso veritabanındaki durumu 'completed' olan tüm analizleri getirir."""
    client = get_persistent_connection()
    rs = client.execute("""
        SELECT task_id, result FROM video_analysis_tasks 
        WHERE status = 'completed' AND result IS NOT NULL 
        ORDER BY updated_at DESC
    """)
    
    history = {}
    for row in rs.rows:
        video_id = row[0]
        try:
            result_data = json.loads(row[1]) if row[1] else None
            if result_data:
                history[video_id] = result_data
        except (json.JSONDecodeError, KeyError) as e:
            logging.warning(f"Geçmiş analiz verisi okunurken hata oluştu (ID: {video_id}): {e}")
            continue
    return history