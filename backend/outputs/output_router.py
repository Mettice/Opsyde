import os, smtplib, json, requests
import logging
from email.message import EmailMessage
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def send_to_google_sheet(sheet_config, row_data):
    """
    Send data to a Google Sheet
    
    Args:
        sheet_config: Dictionary with spreadsheetId, range, and credentialsPath
        row_data: List of values to append as a row
        
    Returns:
        Status message
    """
    try:
        creds = Credentials.from_service_account_file(
            sheet_config.get("credentialsPath", os.getenv("GOOGLE_CREDENTIALS_PATH", "credentials.json")),
            scopes=["https://www.googleapis.com/auth/spreadsheets"]
        )
        service = build('sheets', 'v4', credentials=creds)
        sheet = service.spreadsheets()
        result = sheet.values().append(
            spreadsheetId=sheet_config["spreadsheetId"],
            range=sheet_config.get("range", "Sheet1!A1"),
            valueInputOption="RAW",
            body={"values": [row_data]}
        ).execute()
        return f"✅ Exported to Google Sheets: {len(row_data)} values"
    except Exception as e:
        logger.error(f"Google Sheets error: {str(e)}")
        return f"❌ Sheet Error: {str(e)}"

def send_to_discord(webhook_url, message):
    """
    Send a message to Discord via webhook
    
    Args:
        webhook_url: Discord webhook URL
        message: Message to send
        
    Returns:
        Status message
    """
    try:
        # Format message for Discord
        if isinstance(message, dict):
            payload = {
                "content": json.dumps(message, indent=2)[:2000]  # Discord has a 2000 char limit
            }
        else:
            payload = {
                "content": str(message)[:2000]
            }
            
        response = requests.post(webhook_url, json=payload)
        
        if response.status_code == 204:
            return "✅ Message sent to Discord"
        else:
            return f"❌ Discord Error: {response.status_code} - {response.text}"
    except Exception as e:
        logger.error(f"Discord error: {str(e)}")
        return f"❌ Discord Error: {str(e)}"

def send_email(smtp_config, subject, content):
    """
    Send an email
    
    Args:
        smtp_config: Dictionary with server, port, user, password, from, to
        subject: Email subject
        content: Email content
        
    Returns:
        Status message
    """
    try:
        msg = EmailMessage()
        
        # Format content
        if isinstance(content, dict):
            formatted_content = json.dumps(content, indent=2)
        else:
            formatted_content = str(content)
            
        msg.set_content(formatted_content)
        msg["Subject"] = subject
        msg["From"] = smtp_config["from"]
        msg["To"] = smtp_config["to"]

        with smtplib.SMTP_SSL(smtp_config["server"], smtp_config["port"]) as server:
            server.login(smtp_config["user"], smtp_config["password"])
            server.send_message(msg)

        return f"✅ Email sent to {smtp_config['to']}"
    except Exception as e:
        logger.error(f"Email error: {str(e)}")
        return f"❌ Email Error: {str(e)}"

def send_to_webhook(webhook_url, data):
    """
    Send data to a webhook
    
    Args:
        webhook_url: Webhook URL
        data: Data to send
        
    Returns:
        Status message
    """
    try:
        # Format data for webhook
        if isinstance(data, dict):
            payload = data
        else:
            payload = {"data": str(data)}
            
        response = requests.post(
            webhook_url,
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        return f"✅ Webhook response: {response.status_code}"
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return f"❌ Webhook Error: {str(e)}"

def route_output(data, config):
    """
    Route output to configured destinations
    
    Args:
        data: The data/output to send
        config: Configuration dictionary with output destinations
        
    Returns:
        Dictionary with status messages for each destination
    """
    results = {}
    
    # Email output
    if config.get("emailEnabled") and config.get("email"):
        try:
            # Get email credentials from environment
            email_sender = os.getenv("EMAIL_SENDER")
            email_password = os.getenv("EMAIL_PASSWORD")
            
            if not email_sender or not email_password:
                results["email"] = "❌ Email error: Missing EMAIL_SENDER or EMAIL_PASSWORD in .env file"
            else:
                # Configure SMTP
                smtp_config = {
                    "server": "smtp.gmail.com",  # Change based on your email provider
                    "port": 465,
                    "user": email_sender,
                    "password": email_password,
                    "from": email_sender,
                    "to": config["email"]
                }
                
                # Send the email
                subject = config.get("emailSubject", "Workflow Results")
                results["email"] = send_email(smtp_config, subject, data)
        except Exception as e:
            results["email"] = f"❌ Email error: {str(e)}"
    
    # Discord output
    if config.get("discordEnabled") and config.get("discordWebhook"):
        try:
            results["discord"] = send_to_discord(config["discordWebhook"], data)
        except Exception as e:
            results["discord"] = f"❌ Discord error: {str(e)}"
    
    # Google Sheets output
    if config.get("sheetsEnabled") and config.get("sheetId"):
        try:
            # Convert data to row format
            if isinstance(data, dict):
                row_data = list(data.values())
            elif isinstance(data, str):
                row_data = [data]
            else:
                row_data = [str(data)]
                
            sheet_config = {
                "spreadsheetId": config["sheetId"],
                "range": config.get("sheetRange", "Sheet1!A1"),
                "credentialsPath": os.getenv("GOOGLE_CREDENTIALS_PATH", "credentials.json")
            }
            
            results["sheets"] = send_to_google_sheet(sheet_config, row_data)
        except Exception as e:
            results["sheets"] = f"❌ Sheets error: {str(e)}"
    
    # Webhook output
    if config.get("webhookEnabled") and config.get("webhookUrl"):
        try:
            results["webhook"] = send_to_webhook(config["webhookUrl"], data)
        except Exception as e:
            results["webhook"] = f"❌ Webhook error: {str(e)}"
    
    return results
