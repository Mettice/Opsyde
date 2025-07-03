# backend/nodes/tool_node.py - Enhanced with Framework Registry Integration
from typing import Dict, Any, Optional, List, Union
import logging
from datetime import datetime
import aiohttp
import json
import os
from pydantic import BaseModel, Field

from models.nodes import Node, NodeType, ToolType, ToolConfig
from models.workflow import ExecutionContext
from models.results import NodeResult, ExecutionStatus
from models.data import NodeData
from models.schemas import NodeSchema, SchemaField, SchemaType

# Import the enhanced framework registry
from framework_registry import framework_registry

# Import tool-specific handlers (fallback for direct tool types)
from tools.llm_tools import run_llm_tool
from tools.api_tools import run_api_tool
from tools.webhook_tools import run_webhook_tool
from tools.custom_tools import run_custom_tool

# NEW: Import universal API runner
from frameworks.universal_api_runner import run_universal_api_tool

from core.llm_runner import llm_runner
from nodes.base_node import BaseNode, NodeConfig
from utils.logging import get_logger

logger = get_logger(__name__)

class ToolNodeConfig(NodeConfig):
    """Configuration for Tool nodes"""
    label: str
    description: str
    toolType: str = Field(..., description="Type of tool")
    framework: str = Field(default="api", description="Framework to use")
    config: Dict[str, Any] = Field(default_factory=dict)
    is_async: bool = Field(default=False, description="Execute asynchronously")
    parameters: Dict[str, Any] = Field(default_factory=dict)
    retry_count: int = Field(default=3, ge=0)
    timeout: int = Field(default=30, gt=0)
    
    # Enhanced input schema for tools
    input_schema: NodeSchema = Field(default_factory=lambda: NodeSchema(
        fields={
            'input_data': SchemaField(
                type=SchemaType.ANY,
                description='Data to be processed by the tool',
                optional=False
            ),
            'parameters': SchemaField(
                type=SchemaType.OBJECT,
                description='Tool-specific parameters',
                optional=True
            ),
            'query': SchemaField(
                type=SchemaType.STRING,
                description='Query or request for the tool',
                optional=True
            ),
            'context': SchemaField(
                type=SchemaType.OBJECT,
                description='Context for tool execution',
                optional=True
            ),
            'config': SchemaField(
                type=SchemaType.OBJECT,
                description='Tool configuration parameters',
                optional=True
            )
        },
        required_fields=['input_data']
    ))
    
    # Enhanced output schema for tools
    output_schema: NodeSchema = Field(default_factory=lambda: NodeSchema(
        fields={
            'result': SchemaField(
                type=SchemaType.ANY,
                description='Tool execution result',
                optional=False
            ),
            'metadata': SchemaField(
                type=SchemaType.OBJECT,
                description='Execution metadata',
                optional=False,
                properties={
                    'tool_type': SchemaField(type=SchemaType.STRING, description='Type of tool used'),
                    'framework': SchemaField(type=SchemaType.STRING, description='Framework used'),
                    'execution_time': SchemaField(type=SchemaType.NUMBER, description='Execution time in seconds'),
                    'status': SchemaField(type=SchemaType.STRING, description='Execution status'),
                    'cost': SchemaField(type=SchemaType.NUMBER, description='Execution cost', optional=True)
                }
            ),
            'error': SchemaField(
                type=SchemaType.STRING,
                description='Error message if tool execution failed',
                optional=True
            )
        },
        required_fields=['result', 'metadata']
    ))

