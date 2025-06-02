#!/usr/bin/env python3
"""
🔧 Universal API Runner Test
Testing API research, auto-configuration, and multi-protocol support
"""

import asyncio
import json
from datetime import datetime
from core.workflow_execution_context import create_execution_context

async def test_universal_api_research():
    """Test the API research functionality"""
    print("🔍 Testing Universal API Research")
    print("=" * 50)
    
    # Create execution context with real user
    context = await create_execution_context("f31db8d3-7b54-46b5-bebf-1ea7b6b2edff", "universal_api_test")
    
    # Test 1: Research a popular API (GitHub)
    print("\n📋 Test 1: GitHub API Research")
    print("-" * 30)
    
    workflow_data = {
        "nodes": [
            {
                "id": "trigger-1",
                "type": "trigger",
                "data": {
                    "label": "Manual Trigger",
                    "triggerType": "manual",
                    "nodeType": "trigger"
                },
                "position": {"x": 100, "y": 100}
            },
            {
                "id": "research-1", 
                "type": "tool",
                "data": {
                    "label": "GitHub API Research",
                    "toolType": "universal_api",
                    "framework": "universal_api",
                    "nodeType": "tool",
                    "api_service_name": "GitHub",
                    "ai_description": "I want to get repository information and user profiles from GitHub",
                    "api_endpoint_hint": "https://api.github.com",
                    "description": "Research GitHub API for repository and user data"
                },
                "position": {"x": 300, "y": 100}
            },
            {
                "id": "output-1",
                "type": "output", 
                "data": {
                    "label": "Research Results",
                    "outputType": "json",
                    "nodeType": "output"
                },
                "position": {"x": 500, "y": 100}
            }
        ],
        "edges": [
            {"id": "e1", "source": "trigger-1", "target": "research-1"},
            {"id": "e2", "source": "research-1", "target": "output-1"}
        ]
    }
    
    # Execute the research workflow
    from core.runner import UnifiedRunner
    runner = UnifiedRunner()
    
    global_inputs = {
        "workflow_name": "Universal API Research Test",
        "test_mode": True
    }
    
    # Add global inputs to workflow data
    workflow_data["inputs"] = global_inputs
    
    # Execute workflow and collect results
    results = {}
    async for result in runner.execute_workflow(workflow_data, context.user_id):
        if result.get("node_id"):
            results[result["node_id"]] = result.get("result")
    
    print(f"✅ Research completed: {bool(results)}")
    if results.get('research-1'):
        research_result = results['research-1']
        if isinstance(research_result, dict) and research_result.get('value'):
            research_data = research_result['value']
            print(f"🔍 Service detected: {research_data.get('data', {}).get('service_detected', 'Unknown')}")
            print(f"🌐 API type: {research_data.get('data', {}).get('api_type', 'Unknown')}")
            print(f"🔗 Base URL: {research_data.get('data', {}).get('base_url', 'Unknown')}")
            print(f"🔐 Auth type: {research_data.get('data', {}).get('auth_type', 'Unknown')}")
            print(f"📊 Confidence: {research_data.get('data', {}).get('confidence', 0)}")
            print(f"🎯 Endpoints found: {research_data.get('data', {}).get('endpoints_found', 0)}")
        else:
            print(f"🔍 Research result: {research_result}")

