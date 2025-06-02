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
from api.routers.user_settings import router as user_settings_router

# Models
from backend.models.data import NodeData

import json
import logging
import os
from datetime import datetime, timedelta
import asyncio
import base64
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv(dotenv_path='.env')  # Load from current directory when running from backend

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
    logger.info("🚀 Starting CrewBuilder backend...")
    
    # Initialize database
    try:
        from backend.database import init_db
        await init_db()
        logger.info("✅ Database initialized")
    except Exception as e:
        logger.warning(f"⚠️ Database initialization failed (continuing without database): {str(e)}")
        # Continue without database for development
    
    # Initialize scheduler PROPERLY in async context
    try:
        from backend.frameworks.apscheduler_manager import scheduler_manager
        logger.info("🔧 Initializing scheduler in async context...")
        
        # Start scheduler in the current event loop
        scheduler_started = scheduler_manager.start()
        
        if scheduler_started:
            logger.info("✅ Scheduler started successfully")
            
            # Verify scheduler is actually running
            if scheduler_manager.scheduler and scheduler_manager.scheduler.running:
                logger.info(f"✅ Scheduler confirmed running - State: {scheduler_manager.scheduler.state}")
                
                # Wait a moment for scheduler to fully initialize
                await asyncio.sleep(0.5)
                
                # Re-register all existing scheduled triggers
                try:
                    from backend.services.trigger_service import TriggerService
                    
                    # Get the trigger service instance
                    trigger_service = TriggerService()
                    
                    # Get all existing triggers
                    triggers = await trigger_service.list_triggers()
                    logger.info(f"Found {len(triggers)} existing triggers to re-register")
                    
                    # Re-register each trigger that needs scheduling
                    re_registered = 0
                    for trigger in triggers:
                        try:
                            trigger_id = trigger.get("trigger_id") or trigger.get("id")  # Try both field names
                            if trigger_id:
                                # Get the full trigger flow
                                flow = await trigger_service.get_trigger_flow(trigger_id)
                                if flow:
                                    # Find trigger nodes that need scheduling
                                    trigger_nodes = [n for n in flow.get('nodes', []) if n.get('id') == trigger_id]
                                    if trigger_nodes:
                                        trigger_data = trigger_nodes[0].get('data', {})
                                        trigger_type = trigger_data.get('triggerType')
                                        
                                        logger.info(f"🔧 DEBUG: Found trigger {trigger_id} with type {trigger_type}")
                                        
                                        # Only re-register triggers that need scheduling
                                        if trigger_type in ['schedule', 'universal_polling', 'api_polling', 'data_change', 'file_monitor', 'email_polling']:
                                            logger.info(f"🔧 DEBUG: Re-registering {trigger_id} ({trigger_type})")
                                            await trigger_service._setup_schedule(trigger_id, trigger_data)
                                            re_registered += 1
                                            logger.info(f"✅ Re-registered trigger: {trigger_id} ({trigger_type})")
                                        else:
                                            logger.info(f"🔧 DEBUG: Skipping {trigger_id} - type {trigger_type} doesn't need scheduling")
                                    else:
                                        logger.warning(f"🔧 DEBUG: No trigger node found for {trigger_id}")
                                else:
                                    logger.warning(f"🔧 DEBUG: No flow found for trigger {trigger_id}")
                        except Exception as trigger_error:
                            logger.error(f"❌ Failed to re-register trigger {trigger.get('id', 'unknown')}: {str(trigger_error)}")
                            import traceback
                            logger.error(f"Full traceback: {traceback.format_exc()}")
                    
                    logger.info(f"✅ Re-registered {re_registered} scheduled triggers")
                    
                except Exception as trigger_error:
                    logger.error(f"❌ Error re-registering triggers: {str(trigger_error)}")
            else:
                logger.error("❌ Scheduler claims to be started but isn't running")
        else:
            logger.error("❌ Failed to start scheduler - scheduled triggers will not work")
            
    except Exception as e:
        logger.error(f"❌ Scheduler initialization failed: {str(e)}")
    
    logger.info("🎉 CrewBuilder backend startup complete!")

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
app.include_router(user_settings_router, prefix="/api/user-settings")

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
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                "Access-Control-Allow-Headers": "*"
            }
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ExecutionError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Error executing workflow: {str(e)}")
        raise HTTPException(status_code=500, detail="Workflow execution failed")

