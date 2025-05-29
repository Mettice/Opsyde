import logging
import os
import json
from typing import Dict, Any, List, Optional
import aiohttp
from datetime import datetime
import asyncio
from openai import AsyncOpenAI

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configure OpenAI API
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

async def run_openai_tool(tool_data: Dict[str, Any]) -> Dict[str, Any]:
    """Run a tool using OpenAI's API"""
    try:
        # Extract configuration
        model = tool_data.get("model", "gpt-4")
        temperature = float(tool_data.get("temperature", 0.7))
        max_tokens = int(tool_data.get("max_tokens", 500))
        prompt = tool_data.get("prompt", "")
        inputs = tool_data.get("inputs", {})
        
        # Get API key
        key = os.getenv("OPENAI_API_KEY")
        if not key:
            logger.error("OpenAI API key not found in environment variables")
            return {
                "output": "[Error] OpenAI API key not configured",
                "type": "error",
                "error": "API key not found"
            }

        # Initialize OpenAI client
        client = AsyncOpenAI(api_key=key)

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

        # Prepare messages
        messages = [{"role": "user", "content": formatted_prompt}]

        # Make the API call
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )

        # Extract the response
        result = response.choices[0].message.content

        return {
            "output": result,
            "type": "success",
            "metadata": {
                "model": model,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "timestamp": datetime.now().isoformat(),
                "usage": response.usage.model_dump() if response.usage else None
            }
        }

    except Exception as e:
        logger.error(f"Error in run_openai_tool: {str(e)}")
        return {
            "output": f"[Error] {str(e)}",
            "type": "error",
            "error": str(e)
        }

async def process_large_file(file_content: str, file_type: str, model: str, temperature: float, max_tokens: int, api_key: str, prompt: str) -> Dict[str, Any]:
    """Process large files in chunks"""
    try:
        client = AsyncOpenAI(api_key=api_key)
        
        # Split content into chunks
        chunk_size = 8000  # Conservative chunk size
        chunks = [file_content[i:i+chunk_size] for i in range(0, len(file_content), chunk_size)]
        
        results = []
        for i, chunk in enumerate(chunks):
            chunk_prompt = f"{prompt}\n\nProcessing chunk {i+1}/{len(chunks)} of {file_type} file:\n{chunk}"
            
            messages = [{"role": "user", "content": chunk_prompt}]
            
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            results.append(response.choices[0].message.content)
        
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

async def run_openai_chat(
    messages: List[Dict[str, str]],
    model: str = "gpt-4",
    temperature: float = 0.7,
    max_tokens: int = 500,
) -> str:
    """
    Run a chat completion request through OpenAI
    
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
        api_key = OPENAI_API_KEY
        if not api_key:
            logger.warning("OPENAI_API_KEY not set in environment variables")
            return "OpenAI API key not configured."
            
        # Initialize OpenAI client
        client = AsyncOpenAI(api_key=api_key)
        
        # Log the request
        logger.info(f"Sending request to OpenAI with model {model}")
        
        # Make request
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        # Extract the completion
        if response.choices and len(response.choices) > 0:
            completion = response.choices[0].message.content
            return completion
        else:
            logger.error(f"Unexpected response structure: {response}")
            return "Error: Unexpected response structure from OpenAI."
    
    except Exception as e:
        logger.error(f"Error in run_openai_chat: {str(e)}")
        return f"Error: {str(e)}"

def run_openai_chat_sync(
    messages: List[Dict[str, str]],
    model: str = "gpt-4",
    temperature: float = 0.7,
    max_tokens: int = 500,
) -> str:
    """
    Synchronous version of run_openai_chat
    """
    # Run the async function in a new event loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(run_openai_chat(
            messages=messages,
            model=model,
            temperature=temperature, 
            max_tokens=max_tokens
        ))
        return result
    finally:
        loop.close() 