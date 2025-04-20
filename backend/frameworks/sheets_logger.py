# /backend/frameworks/sheets_logger.py
import os
import gspread
from oauth2client.service_account import ServiceAccountCredentials

def log_to_sheet(data):
    try:
        # Define the scope and credentials
        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        creds = ServiceAccountCredentials.from_json_keyfile_name("credentials.json", scope)
        client = gspread.authorize(creds)

        sheet = client.open("CV_Score_Results").sheet1  # Spreadsheet must exist
        row = [
            data.get("name", ""),
            data.get("email", ""),
            ", ".join(data.get("skills", [])),
            data.get("experience", ""),
            data.get("score", ""),
            data.get("recommendation", "")
        ]
        sheet.append_row(row)

        return "Logged to Google Sheets"
    except Exception as e:
        return f"[Error] Failed to log to sheet: {str(e)}"
