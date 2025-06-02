#!/usr/bin/env python3
import asyncio
import sys
import os
import aiohttp
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.supabase_rest_service import SupabaseRestService

async def test_save_key():
    print("🔍 Testing API key save process...")
    
    service = SupabaseRestService()
    
    # Test direct Supabase connection first
    try:
        print("🔗 Testing direct Supabase connection...")
        url = f"{service.supabase_url}/rest/v1/user_api_keys?select=*"
        headers = service._get_headers()
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                print(f"📊 Direct query status: {response.status}")
                data = await response.text()
                print(f"📊 Direct query response: {data}")
    except Exception as e:
        print(f"❌ Direct connection error: {e}")
    
    # Test saving a key with detailed logging
    try:
        print("\n🔑 Attempting to save test API key...")
        
        # Get the resolved user ID
        resolved_user_id = await service._resolve_user_id('anonymous')
        print(f"🔑 Resolved user ID: {resolved_user_id}")
        
        # Test the save operation
        result = await service.save_user_api_key('anonymous', 'openai', 'sk-test-key-12345')
        print(f"✅ Save result: {result}")
        
        # Check if it was saved with direct query
        print("\n🔍 Checking if key was saved with direct query...")
        url = f"{service.supabase_url}/rest/v1/user_api_keys?user_id=eq.{resolved_user_id}"
        headers = service._get_headers()
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                print(f"📊 Direct user query status: {response.status}")
                data = await response.text()
                print(f"📊 Direct user query response: {data}")
        
        # Also check via service method
        print("\n🔍 Checking via service method...")
        keys = await service.get_user_api_keys('anonymous')
        print(f"📊 Service method keys: {keys}")
        
    except Exception as e:
        print(f"❌ Error during save test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_save_key()) 