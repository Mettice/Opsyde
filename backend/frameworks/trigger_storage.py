import json
import os
import logging
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

# Create triggers directory if it doesn't exist
TRIGGERS_DIR = Path("./database/triggers")
TRIGGERS_DIR.mkdir(parents=True, exist_ok=True)

def register_trigger(trigger_id, flow_data, owner="system"):
    """
    Register a new trigger with its associated flow
    """
    try:
        trigger_data = {
            "flow": flow_data,
            "created_at": datetime.now().isoformat(),
            "owner": owner,
            "last_triggered": None,
            "trigger_count": 0
        }
        
        # Save to file
        with open(TRIGGERS_DIR / f"{trigger_id}.json", "w") as f:
            json.dump(trigger_data, f, indent=2)
            
        logger.info(f"Registered trigger {trigger_id} for owner {owner}")
        return True
    except Exception as e:
        logger.error(f"Error registering trigger {trigger_id}: {str(e)}")
        return False

def get_trigger_flow(trigger_id):
    """
    Retrieve a flow associated with a trigger ID
    """
    try:
        trigger_file = TRIGGERS_DIR / f"{trigger_id}.json"
        if not trigger_file.exists():
            logger.warning(f"Trigger ID not found: {trigger_id}")
            return None
            
        with open(trigger_file, "r") as f:
            trigger_data = json.load(f)
            
        # Update trigger stats
        trigger_data["last_triggered"] = datetime.now().isoformat()
        trigger_data["trigger_count"] = trigger_data.get("trigger_count", 0) + 1
        
        # Save updated stats
        with open(trigger_file, "w") as f:
            json.dump(trigger_data, f, indent=2)
            
        return trigger_data["flow"]
    except Exception as e:
        logger.error(f"Error retrieving trigger {trigger_id}: {str(e)}")
        return None

def list_triggers(owner=None):
    """
    List all registered triggers, optionally filtered by owner
    """
    try:
        triggers = []
        for trigger_file in TRIGGERS_DIR.glob("*.json"):
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
                    "trigger_count": trigger_data.get("trigger_count", 0)
                })
            except Exception as e:
                logger.error(f"Error reading trigger file {trigger_file}: {str(e)}")
                
        return triggers
    except Exception as e:
        logger.error(f"Error listing triggers: {str(e)}")
        return []

def delete_trigger(trigger_id):
    """
    Delete a registered trigger
    """
    try:
        trigger_file = TRIGGERS_DIR / f"{trigger_id}.json"
        if trigger_file.exists():
            trigger_file.unlink()
            logger.info(f"Deleted trigger {trigger_id}")
            return True
        return False
    except Exception as e:
        logger.error(f"Error deleting trigger {trigger_id}: {str(e)}")
        return False 