#!/usr/bin/env python3
"""
🔑 User Settings Models
Complete BYOK (Bring Your Own Keys) data models
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
import base64
import os
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

class UserAPIKey(BaseModel):
    """Model for user API keys"""
    provider: str
    key_value: str  # Encrypted
    masked_value: str
    is_active: bool = True
    validation_status: str = "untested"  # untested, valid, invalid, expired
    usage_count: int = 0
    created_at: datetime = Field(default_factory=datetime.now)
    last_used: Optional[datetime] = None

class IntegrationCredential(BaseModel):
    """Model for integration credentials (webhooks, tokens, etc.)"""
    service: str
    credential_type: str  # webhook_url, token, api_key, etc.
    credential_value: str  # Encrypted
    masked_value: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None

class UserPreferences(BaseModel):
    """User preferences and settings"""
    theme: str = "light"
    language: str = "en"
    timezone: str = "UTC"
    notifications_enabled: bool = True
    email_notifications: bool = True
    auto_save: bool = True
    execution_timeout: int = 300  # seconds
    max_concurrent_workflows: int = 5

class UserQuotas(BaseModel):
    """User usage quotas and limits"""
    monthly_executions: int = 1000
    monthly_ai_tokens: int = 100000
    max_workflows: int = 50
    max_nodes_per_workflow: int = 100
    storage_mb: int = 100

class UserSettings(BaseModel):
    """Complete user settings model"""
    user_id: str
    api_keys: List[UserAPIKey] = []
    integrations: List[IntegrationCredential] = []
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    quotas: UserQuotas = Field(default_factory=UserQuotas)
    
    # Usage tracking
    monthly_usage: Dict[str, int] = Field(default_factory=dict)
    usage_limits: Dict[str, int] = Field(default_factory=dict)
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    last_login: Optional[datetime] = None

class UserAPIKeyManager:
    """Manages encryption/decryption and validation of API keys"""
    
    def __init__(self):
        # Generate or load encryption key
        self.encryption_key = self._get_or_create_encryption_key()
        self.cipher = Fernet(self.encryption_key)
    
    def _get_or_create_encryption_key(self) -> bytes:
        """Get or create encryption key for API keys"""
        key_file = "encryption.key"
        
        if os.path.exists(key_file):
            with open(key_file, "rb") as f:
                return f.read()
        else:
            # Generate new key
            key = Fernet.generate_key()
            with open(key_file, "wb") as f:
                f.write(key)
            logger.info("Generated new encryption key for API keys")
            return key
    
    def encrypt_key(self, api_key: str) -> str:
        """Encrypt an API key"""
        encrypted = self.cipher.encrypt(api_key.encode())
        return base64.b64encode(encrypted).decode()
    
    def decrypt_key(self, encrypted_key: str) -> str:
        """Decrypt an API key"""
        encrypted_bytes = base64.b64decode(encrypted_key.encode())
        decrypted = self.cipher.decrypt(encrypted_bytes)
        return decrypted.decode()
    
    def mask_key(self, api_key: str) -> str:
        """Create a masked version of the API key for display"""
        if len(api_key) <= 8:
            return "*" * len(api_key)
        
        # Show first 4 and last 4 characters
        return f"{api_key[:4]}{'*' * (len(api_key) - 8)}{api_key[-4:]}"
    
    async def validate_key(self, settings: UserSettings, provider: str) -> Dict[str, Any]:
        """Validate an API key by making a test call"""
        try:
            # Find the key
            api_key = None
            for key in settings.api_keys:
                if key.provider == provider and key.is_active:
                    api_key = self.decrypt_key(key.key_value)
                    break
            
            if not api_key:
                return {"valid": False, "error": "No API key found"}
            
            # Validate based on provider
            if provider == "openai":
                return await self._validate_openai_key(api_key)
            elif provider == "anthropic":
                return await self._validate_anthropic_key(api_key)
            elif provider == "openrouter":
                return await self._validate_openrouter_key(api_key)
            elif provider == "google":
                return await self._validate_google_key(api_key)
            else:
                return {"valid": False, "error": f"Validation not implemented for {provider}"}
                
        except Exception as e:
            logger.error(f"Error validating {provider} key: {str(e)}")
            return {"valid": False, "error": str(e)}
    
    async def _validate_openai_key(self, api_key: str) -> Dict[str, Any]:
        """Validate OpenAI API key"""
        try:
            import aiohttp
            
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://api.openai.com/v1/models",
                    headers=headers,
                    timeout=10
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        models = [model["id"] for model in data.get("data", [])]
                        return {
                            "valid": True,
                            "provider": "openai",
                            "models_available": models[:5],  # First 5 models
                            "total_models": len(models)
                        }
                    else:
                        error_text = await response.text()
                        return {
                            "valid": False,
                            "error": f"OpenAI API error: {response.status} - {error_text}"
                        }
                        
        except Exception as e:
            return {"valid": False, "error": f"OpenAI validation failed: {str(e)}"}
    
    async def _validate_anthropic_key(self, api_key: str) -> Dict[str, Any]:
        """Validate Anthropic API key"""
        try:
            import aiohttp
            
            headers = {
                "x-api-key": api_key,
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01"
            }
            
            # Make a minimal test request
            payload = {
                "model": "claude-3-haiku-20240307",
                "max_tokens": 1,
                "messages": [{"role": "user", "content": "Hi"}]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.anthropic.com/v1/messages",
                    headers=headers,
                    json=payload,
                    timeout=10
                ) as response:
                    if response.status == 200:
                        return {
                            "valid": True,
                            "provider": "anthropic",
                            "models_available": ["claude-3-haiku", "claude-3-sonnet", "claude-3-opus"]
                        }
                    else:
                        error_text = await response.text()
                        return {
                            "valid": False,
                            "error": f"Anthropic API error: {response.status} - {error_text}"
                        }
                        
        except Exception as e:
            return {"valid": False, "error": f"Anthropic validation failed: {str(e)}"}
    
    async def _validate_openrouter_key(self, api_key: str) -> Dict[str, Any]:
        """Validate OpenRouter API key"""
        try:
            import aiohttp
            
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://openrouter.ai/api/v1/models",
                    headers=headers,
                    timeout=10
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        models = [model["id"] for model in data.get("data", [])]
                        return {
                            "valid": True,
                            "provider": "openrouter",
                            "models_available": models[:5],
                            "total_models": len(models)
                        }
                    else:
                        error_text = await response.text()
                        return {
                            "valid": False,
                            "error": f"OpenRouter API error: {response.status} - {error_text}"
                        }
                        
        except Exception as e:
            return {"valid": False, "error": f"OpenRouter validation failed: {str(e)}"}
    
    async def _validate_google_key(self, api_key: str) -> Dict[str, Any]:
        """Validate Google API key"""
        try:
            import aiohttp
            
            # Test with a simple API call
            url = f"https://generativelanguage.googleapis.com/v1/models?key={api_key}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        models = [model["name"] for model in data.get("models", [])]
                        return {
                            "valid": True,
                            "provider": "google",
                            "models_available": models[:5],
                            "total_models": len(models)
                        }
                    else:
                        error_text = await response.text()
                        return {
                            "valid": False,
                            "error": f"Google API error: {response.status} - {error_text}"
                        }
                        
        except Exception as e:
            return {"valid": False, "error": f"Google validation failed: {str(e)}"}

# API Response Models
class APIKeyResponse(BaseModel):
    """Response model for API key operations"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

class UserSettingsResponse(BaseModel):
    """Response model for user settings"""
    success: bool
    settings: Optional[UserSettings] = None
    message: str = ""

class ValidationResponse(BaseModel):
    """Response model for API key validation"""
    valid: bool
    provider: str
    error: Optional[str] = None
    models_available: Optional[List[str]] = None
    total_models: Optional[int] = None