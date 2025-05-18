# utils/memory.py
from typing import Dict, Any, Set
import logging
import gc

logger = logging.getLogger(__name__)

class MemoryManager:
    """Manages memory usage for workflow execution"""
    
    def __init__(self, max_cache_size: int = 100, cleanup_threshold: float = 0.8):
        self.max_cache_size = max_cache_size
        self.cleanup_threshold = cleanup_threshold
        self.cache = {}
        self.access_timestamps = {}
        self.executed_nodes = set()
        
    def add_result(self, node_id: str, result: Any) -> None:
        """Add a node result to the cache"""
        current_size = len(self.cache)
        
        if current_size >= self.max_cache_size * self.cleanup_threshold:
            self.cleanup()
            
        self.cache[node_id] = result
        self.access_timestamps[node_id] = self._get_timestamp()
        self.executed_nodes.add(node_id)
        
    def get_result(self, node_id: str) -> Any:
        """Get a node result from the cache"""
        if node_id in self.cache:
            # Update access timestamp
            self.access_timestamps[node_id] = self._get_timestamp()
            return self.cache[node_id]
        return None
        
    def cleanup(self) -> None:
        """Clean up least recently used results"""
        if not self.cache:
            return
            
        # Sort by access timestamp
        sorted_nodes = sorted(
            self.access_timestamps.items(),
            key=lambda x: x[1]
        )
        
        # Remove oldest items
        items_to_remove = max(1, int(len(sorted_nodes) * 0.2))  # Remove at least 20%
        for node_id, _ in sorted_nodes[:items_to_remove]:
            if node_id in self.cache:
                del self.cache[node_id]
                del self.access_timestamps[node_id]
                
        # Force garbage collection
        gc.collect()
        
        logger.debug(f"Memory cleanup: removed {items_to_remove} items, current size: {len(self.cache)}")
        
    def is_executed(self, node_id: str) -> bool:
        """Check if a node has been executed"""
        return node_id in self.executed_nodes
        
    def clear(self) -> None:
        """Clear all cached data"""
        self.cache.clear()
        self.access_timestamps.clear()
        self.executed_nodes.clear()
        gc.collect()
        
    def _get_timestamp(self) -> float:
        """Get current timestamp"""
        import time
        return time.time()