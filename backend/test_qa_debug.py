#!/usr/bin/env python3
"""
Simple Q&A Debug Test
"""

import asyncio
import os
from dotenv import load_dotenv
from frameworks.huggingface_runner import run_huggingface_tool

# Load environment variables
load_dotenv()

class MockContext:
    """Mock context with API key for testing"""
    def __init__(self, api_key):
        self.user_api_keys = {"huggingface": api_key}
        self.user_id = "test_user"
    
    def get_api_key_for_framework(self, framework, model=None):
        return self.user_api_keys.get(framework.lower())

async def test_qa_only():
    """Test only question-answering to debug the issue"""
    
    print("🔍 QUESTION-ANSWERING DEBUG TEST")
    print("=" * 50)
    
    # Get HuggingFace API key from environment
    hf_api_key = os.getenv("HUGGINGFACE_API_KEY")
    if not hf_api_key:
        print("❌ HUGGINGFACE_API_KEY not found in environment variables")
        return
    
    print(f"🔑 Using HuggingFace API key: {hf_api_key[:10]}...")
    
    # Create mock context with API key
    context = MockContext(hf_api_key)
    
    # Test data
    test_input = {
        "question": "What is CrewBuilder?",
        "context": "CrewBuilder is a workflow automation platform that helps teams create and manage business processes efficiently."
    }
    
    print(f"📋 Test Input: {test_input}")
    print(f"📋 Input Type: {type(test_input)}")
    
    # Test the exact format from the comprehensive test
    inputs_dict = {"inputs": test_input}
    print(f"📋 Wrapped Input: {inputs_dict}")
    
    try:
        print("\n🚀 Calling run_huggingface_tool...")
        result = await run_huggingface_tool(
            config={
                "taskType": "question-answering",
                "modelName": "deepset/roberta-base-squad2"
            },
            inputs=inputs_dict,
            context=context
        )
        
        print(f"\n📤 Result: {result}")
        
        if result.get("success"):
            print("✅ SUCCESS!")
            print(f"📤 Output: {result.get('output', 'No output')}")
        else:
            print("❌ FAILED!")
            print(f"🚨 Error: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"💥 EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_qa_only()) 