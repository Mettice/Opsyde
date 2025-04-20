# /backend/frameworks/discord_notifier.py
import requests
import os

def run_discord_notifier(tool_data):
    webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
    message = tool_data.get("message", "New lead!")
    
    payload = {
        "content": f"📢 {message}"
    }

    try:
        res = requests.post(webhook_url, json=payload)
        return "✅ Notified team on Discord."
    except Exception as e:
        return f"[Error] Discord notification failed: {str(e)}"
