#!/usr/bin/env python3
"""
🧪 Test API Key Validation
"""

import asyncio
from services.user_settings_service import user_settings_service

async def test_validation():
    print('🧪 Testing API key validation...')
    
    # Test validation for the Perplexity key we just added
    result = await user_settings_service.validate_api_key('anonymous', 'perplexity')
    print(f'✅ Validation result: {result}')
    
    # Check the keys after validation
    keys = await user_settings_service.get_user_api_keys('anonymous')
    print(f'\n📋 Keys after validation:')
    for key in keys:
        print(f'   🔑 {key.get("provider_id")}: {key.get("validation_status")}')

if __name__ == "__main__":
    asyncio.run(test_validation()) 