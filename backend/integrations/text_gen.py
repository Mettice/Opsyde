import logging
import json
import os
import aiohttp
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)

class OpenAIIntegration:
    """OpenAI GPT Integration"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.openai.com/v1/chat/completions"
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }

    async def generate_text(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate text using OpenAI GPT models"""
        try:
            messages = []
            
            # Add system message if provided
            if config.get("system_message"):
                messages.append({
                    "role": "system",
                    "content": config["system_message"]
                })
            
            # Add user prompt
            messages.append({
                "role": "user",
                "content": config.get("prompt", "")
            })

            payload = {
                "model": config.get("model", "gpt-4-turbo-preview"),
                "messages": messages,
                "temperature": float(config.get("temperature", 0.7)),
                "max_tokens": int(config.get("max_tokens", 2000)),
                "top_p": float(config.get("top_p", 1.0)),
                "frequency_penalty": float(config.get("frequency_penalty", 0.0)),
                "presence_penalty": float(config.get("presence_penalty", 0.0))
            }

            # Add stop sequences if provided
            if config.get("stop_sequences"):
                payload["stop"] = config["stop_sequences"]

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.base_url,
                    headers=self.headers,
                    json=payload
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        choice = result["choices"][0]
                        
                        return {
                            "success": True,
                            "data": {
                                "content": choice["message"]["content"],
                                "finish_reason": choice["finish_reason"],
                                "model": result["model"],
                                "usage": {
                                    "prompt_tokens": result["usage"]["prompt_tokens"],
                                    "completion_tokens": result["usage"]["completion_tokens"],
                                    "total_tokens": result["usage"]["total_tokens"]
                                }
                            },
                            "metadata": {
                                "provider": "openai",
                                "model": payload["model"],
                                "temperature": payload["temperature"],
                                "timestamp": datetime.now().isoformat()
                            }
                        }
                    else:
                        error_data = await response.json()
                        return {
                            "success": False,
                            "error": {
                                "message": error_data.get("error", {}).get("message", "Unknown error"),
                                "code": error_data.get("error", {}).get("code"),
                                "status": response.status
                            }
                        }

        except Exception as e:
            logger.error(f"OpenAI generation error: {str(e)}")
            return {
                "success": False,
                "error": {
                    "message": str(e),
                    "type": "integration_error"
                }
            }

class AnthropicIntegration:
    """Anthropic Claude Integration"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.anthropic.com/v1/messages"
        self.headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01"
        }

    async def generate_text(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate text using Anthropic Claude"""
        try:
            messages = [
                {
                    "role": "user",
                    "content": config.get("prompt", "")
                }
            ]

            payload = {
                "model": config.get("model", "claude-3-sonnet-20240229"),
                "max_tokens": int(config.get("max_tokens", 2000)),
                "temperature": float(config.get("temperature", 0.7)),
                "messages": messages
            }

            # Add system message if provided
            if config.get("system_message"):
                payload["system"] = config["system_message"]

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.base_url,
                    headers=self.headers,
                    json=payload
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        
                        return {
                            "success": True,
                            "data": {
                                "content": result["content"][0]["text"],
                                "model": result["model"],
                                "stop_reason": result.get("stop_reason"),
                                "usage": {
                                    "input_tokens": result["usage"]["input_tokens"],
                                    "output_tokens": result["usage"]["output_tokens"],
                                    "total_tokens": result["usage"]["input_tokens"] + result["usage"]["output_tokens"]
                                }
                            },
                            "metadata": {
                                "provider": "anthropic",
                                "model": payload["model"],
                                "temperature": payload["temperature"],
                                "timestamp": datetime.now().isoformat()
                            }
                        }
                    else:
                        error_data = await response.json()
                        return {
                            "success": False,
                            "error": {
                                "message": error_data.get("error", {}).get("message", "Unknown error"),
                                "type": error_data.get("error", {}).get("type"),
                                "status": response.status
                            }
                        }

        except Exception as e:
            logger.error(f"Anthropic generation error: {str(e)}")
            return {
                "success": False,
                "error": {
                    "message": str(e),
                    "type": "integration_error"
                }
            }

