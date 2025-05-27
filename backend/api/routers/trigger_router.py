from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Dict, List, Optional, AsyncGenerator, Any
import logging
from fastapi.responses import StreamingResponse
from datetime import datetime
import json

from backend.models.api_models import (
    APIResponse, TriggerBase, TriggerExecutionResponse, TriggerListResponse,
    TriggerRegistrationResponse, TriggerScheduleResponse, TriggerType,
    TriggerStatus, ErrorCode
)
from backend.services.trigger_service import TriggerService
from backend.utils.logging import get_logger
from backend.utils.security import get_current_user, security_manager
from backend.utils.api_utils import handle_exception
from backend.core.runner import UnifiedRunner
from backend.core.di import get_trigger_service

logger = get_logger(__name__)

async def get_current_user_optional(request: Request) -> Optional[Dict]:
    """Get current user if authenticated, otherwise return None"""
    try:
        # Try to get the Authorization header
        auth_header = request.headers.get("Authorization")
        logger.debug(f"Authorization header: {auth_header[:20] if auth_header else 'None'}...")
        
        if not auth_header:
            logger.debug("No Authorization header found")
            return None
            
        if not auth_header.startswith("Bearer "):
            logger.debug("Authorization header doesn't start with 'Bearer '")
            return None
        
        # Extract token
        token = auth_header.split(" ")[1]
        logger.debug(f"Extracted token: {token[:20]}...")
        
        # Verify token
        payload = security_manager.verify_token(token)
        logger.debug(f"Token verified successfully for user: {payload.get('user_id', 'unknown')}")
        return payload
        
    except Exception as e:
        # Log the specific error for debugging
        logger.debug(f"Authentication failed (optional): {str(e)}")
        # If any error occurs, just return None (unauthenticated)
        return None

# Create two routers - one with prefix and one without
router = APIRouter(tags=["triggers"])
root_router = APIRouter(tags=["triggers"])  # No prefix for backward compatibility

async def run_crew(data: Dict[str, Any]) -> AsyncGenerator[str, None]:
    """
    Run a crew workflow with proper execution tracking
    
    Args:
        data: Dictionary containing workflow data including nodes, edges, and inputs
        
    Yields:
        JSON strings containing execution results for each node
    """
    try:
        runner = UnifiedRunner()
        nodes = data.get("nodes", [])
        edges = data.get("edges", [])
        inputs = data.get("inputs", {})
        
        logger.info(f"Starting workflow execution with {len(nodes)} nodes")
        
        # Initialize tracking
        node_results = {}
        executed_nodes = set()
        
        # Get execution order
        execution_order = runner.determine_execution_order(nodes, edges)
        
        # Create node lookup
        node_map = {node.get("id"): node for node in nodes}
        
        for node_id in execution_order:
            try:
                # Skip if already executed
                if node_id in executed_nodes:
                    continue
                    
                node = node_map.get(node_id)
                if not node:
                    continue

                # Get node inputs
                node_inputs = runner.get_node_inputs(node_id, edges, node_results, inputs)

                # Execute node
                result = await runner.execute_node(node, node_inputs)
                
                # Store result
                node_results[node_id] = result
                executed_nodes.add(node_id)
                
                # Format output
                output = {
                    "node_id": node_id,
                    "node_type": node.get("type", "unknown"),
                    "node_label": node.get("data", {}).get("label", "Unnamed Node"),
                    "result": result,
                    "metadata": {
                        "timestamp": datetime.now().isoformat(),
                        "execution_index": len(executed_nodes),
                        "has_error": isinstance(result, dict) and result.get("type") == "error"
                    }
                }
                
                yield json.dumps(output)
                
            except Exception as e:
                error_output = {
                    "node_id": node_id,
                    "type": "error",
                    "error": str(e),
                    "metadata": {
                        "timestamp": datetime.now().isoformat(),
                        "execution_index": len(executed_nodes)
                    }
                }
                yield json.dumps(error_output)
                logger.error(f"Error executing node {node_id}: {str(e)}")
                
    except Exception as e:
        error_output = {
            "type": "error",
            "error": str(e),
            "metadata": {
                "timestamp": datetime.now().isoformat()
            }
        }
        yield json.dumps(error_output)
        logger.error(f"Error in workflow execution: {str(e)}")

@router.get("/executed", response_model=APIResponse[TriggerListResponse])
@router.get("/executed-triggers", response_model=APIResponse[TriggerListResponse])
async def get_executed_triggers(
    trigger_service: TriggerService = Depends(get_trigger_service)
) -> APIResponse[TriggerListResponse]:
    """List all executed triggers"""
    try:
        triggers = await trigger_service.list_triggers()
        executed_triggers = [
            TriggerBase(**trigger) for trigger in triggers 
            if trigger.get("trigger_count", 0) > 0
        ]
        
        response = TriggerListResponse(
            triggers=executed_triggers,
            total_count=len(executed_triggers)
        )
        return APIResponse.success_response(response)
        
    except Exception as e:
        return handle_exception(e)

# Also add the root_router route for backward compatibility
root_router.get("/executed-triggers")(get_executed_triggers)

