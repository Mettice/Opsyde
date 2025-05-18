import pytest
from typing import Dict, Any
from backend.models.data import NodeData
from backend.nodes.agent_node import AgentNode
from unittest.mock import Mock, patch, MagicMock
from backend.core.exceptions import FrameworkError
from datetime import datetime

@pytest.fixture
def agent_node():
    """Create an instance of AgentNode for testing"""
    return AgentNode()

@pytest.fixture
def sample_config():
    """Sample configuration for agent node testing"""
    return {
        "framework": "crewai",
        "goal": "Help the user",
        "role": "Assistant",
        "max_tokens": 2000,
        "model": "gpt-3.5-turbo",
        "temperature": 0.7,
        "enable_memory": False
    }

@pytest.fixture
def base_node_context():
    return {
        "env": {
            "DISCORD_WEBHOOK_URL": "test-url",
            "GOOGLE_SHEETS_CREDENTIALS": "{}",
            "OPENAI_API_KEY": "test-key"
        },
        "execution_id": "test-execution-1",
        "user_id": "test-user-1",
        "workflow_id": "test-workflow-1"
    }

@pytest.mark.asyncio
async def test_agent_node_processing(agent_node, sample_config, base_node_context):
    """Test the main processing flow of an agent node"""
    # Arrange
    test_input = {"input": NodeData(value="What is the weather?")}
    test_node = {
        "id": "agent-1",
        "type": "agent",
        "data": sample_config
    }
    
    # Act
    with patch('backend.core.node_processor.node_processor.process_node') as mock_process:
        mock_process.return_value = {"output": "The weather is sunny"}
        result = await agent_node.process(test_node, test_input, base_node_context)
    
    # Assert
    assert result["success"] is True
    assert result["type"] == "agent_result"
    assert "output" in result["data"]
    mock_process.assert_called_once_with(test_node, test_input, base_node_context)

@pytest.mark.asyncio
async def test_agent_node_invalid_config(agent_node, base_node_context):
    """Test agent node behavior with invalid configuration"""
    # Arrange
    test_input = {"input": NodeData(value="What is the weather?")}
    test_node = {
        "id": "agent-1",
        "type": "agent",
        "data": {}  # Empty config
    }
    
    # Act
    result = await agent_node.process(test_node, test_input, base_node_context)
    
    # Assert
    assert result["success"] is False
    assert result["type"] == "error"
    assert "validation_error" in result["error_type"]

@pytest.mark.asyncio
async def test_agent_node_framework_error(agent_node, sample_config):
    """Test agent node behavior when framework raises an error"""
    # Arrange
    test_input = {"input": NodeData(value="What is the weather?")}
    test_node = {
        "id": "agent-1",
        "type": "agent",
        "data": sample_config
    }
    context = {"execution_id": "exec-1"}
    
    # Act
    with patch('backend.core.node_processor.node_processor.process_node') as mock_process:
        mock_process.side_effect = FrameworkError("Framework error occurred")
        result = await agent_node.process(test_node, test_input, context)
    
    # Assert
    assert result["success"] is False
    assert result["type"] == "error"
    assert "framework_error" in result["error_type"]
    assert "Framework error occurred" in result["error"] 