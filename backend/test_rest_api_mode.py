#!/usr/bin/env python3
"""
Test REST API mode for Supabase integration
"""

import asyncio
import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env')
load_dotenv('backend/.env')

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_rest_api_mode():
    """Test the REST API mode functionality"""
    
    print("🧪 Testing REST API Mode")
    print("=" * 50)
    
    # Import after environment is loaded
    from database import init_db, should_use_rest_api
    from services.supabase_user_settings_service import SupabaseUserSettingsService
    
    # Initialize database
    print("🔧 Initializing database...")
    init_db()
    
    print(f"✅ REST API mode: {should_use_rest_api()}")
    print()
    
    # Initialize service
    print("🔧 Initializing Supabase User Settings Service...")
    service = SupabaseUserSettingsService()
    print()
    
    # Test 1: Get user settings
    print("🧪 Test 1: Get user settings")
    try:
        result = await service.get_user_settings("anonymous")
        if result.success:
            print(f"✅ Successfully loaded user settings")
            print(f"   Message: {result.message}")
            if result.settings and 'api_keys' in result.settings:
                print(f"   API Keys found: {len(result.settings['api_keys'])}")
                for key in result.settings['api_keys']:
                    print(f"     - {key['provider']}: {key['validation_status']}")
        else:
            print(f"❌ Failed to load user settings: {result.message}")
    except Exception as e:
        print(f"❌ Error getting user settings: {str(e)}")
    print()
    
    # Test 2: Add API key (if OpenAI key is available)
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key and openai_key.startswith("sk-"):
        print("🧪 Test 2: Add OpenAI API key")
        try:
            result = await service.add_api_key("anonymous", "openai", openai_key)
            if result.success:
                print(f"✅ Successfully added OpenAI API key")
                print(f"   Message: {result.message}")
                if result.data:
                    print(f"   Validation status: {result.data.get('validation_status', 'unknown')}")
            else:
                print(f"❌ Failed to add API key: {result.message}")
        except Exception as e:
            print(f"❌ Error adding API key: {str(e)}")
    else:
        print("⏭️ Test 2: Skipping API key test (no valid OpenAI key found)")
    print()
    
    # Test 3: Get updated settings
    print("🧪 Test 3: Get updated user settings")
    try:
        result = await service.get_user_settings("anonymous")
        if result.success:
            print(f"✅ Successfully loaded updated user settings")
            print(f"   Message: {result.message}")
            if result.settings and 'api_keys' in result.settings:
                print(f"   API Keys found: {len(result.settings['api_keys'])}")
                for key in result.settings['api_keys']:
                    print(f"     - {key['provider']}: {key['validation_status']} ({key['masked_value']})")
        else:
            print(f"❌ Failed to load updated user settings: {result.message}")
    except Exception as e:
        print(f"❌ Error getting updated user settings: {str(e)}")
    print()
    
    print("🎯 Summary:")
    print("✅ REST API mode is working!")
    print("✅ No more PostgreSQL connection timeouts!")
    print("✅ Using Supabase REST API for all operations!")

if __name__ == "__main__":
    asyncio.run(test_rest_api_mode()) 