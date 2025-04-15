import os
import requests
import logging
import json
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_openrouter_tool(tool_data: Dict[str, Any]) -> str:
    """
    Execute a tool using the OpenRouter API.
    
    Args:
        tool_data: Dictionary containing tool configuration and inputs
        
    Returns:
        Result from the OpenRouter API
    """
    try:
        # Extract tool configuration
        model = tool_data.get("model", "mistralai/mistral-7b-instruct")
        prompt = tool_data.get("prompt", "")
        inputs = tool_data.get("inputs", {})
        temperature = float(tool_data.get("temperature", 0.7))
        max_tokens = int(tool_data.get("max_tokens", 1000))
        
        # If no prompt is provided, use the label and description
        if not prompt:
            label = tool_data.get("label", "Tool")
            description = tool_data.get("description", "")
            prompt = f"Execute the tool '{label}': {description}"
        
        # Add inputs to the prompt
        if inputs:
            prompt += "\n\nInputs:\n"
            for key, value in inputs.items():
                prompt += f"- {key}: {value}\n"
        
        # Get API key from environment
        key = os.getenv("OPENROUTER_API_KEY")
        if not key:
            logger.error("OpenRouter API key not found in environment variables")
            return "[Error] OpenRouter API key not configured"

        # Prepare request
        headers = {
            "Authorization": f"Bearer {key}",
            "HTTP-Referer": "https://opsyde.io",
            "X-Title": "Opsyde Agent Execution"
        }
        
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        # Log request (excluding API key)
        logger.info(f"OpenRouter request: model={model}, temperature={temperature}, max_tokens={max_tokens}")
        
        # Make API call
        res = requests.post("https://openrouter.ai/api/v1/chat/completions", 
                           headers=headers, 
                           json=payload,
                           timeout=60)
        
        # Check for errors
        if res.status_code != 200:
            logger.error(f"OpenRouter API error: {res.status_code} - {res.text}")
            return f"[Error] OpenRouter API returned status code {res.status_code}: {res.text}"
        
        # Parse response
        data = res.json()
        
        # Extract and return the content
        content = data["choices"][0]["message"]["content"]
        
        # Log success
        logger.info(f"OpenRouter API call successful: {len(content)} characters returned")
        
        return content
        
    except Exception as e:
        logger.error(f"Error in OpenRouter tool execution: {str(e)}")
        return f"[Error] OpenRouter tool failed: {str(e)}"
