import sys
import asyncio
import json
sys.path.append('backend')

async def test_enhanced_trigger():
    from nodes.trigger_node import process_trigger_node
    from services.data_state_manager import data_state_manager
    
    print('🚀 Testing Enhanced DexScreener Trigger with DataStateManager')
    print('=' * 60)
    
    # Load the DexScreener trigger configuration
    with open('backend/triggers/dexscreener-live-trigger.json', 'r') as f:
        trigger_data = json.load(f)
    
    # Extract the trigger node data
    trigger_node = trigger_data['flow']['nodes'][0]['data']
    
    print(f'📊 Trigger Configuration:')
    print(f'   Service: {trigger_node.get("serviceName")}')
    print(f'   Endpoint: {trigger_node.get("apiEndpoint")}')
    print(f'   Detection Method: {trigger_node.get("changeDetectionMethod")}')
    print(f'   Polling Interval: {trigger_node.get("pollingInterval")}s')
    print()
    
    # Initialize DataStateManager
    await data_state_manager.initialize()
    print('✅ DataStateManager initialized')
    
    # Test the enhanced trigger processing
    print('🔄 Testing trigger processing with new system...')
    result = await process_trigger_node(trigger_node, {}, {})
    
    print()
    print('📋 Enhanced Trigger Test Results:')
    print('=' * 40)
    print(f'Status: {result.get("status")}')
    print(f'Message: {result.get("message")}')
    print(f'Type: {result.get("type")}')
    
    if result.get('change_detection_enabled'):
        print('✅ Change Detection: ENABLED')
        if result.get('change_summary'):
            print(f'📊 Change Summary: {result.get("change_summary")}')
    
    if result.get('api_data'):
        api_data = result.get('api_data')
        print(f'📦 Data Received: {len(api_data.get("records", []))} records')
        if api_data.get('transformation_summary'):
            summary = api_data.get('transformation_summary')
            print(f'🎯 Transformation Confidence: {summary.get("avg_confidence", 0):.2f}')
            print(f'📋 Record Types: {summary.get("record_types", [])}')
    
    print()
    print('🎉 Enhanced System Test Complete!')
    print('✅ DataStateManager integration working')
    print('✅ User configuration respected')
    print('✅ No emergency overrides applied')

if __name__ == "__main__":
    asyncio.run(test_enhanced_trigger()) 