# backend/output_utils.py
import os
import json
import logging
from typing import Any, Dict
from datetime import datetime
from frameworks.email_notifier import send_email
from frameworks.discord_notifier import run_discord_notifier
from frameworks.sheets_logger import log_to_sheet
from utils.security import SecurityManager

logger = logging.getLogger(__name__)
security_manager = SecurityManager(secret_key=os.getenv("JWT_SECRET_KEY", "default-secret"))

def sanitize_output(data: Any) -> Any:
    """Sanitize output data using security manager"""
    return security_manager.sanitize_output(data)

def format_output(data: Any, output_type: str) -> str:
    """Format output data based on type"""
    try:
        if isinstance(data, (dict, list)):
            if output_type == "discord":
                return f"```json\n{json.dumps(data, indent=2)}\n```"
            return json.dumps(data, indent=2)
        return str(data)
    except Exception as e:
        logger.error(f"Error formatting output: {str(e)}")
        return str(data)

def validate_output_config(output_type: str, config: Dict[str, Any]) -> bool:
    """Validate output configuration"""
    required_fields = {
        "email": ["email"],
        "discord": ["webhook_url"],
        "sheets": ["sheet_id"],
        "webhook": ["url"],
        "crm": ["api_key"],
        "notion": ["token"]
    }
    
    if output_type not in required_fields:
        return False
        
    return all(field in config for field in required_fields[output_type])

def route_output(logs, config):
    """Route output to configured destinations"""
    status_msgs = []

    # Use the new sanitize_output function
    sanitized_logs = sanitize_output(logs)

    if config.get("email"):
        to_email = config["email"]
        formatted_logs = format_output(sanitized_logs, "email")
        subject = config.get("subject", "Workflow Output")
        result = send_email(to_email, subject, formatted_logs)
        status_msgs.append(result["message"] if result.get("success") else result.get("error", "Email failed"))

    if config.get("discord"):
        webhook = config["discord"]
        formatted_logs = format_output(sanitized_logs, "discord")
        status_msgs.append(run_discord_notifier(formatted_logs, webhook_url=webhook))

    if config.get("sheets"):
        sheet_id = config["sheets"].get("sheetId")
        sheet_name = config["sheets"].get("sheetName", "Logs")
        status_msgs.append(log_to_sheet(sanitized_logs, sheet_id=sheet_id, sheet_name=sheet_name))

    if config.get("crm"):
        status_msgs.append("CRM routing coming soon...")

    if config.get("notion"):
        status_msgs.append("Notion routing coming soon...")

    return "\n".join(status_msgs)
