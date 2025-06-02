#!/usr/bin/env python3
"""
🔑 Test Execution Keys
Test script to verify API key retrieval for workflow execution
"""

import asyncio
import logging
import sys
import os
from dotenv import load_dotenv

# Load environment variables first
load_dotenv('.env')
load_dotenv('backend/.env')

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Initialize database first
from database import init_db
from services.supabase_user_settings_service import supabase_user_settings_service
from core.workflow_execution_context import create_execution_context

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_execution_keys():
    """Test API key retrieval for execution"""
    try:
        print("🔑 Testing API Key Retrieval for Execution...")
        
        # Debug environment variables
        print(f"🔧 SUPABASE_URL: {os.getenv('VITE_SUPABASE_URL')}")
        print(f"🔧 SUPABASE_DB_PASSWORD: {'***' if os.getenv('SUPABASE_DB_PASSWORD') else 'NOT SET'}")
        
        # Initialize database and create tables
        print(f"\n🗄️ Initializing database...")
        init_db()
        print(f"✅ Database initialized")
        
        # Use anonymous user for testing
        user_id = "anonymous"
        
        print(f"\n1️⃣ Testing direct API key retrieval...")
        api_keys = await supabase_user_settings_service.get_user_api_keys(user_id)
        print(f"✅ Retrieved {len(api_keys)} API keys:")
        for key in api_keys:
            print(f"   - {key.provider}: {key.masked_value} (status: {key.validation_status})")
        
        print(f"\n2️⃣ Testing execution keys retrieval...")
        execution_keys = await supabase_user_settings_service.get_user_keys_for_execution(user_id)
        print(f"✅ Retrieved {len(execution_keys)} execution keys:")
        for provider, key in execution_keys.items():
            print(f"   - {provider}: {key[:10]}...{key[-4:]} (length: {len(key)})")
        
        print(f"\n3️⃣ Testing workflow execution context...")
        context = await create_execution_context(user_id=user_id)
        context_info = context.get_context_info()
        print(f"✅ Created execution context:")
        print(f"   User ID: {context_info['user_id']}")
        print(f"   Available providers: {context_info['available_providers']}")
        print(f"   Total API keys: {context_info['total_api_keys']}")
        
        print(f"\n4️⃣ Testing specific framework key retrieval...")
        test_frameworks = ["perplexity", "openai", "anthropic", "google"]
        for framework in test_frameworks:
            key = context.get_api_key_for_framework(framework)
            if key:
                print(f"   ✅ {framework}: Found key ({len(key)} chars)")
            else:
                print(f"   ❌ {framework}: No key found")
        
        # If no keys found, let's add a test key
        if len(api_keys) == 0:
            print(f"\n🔧 No API keys found. Let's add a test OpenAI key...")
            test_key = os.getenv('OPENAI_API_KEY')
            if test_key and test_key.startswith('sk-'):
                success = await supabase_user_settings_service.add_api_key(user_id, "openai", test_key)
                if success:
                    print(f"✅ Added test OpenAI API key")
                    
                    # Test again
                    print(f"\n🔄 Re-testing after adding key...")
                    execution_keys = await supabase_user_settings_service.get_user_keys_for_execution(user_id)
                    print(f"✅ Retrieved {len(execution_keys)} execution keys:")
                    for provider, key in execution_keys.items():
                        print(f"   - {provider}: {key[:10]}...{key[-4:]} (length: {len(key)})")
                else:
                    print(f"❌ Failed to add test API key")
            else:
                print(f"⚠️ No valid OPENAI_API_KEY found in environment")
        
        print(f"\n🎉 All tests completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    asyncio.run(test_execution_keys()) 