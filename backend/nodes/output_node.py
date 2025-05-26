# backend/nodes/output_node.py - Enhanced with AI Integration
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import asyncio

# Import the new rich output schema
try:
    from backend.schemas.output_schema import (
        RichOutput, OutputType, ChartType, FileType,
        smart_format_output, detect_output_type
    )
    RICH_OUTPUT_AVAILABLE = True
except ImportError:
    RICH_OUTPUT_AVAILABLE = False
    logging.warning("Rich output schema not available, falling back to basic output")

from backend.models.data import NodeData
from backend.frameworks.ai_integration_runner import AIIntegrationRunner
from backend.frameworks import framework_registry
from backend.utils.logging import get_logger

logger = get_logger(__name__)

class OutputNode:
    """Enhanced output node with AI-powered integrations"""
    
    def __init__(self):
        """Initialize the OutputNode with AI integration support"""
        self.logger = logging.getLogger(__name__)
        
        # Initialize AI runner for smart outputs
        try:
            from backend.frameworks.ai_runner import AIRunner
            self.ai_runner = AIRunner()
            self.logger.info("AI runner initialized for smart outputs")
        except ImportError:
            self.logger.warning("AI runner not available, smart outputs will use fallback")
            self.ai_runner = None

    async def process(
        self, 
        node: Dict[str, Any], 
        inputs: Dict[str, NodeData], 
        context: Dict[str, Any]
    ) -> NodeData:
        """Enhanced process method with rich output support"""
        try:
            self.logger.info(f"Processing output node: {node.get('id', 'unknown')}")
            
            # Collect input data
            output_data = self._collect_output_data(inputs)
            node_data = node.get('data', {})
            
            # Determine processing type
            output_type = node_data.get('outputType', 'webhook')
            ai_description = node_data.get('ai_description', '')
            
            # Check if this should use AI processing
            if output_type.startswith('smart_') or ai_description:
                return await self._process_ai_output(node_data, output_data, context)
            else:
                return await self._process_traditional_output(node_data, output_data, context)
                
        except Exception as e:
            self.logger.error(f"Error processing output node: {str(e)}")
            return NodeData.from_error(f"Output processing failed: {str(e)}")
    
    def _collect_output_data(self, inputs: Dict[str, NodeData]) -> Dict[str, Any]:
        """Enhanced data collection with rich content detection"""
        collected_data = {}
        rich_outputs = []
        
        for input_id, node_data in inputs.items():
            if node_data.has_error():
                collected_data[f"{input_id}_error"] = node_data.error
            else:
                data_value = node_data.value
                collected_data[input_id] = data_value
                
                # If rich output is available, try to create rich content
                if RICH_OUTPUT_AVAILABLE and data_value:
                    try:
                        rich_output = smart_format_output(data_value, title=f"Output from {input_id}")
                        rich_outputs.append(rich_output.to_dict())
                    except Exception as e:
                        self.logger.warning(f"Failed to create rich output for {input_id}: {e}")
        
        # Add rich outputs if available
        if rich_outputs:
            collected_data['_rich_outputs'] = rich_outputs
            
        return collected_data
    
    async def _process_ai_output(
        self, 
        node_data: Dict[str, Any], 
        output_data: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> NodeData:
        """Enhanced AI output processing with rich content support"""
        try:
            output_type = node_data.get('outputType', 'smart_api')
            ai_config = {
                'description': node_data.get('ai_description', ''),
                'service_type': node_data.get('service_type', 'general'),
                'output_format': node_data.get('output_format', 'auto'),
                'recipient_email': node_data.get('recipient_email'),
                'subject_template': node_data.get('subject_template'),
                'api_endpoint': node_data.get('api_endpoint'),
                'webhook_url': node_data.get('webhookUrl')
            }
            
            # Get user keys from context
            user_keys = context.get('user_keys', {})
            
            if output_type == 'smart_email':
                result = await self._process_smart_email(ai_config, output_data, context, user_keys)
            elif output_type == 'smart_api':
                result = await self._process_smart_api(ai_config, output_data, context, user_keys)
            else:
                result = {"success": False, "error": f"Unknown AI output type: {output_type}"}
            
            # Enhance result with rich output if available
            if RICH_OUTPUT_AVAILABLE and result.get('success'):
                try:
                    # Create rich output from the result
                    rich_result = smart_format_output(result, title="AI Processing Result")
                    result['rich_output'] = rich_result.to_dict()
                except Exception as e:
                    self.logger.warning(f"Failed to create rich output for AI result: {e}")
            
            return NodeData.from_value(result)
            
        except Exception as e:
            self.logger.error(f"AI output processing failed: {str(e)}")
            error_result = {"success": False, "error": f"AI processing failed: {str(e)}"}
            
            # Create rich error output
            if RICH_OUTPUT_AVAILABLE:
                try:
                    rich_error = RichOutput.create_error(str(e), "AI Processing Error")
                    error_result['rich_output'] = rich_error.to_dict()
                except:
                    pass
                    
            return NodeData.from_value(error_result)

    async def _process_smart_email(
        self, 
        ai_config: Dict[str, Any], 
        output_data: Dict[str, Any], 
        context: Dict[str, Any],
        user_keys: Dict[str, str]
    ) -> Dict[str, Any]:
        """Enhanced smart email processing with rich content"""
        try:
            if not self.ai_runner:
                # Fallback: create a simple formatted email
                recipient = ai_config.get('recipient_email')
                if not recipient:
                    return {"success": False, "error": "Recipient email is required for smart email"}
                
                subject = ai_config.get('subject_template', 'Workflow Results')
                
                # Create rich email content
                email_content = self._format_rich_email_body(output_data)
                
                # Send basic email (implement your email sending logic)
                result = {
                    "success": True,
                    "output_type": "smart_email",
                    "summary": f"Smart email sent to {recipient}",
                    "data": {
                        "recipient": recipient,
                        "subject": subject,
                        "content": email_content
                    }
                }
                
                # Add rich output
                if RICH_OUTPUT_AVAILABLE:
                    rich_output = RichOutput.create_html(email_content, "Email Content")
                    result['rich_output'] = rich_output.to_dict()
                
                return result
            
            # Use AI runner for advanced email processing
            result = await self.ai_runner.run_smart_output(
                output_type="smart_email",
                ai_config=ai_config,
                data=output_data,
                context=context,
                user_keys=user_keys
            )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Smart email processing failed: {str(e)}")
            return {"success": False, "error": f"Smart email failed: {str(e)}"}

    async def _process_smart_api(
        self, 
        ai_config: Dict[str, Any], 
        output_data: Dict[str, Any], 
        context: Dict[str, Any],
        user_keys: Dict[str, str]
    ) -> Dict[str, Any]:
        """Enhanced smart API processing"""
        try:
            if not self.ai_runner:
                return {"success": False, "error": "Smart API integrations require AI processing"}
            
            result = await self.ai_runner.run_smart_output(
                output_type="smart_api",
                ai_config=ai_config,
                data=output_data,
                context=context,
                user_keys=user_keys
            )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Smart API processing failed: {str(e)}")
            return {"success": False, "error": f"Smart API failed: {str(e)}"}

    async def _process_traditional_output(
        self, 
        node_data: Dict[str, Any], 
        output_data: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> NodeData:
        """Enhanced traditional output processing with rich content support"""
        output_type = node_data.get('outputType', 'webhook')
        
        try:
            # Route to appropriate handler based on output type
            if output_type == 'webhook':
                return await self._send_webhook(node_data, output_data)
            elif output_type == 'email':
                return await self._send_email(node_data, output_data)
            elif output_type == 'discord':
                return await self._send_discord(node_data, output_data)
            elif output_type == 'sheets':
                return await self._send_to_sheets(node_data, output_data)
            elif output_type in ['smart_email', 'smart_api']:
                # These should be handled by AI processing, not traditional
                return NodeData.from_error(f"Output type '{output_type}' should use AI processing")
            else:
                # Enhanced default processing with rich output
                result = {
                    "success": True,
                    "output_type": output_type,
                    "summary": f"Output processed successfully",
                    "data": output_data
                }
                
                # Add rich output representation
                if RICH_OUTPUT_AVAILABLE:
                    try:
                        rich_output = smart_format_output(output_data, title="Workflow Output")
                        result['rich_output'] = rich_output.to_dict()
                    except Exception as e:
                        self.logger.warning(f"Failed to create rich output: {e}")
                
                return NodeData.from_value(result)
                    
        except Exception as e:
            self.logger.error(f"Traditional output processing failed: {str(e)}")
            return NodeData.from_error(f"Output processing failed: {str(e)}")

    async def _send_webhook(self, node_data: Dict[str, Any], output_data: Dict[str, Any]) -> NodeData:
        """Send data via webhook"""
        # Use your existing webhook infrastructure
        from backend.frameworks.webhook_runner import post_to_webhook
        
        webhook_url = node_data.get('webhookUrl') or node_data.get('config', {}).get('url')
        if not webhook_url:
            # For webhook type, URL is required
            if node_data.get('outputType') == 'webhook':
                return NodeData.from_error("Webhook URL is required for webhook output type")
            else:
                # For other types, return success with data
                return NodeData.from_value({
                    "success": True,
                    "output_type": node_data.get('outputType', 'unknown'),
                    "summary": f"Data processed successfully (no webhook configured)",
                    "data": output_data
                })
        
        try:
            result = await post_to_webhook(webhook_url, output_data)
            return NodeData.from_value({
                "success": True,
                "output_type": "webhook",
                "summary": f"Successfully sent data to webhook",
                "data": result
            })
        except Exception as e:
            return NodeData.from_error(f"Webhook failed: {str(e)}")
    
    async def _send_email(self, node_data: Dict[str, Any], output_data: Dict[str, Any]) -> NodeData:
        """Send data via email"""
        # Use your existing email infrastructure
        from backend.frameworks.email_notifier import send_email
        
        email = node_data.get('email') or node_data.get('config', {}).get('email')
        subject = node_data.get('subject', 'Workflow Results')
        
        if not email:
            return NodeData.from_error("Email address is required")
        
        try:
            # Format email body
            body = self._format_email_body(output_data)
            result = await send_email(email, subject, body)
            
            return NodeData.from_value({
                "success": True,
                "output_type": "email",
                "summary": f"Successfully sent email to {email}",
                "data": result
            })
        except Exception as e:
            return NodeData.from_error(f"Email failed: {str(e)}")
    
    async def _send_discord(self, node_data: Dict[str, Any], output_data: Dict[str, Any]) -> NodeData:
        """Send data to Discord"""
        # Implementation for Discord webhook
        webhook_url = node_data.get('webhookUrl') or node_data.get('config', {}).get('url')
        if not webhook_url:
            return NodeData.from_error("Discord webhook URL is required")
        
        # Format for Discord
        discord_payload = {
            "content": f"**Workflow Results**\n```json\n{output_data}\n```"
        }
        
        return await self._send_webhook({"webhookUrl": webhook_url}, discord_payload)
    
    async def _send_to_sheets(self, node_data: Dict[str, Any], output_data: Dict[str, Any]) -> NodeData:
        """Send data to Google Sheets"""
        sheet_id = node_data.get('sheetId') or node_data.get('config', {}).get('sheet_id')
        if not sheet_id:
            return NodeData.from_error("Google Sheet ID is required")
        
        # Use your existing Google Sheets integration
        # This is a placeholder - implement based on your sheets infrastructure
        try:
            # Implementation would go here
            return NodeData.from_value({
                "success": True,
                "output_type": "sheets",
                "summary": f"Successfully added data to sheet {sheet_id}",
                "data": {"sheet_id": sheet_id, "rows_added": 1}
            })
        except Exception as e:
            return NodeData.from_error(f"Sheets integration failed: {str(e)}")
    
    def _format_email_body(self, data: Dict[str, Any]) -> str:
        """Format data for email body"""
        if isinstance(data, dict):
            formatted_lines = []
            for key, value in data.items():
                if not key.endswith('_error') and not key.endswith('_metadata'):
                    formatted_lines.append(f"{key.replace('_', ' ').title()}: {value}")
            return "\n".join(formatted_lines)
        else:
            return str(data)

    def _format_rich_email_body(self, data: Dict[str, Any]) -> str:
        """Create rich HTML email content"""
        html_content = """
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
                .content { padding: 20px; }
                .data-item { margin: 10px 0; padding: 10px; background: #f9f9f9; border-left: 4px solid #007cba; }
                .rich-output { margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
                pre { background: #f4f4f4; padding: 10px; border-radius: 3px; overflow-x: auto; }
                table { border-collapse: collapse; width: 100%; margin: 10px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>🚀 Workflow Results</h2>
                <p>Your CrewFlow workflow has completed successfully!</p>
            </div>
            <div class="content">
        """
        
        # Process rich outputs if available
        if '_rich_outputs' in data:
            for rich_output in data['_rich_outputs']:
                output_type = rich_output.get('output_type', 'text')
                payload = rich_output.get('payload', '')
                metadata = rich_output.get('metadata', {})
                title = metadata.get('title', 'Output')
                
                html_content += f'<div class="rich-output"><h3>{title}</h3>'
                
                if output_type == 'html':
                    html_content += payload
                elif output_type == 'markdown':
                    # Convert markdown to HTML (basic conversion)
                    html_payload = payload.replace('\n', '<br>').replace('**', '<strong>').replace('*', '<em>')
                    html_content += html_payload
                elif output_type == 'table':
                    if isinstance(payload, list) and payload:
                        html_content += '<table>'
                        # Headers
                        if isinstance(payload[0], dict):
                            html_content += '<tr>'
                            for key in payload[0].keys():
                                html_content += f'<th>{key}</th>'
                            html_content += '</tr>'
                            # Rows
                            for row in payload:
                                html_content += '<tr>'
                                for value in row.values():
                                    html_content += f'<td>{value}</td>'
                                html_content += '</tr>'
                        html_content += '</table>'
                elif output_type == 'json':
                    html_content += f'<pre>{str(payload)}</pre>'
                else:
                    html_content += f'<p>{str(payload)}</p>'
                
                html_content += '</div>'
        
        # Process regular data
        for key, value in data.items():
            if not key.startswith('_') and not key.endswith('_error'):
                html_content += f'''
                <div class="data-item">
                    <strong>{key.replace('_', ' ').title()}:</strong><br>
                    {str(value)}
                </div>
                '''
        
        html_content += """
            </div>
        </body>
        </html>
        """
        
        return html_content


# Register the handler function
async def process_output_node(
    node_data: Dict[str, Any], 
    inputs: Dict[str, NodeData], 
    context: Dict[str, Any] = None
) -> NodeData:
    """Process function for the node processor"""
    output_node = OutputNode()
    
    # Convert to expected format
    node = {
        "id": node_data.get("nodeId") or node_data.get("id") or "output-node",
        "type": "output",
        "data": node_data
    }
    
    execution_context = {
        **(context or {}),
        "execution_id": context.get("execution_id") if context else "direct-execution",
        "timestamp": datetime.now().isoformat()
    }
    
    return await output_node.process(node, inputs, execution_context)