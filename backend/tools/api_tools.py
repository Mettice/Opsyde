import aiohttp
import logging
import json
from typing import Dict, Any, Optional, Union
from datetime import datetime

logger = logging.getLogger(__name__)

class APITool:
    """Base class for API tools"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.base_url = config.get('base_url', '')
        self.headers = config.get('headers', {})
        self.timeout = config.get('timeout', 30)

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the API tool with given inputs"""
        try:
            method = self.config.get('method', 'GET').upper()
            endpoint = self.config.get('endpoint', '')
            url = f"{self.base_url}{endpoint}"

            # Merge default headers with request-specific headers
            headers = {**self.headers, **inputs.get('headers', {})}
            
            # Prepare request data
            data = self._prepare_request_data(inputs)
            
            async with aiohttp.ClientSession() as session:
                async with session.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=data if method in ['POST', 'PUT', 'PATCH'] else None,
                    params=data if method == 'GET' else None,
                    timeout=self.timeout
                ) as response:
                    return await self._process_response(response)
                    
        except aiohttp.ClientError as e:
            logger.error(f"API request failed: {str(e)}")
            return self._format_error("request_failed", str(e))
        except Exception as e:
            logger.error(f"Unexpected error in API tool: {str(e)}")
            return self._format_error("unexpected_error", str(e))

    def _prepare_request_data(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare request data from inputs"""
        data = {}
        
        # Get parameter mapping from config
        param_mapping = self.config.get('parameter_mapping', {})
        
        # Map input values to parameters
        for input_key, param_key in param_mapping.items():
            if input_key in inputs:
                data[param_key] = inputs[input_key]
        
        # Add any static parameters from config
        static_params = self.config.get('static_parameters', {})
        data.update(static_params)
        
        return data

    async def _process_response(self, response: aiohttp.ClientResponse) -> Dict[str, Any]:
        """Process the API response"""
        try:
            status_code = response.status
            
            if 200 <= status_code < 300:
                try:
                    data = await response.json()
                    return {
                        "success": True,
                        "status_code": status_code,
                        "data": data,
                        "timestamp": datetime.now().isoformat()
                    }
                except json.JSONDecodeError:
                    text = await response.text()
                    return {
                        "success": True,
                        "status_code": status_code,
                        "data": text,
                        "timestamp": datetime.now().isoformat()
                    }
            else:
                error_text = await response.text()
                return self._format_error(
                    "api_error",
                    f"API returned error status {status_code}",
                    {"status_code": status_code, "response": error_text}
                )
                
        except Exception as e:
            return self._format_error("response_processing_error", str(e))

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

# Example specialized API tools
class RESTAPITool(APITool):
    """REST API tool with JSON handling"""
    
    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute REST API request"""
        # Add JSON content type header if not present
        self.headers.setdefault('Content-Type', 'application/json')
        return await super().execute(inputs)

class GraphQLTool(APITool):
    """GraphQL API tool"""
    
    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute GraphQL query"""
        self.headers.setdefault('Content-Type', 'application/json')
        
        # Prepare GraphQL request
        query = self.config.get('query', '')
        variables = self._prepare_request_data(inputs)
        
        data = {
            "query": query,
            "variables": variables
        }
        
        # Force POST method for GraphQL
        self.config['method'] = 'POST'
        return await super().execute({"data": data})

# Factory function to create appropriate API tool
def create_api_tool(tool_type: str, config: Dict[str, Any]) -> APITool:
    """Create an API tool instance based on type"""
    tool_types = {
        "rest": RESTAPITool,
        "graphql": GraphQLTool,
        "default": APITool
    }
    
    tool_class = tool_types.get(tool_type.lower(), APITool)
    return tool_class(config)

async def run_api_tool(config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Run API tool with configuration and inputs"""
    try:
        # Extract tool type from config
        tool_type = config.get('tool_type', 'rest')
        
        # Create API tool instance
        api_tool = create_api_tool(tool_type, config)
        
        # Execute the tool
        result = await api_tool.execute(inputs)
        
        # Format response for consistency
        if result.get("success"):
            return {
                "success": True,
                "output": result.get("data"),
                "metadata": {
                    "status_code": result.get("status_code"),
                    "timestamp": result.get("timestamp"),
                    "tool_type": tool_type
                },
                "framework": "api_tool"
            }
        else:
            return {
                "success": False,
                "error": result.get("error"),
                "framework": "api_tool"
            }
            
    except Exception as e:
        logger.error(f"API tool execution failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "framework": "api_tool"
        }
