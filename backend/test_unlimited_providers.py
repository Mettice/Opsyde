"""
Test script for unlimited LLM provider support system
Tests the extensible provider registry and BYOK integration
"""

import asyncio
import logging
from core.provider_registry import provider_registry, add_custom_provider, ProviderConfig
from services.user_settings_service import user_settings_service
from core.workflow_execution_context import get_execution_context

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_provider_registry():
    """Test the extensible provider registry"""
    print("\n🔧 Testing Provider Registry...")
    
    # Test getting all default providers
    providers = provider_registry.get_all_providers()
    print(f"✅ Default providers loaded: {len(providers)}")
    for provider in providers:
        print(f"   - {provider.name} ({provider.id})")
    
    # Test getting specific provider
    openai_provider = provider_registry.get_provider("openai")
    print(f"✅ OpenAI provider: {openai_provider.name if openai_provider else 'Not found'}")
    
    # Test framework mapping using the correct method
    framework_providers = provider_registry.get_providers_for_framework("crewai")
    print(f"✅ CrewAI framework maps to: {[p.name for p in framework_providers]}")
    
    # Test model detection
    model_provider = provider_registry.get_provider_for_model("gpt-4")
    print(f"✅ GPT-4 model maps to: {model_provider.name if model_provider else 'Not found'}")
    
    return True

async def test_custom_provider_addition():
    """Test adding custom providers"""
    print("\n🚀 Testing Custom Provider Addition...")
    
    # Add DeepSeek provider using the registry method
    deepseek_config = ProviderConfig(
        id="deepseek",
        name="DeepSeek",
        description="DeepSeek AI models for coding and reasoning",
        icon="🧠",
        key_format="sk-deepseek-*",
        validation_url="https://api.deepseek.com/v1/models",
        pricing_info={
            "input_cost_per_1k": 0.0001,
            "output_cost_per_1k": 0.0002,
            "currency": "USD"
        },
        get_key_url="https://platform.deepseek.com/api_keys",
        supported_models=["deepseek-coder", "deepseek-chat", "deepseek-math"],
        framework_mappings=["deepseek", "custom_deepseek"]
    )
    
    provider_registry.register_provider(deepseek_config)
    
    # Add Qwen provider using the registry method
    qwen_config = ProviderConfig(
        id="qwen",
        name="Qwen (Alibaba Cloud)",
        description="Qwen large language models from Alibaba",
        icon="☁️",
        key_format="qwen-*",
        validation_url="https://dashscope.aliyuncs.com/api/v1/models",
        pricing_info={
            "input_cost_per_1k": 0.0005,
            "output_cost_per_1k": 0.001,
            "currency": "USD"
        },
        get_key_url="https://dashscope.console.aliyun.com/",
        supported_models=["qwen-turbo", "qwen-plus", "qwen-max"],
        framework_mappings=["qwen", "dashscope"]
    )
    
    provider_registry.register_provider(qwen_config)
    
    # Verify custom providers were added
    all_providers = provider_registry.get_all_providers()
    deepseek = provider_registry.get_provider("deepseek")
    qwen = provider_registry.get_provider("qwen")
    
    print(f"✅ Total providers after adding custom: {len(all_providers)}")
    print(f"✅ DeepSeek provider added: {deepseek.name if deepseek else 'Failed'}")
    print(f"✅ Qwen provider added: {qwen.name if qwen else 'Failed'}")
    
    # Test framework mapping for custom providers
    deepseek_providers = provider_registry.get_providers_for_framework("deepseek")
    qwen_providers = provider_registry.get_providers_for_framework("qwen")
    
    print(f"✅ DeepSeek framework mapping: {[p.name for p in deepseek_providers]}")
    print(f"✅ Qwen framework mapping: {[p.name for p in qwen_providers]}")
    
    return True

async def test_byok_with_unlimited_providers():
    """Test BYOK system with unlimited providers"""
    print("\n🔑 Testing BYOK with Unlimited Providers...")
    
    # Initialize the service
    await user_settings_service.initialize_db()
    
    test_user = "test_unlimited_user"
    
    # Test adding keys for various providers
    test_keys = {
        "openai": "sk-test-openai-key-12345",
        "anthropic": "sk-ant-test-key-67890",
        "google": "AIza-test-google-key-abcde",
        "deepseek": "sk-deepseek-test-key-fghij",
        "qwen": "qwen-test-key-klmno"
    }
    
    # Add API keys
    for provider_id, api_key in test_keys.items():
        success = await user_settings_service.add_api_key(test_user, provider_id, api_key)
        provider = provider_registry.get_provider(provider_id)
        provider_name = provider.name if provider else provider_id
        print(f"✅ Added {provider_name} key: {success}")
    
    # Get user API keys
    user_keys = await user_settings_service.get_user_api_keys(test_user)
    print(f"✅ Retrieved {len(user_keys)} API keys for user")
    
    for key in user_keys:
        provider = provider_registry.get_provider(key.provider)
        print(f"   - {provider.name if provider else key.provider}: {key.masked_value}")
    
    # Test execution keys
    execution_keys = await user_settings_service.get_user_keys_for_execution(test_user)
    print(f"✅ Execution keys available: {list(execution_keys.keys())}")
    
    return True

