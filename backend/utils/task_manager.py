# utils/task_manager.py
import asyncio
from typing import Dict, Any, Optional, List, Callable, Coroutine
import logging
import uuid
import time
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class TaskManager:
    """
    Manages long-running tasks with status tracking.
    """
    
    def __init__(self, max_tasks: int = 100, cleanup_interval: int = 3600):
        self.tasks: Dict[str, asyncio.Task] = {}
        self.task_metadata: Dict[str, Dict[str, Any]] = {}
        self.max_tasks = max_tasks
        self.cleanup_interval = cleanup_interval
        self.cleanup_task = None
        
    async def start(self):
        """Start the task manager"""
        self.cleanup_task = asyncio.create_task(self._periodic_cleanup())
        
    async def stop(self):
        """Stop the task manager"""
        if self.cleanup_task:
            self.cleanup_task.cancel()
            try:
                await self.cleanup_task
            except asyncio.CancelledError:
                pass
                
        # Cancel all running tasks
        for task_id, task in list(self.tasks.items()):
            if not task.done():
                task.cancel()
                
        # Wait for all tasks to complete
        if self.tasks:
            await asyncio.gather(*self.tasks.values(), return_exceptions=True)
    
    async def submit_task(
        self,
        coroutine: Coroutine,
        task_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Submit a task for execution.
        
        Args:
            coroutine: The coroutine to execute
            task_id: Optional ID for the task
            metadata: Optional metadata for the task
            
        Returns:
            Task ID
        """
        # Check if we have too many tasks
        if len(self.tasks) >= self.max_tasks:
            raise RuntimeError(f"Too many tasks (limit: {self.max_tasks})")
            
        # Generate task ID if not provided
        task_id = task_id or str(uuid.uuid4())
        
        # Create wrapped coroutine
        wrapped_coroutine = self._wrap_coroutine(coroutine, task_id)
        
        # Create task
        task = asyncio.create_task(wrapped_coroutine)
        
        # Store task
        self.tasks[task_id] = task
        
        # Store metadata
        self.task_metadata[task_id] = {
            "id": task_id,
            "status": "running",
            "start_time": datetime.now().isoformat(),
            "metadata": metadata or {},
            "result": None,
            "error": None
        }
        
        return task_id
        
    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the status of a task.
        
        Args:
            task_id: ID of the task
            
        Returns:
            Task status dict or None if task not found
        """
        if task_id not in self.task_metadata:
            return None
            
        metadata = dict(self.task_metadata[task_id])
        
        # Add elapsed time
        if "start_time" in metadata:
            start_time = datetime.fromisoformat(metadata["start_time"])
            if metadata["status"] == "completed":
                end_time = datetime.fromisoformat(metadata.get("end_time", datetime.now().isoformat()))
                elapsed = (end_time - start_time).total_seconds()
            else:
                elapsed = (datetime.now() - start_time).total_seconds()
                
            metadata["elapsed_seconds"] = elapsed
            
        return metadata
        
    async def cancel_task(self, task_id: str) -> bool:
        """
        Cancel a running task.
        
        Args:
            task_id: ID of the task
            
        Returns:
            True if task was cancelled, False otherwise
        """
        if task_id not in self.tasks:
            return False
            
        task = self.tasks[task_id]
        
        if task.done():
            return False
            
        task.cancel()
        
        # Update metadata
        if task_id in self.task_metadata:
            self.task_metadata[task_id].update({
                "status": "cancelled",
                "end_time": datetime.now().isoformat()
            })
            
        return True
        
    async def list_tasks(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List all tasks, optionally filtered by status.
        
        Args:
            status: Optional status filter
            
        Returns:
            List of task metadata
        """
        if status:
            return [
                meta for meta in self.task_metadata.values()
                if meta.get("status") == status
            ]
        else:
            return list(self.task_metadata.values())
    
    async def _wrap_coroutine(self, coroutine: Coroutine, task_id: str) -> Any:
        """Wrap a coroutine to track its status"""
        try:
            result = await coroutine
            
            # Update metadata
            if task_id in self.task_metadata:
                self.task_metadata[task_id].update({
                    "status": "completed",
                    "end_time": datetime.now().isoformat(),
                    "result": result
                })
                
            return result
            
        except asyncio.CancelledError:
            # Task was cancelled
            if task_id in self.task_metadata:
                self.task_metadata[task_id].update({
                    "status": "cancelled",
                    "end_time": datetime.now().isoformat()
                })
                
            raise
            
        except Exception as e:
            # Task failed
            if task_id in self.task_metadata:
                self.task_metadata[task_id].update({
                    "status": "failed",
                    "end_time": datetime.now().isoformat(),
                    "error": str(e)
                })
                
            raise
                
    async def _periodic_cleanup(self):
        """Periodically clean up completed tasks"""
        while True:
            try:
                await asyncio.sleep(self.cleanup_interval)
                await self._cleanup_old_tasks()
            except asyncio.CancelledError:
                break
                
    async def _cleanup_old_tasks(self, max_age_hours: int = 24):
        """Clean up old completed tasks"""
        now = datetime.now()
        cutoff = now - timedelta(hours=max_age_hours)
        
        # Find old completed tasks
        to_remove = []
        for task_id, metadata in self.task_metadata.items():
            if metadata["status"] in ("completed", "failed", "cancelled"):
                if "end_time" in metadata:
                    end_time = datetime.fromisoformat(metadata["end_time"])
                    if end_time < cutoff:
                        to_remove.append(task_id)
                        
        # Remove old tasks
        for task_id in to_remove:
            if task_id in self.tasks:
                del self.tasks[task_id]
            if task_id in self.task_metadata:
                del self.task_metadata[task_id]
                
        if to_remove:
            logger.info(f"Cleaned up {len(to_remove)} old tasks")