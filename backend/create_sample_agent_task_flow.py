import os
import json
import uuid
from datetime import datetime

# Create directory for workflows if it doesn't exist
os.makedirs("data/workflows", exist_ok=True)

# Generate a unique ID for the flow
flow_id = str(uuid.uuid4())

# Create a sample agent-task flow
sample_flow = {
    "id": flow_id,
    "name": "Agent with Task Test - Updated",
    "description": "A flow with agent and task nodes with proper handle IDs and data",
    "owner_id": "f31db8d3-7b54-46b5-bebf-1ea7b6b2edff",
    "nodes": [
        {
            "id": "input-node-2",
            "type": "input",
            "position": {"x": 100, "y": 100},
            "data": {
                "label": "User Query",
                "inputType": "text",
                "placeholder": "Ask a question",
                "nodeId": "input-node-2",
                "nodeType": "input"
            }
        },
        {
            "id": "agent-node-1",
            "type": "agent",
            "position": {"x": 400, "y": 100},
            "data": {
                "label": "Research Assistant",
                "role": "Research Assistant",
                "goal": "Find accurate information for user queries",
                "backstory": "You are an experienced researcher with expertise in many fields",
                "llmModel": "gpt-4",
                "temperature": 0.7,
                "max_tokens": 4000,
                "framework": "openai",
                "memoryEnabled": True,
                "nodeId": "agent-node-1",
                "nodeType": "agent"
            }
        },
        {
            "id": "task-node-1",
            "type": "task",
            "position": {"x": 700, "y": 100},
            "data": {
                "label": "Research Task",
                "description": "Research the topic and provide a detailed response",
                "expectedOutput": "A thorough explanation with relevant information",
                "nodeId": "task-node-1",
                "nodeType": "task",
                "priority": "Medium"
            }
        },
        {
            "id": "output-node-2",
            "type": "output",
            "position": {"x": 1000, "y": 100},
            "data": {
                "label": "Response Output",
                "outputType": "webhook",
                "config": {
                    "url": "https://webhook.site/a450a8da-cfce-4a72-9567-06c0eba8ce1a"
                },
                "nodeId": "output-node-2",
                "nodeType": "output"
            }
        }
    ],
    "edges": [
        {
            "id": "edge-2-1",
            "source": "input-node-2",
            "target": "agent-node-1",
            "sourceHandle": "output",
            "targetHandle": "target"
        },
        {
            "id": "edge-2-2",
            "source": "agent-node-1",
            "target": "task-node-1",
            "sourceHandle": "output",
            "targetHandle": "agent"
        },
        {
            "id": "edge-2-3",
            "source": "task-node-1",
            "target": "output-node-2",
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

print(f"Sample agent-task flow created successfully! Saved to {file_path}") 