@app.post("/run-crew-sync")
async def run_crew_sync_endpoint(
    data: dict,
    runner: UnifiedRunner = Depends(get_unified_runner)
):
    """Execute a crew workflow synchronously (non-streaming) for debugging"""
    try:
        # Format inputs
        if "inputs" not in data:
            data["inputs"] = {}
        elif isinstance(data["inputs"], str):
            try:
                data["inputs"] = json.loads(data["inputs"])
            except:
                data["inputs"] = {"input": data["inputs"]}
        
        # Add user_id to the data for API key loading
        # For now, use 'anonymous' as the default user - this will load user API keys
        if "user_id" not in data:
            data["user_id"] = "anonymous"
        
        logger.info(f"Executing workflow synchronously with {len(data.get('nodes', []))} nodes")
        
        # Collect all results
        results = []
        node_results = {}
        
        async for item in runner.execute_workflow(data, user_id=data.get("user_id")):
            # Convert any NodeData objects to dictionaries
            item = convert_nodedata_to_dict(item)
            results.append(item)
            
            # Extract node results
            if isinstance(item, dict) and "node_id" in item:
                node_results[item["node_id"]] = item
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "logs": results,
                "node_results": node_results,
                "timestamp": datetime.now().isoformat()
            }
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ExecutionError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Error executing workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")

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
    """Debug endpoint to list all available routes"""
    routes = []
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            routes.append({
                "path": route.path,
                "methods": list(route.methods),
                "name": getattr(route, 'name', 'unnamed')
            })
    return {"routes": routes}

@app.get("/debug/scheduler")
async def debug_scheduler():
    """Debug endpoint to check scheduler status and jobs"""
    try:
        from backend.frameworks.apscheduler_manager import scheduler_manager
        
        if not scheduler_manager:
            return {"error": "Scheduler manager not available"}
        
        if not scheduler_manager.scheduler:
            return {"error": "Scheduler not available"}
        
        jobs = scheduler_manager.get_all_jobs()
        job_info = []
        
        for job in jobs:
            try:
                job_data = {
                    "id": job.id,
                    "name": job.name,
                    "func": str(job.func),
                    "args": job.args,
                    "kwargs": job.kwargs
                }
                
                # Handle next_run_time safely for APScheduler 3.x
                if hasattr(job, 'next_run_time'):
                    job_data["next_run_time"] = str(job.next_run_time) if job.next_run_time else None
                else:
                    # For APScheduler 3.x, get next run time from trigger
                    try:
                        next_run = job.trigger.get_next_fire_time(None, None)
                        job_data["next_run_time"] = str(next_run) if next_run else None
                    except:
                        job_data["next_run_time"] = "Unable to determine"
                
                # Handle trigger safely
                if hasattr(job, 'trigger'):
                    job_data["trigger"] = str(job.trigger)
                else:
                    job_data["trigger"] = "No trigger info"
                    
                job_info.append(job_data)
            except Exception as e:
                job_info.append({
                    "id": getattr(job, 'id', 'unknown'),
                    "error": f"Error reading job: {str(e)}"
                })
        
        return {
            "scheduler_running": scheduler_manager._initialized and scheduler_manager.scheduler.running,
            "scheduler_state": "running" if (scheduler_manager.scheduler and scheduler_manager.scheduler.running) else "stopped",
            "total_jobs": len(jobs),
            "jobs": job_info,
            "scheduler_available": True
        }
    except Exception as e:
        logger.error(f"Error in debug scheduler endpoint: {str(e)}", exc_info=True)
        return {
            "error": f"Debug endpoint error: {str(e)}",
            "scheduler_available": False
        }

