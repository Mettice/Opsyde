import asyncio
import re
import logging
from typing import Dict, Any, Optional, Union
from datetime import datetime
from core.llm_runner import llm_runner
from nodes.base_node import BaseNode, NodeConfig
from pydantic import Field, BaseModel
from models.data import NodeData
from models.schemas import NodeSchema, SchemaType, SchemaField



logger = logging.getLogger(__name__)

class DelayNodeConfig(NodeConfig):
    """Configuration for Delay nodes"""
    label: str
    description: str
    duration: str = Field(default="5s", description="Delay duration (e.g., '5s', '2m')")
    input_schema: NodeSchema = Field(default_factory=lambda: NodeSchema(
        fields={
            'input': SchemaField(
                type=SchemaType.ANY,
                description='Input to pass through after delay',
                optional=True
            ),
            'llm_mode_enabled': SchemaField(
                type=SchemaType.BOOLEAN,
                description='Whether to use LLM-centric processing',
                optional=True
            )
        }
    ))
    output_schema: NodeSchema = Field(default_factory=lambda: NodeSchema(
        fields={
            'result': SchemaField(
                type=SchemaType.ANY,
                description='Data after delay',
                optional=True
            ),
            'metadata': SchemaField(
                type=SchemaType.OBJECT,
                description='Execution metadata',
                optional=False,
                properties={
                    'node_type': SchemaField(type=SchemaType.STRING, description='Type of node'),
                    'processing_mode': SchemaField(type=SchemaType.STRING, description='Processing mode used'),
                    'delay_duration': SchemaField(type=SchemaType.STRING, description='Requested delay duration'),
                    'delay_result': SchemaField(type=SchemaType.OBJECT, description='Actual delay execution result'),
                    'llm_analysis': SchemaField(type=SchemaType.OBJECT, description='LLM analysis if used', optional=True),
                    'llm_metadata': SchemaField(type=SchemaType.OBJECT, description='LLM metadata if used', optional=True),
                    'timestamp': SchemaField(type=SchemaType.STRING, description='Timestamp of completion'),
                    'data_preserved': SchemaField(type=SchemaType.BOOLEAN, description='Whether input data was preserved')
                }
            ),
            'error': SchemaField(
                type=SchemaType.STRING,
                description='Error message',
                optional=True
            )
        },
        required_fields=['metadata']
    ))

class DelayNode(BaseNode):
    """Enhanced Delay Node with schema support"""
    def get_config_model(self) -> type[BaseModel]:
        return DelayNodeConfig

    async def process(self, node, inputs, context):
        return await super().process(node, inputs, context)
    
    async def _execute(self, config: BaseModel, inputs: Dict[str, NodeData], context: Dict[str, Any]) -> Any:
        """Execute the delay node"""
        try:
            # Extract duration from config
            duration_str = config.duration if hasattr(config, 'duration') else "5s"
            
            # Parse duration
            match = re.match(r"(\d+)(s|m|h)", duration_str.strip().lower())
            if not match:
                raise ValueError(f"Invalid delay format: {duration_str}")

            # Calculate delay in seconds
            value, unit = match.groups()
            value = int(value)
            seconds = value * (60 if unit == "m" else 3600 if unit == "h" else 1)
            
            # Log the delay
            logger.info(f"Starting delay of {duration_str} ({seconds} seconds)")
            start_time = datetime.now()
            
            # Execute the delay
            await asyncio.sleep(seconds)
            
            # Calculate actual duration
            end_time = datetime.now()
            actual_duration = (end_time - start_time).total_seconds()
            
            # Get input data to pass through
            input_data = None
            for key, value in inputs.items():
                if isinstance(value, NodeData) and not value.is_error():
                    input_data = value.value
                    break
                elif not isinstance(value, NodeData):
                    input_data = value
                    break
            
            # Return structured response
            return {
                "type": "delay_result",
                "output": input_data,  # Pass through input data
                "metadata": {
                    "timestamp": end_time.isoformat(),
                    "node_type": "delay",
                    "start_time": start_time.isoformat(),
                    "end_time": end_time.isoformat(),
                    "duration": duration_str,
                    "seconds": seconds,
                    "actual_duration": actual_duration
                }
            }
            
        except Exception as e:
            logger.error(f"Delay execution error: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "metadata": {
                    "timestamp": datetime.now().isoformat(),
                    "node_type": "delay"
                }
            }

