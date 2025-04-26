import asyncio
import re
import logging
from typing import Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

async def run_delay_node(data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run a delay node that pauses execution for a specified duration
    
    Args:
        data: Delay node configuration including duration
        inputs: Input values (not used for delay nodes)
        
    Returns:
        Dictionary containing the delay result and metadata
    """
    try:
        # Extract and validate duration
        duration_str = data.get("duration", "5s")
        match = re.match(r"(\d+)(s|m|h)", duration_str.strip().lower())
        if not match:
            raise ValueError(f"Invalid delay format: {duration_str}")

        # Calculate delay in seconds
        value, unit = match.groups()
        value = int(value)
        seconds = value * (60 if unit == "m" else 3600 if unit == "h" else 1)
        
        # Log the delay
        logger.info(f"Starting delay of {duration_str} ({seconds} seconds)")
        start_time = datetime.now()
        
        # Execute the delay
        await asyncio.sleep(seconds)
        
        # Calculate actual duration
        end_time = datetime.now()
        actual_duration = (end_time - start_time).total_seconds()
        
        # Return structured response
        return {
            "type": "delay_result",
            "output": {
                "duration": duration_str,
                "seconds": seconds,
                "actual_duration": actual_duration
            },
            "metadata": {
                "timestamp": end_time.isoformat(),
                "node_type": "delay",
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Error in delay node: {str(e)}")
        return {
            "type": "error",
            "error": str(e),
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "node_type": "delay"
            }
        }

