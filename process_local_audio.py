# process_local_audio.py (Versiyon 8.2 - Tüm Hatalar Düzeltilmiş, Tek Parça)
# Bu script, ses dosyalarını tek tek ve sırayla analiz eder,
# API hız limitlerine takılmaz ve her adımdan sonra DB'yi günceller.

import os
import re
import subprocess
import sqlite3
from pathlib import Path
from urllib.parse import unquote_plus
from tqdm import tqdm
import logging
import concurrent.futures
import asyncio
from openai import AsyncOpenAI
from deepgram import DeepgramClient, PrerecordedOptions, FileSource, DeepgramError
from dotenv import load_dotenv
import json
import time

# --- Temel Yapılandırma ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
load_dotenv()

MAX_CONVERSION_WORKERS = os.cpu_count()
MAX_ANALYSIS_WORKERS = 3

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
RAW_AUDIO_DIR = DATA_DIR / "audio"
MP3_AUDIO_DIR = DATA_DIR / "audio_mp3"
DB_PATH = DATA_DIR / "audio_database.db"

ALLOWED_EXTENSIONS = ['.mp3', '.wma', '.m4a', '.ogg', '.wav', '.mp4', '.flac', '.aac', '.mov', '.avi', '.wmv']

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

SYSTEM_PROMPT = "Verilen metnin ana konusunu özetleyen 4-6 kelimelik kısa bir başlık oluştur."

