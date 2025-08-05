# pages/veri_arama.py
import random
import os
import streamlit as st
from dotenv import load_dotenv
import sys
import locale
import openai
import uuid
import datetime
import traceback
import time
import fitz
from db import get_all_qa, save_qa

# Gerekli Whoosh modüllerini doğru yerden import etme
from whoosh.index import open_dir, EmptyIndexError
from whoosh.fields import Schema, TEXT, NUMERIC
from whoosh.analysis import StandardAnalyzer
from whoosh.qparser import MultifieldParser, AndGroup

# Encoding fix
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
locale.setlocale(locale.LC_ALL, 'tr_TR.UTF-8')
load_dotenv()

# --- UYGULAMA AYARLARI ---
st.set_page_config(page_title="Veri Arama - Yediulya Kütüphanesi", page_icon="🕌", layout="wide")

# Bismillah ve Başlık
st.markdown('<div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>', unsafe_allow_html=True)
st.markdown('<h1 class="main-title">🕌 Yediulya Kütüphanesi Veri Arama</h1>', unsafe_allow_html=True)

# --- STATİK VERİLER ---
LOADING_MESSAGES = [
    "İlm-i Ledün madenini kazıyoruz... 📜", "Manevi detaylar derleniyor... 🌿",
    "Alıntılar tasnif ediliyor... 🕌", "İrfan sentezi hazırlanıyor... ✨"
]
ORNEK_SORULAR = [
    "Rabıta nedir?", "Zikrullahın önemi?", "Mürşid-i Kamil özellikleri?",
    "Tevekkülün anlamı?", "İhlas nedir?"
]
# Whoosh şemasını burada tanımla
schema = Schema(
    book=TEXT(stored=True),
    author=TEXT(stored=True),
    page=NUMERIC(stored=True),
    content=TEXT(stored=True, analyzer=StandardAnalyzer()),
    pdf_file=TEXT(stored=True)
)


# --- PERFORMANS İYİLEŞTİRMESİ: LAZY LOADING ---
@st.cache_resource(show_spinner="Veri havuzu ve modeller yükleniyor. Bu işlem ilk açılışta biraz zaman alabilir...")
def load_resources():
    from langchain_community.embeddings import HuggingFaceEmbeddings
    from langchain_community.vectorstores import FAISS

    # Whoosh indeksini aç
    try:
        ix = open_dir("whoosh_index")
    except EmptyIndexError:
        st.error("Whoosh indeksi boş veya bulunamadı.")
        st.stop()
    
    # Embedding modelini yükle
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    
    # FAISS vektör deposunu yükle
    try:
        vectorstore = FAISS.load_local("faiss_index", embeddings, allow_dangerous_deserialization=True)
    except Exception as e:
        st.error(f"FAISS indeksi yüklenemedi: {e}.")
        st.stop()
    
    # Yazarları Whoosh'tan verimli bir şekilde al
    authors = set()
    with ix.searcher() as searcher:
        reader = searcher.reader()
        for author_name in reader.lexicon("author"):
            authors.add(author_name.decode('utf-8').title())

    return vectorstore, ix, sorted(list(authors))

# Kaynakları yükle
vectorstore, ix, authors = load_resources()

# --- YARDIMCI FONKSİYONLAR ---
def highlight_query(text, query):
    if not query: return text
    for word in query.split():
        text = text.replace(word, f'<mark>{word}</mark>')
    return text

def show_page_image(pdf_path, page_num):
    try:
        doc = fitz.open(pdf_path)
        page = doc.load_page(page_num - 1)
        pix = page.get_pixmap(dpi=100)
        img_bytes = pix.tobytes("png")
        st.image(img_bytes, use_container_width=True, caption=f"Sayfa {page_num} Önizlemesi")
        doc.close()
    except Exception as e:
        st.error(f"Sayfa resmi yüklenemedi: {str(e)}")

def display_assistant(message, query=None):
    result_type = message.get("result_type")
    
    if result_type == "Veri Arama":
        data = message.get("data", [])
        if not data:
            st.info("📭 Bu sorgu için sonuç bulunamadı.")
            return

        st.subheader(f"📋 Tam Alıntı Listesi ({len(data)} sonuç)")
        
        cols = st.columns(3)
        for i, item in enumerate(data):
            with cols[i % 3]:
                st.markdown(f"""
                <div class="source-card" style="height: 100%; display: flex; flex-direction: column;">
                    <div style="flex-grow: 1;">
                        <div class="card-header">
                            <h4>{item['Kitap']}</h4>
                            <span class="author-badge">{item['Yazar/Şahsiyet']}</span>
                        </div>
                        <div class="card-content">
                            <p class="page-info">📄 Sayfa: {item['Sayfa']}</p>
                            <p class="excerpt">{highlight_query(item["Tam Metin (Alıntı)"][:200] + "...", query)}</p>
                        </div>
                    </div>
                    <div style="margin-top: 15px;">
                    </div>
                </div>
                """, unsafe_allow_html=True)

                button_key = f"data_goto_{item['PDF File']}_{item['Sayfa']}_{i}"
                if st.button("📖 Kitapta Gör (Okuyucu)", key=button_key, use_container_width=True):
                    st.session_state.go_to_book = {
                        "author": item["Yazar/Şahsiyet"],
                        "book_name": item["Kitap"],
                        "page": item["Sayfa"]
                    }
                    st.switch_page("pages/kitap_oku.py")

                with st.expander("📄 Sayfa Resmini Gör (Önizleme)"):
                    pdf_path = os.path.join("pdfler", item["PDF File"])
                    if os.path.exists(pdf_path):
                        show_page_image(pdf_path, item["Sayfa"])
                    else:
                        st.error("PDF dosyası bulunamadı.")
    
    elif result_type == "AI Sentezi":
        content = message.get("content", "")
        with st.chat_message("assistant"):
            st.markdown(content)

