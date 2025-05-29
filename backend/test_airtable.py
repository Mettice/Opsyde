#!/usr/bin/env python3
"""
Test Airtable Universal Polling
"""
import requests
import json
import pytest
import asyncio
from backend.nodes.trigger_node import process_trigger_node, run_trigger_node

def test_airtable_polling():
    print("🔧 Creating Airtable polling trigger...")
    
    # NOTE: You'll need to replace these with your actual Airtable details:
    # - BASE_ID: Get from your Airtable URL (starts with 'app...')
    # - TABLE_NAME: The name of your table
    
    trigger_data = {
        'trigger_id': 'airtable-live-test',
        'flow': {
            'trigger_type': 'universal_polling',
            'nodes': [
                {
                    'id': 'airtable-live-test',
                    'data': {
                        'triggerType': 'universal_polling',
                        'serviceName': 'Airtable',
                        'apiEndpoint': 'https://api.airtable.com/v0/appYourBaseId/YourTableName',  # Replace with real values
                        'pollingInterval': '60',  # Poll every 60 seconds
                        'authType': 'api_key',
                        'apiKey': 'pataiOWBHqj97O1Zp.270409a7145ebe0d63c12918d35d52e739c9',
                        'changeDetectionMethod': 'response_hash'
                    }
                }
            ],
            'edges': []
        },
        'owner': 'airtable_user'
    }
    
    try:
        # Register the trigger
        response = requests.post('http://localhost:8000/api/triggers/register', json=trigger_data)
        print(f"Registration status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Trigger registered successfully!")
            
            # Check scheduler
            r2 = requests.get('http://localhost:8000/debug/scheduler')
            scheduler_data = r2.json()
            print(f"Jobs in scheduler: {scheduler_data['total_jobs']}")
            
            if scheduler_data.get('jobs'):
                print("Active jobs:")
                for job in scheduler_data['jobs']:
                    print(f"  - {job['id']}: next run at {job.get('next_run_time', 'unknown')}")
        else:
            print(f"❌ Registration failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

@pytest.mark.asyncio
async def test_universal_polling_trigger():
    """Test the universal polling trigger functionality"""
    print("🔧 Testing Universal Polling Trigger...")
    
    # Test data for universal polling trigger
    node_data = {
        'triggerType': 'universal_polling',
        'serviceName': 'JSONPlaceholder Test API',
        'apiEndpoint': 'https://jsonplaceholder.typicode.com/posts',
        'pollingInterval': 300,
        'authType': 'none',
        'changeDetectionMethod': 'array_length',
        'nodeId': 'test-universal-polling',
        'label': 'Test Universal Polling Trigger'
    }
    
    inputs = {}
    context = {}
    
    try:
        # Test the async trigger processor
        result = await process_trigger_node(node_data, inputs, context)
        
        print(f"✅ Async trigger processor result: {result}")
        
        # Verify the result structure
        assert result is not None, "Result should not be None"
        
        # Check if it's a NodeData object with proper structure
        if hasattr(result, 'value'):
            result_value = result.value
        else:
            result_value = result
            
        assert isinstance(result_value, dict), "Result should be a dictionary"
        assert 'trigger_type' in result_value, "Result should contain trigger_type"
        assert result_value['trigger_type'] == 'universal_polling', "Trigger type should be universal_polling"
        assert 'service_name' in result_value, "Result should contain service_name"
        assert result_value['service_name'] == 'JSONPlaceholder Test API', "Service name should match"
        
        # Test the sync trigger processor for backward compatibility
        sync_result = run_trigger_node(node_data)
        print(f"✅ Sync trigger processor result: {sync_result}")
        
        assert sync_result is not None, "Sync result should not be None"
        assert isinstance(sync_result, dict), "Sync result should be a dictionary"
        assert 'trigger_type' in sync_result, "Sync result should contain trigger_type"
        assert sync_result['trigger_type'] == 'universal_polling', "Sync trigger type should be universal_polling"
        
        print("✅ All universal polling trigger tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        pytest.fail(f"Universal polling trigger test failed: {str(e)}")

def test_universal_polling_trigger_sync():
    """Test the universal polling trigger functionality synchronously"""
    print("🔧 Testing Universal Polling Trigger (Sync)...")
    
    # Test data for universal polling trigger
    node_data = {
        'triggerType': 'universal_polling',
        'serviceName': 'JSONPlaceholder Test API',
        'apiEndpoint': 'https://jsonplaceholder.typicode.com/posts',
        'pollingInterval': 300,
        'authType': 'none',
        'changeDetectionMethod': 'array_length',
        'nodeId': 'test-universal-polling-sync',
        'label': 'Test Universal Polling Trigger Sync'
    }
    
    try:
        # Test the sync trigger processor
        result = run_trigger_node(node_data)
        print(f"✅ Sync trigger processor result: {result}")
        
        assert result is not None, "Result should not be None"
        assert isinstance(result, dict), "Result should be a dictionary"
        assert 'trigger_type' in result, "Result should contain trigger_type"
        assert result['trigger_type'] == 'universal_polling', "Trigger type should be universal_polling"
        assert 'service_name' in result, "Result should contain service_name"
        assert result['service_name'] == 'JSONPlaceholder Test API', "Service name should match"
        
        # Check if API data was fetched
        if 'api_data' in result:
            print(f"✅ API data successfully fetched: {len(result['api_data'])} items")
            assert isinstance(result['api_data'], list), "API data should be a list"
            assert len(result['api_data']) > 0, "API data should not be empty"
        else:
            print("ℹ️ API data not fetched (may be expected for some configurations)")
        
        print("✅ Sync universal polling trigger test passed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        pytest.fail(f"Sync universal polling trigger test failed: {str(e)}")

if __name__ == "__main__":
    test_airtable_polling()
    
    # Run the sync test
    test_universal_polling_trigger_sync()
    
    # Run the async test
    asyncio.run(test_universal_polling_trigger()) 