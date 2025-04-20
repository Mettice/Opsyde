# backend/frameworks/delay_runner.py

import asyncio
import logging
import re

logger = logging.getLogger(__name__)

async def run_delay_node(data):
    """
    Pauses execution for the specified duration
    """
    duration_str = data.get("duration", "5s")
    delay_seconds = parse_duration(duration_str)
    
    if delay_seconds is None:
        logger.warning(f"Invalid delay duration format: {duration_str}")
        return f"Invalid delay format: {duration_str}, using default 5 seconds"
    
    logger.info(f"Delaying workflow for {delay_seconds} seconds ({duration_str})")
    
    # Perform the actual delay
    await asyncio.sleep(delay_seconds)
    
    return f"Completed delay of {duration_str}"

def parse_duration(duration_str):
    """
    Parse duration strings like "5s", "2m", "1h" into seconds
    """
    try:
        # Use regex to extract the number and unit
        match = re.match(r"(\d+)([smh])?", duration_str.lower())
        if not match:
            return 5  # Default to 5 seconds on invalid format
        
        value, unit = match.groups()
        value = int(value)
        
        # Convert to seconds based on unit
        if unit == "m":
            return value * 60
        elif unit == "h":
            return value * 3600
        else:  # Default to seconds
            return value
    except Exception as e:
        logger.error(f"Error parsing duration: {str(e)}")
        return 5  # Default to 5 seconds on error
