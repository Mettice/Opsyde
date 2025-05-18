from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
from fastapi import HTTPException

from backend.services.base_service import BaseService
from backend.utils.logging import get_logger
from backend.frameworks.trigger_storage import (
    register_trigger as storage_register_trigger,
    get_trigger_flow as storage_get_trigger_flow,
    execute_trigger as storage_execute_trigger,
    list_triggers as storage_list_triggers,
    delete_trigger as storage_delete_trigger,
    get_trigger_owner as storage_get_trigger_owner
)
from backend.frameworks.apscheduler_manager import scheduler_manager

logger = get_logger(__name__)

class TriggerService(BaseService[Dict]):
    """Service for managing workflow triggers"""

    async def get_by_id(self, id: str) -> Optional[Dict]:
        """Get a trigger by ID"""
        try:
            return await storage_get_trigger_flow(id)
        except Exception as e:
            logger.error(f"Error getting trigger {id}: {str(e)}")
            return None

    async def get_all(self) -> List[Dict]:
        """Get all triggers"""
        try:
            return await storage_list_triggers()
        except Exception as e:
            logger.error(f"Error listing triggers: {str(e)}")
            return []

    async def create(self, entity: Dict) -> Dict:
        """Create a new trigger"""
        try:
            trigger_id = entity.get("trigger_id")
            flow = entity.get("flow")
            owner = entity.get("owner", "system")
            
            success = await storage_register_trigger(trigger_id, flow, owner)
            if not success:
                raise HTTPException(status_code=500, detail="Failed to register trigger")
                
            return {
                "trigger_id": trigger_id,
                "flow": flow,
                "owner": owner,
                "created_at": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error creating trigger: {str(e)}")
            raise

    async def update(self, id: str, data: Dict[str, Any]) -> Optional[Dict]:
        """Update a trigger"""
        try:
            # Get existing trigger
            existing = await self.get_by_id(id)
            if not existing:
                return None
                
            # Update flow data
            flow = data.get("flow", existing)
            owner = data.get("owner", existing.get("owner", "system"))
            
            # Re-register with updated data
            success = await storage_register_trigger(id, flow, owner)
            if not success:
                return None
                
            return {
                "trigger_id": id,
                "flow": flow,
                "owner": owner,
                "updated_at": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error updating trigger {id}: {str(e)}")
            return None

    async def delete(self, id: str) -> bool:
        """Delete a trigger"""
        try:
            return await storage_delete_trigger(id)
        except Exception as e:
            logger.error(f"Error deleting trigger {id}: {str(e)}")
            return False

    # Additional trigger-specific methods
    async def register_trigger(self, trigger_id: str, flow: Dict, owner: str = "system") -> bool:
        """Register a new trigger with its associated flow"""
        try:
            logger.info(f"Registering trigger: {trigger_id}")
            
            # Validate trigger data
            if not trigger_id or not flow:
                raise HTTPException(status_code=400, detail="Missing trigger_id or flow data")
            
            # Set trigger ID in flow data
            flow["trigger_id"] = trigger_id
            
            # Register with storage
            success = await storage_register_trigger(trigger_id, flow, owner)
            if not success:
                raise HTTPException(status_code=500, detail="Failed to register trigger")
            
            # If it's a scheduled trigger, set up the schedule
            trigger_nodes = [n for n in flow.get('nodes', []) if n.get('id') == trigger_id]
            if trigger_nodes:
                trigger_node = trigger_nodes[0]
                trigger_data = trigger_node.get('data', {})
                
                if trigger_data.get('triggerType') == 'schedule':
                    await self._setup_schedule(trigger_id, trigger_data)
            
            logger.info(f"Successfully registered trigger: {trigger_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error registering trigger: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def get_trigger_flow(self, trigger_id: str, requesting_user: Optional[str] = None) -> Optional[Dict]:
        """Get the flow associated with a trigger without incrementing the execution count"""
        try:
            # First verify ownership if requesting_user is provided
            if requesting_user:
                owner = await storage_get_trigger_owner(trigger_id)
                if owner != requesting_user:
                    raise HTTPException(status_code=403, detail="Not authorized to access this trigger")

            flow = await storage_get_trigger_flow(trigger_id, increment_count=False)
            if not flow:
                raise HTTPException(status_code=404, detail="Trigger not found")
            return flow
        except Exception as e:
            logger.error(f"Error getting trigger flow: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
            
    async def execute_trigger_flow(self, trigger_id: str, requesting_user: Optional[str] = None) -> Optional[Dict]:
        """Execute a trigger and get the associated flow, incrementing the execution count"""
        try:
            # First verify ownership if requesting_user is provided
            if requesting_user:
                owner = await storage_get_trigger_owner(trigger_id)
                if owner != requesting_user:
                    raise HTTPException(status_code=403, detail="Not authorized to access this trigger")

            logger.info(f"Executing trigger: {trigger_id}")
            flow = await storage_execute_trigger(trigger_id)
            if not flow:
                raise HTTPException(status_code=404, detail="Trigger not found")
            return flow
        except Exception as e:
            logger.error(f"Error executing trigger flow: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def list_triggers(self, owner: Optional[str] = None) -> List[Dict]:
        """List all registered triggers"""
        try:
            triggers = await storage_list_triggers(owner)
            if not triggers:
                logger.info(f"No triggers found for owner: {owner}")
                return []
                
            # Transform the triggers to match the TriggerBase model format
            return [{
                "trigger_id": trigger.get("trigger_id", trigger.get("id", "")),
                "type": trigger.get("type", "manual"),
                "status": trigger.get("status", "active"),
                "owner_id": trigger.get("owner", "system"),
                "created_at": trigger.get("created_at", datetime.now().isoformat()),
                "last_executed": trigger.get("last_executed"),
                "execution_count": trigger.get("execution_count", 0),
                "trigger_count": trigger.get("execution_count", 0)  # Add for backward compatibility
            } for trigger in triggers]
        except Exception as e:
            logger.error(f"Error listing triggers: {str(e)}")
            # Return empty list instead of raising exception
            return []

    async def verify_webhook_secret(self, trigger_id: str, provided_secret: str) -> bool:
        """Verify the webhook secret for a trigger"""
        try:
            flow = await self.get_trigger_flow(trigger_id)
            if not flow:
                return False
                
            trigger_nodes = [n for n in flow.get('nodes', []) if n.get('id') == trigger_id]
            if not trigger_nodes:
                return False
                
            trigger_data = trigger_nodes[0].get('data', {})
            stored_secret = trigger_data.get('webhookSecret')
            
            return stored_secret and stored_secret == provided_secret
        except Exception:
            return False

    async def _setup_schedule(self, trigger_id: str, trigger_data: Dict) -> None:
        """Set up scheduling for a trigger"""
        try:
            schedule_type = trigger_data.get('scheduleType', 'once')
            
            if schedule_type == 'once':
                run_at = trigger_data.get('runAt')
                if not run_at:
                    raise ValueError("Missing runAt for one-time schedule")
                    
                scheduler_manager.add_job(
                    trigger_id,
                    'date',
                    run_date=datetime.fromisoformat(run_at)
                )
                
            elif schedule_type == 'daily':
                scheduler_manager.add_job(
                    trigger_id,
                    'cron',
                    day_of_week='*',
                    hour=trigger_data.get('scheduleStartTime', '9:00').split(':')[0],
                    minute=trigger_data.get('scheduleStartTime', '9:00').split(':')[1]
                )
                
            elif schedule_type == 'weekly':
                scheduler_manager.add_job(
                    trigger_id,
                    'cron',
                    day_of_week=trigger_data.get('scheduleWeekday', 'mon').lower()[:3]
                )
                
            elif schedule_type == 'monthly':
                scheduler_manager.add_job(
                    trigger_id,
                    'cron',
                    day=str(trigger_data.get('scheduleMonthDay', 1))
                )
                
        except Exception as e:
            logger.error(f"Error setting up schedule for trigger {trigger_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Schedule setup failed: {str(e)}") 