# Enhanced HuggingFace Runner
import aiohttp
import json
import os
import logging
from typing import Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

async def run_huggingface_tool(config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Enhanced HuggingFace runner with full model support"""
    
    try:
        # Extract configuration
        model_name = config.get("modelName", "microsoft/DialoGPT-medium")
        task_type = config.get("taskType", "text-generation")
        max_length = config.get("maxLength", 512)
        temperature = config.get("temperature", 0.7)
        do_sample = config.get("doSample", True)
        
        # Get API key
        api_key = os.getenv("HUGGINGFACE_API_KEY")
        if not api_key:
            return {
                "type": "error",
                "error": "HUGGINGFACE_API_KEY not found",
                "framework": "huggingface",
                "success": False
            }
        
        # Prepare input based on task type
        if task_type == "conversational":
            input_text = inputs.get("input", inputs.get("message", "Hello"))
            payload = {
                "inputs": {
                    "text": input_text
                },
                "parameters": {
                    "max_length": max_length,
                    "temperature": temperature,
                    "do_sample": do_sample
                }
            }
        elif task_type == "question-answering":
            question = inputs.get("question", "What is this about?")
            context = inputs.get("context", inputs.get("input", "No context"))
            payload = {
                "inputs": {
                    "question": question,
                    "context": context
                }
            }
        elif task_type == "summarization":
            text = inputs.get("input", inputs.get("text", "Text to summarize"))
            payload = {
                "inputs": text,
                "parameters": {
                    "max_length": max_length,
                    "temperature": temperature
                }
            }
        else:  # text-generation
            input_text = inputs.get("input", inputs.get("text", "Generate text about"))
            payload = {
                "inputs": input_text,
                "parameters": {
                    "max_new_tokens": max_length,
                    "temperature": temperature,
                    "do_sample": do_sample,
                    "return_full_text": False
                }
            }
        
        # Make API request
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        api_url = f"https://api-inference.huggingface.co/models/{model_name}"
        
        async with aiohttp.ClientSession() as session:
            async with session.post(api_url, headers=headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    return {
                        "type": "error",
                        "error": f"HuggingFace API error: {response.status} - {error_text}",
                        "framework": "huggingface",
                        "success": False
                    }
                
                result = await response.json()
                
                # Extract output based on task type
                if task_type == "conversational":
                    output = result.get("generated_text", str(result))
                elif task_type == "question-answering":
                    output = result.get("answer", str(result))
                elif task_type == "summarization":
                    if isinstance(result, list) and len(result) > 0:
                        output = result[0].get("summary_text", str(result))
                    else:
                        output = str(result)
                else:  # text-generation
                    if isinstance(result, list) and len(result) > 0:
                        output = result[0].get("generated_text", str(result))
                    else:
                        output = str(result)
                
                return {
                    "type": "huggingface_result",
                    "output": output,
                    "framework": "huggingface",
                    "success": True,
                    "metadata": {
                        "model_name": model_name,
                        "task_type": task_type,
                        "timestamp": datetime.now().isoformat()
                    }
                }
        
    except Exception as e:
        logger.error(f"HuggingFace execution failed: {str(e)}")
        return {
            "type": "error",
            "error": str(e),
            "framework": "huggingface",
            "success": False
        }