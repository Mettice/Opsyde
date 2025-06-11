"""
Social Media Integration Runner
Handles LinkedIn, Facebook, WhatsApp, Telegram integrations
"""

import logging
from typing import Dict, List, Any, Optional
from .base_integration_runner import BaseIntegrationRunner

logger = logging.getLogger(__name__)

class SocialMediaIntegrationRunner(BaseIntegrationRunner):
    """
    Specialized runner for social media platform integrations
    Supports: LinkedIn, Facebook, WhatsApp, Telegram
    """
    
    def __init__(self):
        super().__init__("social_media")
        self._setup_platforms()
        self._setup_auth_handlers()
        self._setup_response_transformers()

    def get_supported_platforms(self) -> List[str]:
        return ["linkedin", "facebook", "whatsapp", "telegram"]

    def get_platform_config(self, platform: str) -> Dict[str, Any]:
        return self.platform_configs.get(platform, {})

    def _setup_platforms(self):
        """Setup platform-specific configurations"""
        # LinkedIn Configuration
        self.register_platform("linkedin", {
            "base_url": "https://api.linkedin.com/v2",
            "auth_type": "oauth2",
            "headers": {
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0"
            },
            "endpoints": {
                "profile": "/people/~",
                "posts": "/ugcPosts",
                "shares": "/shares",
                "companies": "/organizations",
                "company_posts": "/organizationAcls"
            },
            "scopes": [
                "r_liteprofile",
                "r_emailaddress", 
                "w_member_social"
            ],
            "rate_limits": {
                "requests_per_second": 2,
                "burst_limit": 20
            }
        })

        # Facebook Configuration
        self.register_platform("facebook", {
            "base_url": "https://graph.facebook.com/v18.0",
            "auth_type": "oauth2",
            "headers": {
                "Content-Type": "application/json"
            },
            "endpoints": {
                "me": "/me",
                "feed": "/me/feed",
                "pages": "/me/accounts",
                "page_feed": "/{page_id}/feed",
                "photos": "/me/photos",
                "page_photos": "/{page_id}/photos"
            },
            "scopes": [
                "pages_manage_posts",
                "pages_read_engagement",
                "publish_to_groups"
            ],
            "rate_limits": {
                "requests_per_second": 10,
                "burst_limit": 200
            }
        })

        # WhatsApp Business Configuration
        self.register_platform("whatsapp", {
            "base_url": "https://graph.facebook.com/v18.0",
            "auth_type": "bearer",
            "headers": {
                "Content-Type": "application/json"
            },
            "endpoints": {
                "messages": "/{phone_number_id}/messages",
                "phone_numbers": "/me/phone_numbers",
                "templates": "/{waba_id}/message_templates",
                "media": "/{phone_number_id}/media"
            },
            "rate_limits": {
                "requests_per_second": 20,
                "burst_limit": 1000
            }
        })

        # Telegram Configuration
        self.register_platform("telegram", {
            "base_url": "https://api.telegram.org/bot{token}",
            "auth_type": "bot_token",
            "headers": {
                "Content-Type": "application/json"
            },
            "endpoints": {
                "get_me": "/getMe",
                "send_message": "/sendMessage",
                "send_photo": "/sendPhoto",
                "send_document": "/sendDocument",
                "get_chat": "/getChat",
                "get_updates": "/getUpdates"
            },
            "rate_limits": {
                "requests_per_second": 30,
                "burst_limit": 20
            }
        })

    def _setup_auth_handlers(self):
        """Setup authentication handlers for each platform"""
        async def linkedin_auth_handler(config: Dict[str, Any]) -> Dict[str, str]:
            """LinkedIn OAuth2 authentication"""
            access_token = config.get("access_token") or config.get("linkedin_token")
            if not access_token:
                raise ValueError("LinkedIn access token required")
            
            return {
                "Authorization": f"Bearer {access_token}",
                "X-Restli-Protocol-Version": "2.0.0"
            }

        async def facebook_auth_handler(config: Dict[str, Any]) -> Dict[str, str]:
            """Facebook OAuth2 authentication"""
            access_token = config.get("access_token") or config.get("facebook_token")
            if not access_token:
                raise ValueError("Facebook access token required")
            
            return {
                "Authorization": f"Bearer {access_token}"
            }

        async def whatsapp_auth_handler(config: Dict[str, Any]) -> Dict[str, str]:
            """WhatsApp Business API authentication"""
            access_token = config.get("access_token") or config.get("whatsapp_token")
            if not access_token:
                raise ValueError("WhatsApp Business access token required")
            
            return {
                "Authorization": f"Bearer {access_token}"
            }

        async def telegram_auth_handler(config: Dict[str, Any]) -> Dict[str, str]:
            """Telegram Bot API authentication (token in URL)"""
            bot_token = config.get("bot_token") or config.get("telegram_token")
            if not bot_token:
                raise ValueError("Telegram bot token required")
            
            # For Telegram, we need to inject the token into the base URL
            return {}  # No headers needed, token goes in URL

        self.register_auth_handler("linkedin", linkedin_auth_handler)
        self.register_auth_handler("facebook", facebook_auth_handler)
        self.register_auth_handler("whatsapp", whatsapp_auth_handler)
        self.register_auth_handler("telegram", telegram_auth_handler)

    def _setup_response_transformers(self):
        """Setup response transformers for platform-specific data formats"""
        def linkedin_transformer(response: Dict[str, Any]) -> Dict[str, Any]:
            """Transform LinkedIn API responses"""
            if "id" in response:
                return {
                    "success": True,
                    "post_id": response["id"],
                    "platform": "linkedin",
                    "data": response
                }
            return {"success": False, "error": "Invalid LinkedIn response", "data": response}

        def facebook_transformer(response: Dict[str, Any]) -> Dict[str, Any]:
            """Transform Facebook API responses"""
            if "id" in response:
                return {
                    "success": True,
                    "post_id": response["id"],
                    "platform": "facebook",
                    "data": response
                }
            return {"success": False, "error": "Invalid Facebook response", "data": response}

        def whatsapp_transformer(response: Dict[str, Any]) -> Dict[str, Any]:
            """Transform WhatsApp API responses"""
            if "messages" in response and response["messages"]:
                return {
                    "success": True,
                    "message_id": response["messages"][0].get("id"),
                    "platform": "whatsapp",
                    "data": response
                }
            return {"success": False, "error": "Invalid WhatsApp response", "data": response}

        def telegram_transformer(response: Dict[str, Any]) -> Dict[str, Any]:
            """Transform Telegram API responses"""
            if response.get("ok") and "result" in response:
                return {
                    "success": True,
                    "message_id": response["result"].get("message_id"),
                    "platform": "telegram",
                    "data": response["result"]
                }
            return {"success": False, "error": response.get("description", "Invalid Telegram response"), "data": response}

        self.register_response_transformer("linkedin", linkedin_transformer)
        self.register_response_transformer("facebook", facebook_transformer)
        self.register_response_transformer("whatsapp", whatsapp_transformer)
        self.register_response_transformer("telegram", telegram_transformer)

    # Platform-specific helper methods
    async def create_linkedin_post(self, content: str, visibility: str = "PUBLIC", **kwargs) -> Dict[str, Any]:
        """Create a LinkedIn post"""
        config = {
            "platform": "linkedin",
            "action": "create_post",
            "endpoint": "posts"
        }
        
        data = {
            "author": "urn:li:person:{person_id}",  # Will be replaced with actual person ID
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": content},
                    "shareMediaCategory": "NONE"
                }
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": visibility
            }
        }
        
        return await self._execute_platform_request("linkedin", config, data)

    async def create_facebook_post(self, message: str, page_id: str = None, **kwargs) -> Dict[str, Any]:
        """Create a Facebook post"""
        config = {
            "platform": "facebook",
            "action": "create_post",
            "endpoint": f"{page_id}/feed" if page_id else "me/feed"
        }
        
        data = {
            "message": message,
            **kwargs  # Additional Facebook post parameters
        }
        
        return await self._execute_platform_request("facebook", config, data)

    async def send_whatsapp_message(self, to: str, message: str, phone_number_id: str, **kwargs) -> Dict[str, Any]:
        """Send a WhatsApp message"""
        config = {
            "platform": "whatsapp",
            "action": "send_message",
            "endpoint": f"{phone_number_id}/messages"
        }
        
        data = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": message}
        }
        
        return await self._execute_platform_request("whatsapp", config, data)

    async def send_telegram_message(self, chat_id: str, text: str, bot_token: str, **kwargs) -> Dict[str, Any]:
        """Send a Telegram message"""
        config = {
            "platform": "telegram",
            "action": "send_message",
            "endpoint": "sendMessage",
            "bot_token": bot_token
        }
        
        data = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": kwargs.get("parse_mode", "HTML")
        }
        
        return await self._execute_platform_request("telegram", config, data)

    async def execute_integration_template(self, platform: str, action: str, config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute pre-configured integration templates directly
        
        Args:
            platform: Integration platform (linkedin, slack, etc.)
            action: Action to perform (post, send, create, etc.)
            config: Pre-configured template config with user credentials
            inputs: Input data for the action
            
        Returns:
            Execution result
        """
        try:
            platform_lower = platform.lower()
            
            if platform_lower not in self.get_supported_platforms():
                return {
                    "success": False,
                    "error": f"Platform {platform} not supported",
                    "supported_platforms": self.get_supported_platforms()
                }
            
            # Get authentication configuration
            auth_config = {}
            for field in config.get('requiredFields', []):
                if field in config:
                    auth_config[field] = config[field]
            
            # Execute based on platform
            if platform_lower == 'linkedin':
                return await self._execute_linkedin_template(action, auth_config, inputs)
            elif platform_lower == 'slack':
                return await self._execute_slack_template(action, auth_config, inputs)
            elif platform_lower == 'notion':
                return await self._execute_notion_template(action, auth_config, inputs)
            elif platform_lower == 'hubspot':
                return await self._execute_hubspot_template(action, auth_config, inputs)
            elif platform_lower == 'stripe':
                return await self._execute_stripe_template(action, auth_config, inputs)
            else:
                return {
                    "success": False,
                    "error": f"Template execution not implemented for {platform}"
                }
                
        except Exception as e:
            logger.error(f"Error executing {platform} template: {str(e)}")
            return {
                "success": False,
                "error": f"Template execution failed: {str(e)}"
            }
    
    async def _execute_linkedin_template(self, action: str, auth_config: Dict, inputs: Dict) -> Dict:
        """Execute LinkedIn integration template"""
        try:
            # Extract inputs
            content = inputs.get('content') or inputs.get('message') or inputs.get('text', '')
            
            if not content:
                return {"success": False, "error": "Content is required for LinkedIn post"}
            
            # Use the existing LinkedIn post method
            result = await self.create_linkedin_post(
                content=content,
                visibility=inputs.get('visibility', 'PUBLIC'),
                access_token=auth_config.get('access_token'),
                person_id=auth_config.get('person_id')
            )
            
            return {
                "success": True,
                "data": result,
                "platform": "LinkedIn",
                "action": "create_post",
                "message": "LinkedIn post created successfully"
            }
            
        except Exception as e:
            return {"success": False, "error": f"LinkedIn execution failed: {str(e)}"}
    
    async def _execute_slack_template(self, action: str, auth_config: Dict, inputs: Dict) -> Dict:
        """Execute Slack integration template"""
        try:
            import aiohttp
            
            webhook_url = auth_config.get('webhook_url')
            if not webhook_url:
                return {"success": False, "error": "Webhook URL is required for Slack"}
            
            message = inputs.get('message') or inputs.get('content') or inputs.get('text', '')
            if not message:
                return {"success": False, "error": "Message is required for Slack"}
            
            payload = {"text": message}
            
            async with aiohttp.ClientSession() as session:
                async with session.post(webhook_url, json=payload) as response:
                    if response.status == 200:
                        return {
                            "success": True,
                            "data": {"status": "sent", "message": message},
                            "platform": "Slack",
                            "action": "send_message",
                            "message": "Slack message sent successfully"
                        }
                    else:
                        return {
                            "success": False,
                            "error": f"Slack API error: {response.status}"
                        }
                        
        except Exception as e:
            return {"success": False, "error": f"Slack execution failed: {str(e)}"}
    
    async def _execute_notion_template(self, action: str, auth_config: Dict, inputs: Dict) -> Dict:
        """Execute Notion integration template"""
        try:
            import aiohttp
            
            api_key = auth_config.get('api_key')
            database_id = auth_config.get('database_id')
            
            if not api_key or not database_id:
                return {"success": False, "error": "API key and database ID are required for Notion"}
            
            title = inputs.get('title') or inputs.get('name', 'New Page')
            
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
            }
            
            payload = {
                "parent": {"database_id": database_id},
                "properties": {
                    "title": {
                        "title": [{"text": {"content": title}}]
                    }
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    'https://api.notion.com/v1/pages',
                    headers=headers,
                    json=payload
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            "success": True,
                            "data": result,
                            "platform": "Notion",
                            "action": "create_page",
                            "message": "Notion page created successfully"
                        }
                    else:
                        error_text = await response.text()
                        return {
                            "success": False,
                            "error": f"Notion API error: {response.status} - {error_text}"
                        }
                        
        except Exception as e:
            return {"success": False, "error": f"Notion execution failed: {str(e)}"}
    
    async def _execute_hubspot_template(self, action: str, auth_config: Dict, inputs: Dict) -> Dict:
        """Execute HubSpot integration template"""
        try:
            import aiohttp
            
            api_key = auth_config.get('api_key')
            if not api_key:
                return {"success": False, "error": "API key is required for HubSpot"}
            
            email = inputs.get('email')
            if not email:
                return {"success": False, "error": "Email is required for HubSpot contact"}
            
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                "properties": {
                    "email": email,
                    "firstname": inputs.get('firstname', ''),
                    "lastname": inputs.get('lastname', '')
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    'https://api.hubapi.com/crm/v3/objects/contacts',
                    headers=headers,
                    json=payload
                ) as response:
                    if response.status == 201:
                        result = await response.json()
                        return {
                            "success": True,
                            "data": result,
                            "platform": "HubSpot",
                            "action": "create_contact",
                            "message": "HubSpot contact created successfully"
                        }
                    else:
                        error_text = await response.text()
                        return {
                            "success": False,
                            "error": f"HubSpot API error: {response.status} - {error_text}"
                        }
                        
        except Exception as e:
            return {"success": False, "error": f"HubSpot execution failed: {str(e)}"}
    
    async def _execute_stripe_template(self, action: str, auth_config: Dict, inputs: Dict) -> Dict:
        """Execute Stripe integration template"""
        try:
            import aiohttp
            
            api_key = auth_config.get('api_key')
            if not api_key:
                return {"success": False, "error": "API key is required for Stripe"}
            
            email = inputs.get('email')
            if not email:
                return {"success": False, "error": "Email is required for Stripe customer"}
            
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            
            data = f"email={email}&name={inputs.get('name', '')}"
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    'https://api.stripe.com/v1/customers',
                    headers=headers,
                    data=data
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            "success": True,
                            "data": result,
                            "platform": "Stripe",
                            "action": "create_customer",
                            "message": "Stripe customer created successfully"
                        }
                    else:
                        error_text = await response.text()
                        return {
                            "success": False,
                            "error": f"Stripe API error: {response.status} - {error_text}"
                        }
                        
        except Exception as e:
            return {"success": False, "error": f"Stripe execution failed: {str(e)}"}

# Global instance for easy access
social_media_runner = SocialMediaIntegrationRunner()

# Export functions for backward compatibility
async def run_social_media_integration(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Run social media integration using the global instance"""
    return await social_media_runner.execute_integration(inputs)

def get_social_media_platforms() -> List[str]:
    """Get supported social media platforms"""
    return social_media_runner.get_supported_platforms()

def get_social_media_capabilities() -> Dict[str, Any]:
    """Get social media integration capabilities"""
    return social_media_runner.get_category_info() 