@app.post("/debug/scheduler/restart")
async def restart_scheduler():
    """Debug endpoint to manually restart the scheduler"""
    try:
        from backend.frameworks.apscheduler_manager import scheduler_manager
        
        logger.info("Manual scheduler restart requested")
        
        # Shutdown existing scheduler
        try:
            scheduler_manager.shutdown()
            logger.info("Scheduler shutdown completed")
        except Exception as e:
            logger.warning(f"Error during shutdown: {str(e)}")
        
        # Wait a moment
        await asyncio.sleep(1)
        
        # Reset initialization flag
        scheduler_manager._initialized = False
        
        # Start fresh
        started = scheduler_manager.start()
        
        if started and scheduler_manager.scheduler and scheduler_manager.scheduler.running:
            logger.info("Scheduler successfully restarted")
            
            # Re-register all scheduled triggers
            try:
                from backend.services.trigger_service import TriggerService
                trigger_service = TriggerService()
                
                triggers = await trigger_service.list_triggers()
                registered_count = 0
                
                for trigger in triggers:
                    trigger_id = trigger.get("trigger_id") or trigger.get("id")
                    if not trigger_id:
                        continue
                        
                    flow = await trigger_service.get_trigger_flow(trigger_id)
                    if not flow or flow.get("trigger_type") != "schedule":
                        continue
                        
                    trigger_nodes = [n for n in flow.get('nodes', []) if n.get('id') == trigger_id]
                    if trigger_nodes:
                        trigger_data = trigger_nodes[0].get('data', {})
                        run_at = trigger_data.get('runAt')
                        
                        if run_at:
                            from datetime import datetime
                            try:
                                target_time = datetime.strptime(run_at, "%Y-%m-%d %H:%M")
                                if target_time > datetime.now():
                                    await trigger_service._setup_schedule(trigger_id, trigger_data)
                                    registered_count += 1
                                    logger.info(f"Re-registered trigger: {trigger_id}")
                            except Exception as e:
                                logger.error(f"Error re-registering trigger {trigger_id}: {str(e)}")
                
                return {
                    "success": True,
                    "message": "Scheduler restarted successfully",
                    "scheduler_running": True,
                    "triggers_registered": registered_count
                }
                
            except Exception as e:
                logger.error(f"Error re-registering triggers: {str(e)}")
                return {
                    "success": True,
                    "message": "Scheduler restarted but trigger re-registration failed",
                    "scheduler_running": True,
                    "error": str(e)
                }
        else:
            return {
                "success": False,
                "message": "Failed to restart scheduler",
                "scheduler_running": False
            }
            
    except Exception as e:
        logger.error(f"Error restarting scheduler: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "scheduler_running": False
        }

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
    """Legacy endpoint for executed triggers with proper error handling"""
    try:
        from backend.services.trigger_service import TriggerService
        from backend.core.di import get_trigger_service
        
        # Get trigger service instance
        trigger_service = get_trigger_service()
        
        # Get all triggers
        triggers = await trigger_service.list_triggers()
        
        # Filter to only executed triggers (those with trigger_count > 0)
        executed_triggers = [
            trigger for trigger in triggers 
            if trigger.get("trigger_count", 0) > 0 or trigger.get("execution_count", 0) > 0
        ]
        
        # Format response to match expected structure
        response_data = {
            "triggers": executed_triggers,
            "total_count": len(executed_triggers)
        }
        
        return {
            "success": True,
            "data": response_data,
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "version": "1.0"
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching executed triggers: {str(e)}")
        return {
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": f"Failed to fetch executed triggers: {str(e)}"
            },
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "version": "1.0"
            }
        }

@app.post("/api/post-to-platform")
async def post_to_platform(request: Request):
    """Post content to various social media and communication platforms"""
    try:
        data = await request.json()
        platform = data.get('platform', '').lower()
        content = data.get('content', '')
        metadata = data.get('metadata', {})
        
        # Get user credentials (you'll need to implement user auth and credential storage)
        # user_credentials = get_user_credentials(platform)
        
        result = {"success": False, "message": ""}
        
        if platform == 'linkedin':
            # LinkedIn API integration
            result = await post_to_linkedin(content, metadata)
        elif platform == 'twitter':
            # Twitter API integration
            result = await post_to_twitter(content, metadata)
        elif platform == 'email':
            # Email sending
            result = await send_email(content, metadata)
        elif platform == 'notion':
            # Notion API integration
            result = await post_to_notion(content, metadata)
        elif platform == 'slack':
            # Slack webhook integration
            result = await post_to_slack(content, metadata)
        else:
            result = {"success": False, "message": f"Platform {platform} not supported"}
        
        return result
        
    except Exception as e:
        logger.error(f"Error posting to platform: {str(e)}")
        return {"success": False, "message": str(e)}

@app.post("/api/generate-insights")
async def generate_insights(request: Request):
    """Generate AI insights from data"""
    try:
        data = await request.json()
        content = data.get('content', '')
        content_type = data.get('contentType', 'text')
        analysis_type = data.get('analysisType', 'basic')
        
        # Use AI to analyze the content and generate insights
        insights = await analyze_content_with_ai(content, content_type, analysis_type)
        
        return {
            "success": True,
            "insights": insights
        }
        
    except Exception as e:
        logger.error(f"Error generating insights: {str(e)}")
        return {"success": False, "message": str(e)}

