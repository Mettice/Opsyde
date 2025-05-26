import aiohttp
import logging
import json
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)

class WebhookTool:
    """Tool for handling webhook operations"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.webhook_url = config.get('webhook_url', '')
        self.method = config.get('method', 'POST')
        self.headers = config.get('headers', {})
        self.max_retries = config.get('max_retries', 3)
        self.retry_delay = config.get('retry_delay', 1)
        self.timeout = config.get('timeout', 30)

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute webhook with retry logic"""
        retries = 0
        last_error = None

        while retries <= self.max_retries:
            try:
                return await self._send_webhook(inputs)
            except Exception as e:
                last_error = e
                retries += 1
                if retries <= self.max_retries:
                    await asyncio.sleep(self.retry_delay * retries)  # Exponential backoff
                logger.warning(f"Webhook attempt {retries} failed: {str(e)}")

        return self._format_error(
            "webhook_failed",
            f"Webhook failed after {retries} attempts",
            {"last_error": str(last_error)}
        )

    async def _send_webhook(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Send webhook request"""
        try:
            # Prepare payload
            payload = self._prepare_payload(inputs)
            
            # Add default headers for webhook
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'CrewFlow-Webhook/1.0',
                **self.headers
            }

            async with aiohttp.ClientSession() as session:
                async with session.request(
                    method=self.method,
                    url=self.webhook_url,
                    json=payload,
                    headers=headers,
                    timeout=self.timeout
                ) as response:
                    return await self._process_response(response)

        except aiohttp.ClientError as e:
            raise WebhookError(f"Webhook request failed: {str(e)}")
        except Exception as e:
            raise WebhookError(f"Unexpected error: {str(e)}")

    def _prepare_payload(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare webhook payload"""
        payload = {}
        
        # Get payload template from config
        template = self.config.get('payload_template', {})
        
        # Apply template transformations
        for key, value in template.items():
            if isinstance(value, str) and value.startswith('$'):
                # Template variable, get from inputs
                input_key = value[1:]  # Remove $ prefix
                if input_key in inputs:
                    payload[key] = inputs[input_key]
            else:
                # Static value
                payload[key] = value
        
        # Add any additional data from inputs
        extra_data = self.config.get('include_extra_data', False)
        if extra_data:
            for key, value in inputs.items():
                if key not in payload:
                    payload[key] = value
        
        # Add metadata if configured
        if self.config.get('include_metadata', True):
            payload['metadata'] = {
                'timestamp': datetime.now().isoformat(),
                'source': 'crewflow',
                'webhook_id': self.config.get('webhook_id', 'unknown')
            }
        
        return payload

    async def _process_response(self, response: aiohttp.ClientResponse) -> Dict[str, Any]:
        """Process webhook response"""
        status_code = response.status
        
        try:
            if 200 <= status_code < 300:
                try:
                    data = await response.json()
                except json.JSONDecodeError:
                    data = await response.text()
                
                return {
                    "success": True,
                    "status_code": status_code,
                    "data": data,
                    "timestamp": datetime.now().isoformat()
                }
            else:
                error_text = await response.text()
                return self._format_error(
                    "webhook_error",
                    f"Webhook returned error status {status_code}",
                    {"status_code": status_code, "response": error_text}
                )
        except Exception as e:
            return self._format_error(
                "response_processing_error",
                str(e)
            )

    def _format_error(self, error_type: str, message: str, details: Optional[Dict] = None) -> Dict[str, Any]:
        """Format error response"""
        return {
            "success": False,
            "error": {
                "type": error_type,
                "message": message,
                "details": details or {},
                "timestamp": datetime.now().isoformat()
            }
        }

class WebhookError(Exception):
    """Custom exception for webhook errors"""
    pass

# Webhook event types
class WebhookEventType:
    DATA_CREATED = "data.created"
    DATA_UPDATED = "data.updated"
    DATA_DELETED = "data.deleted"
    WORKFLOW_STARTED = "workflow.started"
    WORKFLOW_COMPLETED = "workflow.completed"
    WORKFLOW_FAILED = "workflow.failed"

# Factory function to create webhook tool
def create_webhook_tool(config: Dict[str, Any]) -> WebhookTool:
    """Create a webhook tool instance"""
    return WebhookTool(config)

async def run_webhook_tool(config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Run webhook tool with configuration and inputs"""
    try:
        # Create webhook tool instance
        webhook_tool = create_webhook_tool(config)
        
        # Execute the webhook
        result = await webhook_tool.execute(inputs)
        
        # Format response for consistency
        if result.get("success"):
            return {
                "success": True,
                "output": result.get("data"),
                "metadata": {
                    "status_code": result.get("status_code"),
                    "timestamp": result.get("timestamp"),
                    "webhook_url": config.get("webhook_url")
                },
                "framework": "webhook_tool"
            }
        else:
            return {
                "success": False,
                "error": result.get("error"),
                "framework": "webhook_tool"
            }
            
    except Exception as e:
        logger.error(f"Webhook tool execution failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "framework": "webhook_tool"
        }
