#!/usr/bin/env python3
"""
🔄 Workflow Execution Context
Enhanced context management with Supabase BYOK integration
"""

import logging
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
import asyncio
import os
from dataclasses import dataclass, field
from collections.abc import Mapping

# UPDATED: Import the new Supabase service
from services.user_settings_service import user_settings_service
from core.provider_registry import provider_registry

logger = logging.getLogger(__name__)

class WorkflowExecutionContext(Mapping):
    """Enhanced workflow execution context with Supabase BYOK support and proper mapping interface"""
    
    def __init__(self, user_id: Optional[str] = None, workflow_id: Optional[str] = None):
        self.user_id = user_id or "anonymous"  # Default to anonymous for unauthenticated users
        self.workflow_id = workflow_id
        self.user_api_keys: Dict[str, str] = {}
        self.context_key = f"user:{self.user_id}"
        self.execution_start_time = datetime.now()
        
        # UPDATED: Use the new Supabase service
        self.user_settings_service = user_settings_service
        
        logger.info(f"🔄 Initializing workflow execution context for user: {self.user_id}")

    # Implement Mapping interface
    def __getitem__(self, key: str) -> Any:
        """Dictionary-style access"""
        context_dict = self.to_dict()
        return context_dict[key]
    
    def __iter__(self):
        """Iterator for mapping interface"""
        context_dict = self.to_dict()
        return iter(context_dict)
    
    def __len__(self) -> int:
        """Length for mapping interface"""
        context_dict = self.to_dict()
        return len(context_dict)
    
    def keys(self):
        """Dictionary-style keys method"""
        context_dict = self.to_dict()
        return context_dict.keys()
    
    def values(self):
        """Dictionary-style values method"""
        context_dict = self.to_dict()
        return context_dict.values()
    
    def items(self):
        """Dictionary-style items method"""
        context_dict = self.to_dict()
        return context_dict.items()

    async def initialize(self):
        """Initialize the execution context with user API keys from Supabase"""
        try:
            if self.user_id == "system":
                logger.info("🔧 Using system execution context - no user keys loaded")
                return
            
            # Load user API keys from Supabase using unified service
            logger.info(f"🔑 Loading API keys for user: {self.user_id}")
            api_keys_data = await self.user_settings_service.get_user_api_keys(self.user_id)
            
            if api_keys_data:
                # Convert API keys data to the format expected by execution context
                user_keys = {}
                for key_data in api_keys_data:
                    provider_id = key_data.get('provider_id', '')
                    if key_data.get('validation_status') == 'valid' and key_data.get('is_active', False):
                        # Decrypt the key for execution
                        try:
                            encrypted_key = key_data.get('encrypted_key', '')
                            if encrypted_key:
                                # Use the unified service's key manager to decrypt
                                key_manager = self.user_settings_service.get_key_manager()
                                decrypted_key = key_manager.decrypt_key(encrypted_key)
                                user_keys[provider_id] = decrypted_key
                                logger.debug(f"🔑 Loaded API key for provider: {provider_id}")
                        except Exception as e:
                            logger.error(f"❌ Failed to decrypt API key for {provider_id}: {str(e)}")
                            continue
                
                self.user_api_keys = user_keys
                logger.info(f"✅ Loaded {len(user_keys)} valid API keys for user {self.user_id}")
                
                # Log available providers (without exposing keys)
                providers = list(user_keys.keys())
                logger.info(f"📋 Available providers: {providers}")
            else:
                logger.warning(f"⚠️ No API keys found for user {self.user_id}")
                
        except Exception as e:
            logger.error(f"❌ Failed to load user API keys for {self.user_id}: {str(e)}")
            # Continue with empty keys rather than failing
            self.user_api_keys = {}

    def get_api_key_for_framework(self, framework: str, model: Optional[str] = None) -> Optional[str]:
        """
        Get the appropriate API key for a framework/model combination
        Enhanced with better provider matching and fallback logic
        """
        try:
            # Direct framework match
            if framework in self.user_api_keys:
                logger.debug(f"🔑 Found direct API key for framework: {framework}")
                return self.user_api_keys[framework]
            
            # Try to find provider by model if specified
            if model:
                provider = provider_registry.get_provider_for_model(model)
                if provider and provider.id in self.user_api_keys:
                    logger.debug(f"🔑 Found API key for model {model} via provider: {provider.id}")
                    return self.user_api_keys[provider.id]
            
            # Framework-specific fallback logic
            fallback_mapping = {
                "openai": ["openai", "azure_openai"],
                "anthropic": ["anthropic", "claude"],
                "perplexity": ["perplexity", "pplx"],
                "google": ["google", "gemini", "palm"],
                "cohere": ["cohere"],
                "huggingface": ["huggingface", "hf"],
                "ollama": ["ollama", "local"],
                "openrouter": ["openrouter"],
                "groq": ["groq"],
                "together": ["together"],
                "replicate": ["replicate"],
                "mistral": ["mistral"],
                "deepseek": ["deepseek"],
                "xai": ["xai", "grok"]
            }
            
            framework_lower = framework.lower()
            for primary, alternatives in fallback_mapping.items():
                if framework_lower in alternatives:
                    for alt in alternatives:
                        if alt in self.user_api_keys:
                            logger.debug(f"🔑 Found fallback API key for {framework} using {alt}")
                            return self.user_api_keys[alt]
            
            # Log available keys for debugging (without exposing values)
            available_keys = list(self.user_api_keys.keys())
            logger.warning(f"⚠️ No API key found for framework: {framework}, model: {model}")
            logger.debug(f"📋 Available API keys: {available_keys}")
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error getting API key for framework {framework}: {str(e)}")
            return None

    def enhance_node_config(self, node_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enhance node configuration with user API keys
        Enhanced with better error handling and logging
        """
        try:
            enhanced_config = node_config.copy()
            
            # DEBUG: Log the original configuration
            logger.info(f"🔧 ORIGINAL node config: {json.dumps(node_config, indent=2)}")
            
            # Extract framework and model information
            framework = enhanced_config.get("framework", "").lower()
            model = enhanced_config.get("model", "")
            
            # ALSO check frameworkConfig for LLM provider
            framework_config = enhanced_config.get("frameworkConfig", {})
            llm_provider = framework_config.get("provider", "").lower()
            llm_model = framework_config.get("model", "")
            
            # NEW: Check nested llm object for provider and model
            llm_config = enhanced_config.get("llm", {})
            if llm_config:
                llm_provider = llm_provider or llm_config.get("provider", "").lower()
                llm_model = llm_model or llm_config.get("model", "")
            
            # Determine which framework/provider needs API key
            # For agent frameworks like CrewAI, use the LLM provider, not the framework
            if framework in ["crewai", "langchain", "autogen", "llamaindex"] and llm_provider:
                target_framework = llm_provider
            else:
                target_framework = llm_provider if llm_provider else framework
                
            target_model = llm_model if llm_model else model
            
            logger.info(f"🔧 FRAMEWORK DETECTION: framework='{framework}', llm_provider='{llm_provider}', target_framework='{target_framework}'")
            
            if not target_framework:
                logger.debug("🔧 No framework or LLM provider specified in node config")
                return enhanced_config
            
            logger.debug(f"🔧 Looking for API key for framework: {target_framework}, model: {target_model}")
            
            # Get the appropriate API key
            api_key = self.get_api_key_for_framework(target_framework, target_model)
            
            logger.info(f"🔧 API KEY LOOKUP: target_framework='{target_framework}' -> api_key={'[FOUND]' if api_key else '[NOT FOUND]'}")
            
            if api_key:
                # CRITICAL FIX: Ensure frameworkConfig exists and inject API key there
                if "frameworkConfig" not in enhanced_config:
                    enhanced_config["frameworkConfig"] = {}
                
                # Build the frameworkConfig with all necessary info
                enhanced_config["frameworkConfig"].update({
                    "provider": target_framework,
                    "model": target_model,
                    "api_key": api_key,
                    "temperature": enhanced_config.get("temperature", 0.7),
                    "max_tokens": enhanced_config.get("max_tokens", 4000)
                })
                
                # ALSO inject API key into both top-level and frameworkConfig for compatibility
                if target_framework in ["openai", "azure_openai"]:
                    enhanced_config["api_key"] = api_key
                    enhanced_config["openai_api_key"] = api_key
                    enhanced_config["frameworkConfig"]["openai_api_key"] = api_key
                elif target_framework == "anthropic":
                    enhanced_config["api_key"] = api_key
                    enhanced_config["anthropic_api_key"] = api_key
                    enhanced_config["frameworkConfig"]["anthropic_api_key"] = api_key
                elif target_framework == "perplexity":
                    enhanced_config["api_key"] = api_key
                    enhanced_config["perplexity_api_key"] = api_key
                    enhanced_config["frameworkConfig"]["perplexity_api_key"] = api_key
                elif target_framework in ["google", "gemini"]:
                    enhanced_config["api_key"] = api_key
                    enhanced_config["google_api_key"] = api_key
                    enhanced_config["frameworkConfig"]["google_api_key"] = api_key
                elif target_framework == "cohere":
                    enhanced_config["api_key"] = api_key
                    enhanced_config["cohere_api_key"] = api_key
                    enhanced_config["frameworkConfig"]["cohere_api_key"] = api_key
                elif target_framework in ["huggingface", "hf"]:
                    enhanced_config["api_key"] = api_key
                    enhanced_config["huggingface_api_key"] = api_key
                    enhanced_config["frameworkConfig"]["huggingface_api_key"] = api_key
                elif target_framework == "openrouter":
                    enhanced_config["api_key"] = api_key
                    enhanced_config["openrouter_api_key"] = api_key
                    enhanced_config["frameworkConfig"]["openrouter_api_key"] = api_key
                elif target_framework == "groq":
                    enhanced_config["api_key"] = api_key
                    enhanced_config["groq_api_key"] = api_key
                    enhanced_config["frameworkConfig"]["groq_api_key"] = api_key
                elif target_framework == "together":
                    enhanced_config["api_key"] = api_key
                    enhanced_config["together_api_key"] = api_key
                    enhanced_config["frameworkConfig"]["together_api_key"] = api_key
                elif target_framework == "replicate":
                    enhanced_config["api_key"] = api_key
                    enhanced_config["replicate_api_key"] = api_key
                    enhanced_config["frameworkConfig"]["replicate_api_key"] = api_key
                elif target_framework == "mistral":
                    enhanced_config["api_key"] = api_key
                    enhanced_config["mistral_api_key"] = api_key
                    enhanced_config["frameworkConfig"]["mistral_api_key"] = api_key
                elif target_framework in ["xai", "grok"]:
                    enhanced_config["api_key"] = api_key
                    enhanced_config["xai_api_key"] = api_key
                    enhanced_config["frameworkConfig"]["xai_api_key"] = api_key
                else:
                    # Generic fallback
                    enhanced_config["api_key"] = api_key
                    enhanced_config["frameworkConfig"]["api_key"] = api_key
                
                logger.info(f"✅ Enhanced node config with {target_framework} API key")
                logger.info(f"🔧 ENHANCED config frameworkConfig: {enhanced_config.get('frameworkConfig', {})}")
            else:
                logger.warning(f"⚠️ No API key available for framework: {target_framework}, model: {target_model}")
                
                # Check if this is a critical failure
                provider = provider_registry.get_provider(target_framework)
                if provider and provider.requires_api_key:
                    logger.error(f"❌ Framework {target_framework} requires API key but none found")
            
            return enhanced_config
            
        except Exception as e:
            logger.error(f"❌ Error enhancing node config: {str(e)}")
            return node_config

    def get_context_info(self) -> Dict[str, Any]:
        """Get context information for debugging and monitoring"""
        return {
            "user_id": self.user_id,
            "workflow_id": self.workflow_id,
            "context_key": self.context_key,
            "execution_start_time": self.execution_start_time.isoformat(),
            "available_providers": list(self.user_api_keys.keys()),
            "total_api_keys": len(self.user_api_keys),
            "execution_duration_seconds": (datetime.now() - self.execution_start_time).total_seconds()
        }

    def get_execution_metadata(self) -> Dict[str, Any]:
        """Get execution metadata for workflow results"""
        return {
            "user_id": self.user_id,
            "workflow_id": self.workflow_id,
            "execution_start_time": self.execution_start_time.isoformat(),
            "available_providers": list(self.user_api_keys.keys()),
            "total_api_keys": len(self.user_api_keys),
            "execution_duration_seconds": (datetime.now() - self.execution_start_time).total_seconds(),
            "context_type": "supabase_byok"
        }

    def to_dict(self) -> Dict[str, Any]:
        """Convert context to dictionary format for compatibility with .get() calls"""
        return {
            "user_id": self.user_id,
            "workflow_id": self.workflow_id,
            "execution_id": f"exec_{int(self.execution_start_time.timestamp())}",
            "execution_timestamp": self.execution_start_time.isoformat(),
            "user_keys": self.user_api_keys,
            "context_key": self.context_key,
            "available_providers": list(self.user_api_keys.keys()),
            "total_api_keys": len(self.user_api_keys)
        }

    def get(self, key: str, default=None):
        """Dictionary-style get method for backward compatibility"""
        context_dict = self.to_dict()
        return context_dict.get(key, default)

    async def cleanup(self):
        """Cleanup resources and log execution summary"""
        try:
            execution_duration = (datetime.now() - self.execution_start_time).total_seconds()
            logger.info(f"🏁 Workflow execution completed for user {self.user_id} in {execution_duration:.2f}s")
            
            # Clear sensitive data
            self.user_api_keys.clear()
            
        except Exception as e:
            logger.error(f"❌ Error during context cleanup: {str(e)}")

# Global context factory function
async def create_execution_context(user_id: Optional[str] = None, workflow_id: Optional[str] = None) -> WorkflowExecutionContext:
    """
    Factory function to create and initialize a workflow execution context
    Enhanced with better error handling and logging
    """
    try:
        # Handle different user ID formats and defensive programming
        if user_id is None or user_id == "":
            user_id = "anonymous"
        elif isinstance(user_id, (int, float)):
            user_id = str(user_id)
        elif hasattr(user_id, 'user_id'):
            # If a WorkflowExecutionContext object is passed, extract the user_id
            user_id = str(user_id.user_id) if user_id.user_id else 'anonymous'
        elif not isinstance(user_id, str):
            # If it's some other object, convert to string and check if it looks valid
            user_id_str = str(user_id)
            if not ('<' in user_id_str and '>' in user_id_str):
                user_id = user_id_str
            else:
                logger.warning(f"Invalid user_id object passed: {type(user_id)}, using 'anonymous'")
                user_id = 'anonymous'
        
        logger.info(f"🏭 Creating execution context for user: {user_id}")
        
        context = WorkflowExecutionContext(user_id=user_id, workflow_id=workflow_id)
        await context.initialize()
        
        logger.info(f"✅ Execution context created successfully for user: {user_id}")
        return context
        
    except Exception as e:
        logger.error(f"❌ Failed to create execution context for user {user_id}: {str(e)}")
        # Return a basic context that won't break the workflow
        context = WorkflowExecutionContext(user_id="anonymous", workflow_id=workflow_id)
        return context 