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

# Configure Anthropic API
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"

async def run_anthropic_tool(tool_data: Dict[str, Any]) -> Dict[str, Any]:
    """Run a tool using Anthropic's API"""
    try:
        # Extract configuration
        model = tool_data.get("model", "claude-3-sonnet-20240229")
        temperature = float(tool_data.get("temperature", 0.7))
        max_tokens = int(tool_data.get("max_tokens", 500))
        prompt = tool_data.get("prompt", "")
        inputs = tool_data.get("inputs", {})
        
        # Get API key
        key = os.getenv("ANTHROPIC_API_KEY")
        if not key:
            logger.error("Anthropic API key not found in environment variables")
            return {
                "output": "[Error] Anthropic API key not configured",
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

        # Format the prompt with inputs
        formatted_prompt = prompt
        for key, value in inputs.items():
            if key != "file_upload":
                if isinstance(value, dict) and "value" in value:
                    formatted_prompt = formatted_prompt.replace(f"{{{key}}}", str(value["value"]))
                else:
                    formatted_prompt = formatted_prompt.replace(f"{{{key}}}", str(value))

        # Add file content if present
        if file_content:
            formatted_prompt += f"\n\nFile Content ({file_type}):\n{file_content}"

        # Prepare headers
        headers = {
            "x-api-key": key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }

        # Prepare request data
        data = {
            "model": model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [{"role": "user", "content": formatted_prompt}]
        }

        # Make the API call
        async with aiohttp.ClientSession() as session:
            async with session.post(ANTHROPIC_API_URL, headers=headers, json=data) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Anthropic API error: {response.status} - {error_text}")
                    return {
                        "output": f"[Error] Anthropic API error: {response.status}",
                        "type": "error",
                        "error": error_text
                    }
                    
                result = await response.json()

        # Extract the response
        if "content" in result and len(result["content"]) > 0:
            response_text = result["content"][0]["text"]
        else:
            logger.error(f"Unexpected response structure: {result}")
            return {
                "output": "[Error] Unexpected response structure from Anthropic",
                "type": "error",
                "error": "Invalid response format"
            }

        return {
            "output": response_text,
            "type": "success",
            "metadata": {
                "model": model,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "timestamp": datetime.now().isoformat(),
                "usage": result.get("usage", {})
            }
        }

    except Exception as e:
        logger.error(f"Error in run_anthropic_tool: {str(e)}")
        return {
            "output": f"[Error] {str(e)}",
            "type": "error",
            "error": str(e)
        }

async def process_large_file(file_content: str, file_type: str, model: str, temperature: float, max_tokens: int, api_key: str, prompt: str) -> Dict[str, Any]:
    """Process large files in chunks"""
    try:
        # Split content into chunks
        chunk_size = 8000  # Conservative chunk size
        chunks = [file_content[i:i+chunk_size] for i in range(0, len(file_content), chunk_size)]
        
        results = []
        for i, chunk in enumerate(chunks):
            chunk_prompt = f"{prompt}\n\nProcessing chunk {i+1}/{len(chunks)} of {file_type} file:\n{chunk}"
            
            headers = {
                "x-api-key": api_key,
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01"
            }

            data = {
                "model": model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": [{"role": "user", "content": chunk_prompt}]
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(ANTHROPIC_API_URL, headers=headers, json=data) as response:
                    if response.status == 200:
                        result = await response.json()
                        if "content" in result and len(result["content"]) > 0:
                            results.append(result["content"][0]["text"])
        
        # Combine results
        combined_result = "\n\n".join(results)
        
        return {
            "output": combined_result,
            "type": "success",
            "metadata": {
                "model": model,
                "chunks_processed": len(chunks),
                "file_type": file_type,
                "timestamp": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Error processing large file: {str(e)}")
        return {
            "output": f"[Error] Failed to process large file: {str(e)}",
            "type": "error",
            "error": str(e)
        }

async def run_anthropic_chat(
    messages: List[Dict[str, str]],
    model: str = "claude-3-sonnet-20240229",
    temperature: float = 0.7,
    max_tokens: int = 500,
) -> str:
    """
    Run a chat completion request through Anthropic
    
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
        api_key = ANTHROPIC_API_KEY
        if not api_key:
            logger.warning("ANTHROPIC_API_KEY not set in environment variables")
            return "Anthropic API key not configured."
            
        # Prepare headers
        headers = {
            "x-api-key": api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        # Convert messages format for Anthropic
        anthropic_messages = []
        for msg in messages:
            if msg["role"] == "system":
                # Anthropic handles system messages differently
                continue
            anthropic_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # If there was a system message, prepend it to the first user message
        system_content = ""
        for msg in messages:
            if msg["role"] == "system":
                system_content = msg["content"] + "\n\n"
                break
        
        if system_content and anthropic_messages:
            anthropic_messages[0]["content"] = system_content + anthropic_messages[0]["content"]
        
        # Prepare request data
        data = {
            "model": model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": anthropic_messages
        }
        
        # Log the request
        logger.info(f"Sending request to Anthropic with model {model}")
        
        # Make request
        async with aiohttp.ClientSession() as session:
            async with session.post(ANTHROPIC_API_URL, headers=headers, json=data) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Anthropic API error: {response.status} - {error_text}")
                    return f"Error: {response.status} - {error_text}"
                    
                result = await response.json()
                
                # Extract the completion
                if "content" in result and len(result["content"]) > 0:
                    completion = result["content"][0]["text"]
                    return completion
                else:
                    logger.error(f"Unexpected response structure: {result}")
                    return "Error: Unexpected response structure from Anthropic."
    
    except Exception as e:
        logger.error(f"Error in run_anthropic_chat: {str(e)}")
        return f"Error: {str(e)}"

def run_anthropic_chat_sync(
    messages: List[Dict[str, str]],
    model: str = "claude-3-sonnet-20240229",
    temperature: float = 0.7,
    max_tokens: int = 500,
) -> str:
    """
    Synchronous version of run_anthropic_chat
    """
    # Run the async function in a new event loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(run_anthropic_chat(
            messages=messages,
            model=model,
            temperature=temperature, 
            max_tokens=max_tokens
        ))
        return result
    finally:
        loop.close() 