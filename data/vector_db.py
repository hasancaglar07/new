# data/vector_db.py
# FAISS vektör veritabanı yönetimi

import os
import json
import pickle
import logging
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import faiss
from sentence_transformers import SentenceTransformer
import sqlite3
from datetime import datetime

logger = logging.getLogger(__name__)

class VectorDatabase:
    """
    FAISS tabanlı vektör veritabanı yöneticisi
    """
    
    def __init__(self, db_path: str = "data/vector_db", model_name: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"):
        self.db_path = Path(db_path)
        self.db_path.mkdir(exist_ok=True)
        
        # FAISS index dosyaları
        self.index_file = self.db_path / "faiss.index"
        self.metadata_file = self.db_path / "metadata.json"
        self.embeddings_file = self.db_path / "embeddings.pkl"
        
        # SQLite metadata veritabanı
        self.sqlite_db = self.db_path / "vector_metadata.db"
        
        # Sentence transformer model
        self.model_name = model_name
        self.model = None
        self.dimension = 384  # MiniLM-L12-v2 dimension
        
        # FAISS index
        self.index = None
        self.metadata = []
        
        # Initialize
        self._init_model()
        self._init_sqlite()
        self._load_or_create_index()
    
    def _init_model(self):
        """Sentence transformer modelini yükle"""
        try:
            logger.info(f"Loading sentence transformer model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            self.dimension = self.model.get_sentence_embedding_dimension()
            logger.info(f"Model loaded successfully. Dimension: {self.dimension}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    def _init_sqlite(self):
        """SQLite metadata veritabanını başlat"""
        try:
            conn = sqlite3.connect(self.sqlite_db)
            cursor = conn.cursor()
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS vector_metadata (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    vector_id INTEGER UNIQUE,
                    source_type TEXT NOT NULL,
                    source_id TEXT NOT NULL,
                    title TEXT,
                    author TEXT,
                    content TEXT,
                    page_number INTEGER,
                    timestamp TEXT,
                    url TEXT,
                    embedding_model TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_source_type ON vector_metadata(source_type)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_source_id ON vector_metadata(source_id)
            """)
            
            conn.commit()
            conn.close()
            logger.info("SQLite metadata database initialized")
        except Exception as e:
            logger.error(f"Failed to initialize SQLite: {e}")
            raise
    
    def _download_from_backblaze(self):
        """Backblaze'den FAISS index ve metadata dosyalarını indir"""
        try:
            import requests
            
            # FAISS index dosyasını indir
            index_url = "https://cdn.mihmandar.org/file/yediulya-databases/vector_db/faiss.index"
            metadata_url = "https://cdn.mihmandar.org/file/yediulya-databases/vector_db/vector_metadata.db"
            
            logger.info("Downloading FAISS index from Backblaze...")
            
            # FAISS index indir
            response = requests.get(index_url, timeout=60)
            if response.status_code == 200:
                with open(self.index_file, 'wb') as f:
                    f.write(response.content)
                logger.info(f"Downloaded FAISS index: {self.index_file}")
            else:
                logger.warning(f"Failed to download FAISS index: {response.status_code}")
                return False
            
            # Metadata DB indir
            response = requests.get(metadata_url, timeout=60)
            if response.status_code == 200:
                with open(self.sqlite_db, 'wb') as f:
                    f.write(response.content)
                logger.info(f"Downloaded metadata DB: {self.sqlite_db}")
            else:
                logger.warning(f"Failed to download metadata DB: {response.status_code}")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to download from Backblaze: {e}")
            return False
    
    def _load_or_create_index(self):
        """FAISS index'i yükle veya oluştur"""
        try:
            if self.index_file.exists():
                logger.info("Loading existing FAISS index")
                self.index = faiss.read_index(str(self.index_file))
                logger.info(f"Loaded FAISS index with {self.index.ntotal} vectors")
            else:
                # Backblaze'den indirmeyi dene
                if self._download_from_backblaze():
                    logger.info("Downloaded FAISS index from Backblaze")
                    self.index = faiss.read_index(str(self.index_file))
                    logger.info(f"Loaded FAISS index with {self.index.ntotal} vectors")
                else:
                    logger.info("Creating new FAISS index")
                    # L2 distance kullanarak IndexFlatL2 oluştur
                    self.index = faiss.IndexFlatL2(self.dimension)
                    logger.info(f"Created new FAISS index with dimension {self.dimension}")
        except Exception as e:
            logger.error(f"Failed to load/create FAISS index: {e}")
            # Fallback: yeni index oluştur
            self.index = faiss.IndexFlatL2(self.dimension)
    
    def add_documents(self, documents: List[Dict[str, Any]], skip_duplicates: bool = True) -> List[int]:
        """
        Belgeleri vektör veritabanına ekle (duplicate detection ile)
        
        Args:
            documents: Liste of dicts with keys: content, source_type, source_id, title, author, etc.
            skip_duplicates: True ise mevcut source_id'leri atla
        
        Returns:
            List of vector IDs
        """
        if not documents:
            return []
        
        try:
            # Duplicate kontrolü
            if skip_duplicates:
                documents = self._filter_duplicates(documents)
                if not documents:
                    logger.info("All documents already exist, skipping...")
                    return []
            
            # Metinleri çıkar
            texts = [doc.get('content', '') for doc in documents]
            
            # Embeddings oluştur
            logger.info(f"Creating embeddings for {len(texts)} documents")
            embeddings = self.model.encode(texts, convert_to_numpy=True)
            
            # FAISS'e ekle
            start_id = self.index.ntotal
            self.index.add(embeddings.astype('float32'))
            
            # Metadata'yı SQLite'a kaydet
            vector_ids = []
            conn = sqlite3.connect(self.sqlite_db)
            cursor = conn.cursor()
            
            for i, doc in enumerate(documents):
                vector_id = start_id + i
                vector_ids.append(vector_id)
                
                cursor.execute("""
                    INSERT OR REPLACE INTO vector_metadata 
                    (vector_id, source_type, source_id, title, author, content, 
                     page_number, timestamp, url, embedding_model)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    vector_id,
                    doc.get('source_type', ''),
                    doc.get('source_id', ''),
                    doc.get('title', ''),
                    doc.get('author', ''),
                    doc.get('content', ''),
                    doc.get('page_number'),
                    doc.get('timestamp'),
                    doc.get('url'),
                    self.model_name
                ))
            
            conn.commit()
            conn.close()
            
            # Index'i kaydet
            self.save_index()
            
            logger.info(f"Added {len(documents)} documents to vector database")
            return vector_ids
            
        except Exception as e:
            logger.error(f"Failed to add documents: {e}")
            return []
    
    def _filter_duplicates(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Mevcut source_id'leri filtrele (duplicate detection)
        """
        try:
            if not documents:
                return documents
            
            # Mevcut source_id'leri al
            conn = sqlite3.connect(self.sqlite_db)
            cursor = conn.cursor()
            
            # Tüm mevcut source_id'leri çek
            cursor.execute("SELECT DISTINCT source_id FROM vector_metadata")
            existing_source_ids = set(row[0] for row in cursor.fetchall())
            conn.close()
            
            # Yeni belgeleri filtrele
            filtered_documents = []
            skipped_count = 0
            
            for doc in documents:
                source_id = doc.get('source_id', '')
                if source_id not in existing_source_ids:
                    filtered_documents.append(doc)
                else:
                    skipped_count += 1
            
            if skipped_count > 0:
                logger.info(f"Skipped {skipped_count} duplicate documents")
            
            return filtered_documents
            
        except Exception as e:
            logger.error(f"Failed to filter duplicates: {e}")
            return documents  # Hata durumunda orijinal listeyi döndür
    
    def search(self, query: str, k: int = 10, source_types: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Anlamsal arama yap
        
        Args:
            query: Arama sorgusu
            k: Döndürülecek sonuç sayısı
            source_types: Filtrelenecek kaynak türleri
        
        Returns:
            List of search results with metadata
        """
        try:
            if self.index.ntotal == 0:
                logger.warning("Vector database is empty")
                return []
            
            # Query embedding oluştur
            query_embedding = self.model.encode([query], convert_to_numpy=True)
            
            # FAISS'te ara
            distances, indices = self.index.search(query_embedding.astype('float32'), k * 2)  # Fazladan al, filtreleme için
            
            # Metadata'yı getir
            results = []
            conn = sqlite3.connect(self.sqlite_db)
            cursor = conn.cursor()
            
            for i, (distance, vector_id) in enumerate(zip(distances[0], indices[0])):
                if vector_id == -1:  # FAISS boş slot
                    continue
                
                cursor.execute("""
                    SELECT * FROM vector_metadata WHERE vector_id = ?
                """, (int(vector_id),))
                
                row = cursor.fetchone()
                if row:
                    metadata = {
                        'vector_id': row[1],
                        'source_type': row[2],
                        'source_id': row[3],
                        'title': row[4],
                        'author': row[5],
                        'content': row[6],
                        'page_number': row[7],
                        'timestamp': row[8],
                        'url': row[9],
                        'embedding_model': row[10],
                        'distance': float(distance),
                        'similarity': 1.0 / (1.0 + float(distance))  # Distance'ı similarity'ye çevir
                    }
                    
                    # Kaynak türü filtresi
                    if source_types is None or metadata['source_type'] in source_types:
                        results.append(metadata)
            
            conn.close()
            
            # Similarity'ye göre sırala ve k tane döndür
            results.sort(key=lambda x: x['similarity'], reverse=True)
            return results[:k]
            
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []
    
    def get_similar_documents(self, vector_id: int, k: int = 5) -> List[Dict[str, Any]]:
        """
        Belirli bir vektöre benzer belgeleri bul
        """
        try:
            if vector_id >= self.index.ntotal:
                return []
            
            # Vektörü al
            vector = self.index.reconstruct(vector_id)
            
            # Benzer vektörleri ara
            distances, indices = self.index.search(vector.reshape(1, -1), k + 1)  # +1 çünkü kendisi de gelecek
            
            # Metadata'yı getir (kendisi hariç)
            results = []
            conn = sqlite3.connect(self.sqlite_db)
            cursor = conn.cursor()
            
            for distance, idx in zip(distances[0], indices[0]):
                if idx != vector_id and idx != -1:  # Kendisi ve boş slot değilse
                    cursor.execute("""
                        SELECT * FROM vector_metadata WHERE vector_id = ?
                    """, (int(idx),))
                    
                    row = cursor.fetchone()
                    if row:
                        metadata = {
                            'vector_id': row[1],
                            'source_type': row[2],
                            'source_id': row[3],
                            'title': row[4],
                            'author': row[5],
                            'content': row[6],
                            'page_number': row[7],
                            'timestamp': row[8],
                            'url': row[9],
                            'distance': float(distance),
                            'similarity': 1.0 / (1.0 + float(distance))
                        }
                        results.append(metadata)
            
            conn.close()
            return results
            
        except Exception as e:
            logger.error(f"Failed to get similar documents: {e}")
            return []
    
    def delete_by_source(self, source_type: str, source_id: str) -> int:
        """
        Belirli bir kaynağın tüm vektörlerini sil
        
        Note: FAISS deletion is complex, so we mark as deleted in metadata
        """
        try:
            conn = sqlite3.connect(self.sqlite_db)
            cursor = conn.cursor()
            
            cursor.execute("""
                DELETE FROM vector_metadata 
                WHERE source_type = ? AND source_id = ?
            """, (source_type, source_id))
            
            deleted_count = cursor.rowcount
            conn.commit()
            conn.close()
            
            logger.info(f"Deleted {deleted_count} vectors for {source_type}:{source_id}")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Failed to delete vectors: {e}")
            return 0
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Vektör veritabanı istatistikleri
        """
        try:
            conn = sqlite3.connect(self.sqlite_db)
            cursor = conn.cursor()
            
            # Toplam vektör sayısı
            cursor.execute("SELECT COUNT(*) FROM vector_metadata")
            total_vectors = cursor.fetchone()[0]
            
            # Kaynak türlerine göre dağılım
            cursor.execute("""
                SELECT source_type, COUNT(*) 
                FROM vector_metadata 
                GROUP BY source_type
            """)
            source_distribution = dict(cursor.fetchall())
            
            # En son eklenen
            cursor.execute("""
                SELECT created_at 
                FROM vector_metadata 
                ORDER BY created_at DESC 
                LIMIT 1
            """)
            last_added = cursor.fetchone()
            last_added = last_added[0] if last_added else None
            
            conn.close()
            
            return {
                'total_vectors': total_vectors,
                'faiss_total': self.index.ntotal,
                'dimension': self.dimension,
                'model_name': self.model_name,
                'source_distribution': source_distribution,
                'last_added': last_added,
                'index_file_exists': self.index_file.exists(),
                'db_size_mb': self.index_file.stat().st_size / (1024*1024) if self.index_file.exists() else 0
            }
            
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {}
    
    def save_index(self):
        """FAISS index'i diske kaydet"""
        try:
            faiss.write_index(self.index, str(self.index_file))
            logger.debug("FAISS index saved")
        except Exception as e:
            logger.error(f"Failed to save FAISS index: {e}")
    
    def rebuild_index(self):
        """
        Index'i sıfırdan yeniden oluştur (metadata'dan)
        """
        try:
            logger.info("Rebuilding FAISS index from metadata")
            
            # Yeni index oluştur
            new_index = faiss.IndexFlatL2(self.dimension)
            
            # Metadata'dan tüm belgeleri al
            conn = sqlite3.connect(self.sqlite_db)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT content FROM vector_metadata 
                ORDER BY vector_id
            """)
            
            contents = [row[0] for row in cursor.fetchall()]
            conn.close()
            
            if contents:
                # Embeddings oluştur ve ekle
                embeddings = self.model.encode(contents, convert_to_numpy=True)
                new_index.add(embeddings.astype('float32'))
            
            # Eski index'i değiştir
            self.index = new_index
            self.save_index()
            
            logger.info(f"Index rebuilt with {self.index.ntotal} vectors")
            
        except Exception as e:
            logger.error(f"Failed to rebuild index: {e}")

# Global instance
_vector_db = None

def get_vector_db() -> VectorDatabase:
    """Global vektör veritabanı instance'ını getir"""
    global _vector_db
    if _vector_db is None:
        _vector_db = VectorDatabase()
    return _vector_db

def init_vector_db():
    """Vektör veritabanını başlat"""
    try:
        db = get_vector_db()
        logger.info("Vector database initialized successfully")
        stats = db.get_stats()
        logger.info(f"Vector DB stats: {stats}")
        return db
    except Exception as e:
        logger.error(f"Failed to initialize vector database: {e}")
        return None