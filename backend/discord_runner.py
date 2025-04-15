import requests

def post_to_discord(logs, webhook_url):
    try:
        data = {"content": logs}
        res = requests.post(webhook_url, json=data)
        return "✅ Sent to Discord" if res.status_code == 204 else f"❌ Discord error: {res.text}"
    except Exception as e:
        return f"❌ Discord failed: {str(e)}"
