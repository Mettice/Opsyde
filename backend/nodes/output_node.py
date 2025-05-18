from typing import Dict, Any, Optional
import logging
from datetime import datetime
import json

from backend.models.nodes import Node, NodeType
from backend.models.workflow import ExecutionContext
from backend.models.results import NodeResult, ExecutionStatus
from backend.models.data import NodeData

# Import output handlers
from backend.frameworks.email_notifier import send_email
from backend.frameworks.discord_notifier import send_discord_message
from backend.frameworks.sheets_logger import log_to_sheet
from backend.frameworks.webhook_runner import post_to_webhook, send_webhook

logger = logging.getLogger(__name__)

class OutputNode:
    """Handles execution of output nodes"""

    async def process(
        self, 
        node: Dict[str, Any], 
        inputs: Dict[str, NodeData], 
        context: Dict[str, Any]
    ) -> NodeData:
        """Process an output node"""
        try:
            # Extract output configuration
            config = node.get("data", {})
            
            # Debug log the incoming configuration
            logger.info(f"Output node config: {config}")
            
            # ================================================================
            # Check for output type in multiple locations with clear precedence
            # ================================================================
            
            # 1. First priority: Explicit outputType or output_type field
            output_type = config.get("outputType") or config.get("output_type")
            
            # 2. Second priority: Check if there's a config object with output_type
            if not output_type and config.get("config") and isinstance(config.get("config"), dict):
                output_type = config.get("config", {}).get("output_type") or config.get("config", {}).get("outputType")
            
            # 3. Third priority: Determine from available configuration fields
            if not output_type:
                # Detect from available configuration
                if config.get("email") or (config.get("config", {}) and config.get("config", {}).get("email")):
                    output_type = "email"
                elif config.get("webhook_url") or config.get("webhookUrl") or (config.get("config", {}) and (config.get("config", {}).get("url") or config.get("config", {}).get("webhook_url"))):
                    # Disambiguate between webhook and discord
                    if "discord" in str(config.get("webhook_url", "")) or "discord" in str(config.get("webhookUrl", "")):
                        output_type = "discord"
                    else:
                        output_type = "webhook"
                elif config.get("sheet_id") or config.get("sheetId") or (config.get("config", {}) and (config.get("config", {}).get("sheet_id") or config.get("config", {}).get("sheetId"))):
                    output_type = "sheets"
            
            # 4. Default if still not determined
            if not output_type:
                logger.warning("Output type not specified, defaulting to webhook")
                output_type = "webhook"
                
            # ================================================================
            # Normalize and extract configuration based on the determined type
            # ================================================================
            
            # Create a normalized configuration object based on the output type
            normalized_config = {}
            
            # Handle config nested in the config field or directly in the node data
            config_source = config.get("config", {}) if config.get("config") else config
            
            if output_type == "email":
                # Extract email configuration
                normalized_config["email"] = config_source.get("email")
                normalized_config["subject"] = config_source.get("subject", "Workflow Results")
                
            elif output_type == "webhook":
                # Extract webhook configuration
                normalized_config["url"] = (
                    config_source.get("url") or 
                    config_source.get("webhookUrl") or 
                    config_source.get("webhook_url")
                )
                
            elif output_type == "discord":
                # Extract discord configuration
                normalized_config["webhook_url"] = (
                    config_source.get("webhook_url") or 
                    config_source.get("webhookUrl") or 
                    config_source.get("url")
                )
                
            elif output_type == "sheets":
                # Extract sheets configuration
                normalized_config["sheet_id"] = (
                    config_source.get("sheet_id") or 
                    config_source.get("sheetId")
                )
            
            # Log the normalized configuration
            logger.info(f"Output type: {output_type}")
            logger.info(f"Normalized config: {normalized_config}")

            # Debug log the inputs
            logger.info(f"Output node inputs: {inputs}")

            # Validate configuration
            if not self.validate_config({"output_type": output_type, "config": normalized_config}):
                error_msg = f"Invalid output configuration for {output_type}: {normalized_config}"
                logger.error(error_msg)
                return NodeData.from_error(error_msg)

            # Extract output value from inputs
            if not inputs:
                logger.warning("No inputs provided to output node")
                return NodeData.from_error("No inputs provided to output node")

            # Get the first input that doesn't have an error
            input_data = None
            for key, value in inputs.items():
                if hasattr(value, 'is_error') and callable(value.is_error) and not value.is_error():
                    input_data = value
                    break

            if not input_data:
                # If all inputs have errors, use the first one
                input_data = next(iter(inputs.values()))

            if hasattr(input_data, 'is_error') and callable(input_data.is_error) and input_data.is_error():
                return input_data  # Propagate error

            # Extract the value
            output_value = self._extract_output_value(inputs)
            
            # If extracted value is None or empty, try to use the raw input value
            if output_value is None or (isinstance(output_value, (dict, list)) and not output_value):
                logger.warning("Could not extract specific output value, using raw input")
                try:
                    if hasattr(input_data, 'get_value') and callable(input_data.get_value):
                        output_value = input_data.get_value()
                    else:
                        output_value = input_data
                except Exception as e:
                    logger.error(f"Error getting input value: {str(e)}")
                    output_value = str(input_data)

            # Process based on output type
            result = await self._process_output(output_type, normalized_config, output_value)
            
            # Add metadata
            metadata = {
                "node_id": node.get("id"),
                "output_type": output_type,
                "execution_id": context.get("execution_id"),
                "timestamp": datetime.now().isoformat()
            }
            
            # For UI display, don't include the full result in the node itself
            # Just include a summary and status
            ui_result = {
                "type": f"{output_type}_result", 
                "success": result.get("success", True),
                "summary": "Output processed successfully" if result.get("success", True) else "Output processing failed",
                "output_type": output_type,
                "timestamp": datetime.now().isoformat()
            }
            
            # Add details to the UI result if there's an error
            if result.get("success") is False:
                ui_result["error"] = result.get("error") or result.get("message", "Unknown error")
            
            return NodeData(
                value=ui_result,
                metadata=metadata
            )

        except Exception as e:
            logger.error(f"Error in output node: {str(e)}")
            return NodeData.from_error(str(e))

    async def _process_output(
        self, 
        output_type: str, 
        config: Dict[str, Any], 
        value: Any
    ) -> Any:
        """Process output based on type"""
        handlers = {
            "email": self._process_email_output,
            "webhook": self._process_webhook_output,
            "discord": self._process_discord_output,
            "sheets": self._process_sheets_output
        }
        
        handler = handlers.get(output_type)
        if not handler:
            raise ValueError(f"Unsupported output type: {output_type}")
            
        return await handler(config, value)

    def _extract_output_value(self, inputs: Dict[str, Any]) -> Any:
        """Extract output value from inputs"""
        if not isinstance(inputs, dict):
            return inputs

        # Debug the input structure
        logger.debug(f"Extracting output from inputs: {inputs}")

        # Check for task_result type input
        for key, val in inputs.items():
            if isinstance(val, dict) and val.get('value') and isinstance(val['value'], dict) and val['value'].get('data'):
                data = val['value'].get('data', {})
                if data.get('type') == 'task_result' and 'result' in data:
                    logger.info(f"Found task result: {data['result']}")
                    return data['result']

        # First, look for task results which have a specific structure
        for key, val in inputs.items():
            if isinstance(val, dict):
                # Check if this is a task result structure
                if 'value' in val and isinstance(val['value'], dict) and 'data' in val['value']:
                    task_data = val['value'].get('data', {})
                    # Check if we have a result field
                    if 'result' in task_data:
                        return task_data['result']
                    # If no result, return the task data
                    return task_data

        # Try to find direct output or value
        for key, val in inputs.items():
            if isinstance(val, dict):
                if "output" in val:
                    return val["output"]
                elif "value" in val:
                    if isinstance(val["value"], dict):
                        if "text_output" in val["value"]:
                            return val["value"]["text_output"]
                        elif "output" in val["value"]:
                            return val["value"]["output"]
                        elif "result" in val["value"]:
                            return val["value"]["result"]
                        elif "data" in val["value"] and "result" in val["value"]["data"]:
                            return val["value"]["data"]["result"]
                    return val["value"]
                elif "text_output" in val:
                    return val["text_output"]
                elif "result" in val:
                    return val["result"]

        # If no direct match, try to get the object's value property if it exists
        for key, val in inputs.items():
            if hasattr(val, 'get_value'):
                try:
                    return val.get_value()
                except Exception as e:
                    logger.error(f"Error getting value from input: {str(e)}")

        # If no direct match, return the first non-empty value
        for key, val in inputs.items():
            if val:
                return val

        return inputs

    async def _process_email_output(self, config: Dict[str, Any], output_value: Any) -> Dict[str, Any]:
        """Process email output"""
        try:
            recipient = config.get("email")
            if not recipient:
                return {
                    "success": False,
                    "type": "error",
                    "error": "No email recipient specified"
                }

            subject = config.get("subject", "Workflow Results")
            
            # Convert output_value to a string if it's not already one
            if isinstance(output_value, dict):
                try:
                    body = json.dumps(output_value, indent=2)
                except:
                    body = str(output_value)
            else:
                body = str(output_value)

            # Call the send_email function and properly await it
            result = await send_email(recipient, subject, body)
            
            # Format the response data for display
            return {
                "success": result.get("success", False),
                "type": "email_result",
                "data": {
                    "recipient": recipient,
                    "subject": subject,
                    "message": result.get("message", ""),
                },
                "error": None if result.get("success", False) else result.get("message", "Email sending failed")
            }
        except Exception as e:
            logger.error(f"Email error: {str(e)}")
            return {
                "success": False,
                "type": "error",
                "error": f"Email error: {str(e)}"
            }

    async def _process_webhook_output(self, config: Dict[str, Any], output_value: Any) -> Dict[str, Any]:
        """Process webhook output"""
        try:
            url = config.get("url")
            if not url:
                return {
                    "success": False,
                    "type": "error",
                    "error": "No webhook URL specified"
                }

            # Use post_to_webhook instead of send_webhook for better error handling
            result = await post_to_webhook(url, output_value)
            return {
                "success": True,
                "type": "webhook_result",
                "data": result
            }
        except Exception as e:
            logger.error(f"Webhook error: {str(e)}")
            return {
                "success": False,
                "type": "error",
                "error": f"Webhook error: {str(e)}"
            }

    async def _process_discord_output(self, config: Dict[str, Any], output_value: Any) -> Dict[str, Any]:
        """Process Discord output"""
        try:
            webhook_url = config.get("webhook_url")
            if not webhook_url:
                return {
                    "success": False,
                    "type": "error",
                    "error": "No Discord webhook URL specified"
                }

            result = await send_discord_message(str(output_value), webhook_url, config)
            return {
                "success": True,
                "type": "discord_result",
                "data": result
            }
        except Exception as e:
            return {
                "success": False,
                "type": "error",
                "error": f"Discord error: {str(e)}"
            }

    async def _process_sheets_output(self, config: Dict[str, Any], output_value: Any) -> Dict[str, Any]:
        """Process Google Sheets output"""
        try:
            sheet_id = config.get("sheet_id")
            if not sheet_id:
                return {
                    "success": False,
                    "type": "error",
                    "error": "No sheet ID specified"
                }

            result = await log_to_sheet(sheet_id, output_value)
            return {
                "success": True,
                "type": "sheets_result",
                "data": result
            }
        except Exception as e:
            return {
                "success": False,
                "type": "error",
                "error": f"Sheets error: {str(e)}"
            }

    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Validate output configuration"""
        if not config:
            return False
            
        output_type = config.get("output_type") or config.get("outputType")
        if not output_type:
            return False
            
        config_data = config.get("config", {})

        output_validators = {
            "email": self._validate_email_config,
            "webhook": self._validate_webhook_config,
            "discord": self._validate_discord_config,
            "sheets": self._validate_sheets_config
        }

        validator = output_validators.get(output_type)
        return validator(config_data) if validator else False

    def _validate_email_config(self, config: Dict[str, Any]) -> bool:
        """Validate email output configuration"""
        has_email = bool(config.get("email"))
        if not has_email:
            logger.warning("Email configuration missing recipient email")
        return has_email

    def _validate_webhook_config(self, config: Dict[str, Any]) -> bool:
        """Validate webhook output configuration"""
        has_url = bool(config.get("url"))
        if not has_url:
            logger.warning("Webhook configuration missing URL")
        return has_url

    def _validate_discord_config(self, config: Dict[str, Any]) -> bool:
        """Validate Discord output configuration"""
        has_webhook = bool(config.get("webhook_url"))
        if not has_webhook:
            logger.warning("Discord configuration missing webhook URL")
        return has_webhook

    def _validate_sheets_config(self, config: Dict[str, Any]) -> bool:
        """Validate Google Sheets output configuration"""
        has_sheet_id = bool(config.get("sheet_id"))
        if not has_sheet_id:
            logger.warning("Sheets configuration missing sheet ID")
        return has_sheet_id 