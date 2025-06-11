#!/usr/bin/env python3
"""
Test the exact HTTP request format that the frontend sends
"""

import asyncio
import sys
import os
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app

async def test_frontend_request_format():
    """Test the exact request format that the frontend sends"""
    print("🧪 Testing Frontend Request Format")
    print("=" * 50)
    
    try:
        # Create test client
        client = TestClient(app)
        
        # Simulate the exact request that the frontend makes
        frontend_request = {
            "node": {
                "id": "test-node-123",
                "type": "agent",
                "data": {
                    "label": "Test Agent"
                }
            },
            "context": {
                "variables": {
                    "user_input": "Hello world",
                    "query": "Test query"
                }
            },
            "previous_outputs": {}
        }
        
        print("1. Testing direct endpoint call...")
        print(f"   📤 Request: {json.dumps(frontend_request, indent=2)}")
        
        # Make the request
        response = client.post(
            "/api/smart-mapping/map-inputs",
            json=frontend_request
        )
        
        print(f"   📥 Response Status: {response.status_code}")
        print(f"   📥 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Success! Response: {json.dumps(result, indent=2)}")
        else:
            print(f"   ❌ Error Response: {response.text}")
            
            # Try to get detailed error information
            try:
                error_detail = response.json()
                print(f"   📋 Error Detail: {json.dumps(error_detail, indent=2)}")
            except:
                print(f"   📋 Raw Error Text: {response.text}")
        
        print("\n2. Testing with different node types...")
        
        # Test different node types
        node_types = ['agent', 'task', 'tool', 'chat', 'output']
        for node_type in node_types:
            test_request = {
                "node": {
                    "id": f"test-{node_type}",
                    "type": node_type,
                    "data": {"label": f"Test {node_type.title()}"}
                },
                "context": {
                    "variables": {"test_input": "test value"}
                },
                "previous_outputs": {}
            }
            
            response = client.post("/api/smart-mapping/map-inputs", json=test_request)
            status = "✅" if response.status_code == 200 else "❌"
            print(f"   {status} {node_type}: {response.status_code}")
            
            if response.status_code != 200:
                try:
                    error = response.json()
                    print(f"      Error: {error.get('detail', 'Unknown error')}")
                except:
                    print(f"      Error: {response.text[:100]}...")
        
        print("\n3. Testing edge cases...")
        
        # Test with minimal data
        minimal_request = {
            "node": {"id": "minimal", "type": "agent"},
            "context": {"variables": {}},
            "previous_outputs": {}
        }
        
        response = client.post("/api/smart-mapping/map-inputs", json=minimal_request)
        status = "✅" if response.status_code == 200 else "❌"
        print(f"   {status} Minimal request: {response.status_code}")
        
        # Test with missing fields
        incomplete_request = {
            "node": {"id": "incomplete"},  # Missing type
            "context": {"variables": {}},
            "previous_outputs": {}
        }
        
        response = client.post("/api/smart-mapping/map-inputs", json=incomplete_request)
        print(f"   📝 Incomplete request (expected error): {response.status_code}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        import traceback
        print(f"📋 Full traceback:")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_frontend_request_format())
    if success:
        print("\n🎯 Request format test completed")
    else:
        print("\n❌ Request format test failed") 