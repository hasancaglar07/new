# pages/video_bolumleyici.py
import streamlit as st
import os
import re
import openai
import logging
import tempfile
import sys
import subprocess
import json
import yt_dlp
from deepgram import DeepgramClient, PrerecordedOptions, FileSource

# Logging ve Sayfa Yapılandırması
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
st.set_page_config(page_title="Video Bölümleyici - Yediulya Kütüphanesi", page_icon="🎬", layout="wide")

st.markdown('<h1 class="main-title">🎬 YouTube Video İçerik Analizi</h1>', unsafe_allow_html=True)
st.markdown('<p class="hero-subtitle">Bir YouTube videosundaki konuşmaları analiz ederek önemli konu başlıklarını ve zaman damgalarını çıkarın.</p>', unsafe_allow_html=True)
st.markdown("---")

# API İstemcileri
try:
    deepseek_client = openai.OpenAI(base_url="https://api.deepseek.com", api_key=os.getenv("DEEPSEEK_API_KEY"))
    DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
    if not DEEPGRAM_API_KEY:
        st.error("Lütfen .env dosyanıza DEEPGRAM_API_KEY ekleyin.")
        st.stop()
    deepgram_client = DeepgramClient(DEEPGRAM_API_KEY)
except Exception as e:
    st.error(f"API istemcileri başlatılamadı. Hata: {e}")
    st.stop()

# --- GEÇMİŞ VERİSİ YÖNETİMİ ---
HISTORY_FILE = "video_analiz_gecmisi.json"

def load_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            try: return json.load(f)
            except json.JSONDecodeError: return {}
    return {}

def save_history(data):
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

# --- YARDIMCI FONKSİYONLAR ---
@st.cache_data
def get_video_metadata(url):
    ydl_opts = {'quiet': True, 'skip_download': True, 'no_warnings': True}
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return {"title": info.get('title', 'Başlık Alınamadı'), "thumbnail": info.get('thumbnail', '')}
    except Exception as e:
        logger.error(f"Meta veri alınırken hata: {e}")
        return {"title": "Başlık Alınamadı", "thumbnail": ""}

def extract_video_id(youtube_url):
    patterns = [r'watch\?v=([a-zA-Z0-9_-]{11})', r'youtu\.be\/([a-zA-Z0-9_-]{11})', r'embed\/([a-zA-Z0-9_-]{11})']
    for pattern in patterns:
        match = re.search(pattern, youtube_url)
        if match: return match.group(1)
    return None

