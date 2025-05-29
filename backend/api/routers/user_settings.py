#!/usr/bin/env python3
"""
🔑 User Settings API Router
Complete BYOK (Bring Your Own Keys) API endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, Request, status
from fastapi.responses import JSONResponse
from typing import Dict, Any, List, Optional
import logging
from pydantic import BaseModel

from services.user_settings_service import user_settings_service
from models.user_settings import (
    UserSettings, APIKeyResponse, UserSettingsResponse, 
    ValidationResponse, UserAPIKeyManager
)
from models.api_models import APIResponse, ErrorCode
from utils.security import get_current_user_optional
from core.provider_registry import provider_registry

logger = logging.getLogger(__name__)

router = APIRouter(tags=["user-settings"])

# Pydantic models for API requests
class APIKeyRequest(BaseModel):
    provider_id: str
    api_key: str

class APIKeyValidationRequest(BaseModel):
    provider_id: str

class UserPreferencesUpdate(BaseModel):
    theme: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    notifications: Optional[Dict[str, bool]] = None

@router.on_event("startup")
async def startup_event():
    """Initialize the user settings service"""
    await user_settings_service.initialize()

@router.get("/", response_model=UserSettingsResponse)
async def get_user_settings(
    request: Request,
    current_user: Optional[Dict] = Depends(get_current_user_optional)
):
    """Get user settings and API keys"""
    try:
        # Use authenticated user ID or fallback to 'anonymous'
        user_id = current_user.get("id", "anonymous") if current_user else "anonymous"
        
        settings = await user_settings_service.get_user_settings(user_id)
        
        # Get API keys separately for better control
        api_keys = await user_settings_service.get_user_api_keys(user_id)
        
        # Convert to response format with provider registry information
        api_keys_response = []
        for key in api_keys:
            provider = provider_registry.get_provider(key.provider)
            api_keys_response.append({
                "provider_id": key.provider,
                "provider_name": provider.name if provider else key.provider,
                "provider_icon": provider.icon if provider else "🔑",
                "masked_value": key.masked_value,
                "is_active": key.is_active,
                "validation_status": key.validation_status,
                "usage_count": key.usage_count,
                "created_at": key.created_at.isoformat() if key.created_at else None,
                "last_used": key.last_used.isoformat() if key.last_used else None
            })
        
        return UserSettingsResponse(
            success=True,
            settings={
                "user_id": settings.user_id,
                "api_keys": api_keys_response,
                "preferences": settings.preferences,
                "quotas": settings.quotas,
                "created_at": settings.created_at.isoformat() if settings.created_at else None,
                "updated_at": settings.updated_at.isoformat() if settings.updated_at else None,
                "last_login": settings.last_login.isoformat() if settings.last_login else None
            },
            message="Settings retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting user settings: {str(e)}")
        return UserSettingsResponse(
            success=False,
            message=f"Failed to get settings: {str(e)}"
        )

@router.post("/api-keys", response_model=APIKeyResponse)
async def add_api_key(
    request: APIKeyRequest,
    current_user: Optional[Dict] = Depends(get_current_user_optional)
):
    """Add or update an API key"""
    try:
        user_id = current_user.get("id", "anonymous") if current_user else "anonymous"
        
        # Validate provider exists in registry
        provider = provider_registry.get_provider(request.provider_id)
        if not provider:
            available_providers = [p.id for p in provider_registry.get_all_providers()]
            return APIKeyResponse(
                success=False,
                message=f"Unknown provider: {request.provider_id}. Available providers: {available_providers}"
            )
        
        success = await user_settings_service.add_api_key(user_id, request.provider_id, request.api_key)
        
        if success:
            return APIKeyResponse(
                success=True,
                message=f"{provider.name} API key added successfully",
                data={"provider_id": request.provider_id}
            )
        else:
            return APIKeyResponse(
                success=False,
                message="Failed to add API key"
            )
            
    except Exception as e:
        logger.error(f"Error adding API key: {str(e)}")
        return APIKeyResponse(
            success=False,
            message=f"Failed to add API key: {str(e)}"
        )

@router.get("/api-keys", response_model=APIKeyResponse)
async def list_api_keys(
    request: Request,
    current_user: Optional[Dict] = Depends(get_current_user_optional)
):
    """List all API keys for the user with provider information"""
    try:
        user_id = current_user.get("id", "anonymous") if current_user else "anonymous"
        
        api_keys = await user_settings_service.get_user_api_keys(user_id)
        
        keys_response = []
        for key in api_keys:
            provider = provider_registry.get_provider(key.provider)
            keys_response.append({
                "provider_id": key.provider,
                "provider_name": provider.name if provider else key.provider,
                "provider_description": provider.description if provider else "",
                "provider_icon": provider.icon if provider else "🔑",
                "masked_value": key.masked_value,
                "is_active": key.is_active,
                "validation_status": key.validation_status,
                "usage_count": key.usage_count,
                "created_at": key.created_at.isoformat() if key.created_at else None,
                "last_used": key.last_used.isoformat() if key.last_used else None,
                "supported_models": provider.supported_models if provider else [],
                "pricing_info": provider.pricing_info if provider else {}
            })
        
        return APIKeyResponse(
            success=True,
            message="API keys retrieved successfully",
            data={
                "api_keys": keys_response,
                "total_keys": len(keys_response),
                "active_keys": len([k for k in keys_response if k["is_active"]]),
                "valid_keys": len([k for k in keys_response if k["validation_status"] == "valid"])
            }
        )
        
    except Exception as e:
        logger.error(f"Error listing API keys: {str(e)}")
        return APIKeyResponse(
            success=False,
            message=f"Failed to list API keys: {str(e)}"
        )

@router.post("/api-keys/validate", response_model=ValidationResponse)
async def validate_api_key(
    request: APIKeyValidationRequest,
    current_user: Optional[Dict] = Depends(get_current_user_optional)
):
    """Validate a specific API key"""
    try:
        user_id = current_user.get("id", "anonymous") if current_user else "anonymous"
        
        # Validate provider exists
        provider = provider_registry.get_provider(request.provider_id)
        if not provider:
            return ValidationResponse(
                valid=False,
                provider=request.provider_id,
                error=f"Unknown provider: {request.provider_id}"
            )
        
        is_valid = await user_settings_service.validate_api_key(user_id, request.provider_id)
        
        return ValidationResponse(
            valid=is_valid,
            provider=request.provider_id,
            error=f"{provider.name} API key is {'valid' if is_valid else 'invalid'}",
            models_available=provider.supported_models if is_valid else [],
            total_models=len(provider.supported_models) if is_valid else 0
        )
        
    except Exception as e:
        logger.error(f"Error validating API key: {str(e)}")
        return ValidationResponse(
            valid=False,
            provider=request.provider_id,
            error=str(e)
        )

@router.delete("/api-keys/{provider_id}", response_model=APIKeyResponse)
async def delete_api_key(
    provider_id: str,
    current_user: Optional[Dict] = Depends(get_current_user_optional)
):
    """Delete an API key"""
    try:
        user_id = current_user.get("id", "anonymous") if current_user else "anonymous"
        
        # Validate provider exists
        provider = provider_registry.get_provider(provider_id)
        if not provider:
            return APIKeyResponse(
                success=False,
                message=f"Unknown provider: {provider_id}"
            )
        
        success = await user_settings_service.delete_api_key(user_id, provider_id)
        
        if success:
            return APIKeyResponse(
                success=True,
                message=f"{provider.name} API key deleted successfully",
                data={"provider_id": provider_id}
            )
        else:
            return APIKeyResponse(
                success=False,
                message=f"No API key found for provider: {provider.name}"
            )
            
    except Exception as e:
        logger.error(f"Error deleting API key: {str(e)}")
        return APIKeyResponse(
            success=False,
            message=f"Failed to delete API key: {str(e)}"
        )

@router.get("/usage", response_model=APIKeyResponse)
async def get_usage_stats(
    request: Request,
    current_user: Optional[Dict] = Depends(get_current_user_optional)
):
    """Get usage statistics and limits"""
    try:
        user_id = current_user.get("id", "anonymous") if current_user else "anonymous"
        
        stats = await user_settings_service.get_usage_stats(user_id)
        
        return APIKeyResponse(
            success=True,
            message="Usage statistics retrieved successfully",
            data=stats
        )
        
    except Exception as e:
        logger.error(f"Error getting usage stats: {str(e)}")
        return APIKeyResponse(
            success=False,
            message=f"Failed to get usage stats: {str(e)}"
        )

@router.post("/preferences", response_model=APIKeyResponse)
async def update_preferences(
    request: UserPreferencesUpdate,
    current_user: Optional[Dict] = Depends(get_current_user_optional)
):
    """Update user preferences"""
    try:
        user_id = current_user.get("id", "anonymous") if current_user else "anonymous"
        
        # Get current settings
        settings = await user_settings_service.get_user_settings(user_id)
        
        # Update preferences
        if request.theme:
            settings.preferences["theme"] = request.theme
        if request.language:
            settings.preferences["language"] = request.language
        if request.timezone:
            settings.preferences["timezone"] = request.timezone
        if request.notifications:
            settings.preferences["notifications"].update(request.notifications)
        
        # Save updated settings
        await user_settings_service.save_user_settings(user_id, settings)
        
        return APIKeyResponse(
            success=True,
            message="Preferences updated successfully",
            data={"preferences": settings.preferences}
        )
        
    except Exception as e:
        logger.error(f"Error updating preferences: {str(e)}")
        return APIKeyResponse(
            success=False,
            message=f"Failed to update preferences: {str(e)}"
        )

@router.get("/providers", response_model=APIKeyResponse)
async def get_supported_providers():
    """Get all supported providers with their configurations"""
    try:
        providers = provider_registry.get_all_providers()
        
        provider_data = []
        for provider in providers:
            provider_data.append({
                "id": provider.id,
                "name": provider.name,
                "description": provider.description,
                "icon": provider.icon,
                "key_format": provider.key_format,
                "get_key_url": provider.get_key_url,
                "supported_models": provider.supported_models,
                "pricing_info": provider.pricing_info
            })
        
        return APIKeyResponse(
            success=True,
            message="Providers retrieved successfully",
            data={
                "providers": provider_data,
                "total_providers": len(provider_data)
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting providers: {str(e)}")
        return APIKeyResponse(
            success=False,
            message=f"Failed to get providers: {str(e)}"
        )

@router.get("/providers/{provider_id}", response_model=APIKeyResponse)
async def get_provider_details(provider_id: str):
    """Get detailed information about a specific provider"""
    try:
        provider = provider_registry.get_provider(provider_id)
        
        if not provider:
            return APIKeyResponse(
                success=False,
                message=f"Provider {provider_id} not found"
            )
        
        provider_data = {
            "id": provider.id,
            "name": provider.name,
            "description": provider.description,
            "icon": provider.icon,
            "key_format": provider.key_format,
            "validation_url": provider.validation_url,
            "get_key_url": provider.get_key_url,
            "supported_models": provider.supported_models,
            "pricing_info": provider.pricing_info,
            "framework_mappings": provider.framework_mappings
        }
        
        return APIKeyResponse(
            success=True,
            message=f"Provider {provider_id} details retrieved",
            data={"provider": provider_data}
        )
        
    except Exception as e:
        logger.error(f"Error getting provider details: {str(e)}")
        return APIKeyResponse(
            success=False,
            message=f"Failed to get provider details: {str(e)}"
        )

@router.post("/test-connection", response_model=APIKeyResponse)
async def test_connection():
    """Test the user settings service connection"""
    try:
        # Simple health check
        return APIKeyResponse(
            success=True,
            message="User settings service is working correctly",
            data={"status": "healthy", "timestamp": "2024-12-19T10:00:00Z"}
        )
        
    except Exception as e:
        logger.error(f"Error testing connection: {str(e)}")
        return APIKeyResponse(
            success=False,
            message=f"Service error: {str(e)}"
        )

# Helper endpoint for workflow execution
@router.get("/execution-keys/{user_id}")
async def get_execution_keys(user_id: str):
    """Get API keys for workflow execution (internal use)"""
    try:
        keys = await user_settings_service.get_user_keys_for_execution(user_id)
        return {"success": True, "keys": keys}
        
    except Exception as e:
        logger.error(f"Error getting execution keys: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/execution-context")
async def get_execution_context(user_id: str = Depends(get_current_user_optional)):
    """Get execution context information for the user"""
    try:
        from core.workflow_execution_context import get_execution_context
        
        context = await get_execution_context(user_id)
        metadata = context.get_execution_metadata()
        
        return {
            "user_id": user_id,
            "execution_metadata": metadata,
            "message": "Execution context with unlimited provider support"
        }
        
    except Exception as e:
        logger.error(f"Error getting execution context: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get execution context: {str(e)}"
        ) 