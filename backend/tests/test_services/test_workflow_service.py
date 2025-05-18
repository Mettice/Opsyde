import pytest
from services.workflow_service import WorkflowService
from models.workflow import Workflow
from unittest.mock import Mock

@pytest.fixture
def workflow_service(db_session):
    return WorkflowService(db_session)

@pytest.mark.asyncio
async def test_create_workflow(workflow_service):
    # Arrange
    workflow_data = {
        "name": "Test Workflow",
        "description": "Test Description",
        "nodes": [],
        "edges": []
    }
    
    # Act
    workflow = await workflow_service.create_workflow(workflow_data)
    
    # Assert
    assert workflow.name == "Test Workflow"
    assert workflow.description == "Test Description" 