def format_time(seconds):
    minutes, seconds = divmod(int(seconds), 60)
    hours, minutes = divmod(minutes, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

# --- TRANSKRİPSİYON ---
@st.cache_data(show_spinner="Video sesi hazırlanıyor...")
def transcribe_with_deepgram(youtube_url):
    audio_file_path = None
    try:
        executable_name = "yt-dlp.exe" if sys.platform == "win32" else "yt-dlp"
        scripts_dir = os.path.dirname(sys.executable)
        YTDLP_EXE_PATH = os.path.join(scripts_dir, executable_name)
        if not os.path.exists(YTDLP_EXE_PATH):
             raise FileNotFoundError(f"{executable_name} bulunamadı: {YTDLP_EXE_PATH}")

        temp_dir = tempfile.gettempdir()
        video_id = extract_video_id(youtube_url) or "default_audio"
        temp_filename = f"audio_{video_id}.m4a"
        audio_file_path = os.path.join(temp_dir, temp_filename)
        cookie_file = "youtube-cookies.txt"
        
        command = [YTDLP_EXE_PATH, '--format', 'bestaudio/best', '-o', audio_file_path, '--quiet']
        if os.path.exists(cookie_file): command.extend(['--cookies', cookie_file])
        command.append(youtube_url)

        result = subprocess.run(command, capture_output=True, text=True, encoding='utf-8', errors='replace', check=False)
        if result.returncode != 0: raise Exception(f"yt-dlp hatası: {result.stderr}")
        if not os.path.exists(audio_file_path) or os.path.getsize(audio_file_path) < 1024: raise Exception("İndirilen ses dosyası boş.")
        
        with open(audio_file_path, "rb") as audio_file: buffer_data = audio_file.read()
        
        payload: FileSource = {'buffer': buffer_data}
        options = PrerecordedOptions(model="nova-2", language="tr", smart_format=True, utterances=True)
        response = deepgram_client.listen.rest.v("1").transcribe_file(payload, options, timeout=300)
        
        transcript = [{'text': utterance.transcript, 'start': utterance.start, 'duration': utterance.end - utterance.start} for utterance in response.results.utterances]
        os.remove(audio_file_path)
        return transcript
    except Exception as e:
        logger.error(f"Transkripsiyon hatası: {e}")
        st.error(f"Transkripsiyon sırasında bir hata oluştu: {e}")
        if audio_file_path and os.path.exists(audio_file_path): os.remove(audio_file_path)
        return None

# --- AI İLE BAŞLIK OLUŞTURMA ---
def generate_chunk_title(text_chunk):
    try:
        system_prompt = "Sana bir video transkriptinden kısa bir metin parçası verilecek. Bu metnin ana konusunu özetleyen, 4-5 kelimelik kısa ve öz bir başlık oluştur. Sadece başlığı yaz."
        response = deepseek_client.chat.completions.create(model="deepseek-chat", messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": text_chunk}], temperature=0.4, max_tokens=50)
        title = response.choices[0].message.content
        return title.strip().replace('"', '')
    except Exception as e:
        logger.error(f"AI başlık oluşturma hatası: {e}")
        return "Başlık Alınamadı"

# --- ARAYÜZ ve ANA MANTIK ---
youtube_link = st.text_input("YouTube Video Linki", placeholder="https://www.youtube.com/watch?v=ornek_video_id")
chunk_duration = st.slider("Bölüm Uzunluğu (saniye)", min_value=60, max_value=300, value=120, step=15)

analysis_history = load_history()

# --- ANALİZ SONUÇLARI İÇİN YER TUTUCU ---
# Bu, analizin sonuçlarını geçmiş bölümünün üstünde göstermemizi sağlar.
results_placeholder = st.container()

# --- ANALİZ BAŞLATMA BUTONU ---
if st.button("🎬 Analizi Başlat", type="primary", use_container_width=True):
    video_id = extract_video_id(youtube_link) if youtube_link else None
    if not video_id:
        st.warning("Lütfen geçerli bir YouTube video linki girin.")
    else:
        if video_id in analysis_history and isinstance(analysis_history.get(video_id), dict):
            with results_placeholder:
                st.success("✅ Bu video daha önce analiz edilmiş. Sonuçlar geçmişten getiriliyor...")
                st.video(youtube_link)
                st.markdown("---")
                st.subheader("Bölümlere Ayrılmış Konu Başlıkları")
                chapters_from_history = analysis_history[video_id].get("chapters", [])
                st.markdown("\n".join(f"- {c}" for c in chapters_from_history))
        else:
            with st.spinner("Video bilgileri alınıyor..."):
                metadata = get_video_metadata(youtube_link)
            
            transcript = transcribe_with_deepgram(youtube_link)
            if transcript:
                with results_placeholder:
                    st.success("Transkript başarıyla elde edildi! Şimdi içerik analiz ediliyor...")
                    st.video(youtube_link)
                    st.markdown("---")
                    st.subheader("Bölümlere Ayrılmış Konu Başlıkları")
                    
                    analysis_results_container = st.empty()
                    all_chapters = []
                    current_chunk, current_duration = [], 0
                    start_time = transcript[0]['start'] if transcript else 0

                    for item in transcript:
                        current_chunk.append(item['text'])
                        current_duration += item.get('duration', 3)
                        if current_duration >= chunk_duration:
                            chunk_text = " ".join(current_chunk)
                            with st.spinner(f"`{format_time(start_time)}` bölümü için konu başlığı oluşturuluyor..."):
                                title = generate_chunk_title(chunk_text)
                            all_chapters.append(f"**{format_time(start_time)}** - {title}")
                            analysis_results_container.markdown("\n".join(f"- {c}" for c in all_chapters))
                            current_chunk, current_duration = [], 0
                            start_time = item['start'] + item.get('duration', 3)
                    
                    if current_chunk:
                        chunk_text = " ".join(current_chunk)
                        with st.spinner(f"`{format_time(start_time)}` bölümü için konu başlığı oluşturuluyor..."):
                            title = generate_chunk_title(chunk_text)
                        all_chapters.append(f"**{format_time(start_time)}** - {title}")
                        analysis_results_container.markdown("\n".join(f"- {c}" for c in all_chapters))
                    
                    st.success("Analiz tamamlandı!")

                analysis_history[video_id] = {"title": metadata["title"], "thumbnail": metadata["thumbnail"], "chapters": all_chapters}
                save_history(analysis_history)
                st.info("Bu analiz sonucu gelecekteki sorgular için kaydedildi.")
            else:
                st.error("Bu video için transkript alınamadı.")

# --- GÖRSEL GEÇMİŞ BÖLÜMÜ (BUTONUN ALTINA TAŞINDI) ---
st.markdown("---")
with st.expander("🖼️ Görsel Analiz Geçmişi", expanded=True):
    if not analysis_history:
        st.info("Henüz analiz edilmiş video bulunmamaktadır.")
    else:
        history_items = list(analysis_history.items())
        
        for i in range(0, len(history_items), 3):
            cols = st.columns(3)
            for j in range(len(cols)):
                item_index = i + j
                if item_index < len(history_items):
                    video_id, data = history_items[item_index]
                    with cols[j]:
                        with st.container(border=True):
                            if isinstance(data, dict):
                                if data.get("thumbnail"):
                                    st.image(data["thumbnail"])
                                st.markdown(f"**{data.get('title', 'Başlık Yok')}**")
                                with st.expander("Bölümleri Gör"):
                                    st.markdown("\n".join(f"- {c}" for c in data.get("chapters", [])))
                                    st.link_button("Videoyu Aç", f"https://www.youtube.com/watch?v={video_id}")
                            else:
                                st.markdown(f"**Eski Kayıt** (Başlık Yok)")
                                st.markdown("\n".join(f"- {c}" for c in data))
                                st.link_button("Videoyu Aç", f"https://www.youtube.com/watch?v={video_id}")