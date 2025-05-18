# core/node_factory.py
from typing import Dict, Any, Callable, Awaitable
import importlib

class NodeFactory:
    """Factory for creating node processors"""
    
    def __init__(self):
        self._processors = {}
        
    def register(self, node_type: str, processor_class):
        """Register a processor for a node type"""
        self._processors[node_type] = processor_class
        
    def create(self, node_type: str, **kwargs):
        """Create a processor instance for a node type"""
        processor_class = self._processors.get(node_type)
        if not processor_class:
            raise ValueError(f"No processor registered for node type: {node_type}")
        return processor_class(**kwargs)
    
    def load_processors(self, package_path: str = "nodes"):
        """Dynamically load processors from a package"""
        package = importlib.import_module(package_path)
        for module_name in dir(package):
            if module_name.startswith("_"):
                continue
                
            module = importlib.import_module(f"{package_path}.{module_name}")
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if (hasattr(attr, "NODE_TYPE") and 
                    callable(attr) and 
                    attr_name.endswith("Processor")):
                    self.register(attr.NODE_TYPE, attr)