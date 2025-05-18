# /backend/frameworks/discord_notifier.py
import os
import logging

# Create logger
logger = logging.getLogger(__name__)

# Check if required packages are available
DISCORD_AVAILABLE = False
try:
    import requests
    DISCORD_AVAILABLE = True
    logger.info("Discord integration available")
except ImportError:
    logger.warning("Discord integration not available - missing dependencies")

def run_discord_notifier(tool_data):
    """Send notification to Discord webhook if available, otherwise log to console"""
    if not DISCORD_AVAILABLE:
        logger.warning("Discord notification skipped - dependencies not installed")
        logger.info(f"Would have sent to Discord: {tool_data}")
        return "[Warning] Discord notification not available - data logged to console instead"
    
    webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
    if not webhook_url:
        logger.warning("Discord webhook URL not configured")
        return "[Error] Discord webhook URL not configured in environment variables"
        
    message = tool_data.get("message", "New lead!")
    
    payload = {
        "content": f"📢 {message}"
    }

    try:
        res = requests.post(webhook_url, json=payload)
        return "✅ Notified team on Discord."
    except Exception as e:
        logger.error(f"Discord notification failed: {str(e)}")
        return f"[Error] Discord notification failed: {str(e)}"

def send_discord_message(message, webhook_url=None, config=None):
    """
    Send a message to a Discord webhook
    
    Args:
        message (str): The message to send
        webhook_url (str, optional): The Discord webhook URL. Defaults to None.
        config (dict, optional): Additional configuration. Defaults to None.
    
    Returns:
        dict: A result object with success status and message
    """
    if not DISCORD_AVAILABLE:
        logger.warning("Discord notification skipped - dependencies not installed")
        logger.info(f"Would have sent to Discord: {message}")
        return {
            "success": False,
            "message": "Discord integration not available - missing dependencies"
        }
    
    # Get webhook URL from config, param, or environment
    if config and "webhook_url" in config:
        webhook_url = config["webhook_url"]
    elif not webhook_url:
        webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
    
    if not webhook_url:
        logger.warning("Discord webhook URL not configured")
        return {
            "success": False,
            "message": "Discord webhook URL not configured"
        }
    
    # Create payload
    if isinstance(message, dict):
        content = message.get("content", "New notification")
        embeds = message.get("embeds", [])
        payload = {
            "content": content
        }
        if embeds:
            payload["embeds"] = embeds
    else:
        payload = {
            "content": str(message)
        }
    
    # Send the message
    try:
        response = requests.post(webhook_url, json=payload)
        if response.status_code == 204:
            return {
                "success": True,
                "message": "Message sent to Discord successfully"
            }
        else:
            logger.error(f"Discord API returned status code {response.status_code}: {response.text}")
            return {
                "success": False,
                "message": f"Discord API error: {response.status_code}"
            }
    except Exception as e:
        logger.error(f"Discord notification failed: {str(e)}")
        return {
            "success": False,
            "message": f"Error sending Discord message: {str(e)}"
        }
