import os
import json
import uuid
from datetime import datetime

# Create directory for workflows if it doesn't exist
os.makedirs("data/workflows", exist_ok=True)

# Generate a unique ID for the flow
flow_id = str(uuid.uuid4())

# Create a sample flow with basic nodes
sample_flow = {
    "id": flow_id,
    "name": "Sample Input-Output Flow",
    "description": "A basic flow with input and output nodes",
    "owner_id": "f31db8d3-7b54-46b5-bebf-1ea7b6b2edff",
    "nodes": [
        {
            "id": "input-node-1",
            "type": "input",
            "position": {"x": 100, "y": 100},
            "data": {
                "label": "User Input",
                "inputType": "text",
                "placeholder": "Enter some text"
            }
        },
        {
            "id": "output-node-1",
            "type": "output",
            "position": {"x": 400, "y": 100},
            "data": {
                "label": "Text Output",
                "output_type": "webhook",
                "config": {
                    "url": "https://webhook.site/your-test-id"
                }
            }
        }
    ],
    "edges": [
        {
            "id": "edge-1",
            "source": "input-node-1",
            "target": "output-node-1",
            "sourceHandle": "output",
            "targetHandle": "input"
        }
    ],
    "created_at": datetime.now().isoformat(),
    "updated_at": datetime.now().isoformat()
}

# Save the sample flow to a file
file_path = os.path.join("data/workflows", f"{flow_id}.json")
with open(file_path, 'w') as f:
    json.dump(sample_flow, f, indent=2)

print(f"Sample flow created successfully! Saved to {file_path}") 