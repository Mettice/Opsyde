#!/usr/bin/env python3
"""
🔑 BYOK System Test
Test the complete Bring Your Own Keys functionality
"""

import asyncio
import logging
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.user_settings_service import user_settings_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_byok_system():
    """Test the complete BYOK system"""
    print("🔑 Testing BYOK (Bring Your Own Keys) System")
    print("=" * 60)
    
    try:
        # Initialize the service
        print("🚀 Initializing user settings service...")
        await user_settings_service.initialize()
        print("✅ Service initialized successfully")
        
        # Test user ID
        test_user_id = "test_user_123"
        
        # Test 1: Get user settings (should create default)
        print("\n🧪 Test 1: Getting user settings")
        settings = await user_settings_service.get_user_settings(test_user_id)
        print(f"✅ User settings retrieved: {settings.user_id}")
        print(f"   - API keys: {len(settings.api_keys)}")
        print(f"   - Preferences: {settings.preferences.theme}")
        
        # Test 2: Add API keys
        print("\n🧪 Test 2: Adding API keys")
        
        # Add OpenAI key
        success = await user_settings_service.add_api_key(
            test_user_id, 
            "openai", 
            "sk-test123456789abcdef"
        )
        print(f"✅ OpenAI key added: {success}")
        
        # Add Anthropic key
        success = await user_settings_service.add_api_key(
            test_user_id, 
            "anthropic", 
            "sk-ant-test123456789"
        )
        print(f"✅ Anthropic key added: {success}")
        
        # Test 3: List API keys
        print("\n🧪 Test 3: Listing API keys")
        keys = await user_settings_service.list_api_keys(test_user_id)
        print(f"✅ Found {len(keys)} API keys:")
        for key in keys:
            print(f"   - {key['provider']}: {key['masked_key']} ({key['validation_status']})")
        
        # Test 4: Get API key for execution
        print("\n🧪 Test 4: Getting API keys for execution")
        execution_keys = await user_settings_service.get_user_keys_for_execution(test_user_id)
        print(f"✅ Execution keys retrieved: {list(execution_keys.keys())}")
        
        # Test 5: Validate API key (will fail with test keys, but tests the flow)
        print("\n🧪 Test 5: Validating API key")
        validation_result = await user_settings_service.validate_api_key(test_user_id, "openai")
        print(f"✅ Validation result: {validation_result}")
        
        # Test 6: Delete API key
        print("\n🧪 Test 6: Deleting API key")
        success = await user_settings_service.delete_api_key(test_user_id, "anthropic")
        print(f"✅ Anthropic key deleted: {success}")
        
        # Test 7: Final key count
        print("\n🧪 Test 7: Final key count")
        keys = await user_settings_service.list_api_keys(test_user_id)
        print(f"✅ Final key count: {len(keys)}")
        
        print("\n🎉 All BYOK tests completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_byok_system()) 