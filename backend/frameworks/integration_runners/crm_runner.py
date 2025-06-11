"""
CRM Integration Runner
Handles HubSpot, Salesforce integrations
"""

import logging
from typing import Dict, List, Any, Optional
from .base_integration_runner import BaseIntegrationRunner

logger = logging.getLogger(__name__)

class CRMIntegrationRunner(BaseIntegrationRunner):
    """
    Specialized runner for CRM platform integrations
    Supports: HubSpot, Salesforce
    """
    
    def __init__(self):
        super().__init__("crm")
        self._setup_platforms()
        self._setup_auth_handlers()
        self._setup_response_transformers()

    def get_supported_platforms(self) -> List[str]:
        return ["hubspot", "salesforce"]

    def get_platform_config(self, platform: str) -> Dict[str, Any]:
        return self.platform_configs.get(platform, {})

    def _setup_platforms(self):
        """Setup platform-specific configurations"""
        # HubSpot Configuration
        self.register_platform("hubspot", {
            "base_url": "https://api.hubapi.com",
            "auth_type": "bearer",
            "headers": {
                "Content-Type": "application/json"
            },
            "endpoints": {
                "contacts": "/crm/v3/objects/contacts",
                "create_contact": "/crm/v3/objects/contacts",
                "update_contact": "/crm/v3/objects/contacts/{contact_id}",
                "deals": "/crm/v3/objects/deals",
                "create_deal": "/crm/v3/objects/deals",
                "companies": "/crm/v3/objects/companies",
                "create_company": "/crm/v3/objects/companies",
                "tickets": "/crm/v3/objects/tickets",
                "search": "/crm/v3/objects/{object_type}/search"
            },
            "rate_limits": {
                "requests_per_second": 10,
                "burst_limit": 100
            }
        })

        # Salesforce Configuration
        self.register_platform("salesforce", {
            "base_url": "https://{instance}.salesforce.com/services/data/v57.0",
            "auth_type": "oauth2",
            "headers": {
                "Content-Type": "application/json"
            },
            "endpoints": {
                "sobjects": "/sobjects",
                "leads": "/sobjects/Lead",
                "create_lead": "/sobjects/Lead",
                "contacts": "/sobjects/Contact",
                "create_contact": "/sobjects/Contact",
                "accounts": "/sobjects/Account",
                "create_account": "/sobjects/Account",
                "opportunities": "/sobjects/Opportunity",
                "create_opportunity": "/sobjects/Opportunity",
                "query": "/query",
                "search": "/search"
            },
            "rate_limits": {
                "requests_per_day": 5000000,
                "requests_per_hour": 250000
            }
        })

    def _setup_auth_handlers(self):
        """Setup custom authentication handlers for each platform"""
        
        async def hubspot_auth_handler(inputs: Dict[str, Any]) -> Dict[str, Any]:
            """Handle HubSpot Bearer token authentication"""
            api_key = inputs.get("auth_token") or inputs.get("hubspot_api_key")
            if not api_key:
                raise ValueError("HubSpot integration requires 'auth_token' or 'hubspot_api_key'")
            
            inputs["headers"] = {
                **inputs.get("headers", {}),
                "Authorization": f"Bearer {api_key}"
            }
            return inputs

        async def salesforce_auth_handler(inputs: Dict[str, Any]) -> Dict[str, Any]:
            """Handle Salesforce OAuth2 authentication"""
            access_token = inputs.get("auth_token") or inputs.get("salesforce_token")
            if not access_token:
                raise ValueError("Salesforce integration requires 'auth_token' or 'salesforce_token'")
            
            # Handle instance URL
            instance = inputs.get("instance", "na1")
            base_url = self.platform_configs["salesforce"]["base_url"].format(instance=instance)
            inputs["api_endpoint"] = inputs.get("api_endpoint", "").replace("https://{instance}.salesforce.com/services/data/v57.0", base_url)
            
            inputs["headers"] = {
                **inputs.get("headers", {}),
                "Authorization": f"Bearer {access_token}"
            }
            return inputs

        self.register_auth_handler("hubspot", hubspot_auth_handler)
        self.register_auth_handler("salesforce", salesforce_auth_handler)

    def _setup_response_transformers(self):
        """Setup response transformers for standardized output"""
        
        def hubspot_response_transformer(response_data: Any) -> Dict[str, Any]:
            """Transform HubSpot API responses to standard format"""
            if isinstance(response_data, dict):
                if "results" in response_data:
                    # Search/list response
                    return {
                        "platform": "hubspot",
                        "action": "objects_retrieved",
                        "data": {
                            "objects": response_data["results"],
                            "total_count": len(response_data["results"]),
                            "paging": response_data.get("paging", {})
                        }
                    }
                elif response_data.get("id") and response_data.get("properties"):
                    # Single object response
                    return {
                        "platform": "hubspot",
                        "action": "object_processed",
                        "data": {
                            "object_id": response_data.get("id"),
                            "object_type": response_data.get("objectType"),
                            "properties": response_data.get("properties"),
                            "created_at": response_data.get("createdAt"),
                            "updated_at": response_data.get("updatedAt")
                        }
                    }
            
            return {"platform": "hubspot", "data": response_data}

        def salesforce_response_transformer(response_data: Any) -> Dict[str, Any]:
            """Transform Salesforce API responses to standard format"""
            if isinstance(response_data, dict):
                if "records" in response_data:
                    # Query response
                    return {
                        "platform": "salesforce",
                        "action": "query_executed",
                        "data": {
                            "records": response_data["records"],
                            "total_size": response_data.get("totalSize", 0),
                            "done": response_data.get("done", True)
                        }
                    }
                elif response_data.get("id") and response_data.get("success"):
                    # Create/update response
                    return {
                        "platform": "salesforce",
                        "action": "record_processed",
                        "data": {
                            "record_id": response_data.get("id"),
                            "success": response_data.get("success"),
                            "created": response_data.get("created", False)
                        }
                    }
                elif "searchRecords" in response_data:
                    # Search response
                    return {
                        "platform": "salesforce",
                        "action": "search_completed",
                        "data": {
                            "records": response_data["searchRecords"],
                            "total_count": len(response_data["searchRecords"])
                        }
                    }
            
            return {"platform": "salesforce", "data": response_data}

        self.register_response_transformer("hubspot", hubspot_response_transformer)
        self.register_response_transformer("salesforce", salesforce_response_transformer)

    # CRM-specific helper methods
    async def create_contact(self, platform: str, email: str, **kwargs) -> Dict[str, Any]:
        """Create a contact across CRM platforms"""
        if platform == "hubspot":
            return await self.execute_integration({
                "api_service_name": "hubspot_create_contact",
                "method": "POST",
                "endpoint": "/crm/v3/objects/contacts",
                "data": {
                    "properties": {
                        "email": email,
                        "firstname": kwargs.get("first_name", ""),
                        "lastname": kwargs.get("last_name", ""),
                        "company": kwargs.get("company", ""),
                        "phone": kwargs.get("phone", ""),
                        **kwargs.get("custom_properties", {})
                    }
                },
                **kwargs
            })
        elif platform == "salesforce":
            return await self.execute_integration({
                "api_service_name": "salesforce_create_contact",
                "method": "POST",
                "endpoint": "/sobjects/Contact",
                "data": {
                    "Email": email,
                    "FirstName": kwargs.get("first_name", ""),
                    "LastName": kwargs.get("last_name", ""),
                    "Company": kwargs.get("company", ""),
                    "Phone": kwargs.get("phone", ""),
                    **kwargs.get("custom_fields", {})
                },
                **kwargs
            })
        else:
            return {
                "success": False,
                "error": f"Platform {platform} not supported for contact creation"
            }

    async def create_deal(self, platform: str, deal_name: str, amount: float, **kwargs) -> Dict[str, Any]:
        """Create a deal/opportunity across CRM platforms"""
        if platform == "hubspot":
            return await self.execute_integration({
                "api_service_name": "hubspot_create_deal",
                "method": "POST",
                "endpoint": "/crm/v3/objects/deals",
                "data": {
                    "properties": {
                        "dealname": deal_name,
                        "amount": str(amount),
                        "dealstage": kwargs.get("stage", "appointmentscheduled"),
                        "pipeline": kwargs.get("pipeline", "default"),
                        "closedate": kwargs.get("close_date", ""),
                        **kwargs.get("custom_properties", {})
                    }
                },
                **kwargs
            })
        elif platform == "salesforce":
            return await self.execute_integration({
                "api_service_name": "salesforce_create_opportunity",
                "method": "POST",
                "endpoint": "/sobjects/Opportunity",
                "data": {
                    "Name": deal_name,
                    "Amount": amount,
                    "StageName": kwargs.get("stage", "Prospecting"),
                    "CloseDate": kwargs.get("close_date", ""),
                    "AccountId": kwargs.get("account_id", ""),
                    **kwargs.get("custom_fields", {})
                },
                **kwargs
            })
        else:
            return {
                "success": False,
                "error": f"Platform {platform} not supported for deal creation"
            }

    async def search_records(self, platform: str, object_type: str, query: str, **kwargs) -> Dict[str, Any]:
        """Search records across CRM platforms"""
        if platform == "hubspot":
            return await self.execute_integration({
                "api_service_name": "hubspot_search",
                "method": "POST",
                "endpoint": f"/crm/v3/objects/{object_type}/search",
                "data": {
                    "query": query,
                    "limit": kwargs.get("limit", 100),
                    "properties": kwargs.get("properties", ["email", "firstname", "lastname"])
                },
                **kwargs
            })
        elif platform == "salesforce":
            return await self.execute_integration({
                "api_service_name": "salesforce_query",
                "method": "GET",
                "endpoint": "/query",
                "params": {
                    "q": f"SELECT Id, Name FROM {object_type} WHERE Name LIKE '%{query}%' LIMIT {kwargs.get('limit', 100)}"
                },
                **kwargs
            })
        else:
            return {
                "success": False,
                "error": f"Platform {platform} not supported for search"
            }

# Create global instance
crm_runner = CRMIntegrationRunner()

async def run_crm_tool(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute CRM platform integrations
    """
    try:
        return await crm_runner.execute_integration(inputs)
    except Exception as e:
        logger.error(f"CRM integration error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "platform": inputs.get("api_service_name", "unknown"),
            "category": "crm"
        } 