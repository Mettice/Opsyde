from typing import Dict, Any, Optional
from abc import ABC, abstractmethod
from datetime import datetime
from pydantic import BaseModel, ValidationError

from backend.models.data import NodeData
from backend.utils.logging import get_logger
from backend.config.settings import get_settings

logger = get_logger(__name__)
settings = get_settings()

class NodeConfig(BaseModel):
    """Base configuration model for nodes"""
    node_id: str
    node_type: str
    label: Optional[str] = None
    description: Optional[str] = None

class BaseNode(ABC):
    """Base class for all node types"""
    
    def __init__(self):
        self.settings = get_settings()
        self.logger = get_logger(self.__class__.__name__)

    @abstractmethod
    def get_config_model(self) -> type[BaseModel]:
        """Return the Pydantic model for this node's configuration"""
        pass

    async def process(self, node: Dict[str, Any], inputs: Dict[str, NodeData], context: Dict[str, Any]) -> NodeData:
        """Standard node processing flow"""
        try:
            # Validate basic node structure
            if not self._validate_node_structure(node):
                return NodeData.from_error("Invalid node structure")

            # Parse and validate configuration
            config = self._validate_config(node.get("data", {}))
            if isinstance(config, str):  # Error message
                return NodeData.from_error(config)

            # Validate inputs
            if not self._validate_inputs(inputs):
                return NodeData.from_error("Invalid input data")

            # Execute node-specific logic
            result = await self._execute(config, inputs, context)
            
            # Add standard metadata
            metadata = {
                "node_id": node.get("id"),
                "node_type": node.get("type"),
                "execution_id": context.get("execution_id"),
                "timestamp": datetime.now().isoformat()
            }
            
            if isinstance(result, NodeData):
                result.metadata.update(metadata)
                return result
            
            return NodeData(value=result, metadata=metadata)

        except Exception as e:
            self.logger.error(f"Error processing node: {str(e)}")
            return NodeData.from_error(str(e))

    def _validate_node_structure(self, node: Dict[str, Any]) -> bool:
        """Validate basic node structure"""
        required_fields = ["id", "type", "data"]
        return all(field in node for field in required_fields)

    def _validate_config(self, config: Dict[str, Any]) -> Union[BaseModel, str]:
        """Validate node configuration using Pydantic model"""
        try:
            config_model = self.get_config_model()
            return config_model(**config)
        except ValidationError as e:
            return str(e)

    def _validate_inputs(self, inputs: Dict[str, NodeData]) -> bool:
        """Validate input data"""
        return all(isinstance(data, NodeData) for data in inputs.values())

    @abstractmethod
    async def _execute(self, config: BaseModel, inputs: Dict[str, NodeData], context: Dict[str, Any]) -> Any:
        """Execute node-specific logic"""
        pass 