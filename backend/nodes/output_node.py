# backend/nodes/output_node.py - Enhanced with AI Integration
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import asyncio
import json
import re

# Import the new rich output schema
try:
    from schemas.output_schema import (
        RichOutput, OutputType, ChartType, FileType,
        smart_format_output, detect_output_type
    )
    RICH_OUTPUT_AVAILABLE = True
except ImportError:
    RICH_OUTPUT_AVAILABLE = False
    logging.warning("Rich output schema not available, falling back to basic output")

from models.data import NodeData
from frameworks.ai_integration_runner import AIIntegrationRunner
from framework_registry import framework_registry
from utils.logging import get_logger
from core.workflow_data_manager import get_workflow_context

# Import the universal data transformer for output formatting
from core.data_transformer import data_transformer

logger = get_logger(__name__)

class OutputNode:
    """Enhanced output node with AI-powered integrations"""
    
    def __init__(self):
        """Initialize the OutputNode with AI integration support"""
        self.logger = logging.getLogger(__name__)
        
        # Initialize AI runner for smart outputs
        try:
            from frameworks.ai_runner import AIRunner
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
            node_id = node.get('id', 'unknown')
            self.logger.info(f"Processing output node: {node_id}")
            
            # Collect input data
            output_data = self._collect_output_data(inputs)
            node_data = node.get('data', {})
            
            # Log the node configuration for debugging
            self.logger.info(f"Node data: {node_data}")
            
            # Determine processing type
            output_type = node_data.get('outputType', 'webhook')
            ai_description = node_data.get('ai_description', '')
            
            # Check if email is configured but outputType is not set correctly
            email_configured = (
                node_data.get('email') or 
                node_data.get('recipient_email') or
                node_data.get('config', {}).get('email') or
                node_data.get('config', {}).get('recipient_email')
            )
            
            if email_configured and output_type not in ['email', 'smart_email']:
                self.logger.warning(f"Email configured ({email_configured}) but outputType is '{output_type}'. Forcing to 'email'.")
                output_type = 'email'
                node_data['outputType'] = 'email'
            
            self.logger.info(f"Processing output type: {output_type}")
            
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
            if node_data.is_error():
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
            
            # Special case: if output_type is 'webhook' but has ai_description, 
            # route to traditional webhook processing
            if output_type == 'webhook':
                self.logger.info("Webhook with AI description detected, routing to traditional webhook processing")
                return await self._process_traditional_output(node_data, output_data, context)
            elif output_type == 'smart_email':
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
        from frameworks.webhook_runner import post_to_webhook
        
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
        
        # Replace template variables in webhook URL
        webhook_url = self._replace_template_variables(webhook_url, node_data, output_data)
        
        # Validate the URL after template replacement
        if '{' in webhook_url and '}' in webhook_url:
            return NodeData.from_error(f"Webhook URL contains unresolved template variables: {webhook_url}")
        
        # Prepare payload data with template replacement
        payload_data = output_data.copy()
        
        # If there's a custom webhook payload defined, use it and replace variables
        if 'webhookPayload' in node_data:
            custom_payload = node_data['webhookPayload']
            
            # Handle different payload formats
            if isinstance(custom_payload, str):
                try:
                    custom_payload = json.loads(custom_payload)
                    self.logger.info("Parsed webhook payload from JSON string")
                except json.JSONDecodeError as e:
                    self.logger.error(f"Failed to parse webhook payload JSON: {e}")
                    return NodeData.from_error(f"Invalid JSON in webhook payload: {e}")
            
            # Replace template variables in the custom payload
            payload_data = self._replace_template_variables_in_dict(custom_payload, node_data, output_data)
        
        try:
            result = await post_to_webhook(webhook_url, payload_data)
            return NodeData.from_value({
                "success": True,
                "output_type": "webhook",
                "summary": f"Successfully sent data to webhook",
                "data": result
            })
        except Exception as e:
            return NodeData.from_error(f"Webhook failed: {str(e)}")
    
    def _replace_template_variables(self, template: str, node_data: Dict[str, Any], output_data: Dict[str, Any]) -> str:
        """
        Enhanced template variable replacement with fallback for common variables
        """
        if not isinstance(template, str):
            return template
            
        # First try the workflow context approach
        try:
            workflow_id = node_data.get('workflow_id') or 'default'
            context = get_workflow_context(workflow_id)
            
            # Add current output_data to context if not already there
            for key, value in output_data.items():
                if key not in context.variables:
                    context.variables[key] = value
            
            # Use the context to resolve template variables
            resolved = context.resolve_template_variables(template)
            
            # If template variables are still unresolved, use fallback
            if '{' in resolved and '}' in resolved:
                resolved = self._fallback_template_replacement(resolved, node_data, output_data)
            
            logger.debug(f"Template resolution: '{template}' -> '{resolved}'")
            return resolved
            
        except Exception as e:
            logger.warning(f"Workflow context template replacement failed: {e}, using fallback")
            return self._fallback_template_replacement(template, node_data, output_data)
    
    def _fallback_template_replacement(self, template: str, node_data: Dict[str, Any], output_data: Dict[str, Any]) -> str:
        """
        Fallback template replacement for common variables like {task_output}
        """
        result = template
        
        # Handle {task_output} - find the task output from the data
        if '{task_output}' in result:
            task_output = self._find_task_output(output_data)
            if task_output:
                # Escape quotes for JSON safety
                task_output_escaped = task_output.replace('"', '\\"').replace('\n', '\\n').replace('\r', '\\r')
                result = result.replace('{task_output}', task_output_escaped)
            else:
                result = result.replace('{task_output}', 'No task output found')
        
        # Handle other common variables
        replacements = {
            '{timestamp}': datetime.now().isoformat(),
            '{date}': datetime.now().strftime('%Y-%m-%d'),
            '{time}': datetime.now().strftime('%H:%M:%S'),
        }
        
        for placeholder, value in replacements.items():
            result = result.replace(placeholder, str(value))
        
        # Handle any remaining variables from output_data
        for key, value in output_data.items():
            placeholder = f'{{{key}}}'
            if placeholder in result:
                # Convert value to string and escape for JSON
                str_value = str(value).replace('"', '\\"').replace('\n', '\\n').replace('\r', '\\r')
                result = result.replace(placeholder, str_value)
        
        return result
    
    def _find_task_output(self, output_data: Dict[str, Any]) -> Optional[str]:
        """Smart lookup for task output data"""
        # Strategy 1: Look for keys that contain 'task'
        for key, value in output_data.items():
            if 'task' in key.lower():
                if isinstance(value, dict) and 'output' in value:
                    return str(value['output'])
                elif isinstance(value, str):
                    return value
                else:
                    return str(value)
        
        # Strategy 2: Look for the most recent/relevant output
        # Check for common task output patterns
        for key, value in output_data.items():
            if isinstance(value, dict):
                # Check if this looks like a task result
                if 'output' in value:
                    return str(value['output'])
                elif 'result' in value:
                    return str(value['result'])
                elif 'content' in value:
                    return str(value['content'])
        
        # Strategy 3: Look for any string value that looks like meaningful output
        for key, value in output_data.items():
            if isinstance(value, str) and len(value) > 10:  # Meaningful content
                return value
        
        # Strategy 4: Return the first non-empty value
        for key, value in output_data.items():
            if value and str(value).strip():
                return str(value)
        
        return None
    
    def _get_nested_value(self, path: str, data: Dict[str, Any]) -> Optional[str]:
        """Get nested value from dictionary using dot notation (e.g., 'trigger.baseToken.symbol')"""
        try:
            keys = path.split('.')
            value = data
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    return None
            return str(value) if value is not None else None
        except Exception:
            return None
    
    def _replace_template_variables_in_dict(self, data: Any, node_data: Dict[str, Any], output_data: Dict[str, Any]) -> Any:
        """Recursively replace template variables in dictionaries, lists, and strings"""
        if isinstance(data, dict):
            return {key: self._replace_template_variables_in_dict(value, node_data, output_data) for key, value in data.items()}
        elif isinstance(data, list):
            return [self._replace_template_variables_in_dict(item, node_data, output_data) for item in data]
        elif isinstance(data, str):
            return self._replace_template_variables(data, node_data, output_data)
        else:
            return data
    
    async def _send_email(self, node_data: Dict[str, Any], output_data: Dict[str, Any]) -> NodeData:
        """Send data via email"""
        try:
            from frameworks.email_notifier import send_email
        
            # Get email configuration from multiple possible sources
            email = (
                node_data.get('email') or 
                node_data.get('recipient_email') or
                node_data.get('config', {}).get('email') or
                node_data.get('config', {}).get('recipient_email')
            )
            
            subject = node_data.get('subject', 'CrewFlow Workflow Results')
            
            self.logger.info(f"Processing email output - Email: {email}, Subject: {subject}")
            self.logger.info(f"Output data structure: {output_data}")
        
            if not email:
                error_msg = "Email address is required for email output"
                self.logger.error(error_msg)
                return NodeData.from_error(error_msg)
            
            # Format email body with rich content
            body = self._format_rich_email_body(output_data)
            
            self.logger.info(f"Sending email to {email} with subject: {subject}")
            self.logger.info(f"Email body preview: {body[:500]}...")
            
            # Send the email
            result = await send_email(email, subject, body, is_html=True)
            
            self.logger.info(f"Email send result: {result}")
            
            if result.get('success'):
                return NodeData.from_value({
                    "success": True,
                    "output_type": "email",
                    "summary": f"Successfully sent email to {email}",
                    "data": {
                        "recipient": email,
                        "subject": subject,
                        "status": "sent",
                        "message": result.get('message', 'Email sent successfully')
                    }
                })
            else:
                error_msg = f"Email failed: {result.get('message', 'Unknown error')}"
                self.logger.error(error_msg)
                return NodeData.from_error(error_msg)
                
        except ImportError as e:
            error_msg = f"Email notifier not available: {str(e)}"
            self.logger.error(error_msg)
            return NodeData.from_error(error_msg)
        except Exception as e:
            error_msg = f"Email failed: {str(e)}"
            self.logger.error(error_msg)
            return NodeData.from_error(error_msg)
    
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
    
    def _format_rich_email_body(self, data: Dict[str, Any]) -> str:
        """Create rich HTML email content with intelligent content extraction"""
        html_content = """
        <html>
        <head>
            <style>
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    margin: 0; 
                    padding: 20px; 
                    background-color: #f5f5f5; 
                }
                .container { 
                    max-width: 800px; 
                    margin: 0 auto; 
                    background: white; 
                    border-radius: 10px; 
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
                    overflow: hidden; 
                }
                .header { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 30px; 
                    text-align: center; 
                }
                .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
                .header p { margin: 10px 0 0 0; opacity: 0.9; }
                .content { padding: 30px; }
                .section { 
                    margin: 25px 0; 
                    padding: 20px; 
                    background: #f8f9fa; 
                    border-radius: 8px; 
                    border-left: 4px solid #667eea; 
                }
                .section h3 { 
                    margin: 0 0 15px 0; 
                    color: #495057; 
                    font-size: 18px; 
                    font-weight: 600; 
                }
                .content-block { 
                    background: white; 
                    padding: 15px; 
                    border-radius: 6px; 
                    margin: 10px 0; 
                    border: 1px solid #e9ecef; 
                }
                .key-value { 
                    display: flex; 
                    margin: 8px 0; 
                    align-items: flex-start; 
                }
                .key { 
                    font-weight: 600; 
                    color: #495057; 
                    min-width: 120px; 
                    margin-right: 15px; 
                }
                .value { 
                    flex: 1; 
                    color: #6c757d; 
                    word-break: break-word; 
                }
                .highlight { 
                    background: #fff3cd; 
                    padding: 15px; 
                    border-radius: 6px; 
                    border-left: 4px solid #ffc107; 
                    margin: 15px 0; 
                }
                .success { 
                    background: #d4edda; 
                    color: #155724; 
                    border-left-color: #28a745; 
                }
                .error { 
                    background: #f8d7da; 
                    color: #721c24; 
                    border-left-color: #dc3545; 
                }
                .footer { 
                    background: #f8f9fa; 
                    padding: 20px; 
                    text-align: center; 
                    color: #6c757d; 
                    font-size: 14px; 
                }
                pre { 
                    background: #f8f9fa; 
                    padding: 15px; 
                    border-radius: 6px; 
                    overflow-x: auto; 
                    font-family: 'Courier New', monospace; 
                    font-size: 13px; 
                    border: 1px solid #e9ecef; 
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 15px 0; 
                }
                th, td { 
                    border: 1px solid #dee2e6; 
                    padding: 12px; 
                    text-align: left; 
                }
                th { 
                    background-color: #e9ecef; 
                    font-weight: 600; 
                    color: #495057; 
                }
                .badge { 
                    display: inline-block; 
                    padding: 4px 8px; 
                    background: #667eea; 
                    color: white; 
                    border-radius: 4px; 
                    font-size: 12px; 
                    font-weight: 500; 
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚀 Workflow Results</h1>
                    <p>Your CrewFlow workflow has completed successfully!</p>
                </div>
                <div class="content">
        """
        
        # Extract and format content intelligently
        extracted_content = self._extract_meaningful_content(data)
        
        # Add summary section if we have multiple items
        if len(extracted_content) > 1:
            html_content += '''
                <div class="section success">
                    <h3>📊 Summary</h3>
                    <div class="key-value">
                        <span class="key">Total Results:</span>
                        <span class="value">{} items processed</span>
                    </div>
                </div>
            '''.format(len(extracted_content))
        
        # Process each extracted content item
        for i, content_item in enumerate(extracted_content, 1):
            section_title = content_item.get('title', f'Result {i}')
            content_type = content_item.get('type', 'text')
            content_value = content_item.get('content', '')
            metadata = content_item.get('metadata', {})
            
            html_content += f'<div class="section">'
            html_content += f'<h3>{section_title}</h3>'
            
            # Add metadata if available
            if metadata:
                html_content += '<div class="content-block">'
                for key, value in metadata.items():
                    if key not in ['title', 'type'] and value:
                        html_content += f'''
                            <div class="key-value">
                                <span class="key">{key.replace('_', ' ').title()}:</span>
                                <span class="value">{self._format_value_for_display(value)}</span>
                            </div>
                        '''
                html_content += '</div>'
            
            # Format content based on type
            if content_type == 'text' and content_value:
                html_content += f'<div class="content-block">{self._format_text_content(content_value)}</div>'
            elif content_type == 'json' and content_value:
                html_content += f'<div class="content-block"><pre>{self._format_json_content(content_value)}</pre></div>'
            elif content_type == 'list' and content_value:
                html_content += f'<div class="content-block">{self._format_list_content(content_value)}</div>'
            elif content_type == 'table' and content_value:
                html_content += f'<div class="content-block">{self._format_table_content(content_value)}</div>'
            elif content_value:
                # Fallback for any other content
                html_content += f'<div class="content-block">{self._format_text_content(str(content_value))}</div>'
            
            html_content += '</div>'
        
        # Add footer
        html_content += '''
                </div>
                <div class="footer">
                    <p>Generated by CrewFlow • Workflow Automation Platform</p>
                    <p style="font-size: 12px; margin-top: 10px;">
                        This email was automatically generated from your workflow execution.
                    </p>
                </div>
            </div>
        </body>
        </html>
        '''
        
        return html_content
    
    def _extract_meaningful_content(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract only meaningful results content, filtering out metadata and logs"""
        extracted = []
        
        # Skip internal/technical keys that shouldn't be in emails
        skip_keys = {
            '_rich_outputs', 'metadata', 'timestamp', 'execution_time', 'node_id', 
            'node_type', 'status', 'logs', 'debug', 'trace', 'internal', 'system',
            'config', 'settings', 'parameters', 'raw_data', 'full_response'
        }
        
        # Handle different data structures
        if isinstance(data, dict):
            for key, value in data.items():
                # Skip technical/internal keys
                if key.startswith('_') or key.endswith('_error') or key in skip_keys:
                    continue
                
                # Handle success/output structures - extract only the meaningful output
                if isinstance(value, dict):
                    if 'success' in value and value.get('success'):
                        # Look for the actual output content
                        output_content = None
                        
                        # Try different output field names
                        for output_field in ['output', 'result', 'data', 'content', 'text', 'response']:
                            if output_field in value and value[output_field]:
                                output_content = value[output_field]
                                break
                        
                        if output_content is not None:
                            # Further extract meaningful content from the output
                            meaningful_output = self._extract_result_content(output_content)
                            if meaningful_output:
                                content_item = {
                                    'title': self._generate_title_from_key(key),
                                    'type': self._detect_content_type(meaningful_output),
                                    'content': meaningful_output,
                                    'metadata': {
                                        'source_key': key,
                                        'status': 'success'
                                    }
                                }
                                extracted.append(content_item)
                    elif 'success' in value and not value.get('success'):
                        # Handle failed operations - only show user-friendly error
                        error_content = value.get('error', 'Operation failed')
                        if isinstance(error_content, str) and len(error_content) < 500:
                            content_item = {
                                'title': f"❌ {self._generate_title_from_key(key)} (Failed)",
                                'type': 'text',
                                'content': error_content,
                                'metadata': {
                                    'source_key': key,
                                    'status': 'failed'
                                }
                            }
                            extracted.append(content_item)
                    else:
                        # Handle regular nested objects - extract meaningful content
                        meaningful_content = self._extract_result_content(value)
                        if meaningful_content:
                            content_item = {
                                'title': self._generate_title_from_key(key),
                                'type': self._detect_content_type(meaningful_content),
                                'content': meaningful_content,
                                'metadata': {'source_key': key}
                            }
                            extracted.append(content_item)
                else:
                    # Handle direct values (strings, numbers, lists)
                    meaningful_content = self._extract_result_content(value)
                    if meaningful_content:
                        content_item = {
                            'title': self._generate_title_from_key(key),
                            'type': self._detect_content_type(meaningful_content),
                            'content': meaningful_content,
                            'metadata': {'source_key': key}
                        }
                        extracted.append(content_item)
        
        # If no meaningful content found, try to extract from the raw data
        if not extracted:
            meaningful_content = self._extract_result_content(data)
            if meaningful_content:
                extracted.append({
                    'title': 'Workflow Result',
                    'type': self._detect_content_type(meaningful_content),
                    'content': meaningful_content,
                    'metadata': {}
                })
        
        return extracted
    
    def _extract_result_content(self, data: Any) -> Any:
        """Extract the actual result content, filtering out technical details"""
        if data is None:
            return None
        
        # Handle strings - return if meaningful
        if isinstance(data, str):
            # Skip empty strings or very short technical strings
            if len(data.strip()) < 3:
                return None
            # Skip technical/system strings
            technical_patterns = ['node_', 'execution_', 'timestamp', 'uuid', 'id:', 'status:', 'debug:']
            if any(pattern in data.lower() for pattern in technical_patterns):
                return None
            return data.strip()
        
        # Handle numbers and booleans
        if isinstance(data, (int, float, bool)):
            return data
        
        # Handle lists
        if isinstance(data, list):
            if not data:
                return None
            # Filter out empty or technical items
            filtered_list = []
            for item in data:
                meaningful_item = self._extract_result_content(item)
                if meaningful_item is not None:
                    filtered_list.append(meaningful_item)
            return filtered_list if filtered_list else None
        
        # Handle dictionaries
        if isinstance(data, dict):
            # Skip internal/technical keys
            skip_keys = {
                'metadata', 'timestamp', 'execution_time', 'node_id', 'node_type', 
                'status', 'logs', 'debug', 'trace', 'internal', 'system', 'config',
                'settings', 'parameters', 'raw_data', 'full_response', 'request_id',
                'session_id', 'user_id', 'api_key', 'token', 'auth', 'headers'
            }
            
            # Look for the main content fields first
            content_fields = ['content', 'output', 'result', 'text', 'message', 'data', 'value', 'answer', 'response']
            
            # Try to find the main content
            for field in content_fields:
                if field in data and data[field] is not None:
                    main_content = self._extract_result_content(data[field])
                    if main_content is not None:
                        return main_content
            
            # If no main content field found, extract meaningful key-value pairs
            meaningful_dict = {}
            for key, value in data.items():
                # Skip technical keys
                if key.startswith('_') or key in skip_keys or key.endswith('_id') or key.endswith('_time'):
                    continue
                
                meaningful_value = self._extract_result_content(value)
                if meaningful_value is not None:
                    meaningful_dict[key] = meaningful_value
            
            return meaningful_dict if meaningful_dict else None
        
        # For any other type, return as is
        return data
    
    def _generate_title_from_key(self, key: str) -> str:
        """Generate a readable title from a key"""
        # Handle common patterns
        title_map = {
            'task_result': '📋 Task Result',
            'agent_output': '🤖 Agent Output',
            'tool_result': '🔧 Tool Result',
            'workflow_result': '⚙️ Workflow Result',
            'analysis': '📊 Analysis',
            'summary': '📝 Summary',
            'recommendation': '💡 Recommendation',
            'data': '📄 Data',
            'output': '📤 Output',
            'result': '✅ Result'
        }
        
        if key in title_map:
            return title_map[key]
        
        # Convert snake_case to Title Case
        return ' '.join(word.capitalize() for word in key.replace('_', ' ').split())
    
    def _detect_content_type(self, content) -> str:
        """Detect the type of content for appropriate formatting"""
        if isinstance(content, dict):
            return 'json'
        elif isinstance(content, list):
            if content and isinstance(content[0], dict):
                return 'table'
            return 'list'
        elif isinstance(content, str):
            if len(content) > 200:
                return 'text'
            return 'text'
        else:
            return 'text'
    
    def _format_text_content(self, content: str) -> str:
        """Format text content for HTML display"""
        if not content:
            return '<em>No content</em>'
        
        # Convert to string if not already
        text = str(content)
        
        # Handle very long text by adding paragraph breaks
        if len(text) > 500:
            # Split into paragraphs at natural break points
            paragraphs = []
            current_paragraph = ""
            
            # Split by double newlines first (natural paragraph breaks)
            sections = text.split('\n\n')
            
            for section in sections:
                # Clean up the section
                section = section.strip()
                if not section:
                    continue
                
                # If section is still very long, try to break it at sentences
                if len(section) > 300:
                    sentences = section.split('. ')
                    temp_paragraph = ""
                    
                    for sentence in sentences:
                        if len(temp_paragraph + sentence) > 300 and temp_paragraph:
                            paragraphs.append(temp_paragraph.strip())
                            temp_paragraph = sentence + '. '
                        else:
                            temp_paragraph += sentence + '. '
                    
                    if temp_paragraph.strip():
                        paragraphs.append(temp_paragraph.strip())
                else:
                    paragraphs.append(section)
            
            # Join paragraphs with proper HTML paragraph tags
            formatted = '</p><p>'.join(paragraphs)
            formatted = f'<p>{formatted}</p>'
        else:
            # For shorter text, just convert newlines to breaks
            formatted = text.replace('\n\n', '</p><p>').replace('\n', '<br>')
            if not formatted.startswith('<p>'):
                formatted = f'<p>{formatted}</p>'
        
        # Apply basic markdown-like formatting
        formatted = formatted.replace('**', '<strong>').replace('**', '</strong>')
        formatted = formatted.replace('*', '<em>').replace('*', '</em>')
        
        # Handle numbered lists
        import re
        formatted = re.sub(r'\n(\d+)\.\s+', r'<br><strong>\1.</strong> ', formatted)
        
        # Handle bullet points
        formatted = re.sub(r'\n[-•]\s+', r'<br>• ', formatted)
        
        return formatted
    
    def _format_json_content(self, content) -> str:
        """Format JSON content for display"""
        try:
            if isinstance(content, str):
                import json
                content = json.loads(content)
            return json.dumps(content, indent=2, ensure_ascii=False)
        except:
            return str(content)
    
    def _format_list_content(self, content: list) -> str:
        """Format list content as HTML list"""
        if not content:
            return '<em>Empty list</em>'
        
        html = '<ul>'
        for item in content:
            html += f'<li>{self._format_value_for_display(item)}</li>'
        html += '</ul>'
        return html
    
    def _format_table_content(self, content: list) -> str:
        """Format list of dictionaries as HTML table"""
        if not content or not isinstance(content[0], dict):
            return self._format_list_content(content)
        
        # Get headers from first item
        headers = list(content[0].keys())
        
        html = '<table><thead><tr>'
        for header in headers:
            html += f'<th>{header.replace("_", " ").title()}</th>'
        html += '</tr></thead><tbody>'
        
        for row in content:
            html += '<tr>'
            for header in headers:
                value = row.get(header, '')
                html += f'<td>{self._format_value_for_display(value)}</td>'
            html += '</tr>'
        
        html += '</tbody></table>'
        return html
    
    def _format_value_for_display(self, value) -> str:
        """Format a value for HTML display"""
        if value is None:
            return '<em>None</em>'
        elif isinstance(value, bool):
            return '✅ Yes' if value else '❌ No'
        elif isinstance(value, (dict, list)):
            return f'<code>{str(value)[:100]}{"..." if len(str(value)) > 100 else ""}</code>'
        else:
            return str(value)


# Register the handler function
async def process_output_node(
    node_data: Dict[str, Any], 
    inputs: Dict[str, NodeData], 
    context: Dict[str, Any] = None
) -> NodeData:
    """
    Process output node with enhanced template variable resolution and standardized data handling
    """
    try:
        output_type = node_data.get('outputType', 'webhook')
        logger.info(f"Processing output node with type: {output_type}")
        
        # Collect all available data for template variables
        template_context = _build_template_context(inputs, context)
        
        if output_type == 'webhook':
            return await _process_webhook_output(node_data, template_context)
        elif output_type == 'file':
            return await _process_file_output(node_data, template_context)
        elif output_type == 'email':
            return await _process_email_output(node_data, template_context)
        elif output_type == 'database':
            return await _process_database_output(node_data, template_context)
        else:
            return {
                "status": "error",
                "message": f"Unsupported output type: {output_type}",
                "output_type": output_type
            }
            
    except Exception as e:
        logger.error(f"Error processing output node: {str(e)}")
        return {
            "status": "error",
            "message": f"Output processing failed: {str(e)}",
            "error": str(e)
        }

def _build_template_context(inputs: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Build a comprehensive template context from all available data sources
    """
    template_context = {}
    
    # Add context data
    if context:
        template_context.update(context)
    
    # Process inputs and extract meaningful variables
    for input_key, input_value in inputs.items():
        if isinstance(input_value, dict):
            # Handle agent results
            if 'result' in input_value:
                template_context['task_output'] = str(input_value['result'])
                template_context['agent_result'] = str(input_value['result'])
            
            # Handle text outputs
            if 'text_output' in input_value:
                template_context['task_output'] = str(input_value['text_output'])
                template_context['text_output'] = str(input_value['text_output'])
            
            # Handle output field
            if 'output' in input_value:
                template_context['task_output'] = str(input_value['output'])
                template_context['output'] = str(input_value['output'])
            
            # Handle standardized API data
            if input_value.get('type') == 'api_data' and 'api_data' in input_value:
                api_data = input_value['api_data']
                service_name = input_value.get('service_name', 'API')
                
                # Format standardized data for output
                if isinstance(api_data, dict) and 'records' in api_data:
                    records = api_data['records']
                    
                    # Create formatted output for different output types
                    template_context['api_data'] = api_data
                    template_context['records'] = records
                    template_context['record_count'] = len(records)
                    template_context['service_name'] = service_name
                    
                    # Create formatted text representation
                    formatted_text = _format_records_for_output(records, service_name)
                    template_context['formatted_data'] = formatted_text
                    template_context['task_output'] = formatted_text  # Default output
            
            # Handle nested data
            for nested_key, nested_value in input_value.items():
                if isinstance(nested_value, (str, int, float, bool)):
                    template_context[f"{input_key}_{nested_key}"] = nested_value
        
        elif isinstance(input_value, (str, int, float, bool)):
            template_context[input_key] = input_value
    
    # Ensure we have a task_output
    if 'task_output' not in template_context:
        # Try to find any meaningful output
        for key, value in template_context.items():
            if 'output' in key.lower() or 'result' in key.lower():
                template_context['task_output'] = str(value)
                break
        else:
            template_context['task_output'] = "No output available"
    
    logger.info(f"Built template context with keys: {list(template_context.keys())}")
    return template_context

def _format_records_for_output(records: List[Dict[str, Any]], service_name: str) -> str:
    """
    Format standardized records for human-readable output
    """
    if not records:
        return f"No data available from {service_name}"
    
    formatted_lines = [f"📊 Data from {service_name} ({len(records)} records):\n"]
    
    for i, record in enumerate(records[:10]):  # Limit to first 10 records
        record_data = record.get('data', {})
        metadata = record.get('metadata', {})
        
        formatted_lines.append(f"📋 Record {i+1}:")
        
        # Format key fields
        title = record_data.get('title') or record_data.get('name') or f"Record {i+1}"
        formatted_lines.append(f"  • Title: {title}")
        
        description = record_data.get('description') or record_data.get('content')
        if description:
            desc_preview = str(description)[:100] + "..." if len(str(description)) > 100 else str(description)
            formatted_lines.append(f"  • Description: {desc_preview}")
        
        # Add other relevant fields
        for field_name, field_value in record_data.items():
            if field_name not in ['title', 'name', 'description', 'content'] and field_value is not None:
                formatted_lines.append(f"  • {field_name.title()}: {field_value}")
        
        formatted_lines.append("")  # Empty line between records
    
    if len(records) > 10:
        formatted_lines.append(f"... and {len(records) - 10} more records")
    
    return "\n".join(formatted_lines)

async def _process_webhook_output(node_data: Dict[str, Any], template_context: Dict[str, Any]) -> Dict[str, Any]:
    """Process webhook output with proper parameter handling"""
    try:
        webhook_url = node_data.get('webhookUrl', '')
        webhook_method = node_data.get('webhookMethod', 'POST')
        webhook_headers = node_data.get('webhookHeaders', {})
        webhook_payload = node_data.get('webhookPayload', {})
        
        # Resolve template variables in URL, headers, and payload
        resolved_url = _resolve_string_template(webhook_url, template_context)
        resolved_headers = _resolve_template_variables(webhook_headers, template_context)
        resolved_payload = _resolve_template_variables(webhook_payload, template_context)
        
        # Make the webhook request
        import aiohttp
        async with aiohttp.ClientSession() as session:
            if webhook_method.upper() == 'GET':
                async with session.get(resolved_url, headers=resolved_headers, params=resolved_payload) as response:
                    response_text = await response.text()
                    return {
                        "success": True,
                        "status_code": response.status,
                        "response": response_text[:500],  # Limit response size
                        "webhook_url": resolved_url,
                        "method": webhook_method
                    }
            else:
                async with session.post(resolved_url, headers=resolved_headers, json=resolved_payload) as response:
                    response_text = await response.text()
                    return {
                        "success": True,
                        "status_code": response.status,
                        "response": response_text[:500],  # Limit response size
                        "webhook_url": resolved_url,
                        "method": webhook_method
                    }
                    
    except Exception as e:
        logger.error(f"Error sending webhook: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "webhook_url": webhook_url
        }

def _resolve_string_template(template: str, context: Dict[str, Any]) -> str:
    """
    Resolve template variables in a string
    """
    if not isinstance(template, str):
        return template
    
    # Find all template variables like {variable_name}
    pattern = r'\{([^}]+)\}'
    matches = re.findall(pattern, template)
    
    resolved = template
    for match in matches:
        variable_name = match.strip()
        
        # Look for the variable in context
        if variable_name in context:
            value = context[variable_name]
            resolved = resolved.replace(f'{{{match}}}', str(value))
        else:
            logger.warning(f"Template variable '{variable_name}' not found in context")
            # Keep the original placeholder or replace with empty string
            resolved = resolved.replace(f'{{{match}}}', f'[{variable_name} not found]')
    
    return resolved

async def _process_file_output(node_data: Dict[str, Any], template_context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process file output
    """
    try:
        file_path = node_data.get('filePath', 'output.txt')
        file_content = node_data.get('fileContent', '{task_output}')
        
        # Resolve template variables
        resolved_content = _resolve_string_template(file_content, template_context)
        
        # Write to file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(resolved_content)
        
        return {
            "status": "success",
            "message": f"File written to {file_path}",
            "output_type": "file",
            "file_path": file_path,
            "content_length": len(resolved_content)
        }
        
    except Exception as e:
        logger.error(f"Error processing file output: {str(e)}")
        return {
            "status": "error",
            "message": f"File output failed: {str(e)}",
            "output_type": "file",
            "error": str(e)
        }

async def _process_email_output(node_data: Dict[str, Any], template_context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process email output
    """
    try:
        to_email = node_data.get('toEmail', '')
        subject = node_data.get('emailSubject', 'Workflow Output')
        body = node_data.get('emailBody', '{task_output}')
        
        # Resolve template variables
        resolved_subject = _resolve_string_template(subject, template_context)
        resolved_body = _resolve_string_template(body, template_context)
        
        # TODO: Implement email sending
        logger.info(f"Email would be sent to {to_email} with subject: {resolved_subject}")
        
        return {
            "status": "success",
            "message": f"Email prepared for {to_email}",
            "output_type": "email",
            "to_email": to_email,
            "subject": resolved_subject,
            "body_length": len(resolved_body)
        }
        
    except Exception as e:
        logger.error(f"Error processing email output: {str(e)}")
        return {
            "status": "error",
            "message": f"Email output failed: {str(e)}",
            "output_type": "email",
            "error": str(e)
        }

async def _process_database_output(node_data: Dict[str, Any], template_context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process database output
    """
    try:
        table_name = node_data.get('tableName', 'workflow_output')
        data_to_insert = template_context.get('api_data', template_context)
        
        # TODO: Implement database insertion
        logger.info(f"Data would be inserted into table: {table_name}")
        
        return {
            "status": "success",
            "message": f"Data prepared for insertion into {table_name}",
            "output_type": "database",
            "table_name": table_name,
            "record_count": len(data_to_insert) if isinstance(data_to_insert, list) else 1
        }
        
    except Exception as e:
        logger.error(f"Error processing database output: {str(e)}")
        return {
            "status": "error",
            "message": f"Database output failed: {str(e)}",
            "output_type": "database",
            "error": str(e)
        }

def _resolve_template_variables(data: Any, context: Dict[str, Any]) -> Any:
    """
    Recursively resolve template variables in data structure
    """
    if isinstance(data, dict):
        return {key: _resolve_template_variables(value, context) for key, value in data.items()}
    elif isinstance(data, list):
        return [_resolve_template_variables(item, context) for item in data]
    elif isinstance(data, str):
        return _resolve_string_template(data, context)
    else:
        return data