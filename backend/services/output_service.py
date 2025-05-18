from typing import Dict, Any, Optional
import logging
from fastapi import HTTPException
import json
from datetime import datetime

from backend.utils.logging import get_logger
from backend.services.base_service import BaseService
from backend.frameworks.email_notifier import send_email
from backend.frameworks.sheets_logger import log_to_sheet
from backend.frameworks.discord_notifier import run_discord_notifier
from backend.frameworks.webhook_runner import post_to_webhook
from backend.models.types import OutputType
from backend.outputs.output_handlers import get_handler
from backend.output_utils import validate_output_config

logger = get_logger(__name__)

class OutputService(BaseService):
    """Service for handling different types of outputs"""

    async def send_email(self, to_email: str, subject: str, body: str) -> Dict[str, Any]:
        """Send an email"""
        try:
            logger.info(f"Sending email to {to_email}")
            result = await send_email(to_email, subject, body)
            
            if not result.get("success"):
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to send email: {result.get('error')}"
                )
                
            return {
                "success": True,
                "message": "Email sent successfully",
                "details": result
            }
            
        except Exception as e:
            logger.error(f"Error sending email: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def export_to_sheets(self, data: Dict[str, Any], sheet_name: str) -> Dict[str, Any]:
        """Export data to Google Sheets"""
        try:
            logger.info(f"Exporting to sheet: {sheet_name}")
            result = await log_to_sheet(data, sheet_name)
            
            if not result.get("success"):
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to export to sheets: {result.get('error')}"
                )
                
            return {
                "success": True,
                "message": "Data exported to sheets successfully",
                "details": result
            }
            
        except Exception as e:
            logger.error(f"Error exporting to sheets: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def post_to_discord(self, content: str, webhook_url: str) -> Dict[str, Any]:
        """Post content to Discord"""
        try:
            logger.info("Posting to Discord")
            result = await run_discord_notifier(content, webhook_url)
            
            if not result.get("success"):
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to post to Discord: {result.get('error')}"
                )
                
            return {
                "success": True,
                "message": "Posted to Discord successfully",
                "details": result
            }
            
        except Exception as e:
            logger.error(f"Error posting to Discord: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def process_output(
        self, 
        output_type: OutputType,
        data: Any,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process output using appropriate handler"""
        try:
            # Validate configuration
            if not validate_output_config(output_type, config):
                return {
                    "success": False,
                    "error": "Invalid output configuration",
                    "timestamp": datetime.now().isoformat()
                }

            # Get appropriate handler
            handler = get_handler(output_type)
            
            # Process output
            result = await handler.send(data, config)
            
            return result

        except Exception as e:
            logger.error(f"Output processing error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    async def process_multiple_outputs(
        self,
        outputs: Dict[OutputType, Dict[str, Any]],
        data: Any
    ) -> Dict[str, Any]:
        """Process multiple outputs with the same data"""
        results = {}
        
        for output_type, config in outputs.items():
            results[output_type] = await self.process_output(
                output_type=output_type,
                data=data,
                config=config
            )
            
        return {
            "success": all(r["success"] for r in results.values()),
            "results": results,
            "timestamp": datetime.now().isoformat()
        }

    def _extract_output_value(self, inputs: Dict[str, Any]) -> Any:
        """Extract the output value from input data"""
        if isinstance(inputs, dict):
            # Try to find direct output or value
            for key, val in inputs.items():
                if isinstance(val, dict):
                    if "output" in val:
                        return val["output"]
                    elif "value" in val:
                        return val["value"]
                    elif "text_output" in val:
                        return val["text_output"]
            
            # If no direct match, return the first non-empty value
            for val in inputs.values():
                if val:
                    return val
                    
        return inputs

    def _format_email_content(self, content: Any) -> str:
        """Format content for email body"""
        return f"""
CrewFlow Execution Results
===========================

Time: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

{content}
"""

    def _format_discord_message(self, content: Any) -> str:
        """Format content for Discord message"""
        if isinstance(content, (dict, list)):
            return f"```json\n{json.dumps(content, indent=2)}\n```"
        return str(content)

    async def process_output_node(self, node_data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Process an output node"""
        try:
            from backend.nodes.output_node import OutputNode
            
            # Get the node ID for logging
            node_id = node_data.get('id', 'unknown')
            logger.info(f"Processing output node: {node_id}")
            
            # Convert inputs to NodeData objects
            from backend.models.data import NodeData
            node_inputs = {}
            for key, value in inputs.items():
                if isinstance(value, dict) and ('value' in value or 'error' in value):
                    # Input is already in a format compatible with NodeData
                    if 'error' in value and value['error']:
                        node_inputs[key] = NodeData.from_error(value['error'])
                    else:
                        node_inputs[key] = NodeData(
                            value=value.get('value'),
                            metadata=value.get('metadata', {})
                        )
                else:
                    # Convert simple value to NodeData
                    node_inputs[key] = NodeData(value=value)
            
            # Process the output node
            output_node = OutputNode()
            result = await output_node.process(node_data, node_inputs, {'execution_id': 'api-execution'})
            
            # Format the response
            if result.is_error():
                return {
                    "success": False,
                    "error": result.get_error(),
                    "timestamp": datetime.now().isoformat(),
                    "node_id": node_id
                }
            else:
                return {
                    "success": True,
                    "value": result.get_value(),
                    "metadata": result.get_metadata(),
                    "timestamp": datetime.now().isoformat(),
                    "node_id": node_id
                }
                
        except Exception as e:
            logger.error(f"Error processing output node: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            } 