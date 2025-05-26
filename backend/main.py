# backend/main.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Request, HTTPException, UploadFile, File, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from typing import Dict, List, Any, Optional, Union

# Framework imports
from frameworks.email_notifier import send_email
from frameworks.sheets_logger import log_to_sheet as push_to_sheet
from frameworks.discord_notifier import run_discord_notifier as post_to_discord
from frameworks.webhook_loader import handle_webhook_flow
from frameworks.cv_parser_runner import run_cv_parser_tool
from frameworks.webhook_runner import post_to_webhook
from frameworks.apscheduler_manager import scheduler_manager

# Core imports
from core.runner import UnifiedRunner
from core.di import get_unified_runner
from core.exceptions import CrewFlowError, ValidationError, ExecutionError

# API routers
from api.routers.workflow_router import router as workflow_router
from api.routers.node_router import router as node_router
from api.routers.tools import router as tools_router
from api.routers.auth_router import router as auth_router
from api.routers.trigger_router import router as trigger_router, root_router as trigger_root_router
from api.routers.output_router import router as output_router

# Models
from backend.models.data import NodeData

import json
import logging
import os
from datetime import datetime, timedelta
import asyncio
import base64
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Helper function to convert NodeData objects to dictionaries for JSON serialization
def convert_nodedata_to_dict(obj: Any, depth: int = 0) -> Any:
    """Convert NodeData objects to dictionaries for JSON serialization"""
    # Prevent excessive recursion
    if depth > 20:  # Limit recursion depth
        return str(obj)
    
    if isinstance(obj, NodeData):
        # Use the to_dict method if available (after our update)
        if hasattr(obj, 'to_dict') and callable(obj.to_dict):
            try:
                result = obj.to_dict()
                # Process nested objects in the result
                if isinstance(result, dict):
                    return {k: convert_nodedata_to_dict(v, depth + 1) for k, v in result.items()}
                return result
            except Exception as e:
                logger.error(f"Error using NodeData.to_dict: {str(e)}")
        
        # Fallback to manual conversion if to_dict isn't available
        try:
            value = convert_nodedata_to_dict(obj.value, depth + 1) if obj.value is not None else None
            metadata = convert_nodedata_to_dict(obj.metadata, depth + 1) if obj.metadata is not None else None
            
            return {
                "value": value,
                "metadata": metadata,
                "error": obj.error,
                "timestamp": obj.timestamp.isoformat() if obj.timestamp else None
            }
        except Exception as e:
            logger.error(f"Error converting NodeData: {str(e)}")
            return {"value": str(obj.value), "error": str(e)}
    elif isinstance(obj, dict):
        # Recursively convert values in dictionaries
        try:
            return {k: convert_nodedata_to_dict(v, depth + 1) for k, v in obj.items()}
        except Exception as e:
            logger.error(f"Error converting dict: {str(e)}")
            return {"error": f"Dict conversion error: {str(e)}"}
    elif isinstance(obj, list):
        # Recursively convert values in lists
        try:
            return [convert_nodedata_to_dict(item, depth + 1) for item in obj]
        except Exception as e:
            logger.error(f"Error converting list: {str(e)}")
            return [str(e)]
    elif hasattr(obj, 'to_dict') and callable(getattr(obj, 'to_dict')):
        # Handle any object with a to_dict method
        try:
            result = obj.to_dict()
            if isinstance(result, dict):
                return {k: convert_nodedata_to_dict(v, depth + 1) for k, v in result.items()}
            return result
        except Exception as e:
            logger.error(f"Error using to_dict method: {str(e)}")
            return str(obj)
    elif hasattr(obj, '__dict__'):  # Handle other custom objects
        try:
            return convert_nodedata_to_dict(obj.__dict__, depth + 1)
        except Exception as e:
            logger.error(f"Error converting object: {str(e)}")
            return str(obj)
    else:
        # Return other types as is
        try:
            # Check if the object is JSON serializable by attempting to serialize it
            json.dumps(obj)
            return obj
        except (TypeError, OverflowError, ValueError):
            # If not serializable, convert to string
            return str(obj)

