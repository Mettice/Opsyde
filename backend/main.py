# backend/main.py
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from .email_runner import send_email
from .sheets_runner import push_to_sheet
from .discord_runner import post_to_discord
from .crew_runner import run_crew
import json
import logging

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
async def execute_crew(request: Request):
    """Execute a workflow created in the frontend"""
    try:
        body = await request.json()
        logger.info(f"Received workflow execution request with {len(body.get('nodes', []))} nodes")
        return StreamingResponse(run_crew(body), media_type="text/event-stream")
    except Exception as e:
        logger.error(f"Error executing workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to execute workflow: {str(e)}")

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

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
    

