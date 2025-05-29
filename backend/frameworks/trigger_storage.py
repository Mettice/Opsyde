import json
import os
import logging
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

# Try multiple locations for the triggers directory
TRIGGERS_DIRS = [
    Path("./backend/triggers"),  # From root directory - THIS IS WHERE YOUR TRIGGERS ARE!
    Path("./triggers"),  # From backend directory
    Path("../triggers"), # From backend directory going up
    Path(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "triggers")),  # Relative to this file
    Path(os.path.expanduser("~/triggers")),
    Path("../../triggers")
]

# Try to create each directory
for dir_path in TRIGGERS_DIRS:
    try:
        dir_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Created triggers directory at: {dir_path.absolute()}")
    except Exception as e:
        logger.error(f"Error creating triggers directory at {dir_path}: {str(e)}")

# Use the first directory that exists
TRIGGERS_DIR = next((d for d in TRIGGERS_DIRS if d.exists()), Path("./triggers"))
logger.info(f"Using triggers directory: {TRIGGERS_DIR.absolute()}")

# In-memory storage as a fallback
IN_MEMORY_TRIGGERS = {}

async def get_trigger_owner(trigger_id: str) -> str:
    """
    Get the owner of a trigger
    
    Args:
        trigger_id: The ID of the trigger
        
    Returns:
        The owner of the trigger, or None if not found
    """
    try:
        # First check file storage
        trigger_file = TRIGGERS_DIR / f"{trigger_id}.json"
        if trigger_file.exists():
            with open(trigger_file, "r") as f:
                trigger_data = json.load(f)
                return trigger_data.get("owner")
                
        # Fall back to in-memory storage
        if trigger_id in IN_MEMORY_TRIGGERS:
            return IN_MEMORY_TRIGGERS[trigger_id].get("owner")
            
        logger.warning(f"Trigger ID not found: {trigger_id}")
        return None
        
    except Exception as e:
        logger.error(f"Error getting trigger owner for {trigger_id}: {str(e)}")
        return None

async def register_trigger(trigger_id, flow_data, owner="system"):
    """
    Register a new trigger with its associated flow
    """
    try:
        # Log the registration attempt with more details
        trigger_type = flow_data.get("trigger_type", "unknown")
        logger.info(f"Registering trigger {trigger_id} of type {trigger_type} for owner {owner}")
        
        # Create the trigger data structure
        trigger_data = {
            "flow": flow_data,
            "created_at": datetime.now().isoformat(),
            "owner": owner,
            "last_triggered": None,
            "trigger_count": 0,
            "trigger_type": trigger_type
        }
        
        # Try file-based storage first
        try:
            # Save to file
            trigger_file = TRIGGERS_DIR / f"{trigger_id}.json"
            with open(trigger_file, "w") as f:
                json.dump(trigger_data, f, indent=2)
            
            logger.info(f"Successfully saved trigger {trigger_id} to {trigger_file}")
            
            # Also store in memory as a backup
            IN_MEMORY_TRIGGERS[trigger_id] = trigger_data
            
            return True
        except Exception as e:
            logger.error(f"Error saving to file, falling back to in-memory storage: {str(e)}")
            
            # Fall back to in-memory storage
            IN_MEMORY_TRIGGERS[trigger_id] = trigger_data
            logger.info(f"Saved trigger {trigger_id} to in-memory storage")
            
            return True
    except Exception as e:
        logger.error(f"Error registering trigger {trigger_id}: {str(e)}")
        return False

async def get_trigger_flow(trigger_id, increment_count=False):
    """
    Retrieve a flow associated with a trigger ID
    
    Args:
        trigger_id: The ID of the trigger
        increment_count: Whether to increment the trigger count (should only be true during actual execution)
    """
    try:
        trigger_data = None
        
        # First try file storage
        trigger_file = TRIGGERS_DIR / f"{trigger_id}.json"
        if trigger_file.exists():
            with open(trigger_file, "r") as f:
                trigger_data = json.load(f)
        else:
            # Fall back to in-memory storage
            if trigger_id in IN_MEMORY_TRIGGERS:
                trigger_data = IN_MEMORY_TRIGGERS[trigger_id].copy()
            else:
                logger.warning(f"Trigger ID not found in file or memory: {trigger_id}")
                return None
        
        # Only update stats if this is an actual execution, not just a status check
        if increment_count and trigger_data:
            trigger_data["last_triggered"] = datetime.now().isoformat()
            trigger_data["trigger_count"] = trigger_data.get("trigger_count", 0) + 1
            
            # For one-time schedule triggers, mark as completed after execution
            if trigger_data.get("trigger_type") == "schedule" and trigger_data.get("flow", {}).get("trigger_type") == "schedule":
                schedule_type = trigger_data.get("flow", {}).get("nodes", [])[0].get("data", {}).get("scheduleType")
                if schedule_type == "once":
                    trigger_data["completed"] = True
                    trigger_data["completed_at"] = datetime.now().isoformat()
                    logger.info(f"Marked one-time schedule trigger {trigger_id} as completed")
            
            # Save updated stats back to file if it exists, otherwise update in-memory
            if trigger_file.exists():
                with open(trigger_file, "w") as f:
                    json.dump(trigger_data, f, indent=2)
            else:
                IN_MEMORY_TRIGGERS[trigger_id] = trigger_data
            
        return trigger_data["flow"] if trigger_data else None
    except Exception as e:
        logger.error(f"Error retrieving trigger {trigger_id}: {str(e)}")
        return None

