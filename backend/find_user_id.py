#!/usr/bin/env python3
"""
Script to find user IDs with API keys in Supabase
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.supabase_rest_service import SupabaseRestService

async def find_users_with_api_keys():
    print("🔍 Finding users with API keys in Supabase...")
    
    service = SupabaseRestService()
    
    try:
        # Get all API keys from the table
        import aiohttp
        url = f"{service.supabase_url}/rest/v1/user_api_keys?select=user_id,provider_id,is_active,validation_status,masked_value"
        headers = service._get_headers(use_service_key=True)
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"📊 Found {len(data)} API keys in database")
                    
                    if data:
                        # Group by user_id
                        users = {}
                        for key in data:
                            user_id = key.get('user_id')
                            if user_id not in users:
                                users[user_id] = []
                            users[user_id].append(key)
                        
                        print(f"\n👥 Found {len(users)} users with API keys:")
                        for user_id, keys in users.items():
                            print(f"\n🔑 User ID: {user_id}")
                            for key in keys:
                                provider = key.get('provider_id')
                                active = key.get('is_active')
                                status = key.get('validation_status')
                                masked = key.get('masked_value', 'N/A')
                                print(f"  - {provider}: {masked} (active: {active}, status: {status})")
                                
                                # If this is a Perplexity key, highlight it
                                if provider == 'perplexity' and active:
                                    print(f"    🎯 USE THIS USER ID FOR TESTING: {user_id}")
                    else:
                        print("  - No API keys found in database")
                        print("  - Make sure you've added your Perplexity API key through the UI")
                else:
                    error_text = await response.text()
                    print(f"❌ Error response: {response.status} - {error_text}")
                    
    except Exception as e:
        print(f"❌ Error querying database: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(find_users_with_api_keys()) 