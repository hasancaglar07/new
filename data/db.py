# data/db.py
# Versiyon 2.2 - Makale tablosu ve ilgili fonksiyonlar eklendi.

import sqlite3
import os
import json
import logging

# Hata ayıklama ve bilgi mesajları için logging yapılandırması
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

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
    
    # Video analiz görevleri için tablo
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS video_analysis_tasks (
            task_id TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            message TEXT,
            result TEXT, -- Sonuç JSON string olarak burada saklanacak
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # ★★★ YENİ: Makaleler için tablo ★★★
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT NOT NULL,
            url TEXT UNIQUE NOT NULL, -- Aynı makaleyi tekrar eklememek için
            author TEXT,
            scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

# ★★★ YENİ FONKSİYON: Makale kaydetmek için ★★★
def save_article(title, content, category, url, author):
    """
    Çekilen bir makaleyi veritabanına kaydeder.
    Eğer URL zaten varsa, üzerine yazmaz (IGNORE).
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT OR IGNORE INTO articles (title, content, category, url, author)
            VALUES (?, ?, ?, ?, ?)
        """, (title, content, category, url, author))
        conn.commit()
        # Eğer yeni bir satır eklendiyse (yani makale zaten mevcut değilse), cursor.rowcount > 0 olur.
        if cursor.rowcount > 0:
            logging.info(f"Yeni makale veritabanına eklendi: {title}")
        # else:
            # Her seferinde loglamamak için bu satırı yorumda bırakabiliriz.
            # logging.info(f"Bu makale zaten veritabanında mevcut: {title}")

    except sqlite3.IntegrityError:
        # Bu hata INSERT OR IGNORE ile genellikle oluşmaz ama bir güvenlik katmanı olarak kalabilir.
        logging.warning(f"Bu URL zaten kayıtlı (IntegrityError): {url}")
    except Exception as e:
        logging.error(f"Makale kaydedilirken hata oluştu: {e}")
    finally:
        conn.close()

# ★★★ YENİ FONKSİYON: Makaleleri kategorilere göre çekmek için ★★★
def get_all_articles_by_category():
    """Tüm makaleleri kategorilerine göre gruplanmış şekilde döndürür."""
    conn = get_connection()
    # Sonuçları sözlük olarak almak için row_factory kullanıyoruz
    conn.row_factory = sqlite3.Row 
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, title, category, author, url FROM articles ORDER BY category, title")
    rows = cursor.fetchall()
    
    articles_by_category = {}
    for row in rows:
        category = row['category']
        if category not in articles_by_category:
            articles_by_category[category] = []
        
        # Her bir makaleyi sözlük olarak ekle
        articles_by_category[category].append(dict(row))
        
    conn.close()
    return articles_by_category

# ★★★ YENİ FONKSİYON: Tek bir makaleyi ID ile çekmek için ★★★
def get_article_by_id(article_id: int):
    """Verilen ID'ye sahip makalenin tüm detaylarını döndürür."""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM articles WHERE id = ?", (article_id,))
    row = cursor.fetchone()
    conn.close()
    
    return dict(row) if row else None


# --- GÖREV YÖNETİMİ FONKSİYONLARI ---

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

def get_all_completed_analyses():
    """
    Veritabanındaki durumu 'completed' olan tüm analizleri getirir.
    Bu fonksiyon, analiz geçmişi sayfasını doldurmak için kullanılır.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT task_id, result FROM video_analysis_tasks 
        WHERE status = 'completed' AND result IS NOT NULL 
        ORDER BY created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    history = {}
    for row in rows:
        video_id = row[0]
        try:
            result_data = json.loads(row[1]) if row[1] else None
            if result_data:
                history[video_id] = result_data
        except (json.JSONDecodeError, KeyError):
            continue
    return history