#!/usr/bin/env python3
"""
🔑 Unified User Settings Service
Handles both direct database and REST API access with intelligent fallback
"""

import logging
from typing import Dict, Any, Optional, List
from services.supabase_user_settings_service import SupabaseUserSettingsService
from services.supabase_rest_service import supabase_rest_service

logger = logging.getLogger(__name__)

class UnifiedUserSettingsService:
    """Unified service that intelligently chooses between direct DB and REST API"""
    
    def __init__(self):
        self.db_service = None
        self.rest_service = supabase_rest_service
        self._force_rest_api = True  # Force REST API usage
        self._service_type = None
    
    def _get_service(self):
        """Get the appropriate service (always REST API now)"""
        if self._force_rest_api:
            logger.info("🌐 Using Supabase REST API for user settings")
            self._service_type = "rest_api"
            return self.rest_service
        
        # This code path is now disabled but kept for reference
        if self._service_type == "rest_api":
            return self.rest_service
        elif self._service_type == "direct_db":
            return self.db_service
        
        # Try direct database first
        try:
            if not self.db_service:
                self.db_service = SupabaseUserSettingsService()
            
            # Test the connection
            test_result = self.db_service.get_user_api_keys("test")
            self._service_type = "direct_db"
            logger.info("✅ Using direct database connection for user settings")
            return self.db_service
        except Exception as e:
            logger.warning(f"⚠️ Direct database failed, falling back to REST API: {str(e)}")
            self._service_type = "rest_api"
            logger.info("🌐 Using Supabase REST API for user settings")
            return self.rest_service
    
    def get_key_manager(self):
        """Get the key manager for encryption/decryption operations"""
        # Always use the REST service's key manager since it has the same encryption logic
        return self.rest_service.key_manager
    
    async def get_user_api_keys(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user API keys"""
        try:
            service = self._get_service()
            if self._service_type == "rest_api":
                return await service.get_user_api_keys(user_id)
            else:
                return service.get_user_api_keys(user_id)
        except Exception as e:
            logger.error(f"Failed to get user API keys: {str(e)}")
            return []
    
    async def save_user_api_key(self, user_id: str, provider_id: str, api_key: str) -> bool:
        """Save user API key"""
        try:
            service = self._get_service()
            if self._service_type == "rest_api":
                return await service.save_user_api_key(user_id, provider_id, api_key)
            else:
                return service.save_user_api_key(user_id, provider_id, api_key)
        except Exception as e:
            logger.error(f"Failed to save user API key: {str(e)}")
            return False
    
    async def validate_api_key(self, user_id: str, provider_id: str) -> bool:
        """Validate user API key"""
        try:
            service = self._get_service()
            if self._service_type == "rest_api":
                # For REST API service, we need to implement validation
                # Get the API keys first, then validate the specific one
                api_keys = await service.get_user_api_keys(user_id)
                
                # Find the specific key
                target_key = None
                for key in api_keys:
                    if key.get('provider_id') == provider_id:
                        target_key = key
                        break
                
                if not target_key:
                    logger.warning(f"No API key found for provider {provider_id}")
                    return False
                
                # Decrypt and validate using the key manager
                try:
                    decrypted_key = service.key_manager.decrypt_key(target_key['encrypted_key'])
                    
                    # Use the validation method from the key manager
                    from models.user_settings import UserSettings, UserAPIKey
                    temp_settings = UserSettings(
                        user_id=user_id,
                        api_keys=[UserAPIKey(
                            provider=provider_id,
                            key_value=decrypted_key,  # This is already decrypted, don't encrypt it
                            masked_value=target_key.get('masked_value', '')
                        )]
                    )
                    
                    # FIXED: Call the validation method directly with the decrypted key
                    # instead of going through the validate_key method that tries to decrypt again
                    if provider_id == "perplexity":
                        validation_result = await service.key_manager._validate_perplexity_key(decrypted_key)
                    elif provider_id == "openai":
                        validation_result = await service.key_manager._validate_openai_key(decrypted_key)
                    elif provider_id == "anthropic":
                        validation_result = await service.key_manager._validate_anthropic_key(decrypted_key)
                    elif provider_id == "openrouter":
                        validation_result = await service.key_manager._validate_openrouter_key(decrypted_key)
                    elif provider_id == "google":
                        validation_result = await service.key_manager._validate_google_key(decrypted_key)
                    else:
                        validation_result = {"valid": False, "error": f"Validation not implemented for {provider_id}"}
                    
                    is_valid = validation_result.get("valid", False)
                    
                    # Update the validation status in the database
                    if is_valid:
                        # Update the key's validation status
                        await service._update_key_validation_status(user_id, provider_id, "valid")
                    else:
                        await service._update_key_validation_status(user_id, provider_id, "invalid")
                    
                    logger.info(f"Validation result for {provider_id}: {validation_result}")
                    return is_valid
                    
                except Exception as e:
                    logger.error(f"Error validating API key: {str(e)}")
                    return False
            else:
                return await service.validate_api_key(user_id, provider_id)
        except Exception as e:
            logger.error(f"Failed to validate user API key: {str(e)}")
            return False
    
    async def save_user_settings(self, user_id: str, settings: Dict[str, Any]) -> bool:
        """Save user settings via REST API"""
        try:
            # This is a placeholder - implement when needed
            logger.info(f"Saving user settings for {user_id} (placeholder)")
            return True
        except Exception as e:
            logger.error(f"Failed to save user settings: {str(e)}")
            return False
    
    async def get_usage_stats(self, user_id: str) -> Dict[str, Any]:
        """Get usage statistics for a user"""
        try:
            # This is a placeholder - implement when needed
            logger.info(f"Getting usage stats for {user_id} (placeholder)")
            return {}
        except Exception as e:
            logger.error(f"Failed to get usage stats: {str(e)}")
            return {}

# Create global instance
user_settings_service = UnifiedUserSettingsService() 