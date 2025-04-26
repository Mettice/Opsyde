# backend/email_runner.py
import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

def format_output_for_email(output_data: Dict[str, Any]) -> str:
    """Format the output data into a readable email body"""
    content = []
    
    # Add header
    content.append("CrewFlow Execution Results")
    content.append("=" * 30 + "\n")
    
    # Add timestamp if available
    if "timestamp" in output_data:
        content.append(f"Time: {output_data['timestamp']}\n")
    
    # Format results
    if "result" in output_data:
        content.append("Results:")
        for key, value in output_data["result"].items():
            if isinstance(value, dict):
                if "error" in value and value["error"]:
                    content.append(f"\n❌ {key}:")
                    content.append(f"   Error: {value.get('message', 'Unknown error')}")
                else:
                    content.append(f"\n✅ {key}:")
                    if "value" in value:
                        if isinstance(value["value"], dict):
                            for subkey, subval in value["value"].items():
                                content.append(f"   {subkey}: {subval}")
                        else:
                            content.append(f"   {value['value']}")
            else:
                content.append(f"\n{key}: {value}")
    
    return "\n".join(content)

def send_email(output_data: Dict[str, Any], to_email: Optional[str] = None) -> Dict[str, Any]:
    """Send email with proper error handling and validation"""
    try:
        # Validate email configuration
        sender_email = os.getenv("EMAIL_SENDER")
        email_password = os.getenv("EMAIL_PASSWORD")
        
        if not sender_email or not email_password:
            raise ValueError("Email sender or password not configured")
        
        if not to_email:
            raise ValueError("Recipient email address is required")
        
        # Create message
        msg = MIMEMultipart()
        msg["Subject"] = "CrewFlow Execution Results"
        msg["From"] = sender_email
        msg["To"] = to_email
        
        # Format and add body
        body = format_output_for_email(output_data)
        msg.attach(MIMEText(body, "plain"))
        
        # Send email
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, email_password)
            server.send_message(msg)
            
        logger.info(f"Email sent successfully to {to_email}")
        return {
            "success": True,
            "message": "Email sent successfully",
            "type": "email_result"
        }
        
    except ValueError as ve:
        error_msg = str(ve)
        logger.error(f"Email configuration error: {error_msg}")
        return {
            "success": False,
            "error": error_msg,
            "type": "error"
        }
        
    except smtplib.SMTPAuthenticationError:
        error_msg = "Failed to authenticate with email server"
        logger.error(error_msg)
        return {
            "success": False,
            "error": error_msg,
            "type": "error"
        }
        
    except Exception as e:
        error_msg = f"Failed to send email: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "error": error_msg,
            "type": "error"
        }
