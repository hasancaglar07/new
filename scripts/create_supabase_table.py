import os
import sys

try:
    import psycopg2
except Exception as e:
    print("ERR: psycopg2 not installed:", e)
    sys.exit(1)


def main() -> int:
    dsn = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")
    if not dsn:
        print("ERR: SUPABASE_DB_URL (veya DATABASE_URL) boş")
        return 2

    try:
        conn = psycopg2.connect(dsn)
        conn.autocommit = True
    except Exception as e:
        print("ERR: Supabase bağlantı hatası:", e)
        return 3

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS public.video_analysis_tasks (
                    task_id TEXT PRIMARY KEY,
                    status TEXT NOT NULL,
                    message TEXT,
                    result JSONB,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
                """
            )
            cur.execute("SELECT to_regclass('public.video_analysis_tasks')")
            reg = cur.fetchone()[0]
            print("TABLE:", reg)
            return 0
    except Exception as e:
        print("ERR: Tablo oluşturma/okuma hatası:", e)
        return 4
    finally:
        try:
            conn.close()
        except Exception:
            pass


if __name__ == "__main__":
    sys.exit(main())


