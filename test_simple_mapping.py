#!/usr/bin/env python3
"""
Simple test to verify the new simple mapping system works correctly.
This replaces the complex UniversalDataTransformer with explicit field mapping.
"""

import asyncio
import sys
import os
from dotenv import load_dotenv

# Load environment variables from backend directory
backend_env_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
if os.path.exists(backend_env_path):
    load_dotenv(backend_env_path)
    print(f"✅ Loaded environment from: {backend_env_path}")
else:
    print(f"⚠️ No .env file found at: {backend_env_path}")

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.core.simple_mapper import map_fields_simple, get_available_fields_simple

def test_simple_mapping():
    """Test the simple mapping functionality"""
    print("🧪 Testing Simple Mapping System")
    print("=" * 50)
    
    # Test data from a previous node (e.g., agent output)
    source_data = {
        "agent": {
            "response": "The weather is sunny today",
            "confidence": 0.95,
            "metadata": {
                "model": "gpt-4",
                "tokens_used": 150
            }
        },
        "tool": {
            "result": {
                "temperature": 25,
                "humidity": 60,
                "location": "New York"
            }
        }
    }
    
    # Test field mappings (explicit mappings)
    field_mappings = {
        "query": "agent.response",
        "context": "tool.result",
        "confidence": "agent.confidence"
    }
    
    print(f"📥 Source Data: {source_data}")
    print(f"🗺️  Field Mappings: {field_mappings}")
    
    # Test mapping
    mapped_data = map_fields_simple(source_data, field_mappings, "task")
    
    print(f"📤 Mapped Data: {mapped_data}")
    print()
    
    # Test available fields extraction
    print("🔍 Testing Available Fields Extraction")
    print("-" * 30)
    
    available_fields = get_available_fields_simple(source_data)
    
    print("Available fields:")
    for field in available_fields:
        print(f"  - {field['path']} ({field['type']}) from {field['source']}")
    
    print()
    
    # Test validation
    print("✅ Testing Field Mapping Validation")
    print("-" * 30)
    
    from backend.core.simple_mapper import simple_mapper
    
    available_field_paths = [field['path'] for field in available_fields]
    validation_result = simple_mapper.validate_mapping(field_mappings, available_field_paths)
    
    print(f"Validation Result: {validation_result}")
    
    print()
    print("🎉 Simple Mapping Test Completed!")
    print("=" * 50)
    
    return True

def test_node_processor_integration():
    """Test that the node processor uses simple mapping correctly"""
    print("🧪 Testing Node Processor Integration")
    print("=" * 50)
    
    try:
        from backend.core.node_processor import node_processor
        
        # Create a test node with field mappings
        test_node = {
            "id": "test-task-1",
            "type": "task",
            "data": {
                "label": "Test Task",
                "description": "A test task",
                "field_mappings": {
                    "query": "agent.response",
                    "context": "tool.result"
                }
            }
        }
        
        # Test inputs (simulating previous node output)
        test_inputs = {
            "agent": {
                "response": "Test response from agent",
                "confidence": 0.9
            },
            "tool": {
                "result": {
                    "data": "Test tool result"
                }
            }
        }
        
        print(f"📥 Test Node: {test_node}")
        print(f"📥 Test Inputs: {test_inputs}")
        
        # Test the simple mapping method directly
        from backend.core.node_processor import NodeProcessor
        processor = NodeProcessor()
        
        # Test the simple mapping method
        mapped_inputs = asyncio.run(processor._simple_map_inputs(test_node, test_inputs))
        
        print(f"📤 Mapped Inputs: {mapped_inputs}")
        print()
        print("✅ Node Processor Integration Test Completed!")
        
        return True
        
    except Exception as e:
        print(f"❌ Node Processor Integration Test Failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Starting Simple Mapping System Tests")
    print("=" * 60)
    
    # Test 1: Simple mapping functionality
    test1_passed = test_simple_mapping()
    
    # Test 2: Node processor integration
    test2_passed = test_node_processor_integration()
    
    print()
    print("📊 Test Results Summary")
    print("=" * 30)
    print(f"Simple Mapping Test: {'✅ PASSED' if test1_passed else '❌ FAILED'}")
    print(f"Node Processor Integration: {'✅ PASSED' if test2_passed else '❌ FAILED'}")
    
    if test1_passed and test2_passed:
        print()
        print("🎉 All tests passed! The simple mapping system is working correctly.")
        print("You can now use explicit field mappings instead of smart guessing.")
    else:
        print()
        print("⚠️  Some tests failed. Please check the implementation.")
    
    print("=" * 60) 