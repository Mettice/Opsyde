#!/usr/bin/env python3
"""
Test script for tool node functionality
"""

import asyncio
import json
from core.runner import UnifiedRunner

# Test workflow with tool node
test_tool_workflow = {
    "workflow_id": "tool_test",
    "nodes": [
        {
            "id": "trigger-1",
            "type": "trigger",
            "data": {
                "label": "Manual Trigger",
                "triggerType": "manual",
                "nodeType": "trigger"
            }
        },
        {
            "id": "input-1",
            "type": "input",
            "data": {
                "label": "User Input",
                "inputType": "text",
                "value": "What is the weather like today?",
                "nodeType": "input"
            }
        },
        {
            "id": "tool-1",
            "type": "tool",
            "data": {
                "label": "LLM Tool Test",
                "toolType": "llm",
                "framework": "langchain",
                "nodeType": "tool",
                "frameworkConfig": {
                    "provider": "perplexity",
                    "model": "llama-3.1-sonar-small-128k-online",
                    "temperature": 0.7,
                    "max_tokens": 100,
                    "chainType": "simple"
                },
                "prompt": "You are a helpful assistant. Answer the user's question briefly.",
                "description": "Test LLM tool with LangChain + Perplexity"
            }
        },
        {
            "id": "output-1",
            "type": "output",
            "data": {
                "label": "Console Output",
                "outputType": "console",
                "nodeType": "output"
            }
        }
    ],
    "edges": [
        {
            "id": "e1",
            "source": "trigger-1",
            "target": "input-1",
            "data": {"label": "trigger_data"}
        },
        {
            "id": "e2",
            "source": "input-1",
            "target": "tool-1",
            "data": {"label": "user_input"}
        },
        {
            "id": "e3",
            "source": "tool-1",
            "target": "output-1",
            "data": {"label": "tool_result"}
        }
    ],
    "inputs": {
        "workflow_name": "Tool Test",
        "test_mode": True
    }
}

async def test_tool_node():
    """Test tool node execution"""
    print("🔧 Starting Tool Node Test")
    print("=" * 50)
    
    runner = UnifiedRunner()
    
    try:
        # Use your real user ID for API keys
        real_user_id = "f31db8d3-7b54-46b5-bebf-1ea7b6b2edff"
        
        print(f"🔑 Loading API keys for user: {real_user_id}")
        
        # Execute the workflow
        async for result in runner.execute_workflow(test_tool_workflow, user_id=real_user_id):
            node_id = result.get("node_id", "unknown")
            node_type = result.get("node_type", "unknown")
            
            print(f"\n📦 Node: {node_id} ({node_type})")
            print("-" * 30)
            
            if "error" in result:
                print(f"❌ Error: {result['error']}")
            else:
                node_result = result.get("result", {})
                if isinstance(node_result, dict):
                    result_type = node_result.get("type", "unknown")
                    print(f"🔄 Result Type: {result_type}")
                    
                    if node_type == "tool":
                        if "value" in node_result:
                            value = node_result["value"]
                            print(f"🔧 Tool Success: {value.get('success', 'N/A')}")
                            print(f"🔧 Tool Type: {value.get('metadata', {}).get('tool_type', 'N/A')}")
                            print(f"🔧 Framework: {value.get('metadata', {}).get('framework', 'N/A')}")
                            if 'result' in value:
                                tool_output = value['result']
                                if isinstance(tool_output, dict):
                                    print(f"🔧 Output: {str(tool_output.get('output', tool_output))[:200]}...")
                                else:
                                    print(f"🔧 Output: {str(tool_output)[:200]}...")
                        else:
                            print(f"🔧 Raw Result: {str(node_result)[:200]}...")
                    
                    # Show metadata
                    metadata = node_result.get("metadata", {})
                    if metadata:
                        print(f"📊 Execution Time: {metadata.get('execution_time', 'N/A')}s")
            
            print(f"⏰ Timestamp: {result.get('timestamp', 'N/A')}")
    
    except Exception as e:
        print(f"❌ Tool test failed: {str(e)}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 50)
    print("🏁 Tool Node Test Complete")

if __name__ == "__main__":
    asyncio.run(test_tool_node()) 