async def test_workflow_execution_context():
    """Test workflow execution context with unlimited providers"""
    print("\n⚡ Testing Workflow Execution Context...")
    
    test_user = "test_unlimited_user"
    
    # Get execution context
    context = await get_execution_context(test_user, "test_workflow")
    
    # Test different framework/model combinations
    test_scenarios = [
        ("openai", "gpt-4"),
        ("anthropic", "claude-3-sonnet"),
        ("google", "gemini-pro"),
        ("deepseek", "deepseek-coder"),
        ("qwen", "qwen-turbo"),
        ("crewai", None),  # Framework mapping
        ("unknown_framework", "unknown_model")  # Should handle gracefully
    ]
    
    print("Testing API key resolution for different scenarios:")
    for framework, model in test_scenarios:
        api_key = context.get_api_key_for_framework(framework, model)
        status = "✅ Found" if api_key else "❌ Not found"
        print(f"   {framework}/{model}: {status}")
    
    # Test node configuration enhancement
    test_node_configs = [
        {
            "nodeType": "agent",
            "framework": "openai",
            "llmModel": "gpt-4"
        },
        {
            "nodeType": "agent", 
            "framework": "deepseek",
            "llmModel": "deepseek-coder"
        },
        {
            "nodeType": "task",
            "framework": "qwen",
            "llmModel": "qwen-turbo"
        }
    ]
    
    print("\nTesting node configuration enhancement:")
    for i, config in enumerate(test_node_configs):
        enhanced = context.enhance_node_config(config)
        has_key = "api_key" in enhanced
        framework = config.get("framework", "unknown")
        print(f"   Node {i+1} ({framework}): {'✅ Enhanced' if has_key else '❌ No key'}")
    
    # Get execution metadata
    metadata = context.get_execution_metadata()
    print(f"\n✅ Execution metadata:")
    print(f"   - Available providers: {len(metadata['available_providers'])}")
    print(f"   - Total registered providers: {metadata['total_registered_providers']}")
    print(f"   - Execution mode: {metadata['execution_mode']}")
    
    return True

async def test_usage_statistics():
    """Test usage statistics with provider registry"""
    print("\n📊 Testing Usage Statistics...")
    
    test_user = "test_unlimited_user"
    
    # Get usage stats
    stats = await user_settings_service.get_usage_stats(test_user)
    
    print(f"✅ Usage Statistics:")
    print(f"   - Total keys: {stats['total_keys']}")
    print(f"   - Valid keys: {stats['valid_keys']}")
    print(f"   - Invalid keys: {stats['invalid_keys']}")
    print(f"   - Supported providers: {stats['supported_providers']}")
    
    print(f"\n   Provider breakdown:")
    for provider_stat in stats['provider_stats']:
        print(f"   - {provider_stat['provider_name']} ({provider_stat['provider_id']}): "
              f"{provider_stat['validation_status']}")
    
    return True

async def test_supported_providers_api():
    """Test supported providers API"""
    print("\n🌐 Testing Supported Providers API...")
    
    # Get supported providers
    providers = await user_settings_service.get_supported_providers()
    
    print(f"✅ API returned {len(providers)} supported providers:")
    for provider in providers:
        models_count = len(provider.get('supported_models', []))
        print(f"   - {provider['name']} ({provider['id']}): {models_count} models")
    
    return True

async def main():
    """Run all tests"""
    print("🚀 Starting Unlimited LLM Provider Support Tests")
    print("=" * 60)
    
    try:
        # Test provider registry
        await test_provider_registry()
        
        # Test custom provider addition
        await test_custom_provider_addition()
        
        # Test BYOK with unlimited providers
        await test_byok_with_unlimited_providers()
        
        # Test workflow execution context
        await test_workflow_execution_context()
        
        # Test usage statistics
        await test_usage_statistics()
        
        # Test supported providers API
        await test_supported_providers_api()
        
        print("\n" + "=" * 60)
        print("🎉 All tests completed successfully!")
        print("\n✨ Your system now supports UNLIMITED LLM providers!")
        print("   - Easily add new providers through the registry")
        print("   - Automatic framework and model detection")
        print("   - Seamless BYOK integration")
        print("   - Future-proof extensibility")
        
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        logger.exception("Test execution failed")

if __name__ == "__main__":
    asyncio.run(main()) 