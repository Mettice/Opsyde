#!/usr/bin/env python3
"""
Test Airtable Universal Polling
"""
import requests
import json

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

if __name__ == "__main__":
    test_airtable_polling() 