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
from framework_registry import framework_registry

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
        self.node_errors = {}  # Track errors per node
        self.execution_log = []  # Track execution flow
        self.start_time = datetime.now()
        self.end_time = None
        self.status = "pending"
        self.results = {}
        self.metadata = {}
        
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

    def get_api_keys_for_user(self) -> Dict[str, str]:
        """Get all API keys for the current user."""
        try:
            # Return all API keys stored in context
            return self.user_api_keys if hasattr(self, 'user_api_keys') else {}
        except Exception as e:
            logger.error(f"Error getting API keys: {str(e)}")
            return {}

    def get_api_key_for_framework(self, framework: str, model: Optional[str] = None) -> Optional[str]:
        """Get API key for a specific framework/provider."""
        try:
            # Map framework to provider if needed
            provider = self._map_framework_to_provider(framework, model)
            
            # Get from api_keys dict
            if hasattr(self, 'user_api_keys') and provider in self.user_api_keys:
                return self.user_api_keys.get(provider)
                
            return None
        except Exception as e:
            logger.error(f"Error getting API key for {framework}: {str(e)}")
            return None
            
    def _map_framework_to_provider(self, framework: str, model: Optional[str] = None) -> str:
        """Map framework name to provider name."""
        framework = framework.lower()
        
        # Direct mappings
        if framework in ['openai', 'anthropic', 'cohere', 'perplexity', 'google']:
            return framework
            
        # Framework-specific mappings
        framework_provider_map = {
            'crewai': 'openai',
            'langchain': 'openai',
            'autogen': 'openai',
            'llamaindex': 'openai',
            'huggingface': 'huggingface'
        }
        
        # Check model name for provider hints
        if model:
            model = model.lower()
            if 'gpt' in model or 'text-davinci' in model:
                return 'openai'
            elif 'claude' in model:
                return 'anthropic'
            elif 'command' in model:
                return 'cohere'
            elif 'palm' in model or 'gemini' in model:
                return 'google'
                
        return framework_provider_map.get(framework, framework)

    def enhance_node_config(self, node_config: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance node configuration with API keys and other context"""
        try:
            # Create a copy to avoid modifying the original
            enhanced_config = node_config.copy()
            
            # Get framework and provider info
            framework = enhanced_config.get("framework", "").lower()
            llm_provider = enhanced_config.get("llmConfig", {}).get("provider", "").lower()
            
            # Skip enhancement for structural nodes
            if framework in ["trigger", "input", "output", "logic", "delay"]:
                return enhanced_config
                
            # Skip validation if framework or LLM provider is not specified
            if not framework or not llm_provider:
                logger.debug(f"Skipping framework validation for node with framework='{framework}' and llm_provider='{llm_provider}'")
                return enhanced_config
                
            # Get API keys from context
            api_keys = {}
            if self.user_id:
                # Get user's API keys from your storage
                user_keys = self.get_api_keys_for_user()
                api_keys = {k: v for k, v in user_keys.items() if v}  # Only include non-empty keys
            
            # Validate framework-LLM combination with BYOK support
            validation_context = {"api_keys": api_keys}
            validation_result = framework_registry.validate_framework_llm_combination(
                framework, 
                llm_provider,
                context=validation_context
            )
            
            if not validation_result["valid"]:
                logger.warning(f"Framework validation failed: {validation_result['error']}")
                # Don't return early - continue with the config as-is
                # The node processor will handle the validation failure gracefully
            
            # If we have an API key for the provider, add it to the config
            if llm_provider and llm_provider in api_keys:
                if "llmConfig" not in enhanced_config:
                    enhanced_config["llmConfig"] = {}
                enhanced_config["llmConfig"]["api_key"] = api_keys[llm_provider]
                logger.info(f"✅ Enhanced node config with {llm_provider} API key")
            
            return enhanced_config
            
        except Exception as e:
            logger.error(f"Error enhancing node config: {str(e)}")
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
        """Convert context to dictionary format with LLM context auto-injection"""
        return {
            "user_id": self.user_id,
            "workflow_id": self.workflow_id,
            "user_api_keys": self.user_api_keys,
            "context_key": self.context_key,
            "execution_start_time": self.execution_start_time.isoformat(),
            # Auto-inject LLM context for all nodes
            "llm_mode_enabled": True,  # Default to True for LLM-centric architecture
            "smart_mapping_enabled": True,  # Default to True for smart mapping
            "user_keys": self.user_api_keys,  # Alias for easier access
            "execution_metadata": self.get_execution_metadata(),
            "node_errors": self.node_errors,
            "execution_log": self.execution_log,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "status": self.status,
            "results": self.results,
            "metadata": self.metadata
        }

    def build_node_context(self, node: Dict[str, Any], parent_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Build context for a specific node with auto-injected LLM settings"""
        base_context = self.to_dict()
        
        # Merge with parent context if provided
        if parent_context:
            base_context.update(parent_context)
        
        # Add node-specific context
        node_context = {
            **base_context,
            "node_id": node.get("id"),
            "node_type": node.get("type"),
            "node_data": node.get("data", {}),
            # Ensure LLM context is always available
            "llm_mode_enabled": parent_context.get("llm_mode_enabled", True) if parent_context else True,
            "smart_mapping_enabled": parent_context.get("smart_mapping_enabled", True) if parent_context else True,
            "user_keys": self.user_api_keys,
        }
        
        return node_context

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

    def log_error(self, node_id: str, message: str, error_type: str = "execution_error", details: dict = None):
        """Log an error for a specific node with metadata"""
        if node_id not in self.node_errors:
            self.node_errors[node_id] = []
            
        error_entry = {
            "timestamp": datetime.now().isoformat(),
            "message": message,
            "type": error_type,
            "details": details or {}
        }
        
        self.node_errors[node_id].append(error_entry)
        self.execution_log.append({
            "type": "error",
            "node_id": node_id,
            "data": error_entry
        })
        
        # Update node status in results if it exists
        if node_id in self.results:
            self.results[node_id]["status"] = "error"
            self.results[node_id]["error"] = error_entry

    def get_node_errors(self, node_id: str) -> List[dict]:
        """Get all errors for a specific node"""
        return self.node_errors.get(node_id, [])

    def has_node_errors(self, node_id: str) -> bool:
        """Check if a node has any errors"""
        return node_id in self.node_errors and len(self.node_errors[node_id]) > 0

    def get_error_summary(self) -> dict:
        """Get a summary of all errors in the workflow"""
        return {
            "total_errors": sum(len(errors) for errors in self.node_errors.values()),
            "nodes_with_errors": list(self.node_errors.keys()),
            "error_details": self.node_errors
        }

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