app = FastAPI(
    title="Nodai",
    description="Nodai - Workflow Automation Platform",
    version="1.0.0"
)

# Initialize core components
unified_runner = UnifiedRunner()

# Configure CORS with more explicit settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "Content-Type", "Authorization"],
    max_age=3600,
)

# Add unified runner to app state
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    try:
        # Create necessary data directories
        os.makedirs("data/workflows", exist_ok=True)
        os.makedirs("data/triggers", exist_ok=True)
        os.makedirs("data/executions", exist_ok=True)
        os.makedirs("data/outputs", exist_ok=True)
        
        # Store unified runner in app state
        app.state.runner = unified_runner
        
        # Create a demo workflow if none exist
        try:
            from backend.services.workflow_service import workflow_service
            workflows = await workflow_service.get_all_workflows()
            
            if not workflows:
                logger.info("Creating demo workflow")
                demo_flow = {
                    "id": "demo-workflow-123",
                    "name": "Demo Workflow",
                    "description": "A sample workflow for demonstration",
                    "owner_id": "f31db8d3-7b54-46b5-bebf-1ea7b6b2edff",
                    "nodes": [
                        {
                            "id": "node-1",
                            "type": "input",
                            "data": {"label": "Input Node"}
                        },
                        {
                            "id": "node-2",
                            "type": "output",
                            "data": {"label": "Output Node"}
                        }
                    ],
                    "edges": [
                        {
                            "id": "edge-1",
                            "source": "node-1",
                            "target": "node-2"
                        }
                    ]
                }
                await workflow_service.create_workflow(demo_flow)
                logger.info("Demo workflow created successfully")
        except Exception as e:
            logger.error(f"Error creating demo workflow: {str(e)}")
        
        # Start scheduler
        scheduler_manager.start()
        logger.info("Application started successfully")
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup services on shutdown"""
    try:
        scheduler_manager.shutdown()
        logger.info("Application shutdown complete")
    except Exception as e:
        logger.error(f"Error during shutdown: {str(e)}")

# Register routers with dependencies
app.include_router(auth_router, prefix="/api/auth")
app.include_router(workflow_router, prefix="/api/workflows")
app.include_router(node_router, prefix="/api/nodes")
app.include_router(tools_router, prefix="/api/tools")
app.include_router(trigger_router, prefix="/api/triggers")
app.include_router(trigger_root_router)
app.include_router(output_router, prefix="/api/outputs")

# Error handlers
@app.exception_handler(CrewFlowError)
async def crewflow_exception_handler(request: Request, exc: CrewFlowError):
    """Handle CrewFlow-specific exceptions"""
    return JSONResponse(
        status_code=400,
        content={
            "type": exc.__class__.__name__,
            "message": exc.message,
            "details": exc.details
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "type": "http_error",
            "message": exc.detail
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "type": "internal_error",
            "message": "An unexpected error occurred"
        }
    )

# Direct execution endpoints
@app.post("/run-crew")
async def run_crew_endpoint(
    data: dict,
    runner: UnifiedRunner = Depends(get_unified_runner)
):
    """Execute a crew workflow"""
    try:
        # Format inputs
        if "inputs" not in data:
            data["inputs"] = {}
        elif isinstance(data["inputs"], str):
            try:
                data["inputs"] = json.loads(data["inputs"])
            except:
                data["inputs"] = {"input": data["inputs"]}
        
        logger.info(f"Executing workflow with {len(data.get('nodes', []))} nodes")
        return StreamingResponse(
            runner.execute_workflow(data),
            media_type="text/event-stream"
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ExecutionError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Error executing workflow: {str(e)}")
        raise HTTPException(status_code=500, detail="Workflow execution failed")

@app.post("/api/execute-flow")
async def execute_flow_endpoint(
    request: Request,
    runner: UnifiedRunner = Depends(get_unified_runner)
):
    """Execute a flow with nodes, edges, and inputs"""
    try:
        data = await request.json()
        nodes = data.get("nodes", [])
        edges = data.get("edges", [])
        inputs = data.get("inputs", {})
        
        # Build the workflow data
        workflow_data = {
            "nodes": nodes,
            "edges": edges,
            "inputs": inputs
        }
        
        logger.info(f"Executing flow with {len(nodes)} nodes via /api/execute-flow endpoint")
        
        # Validate node structure
        for node in nodes:
            if not isinstance(node, dict):
                raise ValueError(f"Invalid node format: {node}")
            if "id" not in node:
                raise ValueError(f"Node missing ID: {node}")
            if "type" not in node:
                raise ValueError(f"Node missing type: {node}")
        
        # Execute the workflow synchronously (not streaming)
        result = {
            "logs": [],
            "node_results": {},
            "state": "completed"
        }
        
        # Create structured logs for flow start
        flow_start_log = {
            "type": "flow_started",
            "message": "Starting flow execution",
            "timestamp": datetime.now().isoformat(),
            "nodeCount": len(nodes),
            "connectionCount": len(edges)
        }
        result["logs"] = [flow_start_log]
        
        # Log each node in the flow
        for node in nodes:
            node_log = {
                "type": "node_found",
                "nodeId": node.get("id"),
                "nodeType": node.get("type"),
                "nodeName": node.get("data", {}).get("label", f"Node {node.get('id')}"),
                "timestamp": datetime.now().isoformat()
            }
            
            # Find connections for this node
            connections = []
            for edge in edges:
                if edge.get("source") == node.get("id"):
                    connections.append({
                        "target": edge.get("target"),
                        "type": "outgoing"
                    })
                elif edge.get("target") == node.get("id"):
                    connections.append({
                        "source": edge.get("source"),
                        "type": "incoming"
                    })
            
            if connections:
                node_log["connections"] = connections
                
            result["logs"].append(node_log)
            
        # Process the workflow
        async for item in runner.execute_workflow(workflow_data):
            # Convert any NodeData objects to dictionaries
            item = convert_nodedata_to_dict(item)
            
            if isinstance(item, dict):
                # Add node result to the results collection
                if "nodeId" in item and item["nodeId"]:
                    result["node_results"][item["nodeId"]] = item
                    
                    # Also add a log entry for this node result
                    log_entry = {
                        "type": "node_result",
                        "nodeId": item["nodeId"],
                        "nodeType": item.get("nodeType", "unknown"),
                        "status": "error" if "error" in item else "completed",
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    # Add error details if present
                    if "error" in item:
                        log_entry["error"] = item["error"]
                    
                    # Add result details if present
                    if "result" in item:
                        log_entry["result"] = item["result"]
                    elif "output" in item:
                        log_entry["output"] = item["output"]
                        
                    result["logs"].append(log_entry)
                
                # Update the overall result
                result.update(item)
            elif isinstance(item, str):
                try:
                    # Try to parse as JSON
                    data = json.loads(item)
                    if isinstance(data, dict):
                        # Similar logic as above for dict items
                        if "nodeId" in data and data["nodeId"]:
                            result["node_results"][data["nodeId"]] = data
                            
                            # Add a log entry
                            result["logs"].append({
                                "type": "node_result",
                                "nodeId": data["nodeId"],
                                "nodeType": data.get("nodeType", "unknown"),
                                "status": "error" if "error" in data else "completed",
                                "timestamp": datetime.now().isoformat(),
                                **({"error": data["error"]} if "error" in data else {}),
                                **({"result": data["result"]} if "result" in data else {}),
                                **({"output": data["output"]} if "output" in data else {})
                            })
                        
                        result.update(data)
                except:
                    # Not JSON, treat as text log
                    text_log = {
                        "type": "log_message",
                        "message": item,
                        "timestamp": datetime.now().isoformat()
                    }
                    result["logs"].append(text_log)
        
        # Add flow completion log
        flow_complete_log = {
            "type": "flow_completed",
            "message": "Flow execution completed",
            "timestamp": datetime.now().isoformat(),
            "success": True
        }
        result["logs"].append(flow_complete_log)
        
        # Convert any NodeData objects in the results to dictionaries
        processed_result = convert_nodedata_to_dict(result)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "node_results": processed_result.get("node_results", {}),
                "logs": processed_result.get("logs", []),
                "timestamp": datetime.now().isoformat()
            }
        )
    except ValidationError as e:
        logger.error(f"Validation error in execute-flow: {str(e)}")
        error_log = {
            "type": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "logs": [error_log],
                "error": {
                    "message": str(e),
                    "type": "validation_error"
                },
                "timestamp": datetime.now().isoformat()
            }
        )
    except Exception as e:
        logger.error(f"Error executing flow: {str(e)}", exc_info=True)
        error_log = {
            "type": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }
        return JSONResponse(
            status_code=200,  # Return 200 but with error content for frontend handling
            content={
                "success": False,
                "logs": [error_log],
                "error": {
                    "message": str(e),
                    "type": "execution_error"
                },
                "timestamp": datetime.now().isoformat()
            }
        )

# Node execution endpoints
@app.post("/execute-node")
async def execute_node(
    request: Request,
    runner: UnifiedRunner = Depends(get_unified_runner)
):
    """Execute a single node"""
    try:
        data = await request.json()
        node_type = data.get("nodeType")
        node_data = data.get("nodeData", {})
        inputs = data.get("inputs", {})
        
        logger.info(f"Executing node of type {node_type}")
        return await runner.execute_node(node_type, node_data, inputs)
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error executing node: {str(e)}")
        raise HTTPException(status_code=500, detail="Node execution failed")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

# Debug endpoint to list all routes
@app.get("/debug/routes")
async def debug_routes():
    """List all registered routes for debugging"""
    routes = []
    for route in app.routes:
        routes.append({
            "path": route.path,
            "name": route.name,
            "methods": list(route.methods) if hasattr(route, "methods") else None
        })
    return {"routes": sorted(routes, key=lambda x: x["path"])}

# Legacy routes for backward compatibility
@app.get("/api/flows")
async def legacy_list_flows(owner_id: Optional[str] = None):
    """Legacy endpoint for listing flows, redirects to workflows endpoint"""
    from backend.services.workflow_service import WorkflowService
    workflow_service = WorkflowService()
    
    try:
        if owner_id:
            workflows = await workflow_service.get_workflows_by_owner(owner_id)
        else:
            workflows = await workflow_service.get_all_workflows()
            
        return {
            "success": True,
            "data": {
                "data": workflows,
                "total_count": len(workflows),
                "owner_id": owner_id
            },
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "version": "1.0.0"
            }
        }
    except Exception as e:
        logger.error(f"Error in legacy flows endpoint: {str(e)}")
        return {
            "success": False,
            "data": [],
            "error": {
                "message": str(e)
            },
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "version": "1.0.0"
            }
        }

@app.get("/api/workflows")
async def direct_list_workflows(owner_id: Optional[str] = None):
    """Direct endpoint for listing workflows"""
    from backend.services.workflow_service import WorkflowService
    workflow_service = WorkflowService()
    
    try:
        if owner_id:
            workflows = await workflow_service.get_workflows_by_owner(owner_id)
        else:
            workflows = await workflow_service.get_all_workflows()
            
        return {
            "success": True,
            "data": {
                "data": workflows,
                "total_count": len(workflows),
                "owner_id": owner_id
            },
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "version": "1.0.0"
            }
        }
    except Exception as e:
        logger.error(f"Error in workflows endpoint: {str(e)}")
        return {
            "success": False,
            "data": [],
            "error": {
                "message": str(e)
            },
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "version": "1.0.0"
            }
        }

# Direct endpoint for output node execution
@app.post("/api/outputs/node")
async def direct_output_node_endpoint(request: Request):
    """Direct endpoint for output node execution"""
    try:
        data = await request.json()
        logger.info(f"Output node direct endpoint invoked: {data}")
        
        # Get node data
        node_data = data.get("node", {})
        node_id = node_data.get("id")
        
        if not node_id:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Missing node ID in request",
                    "timestamp": datetime.now().isoformat()
                }
            )
        
        # Get inputs
        inputs = data.get("inputs", {})
        
        # Process the output node using the OutputNode class
        from backend.nodes.output_node import OutputNode
        from backend.models.data import NodeData
        
        # Convert inputs to NodeData
        node_inputs = {}
        for key, value in inputs.items():
            if isinstance(value, dict) and 'value' in value:
                node_inputs[key] = NodeData(value=value['value'], metadata=value.get('metadata', {}))
            else:
                node_inputs[key] = NodeData(value=value)
                
        # Get the first input value
        first_input = next(iter(node_inputs.values())) if node_inputs else NodeData(value="No input provided")
        
        # Default webhook configuration if none specified
        if 'config' not in node_data:
            node_data['config'] = {
                'url': 'https://webhook.site/a450a8da-cfce-4a72-9567-06c0eba8ce1a'
            }
        
        # Create a minimal node data structure for processing
        output_node_data = {
            'id': node_id,
            'type': 'output',
            'data': {
                'label': 'Output Node',
                'output_type': 'webhook',  # Default to webhook
                'config': node_data.get('config', {}),
                **node_data  # Include any other provided data
            }
        }
        
        logger.info(f"Processing output node with data: {output_node_data}")
        
        # Process the output
        output_node = OutputNode()
        result = await output_node.process(output_node_data, {
            'input': first_input
        }, {'execution_id': 'direct-execution'})
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "value": result.get_value() if not result.is_error() else None,
                "error": result.get_error() if result.is_error() else None,
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error in direct output node endpoint: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )

@app.get("/api/triggers/executed-triggers")
@app.get("/executed-triggers")
@app.get("/api/triggers/executed")
async def legacy_executed_triggers():
    """Legacy endpoint for listing executed triggers"""
    import os
    import json
    
    # Check for triggers directly in the triggers directory first (for backward compatibility)
    triggers_dir = "triggers"
    data_triggers_dir = "data/triggers"
    
    all_triggers = []
    
    # Try to read from legacy triggers directory first
    if os.path.exists(triggers_dir):
        for filename in os.listdir(triggers_dir):
            if filename.endswith(".json"):
                try:
                    with open(os.path.join(triggers_dir, filename), "r") as f:
                        trigger_data = json.load(f)
                        trigger_data["id"] = filename.replace(".json", "")
                        all_triggers.append(trigger_data)
                except Exception as e:
                    logger.error(f"Error reading trigger file {filename}: {str(e)}")
    
    # Then try to read from data/triggers directory
    if os.path.exists(data_triggers_dir):
        for filename in os.listdir(data_triggers_dir):
            if filename.endswith(".json"):
                try:
                    with open(os.path.join(data_triggers_dir, filename), "r") as f:
                        trigger_data = json.load(f)
                        trigger_data["id"] = filename.replace(".json", "")
                        all_triggers.append(trigger_data)
                except Exception as e:
                    logger.error(f"Error reading trigger file {filename}: {str(e)}")
    
    # Filter to only executed triggers
    executed_triggers = [
        trigger for trigger in all_triggers 
        if trigger.get("trigger_count", 0) > 0
    ]
    
    logger.info(f"Found {len(executed_triggers)} executed triggers")
    
    return {
        "success": True,
        "data": {
            "triggers": executed_triggers,
            "total_count": len(executed_triggers)
        },
        "metadata": {
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
