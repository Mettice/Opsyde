from fastapi import APIRouter, Depends, HTTPException
from typing import List
from models.workflow import WorkflowCreate, WorkflowResponse
from services.workflow_service import WorkflowService

router = APIRouter()

@router.post("/workflows/", response_model=WorkflowResponse, tags=["workflows"])
async def create_workflow(
    workflow: WorkflowCreate,
    service: WorkflowService = Depends()
) -> WorkflowResponse:
    """
    Create a new workflow.
    
    Parameters:
    - workflow: Workflow creation model containing name, description, and nodes
    
    Returns:
    - WorkflowResponse: Created workflow details
    
    Raises:
    - HTTPException(400): If workflow data is invalid
    - HTTPException(500): If database operation fails
    """
    try:
        return await service.create_workflow(workflow)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) 