import os
import sys
import uuid
import json
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uvicorn

# Create sample data directories
os.makedirs("data/workflows", exist_ok=True)
os.makedirs("data/triggers", exist_ok=True)

# Create a sample workflow if none exist
sample_workflow = {
    "id": str(uuid.uuid4()),
    "name": "Sample Workflow",
    "description": "A sample workflow created automatically",
    "owner_id": "f31db8d3-7b54-46b5-bebf-1ea7b6b2edff",
    "nodes": [
        {
            "id": "node-1",
            "type": "input",
            "data": {"label": "Input Node"}
        },
        {
            "id": "node-2",
            "type": "output",
            "data": {"label": "Output Node"}
        }
    ],
    "edges": [
        {
            "id": "edge-1",
            "source": "node-1",
            "target": "node-2"
        }
    ],
    "created_at": datetime.now().isoformat(),
    "updated_at": datetime.now().isoformat()
}

# Save sample workflow to file
workflow_path = os.path.join("data/workflows", f"{sample_workflow['id']}.json")
if not os.path.exists(workflow_path):
    with open(workflow_path, "w") as f:
        json.dump(sample_workflow, f, indent=2)
    print(f"Created sample workflow: {workflow_path}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 