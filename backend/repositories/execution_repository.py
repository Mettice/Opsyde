# repositories/execution_repository.py
from typing import Dict, Any, List, Optional
from datetime import datetime

class ExecutionRepository:
    """Repository for workflow execution data"""
    
    async def save_execution(self, workflow_id: str, metadata: Dict[str, Any]) -> str:
        """Save a new execution record"""
        pass
        
    async def save_node_result(self, execution_id: str, node_id: str, result: Dict[str, Any]) -> None:
        """Save a node execution result"""
        pass
        
    async def get_execution(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """Get execution details by ID"""
        pass
        
    async def get_node_results(self, execution_id: str) -> List[Dict[str, Any]]:
        """Get all node results for an execution"""
        pass