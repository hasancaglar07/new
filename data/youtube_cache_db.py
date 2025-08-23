#!/usr/bin/env python3
# youtube_cache_db.py
# YouTube videoları için cache veritabanı

import sqlite3
import logging
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Veritabanı dosya yolu
DB_PATH = Path(__file__).parent / "youtube_cache.db"

def init_youtube_cache_db():
    """
    YouTube cache veritabanını başlat
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # YouTube videoları tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS youtube_videos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                video_id TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                thumbnail_url TEXT,
                video_url TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                channel_name TEXT NOT NULL,
                published_at TEXT,
                duration TEXT,
                view_count INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Kanal bilgileri tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS youtube_channels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id TEXT UNIQUE NOT NULL,
                channel_name TEXT NOT NULL,
                description TEXT,
                thumbnail_url TEXT,
                subscriber_count INTEGER,
                video_count INTEGER,
                last_sync TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Arama performansı için indeksler
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_video_id ON youtube_videos(video_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_channel_id ON youtube_videos(channel_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_title ON youtube_videos(title)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_published_at ON youtube_videos(published_at)")
        
        conn.commit()
        conn.close()
        
        logger.info(f"YouTube cache veritabanı başlatıldı: {DB_PATH}")
        
    except Exception as e:
        logger.error(f"YouTube cache veritabanı başlatma hatası: {e}")
        raise

def insert_video(video_data: Dict) -> bool:
    """
    Yeni video ekle veya güncelle
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO youtube_videos 
            (video_id, title, description, thumbnail_url, video_url, 
             channel_id, channel_name, published_at, duration, view_count, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (
            video_data.get('video_id'),
            video_data.get('title'),
            video_data.get('description'),
            video_data.get('thumbnail_url'),
            video_data.get('video_url'),
            video_data.get('channel_id'),
            video_data.get('channel_name'),
            video_data.get('published_at'),
            video_data.get('duration'),
            video_data.get('view_count')
        ))
        
        conn.commit()
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"Video ekleme hatası: {e}")
        return False

def insert_channel(channel_data: Dict) -> bool:
    """
    Kanal bilgilerini ekle veya güncelle
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO youtube_channels 
            (channel_id, channel_name, description, thumbnail_url, 
             subscriber_count, video_count, last_sync)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (
            channel_data.get('channel_id'),
            channel_data.get('channel_name'),
            channel_data.get('description'),
            channel_data.get('thumbnail_url'),
            channel_data.get('subscriber_count'),
            channel_data.get('video_count')
        ))
        
        conn.commit()
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"Kanal ekleme hatası: {e}")
        return False

def search_videos(query: str = "", channel_id: str = "", limit: int = 50) -> List[Dict]:
    """
    Videolarda arama yap
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        sql = "SELECT * FROM youtube_videos WHERE 1=1"
        params = []
        
        if query:
            sql += " AND (title LIKE ? OR description LIKE ?)"
            params.extend([f"%{query}%", f"%{query}%"])
        
        if channel_id:
            sql += " AND channel_id = ?"
            params.append(channel_id)
        
        sql += " ORDER BY published_at DESC LIMIT ?"
        params.append(limit)
        
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        
        videos = []
        for row in rows:
            videos.append({
                'id': row['video_id'],
                'title': row['title'],
                'description': row['description'],
                'thumbnail': row['thumbnail_url'],
                'url': row['video_url'],
                'channel': row['channel_name'],
                'channel_id': row['channel_id'],
                'published_at': row['published_at'],
                'duration': row['duration'],
                'view_count': row['view_count']
            })
        
        conn.close()
        return videos
        
    except Exception as e:
        logger.error(f"Video arama hatası: {e}")
        return []

def get_channel_stats() -> Dict:
    """
    Kanal istatistiklerini getir
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                channel_name,
                channel_id,
                COUNT(*) as video_count,
                MAX(published_at) as latest_video
            FROM youtube_videos 
            GROUP BY channel_id, channel_name
            ORDER BY video_count DESC
        """)
        
        channels = []
        for row in cursor.fetchall():
            channels.append({
                'channel_name': row[0],
                'channel_id': row[1],
                'video_count': row[2],
                'latest_video': row[3]
            })
        
        cursor.execute("SELECT COUNT(*) FROM youtube_videos")
        total_videos = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            'total_videos': total_videos,
            'channels': channels
        }
        
    except Exception as e:
        logger.error(f"İstatistik alma hatası: {e}")
        return {'total_videos': 0, 'channels': []}

def get_videos_by_channel(channel_id: str, limit: int = 100) -> List[Dict]:
    """
    Belirli bir kanalın videolarını getir
    """
    return search_videos(channel_id=channel_id, limit=limit)

if __name__ == "__main__":
    init_youtube_cache_db()
    print("YouTube cache veritabanı başlatıldı.")