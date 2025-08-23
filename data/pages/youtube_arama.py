# pages/youtube_arama.py
import streamlit as st
import os
from dotenv import load_dotenv
import requests
import logging
import tempfile
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import sys
sys.path.append('..')
from youtube_search_fallback import search_youtube_videos, search_channel_videos

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

st.set_page_config(page_title="YouTube Arama - Yediulya Kütüphanesi", page_icon="📹", layout="wide")

st.markdown('<div class="main-container">', unsafe_allow_html=True)

# YouTube API Keys
def get_youtube_api_keys():
    keys = []
    for i in range(1, 6):
        key = os.getenv(f"YOUTUBE_API_KEY{i}")
        if key:
            keys.append(key)
    fallback = os.getenv("YOUTUBE_API_KEY")
    if fallback and fallback not in keys:
        keys.insert(0, fallback)
    return keys

YOUTUBE_API_KEYS = get_youtube_api_keys()

if not YOUTUBE_API_KEYS:
    st.error("❌ YouTube API anahtarı bulunamadı. Lütfen `.env` dosyasına `YOUTUBE_API_KEY` veya `YOUTUBE_API_KEY1=...` ekleyin.")
    st.stop()

# Channels
tagged_channels = {
    "Kalemdar_Alemdar": "UCvhlPtV-1MgZBQPmGjomhsA",
    "yediulyaa": "UCfYG6Ij2vIJXXplpottv02Q",
    "didarakademi": "UC9Jt0jM08o7aXSHz0Kni7Uw",
    "kutbucihan": "UC0FN4XBgk2Isvv1QmrbFn8w",
}

# YouTube Search Functions
def analyze_video(video_data):
    video_id = video_data["id"]["videoId"]
    title = video_data["snippet"]["title"]
    description = video_data["snippet"]["description"]
    return video_id, {"title": title, "description": description}

st.markdown("""
<div class="header">
    <h1>📹 Tasavvufi YouTube Video Arama</h1>
    <p>Tüm kanallarda arama yapın, tasavvufi videoları hızlıca keşfedin.</p>
</div>
""", unsafe_allow_html=True)

st.markdown('<div class="search-row">', unsafe_allow_html=True)
col1, col2, col3 = st.columns([3, 1.5, 1])
with col1:
    query = st.text_input("", placeholder="Tasavvufi konu girin (ör. rabıta, zikir)", key="search_query", label_visibility="collapsed")
with col2:
    selected_channel = st.selectbox("", ["Tüm Kanallar"] + list(tagged_channels.keys()), key="channel_select", label_visibility="collapsed")
with col3:
    search_button = st.button("🔍 Ara", key="search_button", use_container_width=True, type="primary")
st.markdown('</div>', unsafe_allow_html=True)

if search_button:
    if not query.strip():
        st.warning("⚠️ Lütfen bir arama kelimesi girin.")
    else:
        with st.spinner("🔍 Videolar alınıyor..."):
            all_items = {}
            total_found = 0
            used_key = None
            api_quota_exceeded = False

            if selected_channel == "Tüm Kanallar":
                channels_to_search = tagged_channels.items()
            else:
                channels_to_search = [(selected_channel, tagged_channels[selected_channel])]

            # Önce YouTube API'yi dene
            if YOUTUBE_API_KEYS:
                for api_key in YOUTUBE_API_KEYS:
                    try:
                        for channel_name, channel_id in channels_to_search:
                            if channel_name in all_items:
                                continue
                            url = "https://www.googleapis.com/youtube/v3/search"
                            params = {
                                "part": "snippet",
                                "q": query,
                                "type": "video",
                                "maxResults": 8,
                                "key": api_key,
                                "channelId": channel_id
                            }
                            response = requests.get(url, params=params, timeout=10)
                            if response.status_code == 200:
                                data = response.json()
                                videos = data.get("items", [])
                                all_items[channel_name] = videos
                                total_found += len(videos)
                                used_key = api_key
                            elif response.status_code == 403:
                                error = response.json().get("error", {}).get("errors", [{}])[0].get("reason", "")
                                if error == "quotaExceeded":
                                    api_quota_exceeded = True
                                    break
                        if used_key or api_quota_exceeded:
                            break
                    except Exception as e:
                        continue
                    if api_quota_exceeded:
                        break

            # API kota dolmuşsa veya sonuç yoksa yt-dlp fallback kullan
            if total_found == 0 or api_quota_exceeded:
                if api_quota_exceeded:
                    st.warning("⚠️ YouTube API kota limiti doldu. Alternatif arama sistemi kullanılıyor...")
                
                try:
                    # yt-dlp fallback sistemi
                    for channel_name, channel_id in channels_to_search:
                        if channel_name in all_items:
                            continue
                        
                        fallback_videos = search_channel_videos(channel_id, query, max_results=8)
                        
                        # yt-dlp formatını YouTube API formatına çevir
                        api_format_videos = []
                        for video in fallback_videos:
                            api_format_videos.append({
                                "id": {"videoId": video["id"]},
                                "snippet": {
                                    "title": video["title"],
                                    "description": video["description"],
                                    "thumbnails": {"high": {"url": video["thumbnail"]}},
                                    "channelTitle": video["channel"],
                                    "publishedAt": video["upload_date"]
                                }
                            })
                        
                        all_items[channel_name] = api_format_videos
                        total_found += len(api_format_videos)
                        
                except Exception as e:
                    logger.error(f"yt-dlp fallback hatası: {e}")

            if total_found == 0:
                st.error("""
                    ❌ Hiçbir video bulunamadı.  
                    Lütfen arama teriminizi değiştirip tekrar deneyin.  
                    Lütfen birkaç saat sonra tekrar deneyin.
                """)
            else:
                st.success(f"🎉 Toplamda **{total_found}** video bulundu.")

                all_videos = []
                for channel_name, videos in all_items.items():
                    for video in videos:
                        video["channel_name"] = channel_name
                        all_videos.append(video)

                for channel_name, videos in all_items.items():
                    if not videos:
                        continue
                    st.markdown(f'<div class="channel-header">📹 {channel_name}</div>', unsafe_allow_html=True)
                    st.markdown('<div class="video-grid">', unsafe_allow_html=True)
                    cols = st.columns(3)
                    for idx, item in enumerate(videos):
                        with cols[idx % 3]:
                            video_id = item["id"]["videoId"]
                            title = item["snippet"]["title"]
                            description = item["snippet"]["description"]

                            st.markdown(f"""
                            <div class="video-card">
                                <div class="video-embed">
                                    <iframe src="https://www.youtube.com/embed/{video_id}" frameborder="0" allowfullscreen></iframe>
                                </div>
                                <p class="video-title">{title}</p>
                                <p class="video-desc">{description[:150]}...</p>
                            </div>
                            """, unsafe_allow_html=True)
                    st.markdown('</div>', unsafe_allow_html=True)

st.markdown("""
<div class="footer">
    © 2025 Yediulya Kütüphanesi | Tasavvufi videoları keşfedin. Geri bildirimlerinizi bekliyoruz!
</div>
""", unsafe_allow_html=True)
st.markdown('</div>', unsafe_allow_html=True)