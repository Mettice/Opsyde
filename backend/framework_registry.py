# framework_registry.py - Enhanced Version
import logging
from typing import Dict, Any, Callable, Optional
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

class FrameworkRegistry:
    """Enhanced framework registry with error handling and metrics"""
    
    def __init__(self):
        self._frameworks = {}
        self._metrics = {}
        
    def register(self, name: str, runner_func: Callable):
        """Register a framework runner"""
        self._frameworks[name] = runner_func
        self._metrics[name] = {
            "total_executions": 0,
            "total_errors": 0,
            "avg_execution_time": 0.0
        }
        logger.info(f"Registered framework: {name}")
    
    def get_available_frameworks(self) -> list:
        """Get list of available frameworks"""
        return list(self._frameworks.keys())
    
    def get_framework_metrics(self, framework: str) -> Dict[str, Any]:
        """Get execution metrics for a framework"""
        return self._metrics.get(framework, {})
    
    async def execute_framework(
        self, 
        framework: str, 
        config: Dict[str, Any], 
        input_data: Any,
        timeout: Optional[int] = 300
    ) -> Dict[str, Any]:
        """Execute framework with enhanced error handling and metrics"""
        
        if framework not in self._frameworks:
            available = ", ".join(self.get_available_frameworks())
            raise ValueError(f"Unsupported framework: {framework}. Available: {available}")
        
        runner_func = self._frameworks[framework]
        start_time = datetime.now()
        
        try:
            # Execute with timeout if it's an async function
            if asyncio.iscoroutinefunction(runner_func):
                if timeout:
                    result = await asyncio.wait_for(
                        runner_func(config=config, input_data=input_data),
                        timeout=timeout
                    )
                else:
                    result = await runner_func(config=config, input_data=input_data)
            else:
                # Sync function
                result = runner_func(config=config, input_data=input_data)
            
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
            raise TimeoutError(f"Framework {framework} execution timed out after {timeout}s")
            
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
    
    def _update_metrics(self, framework: str, execution_time: float, success: bool):
        """Update execution metrics for a framework"""
        metrics = self._metrics[framework]
        metrics["total_executions"] += 1
        
        if not success:
            metrics["total_errors"] += 1
        
        # Update average execution time
        total_time = metrics["avg_execution_time"] * (metrics["total_executions"] - 1)
        metrics["avg_execution_time"] = (total_time + execution_time) / metrics["total_executions"]


# Create global registry instance
framework_registry = FrameworkRegistry()

# Register frameworks
def register_frameworks():
    """Register all available frameworks"""
    try:
        from .frameworks.crewai_runner import run_crewai_tool
        framework_registry.register("crewai", run_crewai_tool)
    except ImportError:
        logger.warning("CrewAI runner not available")
    
    try:
        from .frameworks.autogen_runner import run_autogen_tool
        framework_registry.register("autogen", run_autogen_tool)
    except ImportError:
        logger.warning("AutoGen runner not available")
    
    try:
        from .frameworks.langchain_runner import run_langchain_tool
        framework_registry.register("langchain", run_langchain_tool)
    except ImportError:
        logger.warning("LangChain runner not available")
    
    try:
        from .frameworks.huggingface_runner import run_huggingface_tool
        framework_registry.register("huggingface", run_huggingface_tool)
    except ImportError:
        logger.warning("HuggingFace runner not available")
    
    try:
        from .frameworks.openrouter_runner import run_openrouter_tool
        framework_registry.register("openrouter", run_openrouter_tool)
    except ImportError:
        logger.warning("OpenRouter runner not available")
    
    try:
        from .frameworks.llamaindex_runner import run_llamaindex_tool
        framework_registry.register("llamaindex", run_llamaindex_tool)
    except ImportError:
        logger.warning("LlamaIndex runner not available")

# Initialize frameworks on import
register_frameworks()

# Backward compatibility function
def run_framework_tool(framework: str, config: dict, input_data: dict):
    """
    Backward compatible synchronous wrapper
    
    Args:
        framework (str): Framework name e.g. 'crewai'
        config (dict): Node config (LLM, prompt, etc)
        input_data (dict): Data passed to the tool

    Returns:
        dict: Execution result from the framework runner
    """
    try:
        # For sync compatibility, we'll run async frameworks in a loop
        if asyncio.iscoroutinefunction(framework_registry._frameworks.get(framework)):
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If we're already in an async context, this is tricky
                # You might want to handle this differently based on your setup
                logger.warning(f"Running async framework {framework} in sync context")
                # Create a new thread with its own event loop
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
            # Sync function
            return asyncio.run(
                framework_registry.execute_framework(framework, config, input_data)
            )
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "framework_used": framework
        }