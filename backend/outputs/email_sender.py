# backend/outputs/email_sender.py
# This file exists for backward compatibility and forwards all imports to
# the consolidated implementation in frameworks/email_notifier.py

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)
logger.warning("backend.outputs.email_sender is deprecated. Please use backend.frameworks.email_notifier instead.")

# Import the consolidated implementations
from backend.frameworks.email_notifier import (
    send_email,
    format_output_for_email,
    send_candidate_email,
    send_email_async
)

# Re-export all functions for backward compatibility
__all__ = [
    'send_email',
    'format_output_for_email',
    'send_candidate_email',
    'send_email_async'
]