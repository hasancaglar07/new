#!/usr/bin/env python3
# populate_vector_db.py
# Vektör veritabanını mevcut verilerle doldur

import os
import sys
import logging
import json
import sqlite3
from pathlib import Path
from typing import List, Dict, Any
import fitz  # PyMuPDF
from whoosh.index import open_dir
from whoosh.qparser import MultifieldParser

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from data.vector_db import get_vector_db, init_vector_db
from data.articles_db import get_all_articles_by_category
from data.audio_db import get_all_audio_by_source
from config import *

# WHOOSH_INDEX_PATH tanımla
WHOOSH_INDEX_PATH = INDEX_DIR

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """
    Metni örtüşen parçalara böl
    """
    if len(text) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        
        # Kelime sınırında kes
        if end < len(text):
            # Son boşluğu bul
            last_space = text.rfind(' ', start, end)
            if last_space > start:
                end = last_space
        
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        
        start = end - overlap
        if start >= len(text):
            break
    
    return chunks

def populate_from_books(force_update=False):
    """
    Kitaplardan vektör veritabanını doldur (incremental update)
    """
    logger.info("Checking books for updates...")
    
    try:
        # Whoosh index'in var olup olmadığını kontrol et
        if not WHOOSH_INDEX_PATH.exists():
            logger.warning(f"Whoosh index not found at {WHOOSH_INDEX_PATH}")
            return
        
        # Force update değilse, duplicate detection kullan
        vector_db = get_vector_db()
        if not force_update:
            stats = vector_db.get_stats()
            existing_book_count = stats.get('source_distribution', {}).get('book', 0)
            if existing_book_count > 0:
                logger.info(f"Books already indexed ({existing_book_count} vectors). Using duplicate detection...")
        else:
            logger.info("Force update mode - will reprocess all books")
            
        logger.info("Populating vector database from books...")
        
        # Whoosh index'ten kitapları al
        ix = open_dir(str(WHOOSH_INDEX_PATH))
        documents = []
        
        with ix.searcher() as searcher:
            # Tüm kitap belgelerini al
            for doc in searcher.documents():
                if doc.get('type') == 'book':
                    content = doc.get('content', '')
                    if len(content) > 100:  # Çok kısa içerikleri atla
                        
                        # Uzun metinleri parçalara böl
                        chunks = chunk_text(content, chunk_size=800, overlap=100)
                        
                        for i, chunk in enumerate(chunks):
                            documents.append({
                                'content': chunk,
                                'source_type': 'book',
                                'source_id': f"{doc.get('id', '')}_{i}",
                                'title': doc.get('title', ''),
                                'author': doc.get('author', ''),
                                'page_number': doc.get('page'),
                                'url': f"/kitaplar/{doc.get('id', '')}"
                            })
        
        logger.info(f"Found {len(documents)} book chunks")
        
        # Vektör veritabanına ekle
        if documents:
            vector_ids = vector_db.add_documents(documents, skip_duplicates=not force_update)
            logger.info(f"Added {len(vector_ids)} book vectors to database")
        
    except Exception as e:
        logger.error(f"Failed to populate from books: {e}")

def populate_from_articles(force_update=False):
    """
    Makalelerden vektör veritabanını doldur (incremental update)
    """
    logger.info("Checking articles for updates...")
    
    try:
        # Force update kontrolü
        vector_db = get_vector_db()
        
        # Tüm makaleleri al
        articles_by_category = get_all_articles_by_category()
        total_articles = sum(len(articles) for articles in articles_by_category.values())
        
        if not force_update:
            stats = vector_db.get_stats()
            existing_article_count = stats.get('source_distribution', {}).get('article', 0)
            if existing_article_count > 0:
                logger.info(f"Articles already indexed ({existing_article_count} vectors). Using duplicate detection...")
        else:
            logger.info("Force update mode - will reprocess all articles")
            
        logger.info(f"Populating vector database from articles... (Found {total_articles} articles)")
        
        # Memory-efficient batch processing
        BATCH_SIZE = 50  # Küçük batch size bellek kullanımını azaltır
        total_processed = 0
        total_added = 0
        
        for category, articles in articles_by_category.items():
            logger.info(f"Processing category: {category} ({len(articles)} articles)")
            
            # Articles'ı batch'lere böl
            for batch_start in range(0, len(articles), BATCH_SIZE):
                batch_articles = articles[batch_start:batch_start + BATCH_SIZE]
                documents = []
                
                for article in batch_articles:
                    content = article.get('content', '')
                    if len(content) > 100:  # Çok kısa içerikleri atla
                        
                        # Uzun makaleleri parçalara böl
                        chunks = chunk_text(content, chunk_size=800, overlap=100)  # Küçük chunk size
                        
                        for i, chunk in enumerate(chunks):
                            documents.append({
                                'content': chunk,
                                'source_type': 'article',
                                'source_id': f"{article.get('id', '')}_{i}",
                                'title': article.get('title', ''),
                                'author': article.get('author', ''),
                                'url': f"/makaleler/{article.get('id', '')}",
                                'category': category
                            })
                
                # Batch'i işle
                if documents:
                    vector_ids = vector_db.add_documents(documents, skip_duplicates=not force_update)
                    batch_added = len(vector_ids) if vector_ids else 0
                    total_added += batch_added
                    total_processed += len(batch_articles)
                    
                    logger.info(f"Batch processed: {len(batch_articles)} articles -> {len(documents)} chunks -> {batch_added} added (Total: {total_processed}/{total_articles})")
                    
                    # Memory cleanup
                    documents.clear()
                    del documents
                    
                    # Garbage collection
                    import gc
                    gc.collect()
        
        logger.info(f"Article processing completed: {total_processed} articles processed, {total_added} vectors added to database")
        
    except Exception as e:
        logger.error(f"Failed to populate from articles: {e}")