# --- Veritabanı Fonksiyonları ---
def db_init():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS audio_analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_name TEXT NOT NULL,
                original_path TEXT NOT NULL,
                mp3_path TEXT UNIQUE,
                title TEXT,
                cleaned_filename TEXT,
                chapters_json TEXT,
                status TEXT NOT NULL CHECK(status IN ('pending', 'converted', 'analyzed', 'failed')),
                UNIQUE(source_name, original_path)
            )''')
        conn.commit()

def db_log_initial_files():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT original_path FROM audio_analyses")
        db_files = {row[0] for row in cursor.fetchall()}
        
        tasks = []
        for root, _, files in os.walk(RAW_AUDIO_DIR):
            for name in files:
                filepath = Path(root) / name
                if filepath.suffix.lower() not in ALLOWED_EXTENSIONS:
                    continue
                relative_path = str(filepath.relative_to(DATA_DIR))
                if relative_path not in db_files:
                    source = Path(root).name
                    if source == 'audio': source = 'Genel'
                    tasks.append((source, relative_path, 'pending'))
        
        if tasks:
            cursor.executemany("INSERT INTO audio_analyses (source_name, original_path, status) VALUES (?, ?, ?)", tasks)
        conn.commit()

def db_get_tasks(status):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM audio_analyses WHERE status = ?", (status,))
        return [dict(row) for row in cursor.fetchall()]

def db_update_task(task_id, status, **kwargs):
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        updates = ", ".join([f"{key} = ?" for key in kwargs])
        sql_command = f"UPDATE audio_analyses SET status = ?"
        params = [status]
        if updates:
            sql_command += f", {updates}"
            params.extend(kwargs.values())
        sql_command += " WHERE id = ?"
        params.append(task_id)
        cursor.execute(sql_command, params)
        conn.commit()

# --- Worker Fonksiyonları ---
def format_time(seconds):
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d}"

def clean_filename(filename, source_name, counter):
    name = Path(unquote_plus(filename)).stem.replace("+", "_").replace(" ", "_")
    name = re.sub(r'[^a-zA-Z0-9_.-]', '', name)
    return f"{source_name}_{counter:03d}_{name.lower()}.mp3"

def convert_worker(task):
    try:
        output_path = MP3_AUDIO_DIR / task['cleaned_filename']
        task['mp3_path'] = str(output_path.relative_to(BASE_DIR))
        if output_path.exists() and output_path.stat().st_size > 1000:
            return {**task, 'status': 'converted'}

        raw_filepath = DATA_DIR / task['original_path']
        subprocess.run(['ffmpeg', '-i', str(raw_filepath), '-vn', '-ar', '16000', '-ac', '1',
                        '-b:a', '64k', '-y', '-loglevel', 'error', str(output_path)], check=True)
        return {**task, 'status': 'converted'}
    except Exception as e:
        logging.warning(f"Dönüştürme hatası: {task['original_path']} - {e}")
        return {**task, 'status': 'failed'}

async def analyze_single_file_async(task, deepseek, deepgram):
    for attempt in range(3):
        try:
            mp3_full_path = BASE_DIR / task['mp3_path']
            with open(mp3_full_path, 'rb') as audio_file:
                source = {'buffer': audio_file.read(), 'mimetype': 'audio/mp3'}
            
            options = PrerecordedOptions(model="nova-2", language="tr", smart_format=True, utterances=True)
            response = await deepgram.listen.asyncrest.v("1").transcribe_file(source, options)
            
            utterances = response.results.utterances if response.results else []
            if not utterances: raise ValueError("Transkript boş, muhtemelen sessiz bir dosya.")
                
            chapters = []
            chunk_text, start_time = "", 0
            for i, utt in enumerate(utterances):
                if not chunk_text: start_time = utt.start
                chunk_text += utt.transcript + " "
                if (utt.end - start_time) >= 180 or (i == len(utterances) - 1 and chunk_text.strip()):
                    comp_res = await deepseek.chat.completions.create(model="deepseek-chat", messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": chunk_text}], max_tokens=20)
                    title = comp_res.choices[0].message.content.strip().replace('"', '')
                    chapters.append({"time": format_time(start_time), "title": title})
                    chunk_text = ""

            task['chapters_json'] = json.dumps(chapters, ensure_ascii=False)
            task['title'] = Path(task['cleaned_filename']).stem
            return {**task, 'status': 'analyzed'}
        except DeepgramError as e:
            if e.err_code == 429:
                wait_time = (attempt + 1) * 5
                logging.warning(f"Hız limitine takıldı: {task['original_path']}. {wait_time} saniye bekleniyor...")
                await asyncio.sleep(wait_time)
            else:
                logging.error(f"Deepgram hatası: {task['original_path']} - {e}")
                return {**task, 'status': 'failed'}
        except Exception as e:
            logging.error(f"Genel analiz hatası: {task['original_path']} - {e}")
            return {**task, 'status': 'failed'}
    logging.error(f"3 deneme sonunda analiz başarısız oldu: {task['original_path']}")
    return {**task, 'status': 'failed'}

def analysis_thread_worker(task):
    return asyncio.run(analyze_single_file_async(task, AsyncOpenAI(api_key=DEEPSEEK_API_KEY, base_url="https://api.deepseek.com"), DeepgramClient(DEEPGRAM_API_KEY)))

# --- Ana İşlem Akışı ---
def main():
    if not DEEPGRAM_API_KEY or not DEEPSEEK_API_KEY:
        logging.error("Lütfen .env dosyanıza DEEPGRAM_API_KEY ve DEEPSEEK_API_KEY ekleyin.")
        return

    RAW_AUDIO_DIR.mkdir(exist_ok=True)
    MP3_AUDIO_DIR.mkdir(exist_ok=True)
    db_init()

    logging.info("===== ADIM 1: Ham Dosyalar Taranıyor ve Veritabanı Hazırlanıyor =====")
    db_log_initial_files()
    
    logging.info("\n===== ADIM 2: MP3'e Paralel Dönüştürme =====")
    tasks_to_convert = db_get_tasks('pending')
    if tasks_to_convert:
        file_counter = {}
        for task in tasks_to_convert:
            source = task['source_name']
            counter = file_counter.get(source, 0) + 1
            file_counter[source] = counter
            task['cleaned_filename'] = clean_filename(task['original_path'], source, counter)

        with concurrent.futures.ProcessPoolExecutor(max_workers=MAX_CONVERSION_WORKERS) as executor:
            results = list(tqdm(executor.map(convert_worker, tasks_to_convert), total=len(tasks_to_convert), desc="Dönüştürülüyor"))
        
        for res in results:
            if res['status'] == 'converted':
                db_update_task(res['id'], 'converted', mp3_path=res['mp3_path'], cleaned_filename=res['cleaned_filename'])
            else:
                db_update_task(res['id'], 'failed')
    else:
        logging.info("Dönüştürülecek yeni dosya yok.")

    logging.info("\n===== ADIM 3: Paralel Ses Analizi (Hız Limitli ve Güvenilir) =====")
    tasks_to_analyze = db_get_tasks('converted')
    if tasks_to_analyze:
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_ANALYSIS_WORKERS) as executor:
            futures = [executor.submit(analysis_thread_worker, task) for task in tasks_to_analyze]
            for future in tqdm(concurrent.futures.as_completed(futures), total=len(tasks_to_analyze), desc="Analiz Ediliyor"):
                res = future.result()
                if res['status'] == 'analyzed':
                    db_update_task(res['id'], 'analyzed', title=res['title'], chapters_json=res['chapters_json'])
                else:
                    db_update_task(res['id'], 'failed')
    else:
        logging.info("Analiz edilecek yeni dosya yok.")

    logging.info("\n===== TÜM İŞLEMLER TAMAMLANDI =====")
    logging.info(f"Hazır MP3 dosyaları: '{MP3_AUDIO_DIR}'")
    logging.info(f"Tüm veriler ve analizler: '{DB_PATH}'")

if __name__ == "__main__":
    main()