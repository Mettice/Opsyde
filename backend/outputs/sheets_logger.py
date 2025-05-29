# backend/outputs/sheets_logger.py
# This file exists for backward compatibility and forwards all imports to
# the consolidated implementation in frameworks/sheets_logger.py

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)
logger.warning("backend.outputs.sheets_logger is deprecated. Please use backend.frameworks.sheets_logger instead.")

# Import the consolidated implementation
from frameworks.sheets_logger import log_to_sheet

# Create function aliases for backward compatibility
def push_to_sheet(logs, sheet_name="Logs"):
    """
    Backward compatibility function for pushing to sheets
    """
    return log_to_sheet({
        "data": logs,
        "sheet_name": sheet_name
    })

def send_to_sheet(logs, sheet_id):
    """
    Legacy function for sending to sheets
    """
    return log_to_sheet({
        "data": logs,
        "sheet_id": sheet_id
    })

# Re-export all functions for backward compatibility
__all__ = [
    'log_to_sheet',
    'push_to_sheet',
    'send_to_sheet'
]