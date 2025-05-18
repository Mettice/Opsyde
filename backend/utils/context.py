# utils/context.py
import asyncio
from contextvars import ContextVar
from typing import Dict, Any, Optional
import uuid

# Context variables
_request_id_var: ContextVar[str] = ContextVar('request_id', default='')
_context_data_var: ContextVar[Dict[str, Any]] = ContextVar('context_data', default={})

class RequestContext:
    """Request context manager for async operations"""
    
    def __init__(self, request_id: Optional[str] = None, **kwargs):
        self.request_id = request_id or str(uuid.uuid4())
        self.data = kwargs
        self.token_id = None
        self.token_data = None
        
    async def __aenter__(self):
        self.token_id = _request_id_var.set(self.request_id)
        self.token_data = _context_data_var.set(dict(self.data))
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        _request_id_var.reset(self.token_id)
        _context_data_var.reset(self.token_data)

def get_request_id() -> str:
    """Get the current request ID"""
    return _request_id_var.get()
    
def get_context_data() -> Dict[str, Any]:
    """Get the current context data"""
    return _context_data_var.get()
    
def set_context_value(key: str, value: Any) -> None:
    """Set a value in the current context"""
    data = _context_data_var.get().copy()
    data[key] = value
    _context_data_var.set(data)
    
def get_context_value(key: str, default: Any = None) -> Any:
    """Get a value from the current context"""
    return _context_data_var.get().get(key, default)