import logging
from typing import Dict, Any, Optional, List, Union, Tuple
from datetime import datetime
import aiohttp
import asyncio
import json
import hashlib

# Import NodeData class
from models.data import NodeData

# NEW: Import the advanced data state manager
from services.data_state_manager import data_state_manager

# Import the universal data transformer (the real one, not hardcoded)
from core.data_transformer import data_transformer

from nodes.base_node import BaseNode, NodeConfig
from pydantic import Field, BaseModel, validator
from core.smart_mapper import SmartMapper
from models.schemas import NodeSchema, SchemaField, SchemaType

logger = logging.getLogger(__name__)

def run_trigger_node(data=None):
    """
    Handle different trigger types (legacy sync version)
    
    Args:
        data: Dictionary containing trigger configuration
        
    Returns:
        Dictionary with trigger status
    """
    # Safety check for None input
    if data is None:
        return {
            "output": "Trigger activated (no data provided)",
            "type": "trigger_status",
            "trigger_type": "manual"
        }
    
    trigger_type = data.get("triggerType", "manual")
    trigger_id = data.get("nodeId", "unknown")
    label = data.get("label", "Trigger")
    
    if trigger_type == "manual":
        return {
            "output": "Manual trigger activated",
            "type": "trigger_status",
            "trigger_type": "manual",
            "trigger_id": trigger_id
        }
    elif trigger_type == "webhook":
        return {
            "output": "Waiting for webhook...",
            "type": "trigger_status",
            "trigger_type": "webhook",
            "trigger_id": trigger_id
        }
    elif trigger_type == "schedule":
        return {
            "output": f"Scheduled trigger at {data.get('runAt', 'N/A')}",
            "type": "trigger_status",
            "trigger_type": "schedule",
            "trigger_id": trigger_id
        }
    elif trigger_type == "universal_polling":
        service_name = data.get("serviceName", "Unknown API")
        api_endpoint = data.get("apiEndpoint", "")
        
        # Actually fetch the API data for the agent
        try:
            import requests
            
            # Set up authentication headers
            headers = {'User-Agent': 'CrewBuilder-Universal-Polling/1.0'}
            auth_type = data.get('authType', 'none')
            
            if auth_type == 'api_key' and data.get('apiKey'):
                api_key = data.get('apiKey')
                if 'airtable' in api_endpoint.lower():
                    headers['Authorization'] = f'Bearer {api_key}'
                else:
                    headers['Authorization'] = f'Bearer {api_key}'
                    headers['X-API-Key'] = api_key
                    
            elif auth_type == 'bearer_token' and data.get('bearerToken'):
                headers['Authorization'] = f'Bearer {data.get("bearerToken")}'
                
            elif auth_type == 'basic_auth' and data.get('username') and data.get('password'):
                import base64
                credentials = base64.b64encode(f"{data.get('username')}:{data.get('password')}".encode()).decode()
                headers['Authorization'] = f'Basic {credentials}'
            
            # Fetch the actual data
            response = requests.get(api_endpoint, headers=headers, timeout=30)
            
            if response.status_code == 200:
                api_data = response.json()
                
                # Use the universal data transformer instead of hardcoded logic
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    standard_records = loop.run_until_complete(
                        data_transformer.transform_api_response(api_data, service_name)
                    )
                    
                    # Convert to agent format
                    agent_data = data_transformer.to_agent_format(standard_records)
                    
                    return {
                        "output": f"Universal API data from {service_name}",
                        "type": "api_data",
                        "trigger_type": "universal_polling",
                        "trigger_id": trigger_id,
                        "service_name": service_name,
                        "api_data": agent_data,
                        "standard_records": standard_records,
                        "data_summary": f"Transformed {len(standard_records)} records from {service_name}",
                        "transformation_confidence": agent_data.get("transformation_summary", {}).get("avg_confidence", 0)
                    }
                finally:
                    loop.close()
            else:
                raise Exception(f"API request failed: {response.status_code}")
                
        except Exception as api_error:
            logger.error(f"Failed to fetch API data: {str(api_error)}")
            return {
                "output": f"Universal API Polling - monitoring {service_name} (failed to fetch data: {str(api_error)})",
                "type": "trigger_status",
                "trigger_type": "universal_polling",
                "trigger_id": trigger_id,
                "service_name": service_name,
                "error": str(api_error)
            }
    elif trigger_type == "universal_webhook":
        service_name = data.get("serviceName", "Unknown Service")
        return {
            "output": f"Universal Webhook - ready for {service_name}",
            "type": "trigger_status",
            "trigger_type": "universal_webhook",
            "trigger_id": trigger_id,
            "service_name": service_name
        }
    else:
        return {
            "output": f"Unknown trigger type: {trigger_type}",
            "type": "error",
            "trigger_type": trigger_type,
            "trigger_id": trigger_id
        }

