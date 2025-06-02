#!/usr/bin/env python3
"""
🔍 Debug Encryption/Decryption Issue
"""

import asyncio
from services.supabase_rest_service import supabase_rest_service
from models.user_settings import UserAPIKeyManager

async def debug_encryption():
    print('🔍 Debugging encryption/decryption issue...')
    
    # Test the real Perplexity key
    real_key = "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"
    
    print(f'\n1. 🔑 Original key: {real_key}')
    
    # Test encryption/decryption with the REST service key manager
    print('\n2. 🔐 Testing REST service encryption...')
    try:
        rest_encrypted = supabase_rest_service.key_manager.encrypt_key(real_key)
        print(f'   Encrypted: {rest_encrypted[:50]}...')
        
        rest_decrypted = supabase_rest_service.key_manager.decrypt_key(rest_encrypted)
        print(f'   Decrypted: {rest_decrypted}')
        print(f'   Match: {"✅ Yes" if rest_decrypted == real_key else "❌ No"}')
    except Exception as e:
        print(f'   ❌ REST encryption error: {e}')
    
    # Test with a separate UserAPIKeyManager instance
    print('\n3. 🔐 Testing separate key manager...')
    try:
        separate_manager = UserAPIKeyManager()
        separate_encrypted = separate_manager.encrypt_key(real_key)
        print(f'   Encrypted: {separate_encrypted[:50]}...')
        
        separate_decrypted = separate_manager.decrypt_key(separate_encrypted)
        print(f'   Decrypted: {separate_decrypted}')
        print(f'   Match: {"✅ Yes" if separate_decrypted == real_key else "❌ No"}')
    except Exception as e:
        print(f'   ❌ Separate manager error: {e}')
    
    # Test cross-compatibility
    print('\n4. 🔄 Testing cross-compatibility...')
    try:
        # Encrypt with REST service, decrypt with separate manager
        cross_decrypted = separate_manager.decrypt_key(rest_encrypted)
        print(f'   Cross-decrypt: {cross_decrypted}')
        print(f'   Cross-match: {"✅ Yes" if cross_decrypted == real_key else "❌ No"}')
    except Exception as e:
        print(f'   ❌ Cross-compatibility error: {e}')
    
    # Check what's actually in the database
    print('\n5. 📊 Database contents...')
    try:
        keys = await supabase_rest_service.get_user_api_keys('anonymous')
        for key in keys:
            if key.get('provider_id') == 'perplexity':
                print(f'   Provider: {key.get("provider_id")}')
                print(f'   Masked: {key.get("masked_value")}')
                print(f'   Encrypted (first 50): {key.get("encrypted_key", "")[:50]}...')
                
                # Try to decrypt what's in the database
                try:
                    db_decrypted = supabase_rest_service.key_manager.decrypt_key(key.get("encrypted_key"))
                    print(f'   DB Decrypted: {db_decrypted}')
                    print(f'   DB Match: {"✅ Yes" if db_decrypted == real_key else "❌ No"}')
                except Exception as e:
                    print(f'   ❌ DB decrypt error: {e}')
    except Exception as e:
        print(f'   ❌ Database error: {e}')
    
    # Test direct Perplexity API validation
    print('\n6. 🧪 Direct API validation...')
    try:
        separate_manager = UserAPIKeyManager()
        from models.user_settings import UserSettings, UserAPIKey
        
        test_settings = UserSettings(
            user_id="test",
            api_keys=[UserAPIKey(
                provider="perplexity",
                key_value=real_key,
                masked_value=separate_manager.mask_key(real_key)
            )]
        )
        
        validation_result = await separate_manager.validate_key(test_settings, "perplexity")
        print(f'   Validation result: {validation_result}')
        print(f'   Valid: {"✅ Yes" if validation_result.get("valid") else "❌ No"}')
        if not validation_result.get("valid"):
            print(f'   Error: {validation_result.get("error")}')
    except Exception as e:
        print(f'   ❌ Direct validation error: {e}')

if __name__ == "__main__":
    asyncio.run(debug_encryption()) 