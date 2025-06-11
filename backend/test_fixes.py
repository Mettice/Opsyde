#!/usr/bin/env python3

"""
Simple test script to verify our critical fixes are working
"""

import sys
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def test_javascript_condition_conversion():
    """Test JavaScript to Python condition conversion"""
    print("\n🔧 Testing JavaScript to Python Condition Conversion")
    print("=" * 60)
    
    try:
        from nodes.logic_node import convert_js_to_python_condition
        
        test_cases = [
            'response && response !== "" && response !== null',
            'status === "success" || status === "completed"',
            'count > 0 && count !== undefined',
            'data.length > 0'
        ]
        
        for condition in test_cases:
            try:
                result = convert_js_to_python_condition(condition)
                print(f"✅ JS:     {condition}")
                print(f"   Python: {result}")
            except Exception as e:
                print(f"❌ Error converting: {condition} -> {e}")
                return False
        
        print("✅ JavaScript to Python conversion is working!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_framework_metadata():
    """Test framework metadata extraction"""
    print("\n🔧 Testing Framework Metadata Extraction")
    print("=" * 60)
    
    try:
        from core.runner import UnifiedRunner
        
        runner = UnifiedRunner()
        
        # Test with node_data parameter
        test_node_data = {
            "framework": "crewai",
            "llmProvider": "openai"
        }
        
        result = runner.standardize_node_result(
            {"success": True, "data": "test"}, 
            "agent", 
            "test_agent_123",
            test_node_data
        )
        
        metadata = result.get("metadata", {})
        framework = metadata.get("framework")
        
        print(f"✅ Node ID: {metadata.get('node_id')}")
        print(f"✅ Node Type: {metadata.get('node_type')}")
        print(f"✅ Framework: {framework}")
        
        if framework == "crewai":
            print("✅ Framework metadata extraction is working!")
            return True
        else:
            print(f"❌ Expected 'crewai', got '{framework}'")
            return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_result_standardization():
    """Test result standardization"""
    print("\n🔧 Testing Result Standardization")
    print("=" * 60)
    
    try:
        from core.runner import UnifiedRunner
        
        runner = UnifiedRunner()
        
        # Test raw result
        raw_result = "Simple test output"
        result = runner.standardize_node_result(raw_result, "test", "test_123")
        
        print(f"✅ Result structure: {list(result.keys())}")
        print(f"✅ Success: {result.get('success')}")
        print(f"✅ Data: {result.get('data')}")
        
        if result.get("success") and result.get("data") == raw_result:
            print("✅ Result standardization is working!")
            return True
        else:
            print("❌ Result standardization failed")
            return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Testing Critical Fixes")
    print("=" * 60)
    
    tests = [
        test_javascript_condition_conversion,
        test_framework_metadata,
        test_result_standardization
    ]
    
    results = []
    for test in tests:
        try:
            results.append(test())
        except Exception as e:
            print(f"❌ Test failed: {e}")
            results.append(False)
    
    print("\n" + "=" * 60)
    print("🎯 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(results)
    total = len(results)
    
    test_names = [
        "JavaScript to Python Conversion",
        "Framework Metadata Extraction", 
        "Result Standardization"
    ]
    
    for i, (name, result) in enumerate(zip(test_names, results)):
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{i+1}. {name}: {status}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All fixes are working correctly!")
        return 0
    else:
        print("⚠️ Some fixes need attention")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 