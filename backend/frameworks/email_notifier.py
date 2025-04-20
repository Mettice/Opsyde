# /backend/frameworks/email_notifier.py
import smtplib
import os
from email.mime.text import MIMEText
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def send_candidate_email(parsed_data, hr_email="hr@company.com"):
    try:
        subject = f"Candidate Match: {parsed_data.get('name')} - Score {parsed_data.get('score')}"
        body = f"""
        Name: {parsed_data.get('name')}
        Email: {parsed_data.get('email')}
        Skills: {', '.join(parsed_data.get('skills', []))}
        Experience: {parsed_data.get('experience')} years
        Score: {parsed_data.get('score')}
        Recommendation: {parsed_data.get('recommendation')}
        """

        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = os.getenv("EMAIL_SENDER", "noreply@opsyde.io")
        msg['To'] = hr_email

        # Uncomment this to actually send emails
        smtp_server = "smtp.gmail.com"  # Change based on your email provider
        smtp_port = 587
        smtp_user = os.getenv("EMAIL_SENDER")
        smtp_pass = os.getenv("EMAIL_PASSWORD")

        if not smtp_user or not smtp_pass:
            return f"⚠️ Email not sent: Missing EMAIL_SENDER or EMAIL_PASSWORD in .env file"

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, [hr_email], msg.as_string())
        server.quit()

        return f"✅ Email sent to {hr_email} with subject: {subject}"
        
    except Exception as e:
        return f"[Error] Email not sent: {str(e)}"
