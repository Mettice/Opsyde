#!/usr/bin/env python3
"""
Debug script to test chat node directly
"""

import asyncio
import sys
sys.path.append('.')
from nodes.chat_node import process_chat_node

async def test_chat():
    # Test with a mock framework that doesn't require API calls
    node_data = {
        'framework': 'mock',  # Use a framework that doesn't exist to test error handling
        'llmModel': 'test-model',
        'prompt': 'You are a helpful assistant.',
        'temperature': 0.7,
        'max_tokens': 100,
        'api_key': 'test_key'
    }
    inputs = {'user_input': {'text_input': 'Hello'}}
    
    print("Testing chat node with mock framework...")
    context = {"execution_id": "test-debug", "workflow_id": "debug-workflow"}
    result = await process_chat_node(node_data, inputs, context)
    print('Result:', result)
    
    # Test with OpenAI framework (should fail gracefully without API key)
    print("\nTesting chat node with OpenAI framework...")
    node_data['framework'] = 'openai'
    result2 = await process_chat_node(node_data, inputs, context)
    print('Result:', result2)

if __name__ == "__main__":
    asyncio.run(test_chat()) 