from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Dict, Any
import logging

from backend.services.output_service import OutputService
from backend.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/outputs", tags=["outputs"])

@router.post("/email")
async def send_email(
    request: Request,
    output_service: OutputService = Depends()
) -> Dict[str, Any]:
    """Send workflow results via email"""
    try:
        data = await request.json()
        to_email = data.get("to")
        subject = data.get("subject", "Workflow Result")
        body = data.get("body", "")

        if not to_email:
            raise HTTPException(status_code=400, detail="Missing recipient email address")

        logger.info(f"Sending email to {to_email}")
        return await output_service.send_email(to_email, subject, body)
        
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sheets")
async def export_to_sheets(
    request: Request,
    output_service: OutputService = Depends()
) -> Dict[str, Any]:
    """Export workflow results to Google Sheets"""
    try:
        data = await request.json()
        sheet_data = data.get("data", {})
        sheet_name = data.get("sheet_name", "Workflow Results")

        if not sheet_data:
            raise HTTPException(status_code=400, detail="Missing data to export")

        logger.info(f"Exporting to sheet: {sheet_name}")
        return await output_service.export_to_sheets(sheet_data, sheet_name)
        
    except Exception as e:
        logger.error(f"Error exporting to sheets: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/discord")
async def post_to_discord(
    request: Request,
    output_service: OutputService = Depends()
) -> Dict[str, Any]:
    """Post workflow results to Discord"""
    try:
        data = await request.json()
        content = data.get("content", "")
        webhook_url = data.get("webhook_url")

        if not webhook_url:
            raise HTTPException(status_code=400, detail="Missing Discord webhook URL")

        logger.info("Posting to Discord")
        return await output_service.post_to_discord(content, webhook_url)
        
    except Exception as e:
        logger.error(f"Error posting to Discord: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/node")
async def process_output_node(
    request: Request,
    output_service: OutputService = Depends()
) -> Dict[str, Any]:
    """Process an output node"""
    try:
        data = await request.json()
        node_data = data.get("node")
        inputs = data.get("inputs", {})

        if not node_data:
            raise HTTPException(status_code=400, detail="Missing node data")

        logger.info(f"Processing output node: {node_data.get('id')}")
        return await output_service.process_output_node(node_data, inputs)
        
    except Exception as e:
        logger.error(f"Error processing output node: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 