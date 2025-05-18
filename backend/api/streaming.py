# api/streaming.py
from fastapi import Request, Response
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator, Any, Dict, List, Callable, Optional
import json
import asyncio
import logging

logger = logging.getLogger(__name__)

class EnhancedStreamingResponse(StreamingResponse):
    """
    Enhanced streaming response with better error handling and monitoring.
    """
    
    def __init__(
        self,
        content: AsyncGenerator[Any, None],
        transform_fn: Optional[Callable[[Any], str]] = None,
        status_code: int = 200,
        headers: Optional[Dict[str, str]] = None,
        media_type: str = "application/json",
        background: Optional[asyncio.Task] = None
    ):
        self.transform_fn = transform_fn or (lambda x: json.dumps(x) + "\n")
        self.background_task = background
        
        async def transformed_content():
            try:
                async for item in content:
                    yield self.transform_fn(item)
            except Exception as e:
                logger.error(f"Error in streaming response: {str(e)}")
                # Yield error message
                yield self.transform_fn({
                    "type": "error",
                    "error": str(e)
                })
            finally:
                # Cancel background task if exists
                if self.background_task and not self.background_task.done():
                    self.background_task.cancel()
                    
        super().__init__(
            content=transformed_content(),
            status_code=status_code,
            headers=headers,
            media_type=media_type
        )
        
    async def stream_response(self, request: Request) -> Response:
        """Override to add request close detection"""
        response = await super().stream_response(request)
        
        # Add callback for client disconnect
        if request.scope.get("type") == "http":
            request.scope["state"]["on_disconnect"] = self._on_disconnect
            
        return response
        
    async def _on_disconnect(self):
        """Handle client disconnect"""
        logger.info("Client disconnected from streaming response")
        
        # Cancel background task if exists
        if self.background_task and not self.background_task.done():
            logger.info("Cancelling background task due to client disconnect")
            self.background_task.cancel()