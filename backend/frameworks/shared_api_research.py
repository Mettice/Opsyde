# backend/frameworks/shared_api_research.py - NEW: Unified AI Research Service
import logging
from typing import Dict, Any, Optional, Literal
from datetime import datetime

from utils.logging import get_logger

logger = get_logger(__name__)

class SharedAPIResearch:
    """Unified AI research service for both Tool and Output nodes"""
    
    def __init__(self):
        # Protocol detection patterns
        self.protocol_indicators = {
            "graphql": ["/graphql", "query", "mutation", "GraphQL", "schema"],
            "soap": [".wsdl", "soap", "envelope", "SOAP", "xmlns"],
            "websocket": ["ws://", "wss://", "socket", "real-time", "streaming"],
            "grpc": [".proto", "grpc", "streaming", "protobuf", "rpc"],
            "rest": ["api", "rest", "http", "json"]  # default
        }
        
        # Purpose-specific optimizations
        self.purpose_keywords = {
            "data_input": ["get", "fetch", "query", "search", "list", "find", "read"],
            "data_output": ["post", "create", "send", "update", "insert", "write", "publish"]
        }
    
    def _select_best_llm(self, user_keys: Dict[str, str], ai_config: Dict[str, Any]) -> Optional[Dict]:
        """Select best available LLM based on user's keys and task"""
        
        # Priority order (most capable first)
        llm_priority = [
            {"provider": "openai", "model": "gpt-4", "key": user_keys.get("openai_key")},
            {"provider": "anthropic", "model": "claude-3-sonnet", "key": user_keys.get("anthropic_key")},
            {"provider": "openrouter", "model": "openai/gpt-4", "key": user_keys.get("openrouter_key")},
        ]
        
        # Return first available
        for llm in llm_priority:
            if llm["key"]:
                return llm
                
        return None
    
    async def _generate_integration_plan_with_user_key(
        self,
        output_type: str,
        ai_config: Dict[str, Any],
        data: Any,
        llm_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate integration plan using user's LLM key"""
        try:
            # Build AI prompt
            prompt = ai_config.get('description', '')
            
            # Use OpenRouter for all LLM providers since it supports OpenAI, Anthropic, etc.
            from backend.frameworks.openrouter_runner import run_openrouter_chat
            
            # Map provider-specific models to OpenRouter format
            model_mapping = {
                "openai": {
                    "gpt-4": "openai/gpt-4-turbo",
                    "gpt-3.5-turbo": "openai/gpt-3.5-turbo"
                },
                "anthropic": {
                    "claude-3-opus": "anthropic/claude-3-opus",
                    "claude-3-sonnet": "anthropic/claude-3-sonnet",
                    "claude-3-haiku": "anthropic/claude-3-haiku"
                },
                "openrouter": {}  # OpenRouter models can be used directly
            }
            
            # Get the correct model name for OpenRouter
            provider = llm_config["provider"]
            model = llm_config["model"]
            
            if provider in model_mapping and model in model_mapping[provider]:
                openrouter_model = model_mapping[provider][model]
            elif provider == "openrouter":
                openrouter_model = model
            else:
                # Default fallback
                openrouter_model = "openai/gpt-4-turbo"
            
            # Use the appropriate API key
            api_key = llm_config["key"]
            if provider == "openai" and not api_key:
                api_key = llm_config.get("openrouter_key")  # Fallback to OpenRouter
            elif provider == "anthropic" and not api_key:
                api_key = llm_config.get("openrouter_key")  # Fallback to OpenRouter
            
            messages = [{"role": "user", "content": prompt}]
            ai_response = await run_openrouter_chat(
                messages, 
                model=openrouter_model,
                temperature=0.3
            )
            
            # Parse AI response into structured plan
            plan = self._parse_ai_response(ai_response)
            
            return {
                "success": True,
                "plan": plan,
                "ai_reasoning": ai_response
            }
            
        except Exception as e:
            logger.error(f"AI plan generation with user key failed: {str(e)}")
            return {
                "success": False,
                "error": f"AI planning failed: {str(e)}"
            }
    
    def _parse_ai_response(self, ai_response: str) -> Dict[str, Any]:
        """Parse AI response into structured integration plan with robust error handling"""
        try:
            import json
            import re
            
            logger.info(f"Parsing AI response (length: {len(ai_response)})")
            
            # Try to extract JSON from response
            json_str = None
            
            # Method 1: Look for ```json blocks
            if "```json" in ai_response:
                json_start = ai_response.find("```json") + 7
                json_end = ai_response.find("```", json_start)
                if json_end != -1:
                    json_str = ai_response[json_start:json_end].strip()
                    logger.info("Found JSON in code block")
                else:
                    # If no closing ```, take everything after ```json
                    json_str = ai_response[json_start:].strip()
                    logger.info("Found JSON in code block (no closing backticks)")
            
            # Method 1.5: Look for just ``` blocks (sometimes AI uses ``` without json)
            elif "```" in ai_response and "{" in ai_response:
                json_start = ai_response.find("```")
                # Skip the first ``` and any language identifier
                while json_start < len(ai_response) and ai_response[json_start] not in ['{', '\n']:
                    json_start += 1
                if json_start < len(ai_response) and ai_response[json_start] == '\n':
                    json_start += 1
                
                json_end = ai_response.find("```", json_start)
                if json_end != -1:
                    json_str = ai_response[json_start:json_end].strip()
                    logger.info("Found JSON in generic code block")
                else:
                    json_str = ai_response[json_start:].strip()
                    logger.info("Found JSON in generic code block (no closing backticks)")
            
            # Method 2: Look for { } blocks
            if not json_str and "{" in ai_response and "}" in ai_response:
                # Find the largest JSON-like block
                json_start = ai_response.find("{")
                brace_count = 0
                json_end = -1
                
                for i in range(json_start, len(ai_response)):
                    if ai_response[i] == "{":
                        brace_count += 1
                    elif ai_response[i] == "}":
                        brace_count -= 1
                        if brace_count == 0:
                            json_end = i + 1
                            break
                
                if json_end != -1:
                    json_str = ai_response[json_start:json_end]
                    logger.info("Found JSON by brace matching")
            
            if not json_str:
                raise ValueError("No JSON found in AI response")
            
            # Clean up the JSON string
            json_str = json_str.strip()
            logger.info(f"Extracted JSON string (first 200 chars): {json_str[:200]}...")
            
            # Try to fix common JSON issues
            # Fix escaped quotes at the beginning of property names
            json_str = re.sub(r'\\\"([^"]+)":', r'"\1":', json_str)
            # Fix escaped quotes in the middle of strings
            json_str = re.sub(r'\\\"', '"', json_str)
            
            # Additional cleanup for unterminated strings
            # If we find an unterminated string, try to close it
            lines = json_str.split('\n')
            cleaned_lines = []
            for line in lines:
                # Check if line has an odd number of quotes (indicating unterminated string)
                quote_count = line.count('"') - line.count('\\"')
                if quote_count % 2 == 1 and not line.strip().endswith(','):
                    # Try to close the string
                    line = line + '"'
                cleaned_lines.append(line)
            json_str = '\n'.join(cleaned_lines)
            
            # Try to parse
            try:
                plan = json.loads(json_str)
                logger.info("Successfully parsed JSON")
            except json.JSONDecodeError as e:
                logger.warning(f"Initial JSON parse failed: {e}")
                
                # Try to fix common issues and parse again
                # Remove trailing commas
                json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
                
                # Fix unescaped newlines in strings
                json_str = re.sub(r'(?<!\\)\n', '\\n', json_str)
                
                # Try parsing again
                try:
                    plan = json.loads(json_str)
                    logger.info("Successfully parsed JSON after cleanup")
                except json.JSONDecodeError as e2:
                    logger.error(f"JSON parse failed even after cleanup: {e2}")
                    logger.error(f"Problematic JSON: {json_str[:500]}...")
                    
                    # Try to salvage what we can by truncating at the error point
                    if "Unterminated string" in str(e2):
                        # Find the error position and try to truncate there
                        error_pos = getattr(e2, 'pos', None)
                        if error_pos and error_pos > 100:
                            # Try to find the last complete object before the error
                            truncated_json = json_str[:error_pos]
                            
                            # Find the last complete closing brace
                            brace_count = 0
                            last_valid_pos = 0
                            
                            for i, char in enumerate(truncated_json):
                                if char == '{':
                                    brace_count += 1
                                elif char == '}':
                                    brace_count -= 1
                                    if brace_count == 0:
                                        last_valid_pos = i + 1
                            
                            if last_valid_pos > 0:
                                try:
                                    salvaged_json = truncated_json[:last_valid_pos]
                                    plan = json.loads(salvaged_json)
                                    logger.info("Successfully salvaged partial JSON")
                                    # Continue with the salvaged plan
                                except:
                                    pass
                    
                    if 'plan' not in locals():
                        # Return a basic fallback structure
                        return {
                            "service_name": "Unknown",
                            "integration_type": "rest",
                            "confidence": 0.5,
                            "error": f"JSON parsing failed: {str(e2)}",
                            "raw_response": ai_response[:1000]  # First 1000 chars for debugging
                        }
            
            # Validate and ensure required fields
            required_fields = ["service_name", "integration_type", "confidence"]
            for field in required_fields:
                if field not in plan:
                    if field == "service_name":
                        plan[field] = "Unknown Service"
                    elif field == "integration_type":
                        plan[field] = "rest"
                    elif field == "confidence":
                        plan[field] = 0.7
            
            # Ensure confidence is a number
            if not isinstance(plan.get("confidence"), (int, float)):
                plan["confidence"] = 0.7
            
            return plan
            
        except Exception as e:
            logger.error(f"Failed to parse AI response: {str(e)}")
            logger.error(f"Response preview: {ai_response[:500]}...")
            
            # Return a basic fallback structure instead of raising
            return {
                "service_name": "Unknown Service",
                "integration_type": "rest",
                "confidence": 0.3,
                "error": f"Parsing failed: {str(e)}",
                "raw_response": ai_response[:1000] if ai_response else "No response"
            }

    async def research_api(
        self,
        service_name: str,
        description: str,
        purpose: Literal["data_input", "data_output"],
        endpoint_hint: Optional[str] = None,
        user_keys: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Unified API research for both Tool and Output nodes
        
        Args:
            service_name: Name of the service (e.g., "Linear", "Custom CRM")
            description: What user wants to do
            purpose: "data_input" for Tool nodes, "data_output" for Output nodes
            endpoint_hint: Optional API URL hint
            user_keys: User's LLM API keys for research
        """
        try:
            logger.info(f"Starting unified API research: {service_name} ({purpose})")
            
            # Step 1: Detect protocol
            protocol = await self._detect_protocol(service_name, description, endpoint_hint)
            
            # Step 2: Build purpose-specific research prompt
            research_prompt = self._build_unified_research_prompt(
                service_name, description, purpose, protocol, endpoint_hint
            )
            
            # Step 3: Get user's LLM for research
            llm_config = self._select_best_llm(user_keys or {}, {})
            if not llm_config:
                return self._return_error("No AI model available for research")
            
            # Step 4: Perform AI research
            research_result = await self._generate_integration_plan_with_user_key(
                'unified_api_research',
                {'description': research_prompt},
                {},
                llm_config
            )
            
            if not research_result.get('success'):
                return self._return_error(research_result.get('error', 'Research failed'))
            
            # Step 5: Process and optimize results based on purpose
            api_spec = research_result['plan']
            optimized_spec = await self._optimize_for_purpose(api_spec, purpose, protocol)
            
            # Step 6: Validate and enhance
            validated_spec = await self._validate_and_enhance(optimized_spec, service_name, protocol)
            
            # Step 7: Test connectivity
            connectivity_test = await self._test_basic_connectivity(validated_spec)
            
            final_result = {
                "success": True,
                "service_name": service_name,
                "protocol": protocol,
                "purpose": purpose,
                "api_type": validated_spec.get('api_type', protocol.upper()),
                "base_url": validated_spec.get('base_url'),
                "auth_type": validated_spec.get('auth_type', 'api_key'),
                "auth_required": validated_spec.get('auth_required', True),
                "auth_header": validated_spec.get('auth_header', 'Authorization'),
                "auth_format": validated_spec.get('auth_format', 'Bearer {token}'),
                "auth_instructions": validated_spec.get('auth_instructions', ''),
                "endpoints": validated_spec.get('endpoints', []),
                "primary_endpoints": validated_spec.get('primary_endpoints', []),
                "default_headers": validated_spec.get('default_headers', {}),
                "sample_input": validated_spec.get('sample_input', {}),
                "sample_output": validated_spec.get('sample_output', {}),
                "data_mapping": validated_spec.get('data_mapping', {}),
                "protocol_config": validated_spec.get('protocol_config', {}),
                "confidence": validated_spec.get('confidence', 0.8),
                "connectivity_test": connectivity_test,
                "documentation_url": validated_spec.get('documentation_url'),
                "research_timestamp": datetime.now().isoformat(),
                "supports_pagination": validated_spec.get('supports_pagination', False),
                "rate_limits": validated_spec.get('rate_limits', 'Unknown'),
                "webhook_support": validated_spec.get('webhook_support', False)
            }
            
            logger.info(f"Final API research result: auth_type={final_result['auth_type']}, auth_required={final_result['auth_required']}")
            
            return final_result
            
        except Exception as e:
            logger.error(f"Unified API research failed: {str(e)}")
            return self._return_error(f"Research failed: {str(e)}")
    
    async def _detect_protocol(
        self,
        service_name: str,
        description: str,
        endpoint_hint: Optional[str] = None
    ) -> str:
        """Detect API protocol from service name, description, and endpoint"""
        
        # Check endpoint hint first
        if endpoint_hint:
            endpoint_lower = endpoint_hint.lower()
            for protocol, indicators in self.protocol_indicators.items():
                if any(indicator in endpoint_lower for indicator in indicators):
                    logger.info(f"Protocol detected from endpoint: {protocol}")
                    return protocol
        
        # Check service name and description
        combined_text = f"{service_name} {description}".lower()
        
        # Score each protocol
        protocol_scores = {}
        for protocol, indicators in self.protocol_indicators.items():
            score = sum(1 for indicator in indicators if indicator in combined_text)
            if score > 0:
                protocol_scores[protocol] = score
        
        # Return highest scoring protocol, default to REST
        if protocol_scores:
            detected = max(protocol_scores, key=protocol_scores.get)
            logger.info(f"Protocol detected from content: {detected} (score: {protocol_scores[detected]})")
            return detected
        
        logger.info("No specific protocol detected, defaulting to REST")
        return "rest"
    
    def _build_unified_research_prompt(
        self,
        service_name: str,
        description: str,
        purpose: str,
        protocol: str,
        endpoint_hint: Optional[str] = None
    ) -> str:
        """Build comprehensive research prompt for unified API research"""
        
        purpose_focus = {
            "data_input": "Focus on endpoints for retrieving, querying, and fetching data. Prioritize GET methods and data extraction.",
            "data_output": "Focus on endpoints for creating, updating, and sending data. Prioritize POST/PUT methods and data submission."
        }
        
        protocol_specifics = {
            "graphql": "Analyze GraphQL schema, identify queries/mutations, provide sample GraphQL operations.",
            "soap": "Parse WSDL definition, identify operations, provide SOAP envelope examples.",
            "websocket": "Identify connection patterns, message formats, and real-time capabilities.",
            "grpc": "Analyze .proto files if available, identify service methods and message types.",
            "rest": "Identify REST endpoints, HTTP methods, and standard REST patterns."
        }
        
        prompt = f"""
Research the {service_name} API for this integration: {description}

PURPOSE: {purpose_focus.get(purpose, '')}
PROTOCOL: {protocol.upper()} - {protocol_specifics.get(protocol, '')}
{f"ENDPOINT HINT: {endpoint_hint}" if endpoint_hint else ""}

Please analyze and return:

1. API DISCOVERY:
   - Official API documentation URL
   - Base API URL/endpoint
   - Protocol type ({protocol.upper()})
   - API version information

2. AUTHENTICATION:
   - Authentication method (API key, OAuth2, Bearer token, Basic auth, etc.)
   - Required headers and their format
   - Token/key placement (header, query, body)
   - Specific instructions for obtaining credentials
   - Whether authentication is required or optional

3. ENDPOINTS (focus on {purpose.replace('_', ' ')}):
   - Available endpoints relevant to: {description}
   - HTTP methods and paths
   - Required and optional parameters
   - Request/response formats

4. PROTOCOL-SPECIFIC:
   {protocol_specifics.get(protocol, '')}

5. DATA HANDLING:
   - Request data format and structure
   - Response data format and structure
   - Error handling and status codes
   - Pagination support (if applicable)

6. TECHNICAL DETAILS:
   - Rate limits and throttling
   - Required headers
   - Content-Type specifications
   - CORS considerations

Return a comprehensive JSON response with this structure:
```json
{{
    "service_name": "{service_name}",
    "api_type": "{protocol.upper()}",
    "base_url": "https://api.{service_name.lower().replace(' ', '')}.com",
    "auth_type": "api_key|bearer_token|oauth2|basic_auth|custom",
    "auth_header": "Authorization|X-API-Key|custom",
    "auth_format": "Bearer {{token}}|{{key}}|custom format",
    "auth_instructions": "Brief instructions for obtaining credentials",
    "auth_required": true,
    "endpoints": [
        {{
            "name": "endpoint_name",
            "path": "/api/v1/resource",
            "method": "GET|POST|PUT|DELETE",
            "description": "Brief description"
        }}
    ],
    "default_headers": {{
        "Content-Type": "application/json"
    }},
    "supports_pagination": true,
    "rate_limits": "Brief rate limit info",
    "webhook_support": true,
    "documentation_url": "https://docs.{service_name.lower()}.com",
    "integration_type": "rest",
    "confidence": 0.95
}}
```

IMPORTANT: 
- Return ONLY valid JSON, no additional text
- Escape all quotes properly in strings
- Do not include comments in the JSON
- Ensure all strings are properly terminated
- For authentication, be specific about what credentials users need to provide
- Include detailed auth_instructions with step-by-step guidance
- Set auth_required to true if authentication is needed, false if optional
        """
        
        return prompt
    
    async def _optimize_for_purpose(
        self,
        api_spec: Dict[str, Any],
        purpose: str,
        protocol: str
    ) -> Dict[str, Any]:
        """Optimize API specification based on purpose (input vs output)"""
        
        optimized = api_spec.copy()
        
        # Filter endpoints by purpose
        all_endpoints = api_spec.get("endpoints", [])
        purpose_keywords = self.purpose_keywords.get(purpose, [])
        
        # Score endpoints by purpose relevance
        scored_endpoints = []
        for endpoint in all_endpoints:
            score = 0
            endpoint_text = f"{endpoint.get('name', '')} {endpoint.get('description', '')}".lower()
            
            # Score by keywords
            for keyword in purpose_keywords:
                if keyword in endpoint_text:
                    score += 1
            
            # Score by HTTP method
            method = endpoint.get('method', '').upper()
            if purpose == "data_input" and method in ['GET', 'POST']:
                score += 2
            elif purpose == "data_output" and method in ['POST', 'PUT', 'PATCH']:
                score += 2
            
            scored_endpoints.append((score, endpoint))
        
        # Sort by score and take top endpoints
        scored_endpoints.sort(key=lambda x: x[0], reverse=True)
        optimized["primary_endpoints"] = [ep for score, ep in scored_endpoints[:5]]
        
        # Add purpose-specific configurations
        if purpose == "data_input":
            optimized["focus"] = "data_retrieval"
            optimized["recommended_methods"] = ["GET", "POST"]
            if optimized.get("supports_pagination"):
                optimized["pagination_recommended"] = True
        
        elif purpose == "data_output":
            optimized["focus"] = "data_submission"
            optimized["recommended_methods"] = ["POST", "PUT", "PATCH"]
            if optimized.get("webhook_support"):
                optimized["webhook_recommended"] = True
        
        return optimized
    
    async def _validate_and_enhance(
        self,
        api_spec: Dict[str, Any],
        service_name: str,
        protocol: str
    ) -> Dict[str, Any]:
        """Validate and enhance API specification"""
        
        validated = api_spec.copy()
        
        # Ensure base URL is valid
        base_url = validated.get("base_url", "")
        if not base_url.startswith(("http://", "https://")):
            validated["base_url"] = f"https://{base_url}" if base_url else f"https://api.{service_name.lower().replace(' ', '')}.com"
        
        # Ensure we have default headers
        if not validated.get("default_headers"):
            validated["default_headers"] = {
                "Content-Type": "application/json",
                "User-Agent": "Workflow-Integration/1.0"
            }
        
        # Add protocol-specific enhancements
        if protocol == "graphql":
            validated["graphql_introspection"] = f"{validated['base_url']}?introspection"
            validated["default_headers"]["Content-Type"] = "application/json"
        
        elif protocol == "soap":
            validated["wsdl_url"] = f"{validated['base_url']}?wsdl"
            validated["default_headers"]["Content-Type"] = "text/xml; charset=utf-8"
            validated["default_headers"]["SOAPAction"] = '""'
        
        elif protocol == "websocket":
            validated["ws_url"] = validated["base_url"].replace("http", "ws")
            validated["connection_type"] = "websocket"
        
        # Ensure we have sample data
        if not validated.get("sample_input"):
            validated["sample_input"] = {"test": "sample_value"}
        
        if not validated.get("sample_output"):
            validated["sample_output"] = {"result": "success", "data": {}}
        
        # Ensure authentication fields are properly set
        if not validated.get("auth_required"):
            validated["auth_required"] = validated.get("auth_type", "none") != "none"
        
        if not validated.get("auth_instructions") and validated.get("auth_type"):
            auth_type = validated.get("auth_type", "api_key")
            if auth_type == "api_key":
                validated["auth_instructions"] = f"1. Sign up for a {service_name} account\n2. Go to your account settings or developer section\n3. Generate an API key\n4. Copy the API key and paste it in the field above"
            elif auth_type == "bearer_token":
                validated["auth_instructions"] = f"1. Sign up for a {service_name} account\n2. Go to your account settings or developer section\n3. Generate a bearer token\n4. Copy the token and paste it in the field above"
            elif auth_type == "oauth2":
                validated["auth_instructions"] = f"1. Create an app in {service_name}'s developer portal\n2. Get your client ID and secret\n3. Complete the OAuth2 flow to get an access token\n4. Use the access token for authentication"
            elif auth_type == "basic_auth":
                validated["auth_instructions"] = f"1. Use your {service_name} username and password\n2. Or create an app-specific password if supported\n3. Enter your credentials in the fields above"
        
        return validated
    
    async def _test_basic_connectivity(self, api_spec: Dict[str, Any]) -> Dict[str, Any]:
        """Test basic connectivity to the API"""
        try:
            import aiohttp
            
            base_url = api_spec.get("base_url")
            if not base_url:
                return {"success": False, "error": "No base URL provided"}
            
            # Simple connectivity test
            async with aiohttp.ClientSession() as session:
                try:
                    async with session.head(
                        base_url,
                        timeout=aiohttp.ClientTimeout(total=10)
                    ) as response:
                        return {
                            "success": True,
                            "status_code": response.status,
                            "accessible": response.status < 500,
                            "response_time": "< 1s"
                        }
                except aiohttp.ClientError:
                    # Try with GET if HEAD fails
                    try:
                        async with session.get(
                            base_url,
                            timeout=aiohttp.ClientTimeout(total=10)
                        ) as response:
                            return {
                                "success": True,
                                "status_code": response.status,
                                "accessible": response.status < 500,
                                "method_used": "GET"
                            }
                    except:
                        return {
                            "success": False,
                            "error": "API endpoint not accessible",
                            "suggestion": "Verify the base URL is correct"
                        }
        except Exception as e:
            return {
                "success": False,
                "error": f"Connectivity test failed: {str(e)}"
            }
    
    def _return_error(self, error_message: str) -> Dict[str, Any]:
        """Return standardized error response"""
        return {
            "success": False,
            "error": error_message,
            "suggestions": [
                "Verify the service name is correct",
                "Try providing an API endpoint hint",
                "Check if the service requires special access",
                "Use manual configuration if needed"
            ]
        }

# Create global instance
shared_api_research = SharedAPIResearch()

# Integration functions for existing systems
async def research_for_tool(
    service_name: str,
    description: str,
    endpoint_hint: Optional[str] = None,
    user_keys: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """Research API for Universal Tool creation"""
    return await shared_api_research.research_api(
        service_name=service_name,
        description=description,
        purpose="data_input",
        endpoint_hint=endpoint_hint,
        user_keys=user_keys
    )

async def research_for_output(
    service_name: str,
    description: str,
    endpoint_hint: Optional[str] = None,
    user_keys: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """Research API for Smart Output creation"""
    return await shared_api_research.research_api(
        service_name=service_name,
        description=description,
        purpose="data_output",
        endpoint_hint=endpoint_hint,
        user_keys=user_keys
    )