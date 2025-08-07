# data/articles_db.py
# Versiyon 1.1 - Mevcut URL'leri hızlıca getiren fonksiyon eklendi.

import sqlite3
import os
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

DB_FILE = os.path.join(os.path.dirname(__file__), "articles_database.db")

def get_connection():
    """Makale veritabanı için bağlantı oluşturur."""
    return sqlite3.connect(DB_FILE)

def init_db():
    """Makale veritabanını ve 'articles' tablosunu oluşturur."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT NOT NULL,
            url TEXT UNIQUE NOT NULL,
            author TEXT,
            scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()
    logging.info(f"Makale veritabanı hazır: {DB_FILE}")

def save_article(title, content, category, url, author):
    """Çekilen bir makaleyi makale veritabanına kaydeder."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT OR IGNORE INTO articles (title, content, category, url, author)
            VALUES (?, ?, ?, ?, ?)
        """, (title, content, category, url, author))
        conn.commit()
        if cursor.rowcount > 0:
            logging.info(f"Yeni makale eklendi: {title}")
    except Exception as e:
        logging.error(f"Makale kaydedilirken hata oluştu: {e}")
    finally:
        conn.close()

# ★★★ YENİ FONKSİYON: Mevcut tüm URL'leri getiren fonksiyon ★★★
def get_existing_article_urls():
    """
    Veritabanında zaten kayıtlı olan tüm makale URL'lerini bir set olarak döndürür.
    Set, 'in' kontrolü için listelerden çok daha hızlıdır.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT url FROM articles")
        rows = cursor.fetchall()
        # Dönen sonuç [(url1,), (url2,)] şeklindedir, bunu {url1, url2} set'ine çeviriyoruz.
        return {row[0] for row in rows}
    except Exception as e:
        logging.error(f"Mevcut URL'ler alınırken hata: {e}")
        return set()
    finally:
        conn.close()

def get_all_articles_by_category():
    """Tüm makaleleri kategorilerine göre gruplanmış şekilde döndürür."""
    conn = get_connection()
    conn.row_factory = sqlite3.Row 
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, category, author, url FROM articles ORDER BY category, title")
    rows = cursor.fetchall()
    articles_by_category = {}
    for row in rows:
        category = row['category']
        if category not in articles_by_category:
            articles_by_category[category] = []
        articles_by_category[category].append(dict(row))
    conn.close()
    return articles_by_category

def get_article_by_id(article_id: int):
    """Verilen ID'ye sahip makalenin tüm detaylarını döndürür."""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM articles WHERE id = ?", (article_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None