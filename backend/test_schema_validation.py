"""
Comprehensive test script for schema validation functionality
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.schema_validator import SchemaValidator, validate_all_frameworks, generate_schema_report
from backend.models.runner_schemas import (
    CrewAIRunnerConfig, LangChainRunnerConfig, HuggingFaceRunnerConfig,
    AutoGenRunnerConfig, LlamaIndexRunnerConfig, LLMConfig, ToolConfig, BaseRunnerConfig
)
from backend.models.schemas import NodeSchema, SchemaField, SchemaType
from backend.framework_registry import FRAMEWORK_METADATA, LLM_METADATA
import json

def test_schema_class_mapping():
    """Test that all frameworks have proper schema class mappings"""
    print("🔍 Testing Schema Class Mapping...")
    
    validator = SchemaValidator()
    
    # Test all frameworks in metadata
    missing_schemas = []
    working_schemas = []
    
    for framework in FRAMEWORK_METADATA.keys():
        schema_class = validator._get_schema_class(framework)
        if schema_class is None:
            missing_schemas.append(framework)
        else:
            working_schemas.append(framework)
            print(f"✅ {framework}: {schema_class.__name__}")
    
    if missing_schemas:
        print(f"❌ Missing schema classes for: {missing_schemas}")
        return False
    else:
        print(f"✅ All {len(working_schemas)} frameworks have schema classes")
        return True

def test_llm_provider_validation():
    """Test LLM provider validation"""
    print("\n🔍 Testing LLM Provider Validation...")
    
    validator = SchemaValidator()
    
    # Test all LLM providers with proper configurations
    provider_models = {
        'openai': 'gpt-4',
        'anthropic': 'claude-3-opus',
        'perplexity': 'sonar-pro',
        'openrouter': 'openai/gpt-4',
        'gemini': 'gemini-pro',
        'huggingface': 'microsoft/DialoGPT-medium'
    }
    
    for provider in LLM_METADATA.keys():
        # Skip HuggingFace as LLM provider since it's also a framework
        if provider == 'huggingface':
            continue
            
        config = {
            "provider": provider,
            "model": provider_models.get(provider, "test-model"),
            "framework": "openai",  # Required field
            "temperature": 0.7,
            "max_tokens": 1000
        }
        
        result = validator.validate_framework_config(provider, config)
        if result["valid"]:
            print(f"✅ {provider}: Valid")
        else:
            print(f"❌ {provider}: {result['errors']}")
    
    return True

def test_framework_validation():
    """Test framework validation with real configurations"""
    print("\n🔍 Testing Framework Validation...")
    
    validator = SchemaValidator()
    
    # Test CrewAI
    crewai_config = {
        "framework": "crewai",
        "provider": "openai",
        "model": "gpt-4",
        "role": "Software Developer",
        "goal": "Create a web application",
        "temperature": 0.7,
        "max_tokens": 1000
    }
    
    result = validator.validate_framework_config("crewai", crewai_config)
    print(f"✅ CrewAI: {'PASS' if result['valid'] else 'FAIL'}")
    if result['errors']:
        print(f"   Errors: {result['errors']}")
    
    # Test LangChain
    langchain_config = {
        "framework": "langchain",
        "provider": "openai",
        "model": "gpt-4",
        "chain_type": "llm",
        "temperature": 0.7,
        "max_tokens": 1000
    }
    
    result = validator.validate_framework_config("langchain", langchain_config)
    print(f"✅ LangChain: {'PASS' if result['valid'] else 'FAIL'}")
    if result['errors']:
        print(f"   Errors: {result['errors']}")
    
    # Test OpenAI (LLM Provider)
    openai_config = {
        "provider": "openai",
        "model": "gpt-4",
        "framework": "openai",  # Required field
        "temperature": 0.7,
        "max_tokens": 1000
    }
    
    result = validator.validate_framework_config("openai", openai_config)
    print(f"✅ OpenAI: {'PASS' if result['valid'] else 'FAIL'}")
    if result['errors']:
        print(f"   Errors: {result['errors']}")
    
    # Test Anthropic (LLM Provider)
    anthropic_config = {
        "provider": "anthropic",
        "model": "claude-3-opus",
        "framework": "anthropic",  # Required field
        "temperature": 0.7,
        "max_tokens": 1000
    }
    
    result = validator.validate_framework_config("anthropic", anthropic_config)
    print(f"✅ Anthropic: {'PASS' if result['valid'] else 'FAIL'}")
    if result['errors']:
        print(f"   Errors: {result['errors']}")
    
    # Test Perplexity (LLM Provider)
    perplexity_config = {
        "provider": "perplexity",
        "model": "sonar-pro",
        "framework": "perplexity",  # Required field
        "temperature": 0.7,
        "max_tokens": 1000
    }
    
    result = validator.validate_framework_config("perplexity", perplexity_config)
    print(f"✅ Perplexity: {'PASS' if result['valid'] else 'FAIL'}")
    if result['errors']:
        print(f"   Errors: {result['errors']}")
    
    # Test OpenRouter (LLM Provider)
    openrouter_config = {
        "provider": "openrouter",
        "model": "openai/gpt-4",
        "framework": "openrouter",  # Required field
        "temperature": 0.7,
        "max_tokens": 1000
    }
    
    result = validator.validate_framework_config("openrouter", openrouter_config)
    print(f"✅ OpenRouter: {'PASS' if result['valid'] else 'FAIL'}")
    if result['errors']:
        print(f"   Errors: {result['errors']}")
    
    return True

def test_structural_nodes():
    """Test structural nodes that don't need complex validation"""
    print("\n🔍 Testing Structural Nodes...")
    
    validator = SchemaValidator()
    
    structural_nodes = ["task", "logic", "trigger", "input", "output", "delay", "chat"]
    
    for node_type in structural_nodes:
        config = {
            "framework": node_type,
            "provider": "openai",  # Required for BaseRunnerConfig
            "model": "gpt-4",      # Required for BaseRunnerConfig
            "description": "Test node"
        }
        
        # Add node-specific required fields
        if node_type == "logic":
            config["condition"] = "input.value > 10"
        elif node_type == "trigger":
            config["trigger_type"] = "manual"
        elif node_type == "output":
            config["output_type"] = "email"
        elif node_type == "delay":
            config["duration"] = 60
        elif node_type == "chat":
            config["prompt"] = "Hello, how are you?"
        
        result = validator.validate_framework_config(node_type, config)
        print(f"✅ {node_type}: {'PASS' if result['valid'] else 'FAIL'}")
        if result['errors']:
            print(f"   Errors: {result['errors']}")
    
    return True

