#!/usr/bin/env python3
"""
🔑 Supabase REST API Service
Simple implementation using service role key for backend operations
"""

import logging
import json
import aiohttp
import os
from typing import Dict, Any, Optional, List
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables at module level
load_dotenv('.env')

logger = logging.getLogger(__name__)

class SupabaseRestService:
    """Supabase service using service role key for backend operations"""
    
    def __init__(self):
        # Initialize immediately in constructor
        self.supabase_url = os.environ.get("SUPABASE_URL")
        self.supabase_anon_key = os.environ.get("SUPABASE_ANON_KEY")
        self.supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.supabase_url or not self.supabase_anon_key:
            raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY are required")
        
        if not self.supabase_service_key:
            logger.warning("SUPABASE_SERVICE_ROLE_KEY not found - using anon key (may have RLS issues)")
            self.supabase_service_key = self.supabase_anon_key
        
        # Import here to avoid circular imports
        from models.user_settings import UserAPIKeyManager
        self.key_manager = UserAPIKeyManager()
        self._initialized = True
        
        logger.info(f"✅ Supabase service initialized with URL: {self.supabase_url[:50]}...")
    
    def _ensure_initialized(self):
        """Ensure the service is initialized with environment variables"""
        if not self._initialized:
            raise RuntimeError("Service should have been initialized in constructor")
    
    async def _resolve_user_id(self, user_id: str) -> str:
        """Resolve user ID, converting 'anonymous' to proper UUID"""
        if user_id == "anonymous":
            # For development, create a consistent anonymous user ID
            return "f31db8d3-7b54-46b5-bebf-1ea7b6b2edff"
        
        # For authenticated users, validate that the user_id is a valid UUID
        try:
            import uuid
            uuid.UUID(user_id)  # This will raise ValueError if not a valid UUID
            logger.info(f"✅ Using authenticated user ID: {user_id}")
            return user_id
        except ValueError:
            logger.warning(f"⚠️ Invalid user ID format: {user_id}, falling back to anonymous")
            return "f31db8d3-7b54-46b5-bebf-1ea7b6b2edff"
    
    def _get_headers(self, use_service_key: bool = False) -> Dict[str, str]:
        """Get headers for Supabase REST API requests"""
        self._ensure_initialized()
        
        # Use service key for backend operations to bypass RLS
        key = self.supabase_service_key if use_service_key else self.supabase_anon_key
        
        return {
            "apikey": self.supabase_anon_key,  # Always use anon key for apikey header
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        }
    
    async def test_connection(self) -> bool:
        """Test the Supabase REST API connection"""
        try:
            self._ensure_initialized()
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.supabase_url}/rest/v1/user_profiles?select=id&limit=1",
                    headers=self._get_headers(),
                    timeout=10
                ) as response:
                    if response.status == 200:
                        logger.info("✅ Supabase REST API connection successful")
                        return True
                    else:
                        logger.error(f"❌ Supabase REST API error: {response.status}")
                        return False
        except Exception as e:
            logger.error(f"❌ Supabase REST API connection failed: {str(e)}")
            return False
    
    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile via REST API"""
        try:
            self._ensure_initialized()
            resolved_user_id = await self._resolve_user_id(user_id)
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.supabase_url}/rest/v1/user_profiles?user_id=eq.{resolved_user_id}",
                    headers=self._get_headers(use_service_key=True)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data[0] if data else None
                    return None
        except Exception as e:
            logger.error(f"Failed to get user profile: {str(e)}")
            return None
    
    async def create_user_profile(self, user_id: str, username: str = None) -> bool:
        """Create user profile via REST API"""
        try:
            self._ensure_initialized()
            resolved_user_id = await self._resolve_user_id(user_id)
            
            profile_data = {
                "user_id": resolved_user_id,
                "username": username or f"user_{resolved_user_id[:8]}",
                "updated_at": datetime.utcnow().isoformat()
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.supabase_url}/rest/v1/user_profiles",
                    headers=self._get_headers(use_service_key=True),
                    json=profile_data
                ) as response:
                    return response.status in [200, 201]
        except Exception as e:
            logger.error(f"Failed to create user profile: {str(e)}")
            return False
    
    async def get_user_api_keys(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user API keys via REST API"""
        try:
            self._ensure_initialized()
            resolved_user_id = await self._resolve_user_id(user_id)
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.supabase_url}/rest/v1/user_api_keys?user_id=eq.{resolved_user_id}&is_active=eq.true",
                    headers=self._get_headers(use_service_key=True)
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    return []
        except Exception as e:
            logger.error(f"Failed to get user API keys: {str(e)}")
            return []
    
    async def save_user_api_key(self, user_id: str, provider_id: str, api_key: str) -> bool:
        """Save user API key via REST API using service role key"""
        try:
            self._ensure_initialized()
            resolved_user_id = await self._resolve_user_id(user_id)
            logger.info(f"🔑 Saving API key for user {user_id} (resolved: {resolved_user_id}), provider {provider_id}")
            
            # Ensure user profile exists first
            profile = await self.get_user_profile(user_id)
            if not profile:
                logger.info(f"Creating user profile for {user_id}")
                await self.create_user_profile(user_id)
            
            # Encrypt the key
            encrypted_key = self.key_manager.encrypt_key(api_key)
            masked_value = self.key_manager.mask_key(api_key)
            
            key_data = {
                "user_id": resolved_user_id,
                "provider_id": provider_id,
                "encrypted_key": encrypted_key,
                "masked_value": masked_value,
                "is_active": True,
                "validation_status": "pending",
                "usage_count": 0,
                "created_at": datetime.utcnow().isoformat()
            }
            
            logger.info(f"🔑 Using service role key for backend operation")
            logger.info(f"🔑 Key data to save: {key_data}")
            
            # Try PATCH first (update existing)
            patch_url = f"{self.supabase_url}/rest/v1/user_api_keys?user_id=eq.{resolved_user_id}&provider_id=eq.{provider_id}"
            headers = self._get_headers(use_service_key=True)
            headers["Prefer"] = "count=exact"  # Get count of affected rows
            
            logger.info(f"🔑 PATCH URL: {patch_url}")
            logger.info(f"🔑 PATCH Headers: {headers}")
            
            async with aiohttp.ClientSession() as session:
                async with session.patch(patch_url, json=key_data, headers=headers) as response:
                    response_text = await response.text()
                    content_range = response.headers.get('content-range', '')
                    
                    logger.info(f"🔑 PATCH response: {response.status}, {response_text}")
                    logger.info(f"🔑 PATCH content-range: {content_range}")
                    
                    # Parse content-range to see if any rows were affected
                    # Format: "*/0" means 0 rows affected, "0-0/1" means 1 row affected
                    rows_affected = 0
                    if content_range:
                        if '/' in content_range:
                            total_part = content_range.split('/')[-1]
                            if total_part.isdigit():
                                rows_affected = int(total_part)
                    
                    if response.status in [200, 204] and rows_affected > 0:
                        logger.info("✅ Successfully updated existing API key")
                        return True
                    elif response.status in [200, 204] and rows_affected == 0:
                        logger.info("🔄 PATCH affected 0 rows, falling back to POST")
                        # Fall through to POST
                    else:
                        logger.error(f"PATCH failed: {response.status} - {response_text}")
                        return False
                
                # If PATCH didn't work, try POST (create new)
                post_url = f"{self.supabase_url}/rest/v1/user_api_keys"
                headers = self._get_headers(use_service_key=True)
                
                logger.info(f"🔑 POST URL: {post_url}")
                logger.info(f"🔑 POST Headers: {headers}")
                
                async with session.post(post_url, json=key_data, headers=headers) as response:
                    response_text = await response.text()
                    logger.info(f"🔑 POST response: {response.status}, {response_text}")
                    
                    if response.status in [200, 201]:
                        logger.info("✅ Successfully created new API key")
                        return True
                    else:
                        logger.error(f"POST failed: {response.status} - {response_text}")
                        return False
                        
        except Exception as e:
            logger.error(f"Failed to save API key: {str(e)}")
            return False

    async def _update_key_validation_status(self, user_id: str, provider_id: str, status: str) -> bool:
        """Update the validation status of an API key"""
        try:
            self._ensure_initialized()
            resolved_user_id = await self._resolve_user_id(user_id)
            
            update_data = {
                "validation_status": status,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            patch_url = f"{self.supabase_url}/rest/v1/user_api_keys?user_id=eq.{resolved_user_id}&provider_id=eq.{provider_id}"
            headers = self._get_headers(use_service_key=True)
            
            async with aiohttp.ClientSession() as session:
                async with session.patch(patch_url, json=update_data, headers=headers) as response:
                    if response.status in [200, 204]:
                        logger.info(f"✅ Updated validation status for {provider_id} to {status}")
                        return True
                    else:
                        response_text = await response.text()
                        logger.error(f"Failed to update validation status: {response.status} - {response_text}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error updating validation status: {str(e)}")
            return False

# Create global instance
supabase_rest_service = SupabaseRestService() 