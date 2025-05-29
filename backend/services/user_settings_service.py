#!/usr/bin/env python3
"""
🔑 User Settings Service
Complete BYOK (Bring Your Own Keys) implementation
"""

import sqlite3
import asyncio
import logging
import json
import aiosqlite
from typing import Dict, Any, Optional, List
from pathlib import Path
from datetime import datetime, timezone
import os

from models.user_settings import (
    UserSettings, UserAPIKey, UserAPIKeyManager, 
    IntegrationCredential, UserPreferences, UserQuotas
)
from core.provider_registry import provider_registry

logger = logging.getLogger(__name__)

class UserSettingsService:
    """Production-grade user settings and API key management"""
    
    def __init__(self, db_path: str = "data/user_settings.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(exist_ok=True)
        self.key_manager = UserAPIKeyManager()
        
    async def initialize_db(self):
        """Initialize the database with required tables"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # User settings table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_settings (
                    user_id TEXT PRIMARY KEY,
                    settings_data TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            
            # API keys table with provider registry support
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_api_keys (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    provider_id TEXT NOT NULL,
                    encrypted_key TEXT NOT NULL,
                    masked_value TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    validation_status TEXT DEFAULT 'pending',
                    usage_count INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    last_used TEXT,
                    UNIQUE(user_id, provider_id)
                )
            """)
            
            conn.commit()
            conn.close()
            logger.info("Database initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize database: {str(e)}")
            raise

    async def initialize(self):
        """Initialize the service (alias for initialize_db)"""
        await self.initialize_db()

    def _serialize_datetime(self, obj):
        """Custom JSON serializer for datetime objects"""
        if isinstance(obj, datetime):
            return obj.isoformat()
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

    async def save_user_settings(self, user_id: str, settings: UserSettings):
        """Save user settings to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Convert settings to dict and handle datetime serialization
            settings_dict = settings.dict()
            settings_json = json.dumps(settings_dict, default=self._serialize_datetime)
            
            now = datetime.now(timezone.utc).isoformat()
            
            cursor.execute("""
                INSERT OR REPLACE INTO user_settings 
                (user_id, settings_data, created_at, updated_at)
                VALUES (?, ?, COALESCE((SELECT created_at FROM user_settings WHERE user_id = ?), ?), ?)
            """, (user_id, settings_json, user_id, now, now))
            
            conn.commit()
            conn.close()
            logger.info(f"Saved settings for user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to save user settings: {str(e)}")
            raise

    async def get_user_settings(self, user_id: str) -> UserSettings:
        """Get user settings from database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT settings_data FROM user_settings WHERE user_id = ?", (user_id,))
            result = cursor.fetchone()
            
            if result:
                settings_data = json.loads(result[0])
                
                # Parse datetime strings back to datetime objects
                for key in ['created_at', 'updated_at', 'last_login']:
                    if key in settings_data and settings_data[key]:
                        settings_data[key] = datetime.fromisoformat(settings_data[key])
                
                # Parse API keys datetime fields
                if 'api_keys' in settings_data:
                    for api_key in settings_data['api_keys']:
                        if 'created_at' in api_key and api_key['created_at']:
                            api_key['created_at'] = datetime.fromisoformat(api_key['created_at'])
                        if 'last_used' in api_key and api_key['last_used']:
                            api_key['last_used'] = datetime.fromisoformat(api_key['last_used'])
                
                conn.close()
                return UserSettings(**settings_data)
            else:
                conn.close()
                # Return default settings with provider registry support
                return UserSettings(
                    user_id=user_id,
                    api_keys=[],
                    integrations=[],
                    preferences={
                        "theme": "light",
                        "language": "en",
                        "timezone": "UTC",
                        "notifications": {
                            "email": True,
                            "push": True,
                            "workflow_completion": True,
                            "error_alerts": True
                        }
                    },
                    quotas={
                        "monthly_executions": 1000,
                        "monthly_ai_tokens": 100000,
                        "max_workflows": 50,
                        "max_nodes_per_workflow": 100,
                        "storage_mb": 1000
                    }
                )
                
        except Exception as e:
            logger.error(f"Failed to get user settings: {str(e)}")
            raise

    async def _validate_api_key_simple(self, provider_id: str, api_key: str) -> bool:
        """Simple API key validation without requiring full settings object"""
        try:
            # For test keys, just check format
            if api_key.startswith("sk-test-") or api_key.startswith("test-"):
                return True
            
            # For real validation, we'd make actual API calls
            # For now, just validate format based on provider
            if provider_id == "openai" and api_key.startswith("sk-"):
                return True
            elif provider_id == "anthropic" and api_key.startswith("sk-ant-"):
                return True
            elif provider_id == "google" and api_key.startswith("AIza"):
                return True
            elif provider_id in ["mistral", "cohere"] and len(api_key) > 10:
                return True
            else:
                return False
                
        except Exception as e:
            logger.error(f"Error validating {provider_id} key: {str(e)}")
            return False

    async def add_api_key(self, user_id: str, provider_id: str, api_key: str) -> bool:
        """Add or update API key for a provider using the provider registry"""
        try:
            # Validate provider exists in registry
            provider = provider_registry.get_provider(provider_id)
            if not provider:
                logger.error(f"Unknown provider: {provider_id}")
                return False
            
            # Encrypt the API key
            encrypted_key = self.key_manager.encrypt_key(api_key)
            masked_value = self.key_manager.mask_key(api_key)
            
            # Validate the key
            is_valid = await self._validate_api_key_simple(provider_id, api_key)
            validation_status = "valid" if is_valid else "invalid"
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            now = datetime.now(timezone.utc).isoformat()
            
            cursor.execute("""
                INSERT OR REPLACE INTO user_api_keys 
                (user_id, provider_id, encrypted_key, masked_value, is_active, validation_status, created_at)
                VALUES (?, ?, ?, ?, 1, ?, ?)
            """, (user_id, provider_id, encrypted_key, masked_value, validation_status, now))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Added {provider.name} API key for user {user_id} (valid: {is_valid})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add API key: {str(e)}")
            return False

    async def get_user_api_keys(self, user_id: str) -> List[UserAPIKey]:
        """Get all API keys for a user with provider registry information"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT provider_id, encrypted_key, masked_value, is_active, 
                       validation_status, usage_count, created_at, last_used
                FROM user_api_keys 
                WHERE user_id = ? AND is_active = 1
            """, (user_id,))
            
            results = cursor.fetchall()
            conn.close()
            
            api_keys = []
            for row in results:
                provider_id, encrypted_key, masked_value, is_active, validation_status, usage_count, created_at, last_used = row
                
                # Get provider info from registry
                provider = provider_registry.get_provider(provider_id)
                if not provider:
                    logger.warning(f"Provider {provider_id} not found in registry, skipping")
                    continue
                
                # Decrypt the key
                decrypted_key = self.key_manager.decrypt_key(encrypted_key)
                
                api_key = UserAPIKey(
                    provider=provider_id,
                    key_value=decrypted_key,
                    masked_value=masked_value,
                    is_active=bool(is_active),
                    validation_status=validation_status,
                    usage_count=usage_count,
                    created_at=datetime.fromisoformat(created_at) if created_at else datetime.now(timezone.utc),
                    last_used=datetime.fromisoformat(last_used) if last_used else None
                )
                api_keys.append(api_key)
            
            return api_keys
            
        except Exception as e:
            logger.error(f"Failed to get user API keys: {str(e)}")
            return []

    async def get_user_keys_for_execution(self, user_id: str) -> Dict[str, str]:
        """Get user API keys formatted for workflow execution"""
        try:
            api_keys = await self.get_user_api_keys(user_id)
            
            # Return only valid, active keys
            execution_keys = {}
            for key in api_keys:
                if key.is_active and key.validation_status == "valid":
                    execution_keys[key.provider] = key.key_value
            
            return execution_keys
            
        except Exception as e:
            logger.error(f"Failed to get execution keys: {str(e)}")
            return {}

    async def validate_api_key(self, user_id: str, provider_id: str) -> bool:
        """Validate a specific API key using the provider registry"""
        try:
            # Get the key
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT encrypted_key FROM user_api_keys 
                WHERE user_id = ? AND provider_id = ? AND is_active = 1
            """, (user_id, provider_id))
            
            result = cursor.fetchone()
            conn.close()
            
            if not result:
                return False
            
            # Decrypt and validate
            encrypted_key = result[0]
            api_key = self.key_manager.decrypt_key(encrypted_key)
            is_valid = await self._validate_api_key_simple(provider_id, api_key)
            
            # Update validation status
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            validation_status = "valid" if is_valid else "invalid"
            cursor.execute("""
                UPDATE user_api_keys 
                SET validation_status = ? 
                WHERE user_id = ? AND provider_id = ?
            """, (validation_status, user_id, provider_id))
            
            conn.commit()
            conn.close()
            
            return is_valid
            
        except Exception as e:
            logger.error(f"Failed to validate API key: {str(e)}")
            return False

    async def delete_api_key(self, user_id: str, provider_id: str) -> bool:
        """Delete (deactivate) an API key"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE user_api_keys 
                SET is_active = 0 
                WHERE user_id = ? AND provider_id = ?
            """, (user_id, provider_id))
            
            conn.commit()
            affected_rows = cursor.rowcount
            conn.close()
            
            if affected_rows > 0:
                logger.info(f"Deleted {provider_id} API key for user {user_id}")
                return True
            else:
                logger.warning(f"No API key found to delete for {provider_id}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to delete API key: {str(e)}")
            return False

    async def get_usage_stats(self, user_id: str) -> Dict[str, Any]:
        """Get usage statistics for a user with provider registry information"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT provider_id, usage_count, last_used, validation_status
                FROM user_api_keys 
                WHERE user_id = ? AND is_active = 1
            """, (user_id,))
            
            results = cursor.fetchall()
            conn.close()
            
            stats = {
                "total_keys": len(results),
                "valid_keys": 0,
                "invalid_keys": 0,
                "total_usage": 0,
                "provider_stats": [],
                "supported_providers": len(provider_registry.get_all_providers())
            }
            
            for provider_id, usage_count, last_used, validation_status in results:
                provider = provider_registry.get_provider(provider_id)
                provider_name = provider.name if provider else provider_id
                
                if validation_status == "valid":
                    stats["valid_keys"] += 1
                else:
                    stats["invalid_keys"] += 1
                
                stats["total_usage"] += usage_count or 0
                
                stats["provider_stats"].append({
                    "provider_id": provider_id,
                    "provider_name": provider_name,
                    "usage_count": usage_count or 0,
                    "last_used": last_used,
                    "validation_status": validation_status,
                    "icon": provider.icon if provider else "🔑"
                })
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get usage stats: {str(e)}")
            return {"error": str(e)}

    async def get_supported_providers(self) -> List[Dict[str, Any]]:
        """Get all supported providers from the registry"""
        try:
            providers = provider_registry.get_all_providers()
            return [
                {
                    "id": provider.id,
                    "name": provider.name,
                    "description": provider.description,
                    "icon": provider.icon,
                    "key_format": provider.key_format,
                    "get_key_url": provider.get_key_url,
                    "supported_models": provider.supported_models,
                    "pricing_info": provider.pricing_info
                }
                for provider in providers
            ]
        except Exception as e:
            logger.error(f"Failed to get supported providers: {str(e)}")
            return []

# Global service instance
user_settings_service = UserSettingsService()

# Quick access function
async def get_user_keys(user_id: str) -> Dict[str, str]:
    """Quick function to get user API keys for execution"""
    return await user_settings_service.get_user_keys_for_execution(user_id) 