import gspread
from oauth2client.service_account import ServiceAccountCredentials
import requests


def run_custom_tool(data):
    if data["label"] == "Google Sheet Logger":
        try:
            scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
            creds = ServiceAccountCredentials.from_json_keyfile_name('creds.json', scope)
            client = gspread.authorize(creds)
            sheet = client.open("Candidate Scores").sheet1
            sheet.append_row([data["candidate_name"], data["score"], data.get("notes", "")])
            return "Logged to Google Sheet"
        except Exception as e:
            return f"[Error] {str(e)}"
    return "Unknown Custom Tool"


def run_clearbit_tool(data):
    try:
        email = data.get("email", "")
        domain = data.get("company_name", "")
        # Mocked response here for now — replace with Clearbit if needed
        return {
            "name": "Daniel Hope",
            "email": email,
            "company": domain,
            "industry": "SaaS",
            "employees": 42,
            "tech_stack": ["Python", "React"]
        }
    except Exception as e:
        return f"[Error] Enrichment Failed: {str(e)}"

def run_lead_scorer(data):
    try:
        score = 0
        industry = data.get("industry", "").lower()
        employees = int(data.get("employees", 0))
        tech = data.get("tech_stack", [])

        if "saas" in industry:
            score += 30
        if employees < 100:
            score += 30
        if "python" in tech:
            score += 20
        if "react" in tech:
            score += 10

        return { "score": score }
    except Exception as e:
        return { "score": 0, "error": str(e) }

def run_log_lead_to_sheet(data):
    try:
        scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
        creds = ServiceAccountCredentials.from_json_keyfile_name('creds.json', scope)
        client = gspread.authorize(creds)
        sheet = client.open("Lead Scores").sheet1

        sheet.append_row([data['name'], data['email'], data['company'], data['industry'], data['score']])
        return "Lead logged to Google Sheet."
    except Exception as e:
        return f"Failed to log lead: {str(e)}"
