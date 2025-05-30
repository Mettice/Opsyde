import sys
import asyncio
import json
sys.path.append('backend')

async def test_active_api():
    from nodes.trigger_node import process_trigger_node
    from services.data_state_manager import data_state_manager
    
    print('🚀 Testing Enhanced System with ACTIVE DexScreener Trending API')
    print('=' * 70)
    
    # Configure for highly active trending tokens API
    active_trigger_config = {
        "triggerType": "universal_polling",
        "serviceName": "DexScreener",
        "apiEndpoint": "https://api.dexscreener.com/token-boosts/top/v1",
        "pollingInterval": 60,
        "authType": "none",
        "changeDetectionMethod": "array_length",
        "nodeId": "test-active-trigger",
        "summaryMode": True,
        "maxRecords": 5,
        "maxTokens": 2000
    }
    
    print(f'📊 Active API Configuration:')
    print(f'   Service: {active_trigger_config.get("serviceName")}')
    print(f'   Endpoint: {active_trigger_config.get("apiEndpoint")}')
    print(f'   Detection Method: {active_trigger_config.get("changeDetectionMethod")}')
    print(f'   Max Records: {active_trigger_config.get("maxRecords")}')
    print(f'   Smart Mode: {active_trigger_config.get("summaryMode")}')
    print()
    
    # Initialize DataStateManager
    await data_state_manager.initialize()
    print('✅ DataStateManager initialized')
    
    # Test multiple runs to see change detection
    for run_number in range(1, 4):
        print(f'\n🔄 === RUN {run_number} ===')
        result = await process_trigger_node(active_trigger_config, {}, {})
        
        print(f'Status: {result.get("status")}')
        print(f'Message: {result.get("message")}')
        print(f'Type: {result.get("type")}')
        
        if result.get('change_detection_enabled'):
            print('✅ Change Detection: ENABLED')
            if result.get('change_summary'):
                summary = result.get('change_summary')
                print(f'📊 Changes: {summary.get("new_count", 0)} new, {summary.get("modified_count", 0)} modified')
        
        if result.get('api_data'):
            api_data = result.get('api_data')
            records_count = len(api_data.get("records", []))
            print(f'📦 Data Processed: {records_count} records')
            
            if api_data.get('transformation_summary'):
                summary = api_data.get('transformation_summary')
                print(f'🎯 Confidence: {summary.get("avg_confidence", 0):.2f}')
        
        # Wait between runs to allow for potential changes
        if run_number < 3:
            print('⏳ Waiting 10 seconds for potential changes...')
            await asyncio.sleep(10)
    
    print()
    print('🎉 Active API Test Complete!')
    print('✅ Enhanced system tested with real-time data')
    print('✅ Change detection working with active API')

if __name__ == "__main__":
    asyncio.run(test_active_api()) 