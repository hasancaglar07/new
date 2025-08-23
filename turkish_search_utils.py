# -*- coding: utf-8 -*-
"""
Türkçe Arama Optimizasyonu Modülü

Bu modül Türkçe sesli harf uyumları ve yazım varyasyonları için
whoosh arama motorunda tutarlı sonuçlar sağlar.
"""

import re
from typing import List, Dict, Set, Tuple
from whoosh.analysis import Filter, RegexTokenizer, LowercaseFilter
from whoosh.query import Or, Term, And, FuzzyTerm
from thefuzz import fuzz
try:
    from TurkishStemmer import TurkishStemmer
    TURKISH_STEMMER_AVAILABLE = True
except ImportError:
    TURKISH_STEMMER_AVAILABLE = False
    print("Warning: TurkishStemmer not available. Install with: pip install TurkishStemmer")


class TurkishVowelNormalizer(Filter):
    """
    Türkçe sesli harf varyasyonlarını normalize eden filter.
    
    Örnek: füyûzât, füyuzat, füyüzat -> fuyuzat
    """
    
    def __init__(self):
        # Sesli harf grupları - aynı anlama gelen varyasyonlar
        self.vowel_groups = {
            'a': ['a', 'â', 'à'],
            'e': ['e', 'ê', 'è'], 
            'i': ['i', 'î', 'ì', 'ı'],
            'o': ['o', 'ô', 'ò'],
            'u': ['u', 'û', 'ù', 'ü', 'ű'],
            'ö': ['ö', 'ő']
        }
        
        # Ters mapping oluştur - her varyasyonu temel harfe çevir
        self.normalize_map = {}
        for base, variants in self.vowel_groups.items():
            for variant in variants:
                self.normalize_map[variant] = base
                # Büyük harfler için de mapping ekle
                self.normalize_map[variant.upper()] = base.upper()
    
    def __call__(self, tokens):
        for token in tokens:
            # Her karakteri normalize et
            normalized = ''.join(
                self.normalize_map.get(char, char) 
                for char in token.text
            )
            token.text = normalized
            yield token


class TurkishStemFilter(Filter):
    """
    Türkçe stemming için filter.
    
    TurkishStemmer kütüphanesini kullanarak kelimeleri kök hallerine indirgir.
    """
    
    def __init__(self):
        if TURKISH_STEMMER_AVAILABLE:
            self.stemmer = TurkishStemmer()
        else:
            self.stemmer = None
    
    def __call__(self, tokens):
        for token in tokens:
            if self.stemmer and len(token.text) > 2:  # Çok kısa kelimeleri stem etme
                try:
                    stemmed = self.stemmer.stem(token.text)
                    if stemmed and len(stemmed) > 1:  # Geçerli stem kontrolü
                        token.text = stemmed
                except Exception:
                    pass  # Stemming başarısız olursa orijinal kelimeyi koru
            yield token


