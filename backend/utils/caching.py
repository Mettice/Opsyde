# utils/caching.py
import hashlib
import json
from typing import Dict, Any, Optional, Callable
import logging
import asyncio
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class NodeResultCache:
    """Cache for node execution results"""
    
    def __init__(self, ttl: int = 3600):
        self.cache = {}
        self.expiry = {}
        self.ttl = ttl  # Default TTL in seconds
        
    async def get_or_execute(self, node_id: str, node_data: Dict[str, Any], 
                            inputs: Dict[str, Any], executor: Callable) -> Any:
        """
        Get cached result or execute the node
        
        Args:
            node_id: ID of the node
            node_data: Node configuration data
            inputs: Node inputs
            executor: Callable that executes the node
            
        Returns:
            Execution result (cached or fresh)
        """
        # Generate cache key based on node ID, data, and inputs
        cache_key = self._generate_cache_key(node_id, node_data, inputs)
        
        # Check cache
        if cache_key in self.cache:
            # Check if entry is expired
            if datetime.now() < self.expiry.get(cache_key, datetime.min):
                logger.debug(f"Cache hit for node {node_id}")
                return self.cache[cache_key]
                
        # Execute the node
        result = await executor(node_data, inputs)
        
        # Cache the result
        self.cache[cache_key] = result
        self.expiry[cache_key] = datetime.now() + timedelta(seconds=self.ttl)
        logger.debug(f"Cached result for node {node_id}")
        
        return result
        
    def _generate_cache_key(self, node_id: str, node_data: Dict[str, Any], 
                          inputs: Dict[str, Any]) -> str:
        """Generate a unique cache key for node execution"""
        # Create a string representation of the node and inputs
        cache_data = {
            "node_id": node_id,
            "node_data": self._clean_for_caching(node_data),
            "inputs": self._clean_for_caching(inputs)
        }
        
        # Serialize to JSON and hash
        json_str = json.dumps(cache_data, sort_keys=True)
        return hashlib.md5(json_str.encode()).hexdigest()
        
    def _clean_for_caching(self, data: Any) -> Any:
        """Clean data for consistent cache keys"""
        if isinstance(data, dict):
            # Remove non-deterministic values
            cleaned = {}
            for key, value in data.items():
                # Skip timestamps and random values
                if key not in ("timestamp", "random", "uuid"):
                    cleaned[key] = self._clean_for_caching(value)
            return cleaned
        elif isinstance(data, list):
            return [self._clean_for_caching(item) for item in data]
        else:
            return data
    
    def invalidate(self, node_id: Optional[str] = None) -> None:
        """Invalidate cache entries"""
        if node_id:
            # Invalidate entries for a specific node
            keys_to_remove = []
            for key in self.cache:
                if key.startswith(f"{node_id}:"):
                    keys_to_remove.append(key)
                    
            for key in keys_to_remove:
                del self.cache[key]
                if key in self.expiry:
                    del self.expiry[key]
        else:
            # Invalidate all entries
            self.cache.clear()
            self.expiry.clear()
            
    def cleanup(self) -> int:
        """Remove expired cache entries"""
        now = datetime.now()
        expired_keys = [
            key for key, expiry in self.expiry.items()
            if expiry <= now
        ]
        
        for key in expired_keys:
            del self.cache[key]
            del self.expiry[key]
            
        return len(expired_keys)