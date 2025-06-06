from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Dict, Any, List, Optional
from datetime import datetime

from models.api_models import (
    APIResponse, WorkflowBase, WorkflowCreateResponse, WorkflowUpdateResponse,
    WorkflowExecutionResponse, WorkflowExecutionListResponse,
    WorkflowValidationResponse, WorkflowExportResponse, ErrorCode
)
from models.workflow import Workflow, WorkflowValidationResult
from services.workflow_service import WorkflowService
from utils.security import security_manager
from utils.logging import get_logger
from utils.api_utils import handle_exception
from core.runner import UnifiedRunner
from auth.dependencies import get_current_user
from core.exceptions import WorkflowError
from framework_registry import validate_framework_llm_combination, get_available_frameworks

logger = get_logger(__name__)
router = APIRouter(prefix="/api/workflows", tags=["workflows"])

# Dependency
def get_workflow_service():
    return WorkflowService()

@router.post("/", response_model=APIResponse[WorkflowCreateResponse])
async def create_workflow(
    workflow_data: Dict[str, Any],
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """Create a new workflow"""
    try:
        workflow = await workflow_service.create_workflow(workflow_data)
        response = WorkflowCreateResponse(
            id=workflow.id,
            name=workflow.name,
            description=workflow.description,
            nodes=workflow.nodes,
            edges=workflow.edges,
            created_at=workflow.created_at,
            owner_id=workflow.owner_id
        )
        return APIResponse.success_response(response)
    except Exception as e:
        return handle_exception(e)

@router.get("/{workflow_id}", response_model=APIResponse[WorkflowBase])
async def get_workflow(
    workflow_id: str,
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """Get workflow by ID"""
    try:
        workflow = await workflow_service.get_workflow(workflow_id)
        if not workflow:
            return APIResponse.error_response(
                code=ErrorCode.NOT_FOUND,
                message=f"Workflow {workflow_id} not found"
            )
        return APIResponse.success_response(WorkflowBase(**workflow.dict()))
    except Exception as e:
        return handle_exception(e)

@router.put("/{workflow_id}", response_model=APIResponse[WorkflowUpdateResponse])
async def update_workflow(
    workflow_id: str,
    workflow_data: Dict[str, Any],
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """Update an existing workflow"""
    try:
        updated = await workflow_service.update_workflow(workflow_id, workflow_data)
        if not updated:
            return APIResponse.error_response(
                code=ErrorCode.NOT_FOUND,
                message=f"Workflow {workflow_id} not found"
            )
        
        response = WorkflowUpdateResponse(
            workflow_id=workflow_id,
            updated_fields=list(workflow_data.keys())
        )
        return APIResponse.success_response(response)
    except Exception as e:
        return handle_exception(e)

@router.delete("/{workflow_id}", response_model=APIResponse[Dict[str, str]])
async def delete_workflow(
    workflow_id: str,
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """Delete a workflow"""
    try:
        deleted = await workflow_service.delete_workflow(workflow_id)
        if not deleted:
            return APIResponse.error_response(
                code=ErrorCode.NOT_FOUND,
                message=f"Workflow {workflow_id} not found"
            )
        return APIResponse.success_response({
            "message": "Workflow deleted successfully"
        })
    except Exception as e:
        return handle_exception(e)

@router.post("/{workflow_id}/execute", response_model=APIResponse[WorkflowExecutionResponse])
async def execute_workflow(
    workflow_id: str,
    inputs: Dict[str, Any],
    background_tasks: BackgroundTasks,
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """Execute a workflow"""
    try:
        execution_id = await workflow_service.execute_workflow(
            workflow_id,
            inputs,
            background_tasks
        )
        
        response = WorkflowExecutionResponse(
            execution_id=execution_id,
            workflow_id=workflow_id,
            status="started",
            start_time=datetime.now(),
            inputs=inputs
        )
        return APIResponse.success_response(response)
    except Exception as e:
        return handle_exception(e)

@router.get("/{workflow_id}/executions", response_model=APIResponse[WorkflowExecutionListResponse])
async def list_executions(
    workflow_id: str,
    limit: int = 10,
    offset: int = 0,
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """List workflow executions"""
    try:
        executions = await workflow_service.list_executions(
            workflow_id,
            limit=limit,
            offset=offset
        )
        
        response = WorkflowExecutionListResponse(
            executions=[WorkflowExecutionResponse(**exec) for exec in executions],
            total_count=len(executions),
            limit=limit,
            offset=offset
        )
        return APIResponse.success_response(response)
    except Exception as e:
        return handle_exception(e)

@router.get("/{workflow_id}/executions/{execution_id}", response_model=APIResponse[WorkflowExecutionResponse])
async def get_execution(
    workflow_id: str,
    execution_id: str,
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """Get execution details"""
    try:
        execution = await workflow_service.get_execution(workflow_id, execution_id)
        if not execution:
            return APIResponse.error_response(
                code=ErrorCode.NOT_FOUND,
                message=f"Execution {execution_id} not found"
            )
        return APIResponse.success_response(WorkflowExecutionResponse(**execution))
    except Exception as e:
        return handle_exception(e)

@router.post("/{workflow_id}/validate", response_model=APIResponse[WorkflowValidationResponse])
async def validate_workflow(
    workflow_id: str,
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """Validate workflow structure and configuration"""
    try:
        validation_result = await workflow_service.validate_workflow(workflow_id)
        response = WorkflowValidationResponse(**validation_result)
        return APIResponse.success_response(response)
    except Exception as e:
        return handle_exception(e)

# NEW: Enhanced validation endpoint with framework compatibility checking
@router.post("/validate-enhanced", response_model=APIResponse[Dict[str, Any]])
async def validate_workflow_enhanced(
    workflow_data: Dict[str, Any]
):
    """Enhanced workflow validation including framework compatibility"""
    try:
        validation_errors = []
        validation_warnings = []
        framework_issues = []
        
        nodes = workflow_data.get("nodes", [])
        edges = workflow_data.get("edges", [])
        
        # Get available frameworks
        available_frameworks = get_available_frameworks()
        
        # Validate each node
        for node in nodes:
            node_id = node.get("id", "unknown")
            node_type = node.get("type")
            node_data = node.get("data", {})
            
            # Framework validation for nodes that use frameworks
            framework = node_data.get("framework")
            if framework:
                # Check if framework is available
                if framework not in available_frameworks:
                    framework_issues.append({
                        "node_id": node_id,
                        "node_type": node_type,
                        "issue": f"Framework '{framework}' not available",
                        "available_frameworks": available_frameworks,
                        "severity": "error"
                    })
                    continue
                
                # Validate framework/LLM combination
                llm_config = node_data.get("frameworkConfig", {})
                llm_provider = llm_config.get("provider") or node_data.get("llmProvider")
                
                if llm_provider:
                    validation = validate_framework_llm_combination(framework, llm_provider)
                    if not validation["valid"]:
                        framework_issues.append({
                            "node_id": node_id,
                            "node_type": node_type,
                            "framework": framework,
                            "llm_provider": llm_provider,
                            "issue": validation["error"],
                            "severity": "error"
                        })
                
                # Check for required configuration
                if node_type in ["agent", "task", "tool"] and not llm_config.get("api_key"):
                    validation_warnings.append({
                        "node_id": node_id,
                        "node_type": node_type,
                        "issue": "No API key configured - execution may fail",
                        "severity": "warning"
                    })
        
        # Basic workflow structure validation
        if not nodes:
            validation_errors.append("Workflow must contain at least one node")
        
        # Check for disconnected nodes
        connected_nodes = set()
        for edge in edges:
            connected_nodes.add(edge.get("source"))
            connected_nodes.add(edge.get("target"))
        
        disconnected_nodes = [
            node["id"] for node in nodes 
            if node["id"] not in connected_nodes and len(nodes) > 1
        ]
        
        if disconnected_nodes:
            validation_warnings.append({
                "issue": f"Disconnected nodes found: {', '.join(disconnected_nodes)}",
                "severity": "warning"
            })
        
        # Determine overall validation status
        is_valid = len(validation_errors) == 0 and len(framework_issues) == 0
        
        response = {
            "is_valid": is_valid,
            "validation_errors": validation_errors,
            "validation_warnings": validation_warnings,
            "framework_issues": framework_issues,
            "available_frameworks": available_frameworks,
            "node_count": len(nodes),
            "edge_count": len(edges),
            "validation_timestamp": datetime.now().isoformat()
        }
        
        return APIResponse.success_response(response)
        
    except Exception as e:
        return handle_exception(e)

@router.post("/{workflow_id}/export", response_model=APIResponse[WorkflowExportResponse])
async def export_workflow(
    workflow_id: str,
    export_type: str = "enterprise_package",
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """Export workflow definition with specified export type"""
    try:
        export_data = await workflow_service.export_workflow(workflow_id, export_type)
        response = WorkflowExportResponse(**export_data)
        return APIResponse.success_response(response)
    except Exception as e:
        return handle_exception(e)

@router.post("/import", response_model=APIResponse[WorkflowCreateResponse])
async def import_workflow(
    workflow_data: Dict[str, Any],
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """Import workflow definition"""
    try:
        workflow = await workflow_service.import_workflow(workflow_data)
        response = WorkflowCreateResponse(
            id=workflow.id,
            name=workflow.name,
            description=workflow.description,
            nodes=workflow.nodes,
            edges=workflow.edges,
            created_at=workflow.created_at,
            owner_id=workflow.owner_id
        )
        return APIResponse.success_response(response)
    except Exception as e:
        return handle_exception(e)

@router.get("/", response_model=APIResponse[List[WorkflowBase]])
async def list_workflows(
    owner_id: Optional[str] = None,
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """List workflows, optionally filtered by owner"""
    try:
        if owner_id:
            workflows = await workflow_service.get_workflows_by_owner(owner_id)
        else:
            workflows = await workflow_service.get_all_workflows()
            
        # Format response properly with data field
        return APIResponse.success_response({
            "data": workflows,
            "total_count": len(workflows),
            "owner_id": owner_id
        })
    except Exception as e:
        return handle_exception(e) 