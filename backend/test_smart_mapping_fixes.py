"""
Quick validation test for Smart Mapping fixes
Tests the specific failed cases from the comprehensive test
"""

import asyncio
import sys
sys.path.append('.')

from core.smart_mapper import smart_map_inputs

async def test_fixes():
    print("🔧 Testing Smart Mapping Fixes...")
    
    # Test context with all the variables the failed tests expect
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
        }
    }
    
    # Test the previously failing node types
    test_cases = [
        {
            "name": "Chat Node (Previously Failed)",
            "node": {
                'id': 'chat-1',
                'type': 'chat',
                'data': {"prompt": "Chat with user"}
            },
            "expected": ['message', 'conversation_history']
        },
        {
            "name": "Output Node (Previously Failed)",
            "node": {
                'id': 'output-1',
                'type': 'output',
                'data': {"output_type": "webhook"}
            },
            "expected": ['data', 'content']
        },
        {
            "name": "Delay Node (Previously Failed)",
            "node": {
                'id': 'delay-1',
                'type': 'delay',
                'data': {"duration": 5}
            },
            "expected": ['trigger_data']
        }
    ]
    
    all_passed = True
    
    for test_case in test_cases:
        try:
            result = await smart_map_inputs(test_case["node"], context)
            
            # Check if all expected inputs were mapped
            expected_set = set(test_case["expected"])
            actual_set = set(result.keys())
            
            if expected_set.issubset(actual_set):
                print(f"   ✅ {test_case['name']}: All inputs mapped ({list(result.keys())})")
            else:
                missing = expected_set - actual_set
                print(f"   ❌ {test_case['name']}: Missing {missing}")
                all_passed = False
                
        except Exception as e:
            print(f"   ❌ {test_case['name']}: Error - {str(e)}")
            all_passed = False
    
    if all_passed:
        print("\n🎉 All fixes working! The failed tests should now pass.")
    else:
        print("\n⚠️ Some issues remain. Need further investigation.")

if __name__ == "__main__":
    asyncio.run(test_fixes()) 