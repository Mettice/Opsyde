"""
E-commerce Integration Runner
Handles Shopify, Stripe integrations
"""

import logging
from typing import Dict, List, Any, Optional
from .base_integration_runner import BaseIntegrationRunner

logger = logging.getLogger(__name__)

class EcommerceIntegrationRunner(BaseIntegrationRunner):
    """
    Specialized runner for e-commerce platform integrations
    Supports: Shopify, Stripe
    """
    
    def __init__(self):
        super().__init__("ecommerce")
        self._setup_platforms()
        self._setup_auth_handlers()
        self._setup_response_transformers()

    def get_supported_platforms(self) -> List[str]:
        return ["shopify", "stripe"]

    def get_platform_config(self, platform: str) -> Dict[str, Any]:
        return self.platform_configs.get(platform, {})

    def _setup_platforms(self):
        """Setup platform-specific configurations"""
        # Shopify Configuration
        self.register_platform("shopify", {
            "base_url": "https://{shop}.myshopify.com/admin/api/2023-10",
            "auth_type": "bearer",
            "headers": {
                "Content-Type": "application/json"
            },
            "endpoints": {
                "products": "/products.json",
                "create_product": "/products.json",
                "update_product": "/products/{product_id}.json",
                "orders": "/orders.json",
                "create_order": "/orders.json",
                "customers": "/customers.json",
                "create_customer": "/customers.json",
                "inventory_levels": "/inventory_levels.json",
                "inventory_items": "/inventory_items.json",
                "collections": "/collections.json"
            },
            "rate_limits": {
                "requests_per_second": 2,
                "burst_limit": 40
            }
        })

        # Stripe Configuration
        self.register_platform("stripe", {
            "base_url": "https://api.stripe.com/v1",
            "auth_type": "bearer",
            "headers": {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            "endpoints": {
                "customers": "/customers",
                "create_customer": "/customers",
                "charges": "/charges",
                "create_charge": "/charges",
                "payment_intents": "/payment_intents",
                "create_payment_intent": "/payment_intents",
                "subscriptions": "/subscriptions",
                "create_subscription": "/subscriptions",
                "products": "/products",
                "create_product": "/products",
                "prices": "/prices",
                "create_price": "/prices"
            },
            "rate_limits": {
                "requests_per_second": 25,
                "burst_limit": 100
            }
        })

    def _setup_auth_handlers(self):
        """Setup custom authentication handlers for each platform"""
        
        async def shopify_auth_handler(inputs: Dict[str, Any]) -> Dict[str, Any]:
            """Handle Shopify Bearer token authentication"""
            api_key = inputs.get("auth_token") or inputs.get("shopify_token")
            if not api_key:
                raise ValueError("Shopify integration requires 'auth_token' or 'shopify_token'")
            
            # Handle shop domain
            shop = inputs.get("shop") or inputs.get("shopify_shop")
            if not shop:
                raise ValueError("Shopify integration requires 'shop' or 'shopify_shop' parameter")
            
            # Update base URL with shop domain
            base_url = self.platform_configs["shopify"]["base_url"].format(shop=shop)
            inputs["api_endpoint"] = inputs.get("api_endpoint", "").replace("https://{shop}.myshopify.com/admin/api/2023-10", base_url)
            
            inputs["headers"] = {
                **inputs.get("headers", {}),
                "X-Shopify-Access-Token": api_key
            }
            return inputs

        async def stripe_auth_handler(inputs: Dict[str, Any]) -> Dict[str, Any]:
            """Handle Stripe Bearer token authentication"""
            api_key = inputs.get("auth_token") or inputs.get("stripe_key")
            if not api_key:
                raise ValueError("Stripe integration requires 'auth_token' or 'stripe_key'")
            
            inputs["headers"] = {
                **inputs.get("headers", {}),
                "Authorization": f"Bearer {api_key}"
            }
            return inputs

        self.register_auth_handler("shopify", shopify_auth_handler)
        self.register_auth_handler("stripe", stripe_auth_handler)

    def _setup_response_transformers(self):
        """Setup response transformers for standardized output"""
        
        def shopify_response_transformer(response_data: Any) -> Dict[str, Any]:
            """Transform Shopify API responses to standard format"""
            if isinstance(response_data, dict):
                if "products" in response_data:
                    # Products list response
                    return {
                        "platform": "shopify",
                        "action": "products_retrieved",
                        "data": {
                            "products": response_data["products"],
                            "total_count": len(response_data["products"])
                        }
                    }
                elif "product" in response_data:
                    # Single product response
                    product = response_data["product"]
                    return {
                        "platform": "shopify",
                        "action": "product_processed",
                        "data": {
                            "product_id": product.get("id"),
                            "title": product.get("title"),
                            "handle": product.get("handle"),
                            "status": product.get("status"),
                            "variants": product.get("variants", []),
                            "created_at": product.get("created_at"),
                            "updated_at": product.get("updated_at")
                        }
                    }
                elif "orders" in response_data:
                    # Orders list response
                    return {
                        "platform": "shopify",
                        "action": "orders_retrieved",
                        "data": {
                            "orders": response_data["orders"],
                            "total_count": len(response_data["orders"])
                        }
                    }
                elif "order" in response_data:
                    # Single order response
                    order = response_data["order"]
                    return {
                        "platform": "shopify",
                        "action": "order_processed",
                        "data": {
                            "order_id": order.get("id"),
                            "order_number": order.get("order_number"),
                            "total_price": order.get("total_price"),
                            "financial_status": order.get("financial_status"),
                            "fulfillment_status": order.get("fulfillment_status"),
                            "customer": order.get("customer", {}),
                            "line_items": order.get("line_items", [])
                        }
                    }
            
            return {"platform": "shopify", "data": response_data}

        def stripe_response_transformer(response_data: Any) -> Dict[str, Any]:
            """Transform Stripe API responses to standard format"""
            if isinstance(response_data, dict):
                if response_data.get("object") == "customer":
                    # Customer response
                    return {
                        "platform": "stripe",
                        "action": "customer_processed",
                        "data": {
                            "customer_id": response_data.get("id"),
                            "email": response_data.get("email"),
                            "name": response_data.get("name"),
                            "created": response_data.get("created"),
                            "default_source": response_data.get("default_source"),
                            "subscriptions": response_data.get("subscriptions", {}).get("data", [])
                        }
                    }
                elif response_data.get("object") == "charge":
                    # Charge response
                    return {
                        "platform": "stripe",
                        "action": "charge_processed",
                        "data": {
                            "charge_id": response_data.get("id"),
                            "amount": response_data.get("amount"),
                            "currency": response_data.get("currency"),
                            "status": response_data.get("status"),
                            "paid": response_data.get("paid"),
                            "customer": response_data.get("customer"),
                            "description": response_data.get("description")
                        }
                    }
                elif response_data.get("object") == "payment_intent":
                    # Payment Intent response
                    return {
                        "platform": "stripe",
                        "action": "payment_intent_processed",
                        "data": {
                            "payment_intent_id": response_data.get("id"),
                            "amount": response_data.get("amount"),
                            "currency": response_data.get("currency"),
                            "status": response_data.get("status"),
                            "client_secret": response_data.get("client_secret"),
                            "customer": response_data.get("customer")
                        }
                    }
                elif response_data.get("object") == "subscription":
                    # Subscription response
                    return {
                        "platform": "stripe",
                        "action": "subscription_processed",
                        "data": {
                            "subscription_id": response_data.get("id"),
                            "customer": response_data.get("customer"),
                            "status": response_data.get("status"),
                            "current_period_start": response_data.get("current_period_start"),
                            "current_period_end": response_data.get("current_period_end"),
                            "items": response_data.get("items", {}).get("data", [])
                        }
                    }
                elif "data" in response_data and "object" in response_data:
                    # List response
                    return {
                        "platform": "stripe",
                        "action": "list_retrieved",
                        "data": {
                            "objects": response_data["data"],
                            "total_count": len(response_data["data"]),
                            "has_more": response_data.get("has_more", False)
                        }
                    }
            
            return {"platform": "stripe", "data": response_data}

        self.register_response_transformer("shopify", shopify_response_transformer)
        self.register_response_transformer("stripe", stripe_response_transformer)

    # E-commerce specific helper methods
    async def create_product(self, platform: str, title: str, price: float, **kwargs) -> Dict[str, Any]:
        """Create a product across e-commerce platforms"""
        if platform == "shopify":
            return await self.execute_integration({
                "api_service_name": "shopify_create_product",
                "method": "POST",
                "endpoint": "/products.json",
                "data": {
                    "product": {
                        "title": title,
                        "body_html": kwargs.get("description", ""),
                        "vendor": kwargs.get("vendor", ""),
                        "product_type": kwargs.get("product_type", ""),
                        "status": kwargs.get("status", "active"),
                        "variants": [{
                            "price": str(price),
                            "sku": kwargs.get("sku", ""),
                            "inventory_quantity": kwargs.get("inventory", 0),
                            "weight": kwargs.get("weight", 0),
                            "weight_unit": kwargs.get("weight_unit", "kg")
                        }],
                        "images": kwargs.get("images", [])
                    }
                },
                **kwargs
            })
        elif platform == "stripe":
            return await self.execute_integration({
                "api_service_name": "stripe_create_product",
                "method": "POST",
                "endpoint": "/products",
                "data": {
                    "name": title,
                    "description": kwargs.get("description", ""),
                    "type": kwargs.get("type", "good"),
                    "active": kwargs.get("active", True),
                    "metadata": kwargs.get("metadata", {})
                },
                **kwargs
            })
        else:
            return {
                "success": False,
                "error": f"Platform {platform} not supported for product creation"
            }

    async def create_customer(self, platform: str, email: str, **kwargs) -> Dict[str, Any]:
        """Create a customer across e-commerce platforms"""
        if platform == "shopify":
            return await self.execute_integration({
                "api_service_name": "shopify_create_customer",
                "method": "POST",
                "endpoint": "/customers.json",
                "data": {
                    "customer": {
                        "email": email,
                        "first_name": kwargs.get("first_name", ""),
                        "last_name": kwargs.get("last_name", ""),
                        "phone": kwargs.get("phone", ""),
                        "accepts_marketing": kwargs.get("accepts_marketing", False),
                        "addresses": kwargs.get("addresses", [])
                    }
                },
                **kwargs
            })
        elif platform == "stripe":
            return await self.execute_integration({
                "api_service_name": "stripe_create_customer",
                "method": "POST",
                "endpoint": "/customers",
                "data": {
                    "email": email,
                    "name": kwargs.get("name", ""),
                    "phone": kwargs.get("phone", ""),
                    "description": kwargs.get("description", ""),
                    "metadata": kwargs.get("metadata", {})
                },
                **kwargs
            })
        else:
            return {
                "success": False,
                "error": f"Platform {platform} not supported for customer creation"
            }

    async def process_payment(self, platform: str, amount: int, currency: str, **kwargs) -> Dict[str, Any]:
        """Process payment across e-commerce platforms"""
        if platform == "stripe":
            if kwargs.get("use_payment_intent", True):
                return await self.execute_integration({
                    "api_service_name": "stripe_create_payment_intent",
                    "method": "POST",
                    "endpoint": "/payment_intents",
                    "data": {
                        "amount": amount,
                        "currency": currency,
                        "customer": kwargs.get("customer_id", ""),
                        "description": kwargs.get("description", ""),
                        "metadata": kwargs.get("metadata", {}),
                        "automatic_payment_methods": {"enabled": True}
                    },
                    **kwargs
                })
            else:
                return await self.execute_integration({
                    "api_service_name": "stripe_create_charge",
                    "method": "POST",
                    "endpoint": "/charges",
                    "data": {
                        "amount": amount,
                        "currency": currency,
                        "customer": kwargs.get("customer_id", ""),
                        "source": kwargs.get("source", ""),
                        "description": kwargs.get("description", ""),
                        "metadata": kwargs.get("metadata", {})
                    },
                    **kwargs
                })
        else:
            return {
                "success": False,
                "error": f"Platform {platform} not supported for payment processing"
            }

# Create global instance
ecommerce_runner = EcommerceIntegrationRunner()

async def run_ecommerce_tool(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute e-commerce platform integrations
    """
    try:
        return await ecommerce_runner.execute_integration(inputs)
    except Exception as e:
        logger.error(f"E-commerce integration error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "platform": inputs.get("api_service_name", "unknown"),
            "category": "ecommerce"
        } 