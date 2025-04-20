# backend/sheets_runner.py
import os
import gspread
from oauth2client.service_account import ServiceAccountCredentials

def push_to_sheet(logs, sheet_name="Logs"):
    """
    Simplified function that doesn't actually use Google Sheets
    """
    return f"✅ Would export to sheet '{sheet_name}' (Google Sheets integration disabled)"


def send_to_sheet(logs, sheet_id):
    try:
        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        creds = ServiceAccountCredentials.from_json_keyfile_name("creds.json", scope)
        client = gspread.authorize(creds)

        sheet = client.open_by_key(sheet_id).sheet1
        sheet.append_row([logs])

        return "✅ Logs sent to Google Sheet"
    except Exception as e:
        return f"❌ Sheet error: {str(e)}"