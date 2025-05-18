import logging
import os
import json
from typing import Dict, Any, List, Optional
import aiohttp
from datetime import datetime
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configure OpenRouter API
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

async def run_openrouter_tool(tool_data: Dict[str, Any]) -> Dict[str, Any]:
    """Run a tool using OpenRouter's API"""
    try:
        # Extract configuration
        model = tool_data.get("model", "gpt-3.5-turbo")
        temperature = float(tool_data.get("temperature", 0.7))
        max_tokens = int(tool_data.get("max_tokens", 500))
        prompt = tool_data.get("prompt", "")
        inputs = tool_data.get("inputs", {})
        temperature = float(tool_data.get("temperature", 0.7))
        max_tokens = int(tool_data.get("max_tokens", 1000))
        
        # Get API key
        key = os.getenv("OPENROUTER_API_KEY")
        if not key:
            logger.error("OpenRouter API key not found in environment variables")
            return {
                "output": "[Error] OpenRouter API key not configured",
                "type": "error",
                "error": "API key not found"
            }

        # Check for file uploads that need special handling
        file_content = None
        if "file_upload" in inputs and isinstance(inputs["file_upload"], dict) and "data" in inputs["file_upload"]:
            file_content = inputs["file_upload"].get("data", "")
            file_type = inputs["file_upload"].get("type", "")
            
            # Process the file in chunks if it's too large
            if len(file_content) > 10000:  # Arbitrary threshold
                return await process_large_file(file_content, file_type, model, temperature, max_tokens, key, prompt)
        
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
            "max_tokens": max_tokens,
            "transforms": ["middle-out"]  # Add middle-out transform for all requests
        }

        # Log request (excluding API key)
        logger.info(f"OpenRouter request: model={model}, temperature={temperature}, max_tokens={max_tokens}")
        
        # Make API call using aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=60
            ) as response:
                # Check for errors
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"OpenRouter API error: {response.status} - {error_text}")
                    return {
                        "output": f"[Error] OpenRouter API returned status code {response.status}",
                        "type": "error",
                        "error": error_text
                    }
                
                # Parse response
                data = await response.json()
                
                # Log the full response for debugging
                logger.debug(f"OpenRouter API response: {json.dumps(data)}")
                
                # Extract content with proper error handling
                try:
                    if "choices" in data and len(data["choices"]) > 0:
                        if "message" in data["choices"][0] and "content" in data["choices"][0]["message"]:
                            content = data["choices"][0]["message"]["content"]
                            
                            # Log success
                            logger.info(f"OpenRouter API call successful: {len(content)} characters returned")
                            
                            return {
                                "output": content,
                                "type": "openrouter_result",
                                "model": model
                            }
                        else:
                            logger.error(f"Unexpected message format in OpenRouter response: {data}")
                            return {
                                "output": "[Error] Unexpected message format in API response",
                                "type": "error",
                                "error": "Missing message or content in API response"
                            }
                    else:
                        logger.error(f"Unexpected response format from OpenRouter: {data}")
                        return {
                            "output": "[Error] Unexpected response format",
                            "type": "error",
                            "error": "Missing choices in API response"
                        }
                except Exception as e:
                    logger.error(f"Error parsing OpenRouter response: {str(e)}")
                    return {
                        "output": "[Error] Failed to parse API response",
                        "type": "error",
                        "error": str(e)
                    }
                    
    except Exception as e:
        logger.error(f"Error in OpenRouter tool: {str(e)}")
        return {
            "output": f"[Error] {str(e)}",
            "type": "error",
            "error": str(e)
        }

