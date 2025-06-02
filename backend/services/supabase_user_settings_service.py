#!/usr/bin/env python3
"""
🔑 Supabase User Settings Service
Enhanced BYOK (Bring Your Own Keys) service with REST API support
"""

import logging
import os
import aiohttp
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_
import uuid
from contextlib import asynccontextmanager
import asyncio

from database import get_db, get_session, should_use_rest_api
from models.supabase_models import UserProfile, UserAPIKeyDB, UserSettingsDB, IntegrationCredentialDB
from models.user_settings import (
    UserSettings, UserAPIKey, UserAPIKeyManager, 
    IntegrationCredential, UserPreferences, UserQuotas,
    APIKeyResponse, UserSettingsResponse, ValidationResponse
)
from core.provider_registry import provider_registry
from framework_registry import framework_registry

logger = logging.getLogger(__name__)

class SupabaseUserSettingsService:
    """Enhanced user settings service with REST API fallback"""
    
    def __init__(self):
        self.api_key_manager = UserAPIKeyManager()
        self.supabase_url = os.getenv("VITE_SUPABASE_URL")
        self.supabase_key = os.getenv("VITE_SUPABASE_ANON_KEY")
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        # Use service key if available, otherwise anon key
        self.auth_key = self.service_key or self.supabase_key
        
        logger.info(f"🔧 Supabase service initialized")
        logger.info(f"🔧 URL: {self.supabase_url}")
        logger.info(f"🔧 Using {'service' if self.service_key else 'anon'} key")
        logger.info(f"🔧 REST API mode: {should_use_rest_api()}")

    async def _rest_api_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> Dict[str, Any]:
        """Make REST API request to Supabase"""
        if not self.supabase_url or not self.auth_key:
            raise Exception("Supabase configuration missing")
            
        url = f"{self.supabase_url}/rest/v1/{endpoint}"
        headers = {
            "apikey": self.auth_key,
            "Authorization": f"Bearer {self.auth_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                if method.upper() == "GET":
                    async with session.get(url, headers=headers, params=params, timeout=10) as response:
                        if response.status in [200, 201]:
                            return await response.json()
                        else:
                            error_text = await response.text()
                            raise Exception(f"REST API error {response.status}: {error_text}")
                            
                elif method.upper() == "POST":
                    async with session.post(url, headers=headers, json=data, timeout=10) as response:
                        if response.status in [200, 201]:
                            result = await response.json()
                            return result[0] if isinstance(result, list) and result else result
                        else:
                            error_text = await response.text()
                            raise Exception(f"REST API error {response.status}: {error_text}")
                            
                elif method.upper() == "PATCH":
                    async with session.patch(url, headers=headers, json=data, params=params, timeout=10) as response:
                        if response.status in [200, 201, 204]:
                            if response.status == 204:
                                return {"success": True}
                            result = await response.json()
                            return result[0] if isinstance(result, list) and result else result
                        else:
                            error_text = await response.text()
                            raise Exception(f"REST API error {response.status}: {error_text}")
                            
                elif method.upper() == "DELETE":
                    async with session.delete(url, headers=headers, params=params, timeout=10) as response:
                        if response.status in [200, 204]:
                            return {"success": True}
                        else:
                            error_text = await response.text()
                            raise Exception(f"REST API error {response.status}: {error_text}")
                            
        except asyncio.TimeoutError:
            raise Exception("Request timeout - check your internet connection")
        except aiohttp.ClientError as e:
            logger.error(f"REST API client error: {str(e)}")
            raise Exception(f"REST API client error: {str(e)}")
        except Exception as e:
            logger.error(f"REST API request failed: {str(e)}")
            raise

    @asynccontextmanager
    async def _get_db_session(self):
        """Get database session with REST API fallback"""
        if should_use_rest_api():
            # In REST API mode, we don't use SQLAlchemy sessions
            # Instead we yield None and handle operations via REST API
            yield None
        else:
            # Use traditional SQLAlchemy session
            with get_session() as session:
                yield session

    async def get_user_settings(self, user_id: str = "anonymous") -> UserSettingsResponse:
        """Get user settings with REST API support"""
        try:
            logger.info(f"🔧 Getting user settings for: {user_id}")
            
            if should_use_rest_api():
                # Use REST API
                try:
                    user_uuid = self._get_user_uuid(user_id)
                    api_keys_data = await self._rest_api_request(
                        "GET", 
                        "user_api_keys",
                        params={"user_id": f"eq.{user_uuid}"}
                    )
                    
                    logger.info(f"🔧 REST API returned {len(api_keys_data)} API keys")
                    
                    # Convert to UserAPIKey objects
                    api_keys = []
                    for key_data in api_keys_data:
                        try:
                            # Decrypt the key for validation status
                            decrypted_key = self.api_key_manager.decrypt_key(key_data['encrypted_key'])
                            masked_value = self.api_key_manager.mask_key(decrypted_key)
                            
                            api_key = UserAPIKey(
                                provider=key_data['provider_id'],  # Use correct column name
                                key_value=key_data['encrypted_key'],  # Keep encrypted
                                masked_value=masked_value,
                                is_active=key_data.get('is_active', True),
                                validation_status=key_data.get('validation_status', 'untested'),
                                usage_count=key_data.get('usage_count', 0),
                                created_at=datetime.fromisoformat(key_data['created_at'].replace('Z', '+00:00')),
                                last_used=datetime.fromisoformat(key_data['last_used'].replace('Z', '+00:00')) if key_data.get('last_used') else None
                            )
                            api_keys.append(api_key)
                            logger.info(f"✅ Loaded {key_data['provider_id']} key (status: {key_data.get('validation_status', 'untested')})")
                            
                        except Exception as decrypt_error:
                            logger.error(f"❌ Failed to decrypt {key_data['provider_id']} key: {decrypt_error}")
                            # Still add the key but mark as invalid
                            api_key = UserAPIKey(
                                provider=key_data['provider_id'],  # Use correct column name
                                key_value=key_data['encrypted_key'],
                                masked_value="***DECRYPT_ERROR***",
                                is_active=False,
                                validation_status='invalid',
                                usage_count=key_data.get('usage_count', 0),
                                created_at=datetime.fromisoformat(key_data['created_at'].replace('Z', '+00:00')),
                                last_used=None
                            )
                            api_keys.append(api_key)
                    
                    settings = UserSettings(
                        user_id=user_id,
                        api_keys=api_keys
                    )
                    
                    return UserSettingsResponse(
                        success=True,
                        settings=settings.dict(),
                        message=f"Settings loaded via REST API ({len(api_keys)} keys)"
                    )
                    
                except Exception as rest_error:
                    logger.error(f"❌ REST API failed: {rest_error}")
                    return UserSettingsResponse(
                        success=False,
                        message=f"Failed to load settings via REST API: {str(rest_error)}"
                    )
            else:
                # Use SQLAlchemy (traditional mode)
                async with self._get_db_session() as session:
                    if session is None:
                        raise Exception("Database session is None")
                        
                    api_keys_db = session.query(UserAPIKeyDB).filter(
                        UserAPIKeyDB.user_id == user_id
                    ).all()
                    
                    api_keys = []
                    for key_db in api_keys_db:
                        try:
                            decrypted_key = self.api_key_manager.decrypt_key(key_db.encrypted_key)
                            masked_value = self.api_key_manager.mask_key(decrypted_key)
                            
                            api_key = UserAPIKey(
                                provider=key_db.provider,
                                key_value=key_db.encrypted_key,
                                masked_value=masked_value,
                                is_active=key_db.is_active,
                                validation_status=key_db.validation_status,
                                usage_count=key_db.usage_count,
                                created_at=key_db.created_at,
                                last_used=key_db.last_used
                            )
                            api_keys.append(api_key)
                            
                        except Exception as decrypt_error:
                            logger.error(f"Failed to decrypt {key_db.provider} key: {decrypt_error}")
                            continue
                    
                    settings = UserSettings(
                        user_id=user_id,
                        api_keys=api_keys
                    )
                    
                    return UserSettingsResponse(
                        success=True,
                        settings=settings.dict(),
                        message=f"Settings loaded via SQLAlchemy ({len(api_keys)} keys)"
                    )
                    
        except Exception as e:
            logger.error(f"Error getting user settings: {str(e)}")
            return UserSettingsResponse(
                success=False,
                message=f"Failed to get user settings: {str(e)}"
            )

    async def add_api_key(self, user_id: str, provider: str, api_key: str) -> APIKeyResponse:
        """Add or update API key with REST API support"""
        try:
            logger.info(f"🔧 Adding {provider} API key for user {user_id}")
            
            # Validate provider exists in registry
            available_providers = framework_registry.get_available_llm_providers() if hasattr(framework_registry, 'get_available_llm_providers') else ['openai', 'anthropic', 'openrouter', 'google', 'perplexity', 'huggingface']
            if provider not in available_providers:
                return APIKeyResponse(
                    success=False,
                    message=f"Provider '{provider}' not found in registry. Available: {', '.join(available_providers)}"
                )
            
            # Encrypt the API key
            encrypted_key = self.api_key_manager.encrypt_key(api_key)
            masked_value = self.api_key_manager.mask_key(api_key)
            
            if should_use_rest_api():
                # Use REST API
                try:
                    user_uuid = self._get_user_uuid(user_id)
                    # Check if key already exists
                    existing_keys = await self._rest_api_request(
                        "GET",
                        "user_api_keys", 
                        params={
                            "user_id": f"eq.{user_uuid}",
                            "provider_id": f"eq.{provider}"  # Use correct column name
                        }
                    )
                    
                    key_data = {
                        "user_id": user_uuid,
                        "provider_id": provider,  # Use correct column name
                        "encrypted_key": encrypted_key,
                        "masked_value": masked_value,
                        "is_active": True,
                        "validation_status": "pending",  # Set as pending initially
                        "usage_count": 0,
                        "created_at": datetime.now().isoformat(),
                        "updated_at": datetime.now().isoformat()
                    }
                    
                    if existing_keys:
                        # Update existing key
                        await self._rest_api_request(
                            "PATCH",
                            "user_api_keys",
                            data=key_data,
                            params={
                                "user_id": f"eq.{user_uuid}",
                                "provider_id": f"eq.{provider}"  # Use correct column name
                            }
                        )
                        logger.info(f"✅ Updated existing {provider} key via REST API")
                    else:
                        # Create new key
                        await self._rest_api_request(
                            "POST",
                            "user_api_keys",
                            data=key_data
                        )
                        logger.info(f"✅ Created new {provider} key via REST API")
                    
                    # Now validate the key separately
                    try:
                        # Create a temporary UserSettings object for validation
                        temp_api_key = UserAPIKey(
                            provider=provider,
                            key_value=encrypted_key,
                            masked_value=masked_value,
                            is_active=True,
                            validation_status="pending"
                        )
                        temp_settings = UserSettings(
                            user_id=user_id,
                            api_keys=[temp_api_key]
                        )
                        
                        validation_result = await self.api_key_manager.validate_key(temp_settings, provider)
                        
                        # Update validation status
                        new_status = "valid" if validation_result.get("valid", False) else "invalid"
                        await self._rest_api_request(
                            "PATCH",
                            "user_api_keys",
                            data={"validation_status": new_status, "updated_at": datetime.now().isoformat()},
                            params={
                                "user_id": f"eq.{user_uuid}",
                                "provider_id": f"eq.{provider}"  # Use correct column name
                            }
                        )
                        
                        logger.info(f"✅ {provider} key validation: {new_status}")
                        
                        return APIKeyResponse(
                            success=True,
                            message=f"{provider} API key added and validated as {new_status}",
                            data={"validation_status": new_status, "provider": provider}
                        )
                        
                    except Exception as validation_error:
                        logger.error(f"❌ Validation failed for {provider}: {validation_error}")
                        # Update as invalid
                        await self._rest_api_request(
                            "PATCH",
                            "user_api_keys",
                            data={"validation_status": "invalid", "updated_at": datetime.now().isoformat()},
                            params={
                                "user_id": f"eq.{user_uuid}",
                                "provider_id": f"eq.{provider}"  # Use correct column name
                            }
                        )
                        
                        return APIKeyResponse(
                            success=True,
                            message=f"{provider} API key added but validation failed: {str(validation_error)}",
                            data={"validation_status": "invalid", "provider": provider}
                        )
                        
                except Exception as rest_error:
                    logger.error(f"❌ REST API operation failed: {rest_error}")
                    return APIKeyResponse(
                        success=False,
                        message=f"Failed to save API key via REST API: {str(rest_error)}"
                    )
            else:
                # Use SQLAlchemy (traditional mode)
                async with self._get_db_session() as session:
                    if session is None:
                        raise Exception("Database session is None")
                        
                    # Check if key already exists
                    existing_key = session.query(UserAPIKeyDB).filter(
                        UserAPIKeyDB.user_id == user_id,
                        UserAPIKeyDB.provider == provider
                    ).first()
                    
                    if existing_key:
                        # Update existing key
                        existing_key.encrypted_key = encrypted_key
                        existing_key.masked_value = masked_value
                        existing_key.is_active = True
                        existing_key.validation_status = "pending"
                        existing_key.updated_at = datetime.now()
                    else:
                        # Create new key
                        new_key = UserAPIKeyDB(
                            user_id=user_id,
                            provider=provider,
                            encrypted_key=encrypted_key,
                            masked_value=masked_value,
                            is_active=True,
                            validation_status="pending",
                            usage_count=0
                        )
                        session.add(new_key)
                    
                    session.commit()
                    
                    # Validate the key
                    temp_api_key = UserAPIKey(
                        provider=provider,
                        key_value=encrypted_key,
                        masked_value=masked_value,
                        is_active=True,
                        validation_status="pending"
                    )
                    temp_settings = UserSettings(
                        user_id=user_id,
                        api_keys=[temp_api_key]
                    )
                    
                    validation_result = await self.api_key_manager.validate_key(temp_settings, provider)
                    
                    # Update validation status
                    key_to_update = existing_key or new_key
                    key_to_update.validation_status = "valid" if validation_result.get("valid", False) else "invalid"
                    key_to_update.updated_at = datetime.now()
                    session.commit()
                    
                    return APIKeyResponse(
                        success=True,
                        message=f"{provider} API key added and validated",
                        data={"validation_status": key_to_update.validation_status, "provider": provider}
                    )
                    
        except Exception as e:
            logger.error(f"Error adding API key: {str(e)}")
            return APIKeyResponse(
                success=False,
                message=f"Failed to add API key: {str(e)}"
            )

    def _serialize_datetime(self, obj):
        """Custom JSON serializer for datetime objects"""
        if isinstance(obj, datetime):
            return obj.isoformat()
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

    def _get_user_uuid(self, user_id: str) -> str:
        """Convert user_id to UUID format for database operations"""
        if user_id == "anonymous":
            # Use a fixed UUID for anonymous users
            return "00000000-0000-0000-0000-000000000000"
        
        # Try to parse as UUID, if it fails, generate a deterministic UUID
        try:
            uuid.UUID(user_id)
            return user_id
        except ValueError:
            # Generate a deterministic UUID from the string
            import hashlib
            hash_object = hashlib.md5(user_id.encode())
            hex_dig = hash_object.hexdigest()
            # Format as UUID
            return f"{hex_dig[:8]}-{hex_dig[8:12]}-{hex_dig[12:16]}-{hex_dig[16:20]}-{hex_dig[20:32]}"

    async def get_user_api_keys(self, user_id: str) -> List[UserAPIKey]:
        """Get all API keys for a user from Supabase"""
        try:
            parsed_user_id = self._get_user_uuid(user_id)
            
            # FIXED: Use context manager properly
            with get_db() as db:
                api_keys_db = db.query(UserAPIKeyDB).filter(
                    and_(UserAPIKeyDB.user_id == parsed_user_id, UserAPIKeyDB.is_active == True)
                ).all()
                
                api_keys = []
                for key_db in api_keys_db:
                    # Get provider info from registry
                    provider = provider_registry.get_provider(key_db.provider_id)
                    if not provider:
                        logger.warning(f"Provider {key_db.provider_id} not found in registry, skipping")
                        continue
                    
                    # Decrypt the key
                    try:
                        decrypted_key = self.api_key_manager.decrypt_key(key_db.encrypted_key)
                    except Exception as e:
                        logger.error(f"Failed to decrypt key for {key_db.provider_id}: {str(e)}")
                        continue
                    
                    api_key = UserAPIKey(
                        provider=key_db.provider_id,
                        key_value=decrypted_key,
                        masked_value=self.api_key_manager.mask_key(decrypted_key),
                        is_active=key_db.is_active,
                        validation_status=key_db.validation_status,
                        usage_count=key_db.usage_count,
                        created_at=key_db.created_at,
                        last_used=key_db.last_used
                    )
                    api_keys.append(api_key)
                
                logger.info(f"Retrieved {len(api_keys)} API keys for user {user_id}")
                return api_keys
                
        except Exception as e:
            logger.error(f"Failed to get user API keys: {str(e)}")
            return []

    async def delete_api_key(self, user_id: str, provider_id: str) -> bool:
        """Delete an API key for a user"""
        try:
            parsed_user_id = self._get_user_uuid(user_id)
            
            # FIXED: Use context manager properly
            with get_db() as db:
                api_key_db = db.query(UserAPIKeyDB).filter(
                    and_(UserAPIKeyDB.user_id == parsed_user_id, UserAPIKeyDB.provider_id == provider_id)
                ).first()
                
                if api_key_db:
                    api_key_db.is_active = False
                    db.commit()
                    logger.info(f"Deleted {provider_id} API key for user {user_id}")
                    return True
                else:
                    logger.warning(f"API key not found for user {user_id}, provider {provider_id}")
                    return False
                    
        except Exception as e:
            logger.error(f"Failed to delete API key: {str(e)}")
            return False

    async def validate_api_key(self, user_id: str, provider_id: str) -> bool:
        """Validate an API key and update its status"""
        try:
            parsed_user_id = self._get_user_uuid(user_id)
            
            # FIXED: Use context manager properly
            with get_db() as db:
                api_key_db = db.query(UserAPIKeyDB).filter(
                    and_(UserAPIKeyDB.user_id == parsed_user_id, UserAPIKeyDB.provider_id == provider_id)
                ).first()
                
                if not api_key_db:
                    logger.warning(f"API key not found for validation: {user_id}, {provider_id}")
                    return False
                
                # Decrypt and validate
                decrypted_key = self.api_key_manager.decrypt_key(api_key_db.encrypted_key)
                is_valid = await self._validate_api_key_simple(provider_id, decrypted_key)
                
                # Update validation status
                api_key_db.validation_status = "valid" if is_valid else "invalid"
                db.commit()
                
                logger.info(f"Validated {provider_id} API key for user {user_id}: {is_valid}")
                return is_valid
                
        except Exception as e:
            logger.error(f"Failed to validate API key: {str(e)}")
            return False

    async def _validate_api_key_simple(self, provider_id: str, api_key: str) -> bool:
        """Simple API key validation"""
        try:
            # Use the key manager's validation method
            settings = UserSettings(user_id="temp", api_keys=[
                UserAPIKey(provider=provider_id, key_value=api_key, masked_value="")
            ])
            result = await self.api_key_manager.validate_key(settings, provider_id)
            return result.get("valid", False)
        except Exception as e:
            logger.error(f"API key validation failed for {provider_id}: {str(e)}")
            return False

    async def get_user_keys_for_execution(self, user_id: str) -> Dict[str, str]:
        """Get user API keys formatted for execution context"""
        try:
            api_keys = await self.get_user_api_keys(user_id)
            
            # Convert to execution format
            execution_keys = {}
            for key in api_keys:
                if key.is_active and key.validation_status == 'valid':
                    # FIXED: key.key_value is already decrypted from get_user_api_keys
                    # No need to decrypt again
                    execution_keys[key.provider] = key.key_value
            
            logger.info(f"Loaded {len(execution_keys)} valid API keys for execution (user: {user_id})")
            return execution_keys
            
        except Exception as e:
            logger.error(f"Failed to get user API keys: {str(e)}")
            return {}

    async def get_usage_stats(self, user_id: str) -> Dict[str, Any]:
        """Get usage statistics for a user"""
        try:
            with get_db() as db:
                # Get user settings
                user_settings = db.query(UserSettingsDB).filter(
                    UserSettingsDB.user_id == self._get_user_uuid(user_id)
                ).first()
                
                if not user_settings:
                    return {
                        "monthly_usage": {},
                        "usage_limits": {},
                        "provider_stats": []
                    }
                
                # Get API key usage stats
                api_keys = db.query(UserAPIKeyDB).filter(
                    UserAPIKeyDB.user_id == self._get_user_uuid(user_id),
                    UserAPIKeyDB.is_active == True
                ).all()
                
                provider_stats = []
                for key in api_keys:
                    provider_stats.append({
                        "provider": key.provider_id,
                        "usage_count": key.usage_count,
                        "validation_status": key.validation_status,
                        "last_used": key.last_used.isoformat() if key.last_used else None
                    })
                
                return {
                    "monthly_usage": json.loads(user_settings.monthly_usage) if user_settings.monthly_usage else {},
                    "usage_limits": json.loads(user_settings.usage_limits) if user_settings.usage_limits else {},
                    "provider_stats": provider_stats,
                    "total_api_keys": len(api_keys),
                    "active_keys": len([k for k in api_keys if k.validation_status == 'valid'])
                }
                
        except Exception as e:
            logger.error(f"Failed to get usage stats for {user_id}: {str(e)}")
            return {
                "monthly_usage": {},
                "usage_limits": {},
                "provider_stats": []
            }

# Create global instance
supabase_user_settings_service = SupabaseUserSettingsService() 