# backend/email_runner.py
import os
import smtplib
from email.mime.text import MIMEText

def send_email(logs, to="user@example.com"):
    msg = MIMEText(logs)
    msg["Subject"] = "Opsyde Crew Output"
    msg["From"] = os.getenv("EMAIL_SENDER")
    msg["To"] = to

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(os.getenv("EMAIL_SENDER"), os.getenv("EMAIL_PASSWORD"))
            server.send_message(msg)
        return "✅ Email sent!"
    except Exception as e:
        return f"❌ Email failed: {str(e)}"
