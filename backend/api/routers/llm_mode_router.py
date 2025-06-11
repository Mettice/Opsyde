"""
LLM Mode API Router
Controls LLM-centric processing mode and provides status information
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import logging
from datetime import datetime

from core.node_processor import node_processor
from core.llm_runner import llm_runner

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/llm-mode", tags=["llm-mode"])

class LLMModeToggleRequest(BaseModel):
    enabled: bool
    smart_mapping_enabled: Optional[bool] = None

class LLMModeStatusResponse(BaseModel):
    llm_mode_enabled: bool
    smart_mapping_enabled: bool
    available_providers: list
    current_status: str
    statistics: Dict[str, Any]
    timestamp: str

@router.post("/toggle")
async def toggle_llm_mode(request: LLMModeToggleRequest):
    """Toggle LLM-centric processing mode"""
    try:
        # Toggle LLM mode
        node_processor.enable_llm_mode(request.enabled)
        
        # Optionally toggle smart mapping
        if request.smart_mapping_enabled is not None:
            node_processor.enable_smart_mapping(request.smart_mapping_enabled)
        
        logger.info(f"🤖 LLM mode {'enabled' if request.enabled else 'disabled'} via API")
        
        return {
            "success": True,
            "llm_mode_enabled": request.enabled,
            "smart_mapping_enabled": node_processor.smart_mapping_enabled,
            "message": f"LLM mode {'enabled' if request.enabled else 'disabled'}",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to toggle LLM mode: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to toggle LLM mode: {str(e)}")

@router.get("/status", response_model=LLMModeStatusResponse)
async def get_llm_mode_status():
    """Get current LLM mode status and statistics"""
    try:
        # Get available providers (mock data for now)
        available_providers = ["openai", "anthropic", "openrouter"]
        
        # Determine current status
        if node_processor.llm_mode_enabled:
            status = "LLM-Centric Mode Active"
        elif node_processor.smart_mapping_enabled:
            status = "Traditional Mode with Smart Mapping"
        else:
            status = "Traditional Mode"
        
        # Mock statistics (in real implementation, these would come from actual usage)
        statistics = {
            "total_nodes_processed": 0,
            "llm_mode_usage": 0,
            "traditional_mode_usage": 0,
            "average_execution_time": 0.0,
            "success_rate": 100.0,
            "token_usage": {
                "total_tokens": 0,
                "prompt_tokens": 0,
                "completion_tokens": 0
            }
        }
        
        return LLMModeStatusResponse(
            llm_mode_enabled=node_processor.llm_mode_enabled,
            smart_mapping_enabled=node_processor.smart_mapping_enabled,
            available_providers=available_providers,
            current_status=status,
            statistics=statistics,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Failed to get LLM mode status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")

@router.get("/capabilities")
async def get_llm_capabilities():
    """Get LLM capabilities and supported features"""
    return {
        "supported_task_types": [
            "input_processing",
            "agent_reasoning", 
            "task_execution",
            "tool_routing",
            "output_formatting"
        ],
        "supported_node_types": [
            "input", "agent", "task", "tool", "output", 
            "chat", "trigger", "logic", "delay"
        ],
        "features": {
            "smart_input_mapping": True,
            "intelligent_routing": True,
            "multimodal_support": True,
            "context_awareness": True,
            "fallback_to_traditional": True,
            "streaming_support": False  # TODO: Implement
        },
        "llm_providers": {
            "openai": {
                "models": ["gpt-4", "gpt-3.5-turbo"],
                "supported": True
            },
            "anthropic": {
                "models": ["claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
                "supported": True
            },
            "openrouter": {
                "models": ["openai/gpt-4", "anthropic/claude-3-sonnet"],
                "supported": True
            }
        },
        "version": "1.0.0",
        "last_updated": datetime.now().isoformat()
    }

@router.post("/test")
async def test_llm_mode():
    """Test LLM mode with a simple example"""
    try:
        # Create a test node
        test_node = {
            "id": "test-node",
            "type": "input",
            "data": {
                "label": "Test Input Node"
            }
        }
        
        test_inputs = {
            "input": "Hello, this is a test message for LLM processing"
        }
        
        test_context = {
            "variables": {},
            "user_id": "test-user"
        }
        
        # Test LLM processing
        if node_processor.llm_mode_enabled:
            result = await node_processor._process_with_llm(test_node, test_inputs, test_context)
        else:
            result = await node_processor._process_with_traditional_handler(test_node, test_inputs, test_context)
        
        return {
            "success": True,
            "test_result": result.get_value() if not result.is_error() else None,
            "error": result.get_error() if result.is_error() else None,
            "processing_mode": "llm" if node_processor.llm_mode_enabled else "traditional",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"LLM mode test failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        } 