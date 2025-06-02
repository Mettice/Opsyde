#!/usr/bin/env python3
"""
🧪 Test Workflow Execution Context
Verify that API keys are loaded correctly for workflow execution
"""

import asyncio
import logging
from core.workflow_execution_context import create_execution_context

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_workflow_context():
    """Test the workflow execution context with API key loading"""
    print("🧪 Testing workflow execution context...")
    
    try:
        # Create execution context for anonymous user
        context = await create_execution_context('anonymous')
        
        # Get context info
        context_info = context.get_context_info()
        print(f"📊 Context info: {context_info}")
        
        # Check available API keys
        available_keys = list(context.user_api_keys.keys())
        print(f"🔑 Available API keys: {available_keys}")
        print(f"📈 Total API keys loaded: {len(available_keys)}")
        
        # Test specific framework lookups
        frameworks_to_test = ['openai', 'perplexity', 'anthropic', 'google']
        
        for framework in frameworks_to_test:
            api_key = context.get_api_key_for_framework(framework)
            status = "✅ Found" if api_key else "❌ Not found"
            masked_key = f" ({api_key[:10]}...{api_key[-4:]})" if api_key else ""
            print(f"🔍 {framework}: {status}{masked_key}")
        
        # Test node config enhancement
        test_config = {
            "framework": "openai",
            "model": "gpt-4",
            "temperature": 0.7
        }
        
        enhanced_config = context.enhance_node_config(test_config)
        has_api_key = "api_key" in enhanced_config
        print(f"🔧 Node config enhancement: {'✅ API key injected' if has_api_key else '❌ No API key'}")
        
        # Cleanup
        await context.cleanup()
        
        print("✅ Test completed successfully!")
        return len(available_keys) > 0
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_workflow_context())
    if success:
        print("🎉 Workflow execution context is working correctly!")
    else:
        print("💥 Workflow execution context needs fixing!") 