# pages/home.py
import streamlit as st
import os
from dotenv import load_dotenv
import requests
import logging
import re
from whoosh.index import open_dir
from whoosh.qparser import MultifieldParser, AndGroup
import fitz # PyMuPDF
from streamlit_mic_recorder import speech_to_text
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from collections import defaultdict

# --- 1. GEREKLİ KURULUMLAR ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
load_dotenv()
st.set_page_config(page_title="Yediulya Kütüphanesi - Ana Sayfa", page_icon="🕌", layout="wide")

# --- 2. GÜVENİLİR SESSION STATE YÖNETİMİ ---
def init_session_state():
    defaults = {
        'show_dialog': False, 'dialog_data': None, 'dialog_page_num': 1,
        'home_book_results': [], 'home_video_results': [], 'last_home_query': "",
        'selected_authors': [], 'results_shown': 24,
        'youtube_error': None,
        'query_input': "",
        'spoken_text': None
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value
init_session_state()

if st.session_state.spoken_text:
    st.session_state.query_input = st.session_state.spoken_text
    st.session_state.spoken_text = None # Tek seferlik kullanım için temizle

# --- 3. PERFORMANS ODAKLI VE YARDIMCI FONKSİYONLAR ---

@st.cache_data(ttl=3600, show_spinner="Yazarlar hazırlanıyor...")
def get_all_authors():
    try:
        ix = open_dir("whoosh_index")
        with ix.searcher() as searcher:
            authors = {doc.get("author", "Bilinmeyen").title() for doc in searcher.documents()}
        return sorted(list(authors))
    except Exception as e:
        logger.error(f"Yazarlar alınırken hata oluştu: {e}")
        return []

# --- MOBİL PERFORMANS İYİLEŞTİRMESİ BAŞLANGICI ---

@st.cache_resource(ttl=3600, show_spinner="Kitap önbelleğe alınıyor...")
def get_pdf_document(pdf_path):
    """
    Verilen yoldaki PDF dosyasını bir kereye mahsus açar ve fitz.Document objesini
    önbelleğe alır. Bu, sayfa geçişlerinde dosyanın tekrar tekrar açılmasını önler.
    """
    try:
        if os.path.exists(pdf_path):
            return fitz.open(pdf_path)
        return None
    except Exception as e:
        logger.error(f"PDF dosyası açılamadı ({pdf_path}): {e}")
        return None

@st.cache_data(ttl=3600, show_spinner=False)
def get_page_image_bytes(_doc, page_num):
    """Artık dosya yolu yerine doğrudan önbelleğe alınmış döküman objesi ile çalışır."""
    if _doc is None:
        return None
    try:
        page = _doc.load_page(page_num - 1)
        pix = page.get_pixmap(dpi=150)
        return pix.tobytes("jpeg")
    except Exception as e:
        logger.error(f"Sayfa resmi oluşturulamadı (page: {page_num}): {e}")
        return None

@st.cache_data(ttl=3600)
def get_pdf_page_count(_doc):
    """Artık dosya yolu yerine doğrudan önbelleğe alınmış döküman objesi ile çalışır."""
    if _doc:
        return len(_doc)
    return 0

# --- MOBİL PERFORMANS İYİLEŞTİRMESİ SONU ---

def get_youtube_api_keys():
    keys = [os.getenv(f"YOUTUBE_API_KEY{i}") for i in range(1, 7) if os.getenv(f"YOUTUBE_API_KEY{i}")]
    return [key for key in keys if key]

def highlight_text(text, query):
    if not query or not text:
        return text
    try:
        pattern = re.compile(re.escape(query), re.IGNORECASE)
        return pattern.sub(lambda match: f"<mark>{match.group(0)}</mark>", text)
    except re.error:
        return text

def format_youtube_date(date_string):
    if not date_string:
        return ""
    try:
        dt = datetime.fromisoformat(date_string.replace('Z', '+00:00'))
        aylar = {1: "Ocak", 2: "Şubat", 3: "Mart", 4: "Nisan", 5: "Mayıs", 6: "Haziran", 7: "Temmuz", 8: "Ağustos", 9: "Eylül", 10: "Ekim", 11: "Kasım", 12: "Aralık"}
        return f"📅 {dt.day} {aylar[dt.month]} {dt.year}"
    except:
        return ""

def get_author_color(author):
    colors = [
        '#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#059669',
        '#047857', '#065F46', '#064E3B', '#D1FAE5', '#ECFDF5',
        '#6B7280', '#9CA3AF'
    ]
    hash_value = sum(ord(c) for c in author) % len(colors)
    return colors[hash_value]

def get_api_response(endpoint, params, api_keys):
    for key_index, key in enumerate(api_keys):
        local_params = params.copy()
        local_params['key'] = key
        try:
            resp = requests.get(f"https://www.googleapis.com/youtube/v3/{endpoint}", params=local_params, timeout=7)
            if resp.status_code == 200:
                return resp.json()
            elif resp.status_code == 403:
                logger.info(f"Key {key_index + 1} quota exceeded or forbidden.")
                continue
            else:
                logger.error(f"API response status: {resp.status_code}")
                continue
        except Exception as e:
            logger.error(f"API call error with key {key_index + 1}: {e}")
            continue
    raise ValueError("All API keys failed.")

@st.cache_data(ttl=604800, show_spinner="YouTube videoları yükleniyor...")
def fetch_all_channel_videos():
    tagged_channels = {"Kalemdar_Alemdar": "UCvhlPtV-1MgZBQPmGjomhsA", "yediulyaa": "UCfYG6Ij2vIJXXplpottv02Q", "kutbucihan": "UC0FN4XBgk2Isvv1QmrbFn8w"}
    api_keys = get_youtube_api_keys()
    if not api_keys:
        return []
    all_items = []
    for channel_name, channel_id in tagged_channels.items():
        params = {"part": "contentDetails", "id": channel_id}
        try:
            channel_data = get_api_response("channels", params, api_keys)
            uploads_id = channel_data['items'][0]['contentDetails']['relatedPlaylists']['uploads']
        except Exception as e:
            logger.error(f"Failed to get uploads playlist for channel {channel_id}: {e}")
            continue
        next_page = ""
        while next_page is not None:
            params = {"part": "snippet", "playlistId": uploads_id, "maxResults": 50, "pageToken": next_page if next_page else ""}
            try:
                data = get_api_response("playlistItems", params, api_keys)
                all_items.extend(data['items'])
                next_page = data.get('nextPageToken')
            except Exception as e:
                logger.error(f"Failed to fetch playlist items for {uploads_id}: {e}")
                break
    return all_items

# --- 4. CALLBACK FONKSİYONLARI ---
def close_book_dialog():
    st.session_state.show_dialog = False
    st.session_state.dialog_data = None
    st.rerun()

def open_book_dialog(item):
    st.session_state.dialog_data = item
    st.session_state.dialog_page_num = int(item['Sayfa'])
    st.session_state.show_dialog = True
    st.rerun()

def load_more_results():
    st.session_state.results_shown += 12

def clear_search():
    st.session_state.query_input = ""
    st.session_state.last_home_query = ""
    st.session_state.home_book_results = []
    st.session_state.home_video_results = []
    st.session_state.selected_authors = []
    st.session_state.youtube_error = None

# --- 5. STABİL DİYALOG PENCERESİ (PERFORMANSI İYİLEŞTİRİLDİ) ---
@st.dialog("📖 Kitap Okuyucu")
def render_book_dialog():
    item = st.session_state.dialog_data
    if item is None:
        close_book_dialog()
        return

    pdf_path = os.path.join("pdfler", item["PDF File"])

    # 1. PDF dökümanını cache'den al (eğer yoksa oluştur ve cache'le)
    doc = get_pdf_document(pdf_path)

    if doc is None:
        st.error("Kitap dosyası bulunamadı veya açılamadı.")
        st.button("Kapat", on_click=close_book_dialog, use_container_width=True)
        return

    # 2. Toplam sayfa sayısını döküman objesinden al
    total_pages = get_pdf_page_count(doc)

    st.subheader(f"{item['Kitap']}")
    st.caption(f"✍️ Yazar: {item['Yazar/Şahsiyet']}")
    st.divider()

    current_page = st.session_state.dialog_page_num

    nav_cols = st.columns([1, 1, 3, 1, 1])
    if nav_cols[0].button("⬅️", use_container_width=True, disabled=(current_page <= 1)):
        st.session_state.dialog_page_num -= 1
        st.rerun()
    if nav_cols[4].button("➡️", use_container_width=True, disabled=(current_page >= total_pages)):
        st.session_state.dialog_page_num += 1
        st.rerun()
    with nav_cols[2]:
        new_page = st.number_input("Sayfa", 1, total_pages, current_page, label_visibility="collapsed")
        if new_page != current_page:
            st.session_state.dialog_page_num = new_page
            st.rerun()

    # 3. Sayfa resmini yine döküman objesinden al (çok daha hızlı)
    img_bytes = get_page_image_bytes(doc, st.session_state.dialog_page_num)

    if img_bytes:
        st.image(img_bytes, use_container_width=True)
        st.caption(f"📄 Sayfa {st.session_state.dialog_page_num} / {total_pages}")
        st.divider()
        dl_col, close_col = st.columns(2)
        dl_col.download_button("📄 Sayfayı İndir", img_bytes, "sayfa.jpeg", "image/jpeg", use_container_width=True)
        close_col.button("Kapat", on_click=close_book_dialog, use_container_width=True)
    else:
        st.error("Sayfa yüklenemedi.")

# --- 6. "PLATINUM" ARAYÜZ ve CSS ---
st.markdown("""
<style>
    /* ... CSS kodunuzda bir değişiklik yok, olduğu gibi kalabilir ... */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@700&display=swap');
    :root {
        --primary-color: #10B981; /* Emerald green */
        --accent-color: #34D399; /* Lighter green */
        --background-color: #F9FAFB;
        --text-color: #1F2937;
        --muted-color: #6B7280;
        --card-bg: #FFFFFF;
        --card-border: #F3F4F6;
        --highlight-bg: #D1FAE5; /* Soft green highlight */
        --highlight-text: #065F46; /* Darker green text */
    }
    .appview-container .main .block-container:first-child { margin-top: -2rem; padding-top: 2rem; max-width: 1280px; margin-left: auto; margin-right: auto; }
    body { font-family: 'Inter', sans-serif; background-color: var(--background-color); color: var(--text-color); line-height: 1.6; }
    .bismillah { text-align: center; font-family: 'Amiri', serif; font-size: 3rem !important ; color: var(--primary-color); margin-bottom: 1rem; opacity: 0.9; }
    @media (max-width: 768px) {
        .bismillah { font-size: 3rem; !important }
    }
    .main-title { text-align: center; font-size: 2.5rem; font-weight: 600; color: var(--primary-color); margin-top: 0; margin-bottom: 0.5rem; }
    .hero-subtitle { text-align: center; font-size: 1.1rem; color: var(--muted-color); margin-bottom: 2rem; font-weight: 400; }
    .search-container { max-width: 800px; margin: 0 auto 2rem auto; }
    .results-header { text-align: center; margin-bottom: 1.5rem; padding: 0.75rem 1.5rem; background-color: rgba(255,255,255,0.8); border-radius: 9999px; font-size: 0.95rem; color: var(--muted-color); box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .item-card {
        background: var(--card-bg); border-radius: 20px; border: 1px solid var(--card-border);
        overflow: hidden; transition: transform 0.3s ease, box-shadow 0.3s ease;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .item-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
    .card-content { padding: 1.5rem; }
    .card-header h4 { margin: 0 0 0.5rem 0; font-size: 1.1rem; font-weight: 600; color: var(--text-color); }
    .author-badge { color: #FFFFFF; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 500; display: inline-block; margin-bottom: 0.75rem; }
    .card-meta { font-size: 0.85rem; line-height: 1.4; color: var(--muted-color); margin-top: 1rem; }
    .excerpt { font-size: 0.95rem; line-height: 1.6; color: var(--muted-color); margin-top: 0.5rem; }
    .excerpt mark { background: var(--highlight-bg); color: var(--highlight-text); border-radius: 4px; padding: 0 0.25rem; }
    .empty-state { text-align: center; padding: 3rem; max-width: 600px; margin: 2rem auto; background: var(--card-bg); border-radius: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .stButton > button { background-color: var(--primary-color); color: white; border-radius: 9999px; padding: 0.75rem 1.5rem; font-weight: 500; transition: all 0.3s ease; width: 100%; border: none; }
    .stButton > button:hover { background-color: var(--accent-color); }
    .stTabs [data-testid="stTab"] { font-weight: 500; padding: 1rem 2rem; }
    .stExpander { border: none; box-shadow: none; margin-top: 0.5rem; }
    .stTextInput > div > div > input { border-radius: 9999px; border: 1px solid var(--card-border); padding: 1rem 1.5rem; font-size: 1rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .stMultiselect { border-radius: 9999px; border: 1px solid var(--card-border); }
</style>
""", unsafe_allow_html=True)

# --- 7. ANA SAYFA AKIŞI ---
st.markdown('<p class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>', unsafe_allow_html=True)
st.markdown('<h1 class="main-title">Yediulya E-Kütüphanesi</h1>', unsafe_allow_html=True)
st.markdown('<p class="hero-subtitle">Üstadlarımızın kitaplarında ve sohbetlerinde derinlemesine arama yapın.</p>', unsafe_allow_html=True)

ALL_AUTHORS = get_all_authors()

with st.container():
    st.markdown('<div class="search-container">', unsafe_allow_html=True)
    query_col, mic_col = st.columns([9, 1])
    with query_col:
        query = st.text_input("Arama Kutusu", placeholder="Arama yapın: rabıta, zikir, nefs...", label_visibility="collapsed", key="query_input")
    with mic_col:
        text = speech_to_text(language='tr-TR', start_prompt="🎤", stop_prompt="🛑", use_container_width=True, just_once=True)
        if text:
            st.session_state.spoken_text = text
            st.rerun()
    with st.expander("Filtreler"):
        st.session_state.selected_authors = st.multiselect("Yazar Filtresi", options=ALL_AUTHORS, default=st.session_state.selected_authors, label_visibility="collapsed", placeholder="Yazar seçin")
    search_button = st.button("🔍 Ara", type="primary", use_container_width=True)
    st.markdown('</div>', unsafe_allow_html=True)

# --- ARAMA ve VERİ ÇEKME MANTIĞI ---
if search_button and query.strip():
    st.session_state.last_home_query = query
    st.session_state.results_shown = 12
    st.session_state.youtube_error = None
    if st.session_state.show_dialog:
        st.session_state.show_dialog = False

    def search_books(q, authors):
        ix = open_dir("whoosh_index")
        with ix.searcher() as searcher:
            parser = MultifieldParser(["content", "author"], schema=ix.schema, group=AndGroup)
            query_parts = [f"content:({q.lower()})"]
            if authors:
                author_queries = ' OR '.join([f'author:"{a.lower()}"' for a in authors])
                query_parts.append(f"({author_queries})")
            parsed_q = parser.parse(" AND ".join(query_parts))
            results = searcher.search(parsed_q, limit=980)
            data = [{"Kitap": h["book"].title(), "Yazar/Şahsiyet": h["author"].title(), "Sayfa": h["page"], "Tam Metin (Alıntı)": h.highlights("content"), "PDF File": h["pdf_file"]} for h in results]
            return data

    def search_videos(q, max_results_per_channel=50):
        all_items = fetch_all_channel_videos()
        if not all_items:
            return [], "Videolar yüklenemedi, API sorunu olabilir."
        ql = q.lower()
        matching = []
        for item in all_items:
            sn = item['snippet']
            if ql in sn['title'].lower() or ql in sn['description'].lower():
                video_item = {
                    'id': {'videoId': sn['resourceId']['videoId']},
                    'snippet': {
                        'title': sn['title'],
                        'publishedAt': sn['publishedAt'],
                        'channelTitle': sn['channelTitle']
                    }
                }
                matching.append(video_item)
        matching.sort(key=lambda x: x['snippet']['publishedAt'], reverse=True)
        by_channel = defaultdict(list)
        for m in matching:
            by_channel[m['snippet']['channelTitle']].append(m)
        result = []
        for ch_list in by_channel.values():
            result.extend(ch_list[:max_results_per_channel])
        return result, None

    with st.spinner("Arama yapılıyor..."):
        with ThreadPoolExecutor(max_workers=2) as executor:
            future_books = executor.submit(search_books, query, st.session_state.selected_authors)
            future_videos = executor.submit(search_videos, query)
            st.session_state.home_book_results = future_books.result()
            st.session_state.home_video_results, st.session_state.youtube_error = future_videos.result()
    st.rerun()

# --- 8. SONUÇLARIN GÖSTERİMİ (PERFORMANSI İYİLEŞTİRİLDİ) ---
if st.session_state.get('show_dialog', False):
    render_book_dialog()

if st.session_state.last_home_query:
    book_results = st.session_state.home_book_results
    video_results = st.session_state.home_video_results
    query = st.session_state.last_home_query

    if not book_results and not video_results:
        st.markdown(f'<div class="empty-state"><h3>❌ Sonuç bulunamadı</h3><p>Başka bir arama terimi deneyin.</p></div>', unsafe_allow_html=True)
    else:
        st.markdown(f'<div class="results-header">🔎 Arama: "{query}"</div>', unsafe_allow_html=True)
        book_count = len(book_results)
        video_count = len(video_results)
        tab_books, tab_videos = st.tabs([f"📚 Kitaplar ({book_count})", f"🎥 Videolar ({video_count})"])

        with tab_books:
            if not book_results:
                st.info("Bu arama için kitap sonucu bulunamadı.")
            else:
                visible_books = book_results[:st.session_state.results_shown]
                for i in range(0, len(visible_books), 3):
                    cols = st.columns(3, gap="medium")
                    for j, item in enumerate(visible_books[i:i+3]):
                        with cols[j]:
                            author_color = get_author_color(item['Yazar/Şahsiyet'])
                            st.markdown(f'<div class="item-card">', unsafe_allow_html=True)
                            excerpt_html = highlight_text(item['Tam Metin (Alıntı)'], query)
                            st.markdown(f"""
                            <div class="card-content">
                                <div class="card-header">
                                    <h4>{item['Kitap']}</h4>
                                    <span class="author-badge" style="background-color: {author_color};">{item['Yazar/Şahsiyet']}</span>
                                </div>
                                <p class="excerpt">{excerpt_html}...</p>
                                <div class="card-meta">
                                    📄 Sayfa: {item['Sayfa']}
                                </div>
                            </div>
                            """, unsafe_allow_html=True)

                            pdf_path = os.path.join("pdfler", item["PDF File"])
                            if os.path.exists(pdf_path):
                                with st.expander("📸 Sayfa Görüntüsü"):
                                    # Önbelleğe alınmış dökümanı kullan
                                    doc = get_pdf_document(pdf_path)
                                    if doc:
                                        img_bytes = get_page_image_bytes(doc, item["Sayfa"])
                                        if img_bytes:
                                            st.image(img_bytes, use_container_width=True)
                                        else:
                                            st.warning("Sayfa resmi yüklenemedi.")

                            if os.path.exists(pdf_path):
                                st.button("📖 Oku", key=f"read_book_{i}_{j}", on_click=open_book_dialog, args=(item,), use_container_width=True)
                            st.markdown('</div>', unsafe_allow_html=True)

                if len(book_results) > st.session_state.results_shown:
                    st.button("⬇️ Daha Fazla", on_click=load_more_results, use_container_width=True)

        with tab_videos:
            if st.session_state.youtube_error:
                st.warning(f"⚠️ {st.session_state.youtube_error}")
            if not video_results:
                st.info("Bu arama için video sonucu bulunamadı.")
            else:
                for i in range(0, len(video_results), 3):
                    cols = st.columns(3, gap="medium")
                    for j, video in enumerate(video_results[i:i+3]):
                        with cols[j]:
                            snippet = video['snippet']
                            video_id = video['id']['videoId']
                            st.markdown(f'<div class="item-card">', unsafe_allow_html=True)
                            st.video(f"https://www.youtube.com/watch?v={video_id}")
                            st.markdown(f"""
                            <div class="card-content">
                                <div class="card-header"><h4>{snippet['title']}</h4></div>
                                <div class="card-meta">
                                    🎙️ {snippet['channelTitle']} • {format_youtube_date(snippet['publishedAt'])}
                                </div>
                            </div>
                            """, unsafe_allow_html=True)
                            st.markdown('</div>', unsafe_allow_html=True)