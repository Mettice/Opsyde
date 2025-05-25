# backend/models/user_settings.py - NEW FILE
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
import json
import logging
from cryptography.fernet import Fernet
import os

logger = logging.getLogger(__name__)

class UserAPIKey(BaseModel):
    """Individual API key with metadata"""
    provider: str  # openai, anthropic, openrouter, etc.
    key_value: str  # encrypted key
    masked_value: str  # display value (e.g., "sk-...abc123")
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    last_validated: Optional[datetime] = None
    validation_status: Optional[str] = None  # "valid", "invalid", "untested"
    usage_count: int = 0
    last_used: Optional[datetime] = None

class IntegrationCredential(BaseModel):
    """Service integration credentials"""
    service: str  # hubspot, slack, notion, etc.
    credential_type: str  # api_key, webhook_url, oauth_token
    credential_value: str  # encrypted value
    masked_value: str
    service_account_id: Optional[str] = None
    scopes: List[str] = Field(default_factory=list)
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None

class UserSettings(BaseModel):
    """User-specific settings and preferences"""
    user_id: str
    
    # API Keys for LLM providers
    api_keys: List[UserAPIKey] = Field(default_factory=list)
    
    # Integration credentials
    integrations: List[IntegrationCredential] = Field(default_factory=list)
    
    # User preferences
    preferences: Dict[str, Any] = Field(default_factory=dict)
    
    # Default selections
    default_llm_provider: Optional[str] = None
    default_model: Optional[str] = None
    
    # Usage tracking
    monthly_usage: Dict[str, int] = Field(default_factory=dict)  # provider -> token count
    usage_limits: Dict[str, int] = Field(default_factory=dict)   # provider -> limit
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class UserAPIKeyManager:
    """Manages user API keys with encryption"""
    
    def __init__(self):
        # Get encryption key from environment or generate one
        self.encryption_key = self._get_or_create_encryption_key()
        self.cipher = Fernet(self.encryption_key)
    
    def _get_or_create_encryption_key(self) -> bytes:
        """Get encryption key from environment or create new one"""
        key_env = os.getenv("USER_ENCRYPTION_KEY")
        if key_env:
            return key_env.encode()
        
        # In production, this should be stored securely
        # For development, we'll generate and warn
        key = Fernet.generate_key()
        logger.warning("Generated new encryption key. In production, set USER_ENCRYPTION_KEY environment variable.")
        return key
    
    def encrypt_key(self, api_key: str) -> str:
        """Encrypt an API key"""
        return self.cipher.encrypt(api_key.encode()).decode()
    
    def decrypt_key(self, encrypted_key: str) -> str:
        """Decrypt an API key"""
        return self.cipher.decrypt(encrypted_key.encode()).decode()
    
    def mask_key(self, api_key: str) -> str:
        """Create masked version for display"""
        if not api_key or len(api_key) < 8:
            return "••••••••"
        return f"{api_key[:4]}••••{api_key[-4:]}"
    
    async def add_api_key(self, user_settings: UserSettings, provider: str, api_key: str) -> UserAPIKey:
        """Add a new API key for a user"""
        # Encrypt the key
        encrypted_key = self.encrypt_key(api_key)
        masked_key = self.mask_key(api_key)
        
        # Create the key object
        user_api_key = UserAPIKey(
            provider=provider,
            key_value=encrypted_key,
            masked_value=masked_key,
            validation_status="untested"
        )
        
        # Remove existing key for this provider if it exists
        user_settings.api_keys = [k for k in user_settings.api_keys if k.provider != provider]
        
        # Add new key
        user_settings.api_keys.append(user_api_key)
        user_settings.updated_at = datetime.now()
        
        return user_api_key
    
    async def get_decrypted_key(self, user_settings: UserSettings, provider: str) -> Optional[str]:
        """Get decrypted API key for a provider"""
        for key in user_settings.api_keys:
            if key.provider == provider and key.is_active:
                try:
                    return self.decrypt_key(key.key_value)
                except Exception as e:
                    logger.error(f"Failed to decrypt key for {provider}: {str(e)}")
                    return None
        return None
    
    async def validate_key(self, user_settings: UserSettings, provider: str) -> Dict[str, Any]:
        """Validate an API key by making a test call"""
        api_key = await self.get_decrypted_key(user_settings, provider)
        if not api_key:
            return {"valid": False, "error": "No API key found"}
        
        try:
            # Test the key based on provider
            if provider == "openai":
                return await self._test_openai_key(api_key)
            elif provider == "anthropic":
                return await self._test_anthropic_key(api_key)
            elif provider == "openrouter":
                return await self._test_openrouter_key(api_key)
            else:
                return {"valid": False, "error": f"Validation not implemented for {provider}"}
                
        except Exception as e:
            return {"valid": False, "error": str(e)}
    
    async def _test_openai_key(self, api_key: str) -> Dict[str, Any]:
        """Test OpenAI API key"""
        import aiohttp
        
        headers = {"Authorization": f"Bearer {api_key}"}
        
        async with aiohttp.ClientSession() as session:
            async with session.get("https://api.openai.com/v1/models", headers=headers) as response:
                if response.status == 200:
                    return {"valid": True, "status": "Active"}
                else:
                    error_text = await response.text()
                    return {"valid": False, "error": f"API returned {response.status}: {error_text}"}
    
    async def _test_anthropic_key(self, api_key: str) -> Dict[str, Any]:
        """Test Anthropic API key"""
        import aiohttp
        
        headers = {"x-api-key": api_key, "Content-Type": "application/json"}
        data = {
            "model": "claude-3-haiku-20240307",
            "max_tokens": 10,
            "messages": [{"role": "user", "content": "test"}]
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post("https://api.anthropic.com/v1/messages", headers=headers, json=data) as response:
                if response.status == 200:
                    return {"valid": True, "status": "Active"}
                else:
                    error_text = await response.text()
                    return {"valid": False, "error": f"API returned {response.status}: {error_text}"}
    
    async def _test_openrouter_key(self, api_key: str) -> Dict[str, Any]:
        """Test OpenRouter API key"""
        import aiohttp
        
        headers = {"Authorization": f"Bearer {api_key}"}
        
        async with aiohttp.ClientSession() as session:
            async with session.get("https://openrouter.ai/api/v1/models", headers=headers) as response:
                if response.status == 200:
                    return {"valid": True, "status": "Active"}
                else:
                    error_text = await response.text()
                    return {"valid": False, "error": f"API returned {response.status}: {error_text}"}

# Global instance
user_key_manager = UserAPIKeyManager()

class UserPreferences(BaseModel):
    """User workflow and UI preferences"""
    # UI preferences
    theme: str = "light"  # light, dark, auto
    canvas_zoom: float = 1.0
    auto_save: bool = True
    show_minimap: bool = True
    
    # Workflow preferences
    default_node_timeout: int = 30
    auto_connect_nodes: bool = True
    show_execution_details: bool = True
    
    # Notification preferences
    email_notifications: bool = True
    workflow_completion_notifications: bool = True
    error_notifications: bool = True
    
    # AI preferences
    preferred_ai_style: str = "balanced"  # creative, balanced, precise
    auto_suggest_integrations: bool = True
    enable_smart_outputs: bool = True

class UserQuotas(BaseModel):
    """User usage quotas and limits"""
    # Monthly limits
    monthly_workflow_runs: int = 1000
    monthly_ai_calls: int = 10000
    monthly_integration_calls: int = 5000
    
    # Current usage
    current_workflow_runs: int = 0
    current_ai_calls: int = 0
    current_integration_calls: int = 0
    
    # Reset date
    quota_reset_date: datetime = Field(default_factory=lambda: datetime.now().replace(day=1))
    
    def is_quota_exceeded(self, quota_type: str) -> bool:
        """Check if a quota is exceeded"""
        current_usage = {
            "workflow_runs": self.current_workflow_runs,
            "ai_calls": self.current_ai_calls,
            "integration_calls": self.current_integration_calls
        }
        
        monthly_limits = {
            "workflow_runs": self.monthly_workflow_runs,
            "ai_calls": self.monthly_ai_calls,
            "integration_calls": self.monthly_integration_calls
        }
        
        return current_usage.get(quota_type, 0) >= monthly_limits.get(quota_type, 0)