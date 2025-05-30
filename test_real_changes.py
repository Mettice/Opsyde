import sys
import asyncio
import json
sys.path.append('backend')

async def test_real_changes_detection():
    from nodes.trigger_node import process_trigger_node
    from services.data_state_manager import data_state_manager
    
    print('🚀 Testing Real Changes Detection with 1-Minute Wait')
    print('=' * 60)
    
    # Configure for the highly active token boosts API
    test_trigger_config = {
        "triggerType": "universal_polling",
        "serviceName": "DexScreener",
        "apiEndpoint": "https://api.dexscreener.com/token-boosts/top/v1",
        "pollingInterval": 60,
        "authType": "none",
        "changeDetectionMethod": "smart",
        "nodeId": "test-real-changes-trigger",
        "summaryMode": True,
        "maxRecords": 5,
        "maxTokens": 2000,
        "passInitialData": True
    }
    
    print(f'📊 Test Configuration:')
    print(f'   Service: {test_trigger_config.get("serviceName")}')
    print(f'   Endpoint: {test_trigger_config.get("apiEndpoint")}')
    print(f'   Max Records: {test_trigger_config.get("maxRecords")}')
    print(f'   Detection Method: {test_trigger_config.get("changeDetectionMethod")}')
    print()
    
    # Initialize DataStateManager
    await data_state_manager.initialize()
    
    # Test multiple runs with wait time
    for run_number in range(1, 4):
        print(f'🔄 === RUN {run_number} ===')
        
        result = await process_trigger_node(test_trigger_config, {}, {})
        
        print(f'Status: {result.get("status")}')
        print(f'Message: {result.get("message")}')
        print(f'Type: {result.get("type")}')
        
        if result.get('is_initial_data'):
            print(f'🚀 Initial Data: {result.get("is_initial_data")}')
        
        if result.get('api_data'):
            api_data = result.get('api_data')
            records_count = len(api_data.get("records", []))
            print(f'📦 Records Passed to Agent: {records_count}')
            
            if api_data.get('change_detection'):
                cd = api_data.get('change_detection')
                if cd.get('is_initial_data'):
                    print(f'🚀 Initial Records: {cd.get("initial_records")}')
                else:
                    print(f'🆕 New Records: {cd.get("new_records", 0)}')
                    print(f'🔄 Modified Records: {cd.get("modified_records", 0)}')
        
        if result.get('summary'):
            summary = result.get('summary')
            print(f'📊 Summary: new={summary.get("new_count", 0)}, modified={summary.get("modified_count", 0)}, total_processed={summary.get("total_processed", 0)}, current_total={summary.get("current_total", 0)}')
        
        # Wait 1 minute between runs (except for the last run)
        if run_number < 3:
            print(f'⏳ Waiting 60 seconds for potential changes in the active API...')
            await asyncio.sleep(60)
        
        print()
    
    print('🎉 Real Changes Detection Test Complete!')
    print()
    print('📋 Analysis:')
    print('- Run 1: Should pass initial data to agent')
    print('- Run 2: Should detect changes after 1 minute (token boosts are very active)')
    print('- Run 3: Should detect more changes after another minute')
    print()
    print('💡 If Run 2 and 3 show "no changes", there might be an issue with:')
    print('   1. DataStateManager being too aggressive in marking records as processed')
    print('   2. Change detection logic not properly identifying modifications')
    print('   3. API response structure not matching our expectations')

if __name__ == "__main__":
    asyncio.run(test_real_changes_detection()) 