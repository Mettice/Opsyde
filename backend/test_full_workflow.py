#!/usr/bin/env python3
"""
🚀 Full Workflow Execution Test
Tests complete workflow execution with Supabase and BYOK integration
"""

import asyncio
import logging
import json
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_full_workflow():
    """Test a complete workflow execution with Perplexity API"""
    
    print("🚀 Starting Full Workflow Execution Test")
    print("=" * 60)
    
    try:
        # Import the unified runner
        from core.runner import UnifiedRunner
        
        # Create a workflow that exactly matches the frontend structure
        test_workflow = {
            "id": "test-frontend-workflow",
            "name": "Frontend-Style Workflow",
            "description": "Test workflow matching frontend structure",
            "nodes": [
                {
                    "id": "agent-1748846520573",
                    "type": "agent",
                    "position": {"x": 300, "y": 100},
                    "data": {
                        "label": "New Agent",
                        "role": "Assistant",
                        "goal": "Help the user with their task",
                        "backstory": "I am an AI assistant.",
                        "framework": "crewai",  # Top-level framework is crewai
                        "frameworkConfig": {
                            "provider": "perplexity",  # But provider is perplexity
                            "model": "sonar-pro",
                            "temperature": 0.7,
                            "max_tokens": 4000
                            # Note: NO api_key field initially - this should be injected
                        },
                        "allowDelegation": False,
                        "enableMemory": False,
                        "verbose": True
                    }
                }
            ],
            "edges": []
        }
        
        print("📋 Test Workflow Created:")
        print(f"   - Nodes: {len(test_workflow['nodes'])}")
        print(f"   - Edges: {len(test_workflow['edges'])}")
        print(f"   - Framework: Perplexity (sonar-pro model)")
        print()
        
        # Initialize the runner
        print("🔧 Initializing UnifiedRunner...")
        runner = UnifiedRunner()
        
        # Execute the workflow with user context
        user_id = "anonymous"  # This should load the Perplexity API key from Supabase
        
        print(f"🚀 Executing workflow for user: {user_id}")
        print("⏳ This may take a few moments...")
        print()
        
        start_time = datetime.now()
        
        # Execute the workflow (it returns an AsyncGenerator)
        results = []
        node_results = {}
        success = True
        error_message = None
        
        async for result in runner.execute_workflow(
            workflow_data=test_workflow,
            user_id=user_id
        ):
            results.append(result)
            
            # Track node results
            if "node_id" in result and "result" in result:
                node_results[result["node_id"]] = result["result"]
            
            # Check for errors
            if result.get("type") == "error" or result.get("error"):
                success = False
                error_message = result.get("error", "Unknown error")
                print(f"❌ Error in {result.get('node_id', 'unknown')}: {error_message}")
            else:
                print(f"✅ Completed {result.get('node_id', 'unknown')} ({result.get('node_type', 'unknown')})")
        
        execution_time = (datetime.now() - start_time).total_seconds()
        
        # Create final result object
        final_result = {
            "success": success,
            "node_results": node_results,
            "execution_metadata": {
                "total_nodes": len(test_workflow["nodes"]),
                "successful_nodes": len([r for r in results if not r.get("error")]),
                "failed_nodes": len([r for r in results if r.get("error")]),
                "execution_time": execution_time
            }
        }
        
        if error_message:
            final_result["error"] = error_message
        
        print("=" * 60)
        print("🎯 WORKFLOW EXECUTION RESULTS")
        print("=" * 60)
        
        print(f"⏱️  Execution Time: {execution_time:.2f} seconds")
        print(f"✅ Status: {'SUCCESS' if final_result['success'] else 'FAILED'}")
        
        if final_result['success']:
            print("🎉 Workflow executed successfully!")
            
            # Display node results
            if 'node_results' in final_result:
                print("\n📊 Node Results:")
                for node_id, node_result in final_result['node_results'].items():
                    print(f"   🔹 {node_id}: {type(node_result).__name__}")
                    if hasattr(node_result, 'value') and node_result.value:
                        # Truncate long outputs for readability
                        output_str = str(node_result.value)
                        if len(output_str) > 200:
                            output_str = output_str[:200] + "..."
                        print(f"      Output: {output_str}")
            
            # Check if Perplexity API was used
            if 'execution_metadata' in final_result:
                metadata = final_result['execution_metadata']
                print(f"\n🔍 Execution Metadata:")
                print(f"   - Total Nodes: {metadata.get('total_nodes', 'N/A')}")
                print(f"   - Successful Nodes: {metadata.get('successful_nodes', 'N/A')}")
                print(f"   - Failed Nodes: {metadata.get('failed_nodes', 'N/A')}")
        
        else:
            print("❌ Workflow execution failed!")
            if 'error' in final_result:
                print(f"   Error: {final_result['error']}")
            if 'node_results' in final_result:
                print("\n🔍 Node Results (for debugging):")
                for node_id, node_result in final_result['node_results'].items():
                    print(f"   🔹 {node_id}: {type(node_result).__name__}")
                    if hasattr(node_result, 'error') and node_result.error:
                        print(f"      Error: {node_result.error}")
        
        print("\n" + "=" * 60)
        print("🏁 Test Completed")
        
        return final_result
        
    except Exception as e:
        print(f"❌ Test failed with exception: {str(e)}")
        logger.error(f"Full workflow test failed: {str(e)}", exc_info=True)
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    asyncio.run(test_full_workflow()) 