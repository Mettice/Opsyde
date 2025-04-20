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
import json
import logging
import os
 
from dotenv import load_dotenv

load_dotenv()  # This loads the .env file into environment variables

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.post("/register-trigger")
async def handle_register_trigger(request: Request):
    """
    Register a new trigger with its associated flow
    """
    try:
        data = await request.json()
        trigger_id = data.get("trigger_id")
        flow = data.get("flow")
        owner = data.get("owner", "system")
        
        if not trigger_id or not flow:
            raise HTTPException(status_code=400, detail="Missing trigger_id or flow data")
        
        success = register_trigger(trigger_id, flow, owner)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to register trigger")
        
        return {
            "status": "success",
            "message": "Trigger registered successfully",
            "trigger_id": trigger_id,
            "webhook_url": f"/trigger/{trigger_id}"
        }
    except Exception as e:
        logger.error(f"Error registering trigger: {str(e)}")
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
    