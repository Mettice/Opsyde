#!/usr/bin/env python3
"""
Comprehensive HuggingFace Integration Test
Combines the best working models from both test approaches
"""

import asyncio
import time
import os
from dotenv import load_dotenv
from frameworks.huggingface_runner import run_huggingface_tool

# Load environment variables
load_dotenv()

class MockContext:
    """Mock context with API key for testing"""
    def __init__(self, api_key):
        self.user_api_keys = {"huggingface": api_key}
        self.user_id = "test_user"
    
    def get_api_key_for_framework(self, framework, model=None):
        return self.user_api_keys.get(framework.lower())

async def test_comprehensive_integration():
    """Test all verified working models with proper input formats"""
    
    print("🚀 COMPREHENSIVE HUGGINGFACE INTEGRATION TEST")
    print("=" * 60)
    
    # Get HuggingFace API key from environment
    hf_api_key = os.getenv("HUGGINGFACE_API_KEY")
    if not hf_api_key:
        print("❌ HUGGINGFACE_API_KEY not found in environment variables")
        return
    
    print(f"🔑 Using HuggingFace API key: {hf_api_key[:10]}...")
    
    # Create mock context with API key
    context = MockContext(hf_api_key)
    
    tests = [
        {
            "name": "Document Summarization",
            "task": "summarization",
            "model": "sshleifer/distilbart-cnn-12-6",
            "input": "CrewBuilder is a powerful workflow automation platform that enables teams to create, manage, and execute complex business processes. It provides an intuitive interface for designing workflows, integrating with various APIs, and automating repetitive tasks. The platform supports multiple AI providers and offers advanced features like conditional logic, data transformation, and real-time monitoring.",
            "config": {"max_length": 50, "min_length": 10}
        },
        {
            "name": "Sentiment Analysis",
            "task": "text-classification",
            "model": "cardiffnlp/twitter-roberta-base-sentiment",
            "input": "CrewBuilder is absolutely amazing! I love how easy it makes workflow automation.",
            "config": {}
        },
        {
            "name": "Question Answering",
            "task": "question-answering", 
            "model": "deepset/roberta-base-squad2",
            "input": {
                "question": "What is CrewBuilder?",
                "context": "CrewBuilder is a workflow automation platform that helps teams create and manage business processes efficiently."
            },
            "config": {}
        },
        {
            "name": "Zero-Shot Classification",
            "task": "zero-shot-classification",
            "model": "facebook/bart-large-mnli",
            "input": "This workflow automation tool is fantastic for productivity",
            "config": {"candidate_labels": ["technology", "business", "entertainment", "sports"]}
        }
    ]
    
    results = []
    total_time = 0
    
    for i, test in enumerate(tests, 1):
        print(f"\n📋 Test {i}: {test['name']}")
        print(f"   Model: {test['model']}")
        print(f"   Task: {test['task']}")
        
        start_time = time.time()
        
        try:
            result = await run_huggingface_tool(
                config={
                    "taskType": test['task'],
                    "modelName": test['model'],
                    **test['config']
                },
                inputs={"inputs": test['input']},
                context=context
            )
            
            execution_time = time.time() - start_time
            total_time += execution_time
            
            if result.get("success"):
                print(f"   ✅ SUCCESS ({execution_time:.2f}s)")
                print(f"   📤 Output: {result.get('output', 'No output')}")
                results.append({"test": test['name'], "status": "SUCCESS", "time": execution_time})
            else:
                print(f"   ❌ FAILED ({execution_time:.2f}s)")
                print(f"   🚨 Error: {result.get('error', 'Unknown error')}")
                results.append({"test": test['name'], "status": "FAILED", "time": execution_time, "error": result.get('error')})
                
        except Exception as e:
            execution_time = time.time() - start_time
            total_time += execution_time
            print(f"   💥 EXCEPTION ({execution_time:.2f}s)")
            print(f"   🚨 Error: {str(e)}")
            results.append({"test": test['name'], "status": "EXCEPTION", "time": execution_time, "error": str(e)})
    
    # Generate comprehensive report
    print("\n" + "=" * 60)
    print("📊 COMPREHENSIVE TEST RESULTS")
    print("=" * 60)
    
    successful = [r for r in results if r["status"] == "SUCCESS"]
    failed = [r for r in results if r["status"] in ["FAILED", "EXCEPTION"]]
    
    success_rate = len(successful) / len(results) * 100
    avg_response_time = total_time / len(results)
    
    print(f"✅ Success Rate: {success_rate:.0f}% ({len(successful)}/{len(results)})")
    print(f"⏱️  Average Response Time: {avg_response_time:.2f}s")
    print(f"🕒 Total Test Time: {total_time:.2f}s")
    
    if successful:
        print(f"\n🎉 WORKING MODELS ({len(successful)}):")
        for result in successful:
            print(f"   ✅ {result['test']} - {result['time']:.2f}s")
    
    if failed:
        print(f"\n⚠️  FAILED MODELS ({len(failed)}):")
        for result in failed:
            print(f"   ❌ {result['test']} - {result.get('error', 'Unknown error')}")
    
    print(f"\n🏆 INTEGRATION STATUS:")
    if success_rate >= 75:
        print("   🟢 PRODUCTION READY - High success rate")
    elif success_rate >= 50:
        print("   🟡 PARTIALLY READY - Moderate success rate")
    else:
        print("   🔴 NEEDS WORK - Low success rate")
    
    print(f"\n💡 BUSINESS VALUE:")
    business_features = []
    if any("Summarization" in r["test"] for r in successful):
        business_features.append("📄 Document Processing")
    if any("Sentiment" in r["test"] for r in successful):
        business_features.append("😊 Customer Feedback Analysis")
    if any("Question" in r["test"] for r in successful):
        business_features.append("❓ Information Extraction")
    if any("Classification" in r["test"] for r in successful):
        business_features.append("🏷️  Content Categorization")
    
    for feature in business_features:
        print(f"   {feature}")
    
    return {
        "success_rate": success_rate,
        "working_models": len(successful),
        "avg_response_time": avg_response_time,
        "business_features": len(business_features)
    }

if __name__ == "__main__":
    asyncio.run(test_comprehensive_integration()) 