async def process_trigger_node(
    node_data: Dict[str, Any],
    inputs: Dict[str, Any],
    context: Dict[str, Any] = None
) -> NodeData:
    """Enhanced trigger node processor with schema validation and smart mapping"""
    smart_mapper = SmartMapper()
    mapped_inputs = await smart_mapper.smart_map_inputs(node_data, context or {}, inputs)
    trigger_node = TriggerNode()
    return await trigger_node.process(node_data, mapped_inputs, context or {})

async def fetch_api_data(node_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Fetch data from API endpoint with authentication support
    """
    try:
        api_endpoint = node_data.get('apiEndpoint')
        if not api_endpoint:
            return None
        
        # Set up authentication headers
        headers = {'User-Agent': 'CrewBuilder-Universal-Polling/1.0'}
        auth_type = node_data.get('authType', 'none')
        
        if auth_type == 'api_key' and node_data.get('apiKey'):
            api_key = node_data.get('apiKey')
            if 'airtable' in api_endpoint.lower():
                headers['Authorization'] = f'Bearer {api_key}'
            else:
                headers['Authorization'] = f'Bearer {api_key}'
                headers['X-API-Key'] = api_key
                
        elif auth_type == 'bearer_token' and node_data.get('bearerToken'):
            headers['Authorization'] = f'Bearer {node_data.get("bearerToken")}'
            
        elif auth_type == 'basic_auth' and node_data.get('username') and node_data.get('password'):
            import base64
            credentials = base64.b64encode(f"{node_data.get('username')}:{node_data.get('password')}".encode()).decode()
            headers['Authorization'] = f'Basic {credentials}'
        
        # Make async HTTP request
        async with aiohttp.ClientSession() as session:
            async with session.get(api_endpoint, headers=headers, timeout=30) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    logger.error(f"API request failed with status {response.status}")
                    return None
                    
    except Exception as e:
        logger.error(f"Error fetching API data: {str(e)}")
        return None

def _filter_api_data(api_data, node_data):
    """
    Legacy filtering function for backward compatibility
    Enhanced to work with the new filtering system
    """
    try:
        if not api_data:
            return api_data
        
        # Get filter configuration from node_data
        include_fields = node_data.get('includeFields', [])
        exclude_fields = node_data.get('excludeFields', [])
        
        # If no filtering specified, return original data
        if not include_fields and not exclude_fields:
            return api_data
        
        def filter_record(record):
            """Filter a single record based on include/exclude fields"""
            if not isinstance(record, dict):
                return record
            
            filtered_record = {}
            
            if include_fields:
                # Only include specified fields
                for field in include_fields:
                    if '.' in field:
                        # Handle nested fields
                        value = _get_nested_value(record, field)
                        if value is not None:
                            _set_nested_value(filtered_record, field, value)
                    elif field in record:
                        filtered_record[field] = record[field]
            else:
                # Include all fields except excluded ones
                filtered_record = record.copy()
                for field in exclude_fields:
                    if '.' in field:
                        # Handle nested fields
                        _remove_nested_field(filtered_record, field)
                    elif field in filtered_record:
                        del filtered_record[field]
            
            return filtered_record
        
        # Apply filtering based on data structure
        if isinstance(api_data, list):
            # Direct array
            return [filter_record(record) for record in api_data]
        elif isinstance(api_data, dict):
            if 'records' in api_data and isinstance(api_data['records'], list):
                # Airtable-style response
                filtered_data = api_data.copy()
                filtered_data['records'] = [filter_record(record) for record in api_data['records']]
                return filtered_data
            elif 'data' in api_data and isinstance(api_data['data'], list):
                # Generic data wrapper
                filtered_data = api_data.copy()
                filtered_data['data'] = [filter_record(record) for record in api_data['data']]
                return filtered_data
            else:
                # Single object
                return filter_record(api_data)
        
        return api_data
        
    except Exception as e:
        logger.error(f"Error filtering API data: {str(e)}")
        return api_data

def _get_nested_value(data: Dict, path: str) -> Any:
    """Get value from nested dictionary using dot notation"""
    if not path:
        return data
    
    keys = path.split('.')
    current = data
    
    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return None
    
    return current

def _set_nested_value(data: Dict, path: str, value: Any):
    """Set value in nested dictionary using dot notation"""
    keys = path.split('.')
    current = data
    
    for key in keys[:-1]:
        if key not in current:
            current[key] = {}
        current = current[key]
    
    current[keys[-1]] = value

def _remove_nested_field(data: Dict, path: str):
    """Remove field from nested dictionary using dot notation"""
    keys = path.split('.')
    current = data
    
    for key in keys[:-1]:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return
    
    if isinstance(current, dict) and keys[-1] in current:
        del current[keys[-1]]

class TriggerNodeConfig(NodeConfig):
    """Configuration for Trigger nodes"""
    label: str
    description: str
    triggerType: str = Field(default="manual", description="Type of trigger (manual, webhook, schedule, etc.)")
    schedule: Dict[str, Any] = Field(default_factory=dict, description="Schedule configuration")
    webhook: Dict[str, Any] = Field(default_factory=dict, description="Webhook configuration")
    
    # Add validation methods
    @validator('label')
    def validate_label(cls, v):
        if not v or not v.strip():
            raise ValueError("Trigger label is required")
        return v.strip()
    
    @validator('triggerType')
    def validate_trigger_type(cls, v):
        valid_types = ['manual', 'webhook', 'schedule', 'universal_polling', 'universal_webhook']
        if v not in valid_types:
            raise ValueError(f"Invalid trigger type. Must be one of: {', '.join(valid_types)}")
        return v
    
    # Enhanced input schema for triggers
    input_schema: NodeSchema = Field(default_factory=lambda: NodeSchema(
        fields={
            'trigger_data': SchemaField(
                type=SchemaType.ANY,
                description='Trigger data',
                optional=True
            ),
            'api_data': SchemaField(
                type=SchemaType.OBJECT,
                description='Data from API polling',
                optional=True
            ),
            'webhook_data': SchemaField(
                type=SchemaType.OBJECT,
                description='Data from webhook',
                optional=True
            ),
            'schedule_data': SchemaField(
                type=SchemaType.OBJECT,
                description='Data from scheduled trigger',
                optional=True
            )
        }
    ))
    output_schema: NodeSchema = Field(default_factory=lambda: NodeSchema(
        fields={
            'result': SchemaField(
                type=SchemaType.ANY,
                description='Trigger result',
                optional=False
            ),
            'metadata': SchemaField(
                type=SchemaType.OBJECT,
                description='Execution metadata',
                optional=False,
                properties={
                    'node_type': SchemaField(type=SchemaType.STRING, description='Type of node'),
                    'trigger_type': SchemaField(type=SchemaType.STRING, description='Type of trigger'),
                    'trigger_id': SchemaField(type=SchemaType.STRING, description='ID of trigger'),
                    'service_name': SchemaField(type=SchemaType.STRING, description='Service name if applicable', optional=True),
                    'timestamp': SchemaField(type=SchemaType.STRING, description='Timestamp of trigger'),
                    'data_summary': SchemaField(type=SchemaType.STRING, description='Summary of data', optional=True),
                    'transformation_confidence': SchemaField(type=SchemaType.NUMBER, description='Confidence of data transformation', optional=True)
                }
            ),
            'error': SchemaField(
                type=SchemaType.STRING,
                description='Error message',
                optional=True
            ),
            'api_data': SchemaField(
                type=SchemaType.OBJECT,
                description='Data from API if applicable',
                optional=True
            ),
            'standard_records': SchemaField(
                type=SchemaType.ARRAY,
                description='Standardized records if applicable',
                optional=True
            )
        },
        required_fields=['result', 'metadata']
    ))

class TriggerNode(BaseNode):
    """Enhanced Trigger Node with schema support"""
    def get_config_model(self) -> type[BaseModel]:
        return TriggerNodeConfig

    async def process(self, node, inputs, context):
        return await super().process(node, inputs, context)


