import logging
import os
import aiohttp
from typing import Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

async def run_gemini_tool(config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Enhanced Gemini runner"""
    
    try:
        # Get LLM configuration
        llm_config = config.get("llm", {})
        model = llm_config.get("model", "gemini-pro")
        temperature = llm_config.get("temperature", 0.7)
        max_tokens = llm_config.get("max_tokens", 1000)
        
        # Get API key
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return {
                "type": "error",
                "error": "GOOGLE_API_KEY not found",
                "framework": "gemini",
                "success": False
            }
        
        # Prepare input
        input_text = inputs.get("input", inputs.get("message", "Hello"))
        system_message = config.get("systemMessage", "")
        
        if system_message:
            prompt = f"System: {system_message}\n\nUser: {input_text}"
        else:
            prompt = input_text
        
        # Make API request to Gemini
        headers = {
            "Content-Type": "application/json"
        }
        
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens
            }
        }
        
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        
        async with aiohttp.ClientSession() as session:
            async with session.post(api_url, headers=headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    return {
                        "type": "error",
                        "error": f"Gemini API error: {response.status} - {error_text}",
                        "framework": "gemini",
                        "success": False
                    }
                
                result = await response.json()
                
                # Extract output
                candidates = result.get("candidates", [])
                if candidates and len(candidates) > 0:
                    content = candidates[0].get("content", {})
                    parts = content.get("parts", [])
                    if parts and len(parts) > 0:
                        output = parts[0].get("text", "No response")
                    else:
                        output = "No response generated"
                else:
                    output = "No response generated"
                
                return {
                    "type": "gemini_result",
                    "output": output,
                    "framework": "gemini",
                    "success": True,
                    "metadata": {
                        "model": model,
                        "timestamp": datetime.now().isoformat()
                    }
                }
        
    except Exception as e:
        logger.error(f"Gemini execution failed: {str(e)}")
        return {
            "type": "error",
            "error": str(e),
            "framework": "gemini",
            "success": False
        }