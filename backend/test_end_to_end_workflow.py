#!/usr/bin/env python3
"""
🚀 NODAI End-to-End Testing Suite
Testing the complete workflow from trigger to output
"""

import asyncio
import json
from datetime import datetime
from core.runner import UnifiedRunner
from core.workflow_execution_context import create_execution_context

async def test_complete_ai_workflow():
    """
    Test a complete AI workflow:
    Trigger → Input → Research Tool → Content Generator → Output
    """
    print("🚀 NODAI End-to-End Test: AI Content Pipeline")
    print("=" * 60)
    
    # Test user ID (you can replace with real user)
    user_id = "f31db8d3-7b54-46b5-bebf-1ea7b6b2edff"
    
    # Create execution context with user API keys
    context = await create_execution_context(user_id=user_id)
    
    # Define a complete workflow
    workflow_data = {
        "nodes": [
            {
                "nodeId": "trigger-1",
                "type": "trigger",
                "data": {
                    "triggerType": "manual",
                    "label": "Start Research Pipeline"
                }
            },
            {
                "nodeId": "input-1", 
                "type": "input",
                "data": {
                    "inputType": "text",
                    "label": "Research Topic",
                    "placeholder": "Enter topic to research"
                }
            },
            {
                "nodeId": "research-tool",
                "type": "tool",
                "data": {
                    "tool_type": "llm",
                    "framework": "langchain",
                    "label": "AI Research Assistant",
                    "frameworkConfig": {
                        "provider": "perplexity",
                        "model": "llama-3.1-sonar-small-128k-online",
                        "temperature": 0.7,
                        "chainType": "simple"
                    },
                    "prompt": "Research the following topic and provide a comprehensive summary with key insights: {input}"
                }
            },
            {
                "nodeId": "content-generator",
                "type": "tool", 
                "data": {
                    "tool_type": "llm",
                    "framework": "langchain",
                    "label": "Content Generator",
                    "frameworkConfig": {
                        "provider": "perplexity",
                        "model": "llama-3.1-sonar-small-128k-online", 
                        "temperature": 0.8,
                        "chainType": "simple"
                    },
                    "prompt": "Based on this research: {research_output}, create an engaging blog post with title, introduction, main points, and conclusion."
                }
            },
            {
                "nodeId": "output-1",
                "type": "output",
                "data": {
                    "outputType": "text",
                    "label": "Generated Content"
                }
            }
        ],
        "edges": [
            {"source": "trigger-1", "target": "input-1"},
            {"source": "input-1", "target": "research-tool"},
            {"source": "research-tool", "target": "content-generator"},
            {"source": "content-generator", "target": "output-1"}
        ],
        "global_inputs": {
            "input": "Artificial Intelligence in Healthcare 2024"
        }
    }
    
    print(f"📋 Workflow: {len(workflow_data['nodes'])} nodes, {len(workflow_data['edges'])} connections")
    print(f"🔑 User: {user_id}")
    print(f"🎯 Topic: {workflow_data['global_inputs']['input']}")
    print()
    
    # Execute the workflow
    runner = UnifiedRunner()
    
    print("⚡ Starting workflow execution...")
    start_time = datetime.now()
    
    try:
        async for result in runner.execute_workflow(workflow_data, user_id):
            node_id = result.get('node_id', 'unknown')
            success = result.get('success', False)
            status_icon = "✅" if success else "❌"
            
            print(f"{status_icon} {node_id}: {result.get('type', 'unknown')}")
            
            if success and result.get('data'):
                # Show preview of output
                output = str(result['data'])
                preview = output[:100] + "..." if len(output) > 100 else output
                print(f"   📄 Output: {preview}")
            elif not success:
                print(f"   ❌ Error: {result.get('error', 'Unknown error')}")
            print()
        
        execution_time = (datetime.now() - start_time).total_seconds()
        print(f"🏁 Workflow completed in {execution_time:.2f}s")
        
        return True
        
    except Exception as e:
        print(f"❌ Workflow failed: {str(e)}")
        return False

