#!/usr/bin/env python3
"""
🧪 Test Data Flow System
Verify that the new workflow data manager works correctly
"""

import asyncio
import sys
import os

# Add the current directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.workflow_data_manager import WorkflowExecutionContext, get_workflow_context

async def test_basic_data_flow():
    """Test basic data flow between nodes"""
    print("🧪 Testing Basic Data Flow")
    print("=" * 50)
    
    # Create a workflow context
    context = WorkflowExecutionContext("test_workflow")
    
    # Simulate trigger node output
    trigger_output = {
        "api_data": [
            {"symbol": "PEPE", "price": 0.00001234, "volume": 1000000},
            {"symbol": "DOGE", "price": 0.08, "volume": 500000}
        ],
        "timestamp": "2024-01-28T10:00:00Z"
    }
    
    context.register_node_output("trigger-1", "trigger", trigger_output)
    print(f"✅ Registered trigger output")
    
    # Simulate agent node output
    agent_output = "🔥 CRYPTO DATA UPDATE:\n\nToken: PEPE\nPrice: $0.00001234\nVolume: $1,000,000"
    
    context.register_node_output("agent-1", "agent", agent_output)
    print(f"✅ Registered agent output")
    
    # Simulate task node output
    task_output = "Formatted crypto data ready for Telegram"
    
    context.register_node_output("task-1", "task", task_output)
    print(f"✅ Registered task output")
    
    # Test template variable resolution
    print("\n🔍 Testing Template Variable Resolution")
    print("-" * 40)
    
    test_templates = [
        "{task_output}",
        "{agent_output}",
        "{trigger_output}",
        "Message: {task_output}",
        "Data from trigger: {trigger_output.api_data[0].symbol}",
        "{previous_output}"
    ]
    
    for template in test_templates:
        resolved = context.resolve_template_variables(template)
        print(f"Template: {template}")
        print(f"Resolved: {resolved[:100]}...")
        print()
    
    # Test available variables
    print("📋 Available Variables:")
    variables = context.get_available_variables()
    for var_name, description in variables.items():
        print(f"  {var_name}: {description}")
    
    print(f"\n✅ Test completed successfully!")
    return True

async def test_telegram_payload():
    """Test Telegram payload template resolution"""
    print("\n🧪 Testing Telegram Payload Resolution")
    print("=" * 50)
    
    context = WorkflowExecutionContext("telegram_test")
    
    # Register task output
    task_output = "🔥 NEW CRYPTO TOKENS DETECTED:\n\nToken: PEPE\nSymbol: PEPE\nPrice: $0.00001234"
    context.register_node_output("crypto-task", "task", task_output)
    
    # Test Telegram payload template
    telegram_payload = {
        "chat_id": "5251498620",
        "text": "{task_output}"
    }
    
    resolved_payload = context.resolve_template_variables(telegram_payload)
    
    print("Original payload:")
    print(telegram_payload)
    print("\nResolved payload:")
    print(resolved_payload)
    
    # Verify the text field was resolved
    if resolved_payload["text"] != "{task_output}":
        print("✅ Template variable resolved successfully!")
        return True
    else:
        print("❌ Template variable NOT resolved!")
        return False

async def test_nested_data_access():
    """Test nested data access with dot notation"""
    print("\n🧪 Testing Nested Data Access")
    print("=" * 50)
    
    context = WorkflowExecutionContext("nested_test")
    
    # Register complex trigger data
    complex_data = {
        "pairs": [
            {
                "baseToken": {"symbol": "PEPE", "name": "Pepe"},
                "priceUsd": "0.00001234",
                "liquidity": {"usd": 1000000}
            }
        ],
        "metadata": {
            "source": "DexScreener",
            "timestamp": "2024-01-28T10:00:00Z"
        }
    }
    
    context.register_node_output("dex-trigger", "trigger", complex_data)
    
    # Test nested access
    test_paths = [
        "trigger_output.pairs[0].baseToken.symbol",
        "trigger_output.pairs[0].priceUsd", 
        "trigger_output.metadata.source",
        "dex-trigger_output.pairs[0].liquidity.usd"
    ]
    
    for path in test_paths:
        resolved = context.resolve_template_variables(f"{{{path}}}")
        print(f"Path: {path}")
        print(f"Resolved: {resolved}")
        print()
    
    print("✅ Nested data access test completed!")
    return True

async def main():
    """Run all tests"""
    print("🚀 Starting Data Flow System Tests")
    print("=" * 60)
    
    tests = [
        test_basic_data_flow,
        test_telegram_payload,
        test_nested_data_access
    ]
    
    results = []
    for test in tests:
        try:
            result = await test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test failed: {e}")
            results.append(False)
    
    print("\n📊 Test Results Summary")
    print("=" * 30)
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed! Data flow system is working correctly.")
    else:
        print("⚠️ Some tests failed. Check the output above for details.")
    
    return passed == total

if __name__ == "__main__":
    asyncio.run(main()) 