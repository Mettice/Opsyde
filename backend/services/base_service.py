# services/base_service.py
from typing import Generic, TypeVar, Type, List, Dict, Any, Optional
from abc import ABC, abstractmethod
import logging

T = TypeVar('T')

class BaseService(Generic[T], ABC):
    """
    Base service interface for domain operations
    """
    
    @abstractmethod
    async def get_by_id(self, id: str) -> Optional[T]:
        """Get an entity by ID"""
        pass
        
    @abstractmethod
    async def get_all(self) -> List[T]:
        """Get all entities"""
        pass
        
    @abstractmethod
    async def create(self, entity: T) -> T:
        """Create a new entity"""
        pass
        
    @abstractmethod
    async def update(self, id: str, data: Dict[str, Any]) -> Optional[T]:
        """Update an entity"""
        pass
        
    @abstractmethod
    async def delete(self, id: str) -> bool:
        """Delete an entity"""
        pass