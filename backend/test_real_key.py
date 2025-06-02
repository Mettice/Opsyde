#!/usr/bin/env python3
"""
🔑 Test Real Perplexity API Key
"""

import asyncio
from services.user_settings_service import user_settings_service

async def test_real_key():
    print('🔑 Testing real Perplexity API key...')
    
    # The real key from the screenshot
    real_perplexity_key = "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"
    
    # Save the real key
    print('\n1. 💾 Saving real Perplexity API key...')
    save_result = await user_settings_service.save_user_api_key('anonymous', 'perplexity', real_perplexity_key)
    print(f'   Save result: {"✅ Success" if save_result else "❌ Failed"}')
    
    # Validate the key
    print('\n2. 🧪 Validating the API key...')
    validation_result = await user_settings_service.validate_api_key('anonymous', 'perplexity')
    print(f'   Validation result: {"✅ Valid" if validation_result else "❌ Invalid"}')
    
    # Check final status
    print('\n3. 📋 Final key status:')
    keys = await user_settings_service.get_user_api_keys('anonymous')
    for key in keys:
        if key.get('provider_id') == 'perplexity':
            print(f'   🔑 Perplexity: {key.get("masked_value")}')
            print(f'   📊 Status: {key.get("validation_status")}')
            print(f'   🕒 Created: {key.get("created_at")}')
    
    if validation_result:
        print('\n🎉 SUCCESS! Your BYOK system is now ready with a valid Perplexity API key!')
        print('   You can now use Perplexity models in your workflows.')
    else:
        print('\n⚠️ The API key was saved but validation failed.')
        print('   Please check if the key is correct and has proper permissions.')

if __name__ == "__main__":
    asyncio.run(test_real_key()) 