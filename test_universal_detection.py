import asyncio
import sys
sys.path.append('backend')
from backend.services.trigger_service import TriggerService

def test_universal_detection():
    """Test the universal array and field detection system with various API formats"""
    
    trigger_service = TriggerService()
    
    # Test data from different APIs
    test_cases = [
        {
            'name': 'DexScreener API',
            'data': {
                'schemaVersion': '1.0.0',
                'pairs': [
                    {'baseToken': {'symbol': 'PEPE'}, 'priceUsd': '0.00001234'},
                    {'baseToken': {'symbol': 'DOGE'}, 'priceUsd': '0.08765'}
                ]
            },
            'trigger_data': {'serviceName': 'DexScreener'},
            'expected_array': 'pairs'
        },
        {
            'name': 'Airtable API',
            'data': {
                'records': [
                    {'id': 'rec123', 'fields': {'Name': 'John', 'Status': 'Active'}},
                    {'id': 'rec456', 'fields': {'Name': 'Jane', 'Status': 'Pending'}}
                ],
                'offset': 'itr123'
            },
            'trigger_data': {'serviceName': 'Airtable'},
            'expected_array': 'records'
        },
        {
            'name': 'GitHub API',
            'data': {
                'total_count': 42,
                'incomplete_results': False,
                'items': [
                    {'id': 1, 'title': 'Bug fix', 'state': 'open'},
                    {'id': 2, 'title': 'Feature request', 'state': 'closed'}
                ]
            },
            'trigger_data': {'serviceName': 'GitHub'},
            'expected_array': 'items'
        },
        {
            'name': 'Slack API',
            'data': {
                'ok': True,
                'messages': [
                    {'type': 'message', 'text': 'Hello world', 'ts': '1234567890.123456'},
                    {'type': 'message', 'text': 'How are you?', 'ts': '1234567891.123456'}
                ],
                'has_more': False
            },
            'trigger_data': {'serviceName': 'Slack'},
            'expected_array': 'messages'
        },
        {
            'name': 'Custom API with nested arrays',
            'data': {
                'status': 'success',
                'response': {
                    'data': [
                        {'id': 1, 'name': 'Item 1'},
                        {'id': 2, 'name': 'Item 2'}
                    ]
                },
                'metadata': {'count': 2}
            },
            'trigger_data': {'serviceName': 'Custom API'},
            'expected_array': 'response.data'
        }
    ]
    
    print("🧪 Testing Universal Array Detection System\n")
    
    for test_case in test_cases:
        print(f"📊 Testing: {test_case['name']}")
        
        # Test array detection
        detected_array = trigger_service._detect_main_array_field(
            test_case['data'], 
            test_case['trigger_data']
        )
        
        print(f"   Expected: {test_case['expected_array']}")
        print(f"   Detected: {detected_array}")
        
        if detected_array == test_case['expected_array']:
            print("   ✅ PASS - Correct array detected")
        else:
            print("   ❌ FAIL - Wrong array detected")
        
        # Test field detection
        detected_field = trigger_service._detect_important_field(
            test_case['data'],
            test_case['trigger_data']
        )
        
        print(f"   Important field detected: {detected_field}")
        print()
    
    print("🎯 Testing Field Scoring System\n")
    
    # Test field scoring
    field_test_cases = [
        {'field': 'status', 'value': 'active', 'pattern': 'status', 'service': 'generic'},
        {'field': 'updated_at', 'value': '2024-01-01T12:00:00Z', 'pattern': 'updated_at', 'service': 'github'},
        {'field': 'count', 'value': 42, 'pattern': 'count', 'service': 'generic'},
        {'field': 'enabled', 'value': True, 'pattern': 'enabled', 'service': 'generic'}
    ]
    
    for field_test in field_test_cases:
        score = trigger_service._score_field_importance(
            field_test['field'],
            field_test['value'],
            field_test['pattern'],
            field_test['service']
        )
        print(f"Field '{field_test['field']}' (value: {field_test['value']}) scored: {score}")
    
    print("\n🚀 Universal Detection System Test Complete!")

if __name__ == "__main__":
    test_universal_detection() 