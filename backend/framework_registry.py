import logging
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

# Framework metadata with proper separation between LLMs and frameworks
FRAMEWORK_METADATA = {
    "crewai": {
        "type": "framework",
        "requires_llm": True,
        "supports_tools": True,
        "supports_memory": True,
        "supports_multi_agent": True,
        "agent_fields": {
            "required": ["role", "goal", "backstory"],
            "optional": ["allowDelegation", "verbose", "maxIterations"]
        },
        "task_fields": {
            "required": ["description", "expectedOutput"],
            "optional": ["context", "outputFile"]
        },
        "supported_llms": ["openai", "anthropic", "openrouter", "gemini"]
    },
    "langchain": {
        "type": "framework", 
        "requires_llm": True,
        "supports_tools": True,
        "supports_memory": True,
        "supports_multi_agent": False,
        "agent_fields": {
            "required": ["systemMessage", "chainType"],
            "optional": ["tools", "memoryType", "outputParser"]
        },
        "task_fields": {
            "required": ["prompt"],
            "optional": ["inputVariables", "examples"]
        },
        "supported_llms": ["openai", "anthropic", "openrouter", "huggingface"]
    },
    "autogen": {
        "type": "framework",
        "requires_llm": True,
        "supports_tools": True,
        "supports_memory": True,
        "supports_multi_agent": True,
        "agent_fields": {
            "required": ["systemMessage", "agentType"],
            "optional": ["humanInputMode", "maxConsecutiveAutoReply", "codeExecution"]
        },
        "task_fields": {
            "required": ["message"],
            "optional": ["maxRounds", "summary"]
        },
        "supported_llms": ["openai", "anthropic", "openrouter"]
    },
    "llamaindex": {
        "type": "framework",
        "requires_llm": True,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "agent_fields": {
            "required": ["indexType", "documentsSource"],
            "optional": ["chunkSize", "chunkOverlap", "embeddingModel"]
        },
        "task_fields": {
            "required": ["query", "queryMode"],
            "optional": ["similarityTopK", "responseMode"]
        },
        "supported_llms": ["openai", "anthropic", "openrouter", "huggingface"]
    },
    "huggingface": {
        "type": "framework",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "agent_fields": {
            "required": ["modelName", "taskType"],
            "optional": ["maxLength", "temperature", "doSample"]
        },
        "task_fields": {
            "required": ["input"],
            "optional": ["context", "question"]
        },
        "supported_llms": []  # Uses HuggingFace models directly
    }
}

# LLM provider metadata (separate from frameworks)
LLM_METADATA = {
    "openai": {
        "type": "llm_provider",
        "api_key_required": True,
        "models": [
            {"id": "gpt-4", "name": "GPT-4", "context": 8192, "cost_tier": "high"},
            {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "context": 128000, "cost_tier": "high"},
            {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "context": 4096, "cost_tier": "medium"}
        ],
        "parameters": {
            "temperature": {"min": 0, "max": 2, "default": 0.7},
            "max_tokens": {"min": 1, "max": 4096, "default": 1000},
            "top_p": {"min": 0, "max": 1, "default": 1},
            "frequency_penalty": {"min": -2, "max": 2, "default": 0},
            "presence_penalty": {"min": -2, "max": 2, "default": 0}
        }
    },
    "anthropic": {
        "type": "llm_provider",
        "api_key_required": True,
        "models": [
            {"id": "claude-3-opus", "name": "Claude 3 Opus", "context": 200000, "cost_tier": "high"},
            {"id": "claude-3-sonnet", "name": "Claude 3 Sonnet", "context": 200000, "cost_tier": "medium"},
            {"id": "claude-3-haiku", "name": "Claude 3 Haiku", "context": 200000, "cost_tier": "low"}
        ],
        "parameters": {
            "temperature": {"min": 0, "max": 1, "default": 0.7},
            "max_tokens": {"min": 1, "max": 4096, "default": 1000},
            "top_p": {"min": 0, "max": 1, "default": 1}
        }
    },
    "openrouter": {
        "type": "llm_provider",
        "api_key_required": True,
        "models": [
            {"id": "openai/gpt-4", "name": "GPT-4 (via OpenRouter)", "context": 8192, "cost_tier": "high"},
            {"id": "anthropic/claude-3-opus", "name": "Claude 3 Opus (via OpenRouter)", "context": 200000, "cost_tier": "high"},
            {"id": "meta-llama/llama-2-70b-chat", "name": "Llama 2 70B", "context": 4096, "cost_tier": "medium"}
        ],
        "parameters": {
            "temperature": {"min": 0, "max": 2, "default": 0.7},
            "max_tokens": {"min": 1, "max": 4096, "default": 1000},
            "top_p": {"min": 0, "max": 1, "default": 1}
        }
    },
    "gemini": {
        "type": "llm_provider", 
        "api_key_required": True,
        "models": [
            {"id": "gemini-pro", "name": "Gemini Pro", "context": 32768, "cost_tier": "medium"},
            {"id": "gemini-pro-vision", "name": "Gemini Pro Vision", "context": 16384, "cost_tier": "high"}
        ],
        "parameters": {
            "temperature": {"min": 0, "max": 1, "default": 0.7},
            "max_tokens": {"min": 1, "max": 2048, "default": 1000},
            "top_p": {"min": 0, "max": 1, "default": 1}
        }
    },
    "huggingface": {
        "type": "llm_provider",
        "api_key_required": True,
        "models": [
            {"id": "microsoft/DialoGPT-medium", "name": "DialoGPT Medium", "context": 1024, "cost_tier": "low"},
            {"id": "microsoft/phi-2", "name": "Phi-2", "context": 2048, "cost_tier": "low"},
            {"id": "mistralai/Mistral-7B-Instruct-v0.2", "name": "Mistral 7B", "context": 8192, "cost_tier": "low"}
        ],
        "parameters": {
            "temperature": {"min": 0, "max": 2, "default": 0.7},
            "max_length": {"min": 1, "max": 2048, "default": 512},
            "do_sample": {"type": "boolean", "default": True}
        }
    }
}

