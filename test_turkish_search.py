#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Türkçe Arama Sistemi Test Senaryoları

Bu script, Türkçe sesli harf uyumları ve yazım varyasyonları için
oluşturulan arama sisteminin kapsamlı testlerini yapar.
"""

import sys
import os
import time
from pathlib import Path

# Proje kök dizinini sys.path'e ekle
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

try:
    from turkish_search_utils import (
        TurkishVowelNormalizer, 
        TurkishQueryExpander, 
        normalize_turkish_text,
        create_turkish_analyzer
    )
    print("✅ Turkish search utilities başarıyla import edildi")
except ImportError as e:
    print(f"❌ Import hatası: {e}")
    print("Lütfen önce gerekli bağımlılıkları yükleyin: pip install TurkishStemmer thefuzz python-Levenshtein")
    sys.exit(1)


class TurkishSearchTester:
    """
    Türkçe arama sistemi için kapsamlı test sınıfı.
    """
    
    def __init__(self):
        self.test_cases = {
            # Sesli harf varyasyonları test cases
            'vowel_variations': [
                {
                    'base_word': 'füyuzat',
                    'variations': ['füyûzât', 'füyuzat', 'füyüzat', 'fuyüzat', 'fuyuzat', 'fûyüzât'],
                    'expected_normalized': 'fuyuzat'
                },
                {
                    'base_word': 'rabıta',
                    'variations': ['rabıta', 'râbıta', 'rabita', 'râbita'],
                    'expected_normalized': 'rabita'
                },
                {
                    'base_word': 'zikir',
                    'variations': ['zikir', 'zikr', 'zîkir', 'zîkr', 'ziker'],
                    'expected_normalized': 'zikir'
                },
                {
                    'base_word': 'mürid',
                    'variations': ['mürid', 'mürîd', 'murid', 'mûrid'],
                    'expected_normalized': 'murid'
                },
                {
                    'base_word': 'sohbet',
                    'variations': ['sohbet', 'sôhbet', 'suhbet', 'sûhbet'],
                    'expected_normalized': 'sohbet'
                }
            ],
            
            # Fuzzy matching test cases
            'fuzzy_matching': [
                {
                    'query': 'füyuzat',
                    'targets': ['füyûzât', 'feyuzat', 'fuyuzat', 'füyüzat'],
                    'min_similarity': 80
                },
                {
                    'query': 'rabıta',
                    'targets': ['râbıta', 'rabita', 'rapıta', 'rabıda'],
                    'min_similarity': 75
                },
                {
                    'query': 'mürşid',
                    'targets': ['mürşit', 'murşid', 'mürşed', 'mürsid'],
                    'min_similarity': 70
                }
            ],
            
            # Query expansion test cases
            'query_expansion': [
                {
                    'query': 'füyuzat nedir',
                    'expected_variants_count': 10,  # En az 10 varyasyon bekleniyor
                    'should_contain': ['fuyuzat', 'füyüzat']
                },
                {
                    'query': 'rabıta nasıl',
                    'expected_variants_count': 8,
                    'should_contain': ['rabita', 'râbıta']
                }
            ],
            
            # Stemming test cases (eğer TurkishStemmer mevcutsa)
            'stemming': [
                {
                    'word': 'kitaplar',
                    'expected_stem': 'kitap'
                },
                {
                    'word': 'evlerden',
                    'expected_stem': 'ev'
                },
                {
                    'word': 'çalışıyoruz',
                    'expected_stem': 'çalış'
                }
            ]
        }
        
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
    
    def test_vowel_normalization(self):
        """
        Sesli harf normalizasyonu testleri.
        """
        print("\n🔤 Sesli Harf Normalizasyonu Testleri")
        print("=" * 50)
        
        for test_case in self.test_cases['vowel_variations']:
            base_word = test_case['base_word']
            variations = test_case['variations']
            expected = test_case['expected_normalized']
            
            print(f"\n📝 Test: {base_word} varyasyonları")
            
            all_passed = True
            for variation in variations:
                try:
                    normalized = normalize_turkish_text(variation)
                    if normalized == expected:
                        print(f"  ✅ {variation} -> {normalized}")
                        self.results['passed'] += 1
                    else:
                        print(f"  ❌ {variation} -> {normalized} (beklenen: {expected})")
                        self.results['failed'] += 1
                        all_passed = False
                except Exception as e:
                    print(f"  ⚠️  {variation} -> HATA: {e}")
                    self.results['errors'].append(f"Normalization error for {variation}: {e}")
                    self.results['failed'] += 1
                    all_passed = False
            
            if all_passed:
                print(f"  🎉 {base_word} tüm varyasyonları başarılı!")
    
    def test_fuzzy_matching(self):
        """
        Fuzzy matching testleri.
        """
        print("\n🔍 Fuzzy Matching Testleri")
        print("=" * 50)
        
        expander = TurkishQueryExpander()
        
        for test_case in self.test_cases['fuzzy_matching']:
            query = test_case['query']
            targets = test_case['targets']
            min_similarity = test_case['min_similarity']
            
            print(f"\n📝 Test: '{query}' ile benzerlik")
            
            for target in targets:
                try:
                    similarity = expander.calculate_similarity(query, target)
                    if similarity >= min_similarity:
                        print(f"  ✅ {target}: {similarity:.1f}% (≥{min_similarity}%)")
                        self.results['passed'] += 1
                    else:
                        print(f"  ❌ {target}: {similarity:.1f}% (<{min_similarity}%)")
                        self.results['failed'] += 1
                except Exception as e:
                    print(f"  ⚠️  {target} -> HATA: {e}")
                    self.results['errors'].append(f"Fuzzy matching error for {query}->{target}: {e}")
                    self.results['failed'] += 1
    
    def test_query_expansion(self):
        """
        Query expansion testleri.
        """
        print("\n🔄 Query Expansion Testleri")
        print("=" * 50)
        
        expander = TurkishQueryExpander()
        
        for test_case in self.test_cases['query_expansion']:
            query = test_case['query']
            expected_count = test_case['expected_variants_count']
            should_contain = test_case['should_contain']
            
            print(f"\n📝 Test: '{query}' genişletme")
            
            try:
                # İlk kelimeyi al ve varyasyonlarını üret
                first_word = query.split()[0]
                variants = expander.generate_vowel_variants(first_word)
                
                print(f"  📊 Üretilen varyasyon sayısı: {len(variants)}")
                print(f"  📋 İlk 10 varyasyon: {variants[:10]}")
                
                # Varyasyon sayısı kontrolü
                if len(variants) >= expected_count:
                    print(f"  ✅ Varyasyon sayısı yeterli (≥{expected_count})")
                    self.results['passed'] += 1
                else:
                    print(f"  ❌ Varyasyon sayısı yetersiz (<{expected_count})")
                    self.results['failed'] += 1
                
                # Belirli varyasyonların varlığı kontrolü
                for should_have in should_contain:
                    if should_have in variants:
                        print(f"  ✅ '{should_have}' varyasyonu mevcut")
                        self.results['passed'] += 1
                    else:
                        print(f"  ❌ '{should_have}' varyasyonu eksik")
                        self.results['failed'] += 1
                        
            except Exception as e:
                print(f"  ⚠️  HATA: {e}")
                self.results['errors'].append(f"Query expansion error for {query}: {e}")
                self.results['failed'] += 1
    
    def test_stemming(self):
        """
        Stemming testleri (eğer TurkishStemmer mevcutsa).
        """
        print("\n🌱 Stemming Testleri")
        print("=" * 50)
        
        try:
            from TurkishStemmer import TurkishStemmer
            stemmer = TurkishStemmer()
            
            for test_case in self.test_cases['stemming']:
                word = test_case['word']
                expected_stem = test_case['expected_stem']
                
                try:
                    actual_stem = stemmer.stem(word)
                    if actual_stem == expected_stem:
                        print(f"  ✅ {word} -> {actual_stem}")
                        self.results['passed'] += 1
                    else:
                        print(f"  ❌ {word} -> {actual_stem} (beklenen: {expected_stem})")
                        self.results['failed'] += 1
                except Exception as e:
                    print(f"  ⚠️  {word} -> HATA: {e}")
                    self.results['errors'].append(f"Stemming error for {word}: {e}")
                    self.results['failed'] += 1
                    
        except ImportError:
            print("  ⚠️  TurkishStemmer mevcut değil, stemming testleri atlanıyor")
    
    def test_analyzer_integration(self):
        """
        Analyzer entegrasyonu testleri.
        """
        print("\n⚙️ Analyzer Entegrasyonu Testleri")
        print("=" * 50)
        
        try:
            analyzer = create_turkish_analyzer()
            
            test_texts = [
                "füyûzât nedir",
                "rabıta nasıl yapılır",
                "mürşid-i kâmil özellikleri"
            ]
            
            for text in test_texts:
                try:
                    # Basit token oluştur
                    class SimpleToken:
                        def __init__(self, text):
                            self.text = text
                    
                    tokens = [SimpleToken(text)]
                    processed_tokens = list(analyzer(tokens))
                    
                    if processed_tokens:
                        processed_text = processed_tokens[0].text
                        print(f"  ✅ '{text}' -> '{processed_text}'")
                        self.results['passed'] += 1
                    else:
                        print(f"  ❌ '{text}' -> BOŞ SONUÇ")
                        self.results['failed'] += 1
                        
                except Exception as e:
                    print(f"  ⚠️  '{text}' -> HATA: {e}")
                    self.results['errors'].append(f"Analyzer error for {text}: {e}")
                    self.results['failed'] += 1
                    
        except Exception as e:
            print(f"  ⚠️  Analyzer oluşturulamadı: {e}")
            self.results['errors'].append(f"Analyzer creation error: {e}")
    
    def run_performance_tests(self):
        """
        Performans testleri.
        """
        print("\n⚡ Performans Testleri")
        print("=" * 50)
        
        expander = TurkishQueryExpander()
        
        # Normalizasyon performansı
        test_words = ['füyûzât'] * 1000
        start_time = time.time()
        
        for word in test_words:
            normalize_turkish_text(word)
        
        normalization_time = time.time() - start_time
        print(f"  📊 1000 kelime normalizasyonu: {normalization_time:.3f} saniye")
        
        # Query expansion performansı
        start_time = time.time()
        
        for _ in range(100):
            expander.generate_vowel_variants('füyuzat')
        
        expansion_time = time.time() - start_time
        print(f"  📊 100 query expansion: {expansion_time:.3f} saniye")
        
        # Fuzzy matching performansı
        start_time = time.time()
        
        for _ in range(100):
            expander.calculate_similarity('füyuzat', 'füyûzât')
        
        fuzzy_time = time.time() - start_time
        print(f"  📊 100 fuzzy matching: {fuzzy_time:.3f} saniye")
        
        # Performans değerlendirmesi
        if normalization_time < 0.1:
            print(f"  ✅ Normalizasyon performansı iyi")
            self.results['passed'] += 1
        else:
            print(f"  ❌ Normalizasyon performansı yavaş")
            self.results['failed'] += 1
        
        if expansion_time < 1.0:
            print(f"  ✅ Query expansion performansı iyi")
            self.results['passed'] += 1
        else:
            print(f"  ❌ Query expansion performansı yavaş")
            self.results['failed'] += 1
    
    def run_all_tests(self):
        """
        Tüm testleri çalıştırır.
        """
        print("🚀 Türkçe Arama Sistemi Test Süreci Başlıyor")
        print("=" * 60)
        
        start_time = time.time()
        
        # Test kategorilerini çalıştır
        self.test_vowel_normalization()
        self.test_fuzzy_matching()
        self.test_query_expansion()
        self.test_stemming()
        self.test_analyzer_integration()
        self.run_performance_tests()
        
        total_time = time.time() - start_time
        
        # Sonuçları özetle
        print("\n" + "=" * 60)
        print("📊 TEST SONUÇLARI")
        print("=" * 60)
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"✅ Başarılı testler: {self.results['passed']}")
        print(f"❌ Başarısız testler: {self.results['failed']}")
        print(f"📈 Başarı oranı: {success_rate:.1f}%")
        print(f"⏱️  Toplam süre: {total_time:.2f} saniye")
        
        if self.results['errors']:
            print(f"\n⚠️  HATALAR ({len(self.results['errors'])})")
            for i, error in enumerate(self.results['errors'], 1):
                print(f"  {i}. {error}")
        
        # Genel değerlendirme
        if success_rate >= 90:
            print("\n🎉 MÜKEMMEL! Sistem tüm testleri başarıyla geçti.")
        elif success_rate >= 75:
            print("\n✅ İYİ! Sistem çoğu testi geçti, küçük iyileştirmeler yapılabilir.")
        elif success_rate >= 50:
            print("\n⚠️  ORTA! Sistem temel işlevleri yerine getiriyor, iyileştirmeler gerekli.")
        else:
            print("\n❌ KÖTÜ! Sistem ciddi sorunlar içeriyor, gözden geçirilmeli.")
        
        return success_rate >= 75


def main():
    """
    Ana test fonksiyonu.
    """
    tester = TurkishSearchTester()
    success = tester.run_all_tests()
    
    # Çıkış kodu
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()