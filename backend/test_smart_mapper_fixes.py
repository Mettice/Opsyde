#!/usr/bin/env python3
"""
Enhanced Test script to verify Smart Mapper fixes and new features
Tests the specific validation errors that were occurring
"""

import asyncio
import sys
import os
sys.path.append('.')

from core.smart_mapper import smart_map_inputs
from core.workflow_data_manager import get_workflow_context

async def test_smart_mapper_fixes():
    print("🔧 Testing Smart Mapper Fixes...")
    
    # Test context with sample data
    context = {
        'variables': {
            'user_query': 'Test query',
            'input_data': {'key': 'value'},
            'message': 'Hello world',
            'content': 'Test content',
            'value': 150,
            'trigger_data': 'trigger info',
            'conversation_history': ['msg1', 'msg2'],
            'data': 'test data'
        },
        'previous_outputs': {
            'input-1': {
                'data': 'Sample input data',
                'node_type': 'input',
                'timestamp': '2024-01-01T00:00:00'
            },
            'agent-1': {
                'data': 'Agent response here',
                'node_type': 'agent',
                'timestamp': '2024-01-01T00:01:00'
            }
        }
    }
    
    # Test nodes with different configurations
    test_nodes = [
        {
            'id': 'agent-1',
            'type': 'agent',
            'data': {
                'role': 'Test Agent',
                'goal': 'Test goal',
                'backstory': 'Test backstory',
                'label': 'Test Agent',
                'description': 'Test description'
            }
        },
        {
            'id': 'task-1',
            'type': 'task',
            'data': {
                'prompt': 'Test task',
                'goal': 'Test task goal',
                'label': 'Test Task',
                'description': 'Test task description'
            }
        },
        {
            'id': 'tool-1',
            'type': 'tool',
            'data': {
                'toolType': 'api',
                'framework': 'api',
                'label': 'Test Tool',
                'description': 'Test tool description'
            }
        },
        {
            'id': 'input-1',
            'type': 'input',
            'data': {
                'input_type': 'text',
                'label': 'Test Input',
                'description': 'Test input description'
            }
        },
        {
            'id': 'output-1',
            'type': 'output',
            'data': {
                'output_type': 'console',
                'label': 'Test Output',
                'description': 'Test output description'
            }
        },
        {
            'id': 'logic-1',
            'type': 'logic',
            'data': {
                'condition': 'equals',
                'label': 'Test Logic',
                'description': 'Test logic description'
            }
        },
        {
            'id': 'delay-1',
            'type': 'delay',
            'data': {
                'duration': '5s',
                'label': 'Test Delay',
                'description': 'Test delay description'
            }
        }
    ]
    
    print("\n🧪 Testing each node type...")
    
    for node in test_nodes:
        try:
            print(f"\n📋 Testing {node['type']} node: {node['id']}")
            
            # Test smart mapping
            mapped_inputs = await smart_map_inputs(node, context)
            
            if mapped_inputs:
                print(f"✅ {node['type']} node: Smart mapping successful")
                print(f"   Mapped inputs: {list(mapped_inputs.keys())}")
            else:
                print(f"⚠️ {node['type']} node: No inputs mapped (this might be normal for some nodes)")
                
        except Exception as e:
            print(f"❌ {node['type']} node: Error - {str(e)}")
    
    # Test workflow data manager
    print("\n🔄 Testing Workflow Data Manager...")
    try:
        workflow_context = get_workflow_context("test-workflow")
        
        # Register some test outputs
        workflow_context.register_node_output("test-agent", "agent", "Test agent output")
        workflow_context.register_node_output("test-task", "task", "Test task output")
        
        # Get execution summary
        summary = workflow_context.get_execution_summary()
        print(f"✅ Workflow Data Manager: {summary['metadata']['completed_nodes']} nodes completed")
        print(f"   Available variables: {len(summary['available_variables'])}")
        print(f"   Performance metrics: {summary['performance_metrics']}")
        
    except Exception as e:
        print(f"❌ Workflow Data Manager: Error - {str(e)}")
    
    # Test error recovery scenarios
    print("\n🛡️ Testing Error Recovery...")
    
    # Test with invalid node type
    invalid_node = {
        'id': 'invalid-1',
        'type': 'invalid_type',
        'data': {}
    }
    
    try:
        mapped_inputs = await smart_map_inputs(invalid_node, context)
        print(f"✅ Invalid node type: Handled gracefully")
    except Exception as e:
        print(f"❌ Invalid node type: Error - {str(e)}")
    
    # Test with empty context
    empty_context = {}
    
    try:
        mapped_inputs = await smart_map_inputs(test_nodes[0], empty_context)
        print(f"✅ Empty context: Handled gracefully")
    except Exception as e:
        print(f"❌ Empty context: Error - {str(e)}")
    
    print("\n🎉 All tests completed!")

if __name__ == "__main__":
    asyncio.run(test_smart_mapper_fixes()) 