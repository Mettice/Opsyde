# backend/frameworks/universal_api_runner.py - NEW Framework
import logging
import json
import aiohttp
from typing import Dict, Any, Optional
from datetime import datetime

from backend.utils.logging import get_logger
from backend.frameworks.shared_api_research import research_for_tool

logger = get_logger(__name__)

class UniversalAPIRunner:
    """Enhanced with shared research and all protocol support"""
    
    def __init__(self):
        pass
    
    async def research_api(
        self,
        service_name: str,
        description: str,
        endpoint_hint: Optional[str] = None,
        user_keys: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Use shared research for tool creation"""
        return await research_for_tool(
            service_name=service_name,
            description=description,
            endpoint_hint=endpoint_hint,
            user_keys=user_keys
        )
    
    async def run_universal_api_tool(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Enhanced to support all protocols"""
        try:
            api_config = config.get('api_research_result', {})
            protocol = api_config.get('protocol', 'rest')
            
            # Route to protocol-specific handler
            if protocol == 'graphql':
                return await self._execute_graphql_call(api_config, input_data)
            elif protocol == 'soap':
                return await self._execute_soap_call(api_config, input_data)
            elif protocol == 'websocket':
                return await self._execute_websocket_call(api_config, input_data)
            elif protocol == 'grpc':
                return await self._execute_grpc_call(api_config, input_data)
            else:  # REST and default
                return await self._execute_rest_call(api_config, input_data)
                
        except Exception as e:
            logger.error(f"Universal API execution failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "type": "execution_error"
            }
    
    async def _execute_graphql_call(self, api_config: Dict, input_data: Dict) -> Dict:
        """Execute GraphQL query/mutation"""
        try:
            base_url = api_config.get('base_url')
            headers = {**api_config.get('default_headers', {})}
            
            # Add authentication
            auth_config = await self._setup_authentication(api_config, {})
            headers.update(auth_config.get('headers', {}))
            
            # Build GraphQL query
            query = input_data.get('query') or self._build_graphql_query(api_config, input_data)
            variables = input_data.get('variables', {})
            
            payload = {
                "query": query,
                "variables": variables
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(base_url, headers=headers, json=payload) as response:
                    result = await response.json()
                    
                    return {
                        "success": True,
                        "data": result,
                        "protocol": "GraphQL",
                        "status_code": response.status
                    }
                    
        except Exception as e:
            return {"success": False, "error": f"GraphQL error: {str(e)}"}
    
    async def _execute_soap_call(self, api_config: Dict, input_data: Dict) -> Dict:
        """Execute SOAP operation"""
        try:
            base_url = api_config.get('base_url')
            headers = {**api_config.get('default_headers', {})}
            
            # Build SOAP envelope
            soap_envelope = self._build_soap_envelope(api_config, input_data)
            
            async with aiohttp.ClientSession() as session:
                async with session.post(base_url, headers=headers, data=soap_envelope) as response:
                    result = await response.text()
                    
                    return {
                        "success": True,
                        "data": self._parse_soap_response(result),
                        "protocol": "SOAP",
                        "status_code": response.status
                    }
                    
        except Exception as e:
            return {"success": False, "error": f"SOAP error: {str(e)}"}
    
    async def _execute_websocket_call(self, api_config: Dict, input_data: Dict) -> Dict:
        """Execute WebSocket operation"""
        try:
            # WebSocket implementation would go here
            return {
                "success": False,
                "error": "WebSocket protocol not yet implemented",
                "protocol": "WebSocket"
            }
        except Exception as e:
            return {"success": False, "error": f"WebSocket error: {str(e)}"}
    
    async def _execute_grpc_call(self, api_config: Dict, input_data: Dict) -> Dict:
        """Execute gRPC operation"""
        try:
            # gRPC implementation would go here
            return {
                "success": False,
                "error": "gRPC protocol not yet implemented",
                "protocol": "gRPC"
            }
        except Exception as e:
            return {"success": False, "error": f"gRPC error: {str(e)}"}
    
    async def _execute_rest_call(self, api_config: Dict, input_data: Dict) -> Dict:
        """Execute REST API call (existing functionality)"""
        try:
            base_url = api_config.get('base_url')
            method = api_config.get('primary_method', 'POST')
            headers = {**api_config.get('default_headers', {})}
            
            # Add authentication
            auth_config = await self._setup_authentication(api_config, {})
            headers.update(auth_config.get('headers', {}))
            
            # Prepare request data
            request_data = input_data
            
            async with aiohttp.ClientSession() as session:
                if method.upper() == 'GET':
                    async with session.get(base_url, headers=headers, params=request_data) as response:
                        result = await response.json()
                else:
                    async with session.request(method, base_url, headers=headers, json=request_data) as response:
                        result = await response.json()
                
                return {
                    "success": True,
                    "data": result,
                    "protocol": "REST",
                    "status_code": response.status
                }
                
        except Exception as e:
            return {"success": False, "error": f"REST API error: {str(e)}"}
    
    def _build_graphql_query(self, api_config: Dict, input_data: Dict) -> str:
        """Build GraphQL query from config and input"""
        # Get primary endpoint
        primary_endpoints = api_config.get('primary_endpoints', [])
        if primary_endpoints:
            endpoint = primary_endpoints[0]
            operation_name = endpoint.get('name', 'query')
            
            # Simple query builder - can be enhanced
            if endpoint.get('method') == 'POST':
                return f"mutation {{ {operation_name}(input: $input) {{ id success message }} }}"
            else:
                return f"query {{ {operation_name} {{ id name description }} }}"
        
        return "query { __schema { types { name } } }"  # Fallback
    
    def _build_soap_envelope(self, api_config: Dict, input_data: Dict) -> str:
        """Build SOAP envelope"""
        # Simplified SOAP envelope builder
        operation = api_config.get('primary_endpoints', [{}])[0].get('name', 'Operation')
        
        envelope = f"""<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Header/>
    <soap:Body>
        <{operation}>
            {self._dict_to_xml(input_data)}
        </{operation}>
    </soap:Body>
</soap:Envelope>"""
        
        return envelope
    
    def _dict_to_xml(self, data: Dict) -> str:
        """Convert dictionary to XML elements"""
        xml_parts = []
        for key, value in data.items():
            if isinstance(value, dict):
                xml_parts.append(f"<{key}>{self._dict_to_xml(value)}</{key}>")
            else:
                xml_parts.append(f"<{key}>{value}</{key}>")
        return "".join(xml_parts)
    
    def _parse_soap_response(self, xml_response: str) -> Dict:
        """Parse SOAP response (simplified)"""
        # Simplified parser - would need proper XML parsing in production
        return {"raw_response": xml_response, "parsed": True}
    
    async def _setup_authentication(
        self,
        api_config: Dict[str, Any],
        tool_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Setup authentication headers based on API research"""
        
        auth_type = api_config.get("auth_type", "api_key")
        auth_header = api_config.get("auth_header", "Authorization")
        
        # Check for user-provided API key
        api_key = tool_config.get("apiKey") or tool_config.get("api_key")
        
        if not api_key:
            return {
                "headers": {},
                "auth_required": True,
                "auth_type": auth_type,
                "message": f"API key required for {auth_header} header"
            }
        
        headers = {}
        
        if auth_type == "bearer_token":
            headers[auth_header] = f"Bearer {api_key}"
        elif auth_type == "api_key":
            if auth_header.lower() == "authorization":
                headers[auth_header] = f"Bearer {api_key}"
            else:
                headers[auth_header] = api_key
        elif auth_type == "basic_auth":
            import base64
            encoded = base64.b64encode(f"{api_key}:".encode()).decode()
            headers["Authorization"] = f"Basic {encoded}"
        else:
            # Default to API key in specified header
            headers[auth_header] = api_key
        
        return {
            "headers": headers,
            "auth_required": False,
            "auth_type": auth_type
        }

# Global instance for standalone function access
_universal_runner = UniversalAPIRunner()

# Standalone function for backward compatibility
async def run_universal_api_tool(config: Dict[str, Any], input_data: Dict[str, Any]) -> Dict[str, Any]:
    """Standalone function to run universal API tool"""
    return await _universal_runner.run_universal_api_tool(config, input_data)

# Research function for tool creation
async def research_universal_api(
    service_name: str,
    description: str,
    endpoint_hint: Optional[str] = None,
    user_keys: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """Standalone function to research API for tool creation"""
    return await _universal_runner.research_api(service_name, description, endpoint_hint, user_keys)