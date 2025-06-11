# backend/api/routers/social_media.py
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
import logging

from frameworks.integration_runners.social_media_runner import SocialMediaIntegrationRunner
from utils.security import get_current_user_optional

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize social media runner with correct class name
social_media_runner = SocialMediaIntegrationRunner()

@router.get("/platforms")
async def get_supported_platforms():
    """Get list of supported social media platforms"""
    try:
        platforms = {
            "linkedin": {
                "name": "LinkedIn",
                "description": "Professional networking platform",
                "auth_type": "oauth2",
                "icon": "💼",
                "supported_actions": ["post", "company_post", "profile_update"]
            },
            "facebook": {
                "name": "Facebook", 
                "description": "Social networking platform",
                "auth_type": "oauth2",
                "icon": "📘",
                "supported_actions": ["page_post", "story", "event"]
            },
            "whatsapp": {
                "name": "WhatsApp Business",
                "description": "Business messaging platform",
                "auth_type": "bearer",
                "icon": "💬",
                "supported_actions": ["message", "template", "broadcast"]
            },
            "telegram": {
                "name": "Telegram",
                "description": "Cloud-based messaging platform",
                "auth_type": "bot_token",
                "icon": "✈️",
                "supported_actions": ["message", "photo", "channel_post"]
            }
        }
        
        return {
            "success": True,
            "platforms": platforms,
            "total_platforms": len(platforms)
        }
        
    except Exception as e:
        logger.error(f"Error getting platforms: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test/{platform}")
async def test_platform_connection(
    platform: str,
    test_data: Dict[str, Any],
    current_user: Dict = Depends(get_current_user_optional)
):
    """Test connection to a social media platform"""
    try:
        # Basic platform validation
        supported_platforms = ["linkedin", "facebook", "whatsapp", "telegram"]
        if platform not in supported_platforms:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported platform: {platform}. Supported: {supported_platforms}"
            )
        
        # Create test config
        config = {
            "service_name": platform,
            "platform": platform,
            "description": f"Test connection to {platform}",
            **test_data.get("config", {})
        }
        
        # Create test input
        test_input = {
            "test": True,
            "message": f"Test message for {platform}",
            **test_data.get("input", {})
        }
        
        # Create context with user info
        context = None
        if current_user:
            context = {
                "user_id": current_user.get("user_id"),
                "user_api_keys": current_user.get("api_keys", {})
            }
        
        # Execute test
        result = await social_media_runner.execute_integration_template(
            platform=platform,
            action="test",
            config=config,
            inputs=test_input
        )
        
        return {
            "success": True,
            "platform": platform,
            "test_result": result,
            "message": f"Connection test completed for {platform}"
        }
        
    except Exception as e:
        logger.error(f"Error testing {platform}: {str(e)}")
        return {
            "success": False,
            "platform": platform,
            "error": str(e),
            "message": f"Connection test failed for {platform}"
        }

@router.post("/execute")
async def execute_social_media_action(
    action_data: Dict[str, Any],
    current_user: Dict = Depends(get_current_user_optional)
):
    """Execute a social media action"""
    try:
        platform = action_data.get("platform")
        if not platform:
            raise HTTPException(status_code=400, detail="Platform is required")
        
        config = action_data.get("config", {})
        config["service_name"] = platform
        config["platform"] = platform
        
        input_data = action_data.get("input", {})
        
        # Create context with user info
        context = None
        if current_user:
            context = {
                "user_id": current_user.get("user_id"),
                "user_api_keys": current_user.get("api_keys", {})
            }
        
        # Execute action
        result = await social_media_runner.execute_integration_template(
            platform=platform,
            action=action_data.get("action", "post"),
            config=config,
            inputs=input_data
        )
        
        return {
            "success": True,
            "platform": platform,
            "result": result,
            "action": action_data.get("action", "unknown")
        }
        
    except Exception as e:
        logger.error(f"Error executing social media action: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates")
async def get_social_media_templates():
    """Get available social media templates"""
    try:
        from src.data.social_media_templates import allSocialMediaTools, socialMediaCategories
        
        return {
            "success": True,
            "templates": allSocialMediaTools,
            "categories": socialMediaCategories,
            "total_templates": len(allSocialMediaTools)
        }
        
    except ImportError:
        # Fallback if import fails
        return {
            "success": True,
            "templates": [],
            "categories": {},
            "total_templates": 0,
            "message": "Templates not available - check configuration"
        }
        
    except Exception as e:
        logger.error(f"Error getting templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/auth-guide/{platform}")
async def get_auth_guide(platform: str):
    """Get authentication setup guide for a platform"""
    try:
        guides = {
            "linkedin": {
                "auth_type": "OAuth 2.0",
                "steps": [
                    "1. Go to LinkedIn Developer Portal",
                    "2. Create a new app",
                    "3. Set redirect URI to your app domain",
                    "4. Get Client ID and Client Secret",
                    "5. Request user authorization",
                    "6. Exchange code for access token"
                ],
                "scopes": ["r_liteprofile", "r_emailaddress", "w_member_social"],
                "docs_url": "https://docs.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow"
            },
            "facebook": {
                "auth_type": "OAuth 2.0",
                "steps": [
                    "1. Go to Facebook for Developers",
                    "2. Create a new app",
                    "3. Add Facebook Login product",
                    "4. Configure redirect URIs", 
                    "5. Get App ID and App Secret",
                    "6. Request page access tokens"
                ],
                "scopes": ["pages_manage_posts", "pages_read_engagement"],
                "docs_url": "https://developers.facebook.com/docs/facebook-login"
            },
            "whatsapp": {
                "auth_type": "Bearer Token",
                "steps": [
                    "1. Set up WhatsApp Business Account",
                    "2. Add WhatsApp Business API product",
                    "3. Get phone number ID",
                    "4. Generate access token",
                    "5. Verify webhook (optional)"
                ],
                "scopes": ["whatsapp_business_messaging"],
                "docs_url": "https://developers.facebook.com/docs/whatsapp/cloud-api"
            },
            "telegram": {
                "auth_type": "Bot Token",
                "steps": [
                    "1. Message @BotFather on Telegram",
                    "2. Use /newbot command",
                    "3. Choose bot name and username",
                    "4. Get bot token",
                    "5. Configure bot settings (optional)"
                ],
                "scopes": ["Bot API access"],
                "docs_url": "https://core.telegram.org/bots/api"
            }
        }
        
        if platform not in guides:
            raise HTTPException(status_code=404, detail=f"Auth guide not available for {platform}")
        
        return {
            "success": True,
            "platform": platform,
            "guide": guides[platform]
        }
        
    except Exception as e:
        logger.error(f"Error getting auth guide for {platform}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 