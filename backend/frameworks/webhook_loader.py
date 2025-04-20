import os
import logging
from fastapi import Request, HTTPException

logger = logging.getLogger(__name__)

async def handle_webhook_flow(request: Request):
    """
    Handle incoming webhook flow requests
    
    Validates the request, checks authentication if needed,
    and returns the flow data with mode information.
    """
    try:
        body = await request.json()
        logger.info("Received webhook flow payload")

        # Basic validation - check if it has nodes and edges
        if "nodes" not in body or "edges" not in body:
            raise HTTPException(status_code=400, detail="Invalid flow format: missing nodes or edges")
            
        # Optional: Validate secret token if provided
        headers = request.headers
        secret_token = headers.get("x-nodai-secret")
        expected_token = os.environ.get("NODAI_WEBHOOK_SECRET")

        if expected_token and secret_token != expected_token:
            logger.warning("Invalid webhook secret token")
            raise HTTPException(status_code=403, detail="Invalid secret token")

        # Get the mode (replace or merge)
        mode = body.get("mode", "replace")  # default fallback
        
        # Extract metadata including origin information
        metadata = body.get("metadata", {})
        
        # If origin is directly in the body, add it to metadata
        if "origin" in body and "origin" not in metadata:
            metadata["origin"] = body["origin"]
        
        # If source is directly in the body, add it to metadata as origin
        if "source" in body and "origin" not in metadata:
            metadata["origin"] = body["source"]
        
        # Return a simplified response with just nodes and edges
        # Include metadata and mode as properties on the response object
        return {
            "nodes": body["nodes"],
            "edges": body["edges"],
            "metadata": metadata,
            "mode": mode
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading webhook flow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load flow: {str(e)}")