def populate_from_audio(force_update=False):
    """
    Ses kayıtlarından vektör veritabanını doldur (incremental update)
    """
    logger.info("Checking audio records for updates...")
    
    try:
        # Force update kontrolü
        vector_db = get_vector_db()
        
        if not force_update:
            stats = vector_db.get_stats()
            existing_audio_count = stats.get('source_distribution', {}).get('audio', 0)
            if existing_audio_count > 0:
                logger.info(f"Audio already indexed ({existing_audio_count} vectors). Using duplicate detection...")
        else:
            logger.info("Force update mode - will reprocess all audio")
            
        logger.info("Populating vector database from audio...")
        
        # Tüm ses kayıtlarını al
        audio_records = get_all_audio_by_source()
        documents = []
        
        # audio_records bir dict ise, values() kullan
        if isinstance(audio_records, dict):
            audio_list = []
            for source_audios in audio_records.values():
                if isinstance(source_audios, list):
                    audio_list.extend(source_audios)
                else:
                    audio_list.append(source_audios)
            audio_records = audio_list
        
        for audio in audio_records:
            # audio bir tuple ise dict'e çevir
            if isinstance(audio, (tuple, list)):
                # Varsayılan tuple yapısı: (id, title, description, speaker, duration, source, file_path)
                if len(audio) >= 4:
                    audio_dict = {
                        'id': audio[0],
                        'title': audio[1] if len(audio) > 1 else '',
                        'description': audio[2] if len(audio) > 2 else '',
                        'speaker': audio[3] if len(audio) > 3 else '',
                        'duration': audio[4] if len(audio) > 4 else '',
                        'source': audio[5] if len(audio) > 5 else '',
                    }
                    audio = audio_dict
                else:
                    continue
            
            # Başlık ve açıklama birleştir
            content_parts = []
            
            title = audio.get('title', '') if isinstance(audio, dict) else str(audio)
            description = audio.get('description', '') if isinstance(audio, dict) else ''
            speaker = audio.get('speaker', '') if isinstance(audio, dict) else ''
            
            if title:
                content_parts.append(f"Başlık: {title}")
            
            if description:
                content_parts.append(f"Açıklama: {description}")
            
            if speaker:
                content_parts.append(f"Konuşmacı: {speaker}")
            
            content = " ".join(content_parts)
            
            if len(content) > 50:  # Çok kısa içerikleri atla
                audio_id = audio.get('id', '') if isinstance(audio, dict) else str(audio)
                documents.append({
                    'content': content,
                    'source_type': 'audio',
                    'source_id': str(audio_id),
                    'title': title,
                    'author': speaker,
                    'timestamp': audio.get('duration', '') if isinstance(audio, dict) else '',
                    'url': f"/ses-kayitlari?id={audio_id}"
                })
        
        logger.info(f"Found {len(documents)} audio records")
        
        # Vektör veritabanına ekle
        if documents:
            vector_ids = vector_db.add_documents(documents, skip_duplicates=not force_update)
            logger.info(f"Added {len(vector_ids)} audio vectors to database")
        
    except Exception as e:
        logger.error(f"Failed to populate from audio: {e}")