async def test_universal_api_integration():
    """
    Test Universal API integration:
    Research an API → Configure it → Execute it
    """
    print("\n🌐 NODAI Universal API Test")
    print("=" * 40)
    
    user_id = "f31db8d3-7b54-46b5-bebf-1ea7b6b2edff"
    context = await create_execution_context(user_id=user_id)
    
    workflow_data = {
        "nodes": [
            {
                "nodeId": "trigger-1",
                "type": "trigger", 
                "data": {"triggerType": "manual"}
            },
            {
                "nodeId": "api-research",
                "type": "tool",
                "data": {
                    "tool_type": "universal_api",
                    "framework": "universal_api",
                    "label": "API Research Tool",
                    "api_service_name": "JSONPlaceholder",
                    "ai_description": "Get sample user data from JSONPlaceholder API",
                    "api_endpoint_hint": "https://jsonplaceholder.typicode.com/users"
                }
            },
            {
                "nodeId": "output-1",
                "type": "output",
                "data": {"outputType": "json"}
            }
        ],
        "edges": [
            {"source": "trigger-1", "target": "api-research"},
            {"source": "api-research", "target": "output-1"}
        ]
    }
    
    runner = UnifiedRunner()
    
    try:
        async for result in runner.execute_workflow(workflow_data, user_id):
            node_id = result.get('node_id', 'unknown')
            success = result.get('success', False)
            status_icon = "✅" if success else "❌"
            
            print(f"{status_icon} {node_id}: {result.get('type', 'unknown')}")
            
            if result.get('data'):
                print(f"   📊 Data: {json.dumps(result['data'], indent=2)[:200]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ Universal API test failed: {str(e)}")
        return False

async def test_multi_framework_workflow():
    """
    Test multiple frameworks in one workflow:
    CrewAI → LangChain → HuggingFace
    """
    print("\n🤖 NODAI Multi-Framework Test")
    print("=" * 40)
    
    user_id = "f31db8d3-7b54-46b5-bebf-1ea7b6b2edff"
    context = await create_execution_context(user_id=user_id)
    
    workflow_data = {
        "nodes": [
            {
                "nodeId": "trigger-1",
                "type": "trigger",
                "data": {"triggerType": "manual"}
            },
            {
                "nodeId": "langchain-analysis",
                "type": "tool",
                "data": {
                    "tool_type": "llm",
                    "framework": "langchain",
                    "label": "LangChain Analysis",
                    "frameworkConfig": {
                        "provider": "perplexity",
                        "model": "llama-3.1-sonar-small-128k-online",
                        "temperature": 0.5,
                        "chainType": "simple"
                    },
                    "prompt": "Analyze this topic from a technical perspective: AI in Healthcare"
                }
            },
            {
                "nodeId": "output-1",
                "type": "output",
                "data": {"outputType": "text"}
            }
        ],
        "edges": [
            {"source": "trigger-1", "target": "langchain-analysis"},
            {"source": "langchain-analysis", "target": "output-1"}
        ]
    }
    
    runner = UnifiedRunner()
    
    try:
        async for result in runner.execute_workflow(workflow_data, user_id):
            node_id = result.get('node_id', 'unknown')
            success = result.get('success', False)
            status_icon = "✅" if success else "❌"
            
            print(f"{status_icon} {node_id}: {result.get('type', 'unknown')}")
            
            if result.get('data'):
                output = str(result['data'])
                preview = output[:100] + "..." if len(output) > 100 else output
                print(f"   📄 Output: {preview}")
        
        return True
        
    except Exception as e:
        print(f"❌ Multi-framework test failed: {str(e)}")
        return False

async def run_all_tests():
    """Run the complete NODAI test suite"""
    print("🚀 NODAI COMPLETE TEST SUITE")
    print("=" * 80)
    print("Testing the full capabilities of your AI workflow platform")
    print("=" * 80)
    
    tests = [
        ("Complete AI Workflow", test_complete_ai_workflow),
        ("Universal API Integration", test_universal_api_integration), 
        ("Multi-Framework Support", test_multi_framework_workflow)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n🧪 Running: {test_name}")
        print("-" * 50)
        
        try:
            result = await test_func()
            results.append((test_name, result))
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"📊 {test_name}: {status}")
        except Exception as e:
            results.append((test_name, False))
            print(f"📊 {test_name}: ❌ FAILED - {str(e)}")
    
    # Final summary
    print("\n" + "=" * 80)
    print("🏆 NODAI TEST RESULTS SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status} {test_name}")
    
    print(f"\n📊 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! NODAI IS READY FOR LAUNCH! 🚀")
    else:
        print(f"⚠️  {total - passed} tests need attention")
    
    return passed == total

if __name__ == "__main__":
    asyncio.run(run_all_tests()) 