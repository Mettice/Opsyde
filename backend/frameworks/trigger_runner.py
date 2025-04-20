# backend/frameworks/trigger_runner.py

import logging
import asyncio
from datetime import datetime
import re
import calendar
from datetime import timedelta
from typing import Dict, Any

logger = logging.getLogger(__name__)

async def run_trigger_node(node_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle different trigger types with enhanced scheduling
    """
    # Safety check for None input
    if node_data is None:
        logger.error("run_trigger_node received None node_data")
        return {
            "output": "Trigger activated (no data provided)",
            "type": "trigger_status",
            "trigger_type": "manual"
        }
        
    try:
        trigger_type = node_data.get("triggerType", "manual")
        trigger_id = node_data.get("nodeId", "unknown")
        label = node_data.get("label", "Trigger")
        
        logger.info(f"Processing trigger node {trigger_id} of type {trigger_type}")
        
        if trigger_type == "schedule":
            schedule_type = node_data.get("scheduleType", "once")
            
            if schedule_type == "once":
                # Handle one-time schedule
                run_at = node_data.get("runAt", "")
                if run_at:
                    try:
                        target_time = datetime.strptime(run_at, "%Y-%m-%d %H:%M")
                        now = datetime.now()
                        seconds_to_wait = max(0, int((target_time - now).total_seconds()))
                        
                        if seconds_to_wait > 0:
                            logger.info(f"Scheduled trigger will wait for {seconds_to_wait} seconds until {run_at}")
                            await asyncio.sleep(seconds_to_wait)
                            return {
                                "output": f"One-time scheduled trigger executed at {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                                "type": "trigger_status",
                                "trigger_type": trigger_type,
                                "trigger_id": trigger_id
                            }
                        else:
                            return {
                                "output": "Scheduled time is in the past, executing immediately",
                                "type": "trigger_status",
                                "trigger_type": trigger_type,
                                "trigger_id": trigger_id
                            }
                    except Exception as e:
                        logger.error(f"Error parsing schedule time: {str(e)}")
                        return {
                            "output": f"Error in scheduled trigger: {str(e)}",
                            "type": "error",
                            "error": str(e)
                        }
                return {
                    "output": "No schedule time specified, executing immediately",
                    "type": "trigger_status",
                    "trigger_type": trigger_type,
                    "trigger_id": trigger_id
                }
            
            elif schedule_type == "daily":
                # For daily schedules, check if current time is within the window
                start_time = node_data.get("scheduleStartTime", "09:00")
                end_time = node_data.get("scheduleEndTime", "17:00")
                
                now = datetime.now()
                current_time = now.strftime("%H:%M")
                
                if start_time <= current_time <= end_time:
                    return {
                        "output": f"Daily trigger executed at {current_time} (within window {start_time}-{end_time})",
                        "type": "trigger_status",
                        "trigger_type": trigger_type,
                        "trigger_id": trigger_id
                    }
                else:
                    return {
                        "output": f"Daily trigger skipped - current time {current_time} outside window {start_time}-{end_time}",
                        "type": "trigger_status",
                        "trigger_type": trigger_type,
                        "trigger_id": trigger_id
                    }
            
            elif schedule_type == "weekly":
                # For weekly schedules, check if today matches the selected weekday
                weekday = node_data.get("scheduleWeekday", "monday").lower()
                current_weekday = calendar.day_name[datetime.now().weekday()].lower()
                
                if weekday == current_weekday:
                    return {
                        "output": f"Weekly trigger executed on {weekday}",
                        "type": "trigger_status",
                        "trigger_type": trigger_type,
                        "trigger_id": trigger_id
                    }
                else:
                    return {
                        "output": f"Weekly trigger skipped - today is {current_weekday}, not {weekday}",
                        "type": "trigger_status",
                        "trigger_type": trigger_type,
                        "trigger_id": trigger_id
                    }
            
            elif schedule_type == "monthly":
                # For monthly schedules, check if today matches the selected day of month
                month_day = int(node_data.get("scheduleMonthDay", 1))
                current_day = datetime.now().day
                
                if month_day == current_day:
                    return {
                        "output": f"Monthly trigger executed on day {month_day}",
                        "type": "trigger_status",
                        "trigger_type": trigger_type,
                        "trigger_id": trigger_id
                    }
                else:
                    return {
                        "output": f"Monthly trigger skipped - today is day {current_day}, not {month_day}",
                        "type": "trigger_status",
                        "trigger_type": trigger_type,
                        "trigger_id": trigger_id
                    }
            
            return {
                "output": f"Unknown schedule type: {schedule_type}",
                "type": "error",
                "error": f"Unknown schedule type: {schedule_type}"
            }
        
        elif trigger_type == "webhook":
            webhook_url = f"/trigger/{trigger_id}"
            return {
                "output": f"Webhook trigger ready at {webhook_url} (waiting for external request)",
                "type": "trigger_status",
                "trigger_type": trigger_type,
                "trigger_id": trigger_id
            }
        
        # Default is manual trigger
        return {
            "output": "Manual trigger executed",
            "type": "trigger_status",
            "trigger_type": trigger_type,
            "trigger_id": trigger_id
        }
    except Exception as e:
        logger.error(f"Error in trigger node: {str(e)}")
        return {
            "output": f"Error: {str(e)}",
            "type": "error",
            "error": str(e)
        }

def seconds_until(timestamp_str):
    """
    Convert a timestamp (e.g., "2025-04-18 15:00") into seconds from now.
    """
    try:
        target = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M")
        now = datetime.now()
        return max(0, int((target - now).total_seconds()))
    except Exception:
        return 0
