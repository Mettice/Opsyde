# backend/outputs/discord_notifier.py
# This file exists for backward compatibility and forwards all imports to
# the consolidated implementation in frameworks/discord_notifier.py

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)
logger.warning("backend.outputs.discord_notifier is deprecated. Please use backend.frameworks.discord_notifier instead.")

# Import the consolidated implementation
from backend.frameworks.discord_notifier import run_discord_notifier

# Create function aliases for backward compatibility
def send_discord_message(message, webhook_url=None):
    """
    Backward compatibility function for sending Discord messages
    """
    return run_discord_notifier({"message": message}, webhook_url)

def post_to_discord(logs, webhook_url):
    """
    Legacy function for posting to Discord
    """
    return run_discord_notifier({"message": logs}, webhook_url)

# Re-export all functions for backward compatibility
__all__ = [
    'run_discord_notifier',
    'send_discord_message',
    'post_to_discord'
]
