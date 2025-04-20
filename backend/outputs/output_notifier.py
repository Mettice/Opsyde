# backend/outputs/webhook_notifier.py

import requests
import json
import logging

logger = logging.getLogger(__name__)

def run_webhook_notifier(tool_data: dict, result: any) -> str:
    """
    Generic webhook dispatcher.

    Args:
        tool_data: Node data with config, including webhook_url
        result: Output result from prior node

    Returns:
        Status string
    """
    try:
        webhook_url = tool_data.get("webhook_url") or tool_data.get("config", {}).get("webhook_url")
        if not webhook_url:
            return "⚠️ No webhook URL provided"

        payload = {
            "source": tool_data.get("label", "Nodai Output Tool"),
            "result": result,
            "metadata": {
                "nodeId": tool_data.get("nodeId"),
                "category": tool_data.get("category"),
                "framework": tool_data.get("framework")
            }
        }

        response = requests.post(
            webhook_url,
            data=json.dumps(payload),
            headers={"Content-Type": "application/json"},
            timeout=10
        )

        response.raise_for_status()
        return f"✅ Posted to webhook (Status {response.status_code})"

    except requests.exceptions.RequestException as e:
        logger.error(f"Webhook error: {str(e)}")
        return f"❌ Webhook failed: {str(e)}"
