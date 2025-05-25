# backend/core/inheritance.py 
from typing import Dict, Any, Optional

class InheritanceResolver:
    """Resolves inheritance relationships between nodes"""
    
    def __init__(self):
        self.inheritance_cache = {}
        
    def resolve_node_config(
        self, 
        node: Dict[str, Any], 
        workflow_nodes: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Resolve a node's configuration with inheritance.
        Returns the original node if no inheritance.
        """
        node_data = node.get("data", {})
        inherits_from = node_data.get("inherits_from")
        
        if not inherits_from:
            return node  # No inheritance, return as-is
            
        # Get parent node
        parent_node = workflow_nodes.get(inherits_from)
        if not parent_node:
            # Parent not found, return original node
            return node
            
        # Cache key for performance
        cache_key = f"{node.get('id')}:{inherits_from}"
        if cache_key in self.inheritance_cache:
            return self.inheritance_cache[cache_key]
            
        # Merge configurations
        parent_data = parent_node.get("data", {})
        merged_data = self._merge_configs(parent_data, node_data)
        
        resolved_node = {
            **node,
            "data": merged_data
        }
        
        # Cache the result
        self.inheritance_cache[cache_key] = resolved_node
        return resolved_node
    
    def _merge_configs(self, parent: Dict, child: Dict) -> Dict:
        """Smart merge: child overrides parent, handles nested dicts"""
        result = {}
        
        # First, add all parent fields
        for key, value in parent.items():
            if key == "inherits_from":
                continue  # Don't inherit inheritance relationships
            result[key] = value
            
        # Then, override with child fields
        for key, value in child.items():
            if isinstance(value, dict) and key in result and isinstance(result[key], dict):
                # Merge nested dictionaries (like frameworkConfig)
                result[key] = {**result[key], **value}
            else:
                # Direct override
                result[key] = value
                
        return result
    
    def clear_cache(self):
        """Clear inheritance cache (call when workflow changes)"""
        self.inheritance_cache.clear()

# Global instance
inheritance_resolver = InheritanceResolver()