def ask_data_havuzu(question: str, selected_authors, result_type):
    with st.spinner(random.choice(LOADING_MESSAGES)):
        try:
            assistant_message = {"role": "assistant", "result_type": result_type, "unique_id": str(uuid.uuid4())}
            if result_type == "Veri Arama":
                data = []
                with ix.searcher() as searcher:
                    parser = MultifieldParser(["author", "content"], schema=ix.schema, group=AndGroup)
                    query_parts = []
                    if selected_authors:
                        author_query = " OR ".join([f'author:"{a.lower()}"' for a in selected_authors])
                        query_parts.append(f"({author_query})")
                    if question:
                        query_parts.append(f'content:{question.lower()}')
                    
                    full_query_str = " AND ".join(query_parts) if query_parts else "*"
                    q = parser.parse(full_query_str)
                    results = searcher.search(q, limit=100)
                    seen = set()
                    for hit in results:
                        unique_key = f"{hit['book']}_{hit['page']}_{hit['content'][:50]}"
                        if unique_key not in seen:
                            seen.add(unique_key)
                            data.append({
                                "Kitap": hit["book"].title(),
                                "Yazar/Şahsiyet": hit["author"].title(),
                                "Sayfa": hit["page"],
                                "Tam Metin (Alıntı)": hit["content"],
                                "PDF File": hit["pdf_file"]
                            })
                if question:
                    query_lower = question.lower()
                    data = sorted(data, key=lambda x: x["Tam Metin (Alıntı)"].lower().count(query_lower), reverse=True)
                assistant_message["data"] = data
            elif result_type == "AI Sentezi":
                # AI Sentezi mantığı burada kalabilir
                assistant_message["content"] = "AI Sentezi özelliği şu an geliştirme aşamasındadır."

            st.session_state.messages.append(assistant_message)
            
        except Exception as e:
            st.error(f"❌ Hata oluştu: {str(e)}.")
            st.expander("🔧 Hata Detayı").code(traceback.format_exc())

# --- UYGULAMA AKIŞI ---
if "messages" not in st.session_state:
    st.session_state.messages = [{"role": "assistant", "content": "👋 Hoş geldiniz! Lütfen bir sorgu girin veya örnek sorulardan birini seçin."}]

st.markdown("---")
with st.expander("🔍 Filtreler ve Seçenekler", expanded=True):
    col1, col2, col3 = st.columns([3, 2, 2])
    with col1:
        selected_authors_inline = st.multiselect("Üstadlar", authors, placeholder="Filtrelemek için mürşid(ler) seçin...")
    with col2:
        result_type_inline = st.radio("🎯 Sonuç Türü", ["Veri Arama", "AI Sentezi"], horizontal=True)
    with col3:
        with st.popover("💡 Örnek Sorular"):
            st.markdown("**Hızlı Başlangıç İçin Tıklayın:**")
            for soru in ORNEK_SORULAR:
                if st.button(soru, key=f"ornek_soru_{soru}", use_container_width=True):
                    st.session_state.chat_input_value = soru
                    # Butona tıklandığında rerun ederek input'u işlemesini sağlıyoruz
                    st.rerun()

# Chat Input için state yönetimi
if 'chat_input_value' not in st.session_state:
    st.session_state.chat_input_value = ""

# Örnek soru butonundan gelen değeri al
prompt = st.chat_input("💭 Sorgunuzu buraya yazın (ör. rabıta)...", key="main_chat_input")
if st.session_state.chat_input_value:
    prompt = st.session_state.chat_input_value
    st.session_state.chat_input_value = "" # Değeri kullandıktan sonra temizle

# Mesajları Görüntüle
main_area = st.container()
with main_area:
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            if msg["role"] == "user":
                st.markdown(msg["content"])
            else:
                # Kullanıcı sorgusunu bulmak için geriye doğru arama yap
                query_content = ""
                current_messages = st.session_state.messages
                msg_index = current_messages.index(msg)
                for i in range(msg_index - 1, -1, -1):
                    if current_messages[i]['role'] == 'user':
                        query_content = current_messages[i]['content']
                        break
                display_assistant(msg, query=query_content)

# Sorgu işleme
if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    ask_data_havuzu(prompt, selected_authors_inline, result_type_inline)
    st.rerun()

st.markdown('<div class="footer">© 2025 Yediulya Kütüphanesi</div>', unsafe_allow_html=True)