class OpenRouterIntegration:
    """OpenRouter Integration for Multiple Models"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "https://your-app.com",  # Optional
            "X-Title": "Your App Name"  # Optional
        }

    async def generate_text(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate text using OpenRouter (multiple models)"""
        try:
            messages = []
            
            # Add system message if provided
            if config.get("system_message"):
                messages.append({
                    "role": "system",
                    "content": config["system_message"]
                })
            
            # Add user prompt
            messages.append({
                "role": "user",
                "content": config.get("prompt", "")
            })

            payload = {
                "model": config.get("model", "anthropic/claude-3-sonnet"),
                "messages": messages,
                "temperature": float(config.get("temperature", 0.7)),
                "max_tokens": int(config.get("max_tokens", 2000)),
                "top_p": float(config.get("top_p", 1.0)),
                "frequency_penalty": float(config.get("frequency_penalty", 0.0)),
                "presence_penalty": float(config.get("presence_penalty", 0.0))
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.base_url,
                    headers=self.headers,
                    json=payload
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        choice = result["choices"][0]
                        
                        return {
                            "success": True,
                            "data": {
                                "content": choice["message"]["content"],
                                "finish_reason": choice["finish_reason"],
                                "model": result.get("model", payload["model"]),
                                "usage": result.get("usage", {})
                            },
                            "metadata": {
                                "provider": "openrouter",
                                "model": payload["model"],
                                "temperature": payload["temperature"],
                                "timestamp": datetime.now().isoformat()
                            }
                        }
                    else:
                        error_data = await response.json()
                        return {
                            "success": False,
                            "error": {
                                "message": error_data.get("error", {}).get("message", "Unknown error"),
                                "code": error_data.get("error", {}).get("code"),
                                "status": response.status
                            }
                        }

        except Exception as e:
            logger.error(f"OpenRouter generation error: {str(e)}")
            return {
                "success": False,
                "error": {
                    "message": str(e),
                    "type": "integration_error"
                }
            }

class HuggingFaceIntegration:
    """HuggingFace Inference API Integration"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

    async def generate_text(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate text using HuggingFace models"""
        try:
            model = config.get("model", "microsoft/DialoGPT-large")
            base_url = f"https://api-inference.huggingface.co/models/{model}"

            # Format prompt based on model type
            prompt = config.get("prompt", "")
            if config.get("system_message"):
                prompt = f"{config['system_message']}\n\n{prompt}"

            payload = {
                "inputs": prompt,
                "parameters": {
                    "temperature": float(config.get("temperature", 0.7)),
                    "max_new_tokens": int(config.get("max_tokens", 2000)),
                    "top_p": float(config.get("top_p", 0.9)),
                    "do_sample": True,
                    "return_full_text": False
                },
                "options": {
                    "wait_for_model": True
                }
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    base_url,
                    headers=self.headers,
                    json=payload
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        
                        # Handle different response formats
                        if isinstance(result, list) and len(result) > 0:
                            generated_text = result[0].get("generated_text", "")
                        elif isinstance(result, dict):
                            generated_text = result.get("generated_text", "")
                        else:
                            generated_text = str(result)
                        
                        return {
                            "success": True,
                            "data": {
                                "content": generated_text,
                                "model": model,
                                "usage": {
                                    "estimated_tokens": len(generated_text.split())
                                }
                            },
                            "metadata": {
                                "provider": "huggingface",
                                "model": model,
                                "temperature": payload["parameters"]["temperature"],
                                "timestamp": datetime.now().isoformat()
                            }
                        }
                    else:
                        error_data = await response.json()
                        return {
                            "success": False,
                            "error": {
                                "message": error_data.get("error", "Unknown error"),
                                "status": response.status
                            }
                        }

        except Exception as e:
            logger.error(f"HuggingFace generation error: {str(e)}")
            return {
                "success": False,
                "error": {
                    "message": str(e),
                    "type": "integration_error"
                }
            }

# Factory function to create text generation integrations
def create_text_generation_integration(provider: str, api_key: str):
    """Create text generation integration based on provider"""
    integrations = {
        "openai": OpenAIIntegration,
        "anthropic": AnthropicIntegration,
        "openrouter": OpenRouterIntegration,
        "huggingface": HuggingFaceIntegration
    }
    
    integration_class = integrations.get(provider.lower())
    if not integration_class:
        raise ValueError(f"Unsupported text generation provider: {provider}")
    
    return integration_class(api_key)

# Main handler function
async def handle_text_generation(provider: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """Handle text generation request"""
    try:
        api_key = config.get("api_key")
        if not api_key:
            return {
                "success": False,
                "error": {
                    "message": "API key is required",
                    "type": "configuration_error"
                }
            }
        
        integration = create_text_generation_integration(provider, api_key)
        result = await integration.generate_text(config)
        
        return result
        
    except Exception as e:
        logger.error(f"Text generation handler error: {str(e)}")
        return {
            "success": False,
            "error": {
                "message": str(e),
                "type": "handler_error"
            }
        }