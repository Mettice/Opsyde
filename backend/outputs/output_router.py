import os, smtplib, json, requests
from email.message import EmailMessage
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

def send_to_google_sheet(sheet_config, row_data):
    try:
        creds = Credentials.from_service_account_file(
            sheet_config["credentialsPath"],
            scopes=["https://www.googleapis.com/auth/spreadsheets"]
        )
        service = build('sheets', 'v4', credentials=creds)
        sheet = service.spreadsheets()
        result = sheet.values().append(
            spreadsheetId=sheet_config["spreadsheetId"],
            range=sheet_config["range"],
            valueInputOption="RAW",
            body={"values": [row_data]}
        ).execute()
        return "✅ Exported to Google Sheets"
    except Exception as e:
        return f"[Sheet Error] {e}"

def send_to_discord(webhook_url, message):
    try:
        response = requests.post(webhook_url, json={"content": message})
        return "✅ Message sent to Discord" if response.status_code == 204 else f"[Discord Error] {response.text}"
    except Exception as e:
        return f"[Discord Error] {e}"

def send_email(smtp_config, subject, content):
    try:
        msg = EmailMessage()
        msg.set_content(content)
        msg["Subject"] = subject
        msg["From"] = smtp_config["from"]
        msg["To"] = smtp_config["to"]

        with smtplib.SMTP_SSL(smtp_config["server"], smtp_config["port"]) as server:
            server.login(smtp_config["user"], smtp_config["password"])
            server.send_message(msg)

        return "✅ Email sent successfully"
    except Exception as e:
        return f"[Email Error] {e}"

def route_output(logs, config):
    """
    Routes output to configured destinations
    
    Args:
        logs: The logs/output to send
        config: Configuration dictionary with output destinations
        
    Returns:
        Status message
    """
    status_msgs = []
    
    # Email output
    if config.get("emailEnabled") and config.get("email"):
        try:
            # Simulate email sending
            status_msgs.append(f"✅ Would send email to: {config['email']}")
        except Exception as e:
            status_msgs.append(f"❌ Email error: {str(e)}")
    
    # Discord output
    if config.get("discordEnabled") and config.get("discordWebhook"):
        try:
            # Simulate Discord webhook
            status_msgs.append(f"✅ Would post to Discord webhook")
        except Exception as e:
            status_msgs.append(f"❌ Discord error: {str(e)}")
    
    # Google Sheets output
    if config.get("sheetsEnabled") and config.get("sheetId"):
        try:
            # Simulate Google Sheets integration
            status_msgs.append(f"✅ Would log to Google Sheet: {config['sheetId']}")
        except Exception as e:
            status_msgs.append(f"❌ Sheets error: {str(e)}")
    
    return "\n".join(status_msgs) if status_msgs else "No output destinations configured"
