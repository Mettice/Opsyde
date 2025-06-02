#api/routers/crew.py
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request
from typing import Dict, Any, List, Optional
import json
from datetime import datetime
import logging

from models.workflow import Workflow, WorkflowInput
from services.workflow_service import WorkflowService, get_workflow_service
from fastapi.responses import JSONResponse
from core.runner import UnifiedRunner
from utils.security import get_current_user_optional

# Import the serialization helper
from backend.models.data import NodeData

router = APIRouter(prefix="/api/workflows", tags=["workflows"])

logger = logging.getLogger(__name__)

# Helper function to serialize node data objects
def serialize_node_data(obj, depth=0):
    """Recursively serialize NodeData and other objects to JSON-safe dict"""
    if depth > 20:  # Prevent infinite recursion
        return str(obj)
        
    if isinstance(obj, NodeData):
        # Use to_dict if available
        if hasattr(obj, 'to_dict') and callable(obj.to_dict):
            result = obj.to_dict()
            # Process nested objects in the result
            if isinstance(result, dict):
                return {k: serialize_node_data(v, depth + 1) for k, v in result.items()}
            return result
        
        # Fallback to manual serialization
        try:
            return {
                "value": serialize_node_data(obj.value, depth + 1) if obj.value is not None else None,
                "metadata": serialize_node_data(obj.metadata, depth + 1) if obj.metadata is not None else None,
                "error": obj.error,
                "timestamp": obj.timestamp.isoformat() if hasattr(obj, "timestamp") and obj.timestamp else None
            }
        except Exception as e:
            return {"error": f"Serialization error: {str(e)}"}
    elif isinstance(obj, dict):
        return {k: serialize_node_data(v, depth + 1) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_node_data(item, depth + 1) for item in obj]
    elif hasattr(obj, 'to_dict') and callable(getattr(obj, 'to_dict')):
        try:
            result = obj.to_dict()
            if isinstance(result, dict):
                return {k: serialize_node_data(v, depth + 1) for k, v in result.items()}
            return result
        except Exception as e:
            return str(obj)
    elif hasattr(obj, '__dict__'):
        try:
            return serialize_node_data(obj.__dict__, depth + 1)
        except Exception as e:
            return str(obj)
    elif hasattr(obj, 'isoformat') and callable(getattr(obj, 'isoformat')):
        return obj.isoformat()
    else:
        try:
            # Test if JSON serializable
            json.dumps(obj)
            return obj
        except:
            # If not serializable, convert to string
            return str(obj)

@router.get("/", response_model=List[Dict[str, Any]])
async def list_workflows(
    service: WorkflowService = Depends(get_workflow_service)
):
    """List all workflows"""
    workflows = await service.get_all_workflows()
    return [w.dict() for w in workflows]

@router.get("/{workflow_id}", response_model=Dict[str, Any])
async def get_workflow(
    workflow_id: str,
    service: WorkflowService = Depends(get_workflow_service)
):
    """Get a workflow by ID"""
    workflow = await service.get_workflow(workflow_id)
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    return workflow.dict()

@router.post("/", response_model=Dict[str, Any])
async def create_workflow(
    workflow_data: Dict[str, Any],
    service: WorkflowService = Depends(get_workflow_service)
):
    """Create a new workflow"""
    # Create workflow model
    try:
        workflow = await service.create_workflow(workflow_data)
        return workflow.dict()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{workflow_id}", response_model=Dict[str, Any])
async def update_workflow(
    workflow_id: str,
    workflow_data: Dict[str, Any],
    service: WorkflowService = Depends(get_workflow_service)
):
    """Update a workflow"""
    updated = await service.update_workflow(workflow_id, workflow_data)
    
    if not updated:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    return updated.dict()

@router.delete("/{workflow_id}", response_model=Dict[str, Any])
async def delete_workflow(
    workflow_id: str,
    service: WorkflowService = Depends(get_workflow_service)
):
    """Delete a workflow"""
    result = await service.delete_workflow(workflow_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    return {"success": True, "id": workflow_id}

@router.post("/{workflow_id}/execute")
async def execute_workflow(
    workflow_id: str,
    inputs: Dict[str, Any] = None,
    service: WorkflowService = Depends(get_workflow_service),
    current_user: Optional[Dict] = Depends(get_current_user_optional)
):
    """Execute a workflow"""
    try:
        # Get the workflow data
        workflow = await service.get_workflow(workflow_id)
        if not workflow:
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "error": f"Workflow not found: {workflow_id}",
                    "timestamp": datetime.now().isoformat()
                }
            )
        
        # Get user ID for API key injection
        user_id = current_user.get("id") if current_user else None
        logger.info(f"🔐 Executing workflow {workflow_id} for user: {user_id}")
        
        # Convert workflow to dict format for runner
        workflow_data = {
            "workflow_id": workflow_id,
            "nodes": [node.dict() if hasattr(node, 'dict') else node for node in workflow.nodes],
            "edges": [edge.dict() if hasattr(edge, 'dict') else edge for edge in workflow.edges],
            "inputs": inputs or {}
        }
        
        # Use runner instead of engine for proper API key injection
        runner = UnifiedRunner()
        execution_stream = runner.execute_workflow(workflow_data, user_id=user_id)
        
        # Process the results to ensure proper serialization
        results = []
        node_results = {}
        
        async for result in execution_stream:
            # Serialize the result to handle NodeData objects
            serialized_result = serialize_node_data(result)
            
            # Store individual node results
            if "node_id" in serialized_result:
                node_results[serialized_result["node_id"]] = serialized_result
                
            # Store the result for streaming
            results.append(serialized_result)
        
        # Create a structured response
        response = {
            "success": True,
            "results": results,
            "node_results": node_results,
            "timestamp": datetime.now().isoformat()
        }
        
        return JSONResponse(content=response)
    except ValueError as e:
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )
    except Exception as e:
        logger.error(f"Error executing workflow {workflow_id}: {str(e)}")
        return JSONResponse(
            status_code=200,  # Use 200 for frontend compatibility
            content={
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )

@router.post("/{workflow_id}/validate", response_model=Dict[str, Any])
async def validate_workflow(
    workflow_id: str,
    service: WorkflowService = Depends(get_workflow_service)
):
    """Validate a workflow structure"""
    workflow = await service.get_workflow(workflow_id)
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    validation = await service.validate_workflow(workflow)
    return validation

@router.patch("/{workflow_id}/toggle-activation", response_model=Dict[str, Any])
async def toggle_workflow_activation(
    workflow_id: str,
    activation_data: Dict[str, Any],
    service: WorkflowService = Depends(get_workflow_service)
):
    """Toggle workflow activation status"""
    try:
        is_active = activation_data.get("is_active", False)
        
        # Get existing workflow
        workflow = await service.get_by_id(workflow_id)
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        # Update activation status
        workflow["is_active"] = is_active
        workflow["updated_at"] = datetime.now().isoformat()
        
        # Save updated workflow
        updated_workflow = await service.update(workflow_id, workflow)
        
        return {
            "success": True,
            "message": f"Workflow {'activated' if is_active else 'deactivated'} successfully",
            "workflow": serialize_node_data(updated_workflow)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling workflow activation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))