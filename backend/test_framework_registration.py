#!/usr/bin/env python3
"""
Test framework registration to see exactly what's failing
"""

import logging
import traceback

# Set up logging to see warnings
logging.basicConfig(level=logging.INFO)

print("🔍 Testing Framework Registration Step by Step...\n")

frameworks_to_test = [
    ("CrewAI", "frameworks.crewai_runner", "run_crewai_tool"),
    ("LangChain", "frameworks.langchain_runner", "run_langchain_tool"),
    ("AutoGen", "frameworks.autogen_runner", "run_autogen_tool"),
    ("LlamaIndex", "frameworks.llamaindex_runner", "run_llamaindex_tool"),
    ("HuggingFace", "frameworks.huggingface_runner", "run_huggingface_tool"),
    ("Universal API", "frameworks.universal_api_runner", "run_universal_api_tool"),
]

registered_frameworks = {}

for name, module, function in frameworks_to_test:
    print(f"Testing {name}...")
    try:
        # Try to import the module
        mod = __import__(module, fromlist=[function])
        func = getattr(mod, function)
        registered_frameworks[name.lower().replace(" ", "_")] = func
        print(f"✅ {name} - Successfully imported and registered")
    except ImportError as e:
        print(f"❌ {name} - Import failed: {e}")
        print(f"   Full traceback:")
        traceback.print_exc()
    except Exception as e:
        print(f"⚠️  {name} - Other error: {e}")
        print(f"   Full traceback:")
        traceback.print_exc()
    print()

print(f"📊 Successfully registered: {len(registered_frameworks)} frameworks")
print(f"📋 Registered frameworks: {list(registered_frameworks.keys())}")

# Now test the actual framework registry
print("\n🔍 Testing Framework Registry...\n")

try:
    from framework_registry import framework_registry
    print(f"✅ Framework registry imported successfully")
    print(f"📊 Registry has {len(framework_registry._frameworks)} frameworks")
    print(f"📋 Registry frameworks: {list(framework_registry._frameworks.keys())}")
    
    # Test availability check
    frameworks = framework_registry.get_available_frameworks()
    print(f"📊 Available frameworks: {len(frameworks)}")
    for fw in frameworks:
        status_icon = "✅" if fw['available'] else "❌"
        print(f"{status_icon} {fw['name']} - {fw['status']}")
        
except Exception as e:
    print(f"❌ Framework registry failed: {e}")
    traceback.print_exc() 