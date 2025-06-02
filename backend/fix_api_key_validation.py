#!/usr/bin/env python3
"""
Fix API key validation status in database
"""

import asyncio
import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env')
load_dotenv('backend/.env')

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def fix_api_key_validation():
    """Fix the API key validation status"""
    try:
        # Import after loading env vars
        from database import init_db, get_session
        from services.supabase_user_settings_service import SupabaseUserSettingsService
        from models.user_settings import UserAPIKeyManager
        
        print("🔧 Fixing API key validation...")
        
        # Initialize database (not awaitable)
        init_db()
        print("✅ Database initialized")
        
        # Create services
        settings_service = SupabaseUserSettingsService()
        key_manager = UserAPIKeyManager()
        
        # Get current API keys
        user_id = "anonymous"
        api_keys = await settings_service.get_user_api_keys(user_id)
        print(f"📋 Found {len(api_keys)} API keys")
        
        for key in api_keys:
            print(f"\n🔑 Processing {key.provider} key...")
            print(f"   Current status: {key.validation_status}")
            
            try:
                # Try to decrypt the key to make sure it works
                decrypted_key = key_manager.decrypt_key(key.key_value)
                print(f"   ✅ Decryption successful")
                
                # Test the key directly if it's OpenAI
                if key.provider == "openai":
                    print(f"   🧪 Testing OpenAI key...")
                    
                    import aiohttp
                    headers = {
                        'Authorization': f'Bearer {decrypted_key}',
                        'Content-Type': 'application/json'
                    }
                    
                    async with aiohttp.ClientSession() as session:
                        async with session.get(
                            'https://api.openai.com/v1/models',
                            headers=headers,
                            timeout=10
                        ) as response:
                            if response.status == 200:
                                print(f"   ✅ OpenAI key is valid!")
                                
                                # Update the validation status in database
                                async with get_session() as db_session:
                                    from models.supabase_models import UserAPIKeyDB
                                    from sqlalchemy import update
                                    
                                    stmt = update(UserAPIKeyDB).where(
                                        UserAPIKeyDB.user_id == user_id,
                                        UserAPIKeyDB.provider == key.provider
                                    ).values(validation_status="valid")
                                    
                                    await db_session.execute(stmt)
                                    await db_session.commit()
                                    print(f"   ✅ Updated validation status to 'valid'")
                            else:
                                print(f"   ❌ OpenAI key test failed: {response.status}")
                else:
                    print(f"   ⏭️ Skipping validation test for {key.provider}")
                    
            except Exception as e:
                print(f"   ❌ Error processing {key.provider} key: {str(e)}")
        
        print(f"\n🎉 API key validation fix completed!")
        
        # Test the fix
        print(f"\n🧪 Testing the fix...")
        execution_keys = await settings_service.get_user_keys_for_execution(user_id)
        print(f"✅ Now have {len(execution_keys)} valid keys for execution")
        
        for provider, key_value in execution_keys.items():
            print(f"   - {provider}: {key_value[:10]}...{key_value[-4:]}")
        
    except Exception as e:
        logger.error(f"Error fixing API key validation: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(fix_api_key_validation()) 