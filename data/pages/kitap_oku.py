# pages/kitap_oku.py
import streamlit as st
import os
import fitz  # PyMuPDF
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Statik Ayarlar ---
PDF_FOLDER = "pdfler"

# --- Yardımcı Fonksiyonlar ---
@st.cache_data
def get_books_data():
    """PDF klasörünü tarar ve yazar/kitap verisini yapılandırır."""
    pdf_files = [f for f in os.listdir(PDF_FOLDER) if f.endswith(".pdf")]
    authors = set()
    books_by_author = {}
    pdf_map = {} 

    for pdf_file in pdf_files:
        base_name = pdf_file.replace(".pdf", "").replace("_", " ")
        if "-" in base_name:
            book_part, author_part = base_name.split("-", 1)
            book_name = book_part.strip().title()
            author = author_part.strip().title() + " Hz.leri"
        else:
            book_name = base_name.title()
            author = "Bilinmeyen Mürşid"
        
        authors.add(author)
        books_by_author.setdefault(author, []).append(book_name)
        pdf_map[(author, book_name)] = pdf_file

    sorted_authors = sorted(list(authors))
    for author in books_by_author:
        books_by_author[author] = sorted(books_by_author[author])

    return sorted_authors, books_by_author, pdf_map

# --- Sayfa Yapısı ---
st.set_page_config(page_title="Kitap Okuma - Yediulya Kütüphanesi", page_icon="📖", layout="wide")
st.title("📖 Kitap Okuma Alanı")
st.markdown("<hr>", unsafe_allow_html=True)

# Sayfayı daha dar ve okunaklı kılmak için sütunlu yapı
left_spacer, main_content, right_spacer = st.columns([1, 1.2, 1])

with main_content:
    authors, books_by_author, pdf_map = get_books_data()

    # ### KESİN ÇÖZÜM: Callback'siz, Basit State Yönetimi ###

    # 1. Yönlendirme verisini AL ve durumu GÜNCELLE
    if 'go_to_book' in st.session_state and st.session_state.go_to_book:
        nav_data = st.session_state.go_to_book
        st.session_state.selected_author = nav_data.get('author')
        st.session_state.selected_book = nav_data.get('book_name')
        st.session_state.selected_page = nav_data.get('page', 1)
        st.session_state.go_to_book = None # Yönlendirme verisini bir kez kullandıktan sonra temizle
    
    # 2. State'de değerler yoksa (doğrudan açılışta) varsayılanları ata
    if 'selected_author' not in st.session_state:
        st.session_state.selected_author = authors[0] if authors else ""
    if 'selected_book' not in st.session_state:
        st.session_state.selected_book = books_by_author.get(st.session_state.selected_author, [""])[0]
    if 'selected_page' not in st.session_state:
        st.session_state.selected_page = 1

    # 3. Yazar ve Kitap Seçim Widget'ları
    col1, col2 = st.columns(2)
    with col1:
        author_index = authors.index(st.session_state.selected_author) if st.session_state.selected_author in authors else 0
        selected_author_from_widget = st.selectbox("Şahsiyet Seçin", authors, index=author_index)
    with col2:
        author_books = books_by_author.get(selected_author_from_widget, [])
        # Kitap seçimi de state'den okunmalı, ancak yazar değiştiğinde liste de değiştiği için kontrol gerekli
        if st.session_state.selected_book not in author_books:
            st.session_state.selected_book = author_books[0] if author_books else ""
        
        book_index = author_books.index(st.session_state.selected_book) if st.session_state.selected_book in author_books else 0
        selected_book_from_widget = st.selectbox("Kitap Seçin", author_books, index=book_index)

    # 4. Kullanıcı seçim yaptığında state'i GÜNCELLE ve sayfayı YENİLE
    if selected_author_from_widget != st.session_state.selected_author:
        st.session_state.selected_author = selected_author_from_widget
        st.session_state.selected_book = books_by_author.get(selected_author_from_widget, [""])[0]
        st.session_state.selected_page = 1
        st.rerun()
    
    if selected_book_from_widget != st.session_state.selected_book:
        st.session_state.selected_book = selected_book_from_widget
        st.session_state.selected_page = 1
        st.rerun()

    st.markdown("---")

    # 5. PDF Görüntüleyici
    if st.session_state.selected_author and st.session_state.selected_book:
        pdf_file = pdf_map.get((st.session_state.selected_author, st.session_state.selected_book))
        
        if pdf_file and os.path.exists(os.path.join(PDF_FOLDER, pdf_file)):
            try:
                doc = fitz.open(os.path.join(PDF_FOLDER, pdf_file))
                total_pages = len(doc)
                st.subheader(f"{st.session_state.selected_book} - {st.session_state.selected_author}")

                def go_to_previous_page():
                    if st.session_state.selected_page > 1: st.session_state.selected_page -= 1
                def go_to_next_page():
                    if st.session_state.selected_page < total_pages: st.session_state.selected_page += 1

                st.session_state.selected_page = st.number_input("Sayfa Numarası", min_value=1, max_value=total_pages, value=st.session_state.selected_page)
                
                img_col_left, img_col_mid, img_col_right = st.columns([1, 10, 1])
                with img_col_left:
                    st.button("⬅️", on_click=go_to_previous_page, use_container_width=True, disabled=(st.session_state.selected_page <= 1))
                with img_col_mid:
                    page = doc.load_page(st.session_state.selected_page - 1)
                    pix = page.get_pixmap(dpi=150) 
                    img_bytes = pix.tobytes("jpeg")
                    st.image(img_bytes, use_container_width=True)
                with img_col_right:
                    st.button("➡️", on_click=go_to_next_page, use_container_width=True, disabled=(st.session_state.selected_page >= total_pages))

                st.caption(f"Sayfa {st.session_state.selected_page} / {total_pages}")
                
                bottom_prev, bottom_dl, bottom_next = st.columns([2,3,2])
                with bottom_prev:
                    st.button("⬅️ Geri", on_click=go_to_previous_page, use_container_width=True, disabled=(st.session_state.selected_page <= 1), key="prev_bottom")
                with bottom_next:
                    st.button("İleri ➡️", on_click=go_to_next_page, use_container_width=True, disabled=(st.session_state.selected_page >= total_pages), key="next_bottom")
                with bottom_dl:
                    st.download_button(
                        label="📄 Sayfayı JPEG İndir",
                        data=img_bytes,
                        file_name=f"{st.session_state.selected_book}_sayfa_{st.session_state.selected_page}.jpeg",
                        mime="image/jpeg",
                        use_container_width=True
                    )
                doc.close()
            except Exception as e:
                logger.error(f"PDF yükleme hatası: {e}")
                st.error(f"PDF dosyası yüklenirken bir hata oluştu: {e}")
        else:
            st.warning("Bu yazara ait seçili kitap bulunamadı veya PDF dosyası eksik. Lütfen listeden başka bir kitap seçin.")