---
title: Yediulya Ilim Havuzu
emoji: 🕌
colorFrom: green
colorTo: blue
sdk: streamlit
sdk_version: 1.47.1 # Kullandığınız Streamlit sürümü (isteğe bağlı ama önerilir)
python_version: 3.11 # YERELDE KULLANDIĞINIZ SÜRÜMÜ BURAYA YAZIN
app_file: app.py
pinned: false
---
Tasavvuf İlm-i Havuzu Projesi
Proje Açıklama
Bu proje, tasavvufi eserlerin  bir data havuzuna dönüştürüldüğü bir Streamlit uygulamasıdır. Kullanıcılar, tasavvuf kavramları (rabıta, zikrullah, mürşid-i kâmil vb.) hakkında sorgu girdiklerinde:

Veri Arama Modu: Tam metin arama ile eşleşen alıntıları listeler (kitap, yazar/şahsiyet, sayfa, tam metin alıntısı). Sonuçlar grid kartlar halinde gösterilir ve Word dosyası olarak indirilebilir.
AI İrfan Sentezi Modu: DeepSeek API kullanarak PDF'lerden alınan context'e dayalı sentez yapar (Giriş, Açıklama, Örnekler, Sonuç yapısında, İslami unsurları vurgulayarak). Kaynaklar expander altında grid kartlarla gösterilir.
Uygulama, modern UI/UX ile tasarlandı: Glassmorphism efektler, İslami geometrik desen arka plan, turkuaz-altın-krem renk paleti, responsive tasarım, animasyonlu spinner, typing effect vb. Sidebar'da filtreler, önceki QA'lar, hikmetli sözler, hadis/ayetler ve yardım bölümü var.

Proje, Grok AI ile geliştirildi ve sürekli güncellendi (merge conflict'ler temizlendi, performans optimizasyonları eklendi).

Özellikler
PDF İşleme: PDF'ler hash kontrolüyle indexlenir (Whoosh için tam metin arama, FAISS için vektör embedding).
Arama ve Sentez: Whoosh ile keyword arama, HuggingFace embeddings ile semantik retrieval, DeepSeek ile AI sentezi.
UI Geliştirmeleri: Custom CSS (glassmorphism, gradientler, hover efektler), Material Icons, Arabic fontlar (Amiri), rastgele loading mesajları/tavsiyeler.
Veri Yönetimi: SQLite DB ile QA'lar kaydedilir (db.py), son 10 gösterilir.
İndirme: Word export (python-docx ile).
Performans: Cache (@st.cache_resource), mesaj sınırlama (son 20), progress bar, typing delay optimize.
Hata Yönetimi: Try-except, traceback expander.
Mobil Uyumlu: Responsive CSS (@media queries).
Kurulum
Gereksinimler:
Python 3.12+ (Poetry ile yönetin).
Bağımlılıklar: streamlit, dotenv, whoosh, langchain-community, huggingface-hub (sentence-transformers), pymupdf, python-docx, openai (DeepSeek için), sqlite3 (db.py için).
.env dosyası: DEEPSEEK_API_KEY=your_key
Adımlar:
Repo'yu klonlayın: git clone https://github.com/hasancaglar07/tasavvuf-data-havuzu.git
Klasöre girin: cd tasavvuf-data-havuzu
Bağımlılıkları kurun: poetry install (veya pip install -r requirements.txt eğer Poetry yoksa).
PDF'leri "pdfler/" klasörüne koyun (örneğin: seyrsuluk-ali_ramazan_dinc_efendi.pdf).
Uygulamayı çalıştırın: poetry run streamlit run app.py (veya streamlit run app.py).
İlk çalıştırmada PDF'ler indexlenir (faiss_index/ ve whoosh_index/ yaratılır, pdf_hash.json ile değişim kontrolü).

Kullanım
Uygulama açıldığında: Bismillah ve başlık gösterilir, sidebar'da filtreler (şahsiyet seçimi, sonuç tarzı, grid view checkbox).
Sorgu girin (chat input): Örneğin "rabıta nedir?".
Sonuç: Mesaj balonlarında gösterilir (kullanıcı turkuaz, asistan altın tonlu, watermark ay ikonlu).
Önceki QA'lar: Sidebar'da listelenir, tıklayınca yüklenir.
Geçmişi temizle: Sidebar button.
Auto-scroll ve footer mevcut.
Hata durumunda: API key kontrol edin, PDF'ler UTF-8 olsun (font bozulmaları için OCR kullanılabilir).

Bağımlılıklar
streamlit
python-dotenv
whoosh
langchain-community (embeddings, splitters, loaders, vectorstores)
sentence-transformers (all-MiniLM-L6-v2)
pymupdf
python-docx
openai (DeepSeek client)
Diğer: hashlib, json, uuid, datetime, traceback, time
requirements.txt için: poetry export -f requirements.txt --output requirements.txt

Geliştirme Notları
Merge Conflict'ler: Kodda HEAD ve branch arası farklar temizlendi (örneğin CSS minify, loading mesaj çeşitliliği, progress bar ekleme).
Sorunlar ve Çözümler:
Sidebar ikon: Material Icons ligature sorunu, codepoint ile düzeltildi (content: 'menu').
Font Yükleme: &display=block eklendi.
Duplicate Element ID: Checkbox sidebar'a taşındı, session_state ile yönetildi.
PDF Font Bozulmaları: PyMuPDF ile metin çıkarma, OCR (tesseract) ile düzeltilebilir (gelecek özellik).
Performans: Chunk size 500, k=50, max_entries=5 cache, typing sleep 0.02s.
Gelecek Özellikler: Web search entegrasyonu, daha hızlı index (Pinecone?), mobil app dönüşümü (Streamlit Cloud), OCR entegrasyonu.
Grok ile Geliştirme: Bu proje Grok AI ile adım adım geliştirildi (UI iyileştirmeleri, hata düzeltmeleri).
Proje'yi açtığınızda: app.py'yi çalıştırın, pdfler/ doldurun, .env ayarlayın. Sorular için issue açın.

Lisans
MIT License (veya belirtin). © 2025 Hasan Çağlar.
=======
# tasavvuf-data-havuzu
Tasavvuf