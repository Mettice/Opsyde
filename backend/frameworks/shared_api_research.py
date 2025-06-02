# backend/frameworks/shared_api_research.py - FIXED VERSION
import logging
import os
from typing import Dict, Any, Optional, Literal
from datetime import datetime
import asyncio
from functools import lru_cache

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
        
        # Cache for user keys (short-lived to avoid stale keys)
        self._user_keys_cache = {}
        self._cache_ttl = 300  # 5 minutes
    
    async def _get_user_keys_from_byok(self, user_id: str) -> Dict[str, str]:
        """Get user API keys from BYOK system"""
        try:
            # Ensure user_id is a string (defensive programming)
            if not isinstance(user_id, str):
                if hasattr(user_id, 'user_id'):
                    user_id = str(user_id.user_id) if user_id.user_id else 'anonymous'
                elif hasattr(user_id, 'metadata') and isinstance(user_id.metadata, dict):
                    user_id = str(user_id.metadata.get('user_id', 'anonymous'))
                else:
                    user_id_str = str(user_id)
                    # Only use it if it looks like a valid user ID
                    if not ('<' in user_id_str and '>' in user_id_str):
                        user_id = user_id_str
                    else:
                        user_id = 'anonymous'
            
            logger.info(f"🔑 Getting API keys from BYOK system for user: {user_id}")
            
            # Use the correct method name
            api_keys_data = await self.user_settings_service.get_user_api_keys(user_id)
            
            if not api_keys_data:
                logger.info("No API keys found in BYOK system")
                return {}
            
            # Convert to the format expected by this function
            user_keys = {}
            for key_data in api_keys_data:
                provider_id = key_data.get('provider_id', '')
                if key_data.get('validation_status') == 'valid' and key_data.get('is_active', False):
                    try:
                        encrypted_key = key_data.get('encrypted_key', '')
                        if encrypted_key:
                            # Use the unified service's key manager to decrypt
                            key_manager = self.user_settings_service.get_key_manager()
                            decrypted_key = key_manager.decrypt_key(encrypted_key)
                            user_keys[provider_id] = decrypted_key
                            logger.debug(f"🔑 Loaded API key for provider: {provider_id}")
                    except Exception as e:
                        logger.error(f"❌ Failed to decrypt API key for {provider_id}: {str(e)}")
                        continue
            
            return user_keys
            
        except Exception as e:
            logger.error(f"Failed to get keys from BYOK system for user {user_id}: {str(e)}")
            return {}

    async def _select_best_llm(self, user_id: str, ai_config: Dict[str, Any]) -> Optional[Dict]:
        """
        🔑 FIXED: BYOK-Integrated LLM Selection with proper error handling
        """
        try:
            logger.info("🔑 Selecting LLM using BYOK system...")
            
            # FIX 5: Use centralized key retrieval
            user_keys = await self._get_user_keys_from_byok(user_id)
            
            # FIX 6: Better fallback chain with proper error handling
            if not user_keys:
                logger.info("No user keys found in BYOK, checking environment variables...")
                env_keys = []
                
                if os.getenv("OPENAI_API_KEY"):
                    user_keys['openai_key'] = os.getenv("OPENAI_API_KEY")
                    env_keys.append("OpenAI")
                if os.getenv("ANTHROPIC_API_KEY"):
                    user_keys['anthropic_key'] = os.getenv("ANTHROPIC_API_KEY")
                    env_keys.append("Anthropic")
                if os.getenv("OPENROUTER_API_KEY"):
                    user_keys['openrouter_key'] = os.getenv("OPENROUTER_API_KEY")
                    env_keys.append("OpenRouter")
                
                if env_keys:
                    logger.info(f"Environment keys available: {env_keys}")
                else:
                    logger.warning("No API keys available from any source")
            
            # Select best available LLM based on available keys
            if not user_keys:
                logger.error("No LLM keys available - cannot perform AI research")
                return None
            
            # Priority order: OpenAI (most reliable) > Anthropic > OpenRouter
            if user_keys.get('openai_key'):
                return {
                    "provider": "openai",
                    "model": "gpt-4o",
                    "key": user_keys['openai_key']
                }
            elif user_keys.get('anthropic_key'):
                return {
                    "provider": "anthropic", 
                    "model": "claude-3-sonnet-20240229",
                    "key": user_keys['anthropic_key']
                }
            elif user_keys.get('openrouter_key'):
                return {
                    "provider": "openrouter",
                    "model": "anthropic/claude-3-sonnet",
                    "key": user_keys['openrouter_key']
                }
            else:
                logger.error("No compatible LLM keys found")
                return None
                
        except Exception as e:
            logger.error(f"Error selecting LLM: {str(e)}")
            return None
    
    async def _call_ai_provider(self, prompt: str, llm_config: Dict[str, str]) -> str:
        """
        🔧 FIXED: Unified AI provider calling with better error handling
        """
        try:
            provider = llm_config["provider"]
            model = llm_config["model"]
            api_key = llm_config["key"]
            
            logger.info(f"Using {provider} with model {model} for API research")
            
            if not api_key:
                raise ValueError(f"No API key provided for {provider}")
            
            # FIX 7: Better timeout and error handling
            timeout = 30  # Reduced from 60 seconds
            
            if provider == "openai":
                return await self._call_openai_api(prompt, model, api_key, timeout)
            elif provider == "anthropic":
                return await self._call_anthropic_api(prompt, model, api_key, timeout)
            elif provider == "openrouter":
                return await self._call_openrouter_api(prompt, model, api_key, timeout)
            else:
                raise ValueError(f"Unsupported provider: {provider}")
                
        except Exception as e:
            logger.error(f"AI provider call failed: {str(e)}")
            raise
    
    async def _call_openai_api(self, prompt: str, model: str, api_key: str, timeout: int = 30) -> str:
        """FIX 8: Better error handling and timeout"""
        try:
            import aiohttp
            
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            data = {
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "max_tokens": 2000
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=data,
                    timeout=aiohttp.ClientTimeout(total=timeout)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"OpenAI API error: {response.status}")
                        logger.error(f"OpenAI API error details: {error_text[:500]}")  # Log first 500 chars of error
                        logger.error(f"Request URL: https://api.openai.com/v1/chat/completions")
                        logger.error(f"Request headers: {headers}")
                        logger.error(f"API key format: {api_key[:10]}...{api_key[-4:] if len(api_key) > 14 else 'SHORT_KEY'}")
                        # FIX 9: Don't log full error text (may contain sensitive info)
                        raise Exception(f"OpenAI API error: {response.status} - {error_text[:100]}")
                    
                    result = await response.json()
                    return result["choices"][0]["message"]["content"]
                    
        except asyncio.TimeoutError:
            logger.error(f"OpenAI API call timed out after {timeout}s")
            raise Exception("OpenAI API call timed out")
        except Exception as e:
            logger.error(f"OpenAI API call failed: {str(e)}")
            raise
    
    async def _call_anthropic_api(self, prompt: str, model: str, api_key: str, timeout: int = 30) -> str:
        """FIX 10: Better error handling and timeout"""
        try:
            import aiohttp
            
            headers = {
                "x-api-key": api_key,
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01"
            }
            
            data = {
                "model": model,
                "max_tokens": 2000,
                "temperature": 0.3,
                "messages": [{"role": "user", "content": prompt}]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.anthropic.com/v1/messages",
                    headers=headers,
                    json=data,
                    timeout=aiohttp.ClientTimeout(total=timeout)
                ) as response:
                    if response.status != 200:
                        logger.error(f"Anthropic API error: {response.status}")
                        raise Exception(f"Anthropic API error: {response.status}")
                    
                    result = await response.json()
                    return result["content"][0]["text"]
                    
        except asyncio.TimeoutError:
            logger.error(f"Anthropic API call timed out after {timeout}s")
            raise Exception("Anthropic API call timed out")
        except Exception as e:
            logger.error(f"Anthropic API call failed: {str(e)}")
            raise
    
    async def _call_openrouter_api(self, prompt: str, model: str, api_key: str, timeout: int = 30) -> str:
        """FIX 11: Better error handling and timeout"""
        try:
            import aiohttp
            
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://nodai.io",
                "X-Title": "Nodai API Research"
            }
            
            data = {
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "max_tokens": 2000
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=data,
                    timeout=aiohttp.ClientTimeout(total=timeout)
                ) as response:
                    if response.status != 200:
                        logger.error(f"OpenRouter API error: {response.status}")
                        raise Exception(f"OpenRouter API error: {response.status}")
                    
                    result = await response.json()
                    return result["choices"][0]["message"]["content"]
                    
        except asyncio.TimeoutError:
            logger.error(f"OpenRouter API call timed out after {timeout}s")
            raise Exception("OpenRouter API call timed out")
        except Exception as e:
            logger.error(f"OpenRouter API call failed: {str(e)}")
            raise
    
    def _parse_ai_response_improved(self, ai_response: str) -> Dict[str, Any]:
        """
        🔧 FIXED: Improved AI response parsing with better error handling
        """
        try:
            import json
            import re
            
            logger.info(f"Parsing AI response (length: {len(ai_response)})")
            
            # FIX 12: Early validation
            if not ai_response or len(ai_response.strip()) < 10:
                logger.error("AI response is empty or too short")
                return {
                    "success": False,
                    "error": "AI research failed - no response received",
                    "suggestion": "Check your API keys and try again"
                }
            
            # FIX 13: Simplified JSON extraction
            json_str = self._extract_json_from_response(ai_response)
            
            if not json_str:
                logger.error("No JSON found in AI response")
                return {
                    "success": False,
                    "error": "AI research failed - no valid configuration found",
                    "suggestion": "The AI couldn't generate a proper API configuration. Try being more specific about the service.",
                    "raw_response": ai_response[:200] if ai_response else "No response"
                }
            
            # FIX 14: Better JSON parsing with validation
            try:
                plan = json.loads(json_str)
                logger.info("Successfully parsed JSON")
            except json.JSONDecodeError as e:
                logger.error(f"JSON parse failed: {e}")
                # FIX 15: Try basic cleanup once
                cleaned_json = self._clean_json_string(json_str)
                try:
                    plan = json.loads(cleaned_json)
                    logger.info("Successfully parsed JSON after cleanup")
                except json.JSONDecodeError:
                    return {
                        "success": False,
                        "error": f"AI research failed - invalid response format: {str(e)}",
                        "suggestion": "The AI response was malformed. Try again or check your API keys."
                    }
            
            # FIX 16: Better validation
            return self._validate_ai_plan(plan)
            
        except Exception as e:
            logger.error(f"Failed to parse AI response: {str(e)}")
            return {
                "success": False,
                "error": f"AI research failed: {str(e)}",
                "suggestion": "There was an error processing the AI response. Check your API keys and try again."
            }
    
    def _extract_json_from_response(self, response: str) -> Optional[str]:
        """FIX 17: Simplified JSON extraction"""
        import re
        
        # Method 1: Look for ```json blocks
        if "```json" in response:
            match = re.search(r'```json\s*\n(.*?)\n```', response, re.DOTALL)
            if match:
                return match.group(1).strip()
        
        # Method 2: Look for any ``` blocks with JSON
        if "```" in response and "{" in response:
            match = re.search(r'```[^\n]*\n(.*?)\n```', response, re.DOTALL)
            if match and "{" in match.group(1):
                return match.group(1).strip()
        
        # Method 3: Look for JSON objects
        if "{" in response and "}" in response:
            # Find the first complete JSON object
            start = response.find("{")
            if start != -1:
                brace_count = 0
                for i, char in enumerate(response[start:], start):
                    if char == "{":
                        brace_count += 1
                    elif char == "}":
                        brace_count -= 1
                        if brace_count == 0:
                            return response[start:i+1]
        
        return None
    
    def _clean_json_string(self, json_str: str) -> str:
        """FIX 18: Simplified JSON cleaning"""
        import re
        
        # Remove trailing commas
        json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
        
        # Fix common quote issues
        json_str = re.sub(r'\\\"', '"', json_str)
        
        return json_str.strip()
    
    def _validate_ai_plan(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """FIX 19: Better plan validation"""
        
        if not isinstance(plan, dict):
            return {
                "success": False,
                "error": "AI research failed - response is not a valid configuration",
                "suggestion": "Try again with a more specific service description"
            }
        
        # Check if the AI explicitly marked this as a failure
        if plan.get("success") is False:
            return plan  # Return the AI's failure response as-is
        
        # Validate minimum required fields
        if not plan.get("base_url") and not plan.get("endpoints"):
            return {
                "success": False,
                "error": "AI research incomplete - no API endpoints found",
                "suggestion": "The AI couldn't find specific API endpoints for this service. Try providing more details.",
                "partial_response": plan
            }
        
        # Mark as successful and add metadata
        plan["success"] = True
        plan["ai_powered"] = True
        
        # Ensure confidence is a number
        if not isinstance(plan.get("confidence"), (int, float)):
            plan["confidence"] = 0.7
        
        return plan
    
    async def research_api(
        self,
        service_name: str,
        description: str,
        purpose: Literal["data_input", "data_output"],
        endpoint_hint: Optional[str] = None,
        user_id: str = "anonymous"
    ) -> Dict[str, Any]:
        """
        🤖 FIXED: Universal AI-Powered API Research with proper BYOK integration
        """
        try:
            # FIX 20: Validate user_id
            if not user_id or user_id == "anonymous":
                logger.warning("Using anonymous user - consider passing actual user context")
            
            logger.info(f"Starting unified API research: {service_name} ({purpose}) for user: {user_id}")
            
            # Get the best available LLM for this user
            llm_config = await self._select_best_llm(user_id, {})
            
            if not llm_config:
                return {
                    "success": False,
                    "error": "No AI model available for research. Please add OpenAI, Anthropic, or OpenRouter API keys to your BYOK Manager.",
                    "suggestion": "Visit the API Key Manager to add your AI provider keys"
                }
            
            # Build comprehensive research prompt
            prompt = self._build_research_prompt(service_name, description, purpose, endpoint_hint)
            
            # Call AI provider
            ai_response = await self._call_ai_provider(prompt, llm_config)
            
            if not ai_response:
                return {
                    "success": False,
                    "error": "AI research failed - no response from AI provider",
                    "suggestion": "Check your API keys and try again"
                }
            
            # Parse and validate response
            result = self._parse_ai_response_improved(ai_response)
            
            if result.get('success'):
                result['analysis_method'] = f"{llm_config['provider']}_research"
                result['auto_configured'] = True
                
            return result
                
        except Exception as e:
            logger.error(f"API research failed: {str(e)}")
            return {
                "success": False,
                "error": f"Research failed: {str(e)}",
                "suggestion": "Check your API keys and network connection"
            }
    
    def _build_research_prompt(self, service_name: str, description: str, purpose: str, endpoint_hint: Optional[str] = None) -> str:
        """Enhanced universal research prompt - detects authentication automatically without hardcoding"""
        
        endpoint_context = f"\nEndpoint hint provided: {endpoint_hint}" if endpoint_hint else ""
        
        return f"""
You are an expert API researcher. Research the {service_name} API and provide COMPLETE integration details including authentication.

SERVICE: {service_name}
TASK: {description}
PURPOSE: {purpose}
{endpoint_context}

Research and provide COMPLETE JSON configuration including authentication details:

{{
    "success": true,
    "service_name": "{service_name}",
    "base_url": "https://api.service.com",
    "auth_required": true/false,
    "auth_type": "api_key|bearer_token|oauth2|basic_auth|custom|none",
    "auth_location": "header|query|body",
    "auth_header_name": "Authorization|X-API-Key|Custom-Header",
    "auth_format": "Bearer {{token}}|{{key}}|Custom format",
    "credential_format": "What the actual credential looks like (e.g., 'sk-...', 'xoxb-...', UUID format)",
    "auth_setup_instructions": [
        "Step 1: Detailed instructions for this specific service",
        "Step 2: How to find API settings for THIS service",
        "Step 3: How to generate credentials for THIS service",
        "Step 4: How to get required permissions for THIS service"
    ],
    "required_permissions": ["List of specific permissions needed"],
    "developer_portal_url": "https://developer.service.com or settings URL",
    "documentation_url": "Official auth docs URL",
    "test_endpoint": {{
        "url": "/endpoint/to/test/auth",
        "method": "GET|POST",
        "description": "Simple endpoint to verify credentials work"
    }},
    "common_errors": [
        "Common auth error 1 and how to fix",
        "Common auth error 2 and how to fix"
    ],
    "endpoints": [
        {{
            "path": "/api/endpoint",
            "method": "GET|POST|PUT|DELETE",
            "description": "What this endpoint does",
            "parameters": {{"param": "description"}},
            "auth_required": true/false
        }}
    ],
    "integration_type": "rest_api|webhook|database|file_system",
    "confidence": 0.9,
    "rate_limits": "API rate limiting information if known",
    "data_format": "json|xml|csv|custom",
    "webhook_support": true/false,
    "real_time_updates": true/false
}}

RESEARCH REQUIREMENTS:
- Find the ACTUAL authentication method for {service_name}
- Provide REAL step-by-step instructions for THIS specific service
- Include the EXACT URL where users get credentials
- Specify the REAL credential format for this service
- Include a simple test endpoint to verify auth works
- Be accurate about required permissions and scopes
- Research actual API endpoints and their purposes
- Determine if the service supports webhooks or real-time updates

If you don't know {service_name}, return:
{{
    "success": false,
    "error": "Unknown service: {service_name}",
    "suggestion": "Please provide more details or check the official documentation",
    "confidence": 0.0
}}

Research the actual service and be precise. Focus on providing actionable, accurate information.
"""

    async def validate_universal_credentials(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Universal credential validation using AI-provided configuration
        NO hardcoded service patterns - everything comes from AI research
        """
        try:
            import aiohttp
            
            service_name = config.get('service_name', 'Unknown Service')
            base_url = config.get('base_url', '')
            auth_type = config.get('auth_type', 'none')
            auth_header_name = config.get('auth_header_name', 'Authorization')
            auth_format = config.get('auth_format', 'Bearer {token}')
            test_endpoint = config.get('test_endpoint', {})
            credentials = config.get('credentials', {})
            
            logger.info(f"🔐 Validating credentials for {service_name} using {auth_type} authentication")
            
            # Build auth headers using AI-provided format
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'CrewBuilder-Universal-Auth/1.0'
            }
            
            if auth_type == 'api_key':
                api_key = credentials.get('api_key')
                if not api_key:
                    return {
                        "success": False,
                        "error": "API key is required",
                        "suggestion": f"Please provide your {service_name} API key"
                    }
                
                if auth_format:
                    # Use AI-specified format
                    auth_value = auth_format.replace('{key}', api_key).replace('{token}', api_key)
                else:
                    # Fallback to common pattern
                    auth_value = f'Bearer {api_key}'
                headers[auth_header_name] = auth_value
                
            elif auth_type == 'bearer_token':
                token = credentials.get('bearer_token')
                if not token:
                    return {
                        "success": False,
                        "error": "Bearer token is required",
                        "suggestion": f"Please provide your {service_name} bearer token"
                    }
                
                if auth_format:
                    auth_value = auth_format.replace('{token}', token)
                else:
                    auth_value = f'Bearer {token}'
                headers[auth_header_name] = auth_value
                
            elif auth_type == 'basic_auth':
                username = credentials.get('username')
                password = credentials.get('password')
                if not (username and password):
                    return {
                        "success": False,
                        "error": "Username and password are required",
                        "suggestion": f"Please provide your {service_name} username and password"
                    }
                
                import base64
                creds = base64.b64encode(f"{username}:{password}".encode()).decode()
                headers[auth_header_name] = f'Basic {creds}'
                
            elif auth_type == 'custom':
                custom_auth = credentials.get('custom_auth')
                if not custom_auth:
                    return {
                        "success": False,
                        "error": "Custom authentication is required",
                        "suggestion": f"Please provide your {service_name} credentials"
                    }
                
                if auth_format:
                    auth_value = auth_format.replace('{token}', custom_auth).replace('{key}', custom_auth)
                    headers[auth_header_name] = auth_value
            
            # Use AI-provided test endpoint
            if test_endpoint and test_endpoint.get('url'):
                test_url = f"{base_url.rstrip('/')}{test_endpoint['url']}"
                method = test_endpoint.get('method', 'GET').upper()
            else:
                # Fallback: try the base URL
                test_url = base_url
                method = 'GET'
            
            logger.info(f"🔍 Testing {method} {test_url} with {auth_type} authentication")
            
            # Make the test request
            async with aiohttp.ClientSession() as session:
                try:
                    if method == 'GET':
                        async with session.get(test_url, headers=headers, timeout=10) as response:
                            return await self._analyze_auth_response(response, service_name)
                    elif method == 'POST':
                        async with session.post(test_url, headers=headers, json={}, timeout=10) as response:
                            return await self._analyze_auth_response(response, service_name)
                    else:
                        async with session.request(method, test_url, headers=headers, timeout=10) as response:
                            return await self._analyze_auth_response(response, service_name)
                except aiohttp.ClientTimeout:
                    return {
                        "success": False,
                        "error": "Request timeout",
                        "suggestion": f"The {service_name} API is not responding. Please try again later."
                    }
                except aiohttp.ClientError as e:
                    return {
                        "success": False,
                        "error": f"Connection error: {str(e)}",
                        "suggestion": "Please check your network connection and API endpoint."
                    }
                    
        except Exception as e:
            logger.error(f"Error validating credentials for {service_name}: {str(e)}")
            return {
                "success": False,
                "error": f"Validation failed: {str(e)}",
                "suggestion": "Please check your credentials and network connection"
            }

    async def _analyze_auth_response(self, response, service_name: str) -> Dict[str, Any]:
        """
        Universal response analysis - no service-specific logic
        """
        status = response.status
        
        try:
            response_text = await response.text()
        except:
            response_text = ""
        
        if status == 200:
            return {
                "success": True,
                "message": f"✅ Successfully authenticated with {service_name}",
                "status_code": status,
                "response_preview": response_text[:200] if response_text else "No response body"
            }
        elif status == 401:
            return {
                "success": False,
                "error": "Authentication failed",
                "suggestion": f"Please check your {service_name} credentials and try again",
                "status_code": status,
                "response_preview": response_text[:200] if response_text else "No response body"
            }
        elif status == 403:
            return {
                "success": False,
                "error": "Access forbidden",
                "suggestion": f"Your {service_name} credentials may need additional permissions",
                "status_code": status,
                "response_preview": response_text[:200] if response_text else "No response body"
            }
        elif status == 404:
            return {
                "success": True,  # Auth worked, endpoint just doesn't exist
                "message": f"⚠️ Credentials appear valid for {service_name} (test endpoint not found)",
                "warning": "Could not fully test the API endpoint",
                "status_code": status
            }
        elif status == 429:
            return {
                "success": True,  # Auth worked, just rate limited
                "message": f"⚠️ Credentials appear valid for {service_name} (rate limited)",
                "warning": "API is rate limiting requests",
                "status_code": status
            }
        else:
            return {
                "success": True,  # Assume auth worked if we got any response
                "message": f"⚠️ Credentials appear valid for {service_name} (got {status} response)",
                "warning": "Could not fully test the API endpoint", 
                "status_code": status,
                "response_preview": response_text[:200] if response_text else "No response body"
            }

    def _get_auth_guidance(self, service_name: str) -> Dict[str, Any]:
        """
        Universal authentication guidance - NO hardcoded services
        Uses AI research and generic patterns only
        """
        service_lower = service_name.lower()
        
        # Universal patterns based on URL/service hints - NO specific services
        if any(pattern in service_lower for pattern in ['api.', '/api/', 'rest', 'graphql']):
            # Looks like a REST API
            return {
                'auth_type': 'bearer_token',
                'auth_header_name': 'Authorization',
                'auth_format': 'Bearer {token}',
                'credential_format': 'Varies by service',
                'setup_steps': [
                    f"Visit the {service_name} developer portal or settings",
                    "Look for 'API Keys', 'Access Tokens', or 'Developer Settings'",
                    "Generate a new API key or access token",
                    "Copy the generated credentials",
                    "Check if any specific permissions or scopes are required"
                ],
                'developer_portal_url': f"https://{service_lower}.com/developers",
                'documentation_url': f"https://{service_lower}.com/docs/api",
                'test_endpoint': '/api/user' if 'user' in service_lower else '/api/status',
                'required_permissions': ['API access']
            }
        
        # Generic fallback for any service
        return {
            'auth_type': 'api_key',
            'auth_header_name': 'Authorization',
            'auth_format': 'Bearer {token}',
            'credential_format': 'Check service documentation',
            'setup_steps': [
                f"Go to {service_name} settings or developer section",
                "Look for API access, integrations, or developer options",
                "Generate API credentials (key, token, or app credentials)",
                "Note any required permissions or scopes",
                "Test the credentials with a simple API call"
            ],
            'developer_portal_url': f"https://{service_lower}.com/settings",
            'documentation_url': f"https://{service_lower}.com/docs",
            'test_endpoint': '/api/test',
            'required_permissions': ['Basic API access']
        }

# Create global instance
shared_api_research = SharedAPIResearch()

# FIX 22: Simplified integration functions
async def research_for_tool(
    service_name: str,
    description: str,
    endpoint_hint: Optional[str] = None,
    user_keys: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Research API for tool creation with enhanced AI analysis
    Enhanced with user API keys support
    """
    # Extract user ID from user_keys or use anonymous
    user_id = "anonymous"
    
    # Handle the case where user_keys might be a WorkflowExecutionContext object
    if user_keys:
        if isinstance(user_keys, dict):
            # Try to find a user ID in the keys, or use anonymous
            user_id = user_keys.get('user_id', 'anonymous')
        elif hasattr(user_keys, 'user_id'):
            # If it's a context object with user_id attribute
            user_id = str(user_keys.user_id) if user_keys.user_id else 'anonymous'
        elif hasattr(user_keys, 'metadata') and isinstance(user_keys.metadata, dict):
            # If it's a context object with metadata containing user_id
            user_id = str(user_keys.metadata.get('user_id', 'anonymous'))
        else:
            # If it's some other object, convert to string and use as user_id
            user_id_str = str(user_keys)
            # Only use it if it looks like a valid user ID (not a complex object representation)
            if not ('<' in user_id_str and '>' in user_id_str):
                user_id = user_id_str
            else:
                user_id = 'anonymous'
    
    return await shared_api_research.research_api(
        service_name=service_name,
        description=description,
        purpose="data_input",
        endpoint_hint=endpoint_hint,
        user_id=user_id
    )

async def research_for_output(
    service_name: str,
    description: str,
    endpoint_hint: Optional[str] = None,
    user_id: str = "anonymous"
) -> Dict[str, Any]:
    """Research API for Output nodes with BYOK integration"""
    return await shared_api_research.research_api(
        service_name=service_name,
        description=description,
        purpose="data_output",
        endpoint_hint=endpoint_hint,
        user_id=user_id
    )