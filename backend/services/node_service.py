from typing import Dict, Any, List, Optional
import logging
from fastapi import HTTPException

from utils.logging import get_logger
from services.base_service import BaseService
from core.node_processor import process_node
from core.graph import get_node_inputs
from models.nodes import NodeType

logger = get_logger(__name__)

class NodeService(BaseService):
    """Service for handling node operations"""

    async def execute_node(self, node_data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single node"""
        try:
            # Validate node data
            await self.validate_node(node_data)
            
            # Process the node
            logger.info(f"Executing node: {node_data.get('id')} of type {node_data.get('type')}")
            result = await process_node(node_data, inputs)
            
            return {
                "success": True,
                "node_id": node_data.get('id'),
                "type": "node_result",
                "result": result,
                "node_type": node_data.get('type')
            }
            
        except Exception as e:
            logger.error(f"Error executing node: {str(e)}")
            return {
                "success": False,
                "node_id": node_data.get('id'),
                "type": "error",
                "error": str(e),
                "node_type": node_data.get('type')
            }

    async def validate_node(self, node_data: Dict[str, Any]) -> None:
        """Validate node data before execution"""
        try:
            # Check required fields
            required_fields = ['id', 'type']
            missing_fields = [field for field in required_fields if field not in node_data]
            
            if missing_fields:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required fields: {', '.join(missing_fields)}"
                )
            
            # Validate node type
            node_type = node_data.get('type')
            if not NodeType.has_value(node_type):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid node type: {node_type}"
                )
            
            # Type-specific validation
            if node_type == NodeType.AGENT:
                self._validate_agent_node(node_data)
            elif node_type == NodeType.TASK:
                self._validate_task_node(node_data)
            elif node_type == NodeType.TOOL:
                self._validate_tool_node(node_data)
            elif node_type == NodeType.OUTPUT:
                self._validate_output_node(node_data)
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error validating node: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))

    def _validate_agent_node(self, node_data: Dict[str, Any]) -> None:
        """Validate agent node specific fields"""
        required = ['role', 'goal']
        missing = [field for field in required if not node_data.get(field)]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Agent node missing required fields: {', '.join(missing)}"
            )

    def _validate_task_node(self, node_data: Dict[str, Any]) -> None:
        """Validate task node specific fields"""
        required = ['description']
        missing = [field for field in required if not node_data.get(field)]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Task node missing required fields: {', '.join(missing)}"
            )

    def _validate_tool_node(self, node_data: Dict[str, Any]) -> None:
        """Validate tool node specific fields"""
        required = ['toolType', 'framework']
        missing = [field for field in required if not node_data.get(field)]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Tool node missing required fields: {', '.join(missing)}"
            )

    def _validate_output_node(self, node_data: Dict[str, Any]) -> None:
        """Validate output node specific fields"""
        output_type = node_data.get('outputType')
        if not output_type:
            raise HTTPException(
                status_code=400,
                detail="Output node missing outputType"
            )
            
        # Type-specific validation
        if output_type == 'email' and not node_data.get('email'):
            raise HTTPException(
                status_code=400,
                detail="Email output node missing email address"
            )
        elif output_type == 'webhook' and not node_data.get('webhookUrl'):
            raise HTTPException(
                status_code=400,
                detail="Webhook output node missing webhookUrl"
            )
        elif output_type == 'sheets' and not node_data.get('sheetId'):
            raise HTTPException(
                status_code=400,
                detail="Sheets output node missing sheetId"
            )

    async def get_node_inputs(self, node_id: str, edges: List[Dict], results: Dict[str, Any], global_inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Get inputs for a node from its dependencies"""
        try:
            return get_node_inputs(node_id, edges, results, global_inputs)
        except Exception as e:
            logger.error(f"Error getting node inputs: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e)) 