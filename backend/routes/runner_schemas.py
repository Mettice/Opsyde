from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import logging
from models.runner_schemas import (
    BaseRunnerConfig,
    CrewAIRunnerConfig,
    LangChainRunnerConfig,
    HuggingFaceRunnerConfig,
    AutoGenRunnerConfig,
    LlamaIndexRunnerConfig,
    LLMConfig,
    ToolConfig
)

logger = logging.getLogger(__name__)
router = APIRouter()

def handle_exception(e: Exception) -> Dict[str, Any]:
    """Handle exceptions and return standardized error response"""
    error_msg = f"Error processing request: {str(e)}"
    logger.error(error_msg)
    return {
        "success": False,
        "error": error_msg,
        "data": None
    }

@router.get("/runners/base")
async def get_base_runner_schema():
    """Get base runner schema"""
    try:
        schema = BaseRunnerConfig.model_json_schema()
        return {
            "success": True,
            "data": schema,
            "error": None
        }
    except Exception as e:
        return handle_exception(e)

@router.get("/runners/crewai")
async def get_crewai_runner_schema():
    """Get CrewAI runner schema"""
    try:
        schema = CrewAIRunnerConfig.model_json_schema()
        return {
            "success": True,
            "data": schema,
            "error": None
        }
    except Exception as e:
        return handle_exception(e)

@router.get("/runners/langchain")
async def get_langchain_runner_schema():
    """Get LangChain runner schema"""
    try:
        schema = LangChainRunnerConfig.model_json_schema()
        return {
            "success": True,
            "data": schema,
            "error": None
        }
    except Exception as e:
        return handle_exception(e)

@router.get("/runners/huggingface")
async def get_huggingface_runner_schema():
    """Get HuggingFace runner schema"""
    try:
        schema = HuggingFaceRunnerConfig.model_json_schema()
        return {
            "success": True,
            "data": schema,
            "error": None
        }
    except Exception as e:
        return handle_exception(e)

@router.get("/runners/autogen")
async def get_autogen_runner_schema():
    """Get AutoGen runner schema"""
    try:
        schema = AutoGenRunnerConfig.model_json_schema()
        return {
            "success": True,
            "data": schema,
            "error": None
        }
    except Exception as e:
        return handle_exception(e)

@router.get("/runners/llamaindex")
async def get_llamaindex_runner_schema():
    """Get LlamaIndex runner schema"""
    try:
        schema = LlamaIndexRunnerConfig.model_json_schema()
        return {
            "success": True,
            "data": schema,
            "error": None
        }
    except Exception as e:
        return handle_exception(e)

@router.get("/runners/llm-config")
async def get_llm_config_schema():
    """Get LLM configuration schema"""
    try:
        schema = LLMConfig.model_json_schema()
        return {
            "success": True,
            "data": schema,
            "error": None
        }
    except Exception as e:
        return handle_exception(e)

@router.get("/runners/tool-config")
async def get_tool_config_schema():
    """Get tool configuration schema"""
    try:
        schema = ToolConfig.model_json_schema()
        return {
            "success": True,
            "data": schema,
            "error": None
        }
    except Exception as e:
        return handle_exception(e) 