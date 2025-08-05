# deep_research.py
import streamlit as st
import openai
from collections import defaultdict
import os
import asyncio
import numpy as np
from langchain_community.document_loaders import WebBaseLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document
from transformers import pipeline
import pandas as pd
import torch
import logging
import time
import uuid
import traceback
import warnings

warnings.filterwarnings("ignore", category=FutureWarning)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

device = 0 if torch.cuda.is_available() else -1
logger.info(f"Device: {'GPU' if device == 0 else 'CPU'}")

try:
    summarizer = pipeline("summarization", model="t5-small", device=device)
except Exception as e:
    logger.error(f"Summarizer error: {e}")
    st.error(f"Model yüklenemedi: {e}")
    raise

@st.cache_resource
def load_embeddings():
    return HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

def summarize_context(context, max_length=200000):
    if len(context) <= max_length:
        return context
    chunks = [context[i:i+1024] for i in range(0, len(context), 1024)]
    summarized = []
    for chunk in chunks:
        try:
            summary = summarizer(chunk, max_length=150, min_length=50, do_sample=False)[0]['summary_text']
        except:
            summary = chunk[:150]
        summarized.append(summary)
    return " ".join(summarized) + "\n(Özetlendi)"

async def get_relevant_docs(retriever, question, k=50):
    return await asyncio.to_thread(retriever.invoke, question, search_kwargs={"k": k})

@st.cache_data(ttl=3600)
def fetch_web_sources(question):
    loader = WebBaseLoader(["https://yenidunyadergisi.com/"])
    docs = loader.load()
    return [Document(page_content=doc.page_content[:1000], metadata={"source": "web", "url": doc.metadata.get("source")}) for doc in docs]

