#!/usr/bin/env python3
"""
Simple test to debug the smart mapping 500 error
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_smart_mapping_direct():
    """Test smart mapping functions directly"""
    print("🧪 Testing Smart Mapping Functions Directly")
    print("=" * 50)
    
    try:
        # Test 1: Import the function
        print("1. Testing imports...")
        from core.smart_mapper import smart_map_inputs
        print("   ✅ smart_map_inputs imported successfully")
        
        from core.multimodal_processor import process_multimodal_input
        print("   ✅ process_multimodal_input imported successfully")
        
        # Test 2: Call smart_map_inputs with simple data
        print("\n2. Testing smart_map_inputs function...")
        
        test_node = {
            "id": "test-node-123",
            "type": "agent",
            "data": {
                "label": "Test Agent"
            }
        }
        
        test_context = {
            "variables": {
                "user_input": "Hello world",
                "query": "Test query"
            }
        }
        
        test_previous_outputs = {}
        
        result = await smart_map_inputs(test_node, test_context, test_previous_outputs)
        print(f"   ✅ Function call successful!")
        print(f"   📊 Result: {result}")
        print(f"   📋 Result type: {type(result)}")
        print(f"   📦 Result keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
        
        # Test 3: Test the router imports
        print("\n3. Testing router imports...")
        from api.routers.smart_mapping_router import router
        print("   ✅ Router imported successfully")
        
        print(f"   📋 Router routes: {len(router.routes)} routes")
        for route in router.routes:
            if hasattr(route, 'path') and hasattr(route, 'methods'):
                print(f"      - {route.path} [{', '.join(route.methods)}]")
        
        print("\n🎉 All tests passed! The issue might be in the FastAPI request handling.")
        
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        import traceback
        print(f"📋 Full traceback:")
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = asyncio.run(test_smart_mapping_direct())
    if success:
        print("\n✅ Smart mapping functions work correctly")
        print("💡 The 500 error is likely in the HTTP request handling or validation")
    else:
        print("\n❌ Smart mapping functions have issues") 