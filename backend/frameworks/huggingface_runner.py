#!/usr/bin/env python3
"""
🤗 Enhanced HuggingFace Runner with New Inference Providers Support
Updated for 2025 HuggingFace API migration to Inference Providers system
"""

import logging
import asyncio
import aiohttp
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
import os 

from .huggingface_utils import (
    get_supported_tasks,
    get_task_config,
    build_request_payload,
    parse_response,
    get_retry_config,
    handle_api_errors,
    format_input_for_task
)
from .huggingface_auto_router import route_huggingface_task

logger = logging.getLogger(__name__)

class HuggingFaceAPIError(Exception):
    """Custom exception for HuggingFace API errors"""
    def __init__(self, message: str, status_code: Optional[int] = None, response_data: Optional[str] = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_data = response_data

# 🎯 VERIFIED WORKING MODELS - Best of both worlds
VERIFIED_WORKING_MODELS = {
    "summarization": {
        "primary": "sshleifer/distilbart-cnn-12-6",
        "fallback": "facebook/bart-large-cnn", 
        "provider": "hf-inference"
    },
    "text-classification": {
        "primary": "cardiffnlp/twitter-roberta-base-sentiment",
        "fallback": "distilbert-base-uncased-finetuned-sst-2-english",
        "provider": "hf-inference"
    },
    "question-answering": {
        "primary": "deepset/roberta-base-squad2",
        "fallback": "distilbert-base-cased-distilled-squad",
        "provider": "hf-inference"
    },
    "zero-shot-classification": {
        "primary": "facebook/bart-large-mnli",
        "fallback": "typeform/distilbert-base-uncased-mnli",
        "provider": "hf-inference"
    }
}

# 🏢 INFERENCE PROVIDERS - HuggingFace Only
INFERENCE_PROVIDERS = {
    "hf-inference": {
        "name": "HuggingFace Inference API",
        "base_url": "https://api-inference.huggingface.co",
        "requires_api_key": True,
        "supported_tasks": list(VERIFIED_WORKING_MODELS.keys())
    }
}

async def run_huggingface_tool_frontend(
    config: Dict[str, Any], 
    inputs: Dict[str, Any], 
    context: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Enhanced HuggingFace tool runner specifically for frontend task configuration
    Handles the new task/model/inputs format from the ToolEditor
    """
    try:
        logger.info(f"🚀 HuggingFace Frontend Tool Runner")
        logger.info(f"📋 Config: {config}")
        logger.info(f"📥 Inputs: {inputs}")
        
        # Extract HuggingFace configuration from frontend format
        hf_task = config.get("hfTask") or config.get("task")
        hf_model = config.get("hfModel") or config.get("model") 
        hf_task_inputs = config.get("hfTaskInputs", {})
        
        if not hf_task or not hf_model:
            return _create_error_response(
                "configuration_error",
                f"Missing required HuggingFace config: task='{hf_task}', model='{hf_model}'",
                config
            )
        
        # Merge frontend task inputs with runtime inputs
        final_inputs = {**hf_task_inputs, **inputs}
        
        logger.info(f"🤗 Using HuggingFace: task='{hf_task}', model='{hf_model}'")
        logger.info(f"📊 Final inputs: {final_inputs}")
        
        # Get API key from context
        api_key = await _get_api_key(context)
        if not api_key:
            return _create_error_response(
                "authentication_error",
                "No HuggingFace API key found. Please add your API key in Settings.",
                config
            )
        
        # Use the auto-router for task execution
        from .huggingface_auto_router import route_huggingface_task
        
        result = await route_huggingface_task(
            task=hf_task,
            model=hf_model,
            inputs=final_inputs,
            api_key=api_key,
            config=config
        )
        
        # Format response for frontend
        if result.get("success"):
            return {
                "success": True,
                "output": result.get("output", ""),
                "provider": "huggingface-frontend",
                "model": hf_model,
                "task": hf_task,
                "metadata": {
                    "method": result.get("method", "auto-router"),
                    "confidence": result.get("confidence"),
                    "response_time": result.get("response_time")
                },
                **{k: v for k, v in result.items() if k not in ["success", "output"]}
            }
        else:
            return _create_error_response(
                "execution_error",
                result.get("error", "HuggingFace execution failed"),
                config
            )
    
    except Exception as e:
        logger.error(f"❌ HuggingFace frontend tool execution failed: {str(e)}")
        return _create_error_response(
            "execution_error",
            f"HuggingFace frontend execution failed: {str(e)}",
            config
        )

async def run_huggingface_tool(
    config: Dict[str, Any], 
    inputs: Dict[str, Any], 
    context: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Enhanced HuggingFace tool runner with auto-routing
    Now supports both legacy and frontend configuration formats
    """
    try:
        logger.info(f"🚀 HuggingFace Tool Runner - Enhanced with Auto-Router")
        
        # Check if this is the new frontend format
        if config.get("hfTask") or config.get("toolType") == "huggingface":
            return await run_huggingface_tool_frontend(config, inputs, context)
        
        # Legacy format handling
        task_type = config.get("taskType", "").lower()
        model_name = config.get("modelName", "")
        
        if not task_type or not model_name:
            return _create_error_response(
                "configuration_error",
                f"Missing required config: taskType='{task_type}', modelName='{model_name}'",
                config
            )
        
        # Get API key from context
        api_key = await _get_api_key(context)
        if not api_key:
            return _create_error_response(
                "authentication_error",
                "No HuggingFace API key found. Please add your API key in Settings.",
                config
            )
        
        logger.info(f"🤗 Using HuggingFace Auto-Router for {task_type} with {model_name}")
        
        # Use the auto-router for all tasks
        from .huggingface_auto_router import route_huggingface_task
        
        result = await route_huggingface_task(
            task=task_type,
            model=model_name,
            inputs=inputs,
            api_key=api_key,
            config=config
        )
        
        # Return the auto-router result directly
        if result.get("success"):
            return {
                "success": True,
                "output": result.get("output", ""),
                "provider": "hf-auto-router",
                "model": model_name,
                "task_type": task_type,
                **{k: v for k, v in result.items() if k not in ["success", "output"]}
            }
        else:
            return _create_error_response(
                "auto_router_error",
                result.get("error", "Auto-router failed"),
                config
            )
    
    except Exception as e:
        logger.error(f"❌ HuggingFace tool execution failed: {str(e)}")
        return _create_error_response(
            "execution_error",
            f"HuggingFace execution failed: {str(e)}",
            config
        )

async def _execute_hf_inference(
    model_name: str,
    task_type: str, 
    inputs: Dict[str, Any],
    config: Dict[str, Any],
    api_key: str
) -> Dict[str, Any]:
    """Execute using HuggingFace's inference API - simplified and reliable"""
    try:
        from huggingface_hub import InferenceClient
        
        logger.info(f"🤗 Executing {task_type} with: {model_name}")
        logger.info(f"🔍 ENTRY DEBUG: inputs = {inputs}")
        logger.info(f"🔍 ENTRY DEBUG: inputs type = {type(inputs)}")
        logger.info(f"🔍 ENTRY DEBUG: inputs keys = {list(inputs.keys()) if isinstance(inputs, dict) else 'NOT A DICT'}")
        
        client = InferenceClient(token=api_key)
        # Get the input data from various possible locations
        input_data = inputs.get("inputs", inputs)
        logger.info(f"🔍 DEBUG: Full inputs = {inputs}")
        logger.info(f"🔍 DEBUG: Extracted input_data = {input_data}")
        logger.info(f"🔍 DEBUG: Task type = {task_type}")
        
        # Special handling for question-answering task
        if task_type == "question-answering":
            # For Q&A, we need the full dict, not just the "inputs" value
            qa_input = inputs.get("inputs")
            logger.info(f"🔍 DEBUG: Q&A input = {qa_input}")
            logger.info(f"🔍 DEBUG: Q&A input type = {type(qa_input)}")
            
            if isinstance(qa_input, dict) and 'question' in qa_input and 'context' in qa_input:
                question = qa_input['question']
                qa_context = qa_input['context']  # Renamed to avoid conflict
                logger.info(f"🔍 DEBUG: Q&A extracted - question: '{question}' (type: {type(question)})")
                logger.info(f"🔍 DEBUG: Q&A extracted - context: '{qa_context}' (type: {type(qa_context)})")
                
                # Validate that question and context are not None/empty
                if not question or not qa_context:
                    logger.error(f"❌ Question or context is empty: question='{question}', context='{qa_context}'")
                    return {
                        "success": False,
                        "error": f"Question or context is empty. Question: '{question}', Context: '{qa_context}'",
                        "provider": "hf-inference"
                    }
                
                try:
                    logger.info(f"🔍 ATTEMPT 1: Trying InferenceClient.question_answering with direct parameters")
                    # ✅ CORRECT FORMAT: InferenceClient.question_answering expects question and context as direct parameters
                    result = client.question_answering(
                        question=question,
                        context=qa_context,
                        model=model_name
                    )
                    logger.info(f"🎉 SUCCESS: InferenceClient worked! Result: {result}")
                    
                    if isinstance(result, dict):
                        answer = result.get('answer', str(result))
                        score = result.get('score', 0)
                        output = f"{answer} (confidence: {score:.1%})"
                    else:
                        output = str(result)
                        
                except Exception as inference_client_error:
                    logger.warning(f"⚠️ InferenceClient failed: {inference_client_error}")
                    logger.info(f"🔄 ATTEMPT 2: Trying direct HTTP API call as fallback")
                    
                    try:
                        # Direct HTTP API call as fallback
                        import aiohttp
                        headers = {
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json"
                        }
                        
                        # Use the correct legacy API format for direct HTTP call
                        payload = {
                            "inputs": {
                                "question": question,
                                "context": qa_context
                            }
                        }
                        
                        url = f"https://api-inference.huggingface.co/models/{model_name}"
                        
                        async with aiohttp.ClientSession() as session:
                            async with session.post(url, headers=headers, json=payload) as response:
                                if response.status == 200:
                                    result = await response.json()
                                    logger.info(f"🎉 SUCCESS: Direct HTTP API worked! Result: {result}")
                                    
                                    if isinstance(result, dict):
                                        answer = result.get('answer', str(result))
                                        score = result.get('score', 0)
                                        output = f"{answer} (confidence: {score:.1%})"
                                    else:
                                        output = str(result)
                                else:
                                    error_text = await response.text()
                                    logger.error(f"❌ Direct HTTP API also failed: {response.status} - {error_text}")
                                    return {
                                        "success": False,
                                        "error": f"Both InferenceClient and direct HTTP API failed. HTTP: {response.status} - {error_text}",
                                        "provider": "hf-inference"
                                    }
                                    
                    except Exception as http_error:
                        logger.error(f"❌ Direct HTTP API exception: {http_error}")
                        return {
                            "success": False,
                            "error": f"Both InferenceClient ({inference_client_error}) and HTTP API ({http_error}) failed",
                            "provider": "hf-inference"
                        }
            else:
                return {
                    "success": False,
                    "error": f"Invalid Q&A format. Expected dict with 'question' and 'context', got: {type(qa_input)} - {qa_input}",
                    "provider": "hf-inference"
                }
        
        # For other tasks, check if we have input data
        elif not input_data:
            return {
                "success": False,
                "error": "No input data provided",
                "provider": "hf-inference"
            }
        
        # Route to appropriate method
        elif task_type == "text-classification":
            result = client.text_classification(input_data, model=model_name)
            # Handle response properly
            if isinstance(result, list) and len(result) > 0:
                best_result = max(result, key=lambda x: x.get('score', 0))
                label = best_result.get('label', 'unknown')
                score = best_result.get('score', 0)
                output = f"Sentiment: {label} (confidence: {score:.1%})"
            else:
                output = str(result)
        
        elif task_type == "summarization":
            result = client.summarization(input_data, model=model_name)
            # Handle different response formats
            if isinstance(result, dict) and 'summary_text' in result:
                output = result['summary_text']
            elif isinstance(result, list) and len(result) > 0:
                output = result[0].get('summary_text', str(result[0]))
            else:
                output = str(result)
        
        elif task_type == "zero-shot-classification":
            candidate_labels = config.get("candidate_labels", ["positive", "negative", "neutral"])
            result = client.zero_shot_classification(input_data, candidate_labels, model=model_name)
            # Handle response properly
            if hasattr(result, 'labels') and hasattr(result, 'scores'):
                best_label = result.labels[0]
                best_score = result.scores[0]
                output = f"Classification: {best_label} (confidence: {best_score:.1%})"
            elif isinstance(result, dict):
                labels = result.get('labels', [])
                scores = result.get('scores', [])
                if labels and scores:
                    output = f"Classification: {labels[0]} (confidence: {scores[0]:.1%})"
                else:
                    output = str(result)
            elif isinstance(result, list) and len(result) > 0:
                # Handle list of classification results
                first_result = result[0]
                if hasattr(first_result, 'label') and hasattr(first_result, 'score'):
                    output = f"Classification: {first_result.label} (confidence: {first_result.score:.1%})"
                else:
                    output = f"Classification: {str(first_result)}"
            else:
                output = str(result)
            
        else:
            return {
                "success": False,
                "error": f"Task '{task_type}' not implemented in simplified version",
                "provider": "hf-inference"
            }
        
        return {
            "success": True,
            "output": output,
            "provider": "hf-inference",
            "model": model_name,
            "task_type": task_type
        }
        
    except Exception as e:
        logger.error(f"❌ HF Inference execution failed: {str(e)}")
        return _create_error_response("hf_inference_error", str(e), config)

async def _execute_legacy_api(
    model_name: str,
    task_type: str,
    inputs: Dict[str, Any],
    config: Dict[str, Any], 
    api_key: str
) -> Dict[str, Any]:
    """Fallback to legacy HuggingFace API for compatibility"""
    
    try:
        # Use the existing retry logic
        formatted_inputs = format_input_for_task(task_type, inputs)
        payload = build_request_payload(task_type, formatted_inputs, config)
        
        result = await _execute_with_retry(model_name, payload, api_key, task_type)
        
        if result:
            output = parse_response(task_type, result)
            return {
                "success": True,
                "output": output,
                "model": model_name,
                "task": task_type,
                "provider": "legacy-api",
                "metadata": {
                    "execution_time": (datetime.now() - datetime.now()).total_seconds(),
                    "model_name": model_name,
                    "task_type": task_type
                }
            }
        else:
            return _create_error_response("legacy_api_error", "No response from legacy API", config)
            
    except Exception as e:
        logger.error(f"❌ Legacy API execution failed: {str(e)}")
        return _create_error_response("legacy_api_error", str(e), config)

# Keep existing helper functions
async def _get_api_key(context: Optional[Any]) -> Optional[str]:
    """Get HuggingFace API key from context or environment"""
    try:
        # Try to get from context first (BYOK)
        if context and hasattr(context, 'get_api_key_for_framework'):
            api_key = context.get_api_key_for_framework('huggingface')
            if api_key:
                logger.debug("🔑 Using API key from execution context")
                return api_key
        
        # Fallback to environment variable
        api_key = os.getenv('HUGGINGFACE_API_KEY')
        if api_key:
            logger.debug("🔑 Using API key from environment")
            return api_key
        
        logger.warning("⚠️ No HuggingFace API key found")
        return None
        
    except Exception as e:
        logger.error(f"❌ Error getting API key: {str(e)}")
        return None

async def _execute_with_retry(
    model_name: str, 
    payload: Dict[str, Any], 
    api_key: str, 
    task_type: str
) -> Any:
    """Execute API call with retry logic"""
    
    retry_config = get_retry_config()
    max_retries = retry_config["max_retries"]
    base_delay = retry_config["base_delay"]
    max_delay = retry_config["max_delay"]
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "CrewBuilder-HuggingFace-Runner/1.0"
    }
    
    url = f"https://api-inference.huggingface.co/models/{model_name}"
    
    for attempt in range(max_retries + 1):
        try:
            timeout = aiohttp.ClientTimeout(total=30)
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        logger.info(f"✅ HuggingFace API call successful for {model_name}")
                        return result
                    
                    # Handle specific error cases
                    response_text = await response.text()
                    
                    if response.status == 503:
                        logger.warning(f"🔄 Model {model_name} is loading (attempt {attempt + 1})")
                        if attempt < max_retries:
                            delay = min(base_delay * (2 ** attempt), max_delay)
                            await asyncio.sleep(delay)
                            continue
                    
                    # Check if we should retry
                    should_retry, error_message = await handle_api_errors(response.status, response_text)
                    
                    if should_retry and attempt < max_retries:
                        delay = min(base_delay * (2 ** attempt), max_delay)
                        logger.warning(f"⚠️ HuggingFace API error (attempt {attempt + 1}): {error_message}")
                        await asyncio.sleep(delay)
                        continue
                    else:
                        raise HuggingFaceAPIError(
                            f"API error: {error_message}",
                            status_code=response.status,
                            response_data=response_text
                        )
        
        except asyncio.TimeoutError:
            logger.warning(f"⏰ HuggingFace API timeout (attempt {attempt + 1}): Request timeout")
            if attempt < max_retries:
                delay = min(base_delay * (2 ** attempt), max_delay)
                await asyncio.sleep(delay)
                continue
            else:
                raise HuggingFaceAPIError("Request timeout")
        
        except aiohttp.ClientError as e:
            logger.warning(f"🌐 HuggingFace API connection error (attempt {attempt + 1}): {str(e)}")
            if attempt < max_retries:
                delay = min(base_delay * (2 ** attempt), max_delay)
                await asyncio.sleep(delay)
                continue
            else:
                raise HuggingFaceAPIError(f"Connection error: {str(e)}")
    
    raise HuggingFaceAPIError("Max retries exceeded")

def _create_error_response(
    error_type: str, 
    error_message: str, 
    config: Dict[str, Any], 
    status_code: Optional[int] = None
) -> Dict[str, Any]:
    """Create standardized error response"""
    return {
        "success": False,
        "error": error_message,
        "error_type": error_type,
        "status_code": status_code,
        "model": config.get("modelName", "unknown"),
        "task": config.get("taskType", "unknown"),
        "timestamp": datetime.now().isoformat(),
        "metadata": {
            "config": config,
            "error_details": {
                "type": error_type,
                "message": error_message,
                "status_code": status_code
            }
        }
    }

# 🎯 NEW: Frontend integration functions
def get_available_tasks() -> Dict[str, str]:
    """Get available tasks with their verified models"""
    return {task: info["primary"] for task, info in VERIFIED_WORKING_MODELS.items()}

def get_verified_models_by_task(task_type: str) -> Dict[str, str]:
    """Get verified models for a specific task"""
    if task_type in VERIFIED_WORKING_MODELS:
        return {
            "primary": VERIFIED_WORKING_MODELS[task_type]["primary"],
            "fallback": VERIFIED_WORKING_MODELS[task_type]["fallback"],
            "provider": VERIFIED_WORKING_MODELS[task_type]["provider"]
        }
    return {}

def get_all_providers() -> List[str]:
    """Get list of all available providers"""
    return list(INFERENCE_PROVIDERS.keys())

def get_provider_models(provider: str) -> Dict[str, List[str]]:
    """Get models available for a specific provider"""
    return INFERENCE_PROVIDERS.get(provider, {}).get("models", {})

# Compatibility functions
async def run_huggingface_model(config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Compatibility wrapper"""
    return await run_huggingface_tool(config, inputs)

# Export main functions
__all__ = [
    "run_huggingface_tool",
    "get_available_tasks", 
    "get_verified_models_by_task",
    "get_all_providers",
    "get_provider_models",
    "VERIFIED_WORKING_MODELS",
    "INFERENCE_PROVIDERS"
]