# scrape_articles.py
# Versiyon 4.3 - Kullanıcı tarafından sağlanan doğru HTML seçicileri ile güncellendi.

import requests
from bs4 import BeautifulSoup
import logging
import time
from data.articles_db import save_article, init_db, get_existing_article_urls

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

# --- TEMEL YAPILANDIRMA ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
SITEMAP_URLS = ["https://yediulya.org/sitemap.xml", "https://yenidunyadergisi.com/sitemap.xml"]
EXCLUDED_PATTERNS = ['/tag/', '/kategori/', '/category/', '/author/', '/etiket/']

# ★★★ NİHAİ GÜNCELLEME: Sağlanan görsele göre en doğru seçiciler ★★★
SITE_CONFIG = {
    'yediulya.org': {
        'title': ['h1.entry-title'],
        'content': ['div.entry-content'],
        'author': ['span.author', 'a.author-name']
    },
    'yenidunyadergisi.com': {
        'title': ['h1.entry-title'], # Doğru seçici: h1.entry-title
        'content': ['div.entry-main-content'], # Doğru seçici: div.entry-main-content
        'author': ['span.author-namge', 'span.author-name'] # Her iki olası durumu da kapsar
    }
}

# --- SELENIUM KURULUMU ---
def get_driver():
    """Selenium WebDriver'ı headless modda başlatır."""
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("user-agent=" + HEADERS['User-Agent'])
    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        return driver
    except Exception as e:
        logging.error(f"Selenium WebDriver başlatılamadı: {e}")
        return None

# --- YARDIMCI FONKSİYONLAR (DEĞİŞİKLİK YOK) ---
def get_all_article_urls_from_sitemaps(initial_sitemap_urls):
    sitemaps_to_process = list(initial_sitemap_urls)
    final_article_urls = set()
    for sitemap_url in sitemaps_to_process:
        try:
            response = requests.get(sitemap_url, headers=HEADERS, timeout=30)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'xml')
            for sitemap in soup.find_all('sitemap'):
                nested_url = sitemap.find('loc').get_text(strip=True)
                if nested_url not in sitemaps_to_process: sitemaps_to_process.append(nested_url)
            for url in soup.find_all('url'):
                loc = url.find('loc').get_text(strip=True)
                if loc and not any(pattern in loc for pattern in EXCLUDED_PATTERNS): final_article_urls.add(loc)
        except requests.exceptions.RequestException as e:
            logging.error(f"Sitemap alınamadı ({sitemap_url}): {e}")
            continue
    logging.info(f"Sitemap'lerden toplam {len(final_article_urls)} adet benzersiz makale linki bulundu.")
    return list(final_article_urls)

def find_element(soup, selectors):
    for selector in selectors:
        element = soup.select_one(selector)
        if element: return element
    return None

def scrape_article_content(html_content, site_name):
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        config = SITE_CONFIG.get(site_name)
        if not config: return None, None, None

        title_tag = find_element(soup, config['title'])
        title = title_tag.get_text(strip=True) if title_tag else None

        content_tag = find_element(soup, config['content'])
        if content_tag:
            for junk_selector in ['.wp-block-jetpack-related-posts', '.essb_links']:
                for element in content_tag.select(junk_selector): element.decompose()
            content_html = str(content_tag)
        else: content_html = None
        
        author_tag = find_element(soup, config['author'])
        author = author_tag.get_text(strip=True) if author_tag else "Yazar Belirtilmemiş"
        
        return title, content_html, author
    except Exception as e:
        logging.error(f"HTML ayrıştırılırken hata: {e}")
        return None, None, None

# --- ANA SCRAPER FONKSİYONU ---
def run_scraper():
    logging.info("HİBRİT ve DOĞRULANMIŞ makale çekme işlemi başlatıldı...")
    init_db()
    existing_urls = get_existing_article_urls()
    logging.info(f"Veritabanında {len(existing_urls)} adet makale zaten mevcut.")

    all_article_urls = get_all_article_urls_from_sitemaps(SITEMAP_URLS)
    
    new_article_urls = [url for url in all_article_urls if url not in existing_urls]
    
    if not new_article_urls:
        logging.info("Yeni makale bulunamadı. İşlem tamamlandı.")
        return

    total_new_articles = len(new_article_urls)
    logging.info(f"İşlenecek {total_new_articles} YENİ makale bulundu.")
    
    # ★★★ Sorunlu siteyi Selenium ile, diğerini requests ile çekmeye devam ediyoruz ★★★
    driver = None
    if any("yenidunyadergisi.com" in url for url in new_article_urls):
        driver = get_driver()
        if not driver: return

    for i, article_url in enumerate(new_article_urls, 1):
        site_name = article_url.split('/')[2].replace("www.", "")
        logging.info(f"[{i}/{total_new_articles}] Yeni makale işleniyor: {article_url}")
        
        html_content = None
        if site_name == "yenidunyadergisi.com":
            if not driver: continue # Driver başlatılamadıysa bu siteyi atla
            try:
                driver.get(article_url)
                time.sleep(1) # Sayfanın oturması için kısa bir bekleme
                html_content = driver.page_source
            except Exception as e:
                logging.error(f"Selenium ile sayfa alınamadı ({article_url}): {e}")
                continue
        else: # yediulya.org için
            try:
                response = requests.get(article_url, headers=HEADERS, timeout=20)
                response.raise_for_status()
                html_content = response.text
            except Exception as e:
                logging.error(f"Requests ile sayfa alınamadı ({article_url}): {e}")
                continue

        if not html_content:
            logging.warning(f"HTML içerik alınamadı, atlanıyor: {article_url}")
            continue

        title, content, author = scrape_article_content(html_content, site_name)
        
        if title and content:
            save_article(title=title, content=content, category=site_name, author=author, url=article_url)
        else:
            logging.warning(f"Başlık veya içerik ayrıştırılamadı, atlanıyor: {article_url}")
    
    if driver:
        driver.quit() # İşlem bitince tarayıcıyı kapat
    logging.info("Yeni makalelerin işlenmesi tamamlandı.")

if __name__ == "__main__":
    run_scraper()