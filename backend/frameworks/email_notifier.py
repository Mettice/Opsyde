# /backend/frameworks/email_notifier.py
import os
import smtplib
import logging
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional, List, Union
from dotenv import load_dotenv
import json
import re

# Load environment variables
load_dotenv()

# Configure logging
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

def format_candidate_data(parsed_data: Dict[str, Any]) -> str:
    """Format candidate data into a readable email body"""
    return f"""
    Name: {parsed_data.get('name', 'N/A')}
    Email: {parsed_data.get('email', 'N/A')}
    Skills: {', '.join(parsed_data.get('skills', []))}
    Experience: {parsed_data.get('experience', 'N/A')} years
    Score: {parsed_data.get('score', 'N/A')}
    Recommendation: {parsed_data.get('recommendation', 'N/A')}
    """

def is_valid_email(email: str) -> bool:
    """
    Validate email format using simple regex
    """
    if not email:
        return False
        
    # Simple email validation regex
    email_pattern = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    return bool(email_pattern.match(email))

# Make this a synchronous function to avoid awaiting problems
def _send_email_sync(recipient: str, subject: str, body: str) -> Dict[str, Any]:
    """
    Send an email synchronously using Gmail SMTP
    
    This is a helper function that should not be called directly from outside,
    but rather through the async wrapper send_email
    """
    try:
        # Get Gmail credentials from environment variables
        smtp_server = "smtp.gmail.com"
        smtp_port = 587
        smtp_username = os.getenv("EMAIL_SENDER")
        smtp_password = os.getenv("EMAIL_PASSWORD")
        
        if not smtp_username or not smtp_password:
            error_msg = "Gmail credentials not configured in environment variables"
            logger.error(error_msg)
            return {"success": False, "message": error_msg}
        
        # Create message
        msg = MIMEMultipart()
        msg["From"] = smtp_username
        msg["To"] = recipient
        msg["Subject"] = subject
        
        # Attach body
        msg.attach(MIMEText(body, "plain"))
        
        # Send email
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(msg)
            
        logger.info(f"Email sent to {recipient} via Gmail SMTP")
        
        # Return success with recipient and subject for display
        return {
            "success": True, 
            "message": "Email sent successfully",
            "recipient": recipient,
            "subject": subject
        }
        
    except Exception as e:
        error_msg = f"Email error: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "message": error_msg}

async def send_email(recipient: str, subject: str, body: Any) -> Dict[str, Any]:
    """
    Send an email to the specified recipient using Gmail SMTP - async wrapper
    
    Args:
        recipient: Email address of the recipient
        subject: Email subject
        body: Email body content (can be text or dict/object that will be converted to formatted text)
        
    Returns:
        Dict with status and message
    """
    try:
        # Validate the recipient email format
        if not recipient:
            logger.warning("No recipient specified")
            return {"success": False, "message": "No recipient specified"}
            
        if not is_valid_email(recipient):
            logger.warning(f"Invalid email format: {recipient}")
            return {"success": False, "message": f"Invalid email format: {recipient}"}
        
        # Format the body if it's not a string
        if not isinstance(body, str):
            try:
                if isinstance(body, dict):
                    # Pretty format JSON for better readability
                    body = json.dumps(body, indent=2)
                else:
                    # Convert any other object to string
                    body = str(body)
            except Exception as e:
                logger.error(f"Error formatting email body: {str(e)}")
                body = f"[Error formatting content: {str(e)}]"
        
        # Run the synchronous SMTP code in a thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, _send_email_sync, recipient, subject, body
        )
        
        return result
    except Exception as e:
        error_msg = f"Email error: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "message": error_msg}

# Keep this for backward compatibility with existing imports
async def send_email_async(recipient: str, subject: str, body: str) -> Dict[str, Any]:
    """Async wrapper for send_email for compatibility with async code"""
    return await send_email(recipient, subject, body)

def send_candidate_email(parsed_data: Dict[str, Any], hr_email: str = "hr@company.com") -> Union[str, Dict[str, Any]]:
    """
    Send an email with candidate data to HR
    
    This function is kept for backwards compatibility
    
    Args:
        parsed_data: Dictionary containing candidate data
        hr_email: HR email address
        
    Returns:
        String with result message (for backward compatibility) or result dictionary
    """
    try:
        # Create subject and body
        subject = f"Candidate Match: {parsed_data.get('name', 'Unnamed')} - Score {parsed_data.get('score', 'N/A')}"
        body = format_candidate_data(parsed_data)
        
        # Use asyncio to run the async function in a blocking manner
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(send_email(hr_email, subject, body))
        finally:
            loop.close()
        
        # Return in the format expected by older code
        if result["success"]:
            return result["message"]
        else:
            return f"⚠️ Email not sent: {result.get('message', 'Unknown error')}"
            
    except Exception as e:
        logger.error(f"Error in send_candidate_email: {str(e)}")
        return f"[Error] Email not sent: {str(e)}"
