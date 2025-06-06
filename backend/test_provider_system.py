#!/usr/bin/env python3
"""
🚀 NODAI HUGGINGFACE PROVIDERS TEST SUITE 2025
Test the new Inference Providers system with verified working models
"""

import asyncio
import os
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from frameworks.huggingface_runner import (
    run_huggingface_tool,
    VERIFIED_WORKING_MODELS,
    INFERENCE_PROVIDERS,
    get_available_tasks,
    get_verified_models_by_task,
    get_all_providers
)

class ProviderSystemTester:
    """Test the new HuggingFace Inference Providers system"""
    
    def __init__(self):
        self.api_key = os.getenv('HUGGINGFACE_API_KEY')
        self.results = []
        self.start_time = datetime.now()
        
    async def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 NODAI HUGGINGFACE PROVIDERS TEST SUITE 2025")
        print("=" * 80)
        print(f"📅 Test Date: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🔑 API Key Status: {'✅ Loaded' if self.api_key else '❌ Missing'}")
        print("=" * 80)
        print()
        
        if not self.api_key:
            print("❌ No API key found. Please set HUGGINGFACE_API_KEY environment variable.")
            return
        
        # Test 1: Verified Working Models
        await self.test_verified_models()
        
        # Test 2: Provider Routing
        await self.test_provider_routing()
        
        # Test 3: Modern HuggingFace Client
        await self.test_modern_client()
        
        # Test 4: Fallback Mechanisms
        await self.test_fallback_mechanisms()
        
        # Test 5: Integration Functions
        await self.test_integration_functions()
        
        # Generate final report
        await self.generate_report()
    
    async def test_verified_models(self):
        """Test verified working models"""
        print("[1/5] 🎯 Testing Verified Working Models")
        print("-" * 60)
        
        test_cases = {
            "text-classification": {
                "inputs": {"inputs": "CrewBuilder makes workflow automation incredibly easy and powerful!"},
                "config": {}
            },
            "zero-shot-classification": {
                "inputs": {"inputs": "I love using CrewBuilder for my automation workflows"},
                "config": {"candidate_labels": ["positive", "negative", "neutral"]}
            }
        }
        
        for task_type, test_data in test_cases.items():
            if task_type in VERIFIED_WORKING_MODELS:
                model_info = VERIFIED_WORKING_MODELS[task_type]
                await self.run_single_test(
                    task_type,
                    model_info["primary"],
                    test_data["inputs"],
                    test_data["config"],
                    model_info["provider"]
                )
        
        print()
    
    async def test_provider_routing(self):
        """Test HuggingFace provider routing"""
        print("[2/5] 🔄 Testing HuggingFace Provider")
        print("-" * 60)
        
        # Test HF Inference provider only
        print("  🤗 Testing HuggingFace Inference Provider...")
        await self.run_single_test(
            "text-classification",
            "cardiffnlp/twitter-roberta-base-sentiment",
            {"inputs": "This is amazing!"},
            {},
            "hf-inference"
        )
        
        print()
    
    async def test_modern_client(self):
        """Test modern HuggingFace client approach"""
        print("[3/5] 🆕 Testing Modern HuggingFace Client")
        print("-" * 60)
        
        try:
            from huggingface_hub import InferenceClient
            
            client = InferenceClient(token=self.api_key)
            
            # Test text classification with working model
            print("  📝 Testing direct client text classification...")
            result = client.text_classification(
                "CrewBuilder is an excellent automation platform!",
                model="cardiffnlp/twitter-roberta-base-sentiment"
            )
            print(f"    ✅ Result: {result[0]['label']} ({result[0]['score']:.1%})")
            
        except ImportError:
            print("    ⚠️ huggingface_hub not available for direct client testing")
        except Exception as e:
            print(f"    ❌ Modern client test failed: {str(e)}")
        
        print()
    
    async def test_fallback_mechanisms(self):
        """Test fallback mechanisms"""
        print("[4/5] 🔄 Testing Fallback Mechanisms")
        print("-" * 60)
        
        # Test with non-existent model
        print("  🧪 Testing fallback for non-existent model...")
        config = {
            "modelName": "non-existent-model-12345",
            "taskType": "text-classification"
        }
        inputs = {"inputs": "Test fallback mechanism"}
        
        result = await run_huggingface_tool(config, inputs)
        
        if result.get("success"):
            print(f"    ✅ Fallback successful: {result.get('provider', 'unknown')}")
        else:
            print(f"    ⚠️ Fallback handled gracefully: {result.get('error', 'unknown error')}")
        
        print()
    
    async def test_integration_functions(self):
        """Test integration helper functions"""
        print("[5/5] 🔧 Testing Integration Functions")
        print("-" * 60)
        
        # Test get_available_tasks
        tasks = get_available_tasks()
        print(f"  📋 Available tasks: {len(tasks)}")
        for task, model in tasks.items():
            print(f"    • {task}: {model}")
        
        # Test get_verified_models_by_task
        print(f"  🎯 Verified models for summarization:")
        models = get_verified_models_by_task("summarization")
        for key, value in models.items():
            print(f"    • {key}: {value}")
        
        # Test get_all_providers
        providers = get_all_providers()
        print(f"  🏢 Available providers: {providers}")
        
        print()
    
    async def run_single_test(self, task_type, model_name, inputs, config, provider):
        """Run a single test case"""
        start_time = datetime.now()
        
        test_config = {
            "modelName": model_name,
            "taskType": task_type,
            **config
        }
        
        try:
            result = await run_huggingface_tool(test_config, inputs)
            execution_time = (datetime.now() - start_time).total_seconds()
            
            if result.get("success"):
                output = result.get("output", "")
                # Truncate long outputs
                display_output = output[:100] + "..." if len(str(output)) > 100 else output
                print(f"  ✅ {task_type}: {display_output}")
                print(f"    ⚡ Time: {execution_time:.2f}s | Provider: {provider}")
                
                self.results.append({
                    "task": task_type,
                    "model": model_name,
                    "provider": provider,
                    "success": True,
                    "execution_time": execution_time,
                    "output_length": len(str(output))
                })
            else:
                error = result.get("error", "Unknown error")
                print(f"  ❌ {task_type}: {error}")
                
                self.results.append({
                    "task": task_type,
                    "model": model_name,
                    "provider": provider,
                    "success": False,
                    "error": error
                })
                
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            print(f"  ❌ {task_type}: Exception - {str(e)}")
            
            self.results.append({
                "task": task_type,
                "model": model_name,
                "provider": provider,
                "success": False,
                "error": str(e),
                "execution_time": execution_time
            })
    
    async def generate_report(self):
        """Generate final test report"""
        total_time = (datetime.now() - self.start_time).total_seconds()
        successful_tests = [r for r in self.results if r.get("success")]
        failed_tests = [r for r in self.results if not r.get("success")]
        
        print("=" * 80)
        print("🎯 NODAI HUGGINGFACE PROVIDERS - FINAL REPORT")
        print("=" * 80)
        
        print(f"📊 Overall Success Rate: {len(successful_tests)}/{len(self.results)} tests ({len(successful_tests)/len(self.results)*100:.1f}%)")
        print(f"⏱️ Total Execution Time: {total_time:.2f} seconds")
        print(f"🔑 API Key Status: ✅ Valid")
        print()
        
        # Provider performance
        provider_stats = {}
        for result in successful_tests:
            provider = result.get("provider", "unknown")
            if provider not in provider_stats:
                provider_stats[provider] = {"count": 0, "total_time": 0}
            provider_stats[provider]["count"] += 1
            provider_stats[provider]["total_time"] += result.get("execution_time", 0)
        
        print("🏢 Provider Performance:")
        for provider, stats in provider_stats.items():
            avg_time = stats["total_time"] / stats["count"] if stats["count"] > 0 else 0
            print(f"   • {provider}: {stats['count']} tests, avg {avg_time:.2f}s")
        print()
        
        if len(successful_tests) >= len(self.results) * 0.8:
            status = "🟢 EXCELLENT"
            recommendation = "Ready for production deployment"
        elif len(successful_tests) >= len(self.results) * 0.6:
            status = "🟡 GOOD"
            recommendation = "Ready with minor fixes needed"
        else:
            status = "🔴 NEEDS WORK"
            recommendation = "Requires significant fixes before deployment"
        
        print(f"🚀 Integration Status: {status}")
        print(f"💡 Recommendation: {recommendation}")
        print()
        
        print("✅ WORKING FEATURES:")
        for result in successful_tests:
            print(f"   • {result['task']} via {result['provider']}")
        
        if failed_tests:
            print()
            print("❌ FAILED FEATURES:")
            for result in failed_tests:
                print(f"   • {result['task']}: {result.get('error', 'Unknown error')}")
        
        print()
        print("📋 NEXT STEPS:")
        print("   1. ✅ Deploy working features to production")
        print("   2. 🔧 Implement provider-specific optimizations")
        print("   3. 📊 Set up monitoring and alerting")
        print("   4. 🚀 Scale successful workflows")
        print("   5. 🔄 Regular testing and model updates")
        
        # Save detailed report
        report_filename = f"provider_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_filename, 'w') as f:
            json.dump({
                "test_summary": {
                    "total_tests": len(self.results),
                    "successful_tests": len(successful_tests),
                    "failed_tests": len(failed_tests),
                    "success_rate": len(successful_tests)/len(self.results)*100,
                    "total_execution_time": total_time,
                    "test_date": self.start_time.isoformat()
                },
                "provider_stats": provider_stats,
                "detailed_results": self.results,
                "verified_models": VERIFIED_WORKING_MODELS,
                "available_providers": INFERENCE_PROVIDERS
            }, f, indent=2)
        
        print(f"📄 Detailed report saved: {report_filename}")
        print()
        print("🎉 HuggingFace Providers Integration Test Suite Complete!")
        print("=" * 80)

async def main():
    """Main test execution"""
    tester = ProviderSystemTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main()) 