class TurkishQueryExpander:
    """
    Türkçe sorgular için query expansion ve fuzzy matching.
    """
    
    def __init__(self):
        self.vowel_variants = {
            'a': ['a', 'â', 'à'],
            'e': ['e', 'ê', 'è'],
            'i': ['i', 'î', 'ì', 'ı'],
            'o': ['o', 'ô', 'ò'],
            'u': ['u', 'û', 'ù', 'ü'],
            'ö': ['ö']
        }
        
        # Türkçe stop words (opsiyonel)
        self.stop_words = {
            'bir', 'bu', 'şu', 'o', 've', 'ile', 'için', 'gibi', 'kadar',
            'daha', 'en', 'çok', 'az', 'var', 'yok', 'da', 'de', 'ta', 'te'
        }
    
    def generate_vowel_variants(self, word: str, max_variants: int = 50) -> List[str]:
        """
        Bir kelime için sesli harf varyasyonlarını üretir.
        
        Args:
            word: Orijinal kelime
            max_variants: Maksimum varyasyon sayısı
            
        Returns:
            Kelime varyasyonları listesi
        """
        if not word or len(word) < 2:
            return [word]
        
        variants = {word.lower()}
        
        # Her sesli harf pozisyonu için varyasyonlar üret
        for i, char in enumerate(word.lower()):
            if char in self.vowel_variants:
                new_variants = set()
                for variant in list(variants):
                    for vowel in self.vowel_variants[char]:
                        new_word = variant[:i] + vowel + variant[i+1:]
                        new_variants.add(new_word)
                        
                        # Maksimum varyasyon kontrolü
                        if len(variants) + len(new_variants) > max_variants:
                            break
                    
                    if len(variants) + len(new_variants) > max_variants:
                        break
                
                variants.update(new_variants)
                
                if len(variants) > max_variants:
                    break
        
        return list(variants)[:max_variants]
    
    def create_expanded_query(self, query_text: str, field_name: str = "content") -> Or:
        """
        Sorgu metnini tüm varyasyonlarıyla genişletir.
        
        Args:
            query_text: Arama metni
            field_name: Aranacak alan adı
            
        Returns:
            Genişletilmiş whoosh query objesi
        """
        words = [w.lower().strip() for w in query_text.split() if w.strip()]
        words = [w for w in words if w not in self.stop_words and len(w) > 1]
        
        if not words:
            return Term(field_name, query_text.lower())
        
        word_queries = []
        
        for word in words:
            # Her kelime için varyasyonlar üret
            variants = self.generate_vowel_variants(word)
            
            # Her varyasyon için Term oluştur
            variant_terms = [Term(field_name, variant) for variant in variants]
            
            # Kelime varyasyonlarını OR ile birleştir
            if len(variant_terms) > 1:
                word_queries.append(Or(variant_terms))
            else:
                word_queries.append(variant_terms[0])
        
        # Tüm kelimeleri AND ile birleştir
        if len(word_queries) > 1:
            return And(word_queries)
        else:
            return word_queries[0] if word_queries else Term(field_name, query_text.lower())
    
    def create_fuzzy_query(self, query_text: str, field_name: str = "content", max_dist: int = 2) -> Or:
        """
        Fuzzy matching ile sorgu oluşturur.
        
        Args:
            query_text: Arama metni
            field_name: Aranacak alan adı
            max_dist: Maksimum edit distance
            
        Returns:
            Fuzzy whoosh query objesi
        """
        words = [w.lower().strip() for w in query_text.split() if w.strip()]
        words = [w for w in words if w not in self.stop_words and len(w) > 2]
        
        if not words:
            return FuzzyTerm(field_name, query_text.lower(), maxdist=max_dist)
        
        fuzzy_terms = []
        for word in words:
            fuzzy_terms.append(FuzzyTerm(field_name, word, maxdist=max_dist))
        
        if len(fuzzy_terms) > 1:
            return And(fuzzy_terms)
        else:
            return fuzzy_terms[0]
    
    def calculate_similarity(self, text1: str, text2: str) -> float:
        """
        İki metin arasındaki benzerlik skorunu hesaplar.
        
        Args:
            text1: İlk metin
            text2: İkinci metin
            
        Returns:
            0-100 arası benzerlik skoru
        """
        if not text1 or not text2:
            return 0.0
        
        # Metinleri normalize et
        normalizer = TurkishVowelNormalizer()
        
        # Basit token oluştur
        class SimpleToken:
            def __init__(self, text):
                self.text = text
        
        # Normalize et
        token1 = SimpleToken(text1.lower())
        token2 = SimpleToken(text2.lower())
        
        normalized1 = list(normalizer([token1]))[0].text
        normalized2 = list(normalizer([token2]))[0].text
        
        # Fuzzy ratio hesapla
        return fuzz.ratio(normalized1, normalized2)


# Önceden yapılandırılmış analyzer'lar
def create_turkish_analyzer():
    """
    Türkçe için optimize edilmiş analyzer oluşturur.
    
    Returns:
        Whoosh analyzer objesi
    """
    return (RegexTokenizer() | 
            LowercaseFilter() | 
            TurkishVowelNormalizer() |
            TurkishStemFilter())


def create_basic_turkish_analyzer():
    """
    Temel Türkçe analyzer (stemming olmadan).
    
    Returns:
        Whoosh analyzer objesi
    """
    return (RegexTokenizer() | 
            LowercaseFilter() | 
            TurkishVowelNormalizer())


# Utility fonksiyonlar
def normalize_turkish_text(text: str) -> str:
    """
    Türkçe metni normalize eder.
    
    Args:
        text: Normalize edilecek metin
        
    Returns:
        Normalize edilmiş metin
    """
    if not text:
        return text
    
    normalizer = TurkishVowelNormalizer()
    
    class SimpleToken:
        def __init__(self, text):
            self.text = text
    
    token = SimpleToken(text.lower())
    normalized_token = list(normalizer([token]))[0]
    
    return normalized_token.text


def test_turkish_search_utils():
    """
    Türkçe arama utilities'lerini test eder.
    """
    print("=== Türkçe Arama Utilities Test ===")
    
    # Vowel normalizer test
    test_words = ["füyûzât", "füyuzat", "füyüzat", "fuyüzat", "fuyuzat", "fûyüzât"]
    
    print("\n1. Sesli Harf Normalizasyonu:")
    for word in test_words:
        normalized = normalize_turkish_text(word)
        print(f"  {word} -> {normalized}")
    
    # Query expansion test
    expander = TurkishQueryExpander()
    
    print("\n2. Sorgu Genişletme:")
    test_query = "füyuzat"
    variants = expander.generate_vowel_variants(test_query)
    print(f"  '{test_query}' varyasyonları: {variants[:10]}...")  # İlk 10 varyasyon
    
    # Similarity test
    print("\n3. Benzerlik Testi:")
    base_word = "füyuzat"
    for word in test_words:
        similarity = expander.calculate_similarity(base_word, word)
        print(f"  '{base_word}' vs '{word}': {similarity}%")
    
    print("\n=== Test Tamamlandı ===")


if __name__ == "__main__":
    test_turkish_search_utils()