from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import asyncio
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class BaseFrameworkRunner(ABC):
    """Base class for all framework runners"""
    
    def __init__(self, name: str):
        self.name = name
        self._initialized = False
        self._metrics = {
            "executions": 0,
            "successes": 0,
            "failures": 0,
            "total_time": 0,
            "avg_time": 0
        }
    
    @abstractmethod
    async def initialize(self, config: Dict[str, Any]) -> None:
        """Initialize the framework with configuration"""
        pass
    
    @abstractmethod
    async def execute(self, inputs: Any, config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute the framework with inputs"""
        pass
    
    @abstractmethod
    async def cleanup(self) -> None:
        """Cleanup framework resources"""
        pass
    
    async def run(self, config: Dict[str, Any], inputs: Any) -> Dict[str, Any]:
        """Run the framework with proper initialization and cleanup"""
        start_time = datetime.now()
        
        try:
            # Initialize if needed
            if not self._initialized:
                await self.initialize(config)
                self._initialized = True
            
            # Execute framework
            result = await self.execute(inputs, config)
            
            # Update metrics
            execution_time = (datetime.now() - start_time).total_seconds()
            self._update_metrics(execution_time, True)
            
            return {
                "success": True,
                "result": result,
                "execution_time": execution_time,
                "framework": self.name,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            self._update_metrics(execution_time, False)
            
            logger.error(f"Framework {self.name} execution failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "error_type": type(e).__name__,
                "execution_time": execution_time,
                "framework": self.name,
                "timestamp": datetime.now().isoformat()
            }
    
    def _update_metrics(self, execution_time: float, success: bool) -> None:
        """Update execution metrics"""
        self._metrics["executions"] += 1
        self._metrics["total_time"] += execution_time
        self._metrics["avg_time"] = self._metrics["total_time"] / self._metrics["executions"]
        
        if success:
            self._metrics["successes"] += 1
        else:
            self._metrics["failures"] += 1
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get execution metrics"""
        return self._metrics.copy()
    
    def validate_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate framework configuration"""
        return {
            "valid": True,
            "errors": []
        }
    
    def validate_inputs(self, inputs: Any) -> Dict[str, Any]:
        """Validate framework inputs"""
        return {
            "valid": True,
            "errors": []
        }
    
    def get_capabilities(self) -> Dict[str, Any]:
        """Get framework capabilities"""
        return {
            "name": self.name,
            "capabilities": [],
            "required_fields": [],
            "optional_fields": []
        } 