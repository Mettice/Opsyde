# services/workflow_service.py
from typing import List, Dict, Any, Optional, Type
import logging
from uuid import uuid4
from datetime import datetime

from backend.models.workflow import Workflow
from backend.repositories.workflow_repository import WorkflowRepository
from backend.core.engine import WorkflowEngine
from backend.core.di import injector

logger = logging.getLogger(__name__)

class WorkflowService:
    """
    Service for workflow operations
    """
    
    def __init__(self, repository: WorkflowRepository = None, engine: WorkflowEngine = None):
        self.repository = repository or injector.get(WorkflowRepository)
        self.engine = engine or injector.get(WorkflowEngine)
        
    async def get_workflow(self, workflow_id: str) -> Optional[Workflow]:
        """Get a workflow by ID"""
        return await self.repository.get_by_id(workflow_id)
        
    async def get_all_workflows(self) -> List[Workflow]:
        """Get all workflows"""
        return await self.repository.get_all()
        
    async def create_workflow(self, workflow_data: Dict[str, Any]) -> Workflow:
        """Create a new workflow"""
        # Generate ID if not provided
        if "id" not in workflow_data:
            workflow_data["id"] = str(uuid4())
            
        # Add creation timestamp
        workflow_data["created_at"] = datetime.now().isoformat()
        
        # Create workflow model
        workflow = Workflow(**workflow_data)
        
        # Save to repository
        saved_workflow = await self.repository.create(workflow)
        
        logger.info(f"Created workflow {saved_workflow.id}")
        return saved_workflow
        
    async def update_workflow(self, workflow_id: str, workflow_data: Dict[str, Any]) -> Optional[Workflow]:
        """Update a workflow"""
        # Add update timestamp
        workflow_data["updated_at"] = datetime.now().isoformat()
        
        # Update in repository
        updated = await self.repository.update(workflow_id, workflow_data)
        
        if updated:
            logger.info(f"Updated workflow {workflow_id}")
            
        return updated
        
    async def delete_workflow(self, workflow_id: str) -> bool:
        """Delete a workflow"""
        result = await self.repository.delete(workflow_id)
        
        if result:
            logger.info(f"Deleted workflow {workflow_id}")
            
        return result
        
    async def execute_workflow(self, workflow_id: str, inputs: Dict[str, Any] = None):
        """Execute a workflow by ID"""
        # Get workflow
        workflow = await self.repository.get_by_id(workflow_id)
        
        if not workflow:
            raise ValueError(f"Workflow not found: {workflow_id}")
            
        # Execute workflow
        return self.engine.execute_workflow(workflow, inputs or {})
        
    async def validate_workflow(self, workflow: Workflow) -> Dict[str, Any]:
        """Validate a workflow configuration"""
        issues = []
        
        # Check for empty nodes
        if not workflow.nodes:
            issues.append("Workflow has no nodes")
            
        # Check for disconnected nodes
        if workflow.nodes and workflow.edges:
            # Find nodes with no connections
            node_ids = {node.id for node in workflow.nodes}
            connected_nodes = set()
            
            for edge in workflow.edges:
                connected_nodes.add(edge.source)
                connected_nodes.add(edge.target)
                
            disconnected = node_ids - connected_nodes
            
            if disconnected:
                issues.append(f"Disconnected nodes: {', '.join(disconnected)}")
                
        # Check for cycles
        try:
            from core.graph import determine_execution_order
            determine_execution_order(workflow.nodes, workflow.edges)
        except ValueError as e:
            issues.append(f"Invalid workflow structure: {str(e)}")
            
        return {
            "valid": len(issues) == 0,
            "issues": issues
        }

    async def get_workflows_by_owner(self, owner_id: str) -> List[Workflow]:
        """Get all workflows for a specific owner"""
        return await self.repository.get_by_owner(owner_id)

# Register the service
workflow_service = WorkflowService()
injector.register_instance(WorkflowService, workflow_service)