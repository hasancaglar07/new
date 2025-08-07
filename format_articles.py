# format_articles.py
# Veritabanındaki işlenmemiş makaleleri toplu halde AI ile formatlayan akıllı script.

import os
import time
import logging
import sqlite3
from openai import OpenAI
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# --- Kurulum ve Global Yapılandırma ---
load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Veritabanı ve API istemcisi
DB_FILE = os.path.join(os.path.dirname(__file__), "data", "articles_database.db")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

if not DEEPSEEK_API_KEY:
    logging.error("DEEPSEEK_API_KEY bulunamadı. Lütfen .env dosyanızı kontrol edin.")
    exit()

client = OpenAI(base_url="https://api.deepseek.com", api_key=DEEPSEEK_API_KEY)

# Yapay Zeka için Sistem Talimatı (main.py ile aynı)
SYSTEM_PROMPT = """
Sen, ham metinleri okuyucular için ilgi çekici ve kolay okunur makalelere dönüştüren uzman bir editörsün. Görevin, sana verilen metni analiz etmek ve anlamsal bütünlüğe göre yeniden yapılandırarak modern, okunabilir bir HTML çıktısı üretmektir.

KURALLAR:
1.  **Anlamı Koru:** Orijinal metnin anlamını ASLA değiştirme. Sadece formatla.
2.  **Yapısal Analiz:** Metni mantıksal bölümlere ayır.
3.  **Başlıklandırma:** Bu bölümler için `<h2>` veya `<h3>` etiketleriyle uygun alt başlıklar oluştur.
4.  **Vurgulama:** Metindeki kilit kavramları veya önemli cümleleri `<strong>` etiketiyle kalınlaştır.
5.  **Listeleme:** Sıralanabilecek maddeler varsa `<ul>` ve `<li>` etiketleriyle liste yap.
6.  **Alıntılar:** Ayet, hadis veya önemli bir söz varsa, bunları `<blockquote>` etiketiyle belirginleştir.
7.  **Temiz Çıktı:** Sadece formatlanmış HTML kodunu döndür. Ekstra açıklama yazma. Orijinal `<p>` etiketlerini koru.
"""

def html_to_text(html_content: str) -> str:
    if not html_content: return ""
    soup = BeautifulSoup(html_content, 'html.parser')
    return soup.get_text(separator=' ', strip=True)

def get_unformatted_articles(limit=50):
    """Veritabanından formatlanmamış makaleleri belirli bir limitle çeker."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    # formatted_content'i NULL olanları veya boş olanları seç
    cursor.execute("SELECT id, content FROM articles WHERE formatted_content IS NULL OR formatted_content = '' LIMIT ?", (limit,))
    articles = cursor.fetchall()
    conn.close()
    return articles

def update_formatted_content(article_id: int, formatted_html: str):
    """Bir makalenin formatlanmış içeriğini veritabanında günceller."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("UPDATE articles SET formatted_content = ? WHERE id = ?", (formatted_html, article_id))
    conn.commit()
    conn.close()

def format_all_articles():
    """Tüm formatlanmamış makaleleri toplu halde işler."""
    logging.info("Akıllı toplu formatlama işlemi başlatıldı.")
    
    while True:
        # Her döngüde 50 tane işlenmemiş makale al
        articles_to_process = get_unformatted_articles(limit=50)
        
        if not articles_to_process:
            logging.info("Formatlanacak yeni makale kalmadı. İşlem tamamlandı.")
            break

        logging.info(f"{len(articles_to_process)} adet yeni makale bulundu. İşlem başlıyor...")

        for article in articles_to_process:
            article_id = article['id']
            logging.info(f"Makale ID {article_id} işleniyor...")
            
            raw_text = html_to_text(article['content'])
            if len(raw_text) < 50: # Çok kısa içerikleri atla
                update_formatted_content(article_id, article['content']) # Ham halini kaydet
                logging.warning(f"Makale ID {article_id} içeriği çok kısa, ham haliyle kaydedildi.")
                continue

            try:
                response = client.chat.completions.create(
                    model="deepseek-chat",
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": raw_text}
                    ],
                    temperature=0.5,
                )
                formatted_html = response.choices[0].message.content
                
                # Başarıyla formatlanan içeriği veritabanına kaydet
                update_formatted_content(article_id, formatted_html)
                logging.info(f"Makale ID {article_id} başarıyla formatlandı ve kaydedildi.")
                
                # API hız limitlerini aşmamak için bekle
                time.sleep(2)

            except Exception as e:
                logging.error(f"Makale ID {article_id} işlenirken AI hatası: {e}")
                # Hata durumunda bir sonraki makaleye geçmeden önce biraz bekle
                time.sleep(5)
                continue
    
if __name__ == "__main__":
    format_all_articles()