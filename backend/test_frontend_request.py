import requests
import json

def test_frontend_style_request():
    """Test making the request exactly like the frontend does"""
    try:
        # This is how the frontend makes the request based on useSmartMapping.jsx:42
        url = "http://localhost:8000/api/smart-mapping/map-inputs"
        
        # This mimics the frontend request data structure
        data = {
            "node": {
                "id": "test-node-1234",
                "type": "agent",
                "data": {
                    "label": "Test Agent"
                }
            },
            "context": {
                "variables": {},
                "executionContext": {}
            },
            "previous_outputs": {}
        }
        
        headers = {
            'Content-Type': 'application/json',
        }
        
        print("🌐 Testing frontend-style request...")
        print(f"URL: {url}")
        print(f"Headers: {headers}")
        print(f"Data: {json.dumps(data, indent=2)}")
        
        response = requests.post(url, json=data, headers=headers, timeout=10)
        
        print(f"\n📡 Response:")
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ SUCCESS!")
            print(f"Response: {json.dumps(result, indent=2)}")
        elif response.status_code == 404:
            print(f"❌ 404 NOT FOUND")
            print(f"This means the endpoint doesn't exist or isn't registered")
            print(f"Response text: {response.text}")
        else:
            print(f"⚠️  Status {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed - is the server running on localhost:8000?")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_simple_health_check():
    """Test if the server is responding at all"""
    try:
        urls = [
            "http://localhost:8000/health",
            "http://localhost:8000/api/health", 
            "http://localhost:8000/"
        ]
        
        for url in urls:
            try:
                print(f"Testing {url}...")
                response = requests.get(url, timeout=5)
                print(f"  ✅ Status: {response.status_code}")
                if response.status_code == 200:
                    print(f"  Response: {response.text[:100]}...")
                break
            except Exception as e:
                print(f"  ❌ Failed: {str(e)}")
                
    except Exception as e:
        print(f"❌ Health check error: {str(e)}")

if __name__ == "__main__":
    print("🔍 Testing Frontend-Style Smart Mapping Request")
    print("=" * 60)
    
    print("\n1. Health check...")
    test_simple_health_check()
    
    print("\n2. Frontend-style smart mapping request...")
    test_frontend_style_request()
    
    print("\n" + "=" * 60)
    print("Complete!") 