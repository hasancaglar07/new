#!/usr/bin/env python3
# Optimized version of populate_vector_db.py for low memory systems

import os
import sys
import logging
import json
import sqlite3
import gc
import psutil
from pathlib import Path
from typing import List, Dict, Any
import fitz  # PyMuPDF
from whoosh.index import open_dir
from whoosh.qparser import MultifieldParser
import argparse

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from data.vector_db import get_vector_db, init_vector_db
from data.articles_db import get_all_articles_by_category
from data.audio_db import get_all_audio_by_source
from config import *

# Configuration
WHOOSH_INDEX_PATH = INDEX_DIR
MEMORY_THRESHOLD = 85  # Stop if memory usage exceeds this percentage
SMALL_BATCH_SIZE = 25  # For low memory systems
NORMAL_BATCH_SIZE = 50  # For normal systems

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_memory_usage():
    """Get current memory usage percentage"""
    return psutil.virtual_memory().percent

def check_memory_and_adjust():
    """Check memory usage and return appropriate batch size"""
    memory_percent = get_memory_usage()
    
    if memory_percent > MEMORY_THRESHOLD:
        logger.warning(f"High memory usage detected: {memory_percent:.1f}%")
        return SMALL_BATCH_SIZE // 2  # Very small batches
    elif memory_percent > 70:
        logger.info(f"Moderate memory usage: {memory_percent:.1f}% - Using small batches")
        return SMALL_BATCH_SIZE
    else:
        logger.info(f"Normal memory usage: {memory_percent:.1f}% - Using normal batches")
        return NORMAL_BATCH_SIZE