# Platform-specific posting functions
async def post_to_linkedin(content, metadata):
    """Post content to LinkedIn"""
    try:
        # Mock implementation - replace with actual LinkedIn API
        await asyncio.sleep(1)  # Simulate API call
        return {
            "success": True,
            "message": "Posted to LinkedIn successfully",
            "post_id": f"linkedin_post_{int(time.time())}"
        }
    except Exception as e:
        return {"success": False, "message": str(e)}

async def post_to_twitter(content, metadata):
    """Post content to Twitter"""
    try:
        # Mock implementation - replace with actual Twitter API
        await asyncio.sleep(1)  # Simulate API call
        return {
            "success": True,
            "message": "Posted to Twitter successfully",
            "post_id": f"twitter_post_{int(time.time())}"
        }
    except Exception as e:
        return {"success": False, "message": str(e)}

async def send_email(content, metadata):
    """Send content via email"""
    try:
        # Mock implementation - replace with actual email sending
        await asyncio.sleep(1)  # Simulate email sending
        return {
            "success": True,
            "message": "Email sent successfully",
            "email_id": f"email_{int(time.time())}"
        }
    except Exception as e:
        return {"success": False, "message": str(e)}

async def post_to_notion(content, metadata):
    """Post content to Notion"""
    try:
        # Mock implementation - replace with actual Notion API
        await asyncio.sleep(1)  # Simulate API call
        return {
            "success": True,
            "message": "Posted to Notion successfully",
            "page_id": f"notion_page_{int(time.time())}"
        }
    except Exception as e:
        return {"success": False, "message": str(e)}

async def post_to_slack(content, metadata):
    """Post content to Slack"""
    try:
        # Mock implementation - replace with actual Slack webhook
        await asyncio.sleep(1)  # Simulate API call
        return {
            "success": True,
            "message": "Posted to Slack successfully",
            "message_id": f"slack_msg_{int(time.time())}"
        }
    except Exception as e:
        return {"success": False, "message": str(e)}

async def analyze_content_with_ai(content, content_type, analysis_type):
    """Analyze content and generate insights using AI"""
    try:
        # Mock implementation - replace with actual AI analysis
        await asyncio.sleep(2)  # Simulate AI processing
        
        insights = {
            "summary": {
                "title": "AI-Generated Insights",
                "points": [
                    "📈 Performance metrics show positive trends",
                    "🎯 Key opportunities identified in data patterns",
                    "⚡ Automation efficiency can be improved by 25%"
                ]
            },
            "trends": [
                {"metric": "Efficiency", "change": "+18%", "direction": "up"},
                {"metric": "Cost Savings", "change": "+12%", "direction": "up"},
                {"metric": "Error Rate", "change": "-8%", "direction": "down"}
            ],
            "chartData": {
                "type": "bar",
                "title": "Performance Analysis",
                "data": {
                    "labels": ["Efficiency", "Quality", "Speed", "Cost"],
                    "datasets": [{
                        "label": "Performance Score",
                        "data": [85, 92, 78, 88],
                        "backgroundColor": [
                            "rgba(59, 130, 246, 0.8)",
                            "rgba(16, 185, 129, 0.8)",
                            "rgba(245, 158, 11, 0.8)",
                            "rgba(239, 68, 68, 0.8)"
                        ]
                    }]
                }
            },
            "recommendations": [
                "Consider implementing automated quality checks",
                "Optimize workflow for better speed performance",
                "Monitor cost metrics more frequently"
            ]
        }
        
        return insights
        
    except Exception as e:
        logger.error(f"Error in AI analysis: {str(e)}")
        raise e

@app.post("/test-email")
async def test_email(request: Request):
    """Test email functionality"""
    try:
        from backend.frameworks.email_notifier import send_email
        
        data = await request.json()
        recipient = data.get('recipient', 'test@example.com')
        subject = data.get('subject', 'CrewFlow Email Test')
        body = data.get('body', 'This is a test email from CrewFlow to verify email functionality is working.')
        
        result = await send_email(recipient, subject, body)
        
        return {
            "success": True,
            "message": "Email test completed",
            "result": result
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
