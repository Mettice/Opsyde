"""
Marketing Integration Runner
Handles Mailchimp, SendGrid integrations
"""

import logging
from typing import Dict, List, Any, Optional
from .base_integration_runner import BaseIntegrationRunner

logger = logging.getLogger(__name__)

class MarketingIntegrationRunner(BaseIntegrationRunner):
    """
    Specialized runner for marketing platform integrations
    Supports: Mailchimp, SendGrid
    """
    
    def __init__(self):
        super().__init__("marketing")
        self._setup_platforms()
        self._setup_auth_handlers()
        self._setup_response_transformers()

    def get_supported_platforms(self) -> List[str]:
        return ["mailchimp", "sendgrid"]

    def get_platform_config(self, platform: str) -> Dict[str, Any]:
        return self.platform_configs.get(platform, {})

    def _setup_platforms(self):
        """Setup platform-specific configurations"""
        # Mailchimp Configuration
        self.register_platform("mailchimp", {
            "base_url": "https://{dc}.api.mailchimp.com/3.0",
            "auth_type": "api_key",
            "headers": {
                "Content-Type": "application/json"
            },
            "endpoints": {
                "lists": "/lists",
                "list_members": "/lists/{list_id}/members",
                "add_member": "/lists/{list_id}/members",
                "campaigns": "/campaigns",
                "create_campaign": "/campaigns",
                "send_campaign": "/campaigns/{campaign_id}/actions/send",
                "templates": "/templates",
                "reports": "/reports"
            },
            "rate_limits": {
                "requests_per_second": 10,
                "burst_limit": 50
            }
        })

        # SendGrid Configuration
        self.register_platform("sendgrid", {
            "base_url": "https://api.sendgrid.com/v3",
            "auth_type": "bearer",
            "headers": {
                "Content-Type": "application/json"
            },
            "endpoints": {
                "send_mail": "/mail/send",
                "templates": "/templates",
                "create_template": "/templates",
                "lists": "/marketing/lists",
                "contacts": "/marketing/contacts",
                "add_contacts": "/marketing/contacts",
                "campaigns": "/marketing/singlesends",
                "create_campaign": "/marketing/singlesends"
            },
            "rate_limits": {
                "requests_per_second": 20,
                "burst_limit": 100
            }
        })

    def _setup_auth_handlers(self):
        """Setup custom authentication handlers for each platform"""
        
        async def mailchimp_auth_handler(inputs: Dict[str, Any]) -> Dict[str, Any]:
            """Handle Mailchimp API key authentication"""
            api_key = inputs.get("auth_token") or inputs.get("mailchimp_api_key")
            if not api_key:
                raise ValueError("Mailchimp integration requires 'auth_token' or 'mailchimp_api_key'")
            
            # Extract datacenter from API key (format: key-dc)
            if "-" in api_key:
                dc = api_key.split("-")[-1]
            else:
                dc = "us1"  # default datacenter
            
            # Update base URL with datacenter
            base_url = self.platform_configs["mailchimp"]["base_url"].format(dc=dc)
            inputs["api_endpoint"] = inputs.get("api_endpoint", "").replace("https://{dc}.api.mailchimp.com/3.0", base_url)
            
            inputs["headers"] = {
                **inputs.get("headers", {}),
                "Authorization": f"Bearer {api_key}"
            }
            return inputs

        async def sendgrid_auth_handler(inputs: Dict[str, Any]) -> Dict[str, Any]:
            """Handle SendGrid Bearer token authentication"""
            api_key = inputs.get("auth_token") or inputs.get("sendgrid_api_key")
            if not api_key:
                raise ValueError("SendGrid integration requires 'auth_token' or 'sendgrid_api_key'")
            
            inputs["headers"] = {
                **inputs.get("headers", {}),
                "Authorization": f"Bearer {api_key}"
            }
            return inputs

        self.register_auth_handler("mailchimp", mailchimp_auth_handler)
        self.register_auth_handler("sendgrid", sendgrid_auth_handler)

    def _setup_response_transformers(self):
        """Setup response transformers for standardized output"""
        
        def mailchimp_response_transformer(response_data: Any) -> Dict[str, Any]:
            """Transform Mailchimp API responses to standard format"""
            if isinstance(response_data, dict):
                if "lists" in response_data:
                    # Lists response
                    return {
                        "platform": "mailchimp",
                        "action": "lists_retrieved",
                        "data": {
                            "lists": response_data["lists"],
                            "total_count": len(response_data["lists"]),
                            "total_items": response_data.get("total_items", 0)
                        }
                    }
                elif "members" in response_data:
                    # Members response
                    return {
                        "platform": "mailchimp",
                        "action": "members_retrieved",
                        "data": {
                            "members": response_data["members"],
                            "total_count": len(response_data["members"]),
                            "list_id": response_data.get("list_id")
                        }
                    }
                elif response_data.get("type") == "regular":
                    # Campaign response
                    return {
                        "platform": "mailchimp",
                        "action": "campaign_processed",
                        "data": {
                            "campaign_id": response_data.get("id"),
                            "type": response_data.get("type"),
                            "status": response_data.get("status"),
                            "subject_line": response_data.get("settings", {}).get("subject_line"),
                            "list_id": response_data.get("recipients", {}).get("list_id")
                        }
                    }
            
            return {"platform": "mailchimp", "data": response_data}

        def sendgrid_response_transformer(response_data: Any) -> Dict[str, Any]:
            """Transform SendGrid API responses to standard format"""
            if isinstance(response_data, dict):
                if "message" in response_data and response_data.get("message") == "success":
                    # Email sent successfully
                    return {
                        "platform": "sendgrid",
                        "action": "email_sent",
                        "data": {
                            "status": "sent",
                            "message": "Email sent successfully"
                        }
                    }
                elif "result" in response_data:
                    # Template or campaign response
                    return {
                        "platform": "sendgrid",
                        "action": "template_processed",
                        "data": response_data["result"]
                    }
                elif "contact_count" in response_data:
                    # Contacts response
                    return {
                        "platform": "sendgrid",
                        "action": "contacts_processed",
                        "data": {
                            "contact_count": response_data["contact_count"],
                            "job_id": response_data.get("job_id")
                        }
                    }
            
            return {"platform": "sendgrid", "data": response_data}

        self.register_response_transformer("mailchimp", mailchimp_response_transformer)
        self.register_response_transformer("sendgrid", sendgrid_response_transformer)

    # Marketing-specific helper methods
    async def send_email(self, platform: str, to_email: str, subject: str, content: str, **kwargs) -> Dict[str, Any]:
        """Unified method to send emails across marketing platforms"""
        if platform == "sendgrid":
            return await self.execute_integration({
                "api_service_name": "sendgrid_send_mail",
                "method": "POST",
                "endpoint": "/mail/send",
                "data": {
                    "personalizations": [{
                        "to": [{"email": to_email}],
                        "subject": subject
                    }],
                    "from": {"email": kwargs.get("from_email", "noreply@nodai.com")},
                    "content": [{
                        "type": "text/html" if kwargs.get("html", False) else "text/plain",
                        "value": content
                    }]
                },
                **kwargs
            })
        else:
            return {
                "success": False,
                "error": f"Platform {platform} not supported for direct email sending"
            }

    async def add_subscriber(self, platform: str, list_id: str, email: str, **kwargs) -> Dict[str, Any]:
        """Add subscriber to mailing list"""
        if platform == "mailchimp":
            return await self.execute_integration({
                "api_service_name": "mailchimp_add_member",
                "method": "POST",
                "endpoint": f"/lists/{list_id}/members",
                "data": {
                    "email_address": email,
                    "status": kwargs.get("status", "subscribed"),
                    "merge_fields": kwargs.get("merge_fields", {})
                },
                **kwargs
            })
        elif platform == "sendgrid":
            return await self.execute_integration({
                "api_service_name": "sendgrid_add_contacts",
                "method": "PUT",
                "endpoint": "/marketing/contacts",
                "data": {
                    "list_ids": [list_id],
                    "contacts": [{
                        "email": email,
                        **kwargs.get("custom_fields", {})
                    }]
                },
                **kwargs
            })
        else:
            return {
                "success": False,
                "error": f"Platform {platform} not supported for subscriber management"
            }

# Create global instance
marketing_runner = MarketingIntegrationRunner()

async def run_marketing_tool(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute marketing platform integrations
    """
    try:
        return await marketing_runner.execute_integration(inputs)
    except Exception as e:
        logger.error(f"Marketing integration error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "platform": inputs.get("api_service_name", "unknown"),
            "category": "marketing"
        } 