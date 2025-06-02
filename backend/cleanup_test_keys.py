#!/usr/bin/env python3
"""
🧹 Clean up test keys and add real API keys
"""

import asyncio
from services.supabase_rest_service import supabase_rest_service

async def cleanup_and_setup():
    print("🧹 Cleaning up test keys and setting up real API keys")
    print("=" * 50)
    
    # First, let's see what's currently in the database
    print("\n1. 🔍 Current keys in database:")
    keys = await supabase_rest_service.get_user_api_keys('anonymous')
    for key in keys:
        print(f"   🔑 {key.get('provider_id')}: {key.get('masked_value')}")
    
    # Delete test keys by clearing the table for this user
    print("\n2. 🗑️ Clearing test keys...")
    try:
        import aiohttp
        
        # Delete all keys for the anonymous user
        async with aiohttp.ClientSession() as session:
            headers = supabase_rest_service._get_headers(use_service_key=True)
            delete_url = f"{supabase_rest_service.supabase_url}/rest/v1/user_api_keys?user_id=eq.f31db8d3-7b54-46b5-bebf-1ea7b6b2edff"
            
            async with session.delete(delete_url, headers=headers) as response:
                if response.status in [200, 204]:
                    print("   ✅ Test keys cleared")
                else:
                    print(f"   ❌ Failed to clear keys: {response.status}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Verify cleanup
    print("\n3. 🔍 Verifying cleanup:")
    keys_after = await supabase_rest_service.get_user_api_keys('anonymous')
    print(f"   Keys remaining: {len(keys_after)}")
    
    print("\n4. 📝 Ready to add your real API keys!")
    print("   Now you can use the frontend API Key Manager to add your real keys:")
    print("   - Go to http://localhost:3000/api-keys")
    print("   - Add your real Perplexity API key")
    print("   - Add any other API keys you need")
    
    print("\n🎉 Cleanup complete! Your BYOK system is ready for real API keys.")

if __name__ == "__main__":
    asyncio.run(cleanup_and_setup()) 