class ToolNode(BaseNode):
    """Enhanced tool node with framework registry integration"""

    def get_config_model(self) -> type[BaseModel]:
        return ToolNodeConfig

    async def process(self, node: Node, inputs: Dict[str, Any], context: ExecutionContext) -> Dict[str, Any]:
        """Process tool node with enhanced framework registry integration"""
        try:
            # Migrate old node data format if needed
            node_data = self._migrate_node_data(node.data)
            
            # Extract tool configuration
            tool_data = node_data.get('data', node_data)
            config = ToolConfig(**tool_data)
            
            # Check if this is an integration template
            framework_config = config.framework_config or {}
            is_integration_template = framework_config.get('isIntegrationTemplate', False)
            
            if is_integration_template:
                logger.info(f"🎯 Detected integration template for {framework_config.get('platform')}")
                # Process as integration template (skip Universal API research)
                result = await self._process_integration_template(node_data, inputs, context)
            else:
                # Process using existing framework handlers
                if config.framework in framework_registry.get_available_frameworks():
                    # Use registered framework handler
                    framework_handler = framework_registry.get_framework_handler(config.framework)
                    result = await self._execute_with_framework_handler(framework_handler, node_data, inputs, context)
                else:
                    # Use tool type processing (legacy)
                    tool_type = config.tool_type
                    
                    # Process inputs to extract actual values from NodeData
                    processed_inputs = {}
                    for key, value in inputs.items():
                        if hasattr(value, 'value'):
                            processed_inputs[key] = value.value
                        else:
                            processed_inputs[key] = value
                    
                    # Route to appropriate processor
                    if tool_type == ToolType.UNIVERSAL_API:
                        result = await self._process_universal_api_tool(node_data, processed_inputs, context)
                    elif tool_type == ToolType.LLM:
                        result = await self._process_llm_tool(config.dict(), processed_inputs)
                    elif tool_type == ToolType.API:
                        result = await self._process_api_tool(config.dict(), processed_inputs)
                    elif tool_type == ToolType.WEBHOOK:
                        result = await self._process_webhook_tool(config.dict(), processed_inputs)
                    elif tool_type == ToolType.CUSTOM:
                        result = await self._process_custom_tool(config.dict(), processed_inputs)
                    else:
                        return {
                            "type": "error",
                            "error": f"Unsupported tool type: {tool_type}",
                            "node_id": node.id
                        }
            
            return {
                "success": True,
                "result": result,
                "type": "tool_result",
                "metadata": {
                    "tool_type": tool_type,
                    "framework": config.framework,
                    "node_id": node.id
                }
            }
            
        except Exception as e:
            logger.error(f"Error in tool node: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "type": "tool_error"
            }

    def _migrate_node_data(self, node_data: Dict[str, Any]) -> Dict[str, Any]:
        """Migrate old node data format to new format"""
        migrated = dict(node_data)
        
        # Handle legacy field mappings
        if 'name' in migrated and 'label' not in migrated:
            migrated['label'] = migrated['name']
        
        # Ensure label is always present
        if 'label' not in migrated:
            migrated['label'] = migrated.get('description', 'Tool')
        
        # Ensure tool_type is set and valid
        if 'tool_type' not in migrated:
            if 'toolType' in migrated:
                migrated['tool_type'] = migrated['toolType']
            else:
                migrated['tool_type'] = 'api'  # default
        
        # Map invalid tool_type values to valid ones
        tool_type_mapping = {
            'search': 'api',
            'web_search': 'api',
            'scraper': 'api',
            'crawler': 'api',
            'data': 'api',
            'database': 'api',
            'file': 'custom',
            'email': 'api',
            'notification': 'webhook',
            'slack': 'webhook',
            'discord': 'webhook'
        }
        
        current_tool_type = migrated.get('tool_type', 'api')
        if current_tool_type in tool_type_mapping:
            migrated['tool_type'] = tool_type_mapping[current_tool_type]
        elif current_tool_type not in ['llm', 'api', 'webhook', 'custom', 'universal_api']:
            # If it's not a valid enum value and not in our mapping, default to 'api'
            migrated['tool_type'] = 'api'
        
        # Ensure framework is set
        if 'framework' not in migrated:
            migrated['framework'] = migrated.get('tool_type', 'api')
        
        # Handle parameters field
        if 'parameters' in migrated:
            if isinstance(migrated['parameters'], str):
                # Try to parse as JSON first
                try:
                    migrated['parameters'] = json.loads(migrated['parameters'])
                except json.JSONDecodeError:
                    # Parse as key-value pairs or simple list
                    # Handle both actual newlines and escaped newlines
                    param_str = migrated['parameters'].replace('\\n', '\n')
                    lines = param_str.split('\n')
                    param_dict = {}
                    for line in lines:
                        line = line.strip()
                        if line:
                            if ':' in line:
                                key, value = line.split(':', 1)
                                param_dict[key.strip()] = value.strip()
                            else:
                                # If no colon, treat as a parameter name with default value
                                param_dict[line] = ""
                    migrated['parameters'] = param_dict
        else:
            migrated['parameters'] = {}
        
        # Ensure frameworkConfig exists
        if 'frameworkConfig' not in migrated:
            migrated['frameworkConfig'] = {}
        
        return migrated

    async def _execute_with_framework_handler(
        self, 
        framework_handler, 
        node_data: Dict[str, Any], 
        inputs: Dict[str, Any], 
        context: ExecutionContext
    ) -> Dict[str, Any]:
        """Execute tool using framework handler from registry"""
        try:
            # Execute with the framework handler - pass config and inputs as separate parameters
            result = await framework_handler(config=node_data, inputs=inputs)
            
            if result.get("success", False):
                return {
                    "success": True,
                    "type": "framework_tool_result",
                    "data": result.get("data", {}),
                    "metadata": result.get("metadata", {}),
                    "execution_time": result.get("execution_time")
                }
            else:
                return {
                    "success": False,
                    "type": "framework_tool_error",
                    "error": result.get("error", "Framework tool execution failed"),
                    "details": result.get("details", {})
                }

        except Exception as e:
            logger.error(f"Framework handler execution error: {str(e)}")
            return {
                "success": False,
                "type": "error",
                "error": f"Framework handler execution error: {str(e)}"
            }

    async def _process_universal_api_tool(
        self, 
        node_data: Dict[str, Any], 
        inputs: Dict[str, Any], 
        context: ExecutionContext
    ) -> Dict[str, Any]:
        """Process Universal API tool with AI integration"""
        try:
            logger.info(f"Processing universal API tool: {node_data.get('api_service_name', 'Unknown')}")
            
            # Check if this is a research request or execution
            if node_data.get("api_service_name") and not node_data.get("api_research_result"):
                # This is a research request - perform API research first
                return await self._perform_api_research(node_data, context)
            
            # This is an execution request - run the configured API
            config = {
                "api_research_result": node_data.get("api_research_result", {}),
                "frameworkConfig": node_data.get("frameworkConfig", {}),
                "apiKey": node_data.get("apiKey"),
                "ai_generated": node_data.get("ai_generated", False)
            }
            
            # Extract input values from NodeData objects
            processed_inputs = {}
            for key, value in inputs.items():
                if hasattr(value, 'get_value'):
                    try:
                        processed_inputs[key] = value.get_value()
                    except Exception:
                        processed_inputs[key] = value.value if hasattr(value, 'value') else value
                else:
                    processed_inputs[key] = value
            
            # Execute the universal API tool
            result = await run_universal_api_tool(config, processed_inputs)
            
            return {
                "success": result.get("success", False),
                "type": "universal_api_result",
                "data": result.get("data", {}),
                "metadata": result.get("metadata", {}),
                "error": result.get("error") if not result.get("success") else None
            }
            
        except Exception as e:
            logger.error(f"Universal API tool error: {str(e)}")
            return {
                "success": False,
                "type": "error",
                "error": f"Universal API tool error: {str(e)}"
            }

    async def _perform_api_research(
        self, 
        node_data: Dict[str, Any], 
        context: ExecutionContext
    ) -> Dict[str, Any]:
        """Perform API research for a universal API tool"""
        try:
            from frameworks.universal_api_runner import UniversalAPIRunner
            
            # Get user API keys for research
            user_keys = await self._get_user_api_keys_from_context(context)
            
            # Initialize runner and perform research
            runner = UniversalAPIRunner()
            research_result = await runner.research_api(
                service_name=node_data.get("api_service_name", "Unknown"),
                description=node_data.get("ai_description", ""),
                endpoint_hint=node_data.get("api_endpoint_hint"),
                user_keys=user_keys
            )
            
            if research_result.get("success"):
                return {
                    "success": True,
                    "type": "api_research_result",
                    "data": {
                        "research_completed": True,
                        "service_detected": research_result.get("service_name"),
                        "api_type": research_result.get("api_type"),
                        "base_url": research_result.get("base_url"),
                        "auth_type": research_result.get("auth_type"),
                        "confidence": research_result.get("confidence", 0.0),
                        "endpoints_found": len(research_result.get("endpoints", [])),
                        "ready_for_configuration": True
                    },
                    "metadata": {
                        "research_result": research_result,
                        "research_timestamp": datetime.now().isoformat()
                    }
                }
            else:
                return {
                    "success": False,
                    "type": "api_research_failed",
                    "error": research_result.get("error", "API research failed"),
                    "data": {
                        "suggestions": research_result.get("suggestions", []),
                        "service_name": node_data.get("api_service_name")
                    }
                }
                
        except Exception as e:
            logger.error(f"API research failed: {str(e)}")
            return {
                "success": False,
                "type": "error",
                "error": f"API research failed: {str(e)}"
            }

    async def _get_user_api_keys_from_context(self, context: ExecutionContext) -> Dict[str, str]:
        """Extract user API keys from execution context"""
        try:
            # Try to get from context
            user_keys = context.metadata.get("user_keys", {})
            if user_keys:
                return user_keys
            
            # Fallback to environment variables
            return {
                "openai_key": os.getenv("OPENAI_API_KEY"),
                "anthropic_key": os.getenv("ANTHROPIC_API_KEY"),
                "openrouter_key": os.getenv("OPENROUTER_API_KEY")
            }
        except Exception as e:
            logger.warning(f"Could not get user API keys from context: {str(e)}")
            return {}

    async def _process_llm_tool(self, config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Process LLM-based tool"""
        try:
            result = await run_llm_tool(config, inputs)
            return {
                "success": True,
                "type": "llm_result",
                "data": result
            }
        except Exception as e:
            return {
                "success": False,
                "type": "error",
                "error": f"LLM tool error: {str(e)}"
            }

    async def _process_api_tool(self, config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Process API tool"""
        try:
            # Extract API configuration
            url = config.get("url")
            method = config.get("method", "GET")
            headers = config.get("headers", {})
            body = config.get("body", {})

            if not url:
                return {
                    "success": False,
                    "type": "error",
                    "error": "Missing URL in API tool configuration"
                }

            result = await run_api_tool(url, method, headers, body, inputs)
            return {
                "success": True,
                "type": "api_result",
                "data": result
            }
        except Exception as e:
            return {
                "success": False,
                "type": "error",
                "error": f"API tool error: {str(e)}"
            }

    async def _process_webhook_tool(self, config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Process webhook tool"""
        try:
            # Extract webhook configuration
            url = config.get("url")
            headers = config.get("headers", {})
            
            if not url:
                return {
                    "success": False,
                    "type": "error",
                    "error": "Missing URL in webhook tool configuration"
                }

            # Merge inputs with any static data from config
            data = {**config.get("data", {}), **inputs}
            
            result = await run_webhook_tool(url, headers, data)
            return {
                "success": True,
                "type": "webhook_result",
                "data": result
            }
        except Exception as e:
            return {
                "success": False,
                "type": "error",
                "error": f"Webhook tool error: {str(e)}"
            }

    async def _process_custom_tool(self, config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Process custom tool"""
        try:
            result = await run_custom_tool(config, inputs)
            return {
                "success": True,
                "type": "custom_result",
                "data": result
            }
        except Exception as e:
            return {
                "success": False,
                "type": "error",
                "error": f"Custom tool error: {str(e)}"
            }

    async def _process_integration_template(
        self, 
        node_data: Dict[str, Any], 
        inputs: Dict[str, Any], 
        context: ExecutionContext
    ) -> Dict[str, Any]:
        """
        Process pre-configured integration templates efficiently
        """
        try:
            framework_config = node_data.get('frameworkConfig', {})
            platform = framework_config.get('platform')
            
            if not platform:
                return {
                    "success": False,
                    "error": "Platform not specified in integration template"
                }
            
            logger.info(f"🚀 Processing integration template for {platform}")
            
            # Import the social media runner
            from backend.frameworks.integration_runners.social_media_runner import social_media_runner
            
            # Extract input data
            input_data = {}
            for key, value in inputs.items():
                if hasattr(value, 'value'):
                    input_data[key] = value.value
                else:
                    input_data[key] = value
            
            # Execute the template
            result = await social_media_runner.execute_integration_template(
                platform=platform,
                action='default',  # Default action
                config=framework_config,
                inputs=input_data
            )
            
            logger.info(f"✅ Integration template result: {result.get('success', False)}")
            
            if result.get('success'):
                return {
                    "type": "integration_template_result",
                    "success": True,
                    "data": result.get('data'),
                    "platform": platform,
                    "message": result.get('message'),
                    "metadata": {
                        "template_type": "pre_configured",
                        "platform": platform,
                        "skipped_api_research": True
                    }
                }
            else:
                return {
                    "success": False,
                    "error": result.get('error', 'Integration template execution failed'),
                    "platform": platform
                }
                
        except Exception as e:
            logger.error(f"Error processing integration template: {str(e)}")
            return {
                "success": False,
                "error": f"Integration template processing failed: {str(e)}"
            }

    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Enhanced validation with Universal API support"""
        if not config.tool_type or not config.framework:
            return False

        if config.tool_type == ToolType.LLM:
            return self._validate_llm_config(config.framework_config)
        elif config.tool_type == ToolType.API:
            return self._validate_api_config(config.framework_config)
        elif config.tool_type == ToolType.WEBHOOK:
            return self._validate_webhook_config(config.framework_config)
        elif config.tool_type == ToolType.CUSTOM:
            return True  # Custom tools validate their own config
        elif config.tool_type == "universal_api":  # NEW: Universal API validation
            return self._validate_universal_api_config(config)
        return False

    def _validate_universal_api_config(self, config: Dict[str, Any]) -> bool:
        """Validate Universal API tool configuration"""
        # For universal API, we need either research parameters or research results
        has_research_params = (
            config.get("api_service_name") and 
            config.get("ai_description")
        )
        
        has_research_results = (
            config.get("api_research_result") and
            config.get("api_research_result", {}).get("success")
        )
        
        has_manual_config = (
            config.get("frameworkConfig", {}).get("url")
        )
        
        return has_research_params or has_research_results or has_manual_config

    def _validate_llm_config(self, config: Dict[str, Any]) -> bool:
        """Validate LLM tool configuration"""
        required = ['model']
        return all(key in config for key in required)

    def _validate_api_config(self, config: Dict[str, Any]) -> bool:
        """Validate API tool configuration"""
        required = ['url', 'method']
        return all(key in config for key in required)

    def _validate_webhook_config(self, config: Dict[str, Any]) -> bool:
        """Validate webhook tool configuration"""
        required = ['url']
        return all(key in config for key in required)

    async def _execute(self, config: BaseModel, inputs: Dict[str, NodeData], context: Dict[str, Any]) -> Any:
        """Execute the tool node"""
        try:
            # Convert config to dict for processing
            config_dict = config.dict() if hasattr(config, 'dict') else config
            
            # Process inputs to extract actual values from NodeData
            processed_inputs = {}
            for key, value in inputs.items():
                if isinstance(value, NodeData) and not value.is_error():
                    processed_inputs[key] = value.value
                elif not isinstance(value, NodeData):
                    processed_inputs[key] = value
            
            # Route to appropriate processor based on tool type
            tool_type = config_dict.get('toolType', 'api')
            
            if tool_type == 'llm':
                result = await self._process_llm_tool(config_dict, processed_inputs)
            elif tool_type == 'api':
                result = await self._process_api_tool(config_dict, processed_inputs)
            elif tool_type == 'webhook':
                result = await self._process_webhook_tool(config_dict, processed_inputs)
            elif tool_type == 'custom':
                result = await self._process_custom_tool(config_dict, processed_inputs)
            else:
                # Default to API tool
                result = await self._process_api_tool(config_dict, processed_inputs)
            
            return {
                "type": "tool_result",
                "output": result,
                "metadata": {
                    "tool_type": tool_type,
                    "framework": config_dict.get('framework', 'api'),
                    "timestamp": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Tool execution error: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "metadata": {
                    "timestamp": datetime.now().isoformat(),
                    "node_type": "tool"
                }
            }

# Register enhanced handler function
async def process_tool_node(
    node_data: Dict[str, Any], 
    inputs: Dict[str, NodeData], 
    context: Dict[str, Any] = None
) -> NodeData:
    """Enhanced process function for tool nodes with Universal API support"""
    from models.data import NodeData
    from models.workflow import ExecutionContext
    
    tool_node = ToolNode()
    
    # Convert to expected format
    # Extract the actual node data/configuration
    node_config = node_data.get('data', node_data.copy())
    
    # Ensure required fields exist for ToolConfig validation
    if 'label' not in node_config or not node_config['label']:
        node_config['label'] = f"Tool {node_data.get('nodeId', node_data.get('id', 'unknown'))}"
    
    if 'tool_type' not in node_config or not node_config['tool_type']:
        node_config['tool_type'] = 'api'  # Default tool type
        
    if 'framework' not in node_config or not node_config['framework']:
        node_config['framework'] = 'api'  # Default framework
    
    node = Node(
        id=node_data.get("nodeId") or node_data.get("id") or "tool-node",
        type=NodeType.TOOL,
        data=node_config,  # Use extracted config, not entire node_data
        position={"x": 0, "y": 0}  # Placeholder position
    )
    
    # Create execution context
    workflow_id = 'unknown'
    execution_id = 'direct-execution'
    
    if context:
        # Get workflow_id, but ensure it's not None
        context_workflow_id = context.get('workflow_id')
        if context_workflow_id is not None:
            workflow_id = context_workflow_id
            
        # Get execution_id, but ensure it's not None  
        context_execution_id = context.get('execution_id')
        if context_execution_id is not None:
            execution_id = context_execution_id
    
    execution_context = ExecutionContext(
        workflow_id=workflow_id,
        execution_id=execution_id,
        node_results={},
        global_inputs={},
        memory={},
        metadata={
            **(context or {}),
            "execution_timestamp": datetime.now().isoformat()
        }
    )
    
    # Convert inputs to expected format
    processed_inputs = {}
    for key, value in inputs.items():
        if isinstance(value, NodeData):
            processed_inputs[key] = value
        else:
            processed_inputs[key] = NodeData.from_value(value)
    
    # Process the tool node
    result = await tool_node.process(node, processed_inputs, execution_context)
    
    # Convert result to NodeData
    if isinstance(result, NodeData):
        return result
    elif isinstance(result, dict):
        if result.get("success", True) and not result.get("error"):
            return NodeData.from_value(result)
        else:
            return NodeData.from_error(result.get("error", "Tool execution failed"))
    else:
        return NodeData.from_value(result)