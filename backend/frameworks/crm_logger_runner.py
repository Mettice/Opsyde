# /backend/frameworks/crm_logger_runner.py
import requests
import os

def run_crm_logger_tool(tool_data):
    email = tool_data.get("email", "")
    score = tool_data.get("score", 0)
    intent = tool_data.get("intent", "Unknown")

    # Option 1: Log to Google Sheet via webhook
    sheet_url = os.getenv("SHEET_WEBHOOK_URL")  # Add to .env

    payload = {
        "email": email,
        "score": score,
        "intent": intent
    }

    try:
        res = requests.post(sheet_url, json=payload)
        return f"Logged to CRM/Sheets: {res.status_code}"
    except Exception as e:
        return f"[Error] CRM logging failed: {str(e)}"
