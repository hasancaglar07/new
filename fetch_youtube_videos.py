#!/usr/bin/env python3
# fetch_youtube_videos.py
# YouTube API ile tüm videoları çekip cache'e kaydet

import requests
import logging
import time
from typing import List, Dict
from data.youtube_cache_db import init_youtube_cache_db, insert_video, insert_channel, get_channel_stats

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# YouTube API Key
YOUTUBE_API_KEY = "AIzaSyDrdFdQSp1saf_RRwKicormFxTw1gYpW_g"

# Hedef kanallar
TARGET_CHANNELS = {
    "Yediulya": "UCfYG6Ij2vIJXXplpottv02Q",
    "Kalemdar Alemdar": "UCvhlPtV-1MgZBQPmGjomhsA", 
    "Didar Akademi": "UC9Jt0jM08o7aXSHz0Kni7Uw",
    "Kutbu Cihan": "UC0FN4XBgk2Isvv1QmrbFn8w"
}

def get_channel_info(channel_id: str) -> Dict:
    """
    Kanal bilgilerini getir
    """
    try:
        url = "https://www.googleapis.com/youtube/v3/channels"
        params = {
            "part": "snippet,statistics",
            "id": channel_id,
            "key": YOUTUBE_API_KEY
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        if not data.get("items"):
            return {}
        
        channel = data["items"][0]
        snippet = channel.get("snippet", {})
        statistics = channel.get("statistics", {})
        
        return {
            "channel_id": channel_id,
            "channel_name": snippet.get("title", ""),
            "description": snippet.get("description", ""),
            "thumbnail_url": snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
            "subscriber_count": int(statistics.get("subscriberCount", 0)),
            "video_count": int(statistics.get("videoCount", 0))
        }
        
    except Exception as e:
        logger.error(f"Kanal bilgisi alma hatası {channel_id}: {e}")
        return {}

def get_channel_videos(channel_id: str, max_results: int = 500) -> List[Dict]:
    """
    Kanalın tüm videolarını getir
    """
    videos = []
    next_page_token = None
    
    try:
        while len(videos) < max_results:
            url = "https://www.googleapis.com/youtube/v3/search"
            params = {
                "part": "snippet",
                "channelId": channel_id,
                "type": "video",
                "order": "date",
                "maxResults": min(50, max_results - len(videos)),
                "key": YOUTUBE_API_KEY
            }
            
            if next_page_token:
                params["pageToken"] = next_page_token
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            items = data.get("items", [])
            
            if not items:
                break
            
            # Video detaylarını al
            video_ids = [item["id"]["videoId"] for item in items]
            video_details = get_video_details(video_ids)
            
            for item in items:
                video_id = item["id"]["videoId"]
                snippet = item["snippet"]
                details = video_details.get(video_id, {})
                
                video_data = {
                    "video_id": video_id,
                    "title": snippet.get("title", ""),
                    "description": snippet.get("description", ""),
                    "thumbnail_url": snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                    "video_url": f"https://www.youtube.com/watch?v={video_id}",
                    "channel_id": channel_id,
                    "channel_name": snippet.get("channelTitle", ""),
                    "published_at": snippet.get("publishedAt", ""),
                    "duration": details.get("duration", ""),
                    "view_count": details.get("view_count", 0)
                }
                
                videos.append(video_data)
            
            next_page_token = data.get("nextPageToken")
            if not next_page_token:
                break
            
            # Rate limiting
            time.sleep(0.1)
        
        logger.info(f"Kanal {channel_id}: {len(videos)} video bulundu")
        return videos
        
    except Exception as e:
        logger.error(f"Video çekme hatası {channel_id}: {e}")
        return videos

def get_video_details(video_ids: List[str]) -> Dict:
    """
    Video detaylarını toplu olarak getir
    """
    try:
        url = "https://www.googleapis.com/youtube/v3/videos"
        params = {
            "part": "contentDetails,statistics",
            "id": ",".join(video_ids),
            "key": YOUTUBE_API_KEY
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        details = {}
        
        for item in data.get("items", []):
            video_id = item["id"]
            content_details = item.get("contentDetails", {})
            statistics = item.get("statistics", {})
            
            details[video_id] = {
                "duration": content_details.get("duration", ""),
                "view_count": int(statistics.get("viewCount", 0))
            }
        
        return details
        
    except Exception as e:
        logger.error(f"Video detay alma hatası: {e}")
        return {}

def fetch_all_videos():
    """
    Tüm kanallardan videoları çek ve veritabanına kaydet
    """
    logger.info("🚀 YouTube video çekme işlemi başlatılıyor...")
    
    # Veritabanını başlat
    init_youtube_cache_db()
    
    total_videos = 0
    
    for channel_name, channel_id in TARGET_CHANNELS.items():
        logger.info(f"📺 {channel_name} kanalı işleniyor...")
        
        # Kanal bilgilerini çek ve kaydet
        channel_info = get_channel_info(channel_id)
        if channel_info:
            insert_channel(channel_info)
            logger.info(f"✅ Kanal bilgileri kaydedildi: {channel_name}")
        
        # Videoları çek
        videos = get_channel_videos(channel_id, max_results=500)
        
        # Videoları veritabanına kaydet
        saved_count = 0
        for video in videos:
            if insert_video(video):
                saved_count += 1
        
        logger.info(f"✅ {channel_name}: {saved_count}/{len(videos)} video kaydedildi")
        total_videos += saved_count
        
        # Rate limiting
        time.sleep(1)
    
    logger.info(f"🎉 Tamamlandı! Toplam {total_videos} video kaydedildi.")
    
    # İstatistikleri göster
    stats = get_channel_stats()
    logger.info(f"📊 Veritabanı istatistikleri:")
    logger.info(f"   Toplam video: {stats['total_videos']}")
    for channel in stats['channels']:
        logger.info(f"   {channel['channel_name']}: {channel['video_count']} video")

def test_api_key():
    """
    API anahtarını test et
    """
    try:
        url = "https://www.googleapis.com/youtube/v3/channels"
        params = {
            "part": "snippet",
            "id": "UCfYG6Ij2vIJXXplpottv02Q",  # Yediulya
            "key": YOUTUBE_API_KEY
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        if data.get("items"):
            logger.info("✅ API anahtarı çalışıyor")
            return True
        else:
            logger.error("❌ API anahtarı geçersiz")
            return False
            
    except Exception as e:
        logger.error(f"❌ API test hatası: {e}")
        return False

if __name__ == "__main__":
    print("🔑 API anahtarı test ediliyor...")
    if test_api_key():
        print("\n📥 Tüm videoları çekme işlemi başlatılıyor...")
        fetch_all_videos()
    else:
        print("❌ API anahtarı çalışmıyor. Lütfen kontrol edin.")