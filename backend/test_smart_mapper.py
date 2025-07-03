#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Test just the smart mapper without importing node configs
def test_smart_mapper_basic():
    print("Testing SmartMapper basic functionality...")
    
    try:
        from core.smart_mapper import SmartMapper
        print("✅ SmartMapper imported successfully")
        
        mapper = SmartMapper()
        
        # Test with a mock node
        mock_node = {
            "id": "test-agent",
            "type": "agent",
            "data": {
                "label": "Test Agent",
                "description": "Test agent for smart mapping"
            }
        }
        
        mock_context = {
            "variables": {
                "user_input": "Find travel deals",
                "context": {"location": "Europe"}
            },
            "previous_outputs": {
                "input-1": {"result": "Travel query", "type": "input_result"}
            }
        }
        
        expected_inputs = mapper._get_expected_inputs(mock_node, mock_context)
        print(f"✅ SmartMapper._get_expected_inputs returned: {expected_inputs}")
        
        if expected_inputs:
            print(f"   Expected inputs: {list(expected_inputs.keys())}")
        else:
            print(f"   No expected inputs found - this means smart mapping failed")
            
    except Exception as e:
        print(f"❌ SmartMapper test failed: {e}")
        import traceback
        traceback.print_exc()

def test_simple_mapper_fallback():
    print("\nTesting SimpleMapper fallback...")
    
    try:
        from core.simple_mapper import SimpleMapper
        print("✅ SimpleMapper imported successfully")
        
        simple_mapper = SimpleMapper()
        
        # Test data
        test_data = {
            "input-1": {
                "result": "Travel query",
                "type": "input_result",
                "metadata": {"timestamp": "2025-01-01"}
            },
            "agent-1": {
                "result": "Found 5 travel deals",
                "type": "agent_result",
                "agent_name": "Travel Agent"
            }
        }
        
        available_fields = simple_mapper.get_available_fields(test_data)
        print(f"✅ SimpleMapper.get_available_fields returned: {available_fields}")
        
        if available_fields:
            print(f"   Available fields: {list(available_fields.keys())}")
        else:
            print(f"   No available fields found")
            
    except Exception as e:
        print(f"❌ SimpleMapper test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_smart_mapper_basic()
    test_simple_mapper_fallback() 