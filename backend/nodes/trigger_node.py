import logging
from typing import Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

def run_trigger_node(data=None):
    """
    Handle different trigger types (legacy sync version)
    
    Args:
        data: Dictionary containing trigger configuration
        
    Returns:
        Dictionary with trigger status
    """
    # Safety check for None input
    if data is None:
        return {
            "output": "Trigger activated (no data provided)",
            "type": "trigger_status",
            "trigger_type": "manual"
        }
    
    trigger_type = data.get("triggerType", "manual")
    trigger_id = data.get("nodeId", "unknown")
    label = data.get("label", "Trigger")
    
    if trigger_type == "manual":
        return {
            "output": "Manual trigger activated",
            "type": "trigger_status",
            "trigger_type": "manual",
            "trigger_id": trigger_id
        }
    elif trigger_type == "webhook":
        return {
            "output": "Waiting for webhook...",
            "type": "trigger_status",
            "trigger_type": "webhook",
            "trigger_id": trigger_id
        }
    elif trigger_type == "schedule":
        return {
            "output": f"Scheduled trigger at {data.get('runAt', 'N/A')}",
            "type": "trigger_status",
            "trigger_type": "schedule",
            "trigger_id": trigger_id
        }
    else:
        return {
            "output": f"Unknown trigger type: {trigger_type}",
            "type": "error",
            "trigger_type": trigger_type,
            "trigger_id": trigger_id
        }

async def process_trigger_node(
    node_data: Dict[str, Any], 
    inputs: Dict[str, Any], 
    context: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Enhanced async trigger node processor for the node processor system
    
    Args:
        node_data: Dictionary containing trigger configuration
        inputs: Input data from connected nodes (usually empty for triggers)
        context: Execution context
        
    Returns:
        Dictionary with trigger status and execution info
    """
    try:
        from backend.models.data import NodeData
        
        # Safety check for None input
        if node_data is None:
            logger.error("process_trigger_node received None node_data")
            return NodeData.from_error("Trigger node data is missing")
        
        trigger_type = node_data.get("triggerType", "manual")
        trigger_id = node_data.get("nodeId") or node_data.get("id", "unknown")
        label = node_data.get("label", "Trigger")
        
        logger.info(f"Processing trigger node {trigger_id} of type {trigger_type}")
        
        # Create base result
        result = {
            "status": "started",
            "trigger_type": trigger_type,
            "trigger_id": trigger_id,
            "label": label,
            "timestamp": datetime.now().isoformat(),
            "execution_index": 0  # Triggers are always first
        }
        
        if trigger_type == "manual":
            result.update({
                "output": f"Manual trigger '{label}' activated - workflow started",
                "type": "trigger_status"
            })
        elif trigger_type == "webhook":
            result.update({
                "output": f"Webhook trigger '{label}' activated - workflow started",
                "type": "trigger_status",
                "webhook_url": f"/api/triggers/{trigger_id}"
            })
        elif trigger_type == "schedule":
            run_at = node_data.get("runAt", "N/A")
            schedule_type = node_data.get("scheduleType", "once")
            result.update({
                "output": f"Scheduled trigger '{label}' activated at {run_at} - workflow started",
                "type": "trigger_status",
                "schedule_type": schedule_type,
                "run_at": run_at
            })
        else:
            result.update({
                "output": f"Unknown trigger type: {trigger_type}",
                "type": "error",
                "error": f"Unsupported trigger type: {trigger_type}"
            })
            return NodeData.from_error(f"Unsupported trigger type: {trigger_type}")
        
        # Return as NodeData
        return NodeData.from_value(result)
        
    except Exception as e:
        logger.error(f"Error in trigger node processor: {str(e)}")
        return NodeData.from_error(f"Trigger execution failed: {str(e)}")


