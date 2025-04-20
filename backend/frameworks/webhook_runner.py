# backend/runners/webhook_runner.py

import requests
import json
import logging

logger = logging.getLogger(__name__)

def post_to_webhook(data):
    """
    Post data to a webhook URL

    Args:
        data: Dictionary containing the data to post and webhook_url

    Returns:
        String indicating success or failure
    """
    try:
        webhook_url = data.get("webhook_url")
        if not webhook_url:
            return "No webhook URL provided"

        # Remove the webhook_url from the payload
        payload = {k: v for k, v in data.items() if k != "webhook_url"}

        # Make the POST request
        response = requests.post(
            webhook_url,
            data=json.dumps(payload),
            headers={"Content-Type": "application/json"}
        )

        # Check if the request was successful
        response.raise_for_status()

        return f"Successfully posted to webhook (Status: {response.status_code})"

    except requests.exceptions.RequestException as e:
        logger.error(f"Error posting to webhook: {str(e)}")
        return f"Failed to post to webhook: {str(e)}"
