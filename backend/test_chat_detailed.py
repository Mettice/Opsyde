#!/usr/bin/env python3
"""
Detailed chat node test with exact workflow inputs
"""

import asyncio
import sys
sys.path.append('.')
from nodes.chat_node import process_chat_node

async def test_chat_with_workflow_inputs():
    # Exact node data from the workflow
    node_data = {
        "label": "Chat Response",
        "prompt": "You are a helpful assistant. Respond to the user's input briefly.",
        "framework": "perplexity",
        "llmModel": "llama-3.1-sonar-small-128k-online",
        "temperature": 0.7,
        "max_tokens": 100,
        "nodeType": "chat",
        # Add API key that should be injected by workflow context
        "api_key": "pplx-test-key"  # This would be the real key in actual workflow
    }
    
    # Exact inputs that the chat node receives from the workflow
    inputs = {
        "workflow_name": "Node Flow Test",
        "test_mode": True,
        "user_input": {
            "type": "input_result",
            "input_type": "text", 
            "label": "User Input",
            "value": "Hello, how does data flow work?",
            "metadata": {
                "timestamp": "2024-01-01T00:00:00",
                "node_type": "input"
            }
        }
    }
    
    print("🧪 Testing chat node with exact workflow inputs...")
    print(f"📋 Node data keys: {list(node_data.keys())}")
    print(f"📋 Input keys: {list(inputs.keys())}")
    
    try:
        # Add context for testing
        context = {
            "execution_id": "test-execution-123",
            "workflow_id": "test-workflow-456",
            "timestamp": "2024-01-01T00:00:00"
        }
        
        result = await process_chat_node(node_data, inputs, context)
        print(f"✅ Result type: {result.get('type', 'unknown')}")
        print(f"📄 Result: {result}")
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_chat_with_workflow_inputs()) 