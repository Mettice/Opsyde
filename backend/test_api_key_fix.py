#!/usr/bin/env python3
"""
Test script to verify API key injection fix
"""

import asyncio
import logging
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.runner import UnifiedRunner

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_api_key_injection():
    """Test that API keys are properly injected into task nodes"""
    
    # Create a simple workflow with an agent and task
    workflow_data = {
        "workflow_id": "test_api_key_injection",
        "nodes": [
            {
                "id": "agent-1",
                "type": "agent",
                "data": {
                    "label": "Research Agent",
                    "role": "Research Specialist",
                    "goal": "Conduct thorough research on given topics",
                    "backstory": "You are an expert researcher with access to various information sources.",
                    "framework": "crewai",
                    "llm": {
                        "provider": "perplexity",
                        "model": "llama-3.1-sonar-small-128k-online"
                    },
                    "temperature": 0.7,
                    "max_tokens": 4000,
                    "allowDelegation": False,
                    "enableMemory": False,
                    "verbose": True
                },
                "position": {"x": 100, "y": 100}
            },
            {
                "id": "task-1", 
                "type": "task",
                "data": {
                    "label": "Research Task",
                    "description": "Research the latest developments in AI",
                    "expectedOutput": "A comprehensive summary of recent AI developments"
                },
                "position": {"x": 300, "y": 100}
            }
        ],
        "edges": [
            {
                "id": "edge-1",
                "source": "agent-1",
                "target": "task-1",
                "sourceHandle": "output",
                "targetHandle": "input"
            }
        ],
        "inputs": {}
    }
    
    # Use a test user ID that should have API keys
    test_user_id = "test_user_123"
    
    logger.info(f"🧪 Testing API key injection with user: {test_user_id}")
    
    try:
        # Create runner and execute workflow
        runner = UnifiedRunner()
        
        logger.info("🚀 Starting workflow execution...")
        
        async for result in runner.execute_workflow(workflow_data, user_id=test_user_id):
            logger.info(f"📊 Execution result: {result}")
            
            # Check if we get past the API key issue
            if result.get("node_type") == "task":
                if "error" in result and "Agent framework 'crewai' not supported" in str(result.get("error", "")):
                    logger.error("❌ API key injection failed - still getting framework error")
                    return False
                elif result.get("result", {}).get("success"):
                    logger.info("✅ Task executed successfully - API key injection working!")
                    return True
                    
        logger.info("✅ Workflow completed without the previous API key error")
        return True
        
    except Exception as e:
        logger.error(f"❌ Test failed with error: {str(e)}")
        return False

async def main():
    """Main test function"""
    logger.info("🧪 Starting API key injection test...")
    
    success = await test_api_key_injection()
    
    if success:
        logger.info("✅ API key injection test PASSED")
        sys.exit(0)
    else:
        logger.error("❌ API key injection test FAILED")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main()) 