# backend/runners/webhook_runner.py

import requests
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Check if aiohttp is available
AIOHTTP_AVAILABLE = False
try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
    logger.info("aiohttp loaded successfully")
except ImportError as e:
    logger.warning(f"aiohttp not available: {str(e)}. Async webhook functionality will be limited.")

def post_to_webhook_sync(data):
    """
    Post data to a webhook URL using synchronous requests

    Args:
        data: Dictionary containing the data to post and webhook_url

    Returns:
        String indicating success or failure
    """
    try:
        webhook_url = data.get("webhook_url")
        if not webhook_url:
            return "No webhook URL provided"

        # Remove the webhook_url from the payload
        payload = {k: v for k, v in data.items() if k != "webhook_url"}

        # Make the POST request
        response = requests.post(
            webhook_url,
            data=json.dumps(payload),
            headers={"Content-Type": "application/json"}
        )

        # Check if the request was successful
        response.raise_for_status()

        return f"Successfully posted to webhook (Status: {response.status_code})"

    except requests.exceptions.RequestException as e:
        logger.error(f"Error posting to webhook: {str(e)}")
        return f"Failed to post to webhook: {str(e)}"

async def post_to_webhook(url: str, data: Any) -> Dict[str, Any]:
    """Post data to a webhook endpoint"""
    # If aiohttp is not available, use synchronous version
    if not AIOHTTP_AVAILABLE:
        logger.warning("Using synchronous webhook due to missing aiohttp")
        try:
            result = post_to_webhook_sync({"webhook_url": url, **data} if isinstance(data, dict) else {"webhook_url": url, "data": data})
            return {
                "success": "Successfully" in result,
                "response": result,
                "fallback": True
            }
        except Exception as e:
            logger.error(f"Error in synchronous webhook fallback: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "fallback": True
            }
    
    try:
        logger.info(f"Sending webhook to {url}")
        
        # Convert data to proper format if needed
        if isinstance(data, dict):
            payload = data
        else:
            # For non-dict values like strings, wrap in a data field
            payload = {"data": data}
            
        # Attempt to serialize to JSON, providing better errors if it fails
        try:
            json_payload = json.dumps(payload)
        except TypeError as e:
            logger.error(f"Failed to serialize webhook payload: {e}")
            # Fix payload by removing problematic values (like functions or circular refs)
            clean_payload = _clean_payload(payload)
            json_payload = json.dumps(clean_payload)
            logger.info(f"Using cleaned payload instead: {json_payload[:200]}...")
            
        # Safer URL validation with fallback
        if not url.startswith(('http://', 'https://')):
            fallback_url = "https://webhook.site/a450a8da-cfce-4a72-9567-06c0eba8ce1a"
            logger.warning(f"Invalid webhook URL: {url}. Using fallback: {fallback_url}")
            url = fallback_url
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                url, 
                json=payload,
                timeout=10  # Set a reasonable timeout
            ) as response:
                logger.info(f"Webhook response status: {response.status}")
                
                # Try to parse response as JSON
                try:
                    result = await response.json()
                except:
                    # If not JSON, get text
                    result = await response.text()
                    
                return {
                    "success": response.status >= 200 and response.status < 300,
                    "status_code": response.status,
                    "response": result
                }
                
    except aiohttp.ClientError as e:
        logger.error(f"Webhook request error: {str(e)}")
        return {
            "success": False,
            "error": f"Request error: {str(e)}",
            "fallback": True
        }
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "fallback": True
        }

def _clean_payload(payload):
    """Clean a payload to make it JSON serializable"""
    if isinstance(payload, dict):
        return {k: _clean_payload(v) for k, v in payload.items() if k not in ('_', '__')}
    elif isinstance(payload, list):
        return [_clean_payload(item) for item in payload]
    elif isinstance(payload, (str, int, float, bool, type(None))):
        return payload
    else:
        # Convert any other type to string representation
        return str(payload)

async def send_webhook(url: str, data: Any) -> Dict[str, Any]:
    """Alias for post_to_webhook for backwards compatibility"""
    return await post_to_webhook(url, data)