def populate_from_video_analyses(force_update=False):
    """
    Video analizlerinden vektör veritabanını doldur (incremental update)
    """
    logger.info("Checking video analyses for updates...")
    
    try:
        # Video analiz veritabanından al
        from data.db import get_all_completed_analyses
        
        # Force update kontrolü
        vector_db = get_vector_db()
        
        analyses = get_all_completed_analyses()
        total_analyses = len(analyses) if isinstance(analyses, dict) else len(analyses)
        
        if not force_update:
            stats = vector_db.get_stats()
            existing_video_count = stats.get('source_distribution', {}).get('video', 0)
            if existing_video_count > 0:
                logger.info(f"Video analyses already indexed ({existing_video_count} vectors). Using duplicate detection...")
        else:
            logger.info("Force update mode - will reprocess all video analyses")
            
        logger.info(f"Populating vector database from video analyses... (Found {total_analyses} analyses)")
        
        documents = []
        
        # analyses bir dict ise, values() kullan
        if isinstance(analyses, dict):
            analyses_list = list(analyses.values())
        else:
            analyses_list = analyses
        
        for analysis in analyses_list:
            # analysis bir tuple ise dict'e çevir
            if isinstance(analysis, (tuple, list)):
                # Varsayılan tuple yapısı kontrol et
                if len(analysis) >= 3:
                    analysis_dict = {
                        'task_id': analysis[0] if len(analysis) > 0 else '',
                        'title': analysis[1] if len(analysis) > 1 else 'Video Analizi',
                        'summary': analysis[2] if len(analysis) > 2 else '',
                        'url': analysis[3] if len(analysis) > 3 else '',
                        'created_at': analysis[4] if len(analysis) > 4 else ''
                    }
                    analysis = analysis_dict
                else:
                    continue
            
            summary = analysis.get('summary', '') if isinstance(analysis, dict) else str(analysis)
            if len(summary) > 100:  # Çok kısa analizleri atla
                
                # Uzun analizleri parçalara böl
                chunks = chunk_text(summary, chunk_size=800, overlap=100)
                
                task_id = analysis.get('task_id', '') if isinstance(analysis, dict) else str(analysis)
                title = analysis.get('title', 'Video Analizi') if isinstance(analysis, dict) else 'Video Analizi'
                url = analysis.get('url', '') if isinstance(analysis, dict) else ''
                created_at = analysis.get('created_at', '') if isinstance(analysis, dict) else ''
                
                for i, chunk in enumerate(chunks):
                    documents.append({
                        'content': chunk,
                        'source_type': 'video',
                        'source_id': f"{task_id}_{i}",
                        'title': title,
                        'author': 'Video Analizi',
                        'url': url,
                        'timestamp': created_at
                    })
        
        logger.info(f"Found {len(documents)} video analysis chunks")
        
        # Vektör veritabanına ekle
        if documents:
            vector_ids = vector_db.add_documents(documents, skip_duplicates=not force_update)
            logger.info(f"Added {len(vector_ids)} video analysis vectors to database")
        
    except Exception as e:
        logger.error(f"Failed to populate from video analyses: {e}")

def main():
    """
    Ana fonksiyon - tüm veri kaynaklarından vektör veritabanını doldur
    """
    import argparse
    
    # Command line argümanları
    parser = argparse.ArgumentParser(description='Populate vector database with incremental updates')
    parser.add_argument('--force', '-f', action='store_true', help='Force update all sources even if already indexed')
    parser.add_argument('--books-only', action='store_true', help='Only process books')
    parser.add_argument('--articles-only', action='store_true', help='Only process articles')
    parser.add_argument('--audio-only', action='store_true', help='Only process audio')
    parser.add_argument('--video-only', action='store_true', help='Only process video analyses')
    
    args = parser.parse_args()
    
    logger.info("Starting vector database population...")
    if args.force:
        logger.info("Force update mode enabled - will reprocess all sources")
    
    try:
        # Vektör veritabanını başlat
        vector_db = init_vector_db()
        if not vector_db:
            logger.error("Failed to initialize vector database")
            return
        
        # Mevcut istatistikleri göster
        initial_stats = vector_db.get_stats()
        logger.info(f"Initial stats: {initial_stats}")
        
        # Seçili kaynaklardan doldur
        if args.books_only:
            populate_from_books(force_update=args.force)
        elif args.articles_only:
            populate_from_articles(force_update=args.force)
        elif args.audio_only:
            populate_from_audio(force_update=args.force)
        elif args.video_only:
            populate_from_video_analyses(force_update=args.force)
        else:
            # Tüm kaynaklardan doldur
            populate_from_books(force_update=args.force)
            populate_from_articles(force_update=args.force)
            populate_from_audio(force_update=args.force)
            populate_from_video_analyses(force_update=args.force)
        
        # Final istatistikleri göster
        final_stats = vector_db.get_stats()
        logger.info(f"Final stats: {final_stats}")
        
        # Index'i kaydet
        vector_db.save_index()
        
        logger.info("Vector database population completed successfully!")
        
        # Test araması yap
        logger.info("Testing search functionality...")
        test_results = vector_db.search("tasavvuf nedir", k=3)
        logger.info(f"Test search returned {len(test_results)} results")
        for i, result in enumerate(test_results[:2]):
            logger.info(f"Result {i+1}: {result['title']} (similarity: {result['similarity']:.3f})")
        
    except Exception as e:
        logger.error(f"Population failed: {e}")
        raise

if __name__ == "__main__":
    main()