def deep_research(question, retriever, save_qa, use_web=True, use_semantic_chunking=False):
    with st.spinner("Derin Araştırma Yapılıyor..."):
        try:
            logger.info(f"Starting deep research for question: {question}")

            overall_progress = st.progress(0)
            status_text = st.empty()
            status_text.text("Adım 1: Belgeler Alınıyor... 0%")

            relevant_docs = asyncio.run(get_relevant_docs(retriever, question))
            if use_web:
                web_docs = fetch_web_sources(question)
                relevant_docs.extend(web_docs)
            logger.info(f"Retrieved {len(relevant_docs)} documents")
            overall_progress.progress(0.2)
            status_text.text("Adım 2: Belgeler Kısaltılıyor... 20%")

            truncated_docs = [Document(page_content=doc.page_content[:1024], metadata=doc.metadata) for doc in relevant_docs]

            overall_progress.progress(0.4)
            status_text.text("Adım 3: Chunking Yapılıyor... 40%")

            embeddings = load_embeddings()
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=100)
            chunked_docs = text_splitter.split_documents(truncated_docs)
            logger.info(f"Chunked into {len(chunked_docs)} pieces")

            overall_progress.progress(0.5)
            status_text.text("Adım 4: Context Oluşturuluyor... 50%")

            author_groups = defaultdict(list)
            for doc in chunked_docs:
                author = doc.metadata.get("author", 'Bilinmeyen')
                author_groups[author].append(doc.page_content)

            context_parts = []
            for author, contents in author_groups.items():
                author_context = f"Yazar: {author}\nAlıntılar:\n" + "\n".join(contents[:15])
                context_parts.append(author_context)

            context = "\n\n---\n\n".join(context_parts)

            overall_progress.progress(0.6)
            status_text.text("Adım 5: Context Özetleniyor (Eğer Gerekli)... 60%")

            if len(context) > 300000:
                context = summarize_context(context, 300000)

            overall_progress.progress(0.7)
            status_text.text("Adım 6: AI Analizi Yapılıyor... 70%")

            deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
            client = openai.OpenAI(base_url="https://api.deepseek.com", api_key=deepseek_api_key)

            system_prompt = """Sen bir tasavvuf araştırmacısısın ve akademik bir makale hazırlıyorsun. Cevabını SADECE verilen alıntılara dayalı oluştur; dış bilgi, kişisel yorum veya genel tasavvuf bilgisi ekleme. Eğer alıntılar yetersizse, 'Yeterli alıntı yok' de ve nedenini kısaca açıkla.

Yanıtını akademik makale gibi yapılandır, minimum 4000-5000 kelime uzunluğunda olsun. Okuyucu bir kitap bölümü okur gibi hissetmeli: Detaylı anlatımlar, yazar karşılaştırmaları, örnekler ve derin analizler içersin. Yapı şöyle olsun:

- **Başlık**: '[Konu] Üzerine Tasavvufi Derleme, Derin Analiz ve Tarihsel Evrim'.
- **Özet**: Konunun genel çerçevesini alıntılardan sentezleyerek 400-600 kelimeyle anlat.
- **Giriş**: Konunun tasavvuf bağlamındaki anlamını, kökenini ve evrimini detaylandır (500-800 kelime, birden fazla alıntı ile destekle; tarihsel timeline ekle).
- **Tanım ve Kavramlar**: Konuyu tanımla, alt kavramlarını incele; her yazarın tanımını ayrı ayrı ele al (800-1200 kelime, her yazar için birden fazla örnek alıntı ver, kavram haritası gibi karşılaştır).
- **Yazar Görüşleri ve Karşılaştırmalar**: Verilen yazarların (örneğin 10 yazar varsa hepsini kapsa) görüşlerini detaylandır, benzerlikleri/farklılıklarını karşılaştır. Her yazarı ayrı bir alt başlık altında incele, alıntıları quote et ve analiz et (1500-2000 kelime; her alt başlıkta 200-300 kelime, 4-6 alıntı).
- **Tarihsel Evrim ve Etkiler**: Konunun tarihsel gelişimini, manevi/pratik/felsefi etkilerini analiz et; dönemlere ayır (600-900 kelime, somut örnekler ve timeline ver).
- **Derin Analiz, Örnekler ve Uygulamalar**: Alıntılardan türetilmiş detaylı örnekler, senaryolar ve uygulamaları anlat; karşılaştırmalı analiz yap, modern bağlam ekle (800-1200 kelime).
- **Sonuç**: Ana noktaları sentezle, açık sorular veya vurgular ekle (400-600 kelime).
- **Kaynak Tablosu**: Tüm alıntıları tablo ile göster (| Yazar | Kitap | Sayfa | Alıntı Metni | Analiz Notu |).

Genel kurallar:
- Yanıtın %80'i doğrudan alıntılardan oluşsun (tam metin quote'lar, kısaltma minimum; her paragrafta 3-5 alıntı).
- %20'si sentez ve analiz olsun (alıntıları bağla, karşılaştır, örnekle; meta-analiz yap).
- Her paragrafta en az 3-5 alıntı kullan, yazar adını, kitabını ve sayfasını belirt.
- Dil akademik, nesnel ve akıcı olsun: 'Bu alıntıda [yazar] şöyle vurgular...' gibi.
- Uzunluğu sağlamak için detaylandır: Her bölümü genişlet, tekrarlamadan derinleştir (örneğin, alt kavramları alt başlıklara ayır).
- Eğer alıntılar yeterliyse, tüm yazarları kapsa ve karşılaştır; bağlamı tarihsel/manevi/pratik boyutlarla zenginleştir.""".strip()

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Alıntılar: {context}\nKonu: {question}"}
            ]
            stream = client.chat.completions.create(
                model="deepseek-chat",
                messages=messages,
                temperature=0.3,
                max_tokens=8192,
                stream=True
            )
            answer = ""
            with st.chat_message("assistant"):
                container = st.empty()
                timeout_start = time.time()
                timeout_duration = 400
                stream_progress = st.progress(0)
                chunk_count = 0
                while True:
                    if time.time() - timeout_start > timeout_duration:
                        answer += "\n... (Zaman aşımı - Analiz kısmi)"
                        break
                    try:
                        chunk = next(stream)
                        if chunk.choices[0].delta.content is not None:
                            answer += chunk.choices[0].delta.content
                            container.markdown(answer)
                            chunk_count += 1
                            stream_progress.progress(min(chunk_count / 800, 1.0))
                            time.sleep(0.001)
                    except StopIteration:
                        break
                stream_progress.empty()

            overall_progress.progress(0.9)
            status_text.text("Adım 7: Kaynaklar Hazırlanıyor... 90%")

            unique_sources = []
            seen = set()
            for doc in relevant_docs[:50]:
                key = f"{doc.metadata.get('author')}_{doc.metadata.get('book')}_{doc.metadata.get('page')}"
                if key not in seen:
                    seen.add(key)
                    unique_sources.append({
                        "book": doc.metadata.get("book"),
                        "author": doc.metadata.get("author"),
                        "page": doc.metadata.get("page"),
                        "page_content": doc.page_content[:300],
                        "pdf_file": doc.metadata.get("pdf_file")
                    })

            overall_progress.progress(1.0)
            status_text.text("Tamamlandı! 100% - Tamamlandı!")
            overall_progress.empty()

            if answer:
                save_qa(question, answer)

            word_count = len(answer.split())
            st.markdown(f"**Kelime Sayısı:** {word_count}")
            st.download_button("Makaleyi İndir", answer, file_name=f"{question}_makale.txt")

            if unique_sources:
                df_sources = pd.DataFrame(unique_sources)
                with st.expander("Kaynak Tablosu"):
                    st.dataframe(df_sources, column_config={"page_content": st.column_config.TextColumn("page_content", width="large")})  # Sortable

            return answer, unique_sources
        except Exception as e:
            logger.error(f"Error in deep_research: {str(e)}")
            st.error(f"Hata oluştu: {str(e)}. Lütfen filtreleri kontrol edin veya tekrar deneyin.")
            st.expander("Hata Detayı").code(traceback.format_exc())
            if st.button("Tekrar Dene"):
                st.rerun()
            return None, None

# Şifre Kontrolü
if "authenticated" not in st.session_state or not st.session_state.authenticated:
    st.error("Lütfen ana sayfadan (Tasavvuf İlm-i Havuzu) giriş yapın.")
    st.stop()

# Kullanıcı Girdisi
question = st.text_input("Soru Girin (ör. Zikrullah'ın tasavvuftaki rolü):", placeholder="Örnek: Zikrullah'ın tasavvuftaki rolü", key="deep_question_input")
use_web = st.checkbox("Web Kaynaklarını Kullan", value=True, key="deep_web_checkbox")
use_semantic_chunking = st.checkbox("Semantik Chunking Kullan", value=False, key="deep_semantic_checkbox")

if st.button("Derin Araştırma Yap", key="deep_research_button"):
    if question.strip():
        if "vectorstore" not in st.session_state:
            st.error("Ana sayfadan vectorstore yüklenmedi. Lütfen ana sayfaya dönün.")
        else:
            retriever = st.session_state.vectorstore.as_retriever(search_kwargs={"k": 50})
            from db import save_qa
            answer, sources = deep_research(question, retriever, save_qa, use_web=use_web, use_semantic_chunking=use_semantic_chunking)
    else:
        st.warning("Lütfen bir soru girin! (Boş girdiler kabul edilmez.)")