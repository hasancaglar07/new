# youtube_search_fallback.py
# yt-dlp kullanarak API'sız YouTube arama sistemi

import yt_dlp
import logging
from typing import List, Dict, Optional
import re
from datetime import datetime

logger = logging.getLogger(__name__)

class YouTubeSearchFallback:
    """yt-dlp kullanarak API'sız YouTube arama sistemi"""
    
    def __init__(self):
        self.ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,  # Sadece metadata al, video indirme
            'default_search': 'ytsearch',
        }
    
    def search_videos(self, query: str, max_results: int = 10, channel_id: Optional[str] = None) -> List[Dict]:
        """
        yt-dlp kullanarak YouTube'da video arama
        
        Args:
            query: Arama sorgusu
            max_results: Maksimum sonuç sayısı
            channel_id: Belirli bir kanalda arama (opsiyonel)
        
        Returns:
            Video bilgilerini içeren liste
        """
        try:
            # Kanal spesifik arama için sorguyu düzenle
            if channel_id:
                search_query = f"ytsearch{max_results}:{query} site:youtube.com/channel/{channel_id}"
            else:
                search_query = f"ytsearch{max_results}:{query}"
            
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                search_results = ydl.extract_info(search_query, download=False)
                
                if not search_results or 'entries' not in search_results:
                    return []
                
                videos = []
                for entry in search_results['entries']:
                    if entry:
                        video_info = self._extract_video_info(entry)
                        if video_info:
                            videos.append(video_info)
                
                return videos
                
        except Exception as e:
            logger.error(f"yt-dlp arama hatası: {e}")
            return []
    
    def search_channel_videos(self, channel_id: str, query: str = "", max_results: int = 20) -> List[Dict]:
        """
        Belirli bir kanalın videolarını arama
        
        Args:
            channel_id: YouTube kanal ID'si
            query: Arama sorgusu (opsiyonel)
            max_results: Maksimum sonuç sayısı
        
        Returns:
            Video bilgilerini içeren liste
        """
        try:
            # Kanal URL'si oluştur
            channel_url = f"https://www.youtube.com/channel/{channel_id}/videos"
            
            ydl_opts = self.ydl_opts.copy()
            ydl_opts['playlistend'] = max_results
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                channel_info = ydl.extract_info(channel_url, download=False)
                
                if not channel_info or 'entries' not in channel_info:
                    return []
                
                videos = []
                for entry in channel_info['entries']:
                    if entry:
                        video_info = self._extract_video_info(entry)
                        if video_info:
                            # Eğer query varsa, başlık ve açıklamada ara
                            if query:
                                if (query.lower() in video_info.get('title', '').lower() or 
                                    query.lower() in video_info.get('description', '').lower()):
                                    videos.append(video_info)
                            else:
                                videos.append(video_info)
                
                return videos
                
        except Exception as e:
            logger.error(f"Kanal videoları arama hatası: {e}")
            return []
    
    def _extract_video_info(self, entry: Dict) -> Optional[Dict]:
        """
        yt-dlp entry'sinden video bilgilerini çıkar
        
        Args:
            entry: yt-dlp'den gelen video entry'si
        
        Returns:
            Standartlaştırılmış video bilgileri
        """
        try:
            video_id = entry.get('id')
            if not video_id:
                return None
            
            # Thumbnail URL'si oluştur
            thumbnail_url = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
            
            # Süreyi formatla
            duration = entry.get('duration')
            if duration:
                duration_str = self._format_duration(duration)
            else:
                duration_str = "Bilinmiyor"
            
            # Yayın tarihini formatla
            upload_date = entry.get('upload_date')
            if upload_date:
                try:
                    date_obj = datetime.strptime(upload_date, '%Y%m%d')
                    formatted_date = date_obj.strftime('%d.%m.%Y')
                except:
                    formatted_date = upload_date
            else:
                formatted_date = "Bilinmiyor"
            
            return {
                'id': video_id,
                'title': entry.get('title', 'Başlık Yok'),
                'description': entry.get('description', ''),
                'thumbnail': thumbnail_url,
                'url': f"https://www.youtube.com/watch?v={video_id}",
                'channel': entry.get('uploader', 'Bilinmiyor'),
                'channel_id': entry.get('uploader_id', ''),
                'duration': duration_str,
                'view_count': entry.get('view_count', 0),
                'upload_date': formatted_date,
                'publishedTime': formatted_date  # API uyumluluğu için
            }
            
        except Exception as e:
            logger.error(f"Video bilgisi çıkarma hatası: {e}")
            return None
    
    def _format_duration(self, duration: int) -> str:
        """
        Saniye cinsinden süreyi HH:MM:SS formatına çevir
        
        Args:
            duration: Saniye cinsinden süre
        
        Returns:
            Formatlanmış süre string'i
        """
        try:
            hours = duration // 3600
            minutes = (duration % 3600) // 60
            seconds = duration % 60
            
            if hours > 0:
                return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
            else:
                return f"{minutes:02d}:{seconds:02d}"
        except:
            return "Bilinmiyor"

# Singleton instance
youtube_fallback = YouTubeSearchFallback()

# Kolay kullanım için wrapper fonksiyonlar
def search_youtube_videos(query: str, max_results: int = 10, channel_id: Optional[str] = None) -> List[Dict]:
    """YouTube'da video arama (API'sız)"""
    return youtube_fallback.search_videos(query, max_results, channel_id)

def search_channel_videos(channel_id: str, query: str = "", max_results: int = 20) -> List[Dict]:
    """Kanal videolarında arama (API'sız)"""
    return youtube_fallback.search_channel_videos(channel_id, query, max_results)

if __name__ == "__main__":
    # Test
    print("yt-dlp YouTube arama testi...")
    results = search_youtube_videos("tasavvuf", max_results=5)
    print(f"Bulunan video sayısı: {len(results)}")
    for video in results:
        print(f"- {video['title']} ({video['channel']})")