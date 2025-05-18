# /backend/frameworks/sheets_logger.py
import os
import logging

# Create logger
logger = logging.getLogger(__name__)

# Check if required packages are available
SHEETS_AVAILABLE = False
try:
    import gspread
    from oauth2client.service_account import ServiceAccountCredentials
    SHEETS_AVAILABLE = True
    logger.info("Google Sheets integration available")
except ImportError:
    logger.warning("Google Sheets integration not available - missing dependencies")

def log_to_sheet(data):
    """Log data to Google Sheets if available, otherwise log to console"""
    if not SHEETS_AVAILABLE:
        logger.warning("Google Sheets logging skipped - dependencies not installed")
        logger.info(f"Would have logged to sheets: {data}")
        return f"[Warning] Google Sheets logging not available - data logged to console instead"
    
    try:
        # Define the scope and credentials
        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        
        # Check if credentials file exists
        creds_file = os.path.join(os.path.dirname(__file__), "credentials.json")
        if not os.path.exists(creds_file):
            logger.warning(f"Credentials file not found at {creds_file}")
            return f"[Error] Credentials file not found. Data logged to console instead."
            
        creds = ServiceAccountCredentials.from_json_keyfile_name(creds_file, scope)
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
        logger.error(f"Failed to log to sheet: {str(e)}")
        return f"[Error] Failed to log to sheet: {str(e)}"
