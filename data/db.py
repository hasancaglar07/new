# data/db.py
# Versiyon 2.0 - Video analiz görevleri için veritabanı yönetimi eklendi.

import sqlite3
import os
import json

DB_FILE = os.path.join(os.path.dirname(__file__), "qa_database.db")

def get_connection():
    """Veritabanı bağlantısı oluşturur."""
    return sqlite3.connect(DB_FILE)

def init_db():
    """Tüm gerekli tabloları başlatır veya oluşturur."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Mevcut Soru-Cevap tablosu
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS qa_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # YENİ: Video analiz görevleri için tablo
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS video_analysis_tasks (
            task_id TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            message TEXT,
            result TEXT, -- Sonuç JSON string olarak burada saklanacak
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()

def save_qa(question, answer):
    """Soru ve cevabı DB'ye kaydeder."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO qa_sessions (question, answer) VALUES (?, ?)", (question, answer))
    conn.commit()
    conn.close()

def get_all_qa():
    """Tüm soru-cevapları getirir."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT question, answer, timestamp FROM qa_sessions ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    conn.close()
    return rows

# --- YENİ GÖREV YÖNETİMİ FONKSİYONLARI ---

def update_task(task_id: str, status: str, message: str = None, result: dict = None):
    """Bir görevin durumunu atomik olarak oluşturur veya günceller."""
    conn = get_connection()
    cursor = conn.cursor()
    result_json = json.dumps(result, ensure_ascii=False) if result else None
    
    cursor.execute("""
        INSERT INTO video_analysis_tasks (task_id, status, message, result)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(task_id) DO UPDATE SET
        status=excluded.status,
        message=excluded.message,
        result=excluded.result,
        created_at=CURRENT_TIMESTAMP
    """, (task_id, status, message, result_json))
    
    conn.commit()
    conn.close()

def get_task(task_id: str):
    """Veritabanından bir görevin durumunu alır."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT task_id, status, message, result FROM video_analysis_tasks WHERE task_id = ?", (task_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    
    result_dict = json.loads(row[3]) if row[3] else None
    return {"task_id": row[0], "status": row[1], "message": row[2], "result": result_dict}