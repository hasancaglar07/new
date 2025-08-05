# pages/03_🔄_Karşılaştırmalı_Analiz.py
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from whoosh.index import open_dir
from whoosh.qparser import MultifieldParser, AndGroup
from collections import Counter
import re
import logging
import sys
import locale

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
locale.setlocale(locale.LC_ALL, 'tr_TR.UTF-8')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

st.set_page_config(
    page_title="Karşılaştırmalı Analiz - Yediulya Kütüphanesi",
    page_icon="🔄",
    layout="wide"
)

from utils import check_authentication

if not check_authentication():
    st.warning("Bu sayfaya erişim için giriş yapmalısınız.")
    st.stop()

st.title("🔄 Karşılaştırmalı Analiz")
st.markdown("---")

try:
    ix = open_dir("whoosh_index")
except Exception as e:
    logger.error(f"Indeks açma hatası: {e}")
    st.error("Veri indeksi yüklenemedi.")
    st.stop()

authors = set()
with ix.searcher() as searcher:
    for doc in searcher.documents():
        authors.add(doc.get("author").title())

col1, col2 = st.columns(2)
with col1:
    author1 = st.selectbox("İlk Üstad", sorted(authors), key="author1")
with col2:
    author2 = st.selectbox("İkinci Üstad", [a for a in sorted(authors) if a != author1], key="author2")

topic = st.text_input("🔍 Karşılaştırmak istediğiniz konuyu girin", placeholder="Örn: Rabıta")

if author1 and author2 and topic:
    with st.spinner("Analiz yapılıyor..."):
        try:
            with ix.searcher() as searcher:
                parser = MultifieldParser(["author", "content"], ix.schema, group=AndGroup)

                q1 = parser.parse(f'author:"{author1.lower()}" AND content:{topic.lower()}')
                results1 = searcher.search(q1, limit=50)

                q2 = parser.parse(f'author:"{author2.lower()}" AND content:{topic.lower()}')
                results2 = searcher.search(q2, limit=50)

                col1, col2 = st.columns(2)

                with col1:
                    st.subheader(f"📚 {author1}")
                    st.metric("Bulunan Alıntı", len(results1))
                    if results1:
                        for hit in results1:
                            with st.expander(f"📄 {hit['book'].title()} - Sayfa {hit['page']}"):
                                st.write(f"_{hit['content']}_")
                    else:
                        st.info("Alıntı bulunamadı.")

                with col2:
                    st.subheader(f"📚 {author2}")
                    st.metric("Bulunan Alıntı", len(results2))
                    if results2:
                        for hit in results2:
                            with st.expander(f"📄 {hit['book'].title()} - Sayfa {hit['page']}"):
                                st.write(f"_{hit['content']}_")
                    else:
                        st.info("Alıntı bulunamadı.")

                if results1 and results2:
                    st.subheader("📊 Karşılaştırmalı İstatistikler")

                    books1 = Counter(hit["book"].title() for hit in results1)
                    books2 = Counter(hit["book"].title() for hit in results2)
                    common_books = set(books1) & set(books2)

                    stat_col1, stat_col2, stat_col3 = st.columns(3)
                    stat_col1.metric("Ortak Kitap Sayısı", len(common_books))
                    stat_col2.metric(f"{author1} Kitap Sayısı", len(books1))
                    stat_col3.metric(f"{author2} Kitap Sayısı", len(books2))

                    if common_books:
                        st.subheader("📚 Ortak Kitaplardaki Alıntı Dağılımı")
                        common_data = [{"Kitap": book, author1: books1.get(book, 0), author2: books2.get(book, 0)} for book in common_books]
                        df_common = pd.DataFrame(common_data)
                        st.dataframe(df_common, use_container_width=True)

                        fig_common = go.Figure()
                        fig_common.add_trace(go.Bar(x=df_common["Kitap"], y=df_common[author1], name=author1))
                        fig_common.add_trace(go.Bar(x=df_common["Kitap"], y=df_common[author2], name=author2))
                        fig_common.update_layout(title="Ortak Kitaplardaki Alıntı Sayıları", barmode='group', hovermode="x unified")
                        st.plotly_chart(fig_common, use_container_width=True)

                    st.subheader("🔤 Kelime Analizi")
                    content1 = " ".join(hit["content"] for hit in results1).lower()
                    words1 = re.findall(r'\b\w+\b', content1)
                    top_words1 = dict(Counter(words1).most_common(10))

                    content2 = " ".join(hit["content"] for hit in results2).lower()
                    words2 = re.findall(r'\b\w+\b', content2)
                    top_words2 = dict(Counter(words2).most_common(10))

                    word_col1, word_col2 = st.columns(2)
                    with word_col1:
                        if top_words1:
                            fig_words1 = px.bar(x=list(top_words1.values()), y=list(top_words1.keys()),
                                                orientation='h', title=f"{author1} - En Çok Kullanılan Kelimeler")
                            st.plotly_chart(fig_words1, use_container_width=True)
                    with word_col2:
                        if top_words2:
                            fig_words2 = px.bar(x=list(top_words2.values()), y=list(top_words2.keys()),
                                                orientation='h', title=f"{author2} - En Çok Kullanılan Kelimeler")
                            st.plotly_chart(fig_words2, use_container_width=True)
                elif not results1 and not results2:
                    st.warning("Her iki üstatta da alıntı bulunamadı.")
        except Exception as e:
            logger.error(f"Analiz hatası: {e}")
            st.error("Analiz sırasında hata oluştu.")

st.markdown("---")
st.info("🔄 Farklı üstatların görüşlerini karşılaştırın. Geri bildirim bekliyoruz!")