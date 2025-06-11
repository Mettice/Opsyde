# backend/frameworks/integration_manager.py
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from .integration_runners.base_integration_runner import BaseIntegrationRunner
from .integration_runners.communication_runner import CommunicationIntegrationRunner
from utils.logging import get_logger

logger = get_logger(__name__)

class IntegrationManager:
    """
    Central manager for all integration categories
    Routes requests to appropriate category runners
    """
    
    def __init__(self):
        self.category_runners: Dict[str, BaseIntegrationRunner] = {}
        self.category_configs = {}
        self._initialize_runners()
    
    def _initialize_runners(self):
        """Initialize all category runners"""
        try:
            # Communication (Slack, Discord, Teams)
            from .integration_runners.communication_runner import communication_runner
            self.category_runners["communication"] = communication_runner
            logger.info("✅ Registered communication integration runner")
            
            # Productivity (Notion, Airtable, Google Sheets)
            from .integration_runners.productivity_runner import productivity_runner
            self.category_runners["productivity"] = productivity_runner
            logger.info("✅ Registered productivity integration runner")
            
            # Developer (GitHub, GitLab, Webhooks)
            from .integration_runners.developer_runner import developer_runner
            self.category_runners["developer"] = developer_runner
            logger.info("✅ Registered developer integration runner")
            
            # Marketing (Mailchimp, SendGrid)
            from .integration_runners.marketing_runner import marketing_runner
            self.category_runners["marketing"] = marketing_runner
            logger.info("✅ Registered marketing integration runner")
            
            # CRM (HubSpot, Salesforce)
            from .integration_runners.crm_runner import crm_runner
            self.category_runners["crm"] = crm_runner
            logger.info("✅ Registered CRM integration runner")
            
            # E-commerce (Shopify, Stripe)
            from .integration_runners.ecommerce_runner import ecommerce_runner
            self.category_runners["ecommerce"] = ecommerce_runner
            logger.info("✅ Registered e-commerce integration runner")
            
            # Storage (Google Drive, Dropbox)
            from .integration_runners.storage_runner import storage_runner
            self.category_runners["storage"] = storage_runner
            logger.info("✅ Registered storage integration runner")
            
            # Social Media (LinkedIn, Facebook, WhatsApp, Telegram)
            from .integration_runners.social_media_runner import social_media_runner
            self.category_runners["social_media"] = social_media_runner
            logger.info("✅ Registered social media integration runner")
            
            logger.info(f"✅ Initialized {len(self.category_runners)} integration category runners")
            
        except Exception as e:
            logger.error(f"❌ Error initializing integration runners: {str(e)}")
    
    def register_category_runner(self, category: str, runner: BaseIntegrationRunner):
        """Register a category runner"""
        self.category_runners[category] = runner
        self.category_configs[category] = runner.get_category_info()
        logger.info(f"✅ Registered {category} integration runner")
    
    def get_supported_categories(self) -> List[str]:
        """Get list of supported integration categories"""
        return list(self.category_runners.keys())
    
    def get_supported_platforms(self, category: Optional[str] = None) -> Dict[str, List[str]]:
        """Get supported platforms, optionally filtered by category"""
        if category:
            if category in self.category_runners:
                return {category: self.category_runners[category].get_supported_platforms()}
            return {}
        
        result = {}
        for cat, runner in self.category_runners.items():
            result[cat] = runner.get_supported_platforms()
        return result
    
    def get_category_info(self, category: Optional[str] = None) -> Dict[str, Any]:
        """Get detailed information about categories and their capabilities"""
        if category and category in self.category_runners:
            return {category: self.category_runners[category].get_category_info()}
        
        return {cat: runner.get_category_info() for cat, runner in self.category_runners.items()}
    
    async def execute_integration(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute an integration request
        Routes to appropriate category runner based on service name or explicit category
        """
        try:
            # Determine which category runner to use
            category = self._determine_category(inputs)
            
            if not category:
                return {
                    "success": False,
                    "error": "Unable to determine integration category from inputs",
                    "supported_categories": self.get_supported_categories(),
                    "inputs_received": list(inputs.keys())
                }
            
            if category not in self.category_runners:
                return {
                    "success": False,
                    "error": f"Category '{category}' not supported",
                    "supported_categories": self.get_supported_categories(),
                    "requested_category": category
                }
            
            # Execute using the appropriate category runner
            runner = self.category_runners[category]
            result = await runner.execute_integration(inputs)
            
            # Add category metadata to result
            if isinstance(result, dict):
                result["integration_category"] = category
                result["runner_class"] = runner.__class__.__name__
            
            return result
            
        except Exception as e:
            logger.error(f"Integration execution error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "category": inputs.get("category", "unknown"),
                "service": inputs.get("api_service_name", "unknown")
            }
    
    def _determine_category(self, inputs: Dict[str, Any]) -> Optional[str]:
        """
        Determine the integration category based on inputs
        """
        # Explicit category specified
        if "category" in inputs:
            return inputs["category"]
        
        # Determine from service name
        service_name = inputs.get("api_service_name", "").lower()
        
        # Communication platforms
        if any(platform in service_name for platform in ["slack", "discord", "teams", "telegram", "whatsapp"]):
            return "communication"
        
        # Productivity platforms
        if any(platform in service_name for platform in ["notion", "airtable", "google", "sheets", "drive"]):
            return "productivity"
        
        # Developer platforms
        if any(platform in service_name for platform in ["github", "gitlab", "webhook"]):
            return "developer"
        
        # Marketing platforms
        if any(platform in service_name for platform in ["mailchimp", "sendgrid", "email"]):
            return "marketing"
        
        # CRM platforms
        if any(platform in service_name for platform in ["hubspot", "salesforce", "crm"]):
            return "crm"
        
        # E-commerce platforms
        if any(platform in service_name for platform in ["shopify", "stripe", "payment"]):
            return "ecommerce"
        
        # Storage platforms
        if any(platform in service_name for platform in ["dropbox", "storage", "file"]):
            return "storage"
        
        # Social Media platforms
        if any(platform in service_name for platform in ["linkedin", "facebook", "whatsapp", "telegram"]):
            return "social_media"
        
        # Default fallback - try to match against registered platforms
        for category, runner in self.category_runners.items():
            supported_platforms = runner.get_supported_platforms()
            for platform in supported_platforms:
                if platform in service_name:
                    return category
        
        return None
    
    async def test_platform_connection(self, category: str, platform: str, auth_config: Dict[str, Any]) -> Dict[str, Any]:
        """Test connection to a specific platform"""
        if category not in self.category_runners:
            return {
                "success": False,
                "error": f"Category '{category}' not supported"
            }
        
        runner = self.category_runners[category]
        return await runner.test_platform_connection(platform, auth_config)
    
    async def send_unified_message(self, platform: str, channel_id: str, message: str, **kwargs) -> Dict[str, Any]:
        """Send a message using unified interface (works across communication platforms)"""
        # Determine category for messaging
        category = self._determine_category({"api_service_name": f"{platform}_message"})
        
        if category != "communication":
            return {
                "success": False,
                "error": f"Platform '{platform}' does not support messaging"
            }
        
        runner = self.category_runners["communication"]
        return await runner.send_message(platform, channel_id, message, **kwargs)
    
    def get_integration_stats(self) -> Dict[str, Any]:
        """Get comprehensive statistics about all integrations"""
        stats = {
            "total_categories": len(self.category_runners),
            "total_platforms": 0,
            "categories": {},
            "generated_at": str(datetime.now())
        }
        
        for category, runner in self.category_runners.items():
            platforms = runner.get_supported_platforms()
            category_info = runner.get_category_info()
            
            stats["categories"][category] = {
                "platforms": platforms,
                "platform_count": len(platforms),
                "runner_class": runner.__class__.__name__,
                "has_custom_auth": len(getattr(runner, 'auth_handlers', {})),
                "has_transformers": len(getattr(runner, 'response_transformers', {})),
                **category_info
            }
            
            stats["total_platforms"] += len(platforms)
        
        return stats
    
    def get_platform_documentation(self, category: str, platform: str) -> Dict[str, Any]:
        """Get documentation for a specific platform"""
        if category not in self.category_runners:
            return {
                "error": f"Category '{category}' not supported",
                "supported_categories": self.get_supported_categories()
            }
        
        runner = self.category_runners[category]
        config = runner.get_platform_config(platform)
        
        if not config:
            return {
                "error": f"Platform '{platform}' not found in category '{category}'",
                "supported_platforms": runner.get_supported_platforms()
            }
        
        return {
            "category": category,
            "platform": platform,
            "base_url": config.get("base_url"),
            "auth_type": config.get("auth_type"),
            "available_actions": self._get_platform_actions(category, platform),
            "authentication": self._get_auth_info(category, platform),
            "rate_limits": config.get("rate_limits", {}),
            "examples": self._get_platform_examples(category, platform)
        }
    
    def _get_platform_actions(self, category: str, platform: str) -> List[str]:
        """Get available actions for a platform"""
        runner = self.category_runners.get(category)
        if not runner:
            return []
        
        config = runner.get_platform_config(platform)
        endpoints = config.get("endpoints", {})
        return list(endpoints.keys())
    
    def _get_auth_info(self, category: str, platform: str) -> Dict[str, Any]:
        """Get authentication information for a platform"""
        runner = self.category_runners.get(category)
        if not runner:
            return {}
        
        config = runner.get_platform_config(platform)
        auth_type = config.get("auth_type", "none")
        
        auth_info = {
            "type": auth_type,
            "required_fields": []
        }
        
        if auth_type == "bearer":
            auth_info["required_fields"] = ["auth_token"]
        elif auth_type == "oauth2":
            auth_info["required_fields"] = ["access_token"]
        elif auth_type == "api_key":
            auth_info["required_fields"] = ["api_key"]
        
        return auth_info
    
    def _get_platform_examples(self, category: str, platform: str) -> List[Dict[str, Any]]:
        """Get example usage for a platform"""
        examples = {
            "slack": [
                {
                    "action": "Send Message",
                    "description": "Send a message to a Slack channel",
                    "example": {
                        "api_service_name": "slack_send_message",
                        "method": "POST",
                        "channel_id": "#general",
                        "message": "Hello from Nodai!"
                    }
                }
            ],
            "notion": [
                {
                    "action": "Create Page",
                    "description": "Create a new page in a Notion database",
                    "example": {
                        "api_service_name": "notion_create_page",
                        "method": "POST",
                        "database_id": "your-database-id",
                        "properties": {"Name": {"title": [{"text": {"content": "New Page"}}]}}
                    }
                }
            ],
            "github": [
                {
                    "action": "Create Issue",
                    "description": "Create a new GitHub issue",
                    "example": {
                        "api_service_name": "github_create_issue",
                        "method": "POST",
                        "owner": "username",
                        "repo": "repository",
                        "title": "Bug Report",
                        "body": "Description of the issue"
                    }
                }
            ]
        }
        
        return examples.get(platform, [])


# Global integration manager instance
integration_manager = IntegrationManager()

# Main execution function for framework registry
async def run_integration_tool(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main entry point for all integration executions
    """
    return await integration_manager.execute_integration(inputs) 