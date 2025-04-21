import asyncio
import logging
import threading
from datetime import datetime
import time
from typing import Dict, Any, List

# Import only what's available
from .trigger_storage import list_triggers, get_trigger_flow
import crew_runner

logger = logging.getLogger(__name__)

# Global flag to control the scheduler loop
scheduler_running = False
scheduler_thread = None

# Define the update_trigger_metadata function locally if it's not available
def update_trigger_metadata(trigger_id, metadata):
    """
    Update metadata for a trigger (local implementation)
    """
    try:
        from .trigger_storage import update_trigger_metadata as storage_update_metadata
        return storage_update_metadata(trigger_id, metadata)
    except ImportError:
        logger.warning("Could not import update_trigger_metadata, using local implementation")
        try:
            from pathlib import Path
            import json
            
            # Use the same directory as in trigger_storage.py
            TRIGGERS_DIR = Path("./triggers")
            for dir_path in [Path("./triggers"), Path("../triggers"), Path("../../triggers")]:
                if dir_path.exists():
                    TRIGGERS_DIR = dir_path
                    break
            
            trigger_file = TRIGGERS_DIR / f"{trigger_id}.json"
            if not trigger_file.exists():
                logger.warning(f"Trigger ID not found for metadata update: {trigger_id}")
                return False
                
            with open(trigger_file, "r") as f:
                trigger_data = json.load(f)
                
            # Update the metadata
            trigger_data.update(metadata)
            
            # Save updated data
            with open(trigger_file, "w") as f:
                json.dump(trigger_data, f, indent=2)
                
            logger.info(f"Updated metadata for trigger {trigger_id}")
            return True
        except Exception as e:
            logger.error(f"Error updating trigger metadata {trigger_id}: {str(e)}")
            return False

