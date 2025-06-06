#!/usr/bin/env python3
"""
🎯 Framework-Model Compatibility API
Serves dynamic framework-model mappings based on user's BYOK configuration
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from typing import Dict, Any, List, Optional
import logging
from pydantic import BaseModel

from core.provider_registry import provider_registry, ProviderConfig
from framework_registry import framework_registry, FRAMEWORK_METADATA, LLM_METADATA
from services.user_settings_service import user_settings_service
from utils.security import get_current_user_optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/framework-models", tags=["framework-models"])

class FrameworkModel(BaseModel):
    id: str
    name: str
    context: str
    cost: str
    native: bool
    fallback: Optional[bool] = False
    display_name: str
    support_label: str
    full_details: str

class ProviderSupport(BaseModel):
    id: str
    name: str
    icon: str
    description: str
    has_api_key: bool
    key_masked: str
    has_native_support: bool
    has_fallback_support: bool
    native_count: int
    fallback_count: int
    total_models: int
    disabled: bool

class FrameworkInfo(BaseModel):
    id: str
    name: str
    icon: str
    description: str
    user_has_keys: bool
    supported_providers: List[str]
    key_count: int

class FrameworkModelResponse(BaseModel):
    success: bool
    frameworks: List[FrameworkInfo]
    providers: Dict[str, List[ProviderSupport]]
    models: Dict[str, Dict[str, List[FrameworkModel]]]
    user_api_keys: List[str]

# Framework-Model Matrix - Server-side version of frameworkModels.js
FRAMEWORK_MODELS = {
    "crewai": {
        "openai": [
            {"id": "openai/gpt-4", "name": "GPT-4", "context": "8K", "cost": "high", "native": True},
            {"id": "openai/gpt-4-turbo", "name": "GPT-4 Turbo", "context": "128K", "cost": "high", "native": True},
            {"id": "openai/gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "context": "16K", "cost": "medium", "native": True}
        ],
        "anthropic": [
            {"id": "anthropic/claude-3-opus", "name": "Claude 3 Opus", "context": "200K", "cost": "high", "native": True},
            {"id": "anthropic/claude-3-sonnet", "name": "Claude 3 Sonnet", "context": "200K", "cost": "medium", "native": True},
            {"id": "anthropic/claude-3-haiku", "name": "Claude 3 Haiku", "context": "200K", "cost": "low", "native": True}
        ],
        "perplexity": [
            {"id": "llama-3.1-sonar-large-128k-online", "name": "Sonar Large (Online)", "context": "128K", "cost": "medium", "native": True},
            {"id": "llama-3.1-sonar-small-128k-online", "name": "Sonar Small (Online)", "context": "128K", "cost": "low", "native": True},
            {"id": "llama-3.1-sonar-huge-128k-online", "name": "Sonar Huge (Online)", "context": "128K", "cost": "high", "native": True}
        ],
        "google": [
            {"id": "google/gemini-pro", "name": "Gemini Pro", "context": "32K", "cost": "medium", "native": True},
            {"id": "google/gemini-pro-vision", "name": "Gemini Pro Vision", "context": "16K", "cost": "high", "native": True},
            {"id": "google/gemini-1.5-pro", "name": "Gemini 1.5 Pro", "context": "1M", "cost": "high", "native": True}
        ]
    },
    "langchain": {
        "openai": [
            {"id": "gpt-4", "name": "GPT-4", "context": "8K", "cost": "high", "native": True},
            {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "context": "128K", "cost": "high", "native": True},
            {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "context": "16K", "cost": "medium", "native": True}
        ],
        "anthropic": [
            {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus", "context": "200K", "cost": "high", "native": True},
            {"id": "claude-3-sonnet-20240229", "name": "Claude 3 Sonnet", "context": "200K", "cost": "medium", "native": True},
            {"id": "claude-3-haiku-20240307", "name": "Claude 3 Haiku", "context": "200K", "cost": "low", "native": True}
        ],
        "perplexity": [
            {"id": "sonar-pro", "name": "Sonar Pro", "context": "200K", "cost": "medium", "native": False, "fallback": True},
            {"id": "sonar", "name": "Sonar", "context": "128K", "cost": "low", "native": False, "fallback": True},
            {"id": "sonar-reasoning", "name": "Sonar Reasoning", "context": "128K", "cost": "medium", "native": False, "fallback": True}
        ],
        "google": [
            {"id": "gemini-pro", "name": "Gemini Pro", "context": "32K", "cost": "medium", "native": True},
            {"id": "gemini-pro-vision", "name": "Gemini Pro Vision", "context": "16K", "cost": "high", "native": True}
        ],
        "huggingface": [
            {"id": "microsoft/DialoGPT-large", "name": "DialoGPT Large", "context": "1K", "cost": "free", "native": True},
            {"id": "microsoft/DialoGPT-medium", "name": "DialoGPT Medium", "context": "1K", "cost": "free", "native": True},
            {"id": "EleutherAI/gpt-j-6B", "name": "GPT-J 6B", "context": "2K", "cost": "free", "native": True}
        ]
    },
    "huggingface": {
        "huggingface": [
            {"id": "microsoft/DialoGPT-large", "name": "DialoGPT Large", "context": "1K", "cost": "free", "native": True},
            {"id": "microsoft/DialoGPT-medium", "name": "DialoGPT Medium", "context": "1K", "cost": "free", "native": True},
            {"id": "facebook/blenderbot-400M-distill", "name": "BlenderBot 400M", "context": "512", "cost": "free", "native": True},
            {"id": "EleutherAI/gpt-j-6B", "name": "GPT-J 6B", "context": "2K", "cost": "free", "native": True}
        ]
    }
}

FRAMEWORK_INFO = {
    "crewai": {"name": "CrewAI", "icon": "🤖", "description": "Multi-agent AI crews"},
    "langchain": {"name": "LangChain", "icon": "🦜", "description": "LLM application framework"},
    "autogen": {"name": "AutoGen", "icon": "🔄", "description": "Conversational AI agents"},
    "llamaindex": {"name": "LlamaIndex", "icon": "🦙", "description": "Data framework for LLMs"},
    "huggingface": {"name": "HuggingFace", "icon": "🤗", "description": "Open source ML models"},
    "openrouter": {"name": "OpenRouter", "icon": "🌐", "description": "100+ AI models via one API"}
}

PROVIDER_INFO = {
    "openai": {"name": "OpenAI", "icon": "🤖", "description": "GPT-4, GPT-3.5-turbo"},
    "anthropic": {"name": "Anthropic", "icon": "🧠", "description": "Claude 3 models"},
    "google": {"name": "Google AI", "icon": "🔍", "description": "Gemini models"},
    "perplexity": {"name": "Perplexity", "icon": "🔍", "description": "Sonar models"},
    "mistral": {"name": "Mistral AI", "icon": "🌪️", "description": "Mistral models"},
    "cohere": {"name": "Cohere", "icon": "🔗", "description": "Command models"},
    "openrouter": {"name": "OpenRouter", "icon": "🌐", "description": "100+ models"},
    "huggingface": {"name": "HuggingFace", "icon": "🤗", "description": "Open source models"}
}

def get_framework_providers(framework: str) -> List[str]:
    """Get providers supported by a framework"""
    return list(FRAMEWORK_MODELS.get(framework, {}).keys())

def get_provider_support(framework: str, provider: str) -> Dict[str, Any]:
    """Get support statistics for a framework-provider combination"""
    models = FRAMEWORK_MODELS.get(framework, {}).get(provider, [])
    native_models = [m for m in models if m.get("native", False)]
    fallback_models = [m for m in models if not m.get("native", True)]
    
    return {
        "has_native_support": len(native_models) > 0,
        "has_fallback_support": len(fallback_models) > 0,
        "native_count": len(native_models),
        "fallback_count": len(fallback_models),
        "total_models": len(models)
    }

def format_model(model: Dict[str, Any]) -> FrameworkModel:
    """Format a model for API response"""
    native = model.get("native", True)
    return FrameworkModel(
        id=model["id"],
        name=model["name"],
        context=model["context"],
        cost=model["cost"],
        native=native,
        fallback=model.get("fallback", False),
        display_name=f"{model['name']} {'✅ Native' if native else '⚠️ Fallback'}",
        support_label="✅ Native Support" if native else "⚠️ Fallback Mode",
        full_details=f"{model['context']} context, {model['cost']} cost"
    )

@router.get("/compatibility", response_model=FrameworkModelResponse)
async def get_framework_model_compatibility(
    current_user: Optional[Dict] = Depends(get_current_user_optional),
    show_only_native: bool = False
):
    """
    Get comprehensive framework-model compatibility matrix
    Filtered by user's available API keys
    """
    try:
        # Get user's API keys
        user_id = current_user.get('user_id') if current_user else "anonymous"
        
        try:
            user_api_keys = await user_settings_service.get_user_api_keys(user_id)
            available_providers = [key.provider for key in user_api_keys if key.validation_status == 'valid' and key.is_active]
        except Exception as e:
            logger.warning(f"Could not load user API keys: {e}")
            available_providers = []
        
        # Build frameworks list
        frameworks = []
        for framework_id, info in FRAMEWORK_INFO.items():
            supported_providers = get_framework_providers(framework_id)
            user_has_keys = any(provider in available_providers for provider in supported_providers)
            key_count = sum(1 for provider in supported_providers if provider in available_providers)
            
            frameworks.append(FrameworkInfo(
                id=framework_id,
                name=info["name"],
                icon=info["icon"],
                description=info["description"],
                user_has_keys=user_has_keys,
                supported_providers=supported_providers,
                key_count=key_count
            ))
        
        # Build providers by framework
        providers_by_framework = {}
        for framework_id in FRAMEWORK_INFO.keys():
            supported_providers = get_framework_providers(framework_id)
            provider_list = []
            
            for provider_id in supported_providers:
                provider_info = PROVIDER_INFO.get(provider_id, {
                    "name": provider_id.title(),
                    "icon": "🔧",
                    "description": f"{provider_id} models"
                })
                
                has_api_key = provider_id in available_providers
                support = get_provider_support(framework_id, provider_id)
                
                # Find user's key for masking
                user_key = next((key for key in user_api_keys if key.provider == provider_id), None) if user_api_keys else None
                key_masked = user_key.masked_value if user_key else "No key configured"
                
                provider_list.append(ProviderSupport(
                    id=provider_id,
                    name=provider_info["name"],
                    icon=provider_info["icon"],
                    description=provider_info["description"],
                    has_api_key=has_api_key,
                    key_masked=key_masked,
                    has_native_support=support["has_native_support"],
                    has_fallback_support=support["has_fallback_support"],
                    native_count=support["native_count"],
                    fallback_count=support["fallback_count"],
                    total_models=support["total_models"],
                    disabled=not has_api_key or (not support["has_native_support"] and show_only_native)
                ))
            
            providers_by_framework[framework_id] = provider_list
        
        # Build models by framework and provider
        models_by_framework = {}
        for framework_id, providers in FRAMEWORK_MODELS.items():
            models_by_framework[framework_id] = {}
            for provider_id, models in providers.items():
                formatted_models = []
                for model in models:
                    if show_only_native and not model.get("native", True):
                        continue
                    formatted_models.append(format_model(model))
                
                models_by_framework[framework_id][provider_id] = formatted_models
        
        return FrameworkModelResponse(
            success=True,
            frameworks=frameworks,
            providers=providers_by_framework,
            models=models_by_framework,
            user_api_keys=available_providers
        )
        
    except Exception as e:
        logger.error(f"Error getting framework-model compatibility: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get framework-model compatibility: {str(e)}"
        )

@router.get("/frameworks")
async def get_available_frameworks(
    current_user: Optional[Dict] = Depends(get_current_user_optional)
):
    """Get available frameworks with user's API key status"""
    try:
        user_id = current_user.get('user_id') if current_user else "anonymous"
        
        try:
            user_api_keys = await user_settings_service.get_user_api_keys(user_id)
            available_providers = [key.provider for key in user_api_keys if key.validation_status == 'valid' and key.is_active]
        except Exception:
            available_providers = []
        
        frameworks = []
        for framework_id, info in FRAMEWORK_INFO.items():
            supported_providers = get_framework_providers(framework_id)
            user_has_keys = any(provider in available_providers for provider in supported_providers)
            
            frameworks.append({
                "id": framework_id,
                "name": info["name"],
                "icon": info["icon"],
                "description": info["description"],
                "user_has_keys": user_has_keys,
                "supported_providers": supported_providers,
                "key_count": sum(1 for provider in supported_providers if provider in available_providers)
            })
        
        return {"success": True, "frameworks": frameworks}
        
    except Exception as e:
        logger.error(f"Error getting frameworks: {str(e)}")
        return {"success": False, "error": str(e), "frameworks": []}