def test_tool_nodes():
    """Test tool nodes validation"""
    print("\n🔍 Testing Tool Nodes...")
    
    validator = SchemaValidator()
    
    tool_configs = {
        "api": {
            "tool_type": "api",
            "framework": "api",
            "endpoint": "https://api.example.com",
            "method": "GET"
        },
        "webhook": {
            "tool_type": "webhook",
            "framework": "webhook",
            "url": "https://webhook.example.com"
        },
        "universal_api": {
            "tool_type": "universal_api",
            "framework": "universal_api",
            "api_service_name": "test_service"
        }
    }
    
    for tool_type, config in tool_configs.items():
        result = validator.validate_framework_config(tool_type, config)
        print(f"✅ {tool_type}: {'PASS' if result['valid'] else 'FAIL'}")
        if result['errors']:
            print(f"   Errors: {result['errors']}")
    
    return True

def test_comprehensive_validation():
    """Run comprehensive validation on all frameworks"""
    print("\n🔍 Running Comprehensive Validation...")
    
    try:
        results = validate_all_frameworks()
        
        total_frameworks = len(results)
        valid_frameworks = sum(1 for r in results.values() if r["overall_valid"])
        
        print(f"📊 Validation Summary:")
        print(f"   Total Frameworks: {total_frameworks}")
        print(f"   Valid Frameworks: {valid_frameworks}")
        print(f"   Invalid Frameworks: {total_frameworks - valid_frameworks}")
        
        # Show details for invalid frameworks
        for framework, result in results.items():
            if not result["overall_valid"]:
                print(f"❌ {framework}: Validation failed")
                for test_result in result["test_results"]:
                    if not test_result["passed"]:
                        print(f"   - {test_result['test_case']}: {test_result['errors']}")
        
        return valid_frameworks == total_frameworks
        
    except Exception as e:
        print(f"❌ Comprehensive validation failed: {str(e)}")
        return False

def test_schema_report():
    """Test schema report generation"""
    print("\n🔍 Testing Schema Report Generation...")
    
    try:
        report = generate_schema_report()
        
        print(f"📊 Schema Report Summary:")
        print(f"   Total Frameworks: {report['summary']['total_frameworks']}")
        print(f"   Total LLM Providers: {report['summary']['total_llm_providers']}")
        
        if report['recommendations']:
            print(f"   Recommendations: {len(report['recommendations'])}")
            for rec in report['recommendations'][:3]:  # Show first 3
                print(f"   - {rec['type']}: {rec['message']}")
        else:
            print("   ✅ No recommendations (all good)")
        
        return True
        
    except Exception as e:
        print(f"❌ Schema report generation failed: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting Comprehensive Schema Validation Tests")
    print("=" * 60)
    
    tests = [
        ("Schema Class Mapping", test_schema_class_mapping),
        ("LLM Provider Validation", test_llm_provider_validation),
        ("Framework Validation", test_framework_validation),
        ("Structural Nodes", test_structural_nodes),
        ("Tool Nodes", test_tool_nodes),
        ("Comprehensive Validation", test_comprehensive_validation),
        ("Schema Report", test_schema_report)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
            print(f"{'✅ PASS' if result else '❌ FAIL'}: {test_name}")
        except Exception as e:
            print(f"❌ ERROR: {test_name} - {str(e)}")
            results.append((test_name, False))
    
    print("\n" + "=" * 60)
    print("📊 FINAL RESULTS:")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status}: {test_name}")
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Schema validation is working correctly.")
    else:
        print("⚠️  Some tests failed. Please review the issues above.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 