# pages/kavram_haritasi.py
import streamlit as st
import networkx as nx
import plotly.graph_objects as go
from whoosh.index import open_dir
from whoosh.qparser import MultifieldParser, AndGroup
import re
from collections import Counter
import logging
import sys
import locale

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
locale.setlocale(locale.LC_ALL, 'tr_TR.UTF-8')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

st.set_page_config(
    page_title="Kavram Haritası - Yediulya Kütüphanesi",
    page_icon="🧠",
    layout="wide"
)



st.title("🧠 Kavram Haritası")
st.markdown("---")

try:
    ix = open_dir("whoosh_index")
except Exception as e:
    logger.error(f"Indeks hatası: {e}")
    st.error("Veri indeksi yüklenemedi.")
    st.stop()

def tokenize_text(text):
    stop_words = set(['ve', 'ile', 'ki', 'de', 'da', 'bir', 'bu', 'o', 'için', 'gibi'])
    words = re.findall(r'\b\w+\b', text.lower())
    return [word for word in words if len(word) > 2 and word not in stop_words]

def create_concept_map(seed_term, max_nodes=20, min_freq=2):
    G = nx.Graph()
    G.add_node(seed_term, type='seed', size=30)

    with ix.searcher() as searcher:
        parser = MultifieldParser(["content"], ix.schema, group=AndGroup)
        q = parser.parse(f'content:{seed_term.lower()}')
        results = searcher.search(q, limit=100)

        all_text = " ".join(hit["content"] for hit in results).lower()
        words = tokenize_text(all_text)
        word_freq = Counter(words)

        related_terms = [(word, freq) for word, freq in word_freq.most_common(max_nodes * 2) if word != seed_term.lower() and freq >= min_freq][:max_nodes-1]

        for term, freq in related_terms:
            G.add_node(term, type='related', size=10 + freq)
            G.add_edge(seed_term, term, weight=freq)

        for i, (term1, _) in enumerate(related_terms):
            for term2, _ in related_terms[i+1:]:
                if abs(words.index(term1) - words.index(term2)) < 50:
                    G.add_edge(term1, term2, weight=1)

    return G

def plot_interactive_graph(G, seed_term):
    pos = nx.spring_layout(G, seed=42)

    edge_x = []
    edge_y = []
    for edge in G.edges():
        x0, y0 = pos[edge[0]]
        x1, y1 = pos[edge[1]]
        edge_x.extend([x0, x1, None])
        edge_y.extend([y0, y1, None])

    node_x = [pos[node][0] for node in G.nodes()]
    node_y = [pos[node][1] for node in G.nodes()]
    node_size = [G.nodes[node]['size'] for node in G.nodes()]
    node_color = ['red' if G.nodes[node]['type'] == 'seed' else 'lightblue' for node in G.nodes()]
    node_text = [node for node in G.nodes()]

    fig = go.Figure()

    fig.add_trace(go.Scatter(x=edge_x, y=edge_y, line=dict(width=0.5, color='#888'), hoverinfo='none', mode='lines'))

    fig.add_trace(go.Scatter(x=node_x, y=node_y, mode='markers+text',
                             marker=dict(size=node_size, color=node_color, line_width=1),
                             text=node_text, textposition="top center",
                             hoverinfo='text'))

    fig.update_layout(title=f"'{seed_term}' Kavram Haritası", showlegend=False, hovermode='closest',
                      margin=dict(b=20, l=5, r=5, t=40), xaxis_visible=False, yaxis_visible=False)
    return fig

st.subheader("🔍 Kavram Keşfi")
user_input = st.text_input("Ana kavramı girin", placeholder="Örn: Rabıta")

if user_input:
    with st.spinner("Harita oluşturuluyor..."):
        try:
            concept_graph = create_concept_map(user_input.strip())
            if len(concept_graph.nodes()) > 1:
                fig = plot_interactive_graph(concept_graph, user_input.strip())
                st.plotly_chart(fig, use_container_width=True)

                st.subheader("📊 Harita Bilgileri")
                col1, col2, col3 = st.columns(3)
                col1.metric("Toplam Kavram", len(concept_graph.nodes()))
                col2.metric("Toplam Bağlantı", len(concept_graph.edges()))
                most_connected = max(dict(concept_graph.degree()).items(), key=lambda x: x[1])[0]
                col3.metric("En Merkezi Kavram", most_connected)

                st.subheader("🔗 İlgili Kavramlar")
                related = sorted([(n, d['size']) for n, d in concept_graph.nodes(data=True) if d['type'] == 'related'], key=lambda x: x[1], reverse=True)
                for term, weight in related:
                    st.markdown(f"- **{term}** (Yakınlık: {weight})")
            else:
                st.warning("Yeterli veri bulunamadı.")
        except Exception as e:
            logger.error(f"Harita oluşturma hatası: {e}")
            st.error("Harita oluşturulurken hata oluştu.")

st.markdown("---")
st.info("🧠 Kavram ağını keşfedin. Tıklama ile detaylara erişin (gelecek özellik).")