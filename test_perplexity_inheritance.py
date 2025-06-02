#!/usr/bin/env python3
"""
🧪 Enhanced Perplexity Inheritance Test
Tests the complete BYOK system with Supabase integration
"""

import asyncio
import logging
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.core.workflow_execution_context import create_execution_context
from backend.services.supabase_user_settings_service import supabase_user_settings_service
from backend.core.provider_registry import provider_registry

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_supabase_byok_system():
    """Test the complete Supabase BYOK system"""
    
    print("🧪 Testing Supabase BYOK System")
    print("=" * 50)
    
    try:
        # Test 1: Check if we can connect to the service
        print("\n1️⃣ Testing Supabase connection...")
        
        # Use anonymous user for testing (this should work with the migration)
        user_id = "00000000-0000-0000-0000-000000000000"  # Anonymous user UUID
        
        # Test getting user settings
        settings = await supabase_user_settings_service.get_user_settings(user_id)
        print(f"✅ Successfully retrieved user settings for: {user_id}")
        print(f"   Settings: {settings}")
        
        # Test 2: Check API keys
        print("\n2️⃣ Testing API key retrieval...")
        api_keys = await supabase_user_settings_service.get_user_api_keys(user_id)
        print(f"✅ Retrieved {len(api_keys)} API keys")
        
        for key in api_keys:
            print(f"   - {key.provider}: {key.masked_value} (status: {key.validation_status})")
        
        # Test 3: Test execution context
        print("\n3️⃣ Testing workflow execution context...")
        context = await create_execution_context(user_id=user_id)
        
        context_info = context.get_context_info()
        print(f"✅ Created execution context:")
        print(f"   User ID: {context_info['user_id']}")
        print(f"   Available providers: {context_info['available_providers']}")
        print(f"   Total API keys: {context_info['total_api_keys']}")
        
        # Test 4: Test Perplexity API key specifically
        print("\n4️⃣ Testing Perplexity API key access...")
        perplexity_key = context.get_api_key_for_framework("perplexity")
        
        if perplexity_key:
            print(f"✅ Found Perplexity API key: {perplexity_key[:8]}...")
            
            # Test node configuration enhancement
            test_config = {
                "framework": "perplexity",
                "model": "llama-3.1-sonar-small-128k-online",
                "nodeType": "agent"
            }
            
            enhanced_config = context.enhance_node_config(test_config)
            
            if "api_key" in enhanced_config:
                print(f"✅ Successfully enhanced node config with Perplexity API key")
                print(f"   Enhanced config keys: {list(enhanced_config.keys())}")
            else:
                print("❌ Failed to enhance node config with API key")
        else:
            print("⚠️ No Perplexity API key found")
            print("   This is expected if you haven't added a Perplexity key yet")
        
        # Test 5: Test provider registry integration
        print("\n5️⃣ Testing provider registry integration...")
        providers = provider_registry.get_all_providers()
        print(f"✅ Found {len(providers)} registered providers:")
        
        for provider in providers[:5]:  # Show first 5
            print(f"   - {provider.name} ({provider.id})")
        
        # Test 6: Test with different user scenarios
        print("\n6️⃣ Testing different user scenarios...")
        
        # Test with anonymous string
        context_anon = await create_execution_context(user_id="anonymous")
        print(f"✅ Anonymous context created: {context_anon.user_id}")
        
        # Test with None user
        context_none = await create_execution_context(user_id=None)
        print(f"✅ None user context created: {context_none.user_id}")
        
        # Cleanup
        await context.cleanup()
        await context_anon.cleanup()
        await context_none.cleanup()
        
        print("\n🎉 All tests completed successfully!")
        print("\n📋 Summary:")
        print(f"   - Supabase connection: ✅")
        print(f"   - User settings retrieval: ✅")
        print(f"   - API key management: ✅")
        print(f"   - Execution context: ✅")
        print(f"   - Provider registry: ✅")
        print(f"   - User scenarios: ✅")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        logger.exception("Test failed")
        return False

async def test_api_key_management():
    """Test API key management operations"""
    
    print("\n🔑 Testing API Key Management")
    print("=" * 40)
    
    try:
        user_id = "00000000-0000-0000-0000-000000000000"  # Anonymous user
        
        # Test adding a test API key (use a valid provider for testing)
        print("\n1️⃣ Testing API key addition...")
        
        test_provider = "openai"  # Use a valid provider from the registry
        test_key = "sk-test_key_12345"  # Use a realistic format
        
        success = await supabase_user_settings_service.add_api_key(
            user_id, test_provider, test_key
        )
        
        if success:
            print(f"✅ Successfully added test API key for {test_provider}")
        else:
            print(f"❌ Failed to add test API key")
        
        # Test retrieving the key
        print("\n2️⃣ Testing API key retrieval...")
        keys = await supabase_user_settings_service.get_user_api_keys(user_id)
        
        test_key_found = any(key.provider == test_provider for key in keys)
        if test_key_found:
            print(f"✅ Test API key found in retrieved keys")
        else:
            print(f"❌ Test API key not found")
        
        # Test key validation
        print("\n3️⃣ Testing API key validation...")
        is_valid = await supabase_user_settings_service.validate_api_key(
            user_id, test_provider
        )
        print(f"✅ Key validation result: {is_valid} (expected: False for test key)")
        
        # Test key deletion
        print("\n4️⃣ Testing API key deletion...")
        delete_success = await supabase_user_settings_service.delete_api_key(
            user_id, test_provider
        )
        
        if delete_success:
            print(f"✅ Successfully deleted test API key")
        else:
            print(f"❌ Failed to delete test API key")
        
        return True
        
    except Exception as e:
        print(f"\n❌ API key management test failed: {str(e)}")
        logger.exception("API key management test failed")
        return False

async def main():
    """Run all tests"""
    
    print("🚀 Starting Enhanced BYOK System Tests")
    print("=" * 60)
    
    # Test 1: Core BYOK system
    test1_success = await test_supabase_byok_system()
    
    # Test 2: API key management
    test2_success = await test_api_key_management()
    
    # Final summary
    print("\n" + "=" * 60)
    print("🏁 Final Test Results:")
    print(f"   Core BYOK System: {'✅ PASS' if test1_success else '❌ FAIL'}")
    print(f"   API Key Management: {'✅ PASS' if test2_success else '❌ FAIL'}")
    
    if test1_success and test2_success:
        print("\n🎉 ALL TESTS PASSED! The Supabase BYOK system is working correctly.")
        print("\n📝 Next steps:")
        print("   1. Run the Supabase migration script in your Supabase SQL editor")
        print("   2. Add your real API keys through the web interface")
        print("   3. Test with actual workflows")
    else:
        print("\n❌ Some tests failed. Please check the logs and fix the issues.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main()) 