async def run_delay_node(data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run a delay node that pauses execution for a specified duration
    
    Args:
        data: Delay node configuration including duration
        inputs: Input values (not used for delay nodes)
        
    Returns:
        Dictionary containing the delay result and metadata
    """
    try:
        # Extract and validate duration
        duration_str = data.get("duration", "5s")
        match = re.match(r"(\d+)(s|m|h)", duration_str.strip().lower())
        if not match:
            raise ValueError(f"Invalid delay format: {duration_str}")

        # Calculate delay in seconds
        value, unit = match.groups()
        value = int(value)
        seconds = value * (60 if unit == "m" else 3600 if unit == "h" else 1)
        
        # Log the delay
        logger.info(f"Starting delay of {duration_str} ({seconds} seconds)")
        start_time = datetime.now()
        
        # Execute the delay
        await asyncio.sleep(seconds)
        
        # Calculate actual duration
        end_time = datetime.now()
        actual_duration = (end_time - start_time).total_seconds()
        
        # Return structured response
        return {
            "type": "delay_result",
            "output": {
                "duration": duration_str,
                "seconds": seconds,
                "actual_duration": actual_duration
            },
            "metadata": {
                "timestamp": end_time.isoformat(),
                "node_type": "delay",
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Delay runner error: {str(e)}")
        return {
            "type": "error",
            "error": str(e),
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "node_type": "delay"
            }
        }

async def process_delay_node(
    node_data: Dict[str, Any], 
    inputs: Dict[str, Any], 
    context: Dict[str, Any] = None
) -> NodeData:
    """Enhanced delay node processor with LLM-centric processing support"""
    try:
        # 🚀 CHECK FOR LLM-CENTRIC MODE
        llm_mode_enabled = node_data.get('llm_mode_enabled', False)
        
        # If LLM-centric mode is enabled, use LLM Runner for intelligent delay processing
        if llm_mode_enabled:
            logger.info(f"🤖 Using LLM-centric processing for delay node")
            
            # Prepare input data for LLM delay evaluation
            llm_input_data = {
                'node_id': node_data.get('nodeId', node_data.get('id', 'unknown')),
                'node_type': 'delay',
                'node_config': node_data,
                'duration': node_data.get('duration', '5s'),
                'inputs': {key: value.value if isinstance(value, NodeData) else value for key, value in inputs.items()},
                'description': f"Process a delay of {node_data.get('duration', '5s')} and pass through the input data"
            }
            
            # Get user ID from context
            user_id = None
            if context and isinstance(context, dict):
                user_id = context.get('user_id')
            
            # Execute LLM task for delay processing (mainly for logging/analysis)
            llm_result = await llm_runner.execute_llm_task(
                task_type='input_processing',
                input_data=llm_input_data,
                context=context or {},
                user_id=user_id,
                stream=False
            )
            
            if llm_result.get('success'):
                # LLM processing successful - still execute the actual delay
                logger.info(f"✅ LLM analyzed delay requirements")
                
                # Get main input data for preservation
                main_input_data = None
                for key, value in inputs.items():
                    if isinstance(value, NodeData) and not value.is_error():
                        main_input_data = value.value
                        break
                    elif not isinstance(value, NodeData):
                        main_input_data = value
                        break
                
                # Execute the actual delay
                delay_result = await run_delay_node(node_data, {})
                
                standardized_result = {
                    "success": True,
                    "data": main_input_data,  # 🔑 PRESERVE INPUT DATA FOR DOWNSTREAM FLOW
                    "error": None,
                    "metadata": {
                        "node_type": "delay",
                        "processing_mode": "llm_centric",
                        "delay_duration": node_data.get('duration', '5s'),
                        "delay_result": delay_result,
                        "llm_analysis": llm_result.get('output', {}),
                        "llm_metadata": llm_result.get('metadata', {}),
                        "timestamp": datetime.now().isoformat(),
                        "data_preserved": main_input_data is not None
                    }
                }
                
                logger.info(f"✅ LLM-centric delay processing completed with {node_data.get('duration', '5s')} delay")
                return NodeData.from_value(standardized_result)
            else:
                # LLM processing failed, fall back to traditional processing
                logger.warning(f"LLM-centric delay processing failed, falling back to traditional processing: {llm_result.get('error')}")
        
        # 🚀 TRADITIONAL PROCESSING WITH ENHANCED DATA PRESERVATION
        preserved_data = {}
        main_input_data = None
        
        for key, value in inputs.items():
            if isinstance(value, NodeData):
                if value.is_error():
                    return NodeData.from_error(f"Input '{key}' has error: {value.error}")
                # Extract clean data from NodeData
                actual_value = value.value
            else:
                actual_value = value
            
            # Handle standardized format data extraction
            if isinstance(actual_value, dict):
                if "success" in actual_value and "data" in actual_value:
                    if actual_value["success"]:
                        preserved_data[key] = actual_value["data"]
                        # Use first successful input as main data
                        if main_input_data is None:
                            main_input_data = actual_value["data"]
                    else:
                        return NodeData.from_error(f"Input '{key}' failed: {actual_value.get('error')}")
                elif "_clean_data" in actual_value:
                    preserved_data[key] = actual_value["_clean_data"]
                    if main_input_data is None:
                        main_input_data = actual_value["_clean_data"]
                else:
                    preserved_data[key] = actual_value
                    if main_input_data is None:
                        main_input_data = actual_value
            else:
                preserved_data[key] = actual_value
                if main_input_data is None:
                    main_input_data = actual_value
        
        # Execute delay with preserved data
        result = await run_delay_node(node_data, preserved_data)
        
        # 🚀 STANDARDIZE OUTPUT FORMAT WITH PRESERVED DATA
        delay_duration = result.get("output", {}).get("duration", node_data.get("duration", "5s"))
        actual_duration = result.get("output", {}).get("actual_duration", 0)
        
        standardized_result = {
            "success": True,
            "data": main_input_data,  # 🔑 CRITICAL: Pass through the main input data
            "error": None,
            "metadata": {
                "node_type": "delay",
                "processing_mode": "traditional",
                "delay_duration": delay_duration,
                "actual_duration": actual_duration,
                "preserved_inputs": preserved_data,  # Keep all inputs for debugging
                "timestamp": datetime.now().isoformat(),
                "data_preserved": main_input_data is not None
            }
        }
        
        return NodeData.from_value(standardized_result)
            
    except Exception as e:
        logger.error(f"Error in delay node processor: {str(e)}")
        return NodeData.from_error(f"Delay node processing failed: {str(e)}")

