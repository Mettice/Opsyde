#!/usr/bin/env python3
"""
Test framework imports to see which ones are working
"""

frameworks_to_test = [
    ("CrewAI", "frameworks.crewai_runner", "run_crewai_tool"),
    ("LangChain", "frameworks.langchain_runner", "run_langchain_tool"),
    ("AutoGen", "frameworks.autogen_runner", "run_autogen_tool"),
    ("LlamaIndex", "frameworks.llamaindex_runner", "run_llamaindex_tool"),
    ("HuggingFace", "frameworks.huggingface_runner", "run_huggingface_tool"),
    ("Universal API", "frameworks.universal_api_runner", "run_universal_api_tool"),
]

print("🔍 Testing Framework Imports...\n")

for name, module, function in frameworks_to_test:
    try:
        exec(f"from {module} import {function}")
        print(f"✅ {name.ljust(15)} - Import successful")
    except ImportError as e:
        print(f"❌ {name.ljust(15)} - Import failed: {e}")
    except Exception as e:
        print(f"⚠️  {name.ljust(15)} - Other error: {e}")

print("\n🔍 Testing Package Availability...\n")

packages_to_test = [
    ("crewai", "CrewAI"),
    ("langchain", "LangChain"),
    ("autogen", "AutoGen"),
    ("llama_index.core", "LlamaIndex"),
    ("transformers", "HuggingFace"),
]

for package, name in packages_to_test:
    try:
        exec(f"import {package}")
        print(f"✅ {name.ljust(15)} - Package available")
    except ImportError:
        print(f"❌ {name.ljust(15)} - Package not installed")
    except Exception as e:
        print(f"⚠️  {name.ljust(15)} - Other error: {e}") 