@router.post("/register", response_model=APIResponse[TriggerRegistrationResponse])
async def register_trigger(
    trigger_data: Dict,
    request: Request,
    trigger_service: TriggerService = Depends(get_trigger_service)
) -> APIResponse[TriggerRegistrationResponse]:
    """Register a new trigger with its associated flow"""
    try:
        trigger_id = trigger_data.get("trigger_id")
        flow = trigger_data.get("flow")
        
        # Use optional authentication
        current_user = await get_current_user_optional(request)
        owner = current_user.get("id", "system") if current_user else "system"
        
        success = await trigger_service.register_trigger(trigger_id, flow, owner)
        
        if not success:
            return APIResponse.error_response(
                code=ErrorCode.VALIDATION_ERROR,
                message="Failed to register trigger"
            )
        
        # Create webhook URL if it's a webhook trigger
        webhook_url = None
        if trigger_data.get("type") == TriggerType.WEBHOOK:
            webhook_url = f"/api/triggers/{trigger_id}"
        
        response = TriggerRegistrationResponse(
            trigger_id=trigger_id,
            webhook_url=webhook_url,
            status=TriggerStatus.ACTIVE
        )
        return APIResponse.success_response(response)
        
    except Exception as e:
        return handle_exception(e)

# Protected routes that require authentication
@router.post("/{trigger_id}", response_model=APIResponse[TriggerExecutionResponse])
async def handle_trigger(
    trigger_id: str,
    request: Request,
    trigger_service: TriggerService = Depends(get_trigger_service)
) -> APIResponse[TriggerExecutionResponse]:
    """Handle incoming webhook triggers for flows"""
    try:
        payload = await request.json()
        logger.info(f"Received trigger for ID: {trigger_id}")
        
        # Use execute_trigger_flow here to increment the count properly
        flow = await trigger_service.execute_trigger_flow(trigger_id)
        if not flow:
            return APIResponse.error_response(
                code=ErrorCode.NOT_FOUND,
                message=f"Trigger {trigger_id} not found"
            )
        
        # Add payload to flow context
        flow["trigger_payload"] = payload
        
        # Start execution
        start_time = datetime.now()
        execution_id = f"exec_{trigger_id}_{start_time.timestamp()}"
        
        # Return streaming response with proper structure
        return StreamingResponse(
            run_crew(flow),
            media_type="text/event-stream",
            headers={
                "X-Execution-ID": execution_id,
                "X-Trigger-ID": trigger_id
            }
        )
        
    except Exception as e:
        return handle_exception(e)

@router.get("", response_model=APIResponse[TriggerListResponse])
async def list_triggers(
    owner: Optional[str] = None,
    trigger_service: TriggerService = Depends(get_trigger_service)
) -> APIResponse[TriggerListResponse]:
    """List all registered triggers"""
    try:
        triggers = await trigger_service.list_triggers(owner)
        
        response = TriggerListResponse(
            triggers=[TriggerBase(**trigger) for trigger in triggers],
            total_count=len(triggers)
        )
        return APIResponse.success_response(response)
        
    except Exception as e:
        return handle_exception(e)

@router.delete("/{trigger_id}", response_model=APIResponse[Dict[str, str]])
async def delete_trigger(
    trigger_id: str,
    trigger_service: TriggerService = Depends(get_trigger_service),
    current_user: Dict = Depends(get_current_user)
) -> APIResponse[Dict[str, str]]:
    """Delete a trigger"""
    try:
        success = await trigger_service.delete_trigger(trigger_id)
        
        if not success:
            return APIResponse.error_response(
                code=ErrorCode.NOT_FOUND,
                message=f"Trigger {trigger_id} not found"
            )
        
        return APIResponse.success_response({
            "message": f"Trigger {trigger_id} deleted successfully"
        })
        
    except Exception as e:
        return handle_exception(e)

@router.post("/schedule", response_model=APIResponse[TriggerScheduleResponse])
async def schedule_trigger(
    trigger_data: Dict,
    request: Request,
    trigger_service: TriggerService = Depends(get_trigger_service)
) -> APIResponse[TriggerScheduleResponse]:
    """Schedule a trigger for future execution"""
    try:
        trigger_id = trigger_data.get("trigger_id")
        if not trigger_id:
            return APIResponse.error_response(
                code=ErrorCode.VALIDATION_ERROR,
                message="Missing trigger_id"
            )
        
        # Register the trigger first
        flow = trigger_data.get("flow")
        
        # Use optional authentication
        current_user = await get_current_user_optional(request)
        owner = current_user.get("id", "system") if current_user else "system"
        
        success = await trigger_service.register_trigger(trigger_id, flow, owner)
        if not success:
            return APIResponse.error_response(
                code=ErrorCode.VALIDATION_ERROR,
                message="Failed to register trigger"
            )
        
        # Get next scheduled run
        schedule_info = trigger_service.get_schedule_info(trigger_data)
        
        response = TriggerScheduleResponse(
            trigger_id=trigger_id,
            schedule_type=schedule_info["type"],
            next_run=schedule_info["next_run"],
            status=TriggerStatus.ACTIVE
        )
        return APIResponse.success_response(response)
        
    except Exception as e:
        return handle_exception(e) 