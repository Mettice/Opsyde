from typing import Any, Dict, Optional, Union
from pydantic import BaseModel, Field, validator
from datetime import datetime
import json
from .schemas import NodeSchema, SchemaType, SchemaField

class NodeData(BaseModel):
    """Enhanced data model for node inputs/outputs with schema validation"""
    value: Any
    metadata: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)
    node_schema: Optional[NodeSchema] = None

    @validator('value')
    def validate_value(cls, v, values):
        """Validate value against schema if one is defined"""
        schema = values.get('node_schema')
        if schema and not schema.validate_data(v if isinstance(v, dict) else {'value': v}):
            raise ValueError("Value does not match schema")
        return v

    @classmethod
    def from_value(cls, value: Any, schema: Optional[NodeSchema] = None) -> "NodeData":
        """Create NodeData from a value with optional schema validation"""
        return cls(value=value, node_schema=schema)

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
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "node_schema": self.node_schema.dict() if self.node_schema else None
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

    def validate_against_schema(self, schema: NodeSchema) -> bool:
        """Validate the data against a provided schema"""
        if not schema:
            return True
        return schema.validate_data(self.value if isinstance(self.value, dict) else {'value': self.value}) 