#!/usr/bin/env python3
"""
Perplexity API Runner
Handles direct API calls to Perplexity's chat completions endpoint
"""

import logging
import aiohttp
import json
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

async def run_perplexity_chat(
    messages: List[Dict[str, str]],
    model: str = "sonar-pro",
    temperature: float = 0.7,
    max_tokens: int = 1000,
    api_key: Optional[str] = None
) -> str:
    """
    Run Perplexity chat completion
    
    Args:
        messages: List of message dictionaries with 'role' and 'content'
        model: Perplexity model name (e.g., 'sonar-pro', 'sonar')
        temperature: Sampling temperature
        max_tokens: Maximum tokens to generate
        api_key: Perplexity API key
        
    Returns:
        Response text from Perplexity
    """
    
    # Get API key from environment if not provided
    if not api_key:
        import os
        api_key = os.getenv('PERPLEXITY_API_KEY')
    
    # Handle BYOK format
    if api_key and api_key.startswith('[BYOK:'):
        logger.warning(f"BYOK key not properly injected: {api_key}")
        # Try to get from environment as fallback
        import os
        api_key = os.getenv('PERPLEXITY_API_KEY')
        
    if not api_key:
        raise ValueError("Perplexity API key is required. Please add your Perplexity API key in the BYOK manager.")
    
    # Prepare the request
    url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False
    }
    
    logger.info(f"🔍 Sending request to Perplexity with model {model}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                if response.status == 200:
                    result = await response.json()
                    content = result['choices'][0]['message']['content']
                    logger.info(f"✅ Perplexity request successful")
                    return content
                else:
                    error_text = await response.text()
                    error_msg = f"Perplexity API error: {response.status} - {error_text}"
                    logger.error(error_msg)
                    raise Exception(error_msg)
                    
    except Exception as e:
        logger.error(f"Error in run_perplexity_chat: {str(e)}")
        raise

async def run_perplexity_tool(config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main entry point for Perplexity tool execution
    
    Args:
        config: Configuration dictionary containing model, temperature, etc.
        inputs: Input data for the request
        
    Returns:
        Dictionary with success status and response
    """
    
    try:
        # Extract configuration
        framework_config = config.get('frameworkConfig', {})
        model = framework_config.get('model', 'sonar-pro')
        temperature = framework_config.get('temperature', 0.7)
        max_tokens = framework_config.get('max_tokens', 1000)
        api_key = framework_config.get('api_key')
        
        # Build messages from inputs
        messages = []
        
        # Handle different input formats
        if isinstance(inputs, dict):
            if 'messages' in inputs:
                messages = inputs['messages']
            elif 'prompt' in inputs:
                messages = [{"role": "user", "content": inputs['prompt']}]
            elif 'query' in inputs:
                messages = [{"role": "user", "content": inputs['query']}]
            else:
                # Convert all inputs to a single message
                content = "\n".join([f"{k}: {v}" for k, v in inputs.items()])
                messages = [{"role": "user", "content": content}]
        elif isinstance(inputs, str):
            messages = [{"role": "user", "content": inputs}]
        else:
            messages = [{"role": "user", "content": str(inputs)}]
        
        # Make the API call
        response = await run_perplexity_chat(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            api_key=api_key
        )
        
        return {
            "success": True,
            "type": "perplexity_result",
            "output": response,
            "model_used": model,
            "framework": "perplexity"
        }
        
    except Exception as e:
        logger.error(f"Perplexity tool execution failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "framework": "perplexity"
        } 