@router.get("/models/{framework}/{provider}")
async def get_models_for_framework_provider(
    framework: str,
    provider: str,
    show_only_native: bool = False
):
    """Get models for a specific framework-provider combination"""
    try:
        models = FRAMEWORK_MODELS.get(framework, {}).get(provider, [])
        
        if show_only_native:
            models = [m for m in models if m.get("native", True)]
        
        formatted_models = [format_model(model) for model in models]
        
        return {
            "success": True,
            "framework": framework,
            "provider": provider,
            "models": formatted_models,
            "count": len(formatted_models)
        }
        
    except Exception as e:
        logger.error(f"Error getting models for {framework}/{provider}: {str(e)}")
        return {"success": False, "error": str(e), "models": []}

@router.get("/check-support/{framework}/{provider}/{model}")
async def check_model_support(framework: str, provider: str, model: str):
    """Check if a specific model is natively supported by a framework"""
    try:
        models = FRAMEWORK_MODELS.get(framework, {}).get(provider, [])
        model_info = next((m for m in models if m["id"] == model), None)
        
        if model_info:
            return {
                "success": True,
                "framework": framework,
                "provider": provider,
                "model": model,
                "native_support": model_info.get("native", True),
                "fallback_support": model_info.get("fallback", False),
                "model_info": model_info
            }
        else:
            return {
                "success": False,
                "error": "Model not found in compatibility matrix",
                "native_support": False,
                "fallback_support": False
            }
            
    except Exception as e:
        logger.error(f"Error checking model support: {str(e)}")
        return {"success": False, "error": str(e)} 