from typing import Dict, Any, Optional, Union
from abc import ABC, abstractmethod
from datetime import datetime
from pydantic import BaseModel, ValidationError, Field

from models.data import NodeData
from models.schemas import NodeSchema, SchemaType, SchemaField
from utils.logging import get_logger
from config.settings import get_settings

logger = get_logger(__name__)
settings = get_settings()

class NodeConfig(BaseModel):
    """Base configuration model for nodes"""
    node_id: str
    node_type: str
    label: Optional[str] = None
    description: Optional[str] = None
    input_schema: Optional[NodeSchema] = Field(default_factory=lambda: NodeSchema(
        fields={
            'input': SchemaField(
                type=SchemaType.ANY,
                description='Default input data'
            )
        },
        required_fields=['input']
    ))
    output_schema: Optional[NodeSchema] = Field(default_factory=lambda: NodeSchema(
        fields={
            'result': SchemaField(
                type=SchemaType.ANY,
                description='Default output result'
            ),
            'metadata': SchemaField(
                type=SchemaType.OBJECT,
                description='Execution metadata',
                properties={
                    'node_id': SchemaField(type=SchemaType.STRING, description='Node ID'),
                    'node_type': SchemaField(type=SchemaType.STRING, description='Node type'),
                    'execution_id': SchemaField(type=SchemaType.STRING, description='Execution ID'),
                    'timestamp': SchemaField(type=SchemaType.STRING, description='Execution timestamp')
                }
            )
        },
        required_fields=['result', 'metadata']
    ))

class BaseNode(ABC):
    """Base class for all node types"""
    
    def __init__(self):
        self.settings = get_settings()
        self.logger = get_logger(self.__class__.__name__)

    @abstractmethod
    def get_config_model(self) -> type[BaseModel]:
        """Return the Pydantic model for this node's configuration"""
        pass

    def get_input_schema(self) -> NodeSchema:
        """Get the input schema for this node type"""
        config_model = self.get_config_model()
        return config_model.input_schema

    def get_output_schema(self) -> NodeSchema:
        """Get the output schema for this node type"""
        config_model = self.get_config_model()
        return config_model.output_schema

    async def process(self, node: Dict[str, Any], inputs: Dict[str, NodeData], context: Dict[str, Any]) -> NodeData:
        """Standard node processing flow with enhanced schema validation"""
        try:
            # Validate basic node structure
            if not self._validate_node_structure(node):
                return NodeData.from_error("Invalid node structure")

            # Parse and validate configuration
            config = self._validate_config(node.get("data", {}))
            if isinstance(config, str):  # Error message
                return NodeData.from_error(config)

            # Get schemas
            input_schema = self.get_input_schema()
            output_schema = self.get_output_schema()

            # Validate inputs against schema
            if not self._validate_inputs_against_schema(inputs, input_schema):
                return NodeData.from_error("Input data does not match schema")

            # Execute node-specific logic
            result = await self._execute(config, inputs, context)
            
            # Create NodeData with schema validation
            result_data = NodeData.from_value(result, schema=output_schema)
            
            # Add standard metadata
            metadata = {
                "node_id": node.get("id"),
                "node_type": node.get("type"),
                "execution_id": context.get("execution_id"),
                "timestamp": datetime.now().isoformat()
            }
            
            result_data.metadata = metadata
            return result_data

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

    def _validate_inputs_against_schema(self, inputs: Dict[str, NodeData], schema: NodeSchema) -> bool:
        """Validate inputs against the node's input schema"""
        if not schema:
            return True

        # Convert inputs to a single dictionary for validation
        input_dict = {}
        for key, node_data in inputs.items():
            if isinstance(node_data.value, dict):
                input_dict.update(node_data.value)
            else:
                input_dict[key] = node_data.value

        return schema.validate_data(input_dict)

    @abstractmethod
    async def _execute(self, config: BaseModel, inputs: Dict[str, NodeData], context: Dict[str, Any]) -> Any:
        """Execute node-specific logic"""
        pass 