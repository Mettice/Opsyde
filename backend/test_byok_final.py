#!/usr/bin/env python3
"""
🎉 Final BYOK Test - End-to-End Verification
"""

import asyncio
from services.supabase_rest_service import supabase_rest_service

async def test_byok_system():
    print("🎉 Final BYOK System Test")
    print("=" * 40)
    
    # Test direct database query to see what's actually stored
    print("\n1. 🔍 Direct Database Query...")
    try:
        keys = await supabase_rest_service.get_user_api_keys('anonymous')
        print(f"   ✅ API Keys found: {len(keys)}")
        
        for key in keys:
            print(f"   🔑 Provider: {key.get('provider_id')}")
            print(f"      Masked: {key.get('masked_value')}")
            print(f"      Status: {key.get('validation_status')}")
            print(f"      Created: {key.get('created_at')}")
            print(f"      Active: {key.get('is_active')}")
            print("   " + "-" * 30)
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test saving a Perplexity key
    print("\n2. 🧪 Testing Perplexity Key Save...")
    test_perplexity_key = "pplx-test-key-12345"
    
    try:
        result = await supabase_rest_service.save_user_api_key('anonymous', 'perplexity', test_perplexity_key)
        print(f"   Save result: {'✅ Success' if result else '❌ Failed'}")
        
        # Check what's in the database now
        keys_after = await supabase_rest_service.get_user_api_keys('anonymous')
        print(f"   Keys after save: {len(keys_after)}")
        
        for key in keys_after:
            if key.get('provider_id') == 'perplexity':
                print(f"   🎯 Found Perplexity key: {key.get('masked_value')}")
                
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n🏁 Test Complete")

if __name__ == "__main__":
    asyncio.run(test_byok_system()) 