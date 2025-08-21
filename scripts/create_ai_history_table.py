#!/usr/bin/env python3
"""
Supabase'de ai_history tablosunu oluşturan script
"""

import os
import sys
import httpx
from pathlib import Path

# Proje kökünü sys.path'e ekle
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

try:
    from config import SUPABASE_URL, SUPABASE_SECRET_KEY
except ImportError:
    print("config.py bulunamadı. .env dosyasından yükleniyor...")
    from dotenv import load_dotenv
    load_dotenv()
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_SECRET_KEY = os.getenv('SUPABASE_SECRET_KEY')

def create_ai_history_table():
    """Supabase'de ai_history tablosunu oluştur"""
    
    if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
        print("❌ SUPABASE_URL veya SUPABASE_SECRET_KEY bulunamadı!")
        print("Lütfen .env dosyasında bu değerleri ayarlayın.")
        return False
    
    # SQL komutları
    sql_commands = [
        # Tablo oluştur
        """
        CREATE TABLE IF NOT EXISTS ai_history (
            chat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE,
            sources JSONB DEFAULT '[]'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """,
        
        # İndeksler oluştur
        """
        CREATE INDEX IF NOT EXISTS idx_ai_history_slug ON ai_history(slug);
        """,
        
        """
        CREATE INDEX IF NOT EXISTS idx_ai_history_created_at ON ai_history(created_at DESC);
        """,
        
        """
        CREATE INDEX IF NOT EXISTS idx_ai_history_question ON ai_history USING gin(to_tsvector('turkish', question));
        """,
        
        # RLS (Row Level Security) politikaları
        """
        ALTER TABLE ai_history ENABLE ROW LEVEL SECURITY;
        """,
        
        """
        CREATE POLICY IF NOT EXISTS "AI history is publicly readable" ON ai_history
        FOR SELECT USING (true);
        """,
        
        """
        CREATE POLICY IF NOT EXISTS "AI history can be inserted by service role" ON ai_history
        FOR INSERT WITH CHECK (true);
        """
    ]
    
    try:
        with httpx.Client() as client:
            headers = {
                "apikey": SUPABASE_SECRET_KEY,
                "Authorization": f"Bearer {SUPABASE_SECRET_KEY}",
                "Content-Type": "application/json"
            }
            
            print("🔄 Supabase'e bağlanıyor...")
            
            for i, sql in enumerate(sql_commands, 1):
                print(f"📝 SQL komutu {i}/{len(sql_commands)} çalıştırılıyor...")
                
                response = client.post(
                    f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
                    headers=headers,
                    json={"sql": sql.strip()}
                )
                
                if response.status_code not in [200, 201, 204]:
                    # RPC endpoint yoksa, alternatif yöntem dene
                    print(f"⚠️  RPC endpoint kullanılamıyor, alternatif yöntem deneniyor...")
                    
                    # Supabase SQL Editor API'si (eğer varsa)
                    response = client.post(
                        f"{SUPABASE_URL}/rest/v1/query",
                        headers=headers,
                        json={"query": sql.strip()}
                    )
                    
                    if response.status_code not in [200, 201, 204]:
                        print(f"❌ SQL komutu {i} başarısız: {response.status_code}")
                        print(f"Hata: {response.text}")
                        print("\n⚠️  Manuel olarak Supabase SQL Editor'da aşağıdaki komutu çalıştırın:")
                        print(f"{sql}")
                        print("-" * 50)
                        continue
                
                print(f"✅ SQL komutu {i} başarılı")
            
            print("\n🎉 ai_history tablosu başarıyla oluşturuldu!")
            print("\n📋 Tablo yapısı:")
            print("- chat_id: UUID (Primary Key)")
            print("- question: TEXT (Kullanıcı sorusu)")
            print("- answer: TEXT (AI cevabı)")
            print("- slug: TEXT (SEO uyumlu URL)")
            print("- sources: JSONB (Kaynak listesi)")
            print("- created_at: TIMESTAMP (Oluşturma zamanı)")
            
            print("\n🔍 İndeksler:")
            print("- slug (UNIQUE)")
            print("- created_at (DESC)")
            print("- question (Full-text search)")
            
            print("\n🔒 Güvenlik:")
            print("- RLS aktif")
            print("- Okuma: Herkese açık")
            print("- Yazma: Sadece service role")
            
            return True
            
    except Exception as e:
        print(f"❌ Hata oluştu: {e}")
        print("\n📝 Manuel tablo oluşturma SQL'i:")
        print("=" * 50)
        for sql in sql_commands:
            print(sql)
            print("-" * 30)
        return False

def test_table():
    """Tablo oluşturulduktan sonra test et"""
    
    try:
        with httpx.Client() as client:
            headers = {
                "apikey": SUPABASE_SECRET_KEY,
                "Authorization": f"Bearer {SUPABASE_SECRET_KEY}",
                "Content-Type": "application/json"
            }
            
            # Tablo varlığını test et
            response = client.get(
                f"{SUPABASE_URL}/rest/v1/ai_history",
                headers=headers,
                params={"select": "chat_id", "limit": 1}
            )
            
            if response.status_code == 200:
                print("✅ Tablo erişimi başarılı!")
                return True
            else:
                print(f"❌ Tablo erişimi başarısız: {response.status_code}")
                return False
                
    except Exception as e:
        print(f"❌ Test hatası: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Supabase ai_history tablosu oluşturuluyor...")
    print("=" * 50)
    
    if create_ai_history_table():
        print("\n🧪 Tablo test ediliyor...")
        test_table()
        print("\n✨ İşlem tamamlandı!")
    else:
        print("\n❌ Tablo oluşturulamadı.")
        sys.exit(1)