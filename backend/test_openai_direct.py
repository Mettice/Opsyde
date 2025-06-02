#!/usr/bin/env python3
"""
Test OpenAI API key directly
"""

import asyncio
import os
import aiohttp
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env')
load_dotenv('backend/.env')

async def test_openai_key():
    api_key = os.getenv('OPENAI_API_KEY')
    print(f'🔑 Testing OpenAI key: {api_key[:10]}...{api_key[-4:]}')
    
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                'https://api.openai.com/v1/models',
                headers=headers,
                timeout=10
            ) as response:
                print(f'📊 Status: {response.status}')
                if response.status == 200:
                    data = await response.json()
                    models = [model["id"] for model in data.get("data", [])]
                    print(f'✅ Models found: {len(models)}')
                    print(f'📝 Sample models: {models[:5]}')
                    print('🎉 OpenAI key is VALID!')
                    return True
                else:
                    text = await response.text()
                    print(f'❌ Error {response.status}: {text}')
                    return False
    except Exception as e:
        print(f'💥 Exception: {str(e)}')
        return False

if __name__ == "__main__":
    asyncio.run(test_openai_key()) 