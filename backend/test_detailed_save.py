#!/usr/bin/env python3
"""
🔍 Detailed API Key Save Test
Debug exactly what's happening with save/retrieve
"""

import asyncio
import aiohttp
import os
from dotenv import load_dotenv
from services.supabase_rest_service import supabase_rest_service

load_dotenv('.env')

async def detailed_test():
    print("🔍 Detailed API Key Save/Retrieve Test")
    print("=" * 50)
    
    # Test connection first
    print("\n1. 🔗 Testing Supabase connection...")
    connection_ok = await supabase_rest_service.test_connection()
    print(f"   Connection: {'✅ OK' if connection_ok else '❌ Failed'}")
    
    # Check environment variables
    print("\n2. 🔧 Environment Variables:")
    print(f"   SUPABASE_URL: {os.getenv('VITE_SUPABASE_URL')[:50]}...")
    print(f"   ANON_KEY: {os.getenv('VITE_SUPABASE_ANON_KEY')[:20]}...")
    print(f"   SERVICE_KEY: {os.getenv('SUPABASE_SERVICE_ROLE_KEY')[:20]}...")
    
    # Test user ID resolution
    print("\n3. 👤 User ID Resolution:")
    resolved_id = await supabase_rest_service._resolve_user_id("anonymous")
    print(f"   Resolved ID: {resolved_id}")
    
    # Check if user profile exists
    print("\n4. 👤 User Profile Check:")
    profile = await supabase_rest_service.get_user_profile("anonymous")
    print(f"   Profile exists: {'✅ Yes' if profile else '❌ No'}")
    if not profile:
        print("   Creating profile...")
        created = await supabase_rest_service.create_user_profile("anonymous")
        print(f"   Profile created: {'✅ Yes' if created else '❌ Failed'}")
    
    # Test direct table query with service key
    print("\n5. 🔍 Direct Table Query (with service key):")
    try:
        async with aiohttp.ClientSession() as session:
            headers = supabase_rest_service._get_headers(use_service_key=True)
            url = f"{supabase_rest_service.supabase_url}/rest/v1/user_api_keys?select=*"
            
            async with session.get(url, headers=headers) as response:
                response_text = await response.text()
                print(f"   Status: {response.status}")
                print(f"   Response: {response_text}")
                
                if response.status == 200:
                    data = await response.json() if response_text else []
                    print(f"   Total records in table: {len(data)}")
                    for record in data:
                        print(f"   Record: user_id={record.get('user_id')}, provider={record.get('provider_id')}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test save operation with detailed logging
    print("\n6. 💾 Save API Key Test:")
    test_key = "test-key-12345"
    test_provider = "openai"
    
    try:
        save_result = await supabase_rest_service.save_user_api_key("anonymous", test_provider, test_key)
        print(f"   Save result: {'✅ Success' if save_result else '❌ Failed'}")
    except Exception as e:
        print(f"   ❌ Save error: {e}")
    
    # Check table again after save
    print("\n7. 🔍 Table Check After Save:")
    try:
        async with aiohttp.ClientSession() as session:
            headers = supabase_rest_service._get_headers(use_service_key=True)
            url = f"{supabase_rest_service.supabase_url}/rest/v1/user_api_keys?select=*"
            
            async with session.get(url, headers=headers) as response:
                response_text = await response.text()
                print(f"   Status: {response.status}")
                print(f"   Response: {response_text}")
                
                if response.status == 200:
                    data = await response.json() if response_text else []
                    print(f"   Total records: {len(data)}")
                    for record in data:
                        print(f"   Record: user_id={record.get('user_id')}, provider={record.get('provider_id')}, active={record.get('is_active')}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test service method retrieval
    print("\n8. 🔍 Service Method Retrieval:")
    try:
        keys = await supabase_rest_service.get_user_api_keys("anonymous")
        print(f"   Keys found: {len(keys)}")
        for key in keys:
            print(f"   Key: provider={key.get('provider_id')}, masked={key.get('masked_value')}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("🏁 Test Complete")

if __name__ == "__main__":
    asyncio.run(detailed_test()) 