def get_framework_requirements(framework: str) -> Dict[str, Any]:
    """Get framework requirements and metadata"""
    return FRAMEWORK_METADATA.get(framework.lower(), {})

def get_llm_requirements(provider: str) -> Dict[str, Any]:
    """Get LLM provider requirements and metadata"""
    return LLM_METADATA.get(provider.lower(), {})

def get_available_frameworks() -> List[str]:
    """Get list of available frameworks"""
    return list(FRAMEWORK_METADATA.keys())

def get_available_llm_providers() -> List[str]:
    """Get list of available LLM providers"""
    return list(LLM_METADATA.keys())

def validate_framework_llm_combination(framework: str, llm_provider: str) -> Dict[str, Any]:
    """Validate if framework supports the LLM provider"""
    framework_meta = get_framework_requirements(framework)
    
    if not framework_meta:
        return {"valid": False, "error": f"Unknown framework: {framework}"}
    
    # Check if framework requires LLM
    if framework_meta.get("requires_llm", False):
        if not llm_provider:
            return {"valid": False, "error": f"Framework {framework} requires an LLM provider"}
        
        supported_llms = framework_meta.get("supported_llms", [])
        if supported_llms and llm_provider not in supported_llms:
            return {
                "valid": False, 
                "error": f"Framework {framework} doesn't support {llm_provider}. Supported: {supported_llms}"
            }
    
    return {"valid": True}

