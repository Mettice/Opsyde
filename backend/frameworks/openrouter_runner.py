import os
import requests
import logging
import json
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_openrouter_tool(tool_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a tool using the OpenRouter API.
    
    Args:
        tool_data: Dictionary containing tool configuration and inputs
        
    Returns:
        Dictionary with the result from the OpenRouter API
    """
    try:
        # Extract tool configuration
        model = tool_data.get("model", "openai/gpt-3.5-turbo")
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
                # Check if the value is a file upload (likely a PDF or large text)
                if key == "file_upload" and isinstance(value, dict) and "data" in value:
                    # For file uploads, add a note instead of the full content
                    prompt += f"- {key}: [File uploaded - processing in chunks]\n"
                else:
                    prompt += f"- {key}: {value}\n"
        
        # Get API key from environment
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
                return process_large_file(file_content, file_type, model, temperature, max_tokens, key, prompt)
        
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
        
        # Make API call
        res = requests.post("https://openrouter.ai/api/v1/chat/completions", 
                           headers=headers, 
                           json=payload,
                           timeout=60)
        
        # Check for errors
        if res.status_code != 200:
            logger.error(f"OpenRouter API error: {res.status_code} - {res.text}")
            return {
                "output": f"[Error] OpenRouter API returned status code {res.status_code}",
                "type": "error",
                "error": res.text
            }
        
        # Parse response
        data = res.json()
        
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
                # Try alternative response formats
                if "output" in data:
                    # Some models might return a direct output field
                    return {
                        "output": data["output"],
                        "type": "openrouter_result",
                        "model": model
                    }
                elif "text" in data:
                    # Some models might return a text field
                    return {
                        "output": data["text"],
                        "type": "openrouter_result",
                        "model": model
                    }
                else:
                    logger.error(f"Unexpected response format from OpenRouter: {data}")
                    return {
                        "output": "[Error] Unexpected API response format",
                        "type": "error",
                        "error": "Missing choices in API response",
                        "raw_response": str(data)
                    }
        except Exception as e:
            logger.error(f"Error parsing OpenRouter response: {str(e)}, Response: {data}")
            return {
                "output": f"[Error] Failed to parse API response: {str(e)}",
                "type": "error",
                "error": str(e),
                "raw_response": str(data)
            }
        
    except Exception as e:
        logger.error(f"Error in OpenRouter tool execution: {str(e)}")
        return {
            "output": f"[Error] OpenRouter tool failed: {str(e)}",
            "type": "error",
            "error": str(e)
        }

def run_openrouter_chat(messages, system_prompt="", model="gpt-3.5-turbo", temperature=0.7, max_tokens=500):
    """
    Run a chat completion through OpenRouter
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY environment variable not set")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # Prepare the messages array
    formatted_messages = []
    
    # Add system message if provided
    if system_prompt:
        formatted_messages.append({"role": "system", "content": system_prompt})
    
    # Add the rest of the messages
    for msg in messages:
        if isinstance(msg, dict) and "role" in msg and "content" in msg:
            formatted_messages.append(msg)
        elif isinstance(msg, dict) and "text" in msg and "from" in msg:
            # Convert from {text, from} format to {role, content}
            role = "assistant" if msg["from"] == "bot" else "user"
            formatted_messages.append({"role": role, "content": msg["text"]})
        else:
            # Fallback for string messages
            formatted_messages.append({"role": "user", "content": str(msg)})
    
    payload = {
        "model": model,
        "messages": formatted_messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        result = response.json()
        return result["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"OpenRouter chat error: {str(e)}")
        raise

def process_large_file(file_content, file_type, model, temperature, max_tokens, api_key, base_prompt):
    """Process a large file by breaking it into manageable chunks"""
    
    # Determine chunk size based on model
    chunk_size = 10000  # Adjust based on token limits
    
    # Break the content into chunks
    chunks = [file_content[i:i+chunk_size] for i in range(0, len(file_content), chunk_size)]
    
    logger.info(f"Processing large file in {len(chunks)} chunks")
    
    # Process each chunk and collect results
    all_results = []
    for i, chunk in enumerate(chunks):
        chunk_prompt = f"{base_prompt}\n\nProcessing chunk {i+1} of {len(chunks)}:\n{chunk}"
        
        # Make API call for this chunk
        headers = {
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "https://opsyde.io",
            "X-Title": "Opsyde Agent Execution"
        }
        
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": chunk_prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "transforms": ["middle-out"]  # Add middle-out transform for large inputs
        }
        
        try:
            res = requests.post(
                "https://openrouter.ai/api/v1/chat/completions", 
                headers=headers, 
                json=payload,
                timeout=60
            )
            
            if res.status_code == 200:
                data = res.json()
                if "choices" in data and len(data["choices"]) > 0:
                    content = data["choices"][0]["message"]["content"]
                    all_results.append(content)
                else:
                    logger.error(f"Unexpected response format for chunk {i+1}")
            else:
                logger.error(f"Error processing chunk {i+1}: {res.status_code} - {res.text}")
                
        except Exception as e:
            logger.error(f"Error processing chunk {i+1}: {str(e)}")
    
    # Combine results
    if all_results:
        combined = "\n\n".join([f"Chunk {i+1} results:\n{result}" for i, result in enumerate(all_results)])
        return {
            "output": combined,
            "type": "openrouter_result",
            "model": model,
            "chunks_processed": len(chunks)
        }
    else:
        return {
            "output": "[Error] Failed to process file chunks",
            "type": "error",
            "error": "No results from chunk processing"
        }
