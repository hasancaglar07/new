# app.py
import streamlit as st
from st_pages import get_nav_from_toml

# --- UYGULAMA YAPILANDIRMASI ---
st.set_page_config(
    page_title="Yediulya Kütüphanesi",
    page_icon="📖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- TEMA YÖNETİMİ ---
if "theme" not in st.session_state:
    st.session_state.theme = "light"

st.markdown("""
    <style>
        :root { --mode: light; }
        [data-testid="stApp"] {
            background-color: var(--background-color);
            color: var(--text-primary);
        }
    </style>
""", unsafe_allow_html=True)

# --- ÖZEL CSS ---
@st.cache_data
def load_css():
    try:
        with open("styles.css", "r", encoding="utf-8") as css_file:
            return css_file.read()
    except FileNotFoundError:
        return ""
    return ""

css_content = load_css()
if css_content:
    st.markdown(f"<style>{css_content}</style>", unsafe_allow_html=True)
st.markdown(f'<body data-theme="{st.session_state.theme}"></body>', unsafe_allow_html=True)

# --- SAYFA NAVİGASYONU ---
nav = get_nav_from_toml(".streamlit/pages.toml")
pg = st.navigation(nav)
pg.run()