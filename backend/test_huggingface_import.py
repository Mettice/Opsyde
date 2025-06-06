#!/usr/bin/env python3
"""
Test script to check HuggingFace import issues
"""

import sys
import os
import traceback

print("=== HuggingFace Import Test ===")
print(f"Python version: {sys.version}")
print(f"Current working directory: {os.getcwd()}")
print(f"Python path: {sys.path}")

# Test 1: Check if frameworks directory exists
frameworks_path = os.path.join(os.getcwd(), "frameworks")
print(f"\nFrameworks directory exists: {os.path.exists(frameworks_path)}")
if os.path.exists(frameworks_path):
    print(f"Frameworks directory contents: {os.listdir(frameworks_path)}")

# Test 2: Check if huggingface_utils.py exists
hf_utils_path = os.path.join(frameworks_path, "huggingface_utils.py")
print(f"HuggingFace utils file exists: {os.path.exists(hf_utils_path)}")

# Test 3: Try importing step by step
try:
    print("\n=== Import Test 1: frameworks ===")
    import frameworks
    print("✅ Successfully imported frameworks")
    print(f"Frameworks module location: {frameworks.__file__}")
except Exception as e:
    print(f"❌ Failed to import frameworks: {e}")
    traceback.print_exc()

try:
    print("\n=== Import Test 2: frameworks.huggingface_utils ===")
    import frameworks.huggingface_utils as hf_utils
    print("✅ Successfully imported frameworks.huggingface_utils")
    print(f"Module location: {hf_utils.__file__}")
    print(f"Available functions: {[attr for attr in dir(hf_utils) if not attr.startswith('_')]}")
except Exception as e:
    print(f"❌ Failed to import frameworks.huggingface_utils: {e}")
    traceback.print_exc()

try:
    print("\n=== Import Test 3: get_frontend_task_config function ===")
    from frameworks.huggingface_utils import get_frontend_task_config
    print("✅ Successfully imported get_frontend_task_config")
    
    print("\n=== Function Call Test ===")
    result = get_frontend_task_config()
    print(f"✅ Successfully called get_frontend_task_config()")
    print(f"Result type: {type(result)}")
    print(f"Result keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
except Exception as e:
    print(f"❌ Failed to import/call get_frontend_task_config: {e}")
    traceback.print_exc()

print("\n=== Test Complete ===") 