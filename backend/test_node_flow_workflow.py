#!/usr/bin/env python3
"""
Test workflow to demonstrate data flow through different node types
"""

import asyncio
import json
from core.runner import UnifiedRunner
from core.workflow_execution_context import WorkflowExecutionContext

# Test workflow with multiple node types
test_workflow = {
    "workflow_id": "node_flow_test",
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
            "id": "logic-1", 
            "type": "logic",
            "data": {
                "label": "Check Condition",
                "condition": "True",  # Simple condition for testing
                "nodeType": "logic"
            }
        },
        {
            "id": "chat-1",
            "type": "chat", 
            "data": {
                "label": "Chat Response",
                "prompt": "You are a helpful assistant. Respond to the user's input briefly.",
                "framework": "perplexity",
                "llmModel": "llama-3.1-sonar-small-128k-online",
                "temperature": 0.7,
                "max_tokens": 100,
                "nodeType": "chat",
                "frameworkConfig": {
                    "provider": "perplexity",
                    "model": "llama-3.1-sonar-small-128k-online",
                    "temperature": 0.7,
                    "max_tokens": 100
                }
            }
        },
        {
            "id": "delay-1",
            "type": "delay",
            "data": {
                "label": "Wait 2 seconds",
                "duration": "2s",
                "nodeType": "delay"
            }
        },
        {
            "id": "input-1",
            "type": "input",
            "data": {
                "label": "User Input",
                "inputType": "text",
                "value": "Hello, how does data flow work?",
                "nodeType": "input"
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
            "target": "logic-1",
            "data": {"label": "trigger_data"}
        },
        {
            "id": "e2", 
            "source": "logic-1",
            "target": "input-1",
            "data": {"label": "logic_result"}
        },
        {
            "id": "e3",
            "source": "input-1", 
            "target": "chat-1",
            "data": {"label": "user_input"}
        },
        {
            "id": "e4",
            "source": "chat-1",
            "target": "delay-1", 
            "data": {"label": "chat_response"}
        },
        {
            "id": "e5",
            "source": "delay-1",
            "target": "output-1",
            "data": {"label": "final_output"}
        }
    ],
    "inputs": {
        "workflow_name": "Node Flow Test",
        "test_mode": True
    }
}

async def test_node_flow():
    """Test the workflow execution and data flow"""
    print("🚀 Starting Node Flow Test Workflow")
    print("=" * 50)
    
    runner = UnifiedRunner()
    
    try:
        # Use your real user ID that has the Perplexity API key
        real_user_id = "f31db8d3-7b54-46b5-bebf-1ea7b6b2edff"  # Your actual user ID with Perplexity key
        
        print(f"🔑 Loading real API keys for user: {real_user_id}")
        
        # Execute the workflow with real user ID to load actual API keys
        async for result in runner.execute_workflow(test_workflow, user_id=real_user_id):
            node_id = result.get("node_id", "unknown")
            node_type = result.get("node_type", "unknown")
            
            print(f"\n📦 Node: {node_id} ({node_type})")
            print("-" * 30)
            
            if "error" in result:
                print(f"❌ Error: {result['error']}")
            else:
                # Pretty print the result
                node_result = result.get("result", {})
                if isinstance(node_result, dict):
                    result_type = node_result.get("type", "unknown")
                    print(f"🔄 Result Type: {result_type}")
                    
                    # Show key data based on node type
                    if node_type == "trigger":
                        if "value" in node_result:
                            value = node_result["value"]
                            print(f"📡 Trigger Status: {value.get('status', 'N/A')}")
                            print(f"📡 Message: {value.get('message', 'N/A')}")
                        
                    elif node_type == "logic":
                        if "value" in node_result:
                            value = node_result["value"]
                            print(f"🧠 Condition: {value.get('condition', 'N/A')}")
                            print(f"🧠 Result: {value.get('result', 'N/A')}")
                            print(f"🧠 Path: {value.get('path', 'N/A')}")
                        
                    elif node_type == "input":
                        if result_type == "input_result":
                            print(f"📝 Input Type: {node_result.get('input_type', 'N/A')}")
                            print(f"📝 Label: {node_result.get('label', 'N/A')}")
                            print(f"📝 Value: {str(node_result.get('value', 'N/A'))[:100]}...")
                        
                    elif node_type == "chat":
                        if result_type == "chat_result":
                            output = node_result.get("output", {})
                            if isinstance(output, dict):
                                response = output.get('raw', 'N/A')
                                print(f"💬 Response: {str(response)[:200]}...")
                                print(f"💬 Model: {node_result.get('metadata', {}).get('model', 'N/A')}")
                                print(f"💬 Framework: {node_result.get('metadata', {}).get('framework', 'N/A')}")
                        else:
                            # Try to extract from the raw result if structure is different
                            raw_result = str(node_result)
                            if "chat_result" in raw_result and "raw" in raw_result:
                                print(f"💬 Chat node executed successfully!")
                                print(f"💬 Check logs above for the actual AI response")
                            else:
                                print(f"💬 Response: {str(node_result)[:200]}...")
                        
                    elif node_type == "delay":
                        if "value" in node_result:
                            value = node_result["value"]
                            print(f"⏱️ Duration: {value.get('duration', 'N/A')}")
                            print(f"⏱️ Actual: {value.get('actual_duration', 'N/A')}s")
                        
                    elif node_type == "output":
                        if "value" in node_result:
                            value = node_result["value"]
                            print(f"📤 Output Type: {value.get('output_type', 'N/A')}")
                            print(f"📤 Status: {value.get('status', 'N/A')}")
                        
                    # Show metadata
                    metadata = node_result.get("metadata", {})
                    if metadata:
                        print(f"📊 Timestamp: {metadata.get('timestamp', 'N/A')}")
                        print(f"📊 Execution Time: {metadata.get('execution_time', 'N/A')}s")
                else:
                    print(f"📄 Raw Result: {str(node_result)[:200]}...")
            
            print(f"⏰ Execution Time: {result.get('timestamp', 'N/A')}")
    
    except Exception as e:
        print(f"❌ Workflow execution failed: {str(e)}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 50)
    print("🏁 Node Flow Test Complete")

if __name__ == "__main__":
    asyncio.run(test_node_flow()) 