async def run_openrouter_chat(
    messages: List[Dict[str, str]],
    model: str = "gpt-4",
    temperature: float = 0.7,
    max_tokens: int = 500,
) -> str:
    """
    Run a chat completion request through OpenRouter
    
    Args:
        messages: List of message objects with role and content
        model: The model to use
        temperature: Control randomness (0-1)
        max_tokens: Maximum tokens to generate
        
    Returns:
        The generated text response
    """
    try:
        # Validate inputs
        if not messages:
            return "No messages provided."
            
        # Get API key
        api_key = OPENROUTER_API_KEY
        if not api_key:
            logger.warning("OPENROUTER_API_KEY not set in environment variables")
            return "OpenRouter API key not configured."
            
        # Prepare headers
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "X-Title": "CrewBuilder"
        }
        
        # Map model name if needed
        model_map = {
            "gpt-4": "openai/gpt-4-turbo",
            "gpt-3.5-turbo": "openai/gpt-3.5-turbo",
            "claude-3-opus": "anthropic/claude-3-opus",
            "claude-3-sonnet": "anthropic/claude-3-sonnet",
            "mistral-large": "mistralai/mistral-large",
            "mistral-medium": "mistralai/mistral-medium"
        }
        
        # Map the model name if it's in our map
        mapped_model = model_map.get(model, model)
        
        # Prepare request data
        data = {
            "model": mapped_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        # Log the request
        logger.info(f"Sending request to OpenRouter with model {mapped_model}")
        
        # Make request asynchronously
        async with aiohttp.ClientSession() as session:
            async with session.post(OPENROUTER_API_URL, headers=headers, json=data) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"OpenRouter API error: {response.status} - {error_text}")
                    return f"Error: {response.status} - {error_text}"
                    
                result = await response.json()
                
                # Extract the completion
                if "choices" in result and len(result["choices"]) > 0:
                    completion = result["choices"][0]["message"]["content"]
                    return completion
                else:
                    logger.error(f"Unexpected response structure: {result}")
                    return "Error: Unexpected response structure from OpenRouter."
    
    except Exception as e:
        logger.error(f"Error in run_openrouter_chat: {str(e)}")
        return f"Error: {str(e)}"

def run_openrouter_chat_sync(
    messages: List[Dict[str, str]],
    model: str = "gpt-4",
    temperature: float = 0.7,
    max_tokens: int = 500,
) -> str:
    """
    Synchronous version of run_openrouter_chat
    """
    # Run the async function in a new event loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(run_openrouter_chat(
            messages=messages,
            model=model,
            temperature=temperature, 
            max_tokens=max_tokens
        ))
        return result
    finally:
        loop.close()

async def process_large_file(file_content: str, file_type: str, model: str, temperature: float, max_tokens: int, api_key: str, prompt: str) -> Dict[str, Any]:
    """Process a large file in chunks"""
    try:
        # Split content into manageable chunks
        chunk_size = 8000  # Adjust based on model's context window
        chunks = [file_content[i:i + chunk_size] for i in range(0, len(file_content), chunk_size)]
        
        results = []
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Process each chunk
        async with aiohttp.ClientSession() as session:
            for i, chunk in enumerate(chunks):
                chunk_prompt = f"{prompt}\n\nChunk {i+1}/{len(chunks)}:\n{chunk}"
                
                payload = {
                    "model": model,
                    "messages": [{"role": "user", "content": chunk_prompt}],
                    "temperature": temperature,
                    "max_tokens": max_tokens
                }
                
                async with session.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=60
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Error processing chunk {i+1}: {error_text}")
                        continue
                        
                    data = await response.json()
                    if "choices" in data and len(data["choices"]) > 0:
                        content = data["choices"][0]["message"]["content"]
                        results.append(content)
        
        # Combine results
        combined_result = "\n".join(results)
        return {
            "output": combined_result,
            "type": "openrouter_result",
            "model": model,
            "metadata": {
                "chunks_processed": len(chunks),
                "total_length": len(file_content)
            }
        }
        
    except Exception as e:
        logger.error(f"Error processing large file: {str(e)}")
        return {
            "output": f"[Error] Failed to process large file: {str(e)}",
            "type": "error",
            "error": str(e)
        }