def force_garbage_collection():
    """Force garbage collection and log memory usage"""
    before = get_memory_usage()
    gc.collect()
    after = get_memory_usage()
    if before - after > 1:  # Only log if significant reduction
        logger.info(f"Memory cleanup: {before:.1f}% -> {after:.1f}%")

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Split text into overlapping chunks"""
    if len(text) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        
        # Try to break at sentence boundary
        if end < len(text):
            # Look for sentence endings
            for i in range(end, max(start + chunk_size // 2, end - 100), -1):
                if text[i] in '.!?\n':
                    end = i + 1
                    break
        
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        
        start = end - overlap
        if start >= len(text):
            break
    
    return chunks

def populate_articles_optimized(force_update=False, max_articles=None):
    """
    Optimized article population with memory management
    """
    logger.info("Starting optimized article processing...")
    
    try:
        vector_db = get_vector_db()
        articles_by_category = get_all_articles_by_category()
        total_articles = sum(len(articles) for articles in articles_by_category.values())
        
        if max_articles:
            logger.info(f"Limiting to {max_articles} articles for testing")
        
        logger.info(f"Found {total_articles} articles to process")
        
        total_processed = 0
        total_added = 0
        
        for category, articles in articles_by_category.items():
            logger.info(f"Processing category: {category} ({len(articles)} articles)")
            
            # Limit articles if specified
            if max_articles and total_processed >= max_articles:
                break
                
            category_articles = articles[:max_articles - total_processed] if max_articles else articles
            
            # Dynamic batch size based on memory
            batch_size = check_memory_and_adjust()
            
            for batch_start in range(0, len(category_articles), batch_size):
                # Check memory before each batch
                memory_percent = get_memory_usage()
                if memory_percent > MEMORY_THRESHOLD:
                    logger.error(f"Memory usage too high: {memory_percent:.1f}%. Stopping.")
                    break
                
                batch_articles = category_articles[batch_start:batch_start + batch_size]
                documents = []
                
                try:
                    for article in batch_articles:
                        content = article.get('content', '')
                        if len(content) > 100:  # Skip very short content
                            
                            # Smaller chunks for memory efficiency
                            chunks = chunk_text(content, chunk_size=600, overlap=80)
                            
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
                    
                    # Process batch
                    if documents:
                        vector_ids = vector_db.add_documents(documents, skip_duplicates=not force_update)
                        batch_added = len(vector_ids) if vector_ids else 0
                        total_added += batch_added
                        total_processed += len(batch_articles)
                        
                        logger.info(
                            f"Batch: {len(batch_articles)} articles -> {len(documents)} chunks -> "
                            f"{batch_added} added | Progress: {total_processed}/{total_articles} "
                            f"| Memory: {get_memory_usage():.1f}%"
                        )
                    
                    # Aggressive memory cleanup
                    documents.clear()
                    del documents
                    del batch_articles
                    force_garbage_collection()
                    
                except Exception as e:
                    logger.error(f"Error processing batch: {e}")
                    continue
        
        logger.info(f"Article processing completed: {total_processed} articles, {total_added} vectors added")
        
    except Exception as e:
        logger.error(f"Error in populate_articles_optimized: {e}")
        raise

def populate_small_batches(data_type='articles', batch_size=10, force_update=False):
    """
    Process data in very small batches for extremely low memory systems
    """
    logger.info(f"Starting micro-batch processing for {data_type} (batch size: {batch_size})")
    
    if data_type == 'articles':
        articles_by_category = get_all_articles_by_category()
        all_articles = []
        
        for category, articles in articles_by_category.items():
            for article in articles:
                article['category'] = category
                all_articles.append(article)
        
        logger.info(f"Processing {len(all_articles)} articles in micro-batches")
        
        vector_db = get_vector_db()
        total_added = 0
        
        for i in range(0, len(all_articles), batch_size):
            batch = all_articles[i:i + batch_size]
            
            # Check memory before each micro-batch
            memory_percent = get_memory_usage()
            if memory_percent > MEMORY_THRESHOLD:
                logger.error(f"Memory too high: {memory_percent:.1f}%. Stopping.")
                break
            
            documents = []
            
            for article in batch:
                content = article.get('content', '')
                if len(content) > 100:
                    # Very small chunks
                    chunks = chunk_text(content, chunk_size=400, overlap=50)
                    
                    for j, chunk in enumerate(chunks):
                        documents.append({
                            'content': chunk,
                            'source_type': 'article',
                            'source_id': f"{article.get('id', '')}_{j}",
                            'title': article.get('title', ''),
                            'author': article.get('author', ''),
                            'url': f"/makaleler/{article.get('id', '')}",
                            'category': article.get('category', '')
                        })
            
            if documents:
                vector_ids = vector_db.add_documents(documents, skip_duplicates=not force_update)
                batch_added = len(vector_ids) if vector_ids else 0
                total_added += batch_added
                
                logger.info(
                    f"Micro-batch {i//batch_size + 1}: {len(batch)} articles -> "
                    f"{len(documents)} chunks -> {batch_added} added | "
                    f"Memory: {get_memory_usage():.1f}%"
                )
            
            # Cleanup
            documents.clear()
            del documents
            del batch
            force_garbage_collection()
        
        logger.info(f"Micro-batch processing completed: {total_added} vectors added")

def main():
    parser = argparse.ArgumentParser(description='Optimized Vector Database Population')
    parser.add_argument('--mode', choices=['normal', 'micro', 'test'], default='normal',
                       help='Processing mode: normal, micro-batches, or test')
    parser.add_argument('--batch-size', type=int, default=None,
                       help='Custom batch size')
    parser.add_argument('--max-articles', type=int, default=None,
                       help='Maximum number of articles to process (for testing)')
    parser.add_argument('--force', action='store_true',
                       help='Force update (ignore duplicates)')
    parser.add_argument('--memory-check', action='store_true',
                       help='Check memory before starting')
    
    args = parser.parse_args()
    
    # Memory check
    if args.memory_check:
        memory_percent = get_memory_usage()
        logger.info(f"Current memory usage: {memory_percent:.1f}%")
        
        if memory_percent > 80:
            logger.error("Memory usage too high to start safely. Close other applications.")
            return
    
    try:
        # Initialize vector database
        logger.info("Initializing vector database...")
        vector_db = get_vector_db()
        
        if args.mode == 'micro':
            batch_size = args.batch_size or 5
            populate_small_batches('articles', batch_size, args.force)
        elif args.mode == 'test':
            max_articles = args.max_articles or 50
            populate_articles_optimized(args.force, max_articles)
        else:
            populate_articles_optimized(args.force, args.max_articles)
        
        # Final stats
        stats = vector_db.get_stats()
        logger.info(f"Final stats: {stats}")
        
    except KeyboardInterrupt:
        logger.info("Process interrupted by user")
    except Exception as e:
        logger.error(f"Error: {e}")
        raise

if __name__ == "__main__":
    main()