async def test_universal_api_execution():
    """Test API execution with pre-configured research results"""
    print("\n\n🚀 Testing Universal API Execution")
    print("=" * 50)
    
    # Create execution context
    context = await create_execution_context("f31db8d3-7b54-46b5-bebf-1ea7b6b2edff", "universal_api_execution_test")
    
    # Test 2: Execute a REST API call with mock research results
    print("\n📋 Test 2: REST API Execution")
    print("-" * 30)
    
    # Mock research result for a weather API
    mock_research_result = {
        "success": True,
        "service_name": "OpenWeatherMap",
        "api_type": "REST",
        "protocol": "rest",
        "base_url": "https://api.openweathermap.org/data/2.5/weather",
        "auth_type": "api_key",
        "auth_header": "appid",
        "primary_method": "GET",
        "primary_endpoints": [
            {
                "name": "current_weather",
                "method": "GET",
                "path": "/weather",
                "description": "Get current weather data"
            }
        ],
        "default_headers": {
            "Content-Type": "application/json"
        },
        "confidence": 0.95
    }
    
    workflow_data = {
        "nodes": [
            {
                "id": "trigger-1",
                "type": "trigger",
                "data": {
                    "label": "Manual Trigger",
                    "triggerType": "manual",
                    "nodeType": "trigger"
                },
                "position": {"x": 100, "y": 100}
            },
            {
                "id": "input-1",
                "type": "input",
                "data": {
                    "label": "City Input",
                    "inputType": "text",
                    "value": "London",
                    "nodeType": "input"
                },
                "position": {"x": 200, "y": 100}
            },
            {
                "id": "api-1", 
                "type": "tool",
                "data": {
                    "label": "Weather API Call",
                    "toolType": "universal_api",
                    "framework": "universal_api",
                    "nodeType": "tool",
                    "api_research_result": mock_research_result,
                    "frameworkConfig": {
                        "url": "https://api.openweathermap.org/data/2.5/weather",
                        "method": "GET"
                    },
                    "description": "Get weather data using Universal API"
                },
                "position": {"x": 400, "y": 100}
            },
            {
                "id": "output-1",
                "type": "output", 
                "data": {
                    "label": "Weather Results",
                    "outputType": "json",
                    "nodeType": "output"
                },
                "position": {"x": 600, "y": 100}
            }
        ],
        "edges": [
            {"id": "e1", "source": "trigger-1", "target": "input-1"},
            {"id": "e2", "source": "input-1", "target": "api-1"},
            {"id": "e3", "source": "api-1", "target": "output-1"}
        ]
    }
    
    # Execute the API workflow
    from core.runner import UnifiedRunner
    runner = UnifiedRunner()
    
    global_inputs = {
        "workflow_name": "Universal API Execution Test",
        "test_mode": True
    }
    
    # Add global inputs to workflow data
    workflow_data["inputs"] = global_inputs
    
    # Execute workflow and collect results
    results = {}
    async for result in runner.execute_workflow(workflow_data, context.user_id):
        if result.get("node_id"):
            results[result["node_id"]] = result.get("result")
    
    print(f"✅ API execution completed: {bool(results)}")
    if results.get('api-1'):
        api_result = results['api-1']
        if isinstance(api_result, dict) and api_result.get('value'):
            api_data = api_result['value']
            print(f"🌐 Protocol used: {api_data.get('data', {}).get('protocol', 'Unknown')}")
            print(f"📊 Status code: {api_data.get('data', {}).get('status_code', 'Unknown')}")
            print(f"✅ Success: {api_data.get('success', False)}")
        else:
            print(f"🌐 API result: {api_result}")

