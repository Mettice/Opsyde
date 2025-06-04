import pytest
from services.workflow_service import WorkflowService
from models.workflow import Workflow
from unittest.mock import Mock
from datetime import datetime

@pytest.fixture
def workflow_service(db_session):
    return WorkflowService(db_session)

@pytest.mark.asyncio
async def test_create_workflow():
    workflow_service = WorkflowService()
    
    workflow_data = {
        "name": "Test Workflow",
        "nodes": [],
        "edges": [],
        "config": {
            "name": "Test Workflow",
            "description": "A test workflow",
            "version": "1.0",
            "owner": "test_user",
            "tags": ["test"],
            "settings": {}
        },
        "inputs": {},
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    workflow = await workflow_service.create_workflow(workflow_data)
    
    assert workflow is not None
    assert workflow.config.name == "Test Workflow"
    assert workflow.config.description == "A test workflow"
    assert len(workflow.nodes) == 0
    assert len(workflow.edges) == 0 