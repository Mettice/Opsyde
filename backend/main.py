# backend/main.py
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from email_runner import send_email
from sheets_runner import push_to_sheet
from discord_runner import post_to_discord
from crew_runner import run_crew
from frameworks.webhook_loader import handle_webhook_flow
from chat_runner import router as chat_router
from frameworks.trigger_storage import register_trigger, get_trigger_flow, list_triggers, delete_trigger
from frameworks.trigger_scheduler import start_scheduler, update_trigger_metadata
import json
import logging
import os
import threading
import time
from datetime import datetime, timedelta

from dotenv import load_dotenv

load_dotenv()  # This loads the .env file into environment variables

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """
    Start background services when the application starts
    """
    logger.info("Starting background services")
    # Start the trigger scheduler in a background thread
    threading.Thread(target=start_scheduler, daemon=True).start()
    logger.info("Background services started")

@app.on_event("shutdown")
async def shutdown_event():
    """
    Clean up resources when the application shuts down
    """
    from frameworks.trigger_scheduler import stop_scheduler
    logger.info("Stopping background services")
    stop_scheduler()
    logger.info("Background services stopped")

@app.post("/run-crew")
async def run_crew_endpoint(data: dict):
    """
    Run a crew workflow
    """
    try:
        # Ensure inputs are properly formatted
        if "inputs" not in data:
            data["inputs"] = {}
        elif isinstance(data["inputs"], str):
            try:
                data["inputs"] = json.loads(data["inputs"])
            except:
                data["inputs"] = {"input": data["inputs"]}
        
        # Log the request
        logger.info(f"Received workflow execution request with {len(data.get('nodes', []))} nodes")
        
        # Run the workflow
        return StreamingResponse(
            run_crew(data),
            media_type="text/plain"
        )
    except Exception as e:
        logger.error(f"Error running crew: {str(e)}")
        return {"error": str(e)}

@app.post("/send-email")
async def email_output(request: Request):
    """Send workflow results via email"""
    try:
        data = await request.json()
        logs = data.get("logs", "")
        email = data.get("to", "default@example.com")
        logger.info(f"Sending email to {email}")
        result = send_email(logs, email)
        return {"status": result}
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@app.post("/export-sheets")
async def sheet_output(request: Request):
    """Export workflow results to Google Sheets"""
    try:
        data = await request.json()
        logs = data.get("logs", "")
        sheet_name = data.get("sheet_name", "Opsyde Logs")
        logger.info(f"Exporting to sheet: {sheet_name}")
        result = push_to_sheet(logs, sheet_name)
        return {"status": result}
    except Exception as e:
        logger.error(f"Error exporting to sheets: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to export to sheets: {str(e)}")

@app.post("/post-discord")
async def discord_output(request: Request):
    """Post workflow results to Discord"""
    try:
        data = await request.json()
        logs = data.get("logs", "")
        webhook_url = data.get("webhook_url", "")
        logger.info("Posting to Discord")
        result = post_to_discord(logs, webhook_url)
        return {"status": result}
    except Exception as e:
        logger.error(f"Error posting to Discord: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to post to Discord: {str(e)}")

@app.post("/load-webhook-flow")
async def load_webhook_flow(request: Request):
    """Receive a flow definition from an external webhook"""
    return await handle_webhook_flow(request)

@app.post("/chat")
async def chat_endpoint(request: Request):
    data = await request.json()
    # Call your chat_runner function directly
    from chat_runner import run_chat_node
    result = run_chat_node(data, {})
    return {"response": result}

@app.post("/trigger/{trigger_id}")
async def handle_trigger(trigger_id: str, request: Request):
    """
    Handle incoming webhook triggers for flows
    """
    try:
        payload = await request.json()
        logger.info(f"Received trigger for ID: {trigger_id}")
        
        # Get the flow associated with this trigger ID
        flow = get_trigger_flow(trigger_id)
        if not flow:
            raise HTTPException(status_code=404, detail="Trigger ID not found")
        
        # Add the payload to the flow context
        flow["trigger_payload"] = payload
        
        # Execute the flow
        logger.info(f"Executing flow for trigger {trigger_id}")
        return StreamingResponse(run_crew(flow), media_type="text/event-stream")
    except Exception as e:
        logger.error(f"Error processing trigger {trigger_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Trigger processing error: {str(e)}")

