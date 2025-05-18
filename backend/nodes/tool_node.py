from typing import Dict, Any, Optional
import logging
from datetime import datetime
import aiohttp

from backend.models.nodes import Node, NodeType, ToolType
from backend.models.workflow import ExecutionContext
from backend.models.results import NodeResult, ExecutionStatus

# Import tool-specific handlers
from backend.tools.llm_tools import run_llm_tool
from backend.tools.api_tools import run_api_tool
from backend.tools.webhook_tools import run_webhook_tool
from backend.tools.custom_tools import run_custom_tool

logger = logging.getLogger(__name__)

class ToolNode:
    """Handles execution of tool nodes"""

    async def process(self, node: Node, inputs: Dict[str, Any], context: ExecutionContext) -> Dict[str, Any]:
        """Process a tool node"""
        try:
            # Extract tool configuration
            config = node.get_config()
            tool_type = config.tool_type
            framework = config.framework
            framework_config = config.framework_config
            parameters = config.parameters

            # Validate tool configuration
            if not self.validate_config(config):
                return {
                    "success": False,
                    "type": "error",
                    "error": "Invalid tool configuration"
                }

            # Process based on tool type
            if tool_type == ToolType.LLM:
                result = await self._process_llm_tool(framework, framework_config, inputs)
            elif tool_type == ToolType.API:
                result = await self._process_api_tool(framework_config, inputs)
            elif tool_type == ToolType.WEBHOOK:
                result = await self._process_webhook_tool(framework_config, inputs)
            elif tool_type == ToolType.CUSTOM:
                result = await self._process_custom_tool(framework_config, inputs)
            else:
                return {
                    "success": False,
                    "type": "error",
                    "error": f"Unsupported tool type: {tool_type}"
                }

            # Add tool metadata
            result["metadata"] = {
                "node_id": node.id,
                "tool_type": tool_type,
                "framework": framework,
                "execution_id": context.execution_id,
                "parameters": parameters
            }

            return result

        except Exception as e:
            logger.error(f"Error in tool node: {str(e)}")
            return {
                "success": False,
                "type": "error",
                "error": str(e),
                "tool_type": tool_type if 'tool_type' in locals() else "unknown",
                "timestamp": datetime.now().isoformat()
            }

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
        """Validate tool configuration"""
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
        return False

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