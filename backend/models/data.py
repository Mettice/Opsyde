from typing import Any, Dict, Optional, Union
from pydantic import BaseModel
from datetime import datetime
import json

class NodeData(BaseModel):
    """Standardized data model for node inputs/outputs"""
    value: Any
    metadata: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    timestamp: datetime = datetime.now()

    @classmethod
    def from_value(cls, value: Any) -> "NodeData":
        """Create NodeData from a simple value"""
        return cls(value=value)

    @classmethod
    def from_error(cls, error: str) -> "NodeData":
        """Create NodeData from an error"""
        return cls(value=None, error=error)

    def is_error(self) -> bool:
        """Check if this data represents an error"""
        return self.error is not None

    def get_value(self) -> Any:
        """Get the actual value, with error checking"""
        if self.is_error():
            raise ValueError(f"Cannot get value from error data: {self.error}")
        return self.value

    def to_dict(self) -> Dict[str, Any]:
        """Convert NodeData to a dictionary for serialization"""
        return {
            "value": self.value,
            "metadata": self.metadata,
            "error": self.error,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }
    
    def to_json(self) -> str:
        """Convert NodeData to a JSON string"""
        return json.dumps(self.to_dict(), default=self._json_serializer)
    
    @staticmethod
    def _json_serializer(obj):
        """Helper method to serialize objects that aren't JSON serializable by default"""
        if isinstance(obj, datetime):
            return obj.isoformat()
        if hasattr(obj, "to_dict") and callable(getattr(obj, "to_dict")):
            return obj.to_dict()
        if hasattr(obj, "__dict__"):
            return obj.__dict__
        try:
            return str(obj)
        except:
            return "Unserializable object" 