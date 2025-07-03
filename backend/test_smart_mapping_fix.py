#!/usr/bin/env python3
"""
Test script to verify smart mapping fix works with workflow execution
"""

import asyncio
import json
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_smart_mapping_fix():
    """Test that smart mapping works without 'Context must be a dictionary' errors"""
    print("🧪 Testing Smart Mapping Fix with Workflow Execution")
    print("=" * 60)
    
    try:
        from core.runner import UnifiedRunner
        
        # Create a simple workflow with input and agent nodes
        workflow_data = {
            'nodes': [
                {
                    'id': 'input-1',
                    'type': 'input',
                    'data': {
                        'label': 'Test Input',
                        'input_type': 'text'
                    }
                },
                {
                    'id': 'agent-1',
                    'type': 'agent',
                    'data': {
                        'label': 'Test Agent',
                        'role': 'Test Role',
                        'goal': 'Test Goal',
                        'framework': 'crewai'
                    }
                }
            ],
            'edges': [
                {
                    'id': 'edge-1',
                    'source': 'input-1',
                    'target': 'agent-1'
                }
            ]
        }
        
        print("✅ Workflow data created")
        
        # Create runner and execute workflow
        runner = UnifiedRunner()
        print("✅ Runner created")
        
        # Execute workflow
        results = []
        async for result in runner.execute_workflow(workflow_data):
            results.append(result)
            print(f"📊 Result: {result.get('type', 'unknown')} - {result.get('node_id', 'unknown')}")
            
            # Check for smart mapping errors
            if 'error' in result and result['error']:
                error_msg = result['error']
                if 'Context must be a dictionary' in error_msg:
                    print(f"❌ SMART MAPPING ERROR FOUND: {error_msg}")
                    return False
                else:
                    print(f"⚠️ Other error: {error_msg}")
        
        print(f"✅ Workflow completed with {len(results)} results")
        print("✅ No smart mapping errors found!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_smart_mapping_fix())
    if success:
        print("\n🎉 Smart mapping fix is working correctly!")
    else:
        print("\n💥 Smart mapping fix needs more work!")
        sys.exit(1) 