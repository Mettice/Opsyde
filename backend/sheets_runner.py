# backend/sheets_runner.py
import os
import gspread
from oauth2client.service_account import ServiceAccountCredentials

def push_to_sheet(logs, sheet_name="Logs"):
    """
    Simplified function that doesn't actually use Google Sheets
    """
    return f"✅ Would export to sheet '{sheet_name}' (Google Sheets integration disabled)"