@app.post("/api/register-trigger")
async def handle_register_trigger(request: Request):
    """
    Register a new trigger with its associated flow
    """
    try:
        data = await request.json()
        trigger_id = data.get("trigger_id")
        flow = data.get("flow")
        owner = data.get("owner", "system")
        
        logger.info(f"Registering trigger: {trigger_id} of type {flow.get('trigger_type')}")
        
        # Log the trigger node data
        trigger_nodes = [n for n in flow.get('nodes', []) if n.get('id') == trigger_id]
        if trigger_nodes:
            trigger_node = trigger_nodes[0]
            trigger_data = trigger_node.get('data', {})
            logger.info(f"Trigger details: type={trigger_data.get('triggerType')}, scheduleType={trigger_data.get('scheduleType')}, runAt={trigger_data.get('runAt')}")
        else:
            logger.warning(f"Could not find trigger node with ID {trigger_id} in the flow data")
        
        if not trigger_id or not flow:
            raise HTTPException(status_code=400, detail="Missing trigger_id or flow data")
        
        # Make sure the flow has the trigger_id set
        flow["trigger_id"] = trigger_id
        
        # Register the trigger
        success = register_trigger(trigger_id, flow, owner)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to register trigger")
        
        # Log the successful registration
        logger.info(f"Successfully registered trigger: {trigger_id}")
        
        return {
            "status": "success",
            "message": "Trigger registered successfully",
            "trigger_id": trigger_id,
            "webhook_url": f"/api/trigger/{trigger_id}" if flow.get("trigger_type") == "webhook" else None
        }
    except Exception as e:
        logger.error(f"Error registering trigger: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")

@app.get("/triggers")
async def handle_list_triggers(owner: str = None):
    """
    List all registered triggers
    """
    triggers = list_triggers(owner)
    return {
        "status": "success",
        "count": len(triggers),
        "triggers": triggers
    }

