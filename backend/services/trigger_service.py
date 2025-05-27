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
            flow = await storage_get_trigger_flow(id)
            if not flow:
                logger.debug(f"Trigger {id} not found")
                return None
            return flow
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
            logger.info(f"Registering trigger {trigger_id} for owner {owner}")
            
            # Call the storage layer to actually register the trigger
            success = await storage_register_trigger(trigger_id, flow, owner)
            
            if success:
                logger.info(f"Successfully registered trigger {trigger_id}")
                
                # If this is a scheduled trigger, set up the scheduling
                if flow and flow.get("trigger_type") == "schedule":
                    # Find the trigger node in the flow
                    trigger_nodes = [n for n in flow.get('nodes', []) if n.get('id') == trigger_id]
                    if trigger_nodes:
                        trigger_data = trigger_nodes[0].get('data', {})
                        await self._setup_schedule(trigger_id, trigger_data)
                        logger.info(f"Set up scheduling for trigger {trigger_id}")
            else:
                logger.error(f"Failed to register trigger {trigger_id}")
                
            return success
        except Exception as e:
            logger.error(f"Error registering trigger {trigger_id}: {str(e)}")
            return False

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
                # Only raise HTTPException if this is an external API call (has requesting_user)
                if requesting_user is not None:
                    raise HTTPException(status_code=404, detail="Trigger not found")
                else:
                    logger.debug(f"Trigger {trigger_id} not found (internal call)")
                    return None
            return flow
        except HTTPException:
            # Re-raise HTTP exceptions as-is
            raise
        except Exception as e:
            logger.error(f"Error getting trigger flow: {str(e)}")
            # Only raise HTTPException for external API calls
            if requesting_user is not None:
                raise HTTPException(status_code=500, detail=str(e))
            else:
                return None
            
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
                # Only raise HTTPException if this is an external API call (has requesting_user)
                if requesting_user is not None:
                    raise HTTPException(status_code=404, detail="Trigger not found")
                else:
                    logger.debug(f"Trigger {trigger_id} not found during execution (internal call)")
                    return None
            return flow
        except HTTPException:
            # Re-raise HTTP exceptions as-is
            raise
        except Exception as e:
            logger.error(f"Error executing trigger flow: {str(e)}")
            # Only raise HTTPException for external API calls
            if requesting_user is not None:
                raise HTTPException(status_code=500, detail=str(e))
            else:
                return None

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
            
            # Create a function that will execute the trigger
            def execute_scheduled_trigger():
                """Synchronous wrapper for the async trigger execution"""
                try:
                    print(f"[Scheduler] Trigger fired for: {trigger_id}")
                    logger.info(f"[Scheduler] Executing scheduled trigger: {trigger_id}")
                    
                    # Simple approach: use asyncio.run in a thread
                    import threading
                    import asyncio
                    
                    def run_trigger():
                        try:
                            print(f"[Scheduler] Starting async execution for: {trigger_id}")
                            # Create a new event loop for this thread
                            loop = asyncio.new_event_loop()
                            asyncio.set_event_loop(loop)
                            try:
                                result = loop.run_until_complete(self.execute_trigger_flow(trigger_id))
                                print(f"[Scheduler] Trigger {trigger_id} executed successfully: {result}")
                                logger.info(f"[Scheduler] Trigger {trigger_id} executed successfully")
                            finally:
                                loop.close()
                        except Exception as e:
                            print(f"[Scheduler ERROR] Trigger execution failed for {trigger_id}: {e}")
                            logger.error(f"[Scheduler ERROR] Trigger execution failed for {trigger_id}: {str(e)}")
                    
                    # Run in a separate thread
                    thread = threading.Thread(target=run_trigger, name=f"trigger-{trigger_id}")
                    thread.daemon = True
                    thread.start()
                    print(f"[Scheduler] Started execution thread for trigger: {trigger_id}")
                    
                except Exception as e:
                    print(f"[Scheduler ERROR] Failed to start trigger {trigger_id}: {e}")
                    logger.error(f"[Scheduler ERROR] Failed to start trigger {trigger_id}: {str(e)}")
            
            if schedule_type == 'once':
                run_at = trigger_data.get('runAt')
                if not run_at:
                    raise ValueError("Missing runAt for one-time schedule")
                
                # Format trigger data for scheduler
                scheduler_trigger_data = {
                    'triggerType': 'schedule',
                    'scheduleType': 'once',
                    'runAt': run_at,
                    'timezone': 'UTC'
                }
                
                success = scheduler_manager.add_job(
                    trigger_id,
                    execute_scheduled_trigger,
                    scheduler_trigger_data
                )
                
                if success:
                    logger.info(f"Successfully scheduled one-time trigger {trigger_id} for {run_at}")
                else:
                    logger.error(f"Failed to schedule trigger {trigger_id}")
                
            elif schedule_type == 'daily':
                start_time = trigger_data.get('scheduleStartTime', '9:00').split(':')
                hour = int(start_time[0])
                minute = int(start_time[1]) if len(start_time) > 1 else 0
                
                scheduler_trigger_data = {
                    'triggerType': 'schedule',
                    'scheduleType': 'daily',
                    'runAt': {'hour': hour, 'minute': minute},
                    'timezone': 'UTC'
                }
                
                success = scheduler_manager.add_job(
                    trigger_id,
                    execute_scheduled_trigger,
                    scheduler_trigger_data
                )
                
                if success:
                    logger.info(f"Successfully scheduled daily trigger {trigger_id}")
                else:
                    logger.error(f"Failed to schedule trigger {trigger_id}")
                
            elif schedule_type == 'weekly':
                weekday_map = {
                    'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
                    'friday': 4, 'saturday': 5, 'sunday': 6
                }
                weekday = trigger_data.get('scheduleWeekday', 'monday').lower()
                day_of_week = weekday_map.get(weekday, 0)
                
                scheduler_trigger_data = {
                    'triggerType': 'schedule',
                    'scheduleType': 'weekly',
                    'runAt': {'dayOfWeek': day_of_week, 'hour': 9, 'minute': 0},
                    'timezone': 'UTC'
                }
                
                success = scheduler_manager.add_job(
                    trigger_id,
                    execute_scheduled_trigger,
                    scheduler_trigger_data
                )
                
                if success:
                    logger.info(f"Successfully scheduled weekly trigger {trigger_id}")
                else:
                    logger.error(f"Failed to schedule trigger {trigger_id}")
                
            elif schedule_type == 'monthly':
                month_day = int(trigger_data.get('scheduleMonthDay', 1))
                
                scheduler_trigger_data = {
                    'triggerType': 'schedule',
                    'scheduleType': 'monthly',
                    'runAt': {'day': month_day, 'hour': 9, 'minute': 0},
                    'timezone': 'UTC'
                }
                
                success = scheduler_manager.add_job(
                    trigger_id,
                    execute_scheduled_trigger,
                    scheduler_trigger_data
                )
                
                if success:
                    logger.info(f"Successfully scheduled monthly trigger {trigger_id}")
                else:
                    logger.error(f"Failed to schedule trigger {trigger_id}")
                
        except Exception as e:
            logger.error(f"Error setting up schedule for trigger {trigger_id}: {str(e)}")
            # Don't raise the exception during registration, just log it 