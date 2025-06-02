#!/usr/bin/env python3
"""
🧪 Direct Perplexity API Test
"""

import asyncio
import aiohttp

async def test_perplexity_direct():
    print('🧪 Testing Perplexity API directly...')
    
    # Your real API key
    api_key = "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"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # Test different models to see which one works
    models_to_test = [
        "sonar",
        "sonar-pro", 
        "sonar-reasoning",
        "sonar-reasoning-pro",
        "sonar-deep-research",
        "r1-1776"
    ]
    
    for model in models_to_test:
        print(f'\n🔍 Testing model: {model}')
        
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": "Test"}],
            "max_tokens": 1,
            "temperature": 0
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.perplexity.ai/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=15
                ) as response:
                    response_text = await response.text()
                    
                    print(f'   Status: {response.status}')
                    print(f'   Response: {response_text[:200]}...')
                    
                    if response.status == 200:
                        print(f'   ✅ {model} works!')
                        return True
                    elif response.status == 401:
                        print(f'   ❌ {model} - Invalid API key')
                    elif response.status == 429:
                        print(f'   ⚠️ {model} - Rate limited (but key is valid)')
                        return True  # Rate limit means the key is valid
                    elif response.status == 400:
                        print(f'   ⚠️ {model} - Bad request (might be model issue)')
                    else:
                        print(f'   ❌ {model} - Error: {response.status}')
                        
        except Exception as e:
            print(f'   ❌ {model} - Exception: {e}')
    
    # Test with a simple models endpoint if available
    print(f'\n🔍 Testing models endpoint...')
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://api.perplexity.ai/models",
                headers=headers,
                timeout=10
            ) as response:
                response_text = await response.text()
                print(f'   Models endpoint status: {response.status}')
                print(f'   Models response: {response_text[:200]}...')
                
                if response.status == 200:
                    print('   ✅ API key is valid!')
                    return True
                    
    except Exception as e:
        print(f'   ❌ Models endpoint error: {e}')
    
    return False

if __name__ == "__main__":
    result = asyncio.run(test_perplexity_direct())
    print(f'\n🏁 Final result: {"✅ API key is valid" if result else "❌ API key validation failed"}') 