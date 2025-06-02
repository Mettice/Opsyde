#!/usr/bin/env python3
"""
Test Supabase connection with different methods
"""

import asyncio
import os
import logging
import psycopg2
import aiohttp
from dotenv import load_dotenv
from urllib.parse import quote_plus

# Load environment variables
load_dotenv('.env')
load_dotenv('backend/.env')

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_supabase_connections():
    """Test all possible Supabase connection methods"""
    
    # Get environment variables
    SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
    SUPABASE_ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    SUPABASE_DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD")
    
    print("🔧 Supabase Connection Diagnostics")
    print("=" * 50)
    
    # Check environment variables
    print(f"✅ SUPABASE_URL: {SUPABASE_URL}")
    print(f"✅ SUPABASE_ANON_KEY: {SUPABASE_ANON_KEY[:20]}..." if SUPABASE_ANON_KEY else "❌ SUPABASE_ANON_KEY: Not set")
    print(f"✅ SUPABASE_SERVICE_KEY: {SUPABASE_SERVICE_KEY[:20]}..." if SUPABASE_SERVICE_KEY else "❌ SUPABASE_SERVICE_KEY: Not set")
    print(f"✅ SUPABASE_DB_PASSWORD: {'***' if SUPABASE_DB_PASSWORD else 'Not set'}")
    print()
    
    if not SUPABASE_URL:
        print("❌ SUPABASE_URL is required!")
        return
    
    # Extract project reference
    project_ref = SUPABASE_URL.split("//")[1].split(".")[0]
    print(f"📋 Project Reference: {project_ref}")
    print()
    
    # Test 1: REST API Connection
    print("🧪 Test 1: REST API Connection")
    try:
        async with aiohttp.ClientSession() as session:
            headers = {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
            }
            
            async with session.get(
                f"{SUPABASE_URL}/rest/v1/",
                headers=headers,
                timeout=10
            ) as response:
                if response.status == 200:
                    print("✅ REST API connection successful!")
                else:
                    print(f"❌ REST API failed: {response.status}")
                    text = await response.text()
                    print(f"   Response: {text[:200]}")
    except Exception as e:
        print(f"❌ REST API connection failed: {str(e)}")
    print()
    
    # Test 2: Direct PostgreSQL Connection (Transaction Mode)
    print("🧪 Test 2: Direct PostgreSQL (Transaction Mode)")
    if SUPABASE_DB_PASSWORD:
        try:
            encoded_password = quote_plus(SUPABASE_DB_PASSWORD)
            conn_string = f"postgresql://postgres:{encoded_password}@db.{project_ref}.supabase.co:5432/postgres"
            
            conn = psycopg2.connect(
                conn_string,
                sslmode="require",
                connect_timeout=10
            )
            cursor = conn.cursor()
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            print(f"✅ Direct PostgreSQL connection successful!")
            print(f"   Database version: {version[0][:50]}...")
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"❌ Direct PostgreSQL failed: {str(e)}")
    else:
        print("⏭️ Skipping - no database password")
    print()
    
    # Test 3: PostgreSQL Connection Pooler (Session Mode)
    print("🧪 Test 3: PostgreSQL Pooler (Session Mode)")
    if SUPABASE_DB_PASSWORD:
        try:
            encoded_password = quote_plus(SUPABASE_DB_PASSWORD)
            conn_string = f"postgresql://postgres:{encoded_password}@db.{project_ref}.supabase.co:6543/postgres"
            
            conn = psycopg2.connect(
                conn_string,
                sslmode="require",
                connect_timeout=10
            )
            cursor = conn.cursor()
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            print(f"✅ PostgreSQL Pooler connection successful!")
            print(f"   Database version: {version[0][:50]}...")
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"❌ PostgreSQL Pooler failed: {str(e)}")
    else:
        print("⏭️ Skipping - no database password")
    print()
    
    # Test 4: Check if tables exist via REST API
    print("🧪 Test 4: Check Tables via REST API")
    try:
        async with aiohttp.ClientSession() as session:
            headers = {
                "apikey": SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY}"
            }
            
            # Try to query user_api_keys table
            async with session.get(
                f"{SUPABASE_URL}/rest/v1/user_api_keys?select=id&limit=1",
                headers=headers,
                timeout=10
            ) as response:
                if response.status == 200:
                    print("✅ user_api_keys table exists and accessible!")
                elif response.status == 404:
                    print("❌ user_api_keys table does not exist")
                else:
                    print(f"❌ Table check failed: {response.status}")
                    text = await response.text()
                    print(f"   Response: {text[:200]}")
    except Exception as e:
        print(f"❌ Table check failed: {str(e)}")
    print()
    
    # Test 5: Alternative connection strings
    print("🧪 Test 5: Alternative Connection Methods")
    if SUPABASE_DB_PASSWORD:
        alternatives = [
            f"postgresql://postgres.{project_ref}:{SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
            f"postgresql://postgres.{project_ref}:{SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
        ]
        
        for i, conn_string in enumerate(alternatives, 1):
            try:
                print(f"   Testing alternative {i}...")
                conn = psycopg2.connect(
                    conn_string,
                    sslmode="require",
                    connect_timeout=5
                )
                cursor = conn.cursor()
                cursor.execute("SELECT 1;")
                result = cursor.fetchone()
                print(f"   ✅ Alternative {i} successful!")
                cursor.close()
                conn.close()
                break
            except Exception as e:
                print(f"   ❌ Alternative {i} failed: {str(e)}")
    
    print()
    print("🎯 Recommendations:")
    print("1. If REST API works but PostgreSQL doesn't, use REST API mode")
    print("2. If PostgreSQL Pooler (port 6543) works, use that instead of 5432")
    print("3. Check your network/firewall for PostgreSQL port blocking")
    print("4. Verify your database password is correct")

if __name__ == "__main__":
    asyncio.run(test_supabase_connections()) 