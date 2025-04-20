import logging
from frameworks.openrouter_runner import run_openrouter_chat
from fastapi import APIRouter

logger = logging.getLogger(__name__)

# Create the router
router = APIRouter(prefix="/chat", tags=["chat"])

# Then add your route handlers
@router.post("/")
async def chat_endpoint(request: dict):
    # Your existing chat logic here
    pass

def run_chat_node(data: dict, inputs: dict) -> str:
    """
    Simulates a chatbot node (e.g., summarize chat, respond, etc.)
    """
    prompt = data.get("prompt", "How can I assist you?")
    model = data.get("llmModel", "gpt-3.5-turbo")
    memory = data.get("memory", False)
    temperature = data.get("temperature", 0.7)
    max_tokens = data.get("max_tokens", 500)
    session_id = data.get("nodeId", "default")

    # Format the input message
    input_message = ""
    for key, val in inputs.items():
        input_message += f"{key}: {val}\n"
    
    if not input_message:
        input_message = "Hello, how can I help you?"

    # Create messages array
    messages = [
        {"role": "user", "content": input_message}
    ]

    try:
        # Handle memory if enabled
        if memory:
            try:
                from .memora_runner import fetch_history
                past = fetch_history(session_id)
                messages = past + messages
                logger.info(f"Retrieved {len(past)} previous messages from memory")
            except Exception as e:
                logger.warning(f"Memory retrieval failed: {str(e)}")

        # Run the chat model with temperature and max_tokens
        result = run_openrouter_chat(
            messages=messages, 
            system_prompt=prompt, 
            model=model,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        # Store in memory if enabled
        if memory:
            try:
                from .memora_runner import store_interaction
                store_interaction(session_id, messages[-1], {"role": "assistant", "content": result})
                logger.info(f"Stored interaction in memory for session {session_id}")
            except Exception as e:
                logger.warning(f"Memory storage failed: {str(e)}")
        
        return result
    except Exception as e:
        logger.error(f"Chat runner error: {str(e)}")
        return f"I apologize, but I encountered an error: {str(e)}"
