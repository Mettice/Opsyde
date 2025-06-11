"""
Test script for Smart Mapping System
"""

import asyncio
import sys
import os
sys.path.append('.')

from core.smart_mapper import smart_map_inputs

async def test_smart_mapping():
    print('🧠 Testing Smart Mapping System...')
    
    # Test node configuration
    agent_node = {
        'id': 'agent-1',
        'type': 'agent',
        'data': {
            'role': 'Research Assistant',
            'goal': 'Analyze data and provide insights'
        }
    }
    
    # Test context with variables
    context = {
        'variables': {
            'user_input': 'Analyze the latest sales data',
            'data_source': 'Q4 2024 Sales Report',
            'background_info': 'Company is looking to optimize sales strategy',
            'previous_analysis': {'trend': 'upward', 'confidence': 0.85}
        }
    }
    
    # Test smart mapping
    mapped_inputs = await smart_map_inputs(agent_node, context)
    
    print('✅ Smart Mapping Results:')
    print(f'   📥 Mapped {len(mapped_inputs)} inputs')
    for key, value in mapped_inputs.items():
        print(f'   • {key}: {type(value).__name__} - {str(value)[:50]}...')
    
    print('\n🎯 Testing with different node types...')
    
    # Test tool node
    tool_node = {
        'id': 'tool-1', 
        'type': 'tool',
        'data': {'tool_type': 'api'}
    }
    
    tool_mapped = await smart_map_inputs(tool_node, context)
    print(f'   🔧 Tool node mapped {len(tool_mapped)} inputs')
    
    # Test output node
    output_node = {
        'id': 'output-1',
        'type': 'output', 
        'data': {'output_type': 'webhook'}
    }
    
    output_mapped = await smart_map_inputs(output_node, context)
    print(f'   📤 Output node mapped {len(output_mapped)} inputs')
    
    print('\n🚀 Smart Mapping Test Complete!')

if __name__ == "__main__":
    asyncio.run(test_smart_mapping()) 