async def execute_trigger(trigger_id):
    """
    Mark a trigger as executed and increment its count
    
    Args:
        trigger_id: The ID of the trigger to execute
    
    Returns:
        The flow data associated with the trigger, or None if not found
    """
    return await get_trigger_flow(trigger_id, increment_count=True)

async def list_triggers(owner=None):
    """
    List all registered triggers, optionally filtered by owner
    """
    try:
        triggers = []
        
        # First try to get triggers from files
        try:
            # Log the directory we're checking
            logger.info(f"Checking for triggers in directory: {TRIGGERS_DIR.absolute()}")
            
            # Check if directory exists
            if TRIGGERS_DIR.exists():
                # List all JSON files in the directory
                trigger_files = list(TRIGGERS_DIR.glob("*.json"))
                logger.info(f"Found {len(trigger_files)} trigger files")
                
                for trigger_file in trigger_files:
                    try:
                        with open(trigger_file, "r") as f:
                            trigger_data = json.load(f)
                            
                        if owner and trigger_data.get("owner") != owner:
                            continue
                            
                        trigger_id = trigger_file.stem
                        triggers.append({
                            "id": trigger_id,
                            "created_at": trigger_data.get("created_at"),
                            "owner": trigger_data.get("owner"),
                            "last_triggered": trigger_data.get("last_triggered"),
                            "trigger_count": trigger_data.get("trigger_count", 0),
                            "trigger_type": trigger_data.get("trigger_type", "unknown"),
                            "completed": trigger_data.get("completed", False),
                            "completed_at": trigger_data.get("completed_at", None)
                        })
                    except Exception as e:
                        logger.error(f"Error reading trigger file {trigger_file}: {str(e)}")
            else:
                logger.warning(f"Triggers directory does not exist: {TRIGGERS_DIR.absolute()}")
        except Exception as e:
            logger.error(f"Error listing triggers from files: {str(e)}")
        
        # Then add triggers from in-memory storage
        logger.info(f"Checking in-memory triggers: {len(IN_MEMORY_TRIGGERS)}")
        for trigger_id, trigger_data in IN_MEMORY_TRIGGERS.items():
            if owner and trigger_data.get("owner") != owner:
                continue
                
            # Check if this trigger is already in the list
            if not any(t["id"] == trigger_id for t in triggers):
                triggers.append({
                    "id": trigger_id,
                    "created_at": trigger_data.get("created_at"),
                    "owner": trigger_data.get("owner"),
                    "last_triggered": trigger_data.get("last_triggered"),
                    "trigger_count": trigger_data.get("trigger_count", 0),
                    "trigger_type": trigger_data.get("trigger_type", "unknown")
                })
        
        logger.info(f"Total triggers found: {len(triggers)}")
        return triggers
    except Exception as e:
        logger.error(f"Error listing triggers: {str(e)}")
        return []

async def delete_trigger(trigger_id):
    """
    Delete a registered trigger
    """
    try:
        trigger_file = TRIGGERS_DIR / f"{trigger_id}.json"
        if trigger_file.exists():
            trigger_file.unlink()
            logger.info(f"Deleted trigger {trigger_id}")
            
            # Also remove from in-memory storage if present
            IN_MEMORY_TRIGGERS.pop(trigger_id, None)
            
            return True
            
        # Check in-memory storage
        if trigger_id in IN_MEMORY_TRIGGERS:
            del IN_MEMORY_TRIGGERS[trigger_id]
            return True
            
        return False
    except Exception as e:
        logger.error(f"Error deleting trigger {trigger_id}: {str(e)}")
        return False

async def update_trigger_metadata(trigger_id, metadata):
    """
    Update metadata for a trigger
    """
    try:
        trigger_file = TRIGGERS_DIR / f"{trigger_id}.json"
        if not trigger_file.exists():
            # Check in-memory storage
            if trigger_id in IN_MEMORY_TRIGGERS:
                IN_MEMORY_TRIGGERS[trigger_id].update(metadata)
                return True
                
            logger.warning(f"Trigger ID not found for metadata update: {trigger_id}")
            return False
            
        with open(trigger_file, "r") as f:
            trigger_data = json.load(f)
            
        # Update the metadata
        trigger_data.update(metadata)
        
        # Save back to file
        with open(trigger_file, "w") as f:
            json.dump(trigger_data, f, indent=2)
            
        # Update in-memory storage if present
        if trigger_id in IN_MEMORY_TRIGGERS:
            IN_MEMORY_TRIGGERS[trigger_id].update(metadata)
            
        return True
    except Exception as e:
        logger.error(f"Error updating trigger metadata for {trigger_id}: {str(e)}")
        return False 