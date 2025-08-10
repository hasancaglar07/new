# data/audio_db.py (Versiyon 2.0 - Backblaze Uyumlu)

import sqlite3
import json
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
BASE_DIR = Path(__file__).parent.parent
DB_PATH = BASE_DIR / "data" / "audio_database.db"

def get_all_audio_by_source():
    """Tüm analiz edilmiş ses kayıtlarını kaynağa göre gruplayarak getirir."""
    if not DB_PATH.exists():
        logging.warning("audio_database.db bulunamadı.")
        return {}
    
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, source_name, title, mp3_path, chapters_json
            FROM audio_analyses
            WHERE status = 'analyzed'
            ORDER BY source_name, title
        """)
        
        results = {}
        for row in cursor.fetchall():
            source = row['source_name']
            if source not in results:
                results[source] = []
            
            # *** DEĞİŞİKLİK: Tam yol yerine sadece dosya adını (name) döndür ***
            # Windows ve Unix path separator'larını handle et
            mp3_filename = Path(row['mp3_path'].replace('\\', '/')).name
            
            results[source].append({
                "id": row['id'],
                "title": row['title'],
                "mp3_filename": mp3_filename, # <-- İsim değişikliği
                "chapters": json.loads(row['chapters_json']) if row['chapters_json'] else []
            })
    return results

def init_db():
    """audio_database.db içindeki tabloyu garanti eder."""
    try:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute(
                '''
                CREATE TABLE IF NOT EXISTS audio_analyses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_name TEXT NOT NULL,
                    original_path TEXT NOT NULL,
                    mp3_path TEXT UNIQUE,
                    title TEXT,
                    cleaned_filename TEXT,
                    chapters_json TEXT,
                    status TEXT NOT NULL CHECK(status IN ('pending', 'converted', 'analyzed', 'failed')),
                    UNIQUE(source_name, original_path)
                )
                '''
            )
            conn.commit()
        logging.info(f"Audio veritabanı hazır: {DB_PATH}")
    except Exception as e:
        logging.error(f"Audio DB init hatası: {e}")

def search_audio_chapters(query: str):
    """Konu başlıkları içinde metinsel arama yapar."""
    if not DB_PATH.exists() or not query.strip():
        return []

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, source_name, title, mp3_path, chapters_json
            FROM audio_analyses
            WHERE status = 'analyzed' AND chapters_json LIKE ?
        """, (f'%{query}%',))
        
        results = []
        for row in cursor.fetchall():
            chapters = json.loads(row['chapters_json']) if row['chapters_json'] else []
            matching_chapters = [
                chapter for chapter in chapters 
                if query.lower() in chapter.get('title', '').lower()
            ]
            
            if matching_chapters:
                # *** DEĞİŞİKLİK: Tam yol yerine sadece dosya adını (name) döndür ***
                # Windows ve Unix path separator'larını handle et
                mp3_filename = Path(row['mp3_path'].replace('\\', '/')).name
                results.append({
                    "id": row['id'],
                    "title": row['title'],
                    "source": row['source_name'],
                    "mp3_filename": mp3_filename, # <-- İsim değişikliği
                    "matching_chapters": matching_chapters
                })
    return results
    
def get_audio_path_by_id(audio_id: int):
    """Verilen ID'ye sahip ses kaydının mp3_path'ini döndürür."""
    if not DB_PATH.exists():
        return None
    
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT mp3_path FROM audio_analyses WHERE id = ?", (audio_id,))
        result = cursor.fetchone()
        return result[0] if result else None    