class EnhancedFrameworkRegistry:
    """Enhanced framework registry with LLM/Framework separation"""
    
    def __init__(self):
        self._frameworks = {}
        self._metrics = {}
        self.register_all_frameworks()
    
    def register_all_frameworks(self):
        """Register all available frameworks"""
        try:
            from backend.frameworks.crewai_runner import run_crewai_tool
            self.register("crewai", run_crewai_tool)
        except ImportError:
            logger.warning("CrewAI runner not available")
        
        try:
            from backend.frameworks.langchain_runner import run_langchain_tool
            self.register("langchain", run_langchain_tool)
        except ImportError:
            logger.warning("LangChain runner not available")
        
        try:
            from backend.frameworks.autogen_runner import run_autogen_tool
            self.register("autogen", run_autogen_tool)
        except ImportError:
            logger.warning("AutoGen runner not available")
        
        try:
            from backend.frameworks.llamaindex_runner import run_llamaindex_tool
            self.register("llamaindex", run_llamaindex_tool)
        except ImportError:
            logger.warning("LlamaIndex runner not available")
        
        try:
            from backend.frameworks.huggingface_runner import run_huggingface_tool
            self.register("huggingface", run_huggingface_tool)
        except ImportError:
            logger.warning("HuggingFace runner not available")
    
    def register(self, name: str, runner_func: Callable):
        """Register a framework runner"""
        self._frameworks[name] = runner_func
        self._metrics[name] = {
            "total_executions": 0,
            "total_errors": 0,
            "avg_execution_time": 0.0
        }
        logger.info(f"Registered framework: {name}")
    
    async def execute_framework(
        self, 
        framework: str, 
        config: Dict[str, Any], 
        input_data: Any,
        timeout: Optional[int] = 300
    ) -> Dict[str, Any]:
        """Execute framework with enhanced error handling and metrics"""
        
        # Validate framework exists
        if framework not in self._frameworks:
            available = ", ".join(self.get_available_frameworks())
            return {
                "success": False,
                "error": f"Unsupported framework: {framework}. Available: {available}",
                "framework_used": framework
            }
        
        # Validate framework/LLM combination
        llm_config = config.get('llm', {})
        llm_provider = llm_config.get('provider')
        
        validation = validate_framework_llm_combination(framework, llm_provider)
        if not validation["valid"]:
            return {
                "success": False,
                "error": validation["error"],
                "framework_used": framework
            }
        
        runner_func = self._frameworks[framework]
        start_time = datetime.now()
        
        try:
            # Execute with timeout if it's an async function
            if asyncio.iscoroutinefunction(runner_func):
                if timeout:
                    result = await asyncio.wait_for(
                        runner_func(config=config, inputs=input_data),
                        timeout=timeout
                    )
                else:
                    result = await runner_func(config=config, inputs=input_data)
            else:
                # Sync function
                result = runner_func(config=config, inputs=input_data)
            
            # Update metrics
            execution_time = (datetime.now() - start_time).total_seconds()
            self._update_metrics(framework, execution_time, success=True)
            
            # Ensure result is properly formatted
            if not isinstance(result, dict):
                result = {"result": result}
            
            result.update({
                "framework_used": framework,
                "execution_time": execution_time,
                "success": True
            })
            
            return result
            
        except asyncio.TimeoutError:
            self._update_metrics(framework, 0, success=False)
            return {
                "success": False,
                "error": f"Framework {framework} execution timed out after {timeout}s",
                "framework_used": framework
            }
            
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            self._update_metrics(framework, execution_time, success=False)
            
            logger.error(f"Framework {framework} execution failed: {str(e)}")
            
            return {
                "framework_used": framework,
                "execution_time": execution_time,
                "success": False,
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    def get_available_frameworks(self) -> List[str]:
        """Get list of available frameworks"""
        return list(self._frameworks.keys())
    
    def get_framework_metrics(self, framework: str) -> Dict[str, Any]:
        """Get execution metrics for a framework"""
        return self._metrics.get(framework, {})
    
    def _update_metrics(self, framework: str, execution_time: float, success: bool):
        """Update execution metrics for a framework"""
        metrics = self._metrics[framework]
        metrics["total_executions"] += 1
        
        if not success:
            metrics["total_errors"] += 1
        
        # Update average execution time
        total_time = metrics["avg_execution_time"] * (metrics["total_executions"] - 1)
        metrics["avg_execution_time"] = (total_time + execution_time) / metrics["total_executions"]

# Global registry instance
framework_registry = EnhancedFrameworkRegistry()

# FastAPI routes for frontend integration
def create_framework_routes():
    """Create FastAPI routes for framework metadata"""
    from fastapi import APIRouter
    
    router = APIRouter(prefix="/frameworks", tags=["frameworks"])
    
    @router.get("/metadata/{name}")
    def get_framework_metadata(name: str):
        """Get framework metadata"""
        return get_framework_requirements(name)
    
    @router.get("/llm-providers/{name}")
    def get_llm_metadata(name: str):
        """Get LLM provider metadata"""
        return get_llm_requirements(name)
    
    @router.get("/available")
    def get_available_frameworks_api():
        """Get list of available frameworks"""
        return {
            "frameworks": get_available_frameworks(),
            "llm_providers": get_available_llm_providers()
        }
    
    @router.post("/validate")
    def validate_configuration(config: Dict[str, Any]):
        """Validate framework and LLM configuration"""
        framework = config.get("framework")
        llm_provider = config.get("llm", {}).get("provider")
        
        return validate_framework_llm_combination(framework, llm_provider)
    
    return router

# Backward compatibility function
def run_framework_tool(framework: str, config: dict, input_data: dict):
    """
    Backward compatible synchronous wrapper
    """
    try:
        if asyncio.iscoroutinefunction(framework_registry._frameworks.get(framework)):
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(
                        asyncio.run, 
                        framework_registry.execute_framework(framework, config, input_data)
                    )
                    return future.result()
            else:
                return asyncio.run(
                    framework_registry.execute_framework(framework, config, input_data)
                )
        else:
            return asyncio.run(
                framework_registry.execute_framework(framework, config, input_data)
            )
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "framework_used": framework
        }