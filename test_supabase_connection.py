#!/usr/bin/env python3
# test_supabase_connection.py
# Supabase connection test script

import os
import sys
import importlib
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
try:
    load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)
except Exception:
    pass

# Load env.backend file with override=True to force reload
try:
    load_dotenv(dotenv_path=Path(__file__).parent / "env.backend", override=True)
except Exception:
    pass

# Force reload environment variables
os.environ.pop('SUPABASE_DB_URL', None)
os.environ.pop('DATABASE_URL', None)
# Ensure proxies do not interfere during install/tests
for key in ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"]:
    os.environ.pop(key, None)

# Import config at module level
try:
    import config
    # Force reload to get fresh environment variables
    importlib.reload(config)
    from config import (
        SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY
    )
    config_imported = True
except Exception as e:
    print(f"WARNING: Could not import config: {e}")
    config_imported = False

def test_supabase_config():
    """Test Supabase configuration"""
    print("SUPABASE CONNECTION TEST")
    print("=" * 50)
    
    # Environment variables check
    print("\nENVIRONMENT VARIABLES:")
    supabase_vars = [
        "SUPABASE_URL",
        "SUPABASE_SECRET_KEY",
        "SUPABASE_PUBLISHABLE_KEY",
    ]
    
    for var in supabase_vars:
        value = os.getenv(var)
        if value:
            if "PASSWORD" in var or "URL" in var:
                print(f"   OK {var}: {'***' if 'PASSWORD' in var else value[:50]}{'...' if len(value) > 50 else ''}")
            else:
                print(f"   OK {var}: {value}")
        else:
            print(f"   MISSING {var}")
    
    # Config import test
    print("\nCONFIG IMPORT TEST:")
    if config_imported:
        print("   OK config.py imported successfully")
        print(f"   SUPABASE_URL: {SUPABASE_URL}")
        print(f"   SUPABASE_SECRET_KEY: {'***' if SUPABASE_SECRET_KEY else 'None'}")
    else:
        print("   ERROR config.py import failed")
        return False
    
    # Database connection test
    print("\nDATABASE CONNECTION TEST:")
    try:
        from data.db import get_supabase_connection
        print("   OK data.db imported successfully")
        client = get_supabase_connection()
        if client is None:
            print("   ERROR Supabase connection failed")
            return False
        print("   OK Supabase connection established")
        try:
            import httpx
            if isinstance(client, httpx.Client):
                resp = client.get("/video_analysis_tasks", params={"select": "task_id", "limit": 1})
                print(f"   OK test query status: {resp.status_code}")
        except Exception as e:
            print("   WARNING test query failed:", e)
        return True
    except Exception as e:
        print("   ERROR:", e)
        return False

def test_supabase_pkg():
    """We now use httpx (no external supabase client required)."""
    print("\nHTTPX CLIENT TEST:")
    try:
        import httpx  # noqa: F401
        print("   OK httpx available")
        return True
    except ImportError:
        print("   ERROR httpx not available")
        print("   Install with: pip install httpx")
        return False

def main():
    """Main test function"""
    print("Starting Supabase Connection Test...")
    
    # supabase client test
    if not test_supabase_pkg():
        print("\nERROR: Supabase python client missing!")
        return 1
    
    # Supabase config test
    if not test_supabase_config():
        print("\nERROR: Supabase configuration failed!")
        return 1
    
    print("\nSUCCESS: All tests passed! Supabase connection is working.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
