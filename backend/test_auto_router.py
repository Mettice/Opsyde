#!/usr/bin/env python3
"""
🚦 HuggingFace Auto-Router Test
Test the new auto-router with all production-verified tools
"""

import asyncio
import os
from dotenv import load_dotenv
from frameworks.huggingface_auto_router import route_huggingface_task

# Load environment variables
load_dotenv()

async def test_auto_router():
    """Test all HuggingFace tools using the auto-router"""
    
    print("🚦 HUGGINGFACE AUTO-ROUTER TEST")
    print("=" * 60)
    
    # Get API key
    api_key = os.getenv('HUGGINGFACE_API_KEY')
    if not api_key:
        print("❌ No HuggingFace API key found in .env file")
        return
    
    print(f"🔑 Using HuggingFace API key: {api_key[:10]}...")
    print()
    
    # Test cases from our toolkit
    test_cases = [
        {
            "name": "📄 Document Summarizer",
            "task": "summarization",
            "model": "sshleifer/distilbart-cnn-12-6",
            "inputs": {
                "inputs": "CrewBuilder is a powerful workflow automation platform that enables teams to create, manage, and execute complex business processes efficiently. It provides an intuitive interface for designing workflows, integrating with various APIs, and automating repetitive tasks. The platform supports multiple AI providers and offers advanced features like conditional logic, data transformation, and real-time monitoring. Users can easily connect different services and create sophisticated automation workflows without extensive programming knowledge."
            },
            "config": {"maxLength": 150, "minLength": 30}
        },
        {
            "name": "😊 Sentiment Analyzer",
            "task": "text-classification",
            "model": "cardiffnlp/twitter-roberta-base-sentiment",
            "inputs": {
                "inputs": "CrewBuilder is absolutely amazing! I love how easy it is to create complex workflows."
            }
        },
        {
            "name": "❓ Question Answerer",
            "task": "question-answering",
            "model": "deepset/roberta-base-squad2",
            "inputs": {
                "inputs": {
                    "question": "What is CrewBuilder?",
                    "context": "CrewBuilder is a workflow automation platform that helps teams create and manage business processes efficiently. It supports AI integrations and provides tools for workflow design."
                }
            }
        },
        {
            "name": "🏷️ Smart Classifier",
            "task": "zero-shot-classification",
            "model": "facebook/bart-large-mnli",
            "inputs": {
                "inputs": {
                    "text": "CrewBuilder provides powerful AI workflow automation capabilities for businesses",
                    "candidate_labels": ["technology", "business", "sports", "entertainment"]
                }
            }
        }
    ]
    
    results = []
    total_time = 0
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"📋 Test {i}: {test_case['name']}")
        print(f"   Model: {test_case['model']}")
        print(f"   Task: {test_case['task']}")
        
        try:
            import time
            start_time = time.time()
            
            result = await route_huggingface_task(
                task=test_case['task'],
                model=test_case['model'],
                inputs=test_case['inputs'],
                api_key=api_key,
                config=test_case.get('config', {})
            )
            
            end_time = time.time()
            execution_time = end_time - start_time
            total_time += execution_time
            
            if result.get('success'):
                print(f"   ✅ SUCCESS ({execution_time:.2f}s)")
                print(f"   📤 Output: {result.get('output', '')[:100]}...")
                if 'method' in result:
                    print(f"   🔧 Method: {result['method']}")
                results.append({
                    "name": test_case['name'],
                    "success": True,
                    "time": execution_time,
                    "method": result.get('method', 'unknown')
                })
            else:
                print(f"   ❌ FAILED ({execution_time:.2f}s)")
                print(f"   🚨 Error: {result.get('error', 'Unknown error')}")
                results.append({
                    "name": test_case['name'],
                    "success": False,
                    "time": execution_time,
                    "error": result.get('error', 'Unknown error')
                })
                
        except Exception as e:
            print(f"   ❌ EXCEPTION: {str(e)}")
            results.append({
                "name": test_case['name'],
                "success": False,
                "time": 0,
                "error": str(e)
            })
        
        print()
    
    # Summary
    print("=" * 60)
    print("📊 AUTO-ROUTER TEST RESULTS")
    print("=" * 60)
    
    successful = [r for r in results if r['success']]
    failed = [r for r in results if not r['success']]
    
    success_rate = (len(successful) / len(results)) * 100
    avg_time = total_time / len(results) if results else 0
    
    print(f"✅ Success Rate: {success_rate:.0f}% ({len(successful)}/{len(results)})")
    print(f"⏱️  Average Response Time: {avg_time:.2f}s")
    print(f"🕒 Total Test Time: {total_time:.2f}s")
    print()
    
    if successful:
        print("🎉 WORKING TOOLS:")
        for result in successful:
            method_info = f" ({result.get('method', 'unknown')})" if 'method' in result else ""
            print(f"   ✅ {result['name']} - {result['time']:.2f}s{method_info}")
        print()
    
    if failed:
        print("⚠️  FAILED TOOLS:")
        for result in failed:
            print(f"   ❌ {result['name']} - {result.get('error', 'Unknown error')}")
        print()
    
    print("🏆 AUTO-ROUTER STATUS:")
    if success_rate >= 75:
        print("   🟢 PRODUCTION READY - High success rate")
    elif success_rate >= 50:
        print("   🟡 NEEDS IMPROVEMENT - Moderate success rate")
    else:
        print("   🔴 NEEDS WORK - Low success rate")
    
    print("\n💡 BUSINESS VALUE:")
    if len(successful) >= 3:
        print("   📄 Document Processing")
        print("   😊 Customer Feedback Analysis")
        print("   ❓ Information Extraction")
        print("   🏷️ Content Categorization")
    
    print(f"\n🚦 Auto-Router Integration: {'SUCCESS' if success_rate > 0 else 'FAILED'}")

if __name__ == "__main__":
    asyncio.run(test_auto_router()) 