# /backend/frameworks/email_notifier.py
import smtplib
import os
from email.mime.text import MIMEText

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
        msg['From'] = "noreply@opsyde.io"
        msg['To'] = hr_email

        # For development, just return the message instead of sending
        return f"✅ Would send email to {hr_email} with subject: {subject}"
        
        # Uncomment this to actually send emails
        """
        smtp_server = "smtp.gmail.com"
        smtp_port = 587
        smtp_user = "noreply@opsyde.io"
        smtp_pass = os.getenv("OPSYDE_EMAIL_PASS")

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, [hr_email], msg.as_string())
        server.quit()

        return "Email sent!"
        """
    except Exception as e:
        return f"[Error] Email not sent: {str(e)}"