async def test_protocol_support():
    """Test different protocol support"""
    print("\n\n🔧 Testing Protocol Support")
    print("=" * 50)
    
    from frameworks.universal_api_runner import UniversalAPIRunner
    runner = UniversalAPIRunner()
    
    # Test GraphQL support
    print("\n📋 Test 3: GraphQL Protocol")
    print("-" * 30)
    
    graphql_config = {
        "protocol": "graphql",
        "base_url": "https://api.github.com/graphql",
        "auth_type": "bearer_token",
        "auth_header": "Authorization",
        "default_headers": {
            "Content-Type": "application/json"
        },
        "primary_endpoints": [
            {
                "name": "user",
                "method": "POST",
                "description": "Get user information"
            }
        ]
    }
    
    graphql_input = {
        "query": "query { viewer { login name } }",
        "variables": {}
    }
    
    config = {"api_research_result": graphql_config}
    graphql_result = await runner.run_universal_api_tool(config, graphql_input)
    
    print(f"🔍 GraphQL test result: {graphql_result.get('success', False)}")
    print(f"📝 Protocol: {graphql_result.get('protocol', 'Unknown')}")
    if not graphql_result.get('success'):
        print(f"❌ Error: {graphql_result.get('error', 'Unknown error')}")
    
    # Test SOAP support
    print("\n📋 Test 4: SOAP Protocol")
    print("-" * 30)
    
    soap_config = {
        "protocol": "soap",
        "base_url": "https://example.com/soap/service",
        "auth_type": "basic_auth",
        "default_headers": {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": "GetData"
        },
        "primary_endpoints": [
            {
                "name": "GetData",
                "method": "POST",
                "description": "Get data via SOAP"
            }
        ]
    }
    
    soap_input = {
        "operation": "GetData",
        "parameters": {
            "id": "123",
            "type": "user"
        }
    }
    
    config = {"api_research_result": soap_config}
    soap_result = await runner.run_universal_api_tool(config, soap_input)
    
    print(f"🔍 SOAP test result: {soap_result.get('success', False)}")
    print(f"📝 Protocol: {soap_result.get('protocol', 'Unknown')}")
    if not soap_result.get('success'):
        print(f"❌ Error: {soap_result.get('error', 'Unknown error')}")

async def test_api_research_standalone():
    """Test standalone API research functionality"""
    print("\n\n🔬 Testing Standalone API Research")
    print("=" * 50)
    
    from frameworks.universal_api_runner import research_universal_api
    
    # Test researching different types of APIs
    apis_to_research = [
        {
            "name": "Stripe",
            "description": "I want to process payments and manage subscriptions",
            "hint": "https://api.stripe.com"
        },
        {
            "name": "Slack",
            "description": "I want to send messages and manage channels",
            "hint": "https://slack.com/api"
        },
        {
            "name": "Twitter",
            "description": "I want to post tweets and get user timelines",
            "hint": "https://api.twitter.com"
        }
    ]
    
    for i, api_info in enumerate(apis_to_research, 1):
        print(f"\n📋 Test {i + 4}: {api_info['name']} API Research")
        print("-" * 30)
        
        try:
            research_result = await research_universal_api(
                service_name=api_info['name'],
                description=api_info['description'],
                endpoint_hint=api_info['hint']
            )
            
            print(f"✅ Research completed: {research_result.get('success', False)}")
            if research_result.get('success'):
                print(f"🔍 Service: {research_result.get('service_name', 'Unknown')}")
                print(f"🌐 API type: {research_result.get('api_type', 'Unknown')}")
                print(f"🔗 Base URL: {research_result.get('base_url', 'Unknown')}")
                print(f"🔐 Auth type: {research_result.get('auth_type', 'Unknown')}")
                print(f"📊 Confidence: {research_result.get('confidence', 0)}")
                endpoints = research_result.get('endpoints', [])
                print(f"🎯 Endpoints found: {len(endpoints)}")
                if endpoints:
                    print(f"📝 Sample endpoint: {endpoints[0].get('name', 'Unknown')}")
            else:
                print(f"❌ Research failed: {research_result.get('error', 'Unknown error')}")
                suggestions = research_result.get('suggestions', [])
                if suggestions:
                    print(f"💡 Suggestions: {', '.join(suggestions)}")
                    
        except Exception as e:
            print(f"❌ Research error: {str(e)}")

async def main():
    """Run all Universal API tests"""
    print("🚀 Universal API Runner Comprehensive Test")
    print("=" * 60)
    print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Test 1: API Research in workflow
        await test_universal_api_research()
        
        # Test 2: API Execution in workflow  
        await test_universal_api_execution()
        
        # Test 3: Protocol support
        await test_protocol_support()
        
        # Test 4: Standalone research
        await test_api_research_standalone()
        
        print("\n" + "=" * 60)
        print("🎉 All Universal API tests completed!")
        print(f"⏰ Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
    except Exception as e:
        print(f"\n❌ Test suite failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main()) 