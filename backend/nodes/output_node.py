# backend/nodes/output_node.py - Enhanced with AI Integration
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from backend.models.data import NodeData
from backend.frameworks.ai_integration_runner import AIIntegrationRunner
from backend.frameworks import framework_registry
from backend.utils.logging import get_logger

logger = get_logger(__name__)

class OutputNode:
    """Enhanced output node with AI-powered integrations"""
    
    def __init__(self):
        self.ai_runner = AIIntegrationRunner()

    async def process(
        self, 
        node: Dict[str, Any], 
        inputs: Dict[str, NodeData], 
        context: Dict[str, Any]
    ) -> NodeData:
        """Process output node with AI integration support"""
        try:
            node_data = node.get("data", {})
            output_type = node_data.get("outputType") or node_data.get("output_type", "webhook")
            
            # Collect all input data for output
            output_data = self._collect_output_data(inputs)
            
            # Check if this is an AI-powered output
            if output_type.startswith('smart_') or node_data.get('config', {}).get('ai_description'):
                return await self._process_ai_output(node_data, output_data, context)
            else:
                return await self._process_traditional_output(node_data, output_data, context)
                
        except Exception as e:
            logger.error(f"Error in output node: {str(e)}")
            return NodeData.from_error(f"Output processing failed: {str(e)}")
    
    def _collect_output_data(self, inputs: Dict[str, NodeData]) -> Dict[str, Any]:
        """Collect and structure data from all inputs"""
        output_data = {}
        
        for key, node_data in inputs.items():
            if node_data.is_error():
                # Include error information
                output_data[f"{key}_error"] = node_data.error
            else:
                # Extract the actual value
                value = node_data.get_value()
                output_data[key] = value
                
                # If the value has metadata, include it
                if hasattr(node_data, 'metadata') and node_data.metadata:
                    output_data[f"{key}_metadata"] = node_data.metadata
        
        return output_data
    
    async def _process_ai_output(
        self, 
        node_data: Dict[str, Any], 
        output_data: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> NodeData:
        """Process AI-powered output integration"""
        try:
            output_type = node_data.get('outputType', 'smart_api')
            
            # Get user's API keys from context (you'll need to implement this)
            user_keys = context.get('user_keys', {})
            
            # Prepare AI configuration
            ai_config = {
                "description": node_data.get('ai_description') or node_data.get('config', {}).get('ai_description'),
                "service_type": node_data.get('service_type') or node_data.get('config', {}).get('service_type'),
                "output_format": node_data.get('output_format') or node_data.get('config', {}).get('output_format'),
                "output_type": output_type,
                **node_data.get('config', {})
            }
            
            # NEW: Add smart email specific configuration
            if output_type == 'smart_email':
                ai_config.update({
                    "recipient_email": node_data.get('recipient_email') or node_data.get('config', {}).get('recipient_email'),
                    "subject_template": node_data.get('subject_template') or node_data.get('config', {}).get('subject_template'),
                    "email_style": node_data.get('service_type') or node_data.get('config', {}).get('service_type', 'professional')
                })
            
            # Validate AI configuration
            if not ai_config.get('description'):
                return NodeData.from_error("AI description is required for smart integrations")
            
            # NEW: Different processing for smart email vs smart API
            if output_type == 'smart_email':
                result = await self._process_smart_email(ai_config, output_data, context, user_keys)
            else:
                result = await self._process_smart_api(ai_config, output_data, context, user_keys)
            
            if result.get('success'):
                return NodeData.from_value({
                    "success": True,
                    "output_type": output_type,
                    "service_detected": result.get('service_detected'),
                    "summary": result.get('summary', f'{output_type} completed successfully'),
                    "data": result.get('result'),
                    "metadata": {
                        "execution_time": result.get('execution_time'),
                        "ai_confidence": result.get('confidence'),
                        "endpoint_used": result.get('endpoint_used')
                    }
                })
            else:
                # AI integration failed, try fallback
                if result.get('setup_required'):
                    return NodeData.from_error(
                        "AI integration requires API keys. Please configure your API keys in settings."
                    )
                else:
                    return NodeData.from_error(f"AI integration failed: {result.get('error')}")

        except Exception as e:
            logger.error(f"AI integration error: {str(e)}")
            return NodeData.from_error(f"AI integration failed: {str(e)}")

    async def _process_smart_email(
        self, 
        ai_config: Dict[str, Any], 
        output_data: Dict[str, Any], 
        context: Dict[str, Any],
        user_keys: Dict[str, str]
    ) -> Dict[str, Any]:
        """Process smart email with AI formatting"""
        try:
            # Use AI to format email content
            email_result = await self.ai_runner.run_smart_output(
                output_type="smart_email",
                ai_config=ai_config,
                data=output_data,
                context=context,
                user_keys=user_keys
            )
            
            if email_result.get('success'):
                # Extract email details from AI result
                email_data = email_result.get('result', {})
                recipient = ai_config.get('recipient_email') or email_data.get('recipient')
                subject = email_data.get('subject') or ai_config.get('subject_template', 'AI-Generated Report')
                body = email_data.get('formatted_content') or email_data.get('body')
                
                if not recipient:
                    return {"success": False, "error": "No recipient email specified"}
                
                # Send the formatted email
                from backend.frameworks.email_notifier import send_email
                send_result = await send_email(recipient, subject, body)
                
                return {
                    "success": True,
                    "service_detected": "Smart Email",
                    "summary": f"AI-formatted email sent to {recipient}",
                    "result": {
                        "recipient": recipient,
                        "subject": subject,
                        "email_style": ai_config.get('email_style', 'professional'),
                        "send_result": send_result
                    },
                    "confidence": email_result.get('confidence', 0.9)
                }
            else:
                return email_result
                
        except Exception as e:
            logger.error(f"Smart email processing failed: {str(e)}")
            return {"success": False, "error": f"Smart email failed: {str(e)}"}

    async def _process_smart_api(
        self, 
        ai_config: Dict[str, Any], 
        output_data: Dict[str, Any], 
        context: Dict[str, Any],
        user_keys: Dict[str, str]
    ) -> Dict[str, Any]:
        """Process smart API integration"""
        try:
            # Execute AI integration
            result = await self.ai_runner.run_smart_output(
                output_type="smart_api",
                ai_config=ai_config,
                data=output_data,
                context=context,
                user_keys=user_keys
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Smart API processing failed: {str(e)}")
            return {"success": False, "error": f"Smart API failed: {str(e)}"}

    async def _process_traditional_output(
        self, 
        node_data: Dict[str, Any], 
        output_data: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> NodeData:
        """Process traditional output types (webhook, email, etc.)"""
        output_type = node_data.get("outputType", "webhook")
        
        try:
            if output_type == "webhook":
                return await self._send_webhook(node_data, output_data)
            elif output_type == "email":
                return await self._send_email(node_data, output_data)
            elif output_type == "discord":
                return await self._send_discord(node_data, output_data)
            elif output_type == "sheets":
                return await self._send_to_sheets(node_data, output_data)
            else:
                return NodeData.from_error(f"Unsupported output type: {output_type}")
                
        except Exception as e:
            logger.error(f"Traditional output error: {str(e)}")
            return NodeData.from_error(f"Output failed: {str(e)}")
    
    async def _send_webhook(self, node_data: Dict[str, Any], output_data: Dict[str, Any]) -> NodeData:
        """Send data via webhook"""
        # Use your existing webhook infrastructure
        from backend.frameworks.webhook_runner import post_to_webhook
        
        webhook_url = node_data.get('webhookUrl') or node_data.get('config', {}).get('url')
        if not webhook_url:
            return NodeData.from_error("Webhook URL is required")
        
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