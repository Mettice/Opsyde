import logging
from fastapi import APIRouter
from typing import Dict, Any
from datetime import datetime
import os
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

# Create the router with /api prefix
router = APIRouter(prefix="/api", tags=["chat"])

# Initialize OpenAI client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@router.post("/run-chat")
async def chat_endpoint(request: dict):
    """
    Handle chat requests by routing them to run_chat_node
    """
    try:
        data = request.get("chat", {})
        inputs = request.get("inputs", {})
        node_id = request.get("node_id")
        
        if node_id:
            data["nodeId"] = node_id
            
        result = await run_chat_node(data, inputs)
        
        # If result is already a dict with type/output format, return as is
        if isinstance(result, dict) and "type" in result:
            return result
            
        # Otherwise wrap the string result in our standard format
        return {
            "type": "chat_result",
            "output": result,
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "node_type": "chat",
                "node_id": node_id
            }
        }
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return {
            "type": "error",
            "error": str(e),
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "node_type": "chat",
                "node_id": request.get("node_id")
            }
        }

async def run_chat_node(data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simulates a chatbot node (e.g., summarize chat, respond, etc.)
    """
    try:
        # Extract chat configuration
        prompt = data.get("prompt", "How can I assist you?")
        model = data.get("llmModel", "gpt-3.5-turbo")
        memory = data.get("memory", False)
        temperature = data.get("temperature", 0.7)
        max_tokens = data.get("max_tokens", 500)
        session_id = data.get("nodeId", "default")

        # Format the input message
        input_message = ""
        for key, val in inputs.items():
            if isinstance(val, dict) and "value" in val:
                input_message += f"{key}: {val['value']}\n"
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

        # Call OpenAI API
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        # Extract the response text
        result = response.choices[0].message.content
        
        # Store in memory if enabled
        if memory:
            try:
                from .memora_runner import store_interaction
                store_interaction(session_id, messages[-1], {"role": "assistant", "content": result})
                logger.info(f"Stored interaction in memory for session {session_id}")
            except Exception as e:
                logger.warning(f"Memory storage failed: {str(e)}")
        
        return {
            "type": "chat_result",
            "output": result,
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "node_type": "chat",
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
