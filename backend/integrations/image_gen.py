import logging
import json
import os
import aiohttp
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class DALLEIntegration:
    """DALL-E 3 Image Generation Integration"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.openai.com/v1/images/generations"
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }

    async def generate_image(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate image using DALL-E 3"""
        try:
            payload = {
                "model": "dall-e-3",
                "prompt": config.get("prompt"),
                "n": 1,
                "size": config.get("size", "1024x1024"),
                "quality": config.get("quality", "standard"),
                "style": config.get("style", "vivid")
            }

            # Remove empty values
            payload = {k: v for k, v in payload.items() if v is not None}

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
                                "image_url": result["data"][0]["url"],
                                "revised_prompt": result["data"][0].get("revised_prompt"),
                                "size": payload["size"],
                                "quality": payload["quality"],
                                "style": payload["style"]
                            },
                            "metadata": {
                                "model": "dall-e-3",
                                "provider": "openai",
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
            logger.error(f"DALL-E generation error: {str(e)}")
            return {
                "success": False,
                "error": {
                    "message": str(e),
                    "type": "integration_error"
                }
            }

class MidjourneyIntegration:
    """Midjourney Image Generation Integration"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.midjourney.com/v1/imagine"
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }

    async def generate_image(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate image using Midjourney"""
        try:
            # Build prompt with Midjourney-specific parameters
            prompt = config.get("prompt", "")
            
            # Add aspect ratio if specified
            if config.get("aspect_ratio") and config["aspect_ratio"] != "1:1":
                prompt += f" --ar {config['aspect_ratio']}"
            
            # Add stylization
            if config.get("stylize"):
                prompt += f" --s {config['stylize']}"
            
            # Add version
            if config.get("version"):
                prompt += f" --v {config['version']}"

            payload = {
                "prompt": prompt,
                "webhook_url": config.get("webhook_url"),  # Optional webhook for results
                "webhook_type": "result"
            }

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
                                "task_id": result.get("task_id"),
                                "status": "processing",
                                "prompt": prompt,
                                "estimated_time": "60-120 seconds",
                                "message": "Midjourney is creating your image. Check back in 1-2 minutes."
                            },
                            "metadata": {
                                "provider": "midjourney",
                                "aspect_ratio": config.get("aspect_ratio", "1:1"),
                                "stylize": config.get("stylize", 100),
                                "version": config.get("version", "6"),
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
            logger.error(f"Midjourney generation error: {str(e)}")
            return {
                "success": False,
                "error": {
                    "message": str(e),
                    "type": "integration_error"
                }
            }

    async def get_result(self, task_id: str) -> Dict[str, Any]:
        """Get result of Midjourney generation task"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url.replace('/imagine', '')}/tasks/{task_id}",
                    headers=self.headers
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            "success": True,
                            "data": {
                                "status": result.get("status"),
                                "image_url": result.get("image_url"),
                                "progress": result.get("progress", 0),
                                "task_id": task_id
                            }
                        }
                    else:
                        return {
                            "success": False,
                            "error": {
                                "message": "Failed to get task result",
                                "status": response.status
                            }
                        }
        except Exception as e:
            logger.error(f"Midjourney result check error: {str(e)}")
            return {
                "success": False,
                "error": {
                    "message": str(e),
                    "type": "integration_error"
                }
            }

class RunwayIntegration:
    """Runway ML Integration"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.runwayml.com/v1"
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }

    async def generate_content(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate content using Runway ML"""
        try:
            model = config.get("model", "gen2")
            endpoint = f"{self.base_url}/generate"
            
            if model == "gen2":
                payload = {
                    "model": "gen2",
                    "prompt": config.get("prompt"),
                    "duration": int(config.get("duration", 4)),
                    "ratio": "16:9",
                    "watermark": False
                }
            elif model == "inpainting":
                payload = {
                    "model": "inpainting",
                    "prompt": config.get("prompt"),
                    "image": config.get("input_image"),  # Base64 or URL
                    "mask": config.get("mask_image")     # Base64 or URL
                }
            elif model == "expand-image":
                payload = {
                    "model": "expand-image",
                    "prompt": config.get("prompt"),
                    "image": config.get("input_image"),
                    "direction": config.get("direction", "all")
                }
            else:
                return {
                    "success": False,
                    "error": {
                        "message": f"Unsupported model: {model}"
                    }
                }

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    endpoint,
                    headers=self.headers,
                    json=payload
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            "success": True,
                            "data": {
                                "task_id": result.get("id"),
                                "status": result.get("status", "processing"),
                                "model": model,
                                "estimated_time": f"{payload.get('duration', 4)} seconds" if model == "gen2" else "30-60 seconds",
                                "message": f"Runway is generating your {model} content."
                            },
                            "metadata": {
                                "provider": "runway",
                                "model": model,
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
            logger.error(f"Runway generation error: {str(e)}")
            return {
                "success": False,
                "error": {
                    "message": str(e),
                    "type": "integration_error"
                }
            }

# Factory function to create image generation integrations
def create_image_generation_integration(provider: str, api_key: str):
    """Create image generation integration based on provider"""
    integrations = {
        "openai": DALLEIntegration,
        "midjourney": MidjourneyIntegration,
        "runway": RunwayIntegration
    }
    
    integration_class = integrations.get(provider.lower())
    if not integration_class:
        raise ValueError(f"Unsupported image generation provider: {provider}")
    
    return integration_class(api_key)

# Main handler function
async def handle_image_generation(provider: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """Handle image generation request"""
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
        
        integration = create_image_generation_integration(provider, api_key)
        
        if provider.lower() == "runway":
            result = await integration.generate_content(config)
        else:
            result = await integration.generate_image(config)
        
        return result
        
    except Exception as e:
        logger.error(f"Image generation handler error: {str(e)}")
        return {
            "success": False,
            "error": {
                "message": str(e),
                "type": "handler_error"
            }
        }