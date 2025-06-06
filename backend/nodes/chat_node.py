import logging
from fastapi import APIRouter
from typing import Dict, Any
from datetime import datetime
import os
from openai import AsyncOpenAI
import json
import markdown
from frameworks.openrouter_runner import run_openrouter_chat
from frameworks.huggingface_runner import run_huggingface_tool
from frameworks.perplexity_runner import run_perplexity_chat

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

async def call_openai(messages: list, model: str, temperature: float, max_tokens: int, api_key: str = None) -> str:
    """Call OpenAI API"""
    openai_client = AsyncOpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
    response = await openai_client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens
    )
    return response.choices[0].message.content

async def call_openrouter(messages: list, model: str, temperature: float, max_tokens: int, api_key: str = None) -> str:
    """Call OpenRouter API"""
    return await run_openrouter_chat(
        messages=messages,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        api_key=api_key
    )

async def call_perplexity(messages: list, model: str, temperature: float, max_tokens: int, api_key: str = None) -> str:
    """Call Perplexity API"""
    return await run_perplexity_chat(
        messages=messages,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        api_key=api_key
    )

async def call_huggingface(messages: list, model: str, temperature: float, max_tokens: int, api_key: str = None, context=None) -> str:
    """Call HuggingFace with conversational format"""
    from frameworks.huggingface_runner import run_huggingface_tool
    
    # Convert messages to a single prompt for HuggingFace
    prompt = ""
    for msg in messages:
        if msg["role"] == "system":
            prompt += f"System: {msg['content']}\n"
        elif msg["role"] == "user":
            prompt += f"User: {msg['content']}\n"
        elif msg["role"] == "assistant":
            prompt += f"Assistant: {msg['content']}\n"
    
    # Build config for enhanced runner
    config = {
        "modelName": model,
        "taskType": "conversational",
        "temperature": temperature,
        "maxLength": max_tokens,
        "doSample": True
    }
    
    inputs = {"input": prompt}
    
    # Use enhanced runner with context support
    result = await run_huggingface_tool(config, inputs, context)
    
    # Extract the response text
    if isinstance(result, dict) and "output" in result:
        return result["output"]
    else:
        return str(result)

async def run_chat_node(data: Dict[str, Any], inputs: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
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
        
        # Extract API key from enhanced config
        framework_config = data.get("frameworkConfig", {})
        api_key = (
            data.get("api_key") or 
            data.get("perplexity_api_key") or 
            data.get("openai_api_key") or
            framework_config.get("api_key") or
            framework_config.get("perplexity_api_key") or
            framework_config.get("openai_api_key")
        )

        logger.info(f"💬 Chat node inputs: {list(inputs.keys())}")
        logger.info(f"💬 Chat framework: {framework}, API key: {'[FOUND]' if api_key else '[MISSING]'}")

        # Format the input message - improved extraction
        input_message = ""
        for key, val in inputs.items():
            logger.info(f"💬 Processing input {key}: {type(val)} = {str(val)[:100]}...")
            
            if isinstance(val, dict):
                # Handle different input formats
                if "value" in val:
                    # Direct value
                    input_message += f"{key}: {val['value']}\n"
                elif "text_input" in val:
                    # Text input format
                    input_message += f"{key}: {val['text_input']}\n"
                elif val.get("type") == "input_result":
                    # Input node result format
                    input_value = val.get("value", "")
                    input_message += f"{key}: {input_value}\n"
                elif "file_upload" in val:
                    # File upload format
                    file_data = val["file_upload"]
                    if isinstance(file_data, dict):
                        if "text_input" in file_data:
                            input_message += f"{key}: {file_data['text_input']}\n"
                        elif "content" in file_data:
                            input_message += f"{key}: [File Content]\n"
                else:
                    # Generic dict - try to extract meaningful content
                    if "message" in val:
                        input_message += f"{key}: {val['message']}\n"
                    elif "content" in val:
                        input_message += f"{key}: {val['content']}\n"
                    else:
                        # Fallback - convert to string
                        input_message += f"{key}: {str(val)}\n"
            else:
                # Simple value
                input_message += f"{key}: {val}\n"
        
        # Fallback if no meaningful input found
        if not input_message.strip():
            input_message = "Hello, how can I help you?"

        logger.info(f"💬 Final chat input: {input_message[:200]}...")

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
        logger.info(f"💬 Calling {framework} with model {model}")
        
        if framework == "openai":
            result = await call_openai(messages, model, temperature, max_tokens, api_key)
        elif framework == "openrouter":
            result = await call_openrouter(messages, model, temperature, max_tokens, api_key)
        elif framework == "perplexity":
            result = await call_perplexity(messages, model, temperature, max_tokens, api_key)
        elif framework == "huggingface":
            result = await call_huggingface(messages, model, temperature, max_tokens, api_key, context)
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
        
        logger.info(f"💬 Chat response received: {str(result)[:100]}...")
        
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
        logger.error(f"Chat runner error: {str(e)}", exc_info=True)
        return {
            "type": "error",
            "error": str(e),
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "node_type": "chat",
                "session_id": data.get("nodeId", "default")
            }
        }

async def process_chat_node(
    node_data: Dict[str, Any], 
    inputs: Dict[str, Any], 
    context: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Process chat node - wrapper function expected by the node processor
    
    Args:
        node_data: Chat node configuration
        inputs: Input values from connected nodes
        context: Execution context
        
    Returns:
        Dictionary with the chat result
    """
    try:
        logger.info(f"🚀 CHAT NODE ENTRY: Starting process_chat_node")
        logger.info(f"🚀 CHAT NODE DATA: {node_data}")
        logger.info(f"🚀 CHAT NODE INPUTS: {inputs}")
        
        # Extract actual values from NodeData wrappers
        processed_inputs = {}
        for key, value in inputs.items():
            if hasattr(value, 'value'):
                processed_inputs[key] = value.value
            else:
                processed_inputs[key] = value
        
        logger.info(f"🚀 CHAT PROCESSED INPUTS: {processed_inputs}")
        
        # Run the chat node
        result = await run_chat_node(node_data, processed_inputs, context)
        
        logger.info(f"🚀 CHAT NODE RESULT: {result}")
        return result
        
    except Exception as e:
        logger.error(f"❌ CHAT NODE ERROR: {str(e)}", exc_info=True)
        return {
            "type": "error",
            "error": f"Chat node processing failed: {str(e)}",
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "node_type": "chat"
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
        context = data.get("context", None)
        
        result = await run_chat_node(node_data, inputs, context)
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
