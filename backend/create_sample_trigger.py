import os
import json
import uuid
from datetime import datetime

# Create triggers directory if it doesn't exist
os.makedirs("data/triggers", exist_ok=True)

# Create a sample trigger
trigger_id = f"sample-trigger-{uuid.uuid4()}"
sample_trigger = {
    "id": trigger_id,
    "trigger_id": trigger_id,
    "created_at": datetime.now().isoformat(),
    "owner": "f31db8d3-7b54-46b5-bebf-1ea7b6b2edff",
    "trigger_count": 1,
    "last_executed": datetime.now().isoformat(),
    "trigger_type": "webhook",
    "flow": {
        "trigger_id": trigger_id,
        "trigger_type": "webhook",
        "nodes": [
            {
                "id": trigger_id,
                "type": "trigger",
                "data": {
                    "triggerType": "webhook",
                    "label": "Sample Webhook Trigger"
                }
            }
        ],
        "edges": []
    }
}

# Save sample trigger to file
trigger_path = os.path.join("data/triggers", f"{trigger_id}.json")
with open(trigger_path, "w") as f:
    json.dump(sample_trigger, f, indent=2)

print(f"Created sample trigger: {trigger_path}") 