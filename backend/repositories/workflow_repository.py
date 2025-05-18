# repositories/workflow_repository.py
from typing import List, Dict, Any, Optional, Protocol
import json
import os
import logging
from datetime import datetime

from backend.models.workflow import Workflow
from backend.repositories.base_repository import BaseRepository
from backend.core.di import injector

logger = logging.getLogger(__name__)

class WorkflowRepository(Protocol):
    """Protocol for workflow repositories"""
    async def get_by_id(self, id: str) -> Optional[Workflow]: ...
    async def get_all(self) -> List[Workflow]: ...
    async def get_by_owner(self, owner_id: str) -> List[Workflow]: ...
    async def create(self, entity: Workflow) -> Workflow: ...
    async def update(self, id: str, data: Dict[str, Any]) -> Optional[Workflow]: ...
    async def delete(self, id: str) -> bool: ...
    async def count(self) -> int: ...

class FileWorkflowRepository(BaseRepository[Workflow]):
    """
    File-based workflow repository
    """
    
    def __init__(self, storage_dir: str = "data/workflows"):
        self.storage_dir = storage_dir
        os.makedirs(storage_dir, exist_ok=True)
        
    async def get_by_id(self, id: str) -> Optional[Workflow]:
        """Get a workflow by ID"""
        file_path = self._get_file_path(id)
        
        if not os.path.exists(file_path):
            return None
            
        try:
            with open(file_path, "r") as f:
                data = json.load(f)
                return Workflow(**data)
        except Exception as e:
            logger.error(f"Error loading workflow {id}: {str(e)}")
            return None
            
    async def get_all(self) -> List[Workflow]:
        """Get all workflows"""
        workflows = []
        
        # Ensure storage directory exists
        os.makedirs(self.storage_dir, exist_ok=True)
        
        try:
            for filename in os.listdir(self.storage_dir):
                if not filename.endswith('.json'):
                    continue
                    
                file_path = os.path.join(self.storage_dir, filename)
                with open(file_path, "r") as f:
                    data = json.load(f)
                    workflows.append(Workflow(**data))
                    
            logger.info(f"Retrieved {len(workflows)} workflows")
            return workflows
        except Exception as e:
            logger.error(f"Error getting all workflows: {str(e)}")
            return []
        
    async def create(self, entity: Workflow) -> Workflow:
        """Create a new workflow"""
        file_path = self._get_file_path(entity.id)
        
        # Add timestamps
        if not hasattr(entity, "created_at"):
            entity.created_at = datetime.now().isoformat()
            
        entity.updated_at = datetime.now().isoformat()
        
        # Save to file
        with open(file_path, "w") as f:
            json.dump(entity.dict(), f, indent=2)
            
        return entity
        
    async def update(self, id: str, data: Dict[str, Any]) -> Optional[Workflow]:
        """Update a workflow"""
        workflow = await self.get_by_id(id)
        
        if not workflow:
            return None
            
        # Update fields
        for key, value in data.items():
            setattr(workflow, key, value)
            
        # Add updated timestamp
        workflow.updated_at = datetime.now().isoformat()
        
        # Save to file
        file_path = self._get_file_path(id)
        with open(file_path, "w") as f:
            json.dump(workflow.dict(), f, indent=2)
            
        return workflow
        
    async def delete(self, id: str) -> bool:
        """Delete a workflow"""
        file_path = self._get_file_path(id)
        
        if not os.path.exists(file_path):
            return False
            
        try:
            os.remove(file_path)
            return True
        except Exception as e:
            logger.error(f"Error deleting workflow {id}: {str(e)}")
            return False
            
    async def count(self) -> int:
        """Count all workflows"""
        count = 0
        
        for filename in os.listdir(self.storage_dir):
            if filename.endswith(".json"):
                count += 1
                
        return count
        
    def _get_file_path(self, id: str) -> str:
        """Get the file path for a workflow ID"""
        return os.path.join(self.storage_dir, f"{id}.json")

    async def get_by_owner(self, owner_id: str) -> List[Workflow]:
        """Get all workflows for a specific owner"""
        workflows = []
        
        # Ensure storage directory exists
        os.makedirs(self.storage_dir, exist_ok=True)
        
        try:
            for filename in os.listdir(self.storage_dir):
                if not filename.endswith('.json'):
                    continue
                    
                file_path = os.path.join(self.storage_dir, filename)
                with open(file_path, "r") as f:
                    data = json.load(f)
                    if data.get('owner_id') == owner_id:
                        workflows.append(Workflow(**data))
                        
            logger.info(f"Retrieved {len(workflows)} workflows for owner {owner_id}")
            return workflows
        except Exception as e:
            logger.error(f"Error getting workflows for owner {owner_id}: {str(e)}")
            return []

# Register the repository implementation
file_workflow_repo = FileWorkflowRepository()
injector.register_instance(WorkflowRepository, file_workflow_repo)