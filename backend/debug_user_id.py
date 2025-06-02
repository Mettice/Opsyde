#!/usr/bin/env python3
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.supabase_rest_service import SupabaseRestService

async def debug_user_ids():
    print("🔍 Debugging user ID resolution...")
    
    service = SupabaseRestService()
    
    # Test with anonymous user
    try:
        anon_user = await service._resolve_user_id('anonymous')
        print(f"✅ Anonymous user resolves to: {anon_user}")
    except Exception as e:
        print(f"❌ Error resolving anonymous user: {e}")
    
    # Check what's actually in the user_api_keys table using the correct method
    try:
        print("\n🔍 Checking all API keys in table...")
        # Use the correct method name from the service
        url = f"{service.supabase_url}/rest/v1/user_api_keys?select=*"
        headers = {
            "apikey": service.supabase_key,
            "Authorization": f"Bearer {service.supabase_key}",
            "Content-Type": "application/json"
        }
        
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"📊 All API keys in table: {data}")
                    
                    if data:
                        for key in data:
                            print(f"  - User ID: {key.get('user_id')}, Provider: {key.get('provider_id')}, Active: {key.get('is_active')}")
                    else:
                        print("  - No API keys found in table")
                else:
                    error_text = await response.text()
                    print(f"❌ Error response: {response.status} - {error_text}")
    except Exception as e:
        print(f"❌ Error querying table: {e}")
    
    # Test specific query for anonymous user
    try:
        print(f"\n🔍 Checking API keys for anonymous user...")
        anon_keys = await service.get_user_api_keys('anonymous')
        print(f"📊 Anonymous user API keys: {anon_keys}")
    except Exception as e:
        print(f"❌ Error getting anonymous user keys: {e}")
    
    # Test what happens when we save a key
    try:
        print(f"\n🔍 Testing save operation...")
        print(f"Would save with user_id: {await service._resolve_user_id('anonymous')}")
    except Exception as e:
        print(f"❌ Error testing save: {e}")

if __name__ == "__main__":
    asyncio.run(debug_user_ids()) 