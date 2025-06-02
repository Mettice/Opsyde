#!/usr/bin/env python3
import os
from dotenv import load_dotenv

print("🔍 Testing environment variable loading...")

# Test loading from different paths
print("\n📁 Current working directory:", os.getcwd())

# Try loading from current directory
load_dotenv('.env')
print(f"📊 VITE_SUPABASE_URL from .env: {os.getenv('VITE_SUPABASE_URL')}")
print(f"📊 VITE_SUPABASE_ANON_KEY from .env: {os.getenv('VITE_SUPABASE_ANON_KEY')}")

# Try loading from backend/.env
load_dotenv('backend/.env')
print(f"📊 VITE_SUPABASE_URL from backend/.env: {os.getenv('VITE_SUPABASE_URL')}")
print(f"📊 VITE_SUPABASE_ANON_KEY from backend/.env: {os.getenv('VITE_SUPABASE_ANON_KEY')}")

# Check if .env file exists
env_files = ['.env', 'backend/.env', '../.env']
for env_file in env_files:
    exists = os.path.exists(env_file)
    print(f"📁 {env_file} exists: {exists}")
    if exists:
        with open(env_file, 'r') as f:
            content = f.read()
            print(f"📄 {env_file} content preview: {content[:200]}...") 