async def check_and_run_scheduled_triggers():
    """
    Check for triggers that should be executed based on their schedule
    """
    try:
        # Get all registered triggers
        triggers = list_triggers()
        logger.info(f"Checking {len(triggers)} registered triggers")
        
        # Log more details about the triggers
        for trigger in triggers:
            logger.info(f"Found trigger: {trigger.get('id')} of type {trigger.get('trigger_type')}")
        
        for trigger in triggers:
            trigger_id = trigger.get("id")
            
            # Get the full flow data for this trigger
            flow_data = get_trigger_flow(trigger_id)
            if not flow_data:
                logger.warning(f"Could not retrieve flow data for trigger {trigger_id}")
                continue
                
            # Find the trigger node in the flow
            trigger_node = None
            for node in flow_data.get("nodes", []):
                if node.get("id") == trigger_id:
                    trigger_node = node
                    break
                    
            if not trigger_node:
                logger.warning(f"Could not find trigger node {trigger_id} in flow data")
                continue
                
            # Get trigger configuration
            trigger_data = trigger_node.get("data", {})
            trigger_type = trigger_data.get("triggerType")
            
            logger.info(f"Processing trigger {trigger_id} of type {trigger_type}")
            
            # Only process scheduled triggers
            if trigger_type != "schedule":
                logger.info(f"Skipping non-schedule trigger: {trigger_id}")
                continue
                
            # Check if this trigger should run now
            should_run = should_trigger_run_now(trigger_data)
            
            if should_run:
                logger.info(f"Executing scheduled trigger: {trigger_id}")
                
                # Run the flow asynchronously
                asyncio.create_task(execute_flow(flow_data))
            else:
                logger.info(f"Trigger {trigger_id} not scheduled to run at this time")
    except Exception as e:
        logger.error(f"Error in trigger scheduler: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())

def should_trigger_run_now(trigger_data: Dict[str, Any]) -> bool:
    """
    Determine if a trigger should run based on its schedule
    """
    try:
        schedule_type = trigger_data.get("scheduleType", "once")
        now = datetime.now()
        logger.info(f"Checking schedule: {schedule_type} at {now.strftime('%Y-%m-%d %H:%M')}")
        
        if schedule_type == "once":
            # One-time schedule
            run_at = trigger_data.get("runAt", "")
            logger.info(f"One-time schedule with runAt: {run_at}")
            
            if not run_at:
                # Try alternative fields that might contain the date/time
                run_date = trigger_data.get("runDate", "")
                run_time = trigger_data.get("runTime", "")
                if run_date and run_time:
                    run_at = f"{run_date} {run_time}"
                    logger.info(f"Constructed runAt from separate fields: {run_at}")
            
            if not run_at:
                logger.warning("No schedule time specified")
                return False
                
            try:
                # Try different date formats
                target_time = None
                for fmt in ["%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S"]:
                    try:
                        target_time = datetime.strptime(run_at, fmt)
                        break
                    except ValueError:
                        continue
                
                if not target_time:
                    logger.warning(f"Could not parse date: {run_at}")
                    return False
                
                # Allow a 5-minute window for execution (2.5 minutes before and 2.5 minutes after)
                time_diff = (now - target_time).total_seconds()
                
                # If the time is in the past but within 5 minutes, or in the future but within 2.5 minutes
                should_run = -150 <= time_diff <= 150  # 2.5 minutes = 150 seconds
                
                logger.info(f"Target time: {target_time}, Current time: {now}, Time diff: {time_diff} seconds, Should run: {should_run}")
                return should_run
            except Exception as e:
                logger.error(f"Error parsing schedule time: {str(e)}")
                return False
                
        elif schedule_type == "daily":
            # Daily schedule
            current_time = now.strftime("%H:%M")
            run_time = trigger_data.get("runTime", "09:00")
            
            # Check if current time is within 1 minute of the scheduled time
            try:
                scheduled_hour, scheduled_minute = map(int, run_time.split(":"))
                return (now.hour == scheduled_hour and 
                        abs(now.minute - scheduled_minute) < 1)
            except Exception:
                return False
                
        elif schedule_type == "weekly":
            # Weekly schedule
            weekday = trigger_data.get("scheduleWeekday", "monday").lower()
            current_weekday = now.strftime("%A").lower()
            run_time = trigger_data.get("runTime", "09:00")
            
            # Check if today is the scheduled day and time is within 1 minute
            try:
                if current_weekday != weekday:
                    return False
                    
                scheduled_hour, scheduled_minute = map(int, run_time.split(":"))
                return (now.hour == scheduled_hour and 
                        abs(now.minute - scheduled_minute) < 1)
            except Exception:
                return False
                
        elif schedule_type == "monthly":
            # Monthly schedule
            month_day = int(trigger_data.get("scheduleMonthDay", 1))
            run_time = trigger_data.get("runTime", "09:00")
            
            # Check if today is the scheduled day of month and time is within 1 minute
            try:
                if now.day != month_day:
                    return False
                    
                scheduled_hour, scheduled_minute = map(int, run_time.split(":"))
                return (now.hour == scheduled_hour and 
                        abs(now.minute - scheduled_minute) < 1)
            except Exception:
                return False
                
        return False
    except Exception as e:
        logger.error(f"Error checking trigger schedule: {str(e)}")
        return False

async def execute_flow(flow_data: Dict[str, Any]):
    """
    Execute a flow with the crew runner
    """
    try:
        # Add execution metadata
        flow_data["metadata"] = flow_data.get("metadata", {})
        flow_data["metadata"]["scheduled_execution"] = True
        flow_data["metadata"]["execution_time"] = datetime.now().isoformat()
        
        # Get the trigger ID
        trigger_id = flow_data.get("trigger_id")
        
        # Log more details about the flow
        nodes = flow_data.get("nodes", [])
        edges = flow_data.get("edges", [])
        logger.info(f"Executing flow with {len(nodes)} nodes and {len(edges)} edges")
        
        # Log the node types
        node_types = [node.get("type") for node in nodes]
        logger.info(f"Node types in flow: {node_types}")
        
        # Run the flow using the imported module
        async for log_line in crew_runner.run_crew(flow_data):
            logger.info(f"Scheduled flow output: {log_line}")
            
        # Check if this is a one-time trigger that should be marked as completed
        if trigger_id:
            trigger_nodes = [n for n in flow_data.get("nodes", []) if n.get("id") == trigger_id]
            if trigger_nodes:
                trigger_node = trigger_nodes[0]
                trigger_data = trigger_node.get("data", {})
                
                if trigger_data.get("triggerType") == "schedule" and trigger_data.get("scheduleType") == "once":
                    # This is a one-time trigger that has completed
                    # Mark it as completed in the metadata
                    update_trigger_metadata(trigger_id, {"completed": True, "completed_at": datetime.now().isoformat()})
                    logger.info(f"Marked one-time trigger {trigger_id} as completed")
    except Exception as e:
        logger.error(f"Error executing scheduled flow: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())

async def scheduler_loop():
    """
    Main scheduler loop that runs continuously
    """
    global scheduler_running
    
    logger.info("Starting trigger scheduler loop")
    scheduler_running = True
    
    while scheduler_running:
        await check_and_run_scheduled_triggers()
        # Wait for 30 seconds before checking again
        await asyncio.sleep(30)
        
    logger.info("Trigger scheduler loop stopped")

def start_scheduler():
    """
    Start the scheduler in a background thread
    """
    global scheduler_thread, scheduler_running
    
    if scheduler_running:
        logger.warning("Scheduler is already running")
        return
        
    def run_async_loop():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(scheduler_loop())
        
    scheduler_thread = threading.Thread(target=run_async_loop, daemon=True)
    scheduler_thread.start()
    logger.info("Trigger scheduler started in background thread")

def stop_scheduler():
    """
    Stop the scheduler
    """
    global scheduler_running
    scheduler_running = False
    logger.info("Trigger scheduler stopping (may take up to 30 seconds)") 