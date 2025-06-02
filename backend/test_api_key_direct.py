#!/usr/bin/env python3
"""
Direct test of Perplexity API key to diagnose the exact issue
"""
import asyncio
import aiohttp
import json

async def test_api_key_direct():
    # Get the API key from the database
    from services.user_settings_service import user_settings_service
    from models.user_settings import UserAPIKeyManager
    
    print("🔍 Testing Perplexity API key directly...")
    
    # Get user's API keys
    api_keys = await user_settings_service.get_user_api_keys('anonymous')
    perplexity_key = None
    
    print(f"📋 Found {len(api_keys)} API keys")
    
    # Initialize the key manager for decryption
    key_manager = UserAPIKeyManager()
    
    for i, key in enumerate(api_keys):
        print(f"🔑 Key {i+1}: {type(key)} - Provider: {key.get('provider_id', 'unknown')}")
        
        if key.get('provider_id') == 'perplexity':
            print(f"✅ Found Perplexity key with status: {key.get('validation_status', 'unknown')}")
            
            # Decrypt the key
            try:
                encrypted_key = key.get('encrypted_key')
                if encrypted_key:
                    perplexity_key = key_manager.decrypt_key(encrypted_key)
                    print(f"🔓 Successfully decrypted key: {perplexity_key[:10]}...")
                else:
                    print("❌ No encrypted_key field found")
            except Exception as e:
                print(f"❌ Failed to decrypt key: {e}")
            break
    
    if not perplexity_key:
        print("❌ No valid Perplexity API key found or failed to decrypt")
        return
    
    print(f"🔑 Testing with API key: {perplexity_key[:10]}...")
    
    # Test the API key directly
    url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {perplexity_key}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    payload = {
        "model": "sonar-pro",
        "messages": [
            {
                "role": "user",
                "content": "Hello, this is a test message."
            }
        ],
        "max_tokens": 10
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            print("📡 Making API request...")
            async with session.post(url, headers=headers, json=payload) as response:
                print(f"📊 Response status: {response.status}")
                
                response_text = await response.text()
                print(f"📄 Response headers: {dict(response.headers)}")
                print(f"📝 Response body: {response_text}")
                
                if response.status == 200:
                    print("✅ API key is valid!")
                    data = json.loads(response_text)
                    print(f"🎯 Response: {data}")
                elif response.status == 401:
                    print("❌ 401 Unauthorized - API key is invalid or expired")
                    try:
                        error_data = json.loads(response_text)
                        print(f"🔍 Error details: {error_data}")
                    except:
                        print(f"🔍 Raw error: {response_text}")
                elif response.status == 402:
                    print("💳 402 Payment Required - Insufficient credits")
                elif response.status == 429:
                    print("⏰ 429 Rate Limited - Too many requests")
                else:
                    print(f"❓ Unexpected status: {response.status}")
                    print(f"📝 Response: {response_text}")
                    
    except Exception as e:
        print(f"💥 Exception occurred: {e}")

if __name__ == "__main__":
    asyncio.run(test_api_key_direct()) 