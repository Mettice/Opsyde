import requests
import json

def test_smart_mapping_endpoint():
    """Test if the smart mapping endpoint is accessible"""
    try:
        url = "http://localhost:8000/api/smart-mapping/map-inputs"
        
        # Test data
        data = {
            "node": {
                "id": "test-node",
                "type": "agent"
            },
            "context": {
                "variables": {}
            },
            "previous_outputs": {}
        }
        
        print(f"Testing endpoint: {url}")
        print(f"Request data: {json.dumps(data, indent=2)}")
        
        # Make the request
        response = requests.post(
            url,
            json=data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ Smart mapping endpoint is working!")
            print(f"Response: {response.json()}")
        elif response.status_code == 404:
            print("❌ Smart mapping endpoint not found (404)")
            print("This means the router is not properly included")
        else:
            print(f"⚠️  Unexpected status code: {response.status_code}")
            print(f"Response text: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Is it running on localhost:8000?")
    except Exception as e:
        print(f"❌ Error testing endpoint: {str(e)}")

def test_debug_routes():
    """Test if we can get the debug routes to see what's registered"""
    try:
        url = "http://localhost:8000/debug/routes"
        
        print(f"Getting all routes from: {url}")
        
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            routes_data = response.json()
            routes = routes_data.get("routes", [])
            
            print(f"Total routes found: {len(routes)}")
            
            # Look for smart mapping routes
            smart_routes = [r for r in routes if "smart-mapping" in r.get("path", "")]
            
            if smart_routes:
                print("✅ Smart mapping routes found:")
                for route in smart_routes:
                    print(f"  - {route.get('path')} [{', '.join(route.get('methods', []))}]")
            else:
                print("❌ No smart mapping routes found")
                print("First 10 routes for reference:")
                for route in routes[:10]:
                    print(f"  - {route.get('path')} [{', '.join(route.get('methods', []))}]")
        else:
            print(f"Failed to get routes: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error getting routes: {str(e)}")

if __name__ == "__main__":
    print("🔍 Testing Smart Mapping Endpoint Accessibility")
    print("=" * 50)
    
    print("\n1. Testing debug routes endpoint...")
    test_debug_routes()
    
    print("\n2. Testing smart mapping endpoint...")
    test_smart_mapping_endpoint()
    
    print("\n" + "=" * 50)
    print("Test completed!") 