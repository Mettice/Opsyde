import sys
import asyncio
import json
sys.path.append('backend')

async def test_first_run_detection():
    from nodes.trigger_node import process_trigger_node
    from services.data_state_manager import data_state_manager
    
    print('🚀 Testing First Run Detection and Initial Data Passing')
    print('=' * 60)
    
    # Configure for the active token boosts API
    test_trigger_config = {
        "triggerType": "universal_polling",
        "serviceName": "DexScreener",
        "apiEndpoint": "https://api.dexscreener.com/token-boosts/top/v1",
        "pollingInterval": 60,
        "authType": "none",
        "changeDetectionMethod": "smart",
        "nodeId": "test-first-run-trigger",
        "summaryMode": True,
        "maxRecords": 3,  # Small number for testing
        "maxTokens": 1000,
        "passInitialData": True  # Explicitly enable initial data passing
    }
    
    print(f'📊 Test Configuration:')
    print(f'   Service: {test_trigger_config.get("serviceName")}')
    print(f'   Endpoint: {test_trigger_config.get("apiEndpoint")}')
    print(f'   Max Records: {test_trigger_config.get("maxRecords")}')
    print(f'   Pass Initial Data: {test_trigger_config.get("passInitialData")}')
    print()
    
    # Clear any existing state for this test trigger
    await data_state_manager.initialize()
    
    # Test first run
    print('🔄 === FIRST RUN TEST ===')
    result1 = await process_trigger_node(test_trigger_config, {}, {})
    
    print(f'Status: {result1.get("status")}')
    print(f'Message: {result1.get("message")}')
    print(f'Type: {result1.get("type")}')
    print(f'Is Initial Data: {result1.get("is_initial_data", False)}')
    
    if result1.get('api_data'):
        api_data = result1.get('api_data')
        records_count = len(api_data.get("records", []))
        print(f'📦 Records Passed to Agent: {records_count}')
        
        if api_data.get('change_detection'):
            cd = api_data.get('change_detection')
            print(f'🔍 Change Detection: {cd.get("enabled")}')
            print(f'🚀 Initial Data Flag: {cd.get("is_initial_data")}')
            print(f'📊 Initial Records Count: {cd.get("initial_records")}')
    
    print()
    
    # Test second run (should show no changes)
    print('🔄 === SECOND RUN TEST ===')
    result2 = await process_trigger_node(test_trigger_config, {}, {})
    
    print(f'Status: {result2.get("status")}')
    print(f'Message: {result2.get("message")}')
    print(f'Type: {result2.get("type")}')
    
    if result2.get('summary'):
        summary = result2.get('summary')
        print(f'📊 Summary: {summary}')
    
    print()
    print('🎉 First Run Detection Test Complete!')
    
    if result1.get('type') == 'api_data' and result1.get('is_initial_data'):
        print('✅ SUCCESS: First run correctly passed initial data to agent')
    else:
        print('❌ ISSUE: First run did not pass data to agent')
    
    if result2.get('type') == 'no_changes':
        print('✅ SUCCESS: Second run correctly detected no changes')
    else:
        print('❌ ISSUE: Second run should have detected no changes')

if __name__ == "__main__":
    asyncio.run(test_first_run_detection()) 