import logging
from fastapi import APIRouter
from typing import Dict, Any
from datetime import datetime
import os
from openai import AsyncOpenAI
import json
import markdown
from backend.frameworks.openrouter_runner import run_openrouter_chat
from backend.frameworks.huggingface_runner import run_huggingface_chat

logger = logging.getLogger(__name__)

# Create the router with /api prefix
router = APIRouter(prefix="/api", tags=["chat"])

# Initialize OpenAI client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def format_markdown_response(text: str) -> str:
    """Format text with markdown support"""
    try:
        # Convert markdown to HTML
        html = markdown.markdown(text)
        # Return both raw markdown and HTML for flexibility
        return {
            "raw": text,
            "html": html,
            "markdown": text
        }
    except Exception as e:
        logger.warning(f"Markdown formatting failed: {str(e)}")
        return {
            "raw": text,
            "html": text,
            "markdown": text
        }

async def call_openai(messages: list, model: str, temperature: float, max_tokens: int) -> str:
    """Call OpenAI API"""
    response = await client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens
    )
    return response.choices[0].message.content

async def call_openrouter(messages: list, model: str, temperature: float, max_tokens: int) -> str:
    """Call OpenRouter API"""
    return await run_openrouter_chat(
        messages=messages,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens
    )

async def call_huggingface(messages: list, model: str, temperature: float, max_tokens: int) -> str:
    """Call HuggingFace API"""
    return await run_huggingface_chat(
        messages=messages,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens
    )

async def run_chat_node(data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run chat node with support for multiple frameworks
    """
    try:
        # Extract chat configuration
        framework = data.get("framework", "openai")
        prompt = data.get("prompt", "How can I assist you?")
        model = data.get("llmModel", "gpt-3.5-turbo")
        memory = data.get("memory", False)
        temperature = data.get("temperature", 0.7)
        max_tokens = data.get("max_tokens", 500)
        session_id = data.get("nodeId", "default")

        # Format the input message
        input_message = ""
        for key, val in inputs.items():
            if isinstance(val, dict):
                if "value" in val:
                    input_message += f"{key}: {val['value']}\n"
                elif "file_upload" in val:
                    file_data = val["file_upload"]
                    if isinstance(file_data, dict):
                        if "text_input" in file_data:
                            input_message += f"{key}: {file_data['text_input']}\n"
                        elif "content" in file_data:
                            input_message += f"{key}: [File Content]\n"
            else:
                input_message += f"{key}: {val}\n"
        
        if not input_message:
            input_message = "Hello, how can I help you?"

        # Create messages array
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": input_message}
        ]

        # Handle memory if enabled
        if memory:
            try:
                from .memora_runner import fetch_history
                past = fetch_history(session_id)
                messages = past + messages
                logger.info(f"Retrieved {len(past)} previous messages from memory")
            except Exception as e:
                logger.warning(f"Memory retrieval failed: {str(e)}")

        # Call appropriate framework
        if framework == "openai":
            result = await call_openai(messages, model, temperature, max_tokens)
        elif framework == "openrouter":
            result = await call_openrouter(messages, model, temperature, max_tokens)
        elif framework == "huggingface":
            result = await call_huggingface(messages, model, temperature, max_tokens)
        else:
            return {
                "type": "error",
                "error": f"Unsupported framework: {framework}",
                "metadata": {
                    "timestamp": datetime.now().isoformat(),
                    "node_type": "chat",
                    "session_id": session_id
                }
            }
        
        # Store in memory if enabled
        if memory:
            try:
                from .memora_runner import store_interaction
                store_interaction(session_id, messages[-1], {"role": "assistant", "content": result})
                logger.info(f"Stored interaction in memory for session {session_id}")
            except Exception as e:
                logger.warning(f"Memory storage failed: {str(e)}")
        
        # Format the response with markdown support
        formatted_response = format_markdown_response(result)
        
        return {
            "type": "chat_result",
            "output": formatted_response,
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "node_type": "chat",
                "framework": framework,
                "model": model,
                "memory_enabled": memory,
                "session_id": session_id
            }
        }
        
    except Exception as e:
        logger.error(f"Chat runner error: {str(e)}")
        return {
            "type": "error",
            "error": str(e),
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "node_type": "chat",
                "session_id": data.get("nodeId", "default")
            }
        }

@router.post("/run-chat")
async def run_chat_endpoint(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Endpoint to run chat node
    """
    try:
        inputs = data.get("inputs", {})
        node_data = data.get("node_data", {})
        
        result = await run_chat_node(node_data, inputs)
        return result
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return {
            "type": "error",
            "error": str(e),
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "node_type": "chat"
            }
        }
