# backend/nodes/tool_node.py - Enhanced with Framework Registry Integration
from typing import Dict, Any, Optional
import logging
from datetime import datetime
import aiohttp
import json

from models.nodes import Node, NodeType, ToolType, ToolConfig
from models.workflow import ExecutionContext
from models.results import NodeResult, ExecutionStatus
from models.data import NodeData

# Import the enhanced framework registry
from framework_registry import framework_registry

# Import tool-specific handlers (fallback for direct tool types)
from tools.llm_tools import run_llm_tool
from tools.api_tools import run_api_tool
from tools.webhook_tools import run_webhook_tool
from tools.custom_tools import run_custom_tool

# NEW: Import universal API runner
from universal_api_runner import run_universal_api_tool

logger = logging.getLogger(__name__)

class ToolNode:
    """Enhanced tool node with framework registry integration"""

    async def process(self, node: Node, inputs: Dict[str, Any], context: ExecutionContext) -> Dict[str, Any]:
        """Process tool node with enhanced framework registry integration"""
        try:
            # Migrate old node data format if needed
            node_data = self._migrate_node_data(node.data)
            
            # Extract and validate tool configuration
            config = ToolConfig(**node_data)
            
            # First, try to get framework handler from registry
            framework_handler = framework_registry._frameworks.get(config.framework)
            if framework_handler:
                return await self._execute_with_framework_handler(
                    framework_handler, 
                    config.dict(), 
                    inputs, 
                    context
                )
            
            # Fallback to processing based on tool type
            tool_type = config.tool_type
            
            if tool_type == "llm":
                result = await self._process_llm_tool(config.framework, config.dict(), inputs)
            elif tool_type == "api":
                result = await self._process_api_tool(config.dict(), inputs)
            elif tool_type == "webhook":
                result = await self._process_webhook_tool(config.dict(), inputs)
            elif tool_type == "universal_api":  # Universal API support
                result = await self._process_universal_api_tool(node_data, inputs, context)
            elif tool_type == "custom":
                result = await self._process_custom_tool(config.dict(), inputs)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported tool type: {tool_type}",
                    "type": "tool_error"
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
        framework_config: Dict[str, Any], 
        inputs: Dict[str, Any], 
        context: ExecutionContext
    ) -> Dict[str, Any]:
        """Execute tool using framework handler from registry"""
        try:
            # Execute with the framework handler - pass config and inputs as separate parameters
            result = await framework_handler(config=framework_config, inputs=inputs)
            
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
            from backend.frameworks.universal_api_runner import UniversalAPIRunner
            
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
            import os
            return {
                "openai_key": os.getenv("OPENAI_API_KEY"),
                "anthropic_key": os.getenv("ANTHROPIC_API_KEY"),
                "openrouter_key": os.getenv("OPENROUTER_API_KEY")
            }
        except Exception as e:
            logger.warning(f"Could not get user API keys from context: {str(e)}")
            return {}

    async def _process_llm_tool(self, framework: str, config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Process LLM-based tool"""
        try:
            result = await run_llm_tool(framework, config, inputs)
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

# Register enhanced handler function
async def process_tool_node(
    node_data: Dict[str, Any], 
    inputs: Dict[str, NodeData], 
    context: Dict[str, Any] = None
) -> NodeData:
    """Enhanced process function for tool nodes with Universal API support"""
    from backend.models.data import NodeData
    from backend.models.workflow import ExecutionContext
    
    tool_node = ToolNode()
    
    # Convert to expected format
    node = Node(
        id=node_data.get("nodeId") or node_data.get("id") or "tool-node",
        type=NodeType.TOOL,
        data=node_data,
        position={"x": 0, "y": 0}  # Placeholder position
    )
    
    # Create execution context
    execution_context = ExecutionContext(
        workflow_id=context.get("workflow_id", "unknown") if context else "unknown",
        execution_id=context.get("execution_id", "direct-execution") if context else "direct-execution",
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