# backend/output_utils.py
import os
from email_runner import send_email
from discord_runner import post_to_discord
from sheets_runner import log_to_sheets


def route_output(logs, config):
    status_msgs = []

    if config.get("email"):
        to_email = config["email"]
        status_msgs.append(send_email(logs, to=to_email))

    if config.get("discord"):
        webhook = config["discord"]
        status_msgs.append(post_to_discord(logs, webhook_url=webhook))

    if config.get("sheets"):
        sheet_id = config["sheets"].get("sheetId")
        sheet_name = config["sheets"].get("sheetName", "Logs")
        status_msgs.append(log_to_sheets(logs, sheet_id=sheet_id, sheet_name=sheet_name))

    if config.get("crm"):
        # Placeholder for CRM integration
        status_msgs.append("CRM routing coming soon...")

    if config.get("notion"):
        # Placeholder for Notion
        status_msgs.append("Notion routing coming soon...")

    return "\n".join(status_msgs)