@app.delete("/trigger/{trigger_id}")
async def handle_delete_trigger(trigger_id: str):
    """
    Delete a registered trigger
    """
    success = delete_trigger(trigger_id)
    if not success:
        raise HTTPException(status_code=404, detail="Trigger not found")
    
    return {
        "status": "success",
        "message": f"Trigger {trigger_id} deleted successfully"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.get("/create-test-trigger")
async def create_test_trigger():
    """
    Create a test trigger for debugging
    """
    try:
        trigger_id = f"test-trigger-{int(time.time())}"
        
        # Create a simple flow
        flow = {
            "trigger_id": trigger_id,
            "trigger_type": "schedule",
            "nodes": [
                {
                    "id": trigger_id,
                    "type": "trigger",
                    "data": {
                        "triggerType": "schedule",
                        "scheduleType": "once",
                        "runAt": (datetime.now() + timedelta(minutes=1)).strftime("%Y-%m-%d %H:%M"),
                        "label": "Test Trigger"
                    }
                }
            ],
            "edges": []
        }
        
        # Register the trigger
        success = register_trigger(trigger_id, flow, "system")
        
        if success:
            logger.info(f"Successfully created test trigger: {trigger_id}")
            return {
                "status": "success",
                "message": "Test trigger created successfully",
                "trigger_id": trigger_id
            }
        else:
            return {
                "status": "error",
                "message": "Failed to create test trigger"
            }
    except Exception as e:
        logger.error(f"Error creating test trigger: {str(e)}")
        return {
            "status": "error",
            "message": f"Error: {str(e)}"
        }

@app.get("/test")
async def test_endpoint():
    """Simple test endpoint"""
    logger.info("Test endpoint called")
    return {"status": "ok", "message": "Backend is working"}

@app.get("/create-flow-trigger")
async def create_flow_trigger():
    """
    Create a test trigger with a real flow
    """
    try:
        trigger_id = f"flow-trigger-{int(time.time())}"
        
        # Create a flow with your actual nodes
        flow = {
            "trigger_id": trigger_id,
            "trigger_type": "schedule",
            "nodes": [
                {
                    "id": trigger_id,
                    "type": "trigger",
                    "data": {
                        "triggerType": "schedule",
                        "scheduleType": "once",
                        "runAt": (datetime.now() + timedelta(minutes=2)).strftime("%Y-%m-%d %H:%M"),
                        "label": "Flow Trigger"
                    }
                },
                # Add your agent node
                {
                    "id": "agent-1",
                    "type": "agent",
                    "data": {
                        "label": "Agent Alpha",
                        "role": "Assistant",
                        "goal": "Help with research"
                    }
                },
                # Add your task node
                {
                    "id": "task-1",
                    "type": "task",
                    "data": {
                        "label": "New Task",
                        "description": "Task description"
                    }
                }
            ],
            "edges": [
                {
                    "source": trigger_id,
                    "target": "agent-1"
                },
                {
                    "source": "agent-1",
                    "target": "task-1"
                }
            ]
        }
        
        # Register the trigger
        success = register_trigger(trigger_id, flow, "system")
        
        if success:
            logger.info(f"Successfully created flow trigger: {trigger_id}")
            return {
                "status": "success",
                "message": "Flow trigger created successfully",
                "trigger_id": trigger_id
            }
        else:
            return {
                "status": "error",
                "message": "Failed to create flow trigger"
            }
    except Exception as e:
        logger.error(f"Error creating flow trigger: {str(e)}")
        return {
            "status": "error",
            "message": f"Error: {str(e)}"
        }

@app.get("/cleanup-test-triggers")
async def cleanup_test_triggers():
    """
    Remove all test triggers from the system
    """
    try:
        triggers = list_triggers()
        count = 0
        
        for trigger in triggers:
            trigger_id = trigger.get("id")
            # Check if it's a test trigger
            if trigger_id.startswith("test-trigger-") or trigger_id.startswith("flow-trigger-"):
                success = delete_trigger(trigger_id)
                if success:
                    count += 1
                    logger.info(f"Deleted test trigger: {trigger_id}")
        
        return {
            "status": "success",
            "message": f"Deleted {count} test triggers"
        }
    except Exception as e:
        logger.error(f"Error cleaning up test triggers: {str(e)}")
        return {
            "status": "error",
            "message": f"Error: {str(e)}"
        }

@app.get("/create-future-trigger")
async def create_future_trigger():
    """
    Create a test trigger scheduled for 2 minutes in the future
    """
    try:
        trigger_id = f"future-trigger-{int(time.time())}"
        future_time = (datetime.now() + timedelta(minutes=2)).strftime("%Y-%m-%d %H:%M")
        
        # Create a simple flow
        flow = {
            "trigger_id": trigger_id,
            "trigger_type": "schedule",
            "nodes": [
                {
                    "id": trigger_id,
                    "type": "trigger",
                    "data": {
                        "triggerType": "schedule",
                        "scheduleType": "once",
                        "runAt": future_time,
                        "label": "Future Test Trigger"
                    }
                }
            ],
            "edges": []
        }
        
        # Register the trigger
        success = register_trigger(trigger_id, flow, "system")
        
        if success:
            logger.info(f"Successfully created future trigger: {trigger_id} for {future_time}")
            return {
                "status": "success",
                "message": f"Future trigger created successfully for {future_time}",
                "trigger_id": trigger_id,
                "scheduled_time": future_time
            }
        else:
            return {
                "status": "error",
                "message": "Failed to create future trigger"
            }
    except Exception as e:
        logger.error(f"Error creating future trigger: {str(e)}")
        return {
            "status": "error",
            "message": f"Error: {str(e)}"
        }

@app.get("/debug-triggers")
async def debug_triggers():
    """
    Show detailed information about all triggers
    """
    try:
        triggers = list_triggers()
        detailed_triggers = []
        
        for trigger in triggers:
            trigger_id = trigger.get("id")
            flow = get_trigger_flow(trigger_id)
            
            trigger_info = {
                "id": trigger_id,
                "type": trigger.get("trigger_type"),
                "created_at": trigger.get("created_at"),
                "last_triggered": trigger.get("last_triggered"),
                "trigger_count": trigger.get("trigger_count"),
                "completed": trigger.get("completed", False),
                "completed_at": trigger.get("completed_at"),
                "nodes_count": len(flow.get("nodes", [])) if flow else 0,
                "edges_count": len(flow.get("edges", [])) if flow else 0
            }
            
            # Get trigger node details
            if flow:
                trigger_nodes = [n for n in flow.get("nodes", []) if n.get("id") == trigger_id]
                if trigger_nodes:
                    trigger_node = trigger_nodes[0]
                    trigger_data = trigger_node.get("data", {})
                    trigger_info["details"] = {
                        "label": trigger_data.get("label"),
                        "triggerType": trigger_data.get("triggerType"),
                        "scheduleType": trigger_data.get("scheduleType"),
                        "runAt": trigger_data.get("runAt")
                    }
            
            detailed_triggers.append(trigger_info)
        
        return {
            "status": "success",
            "count": len(detailed_triggers),
            "triggers": detailed_triggers
        }
    except Exception as e:
        logger.error(f"Error debugging triggers: {str(e)}")
        return {
            "status": "error",
            "message": f"Error: {str(e)}"
        }

@app.get("/executed-triggers")
async def get_executed_triggers():
    """
    Get a list of recently executed triggers
    """
    try:
        # Get all triggers
        all_triggers = list_triggers()
        
        # Filter to only include triggers that have been executed
        executed_triggers = []
        
        # Current time
        now = datetime.now()
        
        # Only include triggers executed in the last 30 minutes
        time_threshold = now - timedelta(minutes=30)
        
        for trigger in all_triggers:
            trigger_id = trigger.get("id")
            last_triggered = trigger.get("last_triggered")
            
            # Skip triggers that haven't been triggered or were triggered too long ago
            if not last_triggered:
                continue
                
            try:
                last_triggered_time = datetime.fromisoformat(last_triggered)
                if last_triggered_time < time_threshold:
                    continue
            except:
                # If we can't parse the time, include it anyway
                pass
            
            trigger_data = get_trigger_flow(trigger_id)
            
            # Get the trigger node data
            trigger_node = None
            for node in trigger_data.get("nodes", []):
                if node.get("id") == trigger_id:
                    trigger_node = node
                    break
            
            executed_triggers.append({
                "id": trigger_id,
                "label": trigger_node.get("data", {}).get("label", "Unnamed Trigger") if trigger_node else "Unnamed Trigger",
                "type": trigger.get("trigger_type"),
                "last_executed": trigger.get("last_triggered"),
                "execution_count": trigger.get("trigger_count", 0),
                "completed": trigger.get("completed", False),
                "completed_at": trigger.get("completed_at")
            })
        
        # Sort by last execution time, most recent first
        executed_triggers.sort(key=lambda t: t.get("last_executed", ""), reverse=True)
        
        # Return only the 10 most recent executions
        return {
            "status": "success",
            "count": len(executed_triggers),
            "triggers": executed_triggers[:10]
        }
    except Exception as e:
        logger.error(f"Error getting executed triggers: {str(e)}")
        return {
            "status": "error",
            "message": f"Error: {str(e)}"
        }

@app.post("/api/cleanup-triggers")
async def cleanup_triggers():
    """
    Clean up all triggers that are in the past
    """
    try:
        # Get all triggers
        all_triggers = list_triggers()
        
        # Count of cleaned up triggers
        cleaned_up = 0
        
        # Current time
        now = datetime.now()
        
        for trigger in all_triggers:
            trigger_id = trigger.get("id")
            trigger_data = get_trigger_flow(trigger_id)
            
            # Find the trigger node
            trigger_node = None
            for node in trigger_data.get("nodes", []):
                if node.get("id") == trigger_id:
                    trigger_node = node
                    break
            
            if not trigger_node:
                continue
                
            # Get the trigger data
            node_data = trigger_node.get("data", {})
            
            # Check if this is a one-time schedule trigger
            if node_data.get("triggerType") == "schedule" and node_data.get("scheduleType") == "once":
                # Get the run time
                run_at = node_data.get("runAt")
                
                if run_at:
                    try:
                        # Parse the time
                        target_time = datetime.strptime(run_at, "%Y-%m-%d %H:%M")
                        
                        # If the time is in the past, mark it as completed
                        if target_time < now:
                            update_trigger_metadata(trigger_id, {
                                "completed": True,
                                "completed_at": datetime.now().isoformat()
                            })
                            cleaned_up += 1
                    except Exception as e:
                        logger.error(f"Error parsing time for trigger {trigger_id}: {str(e)}")
        
        return {
            "status": "success",
            "message": f"Cleaned up {cleaned_up} triggers",
            "cleaned_up": cleaned_up
        }
    except Exception as e:
        logger.error(f"Error cleaning up triggers: {str(e)}")
        return {
            "status": "error",
            "message": f"Error: {str(e)}"
        }

@app.post("/api/force-cleanup-all-triggers")
async def force_cleanup_all_triggers():
    """
    Force cleanup of all triggers by marking them as completed
    """
    try:
        # Get all triggers
        all_triggers = list_triggers()
        
        # Count of cleaned up triggers
        cleaned_up = 0
        
        for trigger in all_triggers:
            trigger_id = trigger.get("id")
            
            # Mark as completed if not already
            if not trigger.get("completed", False):
                update_trigger_metadata(trigger_id, {
                    "completed": True,
                    "completed_at": datetime.now().isoformat()
                })
                cleaned_up += 1
        
        return {
            "status": "success",
            "message": f"Force-completed {cleaned_up} triggers",
            "cleaned_up": cleaned_up
        }
    except Exception as e:
        logger.error(f"Error force-cleaning triggers: {str(e)}")
        return {
            "status": "error",
            "message": f"Error: {str(e)}"
        }

@app.post("/execute-node")
async def execute_node(request: Request):
    """
    Execute a single node
    """
    try:
        data = await request.json()
        node_type = data.get("nodeType")
        node_data = data.get("nodeData", {})
        inputs = data.get("inputs", {})
        
        logger.info(f"Executing node of type {node_type}")
        
        # Call the appropriate function based on node type
        if node_type == "agent":
            from crew_runner import run_agent_node
            result = await run_agent_node(node_data, inputs)
        elif node_type == "task":
            from crew_runner import run_task_node
            result = await run_task_node(node_data, inputs)
        elif node_type == "tool":
            from crew_runner import run_tool_node
            result = await run_tool_node(node_data, inputs)
        else:
            return {"error": f"Unknown node type: {node_type}"}
        
        return result
    except Exception as e:
        logger.error(f"Error executing node: {str(e)}")
        return {"error": str(e)}
    