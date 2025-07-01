from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

from nodes.base_node import BaseNode, NodeConfig
from models.data import NodeData
from models.schemas import NodeSchema, SchemaType, SchemaField

class ExampleNodeConfig(NodeConfig):
    """Configuration for the example node"""
    input_schema: NodeSchema = NodeSchema(
        fields={
            'text': SchemaField(
                type=SchemaType.STRING,
                description='Input text to process',
                min_length=1,
                max_length=1000
            ),
            'options': SchemaField(
                type=SchemaType.OBJECT,
                description='Processing options',
                properties={
                    'uppercase': SchemaField(
                        type=SchemaType.BOOLEAN,
                        description='Convert to uppercase',
                        default=False
                    ),
                    'trim': SchemaField(
                        type=SchemaType.BOOLEAN,
                        description='Trim whitespace',
                        default=True
                    )
                }
            )
        },
        required_fields=['text']
    )
    
    output_schema: NodeSchema = NodeSchema(
        fields={
            'processed_text': SchemaField(
                type=SchemaType.STRING,
                description='Processed text result'
            ),
            'stats': SchemaField(
                type=SchemaType.OBJECT,
                description='Processing statistics',
                properties={
                    'length': SchemaField(
                        type=SchemaType.NUMBER,
                        description='Length of processed text'
                    ),
                    'word_count': SchemaField(
                        type=SchemaType.NUMBER,
                        description='Number of words'
                    )
                }
            )
        },
        required_fields=['processed_text', 'stats']
    )

class ExampleNode(BaseNode):
    """Example node that demonstrates schema validation"""
    
    def get_config_model(self) -> type[BaseModel]:
        return ExampleNodeConfig

    async def _execute(self, config: ExampleNodeConfig, inputs: Dict[str, NodeData], context: Dict[str, Any]) -> Dict[str, Any]:
        # Get input values
        input_data = inputs['text'].value
        options = inputs.get('options', NodeData.from_value({})).value
        
        # Process text
        text = input_data['text']
        if options.get('trim', True):
            text = text.strip()
        if options.get('uppercase', False):
            text = text.upper()
            
        # Calculate stats
        words = text.split()
        
        return {
            'processed_text': text,
            'stats': {
                'length': len(text),
                'word_count': len(words)
            }
        } 