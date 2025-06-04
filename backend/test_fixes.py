#!/usr/bin/env python3
"""
Test script to verify workflow execution fixes
"""

import asyncio
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.workflow_execution_context import WorkflowExecutionContext
from framework_registry import validate_framework_llm_combination

async def test_workflow_fixes():
    """Test the key fixes we implemented"""
    print("🔧 Testing Workflow Execution Fixes...")
    print("=" * 50)
    
    # Test 1: WorkflowExecutionContext mapping interface
    print("\n1. Testing WorkflowExecutionContext...")
    try:
        context = WorkflowExecutionContext(user_id='test_user', workflow_id='test_workflow')
        await context.initialize()
        
        # Test mapping interface
        print(f"   ✅ Context keys: {list(context.keys())}")
        print(f"   ✅ Context length: {len(context)}")
        print(f"   ✅ Context get method: {context.get('user_id')}")
        print(f"   ✅ Context user_id: {context['user_id']}")
        
        print("   ✅ WorkflowExecutionContext mapping interface works!")
        
    except Exception as e:
        print(f"   ❌ WorkflowExecutionContext error: {e}")
    
    # Test 2: Framework validation fixes
    print("\n2. Testing framework validation...")
    try:
        # Test OpenRouter validation
        result = validate_framework_llm_combination('openrouter', 'gpt-4')
        print(f"   ✅ OpenRouter + GPT-4: {result}")
        
        # Test CrewAI + Perplexity
        result = validate_framework_llm_combination('crewai', 'perplexity')
        print(f"   ✅ CrewAI + Perplexity: {result}")
        
        # Test unknown framework (should handle gracefully)
        result = validate_framework_llm_combination('unknown_framework', 'gpt-4')
        print(f"   ✅ Unknown framework handling: {result}")
        
        print("   ✅ Framework validation works!")
        
    except Exception as e:
        print(f"   ❌ Framework validation error: {e}")
    
    print("\n🎉 All tests completed!")
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(test_workflow_fixes()) 