# pages/02_👤_Yazar_Profilleri.py
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from whoosh.index import open_dir
from whoosh.qparser import QueryParser
import logging
import sys
import locale

# Encoding fix for consistency
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
locale.setlocale(locale.LC_ALL, 'tr_TR.UTF-8')

# Logging for error tracking
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Page config
st.set_page_config(
    page_title="Yazar Profilleri - Yediulya Kütüphanesi",
    page_icon="👤",
    layout="wide"
)

# Shared auth check
from utils import check_authentication

if not check_authentication():
    st.warning("Bu sayfaya erişim için giriş yapmalısınız.")
    st.stop()

st.title("👤 Yazar Profilleri")
st.markdown("---")

# Whoosh index with error handling
try:
    ix = open_dir("whoosh_index")
except Exception as e:
    logger.error(f"Whoosh indeksi açma hatası: {e}")
    st.error("Veri indeksi yüklenemedi. Lütfen yöneticiyle iletişime geçin.")
    st.stop()

# Fetch authors efficiently
authors = set()
with ix.searcher() as searcher:
    all_docs = searcher.documents()
    for doc in all_docs:
        authors.add(doc.get("author", "Bilinmeyen").title())

# Author selection with search
selected_author = st.selectbox("Üstad Seçin", sorted(authors), help="Yazar adı girerek filtreleyin.")

if selected_author:
    with st.spinner("Profil yükleniyor..."):
        try:
            with ix.searcher() as searcher:
                parser = QueryParser("author", ix.schema)
                q = parser.parse(f'"{selected_author.lower()}"')  # Exact match for efficiency
                results = searcher.search(q, limit=1000)

                books = {}
                total_quotes = 0
                pages = set()

                for hit in results:
                    book = hit["book"].title()
                    page = hit["page"]
                    if book not in books:
                        books[book] = {"quotes": 0, "pages": set()}
                    books[book]["quotes"] += 1
                    books[book]["pages"].add(page)
                    total_quotes += 1
                    pages.add(page)

                # Metrics dashboard
                col1, col2, col3 = st.columns(3)
                col1.metric("Toplam Alıntı", total_quotes)
                col2.metric("Farklı Kitap", len(books))
                col3.metric("Farklı Sayfa", len(pages))

                # Books table with sorting
                st.subheader(f"📚 {selected_author} - Kitaplar ve Alıntılar")
                book_data = [
                    {"Kitap": book, "Alıntı Sayısı": info["quotes"], "Sayfa Aralığı": f"{min(info['pages'])} - {max(info['pages'])}"}
                    for book, info in books.items()
                ]
                df_books = pd.DataFrame(book_data)
                st.dataframe(df_books.sort_values("Alıntı Sayısı", ascending=False), use_container_width=True)

                # Visualization: Bar chart with hover
                st.subheader("📊 Alıntı Dağılımı")
                fig_books = px.bar(df_books, x="Kitap", y="Alıntı Sayısı",
                                   title="Kitaplara Göre Alıntı Dağılımı",
                                   color="Alıntı Sayısı",
                                   color_continuous_scale="Viridis",
                                   hover_data=["Sayfa Aralığı"])
                st.plotly_chart(fig_books, use_container_width=True)

                # Page distribution histogram
                all_pages = [p for book_info in books.values() for p in book_info["pages"]]
                if all_pages:
                    fig_pages = px.histogram(x=all_pages,
                                             title="Sayfa Numaralarına Göre Alıntı Dağılımı",
                                             labels={'x': 'Sayfa Numarası', 'y': 'Alıntı Sayısı'},
                                             nbins=30,
                                             marginal="rug")  # Add rug for detail
                    st.plotly_chart(fig_pages, use_container_width=True)

                # Top pages
                st.subheader("📋 En Çok Alıntı Yapılan Sayfalar")
                page_counts = Counter(hit["page"] for hit in results)
                top_pages = sorted(page_counts.items(), key=lambda x: x[1], reverse=True)[:10]

                if top_pages:
                    page_df = pd.DataFrame(top_pages, columns=["Sayfa", "Alıntı Sayısı"])
                    fig_top_pages = px.bar(page_df, x="Sayfa", y="Alıntı Sayısı",
                                           title="En Çok Alıntı Yapılan 10 Sayfa",
                                           color="Alıntı Sayısı",
                                           color_continuous_scale="Blues")
                    st.plotly_chart(fig_top_pages, use_container_width=True)

                # Quotes list with pagination
                st.subheader("📝 Alıntılar")
                page_size = 20
                page_num = st.number_input("Sayfa", min_value=1, max_value=(len(results) // page_size) + 1, value=1)
                start = (page_num - 1) * page_size
                end = start + page_size
                for hit in results[start:end]:
                    with st.expander(f"📄 {hit['book'].title()} - Sayfa {hit['page']}"):
                        st.write(hit["content"])
        except Exception as e:
            logger.error(f"Profil yükleme hatası: {e}")
            st.error("Profil bilgileri yüklenirken hata oluştu.")

st.markdown("---")
st.info("👤 Bu sayfa, üstatlar hakkında detaylı bilgi sunar. Geri bildirim için iletişime geçin.")