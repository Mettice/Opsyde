from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
from fastapi import HTTPException

from services.base_service import BaseService
from utils.logging import get_logger
from frameworks.trigger_storage import (
    register_trigger as storage_register_trigger,
    get_trigger_flow as storage_get_trigger_flow,
    execute_trigger as storage_execute_trigger,
    list_triggers as storage_list_triggers,
    delete_trigger as storage_delete_trigger,
    get_trigger_owner as storage_get_trigger_owner
)
from frameworks.apscheduler_manager import scheduler_manager

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
                
                # Set up scheduling for any trigger type that needs it
                trigger_type = flow.get("trigger_type")
                if trigger_type in ["schedule", "api_polling", "universal_polling", "universal_webhook", "data_change", "file_monitor", "email_polling"]:
                    # Find the trigger node in the flow
                    trigger_nodes = [n for n in flow.get('nodes', []) if n.get('id') == trigger_id]
                    if trigger_nodes:
                        trigger_data = trigger_nodes[0].get('data', {})
                        await self._setup_schedule(trigger_id, trigger_data)
                        logger.info(f"Set up scheduling for {trigger_type} trigger {trigger_id}")
                    else:
                        logger.warning(f"No trigger node found for {trigger_id}")
                else:
                    logger.info(f"Trigger type {trigger_type} does not require scheduling")
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
            # Get trigger type from trigger_data (this is the node data)
            trigger_type = trigger_data.get('triggerType', 'schedule')
            schedule_type = trigger_data.get('scheduleType', 'once')
            
            logger.info(f"Setting up schedule for trigger {trigger_id} with type {trigger_type}")
            
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
                                # Get the full workflow and execute it automatically
                                result = loop.run_until_complete(self.execute_full_workflow(trigger_id))
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
            
            # Handle different trigger types - ALL can be scheduled!
            if trigger_type == 'schedule':
                await self._setup_time_schedule(trigger_id, trigger_data, execute_scheduled_trigger)
            elif trigger_type in ['api_polling', 'universal_polling']:
                await self._setup_universal_polling(trigger_id, trigger_data, execute_scheduled_trigger)
            elif trigger_type == 'universal_webhook':
                await self._setup_universal_webhook(trigger_id, trigger_data, execute_scheduled_trigger)
            elif trigger_type == 'data_change':
                await self._setup_data_change_monitor(trigger_id, trigger_data, execute_scheduled_trigger)
            elif trigger_type == 'file_monitor':
                await self._setup_file_monitor(trigger_id, trigger_data, execute_scheduled_trigger)
            elif trigger_type == 'email_polling':
                await self._setup_email_polling(trigger_id, trigger_data, execute_scheduled_trigger)
            else:
                logger.warning(f"Unknown trigger type: {trigger_type} - will not be scheduled")
                
        except Exception as e:
            logger.error(f"Error setting up schedule for trigger {trigger_id}: {str(e)}")
            # Don't raise the exception during registration, just log it
    
    async def _setup_time_schedule(self, trigger_id: str, trigger_data: Dict, execute_func) -> None:
        """Set up time-based scheduling (original schedule logic)"""
        schedule_type = trigger_data.get('scheduleType', 'once')
        
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
                execute_func,
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
                execute_func,
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
                execute_func,
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
                execute_func,
                scheduler_trigger_data
            )
            
            if success:
                logger.info(f"Successfully scheduled monthly trigger {trigger_id}")
            else:
                logger.error(f"Failed to schedule trigger {trigger_id}")
    
    async def _setup_universal_polling(self, trigger_id: str, trigger_data: Dict, execute_func) -> None:
        """Set up Universal API Polling - works with ANY API (Airtable, Notion, Slack, etc.)"""
        try:
            # Get configuration
            polling_interval = int(trigger_data.get('pollingInterval', 300))
            api_endpoint = trigger_data.get('apiEndpoint')
            service_name = trigger_data.get('serviceName', 'Unknown API')
            
            # Authentication
            auth_type = trigger_data.get('authType', 'none')
            api_key = trigger_data.get('apiKey')
            bearer_token = trigger_data.get('bearerToken')
            username = trigger_data.get('username')
            password = trigger_data.get('password')
            
            # Change detection
            change_method = trigger_data.get('changeDetectionMethod', 'field_value')
            change_field = trigger_data.get('changeDetectionField')
            timestamp_field = trigger_data.get('timestampField')
            
            if not api_endpoint:
                raise ValueError("API endpoint is required for universal polling")
            
            logger.info(f"Setting up Universal Polling for {service_name} ({trigger_id}): {api_endpoint} every {polling_interval}s")
            
            # Create universal polling function
            def poll_universal_api():
                import asyncio
                import threading
                
                def run_universal_polling():
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    try:
                        # Use the universal API checker
                        result = loop.run_until_complete(self._check_universal_api_changes(trigger_id, trigger_data))
                        if result:
                            logger.info(f"[UNIVERSAL POLLING] Change detected in {service_name} ({trigger_id}), executing workflow")
                            execute_func()
                        else:
                            logger.debug(f"[UNIVERSAL POLLING] No changes detected in {service_name} ({trigger_id})")
                    except Exception as e:
                        logger.error(f"[UNIVERSAL POLLING] Error checking {service_name} ({trigger_id}): {str(e)}")
                    finally:
                        loop.close()
                
                thread = threading.Thread(target=run_universal_polling, name=f"universal-poll-{trigger_id}")
                thread.daemon = True
                thread.start()
            
            # Schedule the universal polling
            scheduler_trigger_data = {
                'triggerType': 'interval',
                'scheduleType': 'interval',
                'runAt': {'seconds': polling_interval},
                'timezone': 'UTC'
            }
            
            # Use simpler job ID for debugging
            job_id = f"{trigger_id}-poll"
            logger.info(f"🔧 DEBUG: About to schedule job with ID: {job_id}")
            logger.info(f"🔧 DEBUG: Scheduler trigger data: {scheduler_trigger_data}")
            logger.info(f"🔧 DEBUG: Scheduler manager available: {scheduler_manager is not None}")
            logger.info(f"🔧 DEBUG: Scheduler running: {scheduler_manager.scheduler.running if scheduler_manager.scheduler else 'No scheduler'}")
            
            success = scheduler_manager.add_job(
                job_id,
                poll_universal_api,
                scheduler_trigger_data
            )
            
            logger.info(f"🔧 DEBUG: add_job returned: {success}")
            
            if success:
                logger.info(f"✅ Successfully set up Universal Polling for {service_name} ({trigger_id}) - interval: {polling_interval}s")
                # Double-check that the job was actually added
                all_jobs = scheduler_manager.get_all_jobs()
                logger.info(f"🔧 DEBUG: Total jobs after adding: {len(all_jobs)}")
                for job in all_jobs:
                    logger.info(f"🔧 DEBUG: Job found: {job.id}")
            else:
                logger.error(f"❌ Failed to set up Universal Polling for {service_name} ({trigger_id})")
                # Check scheduler state
                if scheduler_manager.scheduler:
                    logger.error(f"🔧 DEBUG: Scheduler state: {scheduler_manager.scheduler.state}")
                    logger.error(f"🔧 DEBUG: Scheduler running: {scheduler_manager.scheduler.running}")
                else:
                    logger.error(f"🔧 DEBUG: No scheduler instance available")
                
        except Exception as e:
            logger.error(f"Error setting up Universal Polling for {trigger_id}: {str(e)}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            raise

    async def _setup_universal_webhook(self, trigger_id: str, trigger_data: Dict, execute_func) -> None:
        """Set up Universal Webhook - works with ANY service that supports webhooks"""
        try:
            webhook_service = trigger_data.get('webhookService', 'generic')
            webhook_secret = trigger_data.get('webhookSecret')
            
            logger.info(f"Setting up Universal Webhook for {webhook_service} service ({trigger_id})")
            
            # Universal webhooks are handled by the API router, so we just log the setup
            # The actual webhook endpoint is: /api/triggers/{trigger_id}
            
            webhook_url = f"/api/triggers/{trigger_id}"
            logger.info(f"✅ Universal Webhook ready for {webhook_service} at: {webhook_url}")
            
            # Store webhook configuration for later use
            webhook_config = {
                'service': webhook_service,
                'secret': webhook_secret,
                'url': webhook_url,
                'setup_time': datetime.now().isoformat()
            }
            
            # You could store this config in a database or cache for webhook verification
            logger.info(f"Webhook config stored for {trigger_id}: {webhook_config}")
            
        except Exception as e:
            logger.error(f"Error setting up Universal Webhook for {trigger_id}: {str(e)}")
            raise

    async def _check_universal_api_changes(self, trigger_id: str, trigger_data: Dict) -> bool:
        """Universal API change checker - works with ANY API"""
        try:
            import aiohttp
            import json
            import hashlib
            from datetime import datetime, timezone
            
            # Get configuration
            api_endpoint = trigger_data.get('apiEndpoint')
            service_name = trigger_data.get('serviceName', 'Unknown API')
            
            # Authentication setup
            headers = {'User-Agent': 'CrewBuilder-Universal-Polling/1.0'}
            auth_type = trigger_data.get('authType', 'none')
            
            if auth_type == 'api_key':
                api_key = trigger_data.get('apiKey')
                if api_key:
                    # Try common API key header patterns
                    if 'airtable' in api_endpoint.lower():
                        headers['Authorization'] = f'Bearer {api_key}'
                    elif 'notion' in api_endpoint.lower():
                        headers['Authorization'] = f'Bearer {api_key}'
                        headers['Notion-Version'] = '2022-06-28'
                    else:
                        # Default patterns
                        headers['Authorization'] = f'Bearer {api_key}'
                        headers['X-API-Key'] = api_key
                        
            elif auth_type == 'bearer_token':
                bearer_token = trigger_data.get('bearerToken')
                if bearer_token:
                    headers['Authorization'] = f'Bearer {bearer_token}'
                    
            elif auth_type == 'basic_auth':
                username = trigger_data.get('username')
                password = trigger_data.get('password')
                if username and password:
                    import base64
                    credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
                    headers['Authorization'] = f'Basic {credentials}'
            
            # Make API request
            async with aiohttp.ClientSession() as session:
                async with session.get(api_endpoint, headers=headers, timeout=30) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Universal change detection
                        change_method = trigger_data.get('changeDetectionMethod', 'field_value')
                        
                        if change_method == 'field_value':
                            return await self._check_field_value_change(trigger_id, data, trigger_data)
                        elif change_method == 'response_hash':
                            return await self._check_response_hash_change(trigger_id, data, trigger_data)
                        elif change_method == 'array_length':
                            return await self._check_array_length_change(trigger_id, data, trigger_data)
                        elif change_method == 'timestamp':
                            return await self._check_timestamp_change(trigger_id, data, trigger_data)
                        else:
                            # Default to field value
                            return await self._check_field_value_change(trigger_id, data, trigger_data)
                            
                    elif response.status == 401:
                        logger.warning(f"[UNIVERSAL POLLING] Authentication failed for {service_name} ({trigger_id})")
                        return False
                    elif response.status == 429:
                        logger.warning(f"[UNIVERSAL POLLING] Rate limited for {service_name} ({trigger_id})")
                        return False
                    else:
                        logger.warning(f"[UNIVERSAL POLLING] API request failed for {service_name} ({trigger_id}): {response.status}")
                        return False
                        
        except Exception as e:
            logger.error(f"[UNIVERSAL POLLING] Error checking {service_name} ({trigger_id}): {str(e)}")
            return False

    async def _check_field_value_change(self, trigger_id: str, data: dict, trigger_data: Dict) -> bool:
        """Check if a specific field value has changed"""
        try:
            change_field = trigger_data.get('changeDetectionField')
            if not change_field:
                return False
                
            # Get current value using dot notation
            current_value = self._get_nested_value(data, change_field)
            
            # Store/compare with last value
            stored_key = f"last_field_value_{trigger_id}"
            last_value = getattr(self, stored_key, None)
            
            if last_value is None:
                # First time, store the value
                setattr(self, stored_key, current_value)
                logger.info(f"[FIELD CHECK] Initial value stored for {trigger_id}: {current_value}")
                return False
            elif current_value != last_value:
                # Value changed
                setattr(self, stored_key, current_value)
                logger.info(f"[FIELD CHECK] Field '{change_field}' changed for {trigger_id}: {last_value} -> {current_value}")
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"[FIELD CHECK] Error for {trigger_id}: {str(e)}")
            return False

    async def _check_response_hash_change(self, trigger_id: str, data: dict, trigger_data: Dict) -> bool:
        """Check if the entire response has changed using hash comparison"""
        try:
            import hashlib
            import json
            
            # Create hash of entire response
            response_str = json.dumps(data, sort_keys=True)
            current_hash = hashlib.md5(response_str.encode()).hexdigest()
            
            # Store/compare with last hash
            stored_key = f"last_response_hash_{trigger_id}"
            last_hash = getattr(self, stored_key, None)
            
            if last_hash is None:
                setattr(self, stored_key, current_hash)
                logger.info(f"[HASH CHECK] Initial hash stored for {trigger_id}")
                return False
            elif current_hash != last_hash:
                setattr(self, stored_key, current_hash)
                logger.info(f"[HASH CHECK] Response changed for {trigger_id}")
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"[HASH CHECK] Error for {trigger_id}: {str(e)}")
            return False

    async def _check_array_length_change(self, trigger_id: str, data: dict, trigger_data: Dict) -> bool:
        """Check if an array length has changed (useful for new records)"""
        try:
            change_field = trigger_data.get('changeDetectionField', 'data')
            
            # Get array using dot notation
            array_data = self._get_nested_value(data, change_field)
            
            if not isinstance(array_data, list):
                logger.warning(f"[ARRAY CHECK] Field '{change_field}' is not an array for {trigger_id}")
                return False
                
            current_length = len(array_data)
            
            # Store/compare with last length
            stored_key = f"last_array_length_{trigger_id}"
            last_length = getattr(self, stored_key, None)
            
            if last_length is None:
                setattr(self, stored_key, current_length)
                logger.info(f"[ARRAY CHECK] Initial length stored for {trigger_id}: {current_length}")
                return False
            elif current_length > last_length:
                # ONLY trigger on INCREASE (new records added)
                new_records_count = current_length - last_length
                setattr(self, stored_key, current_length)
                logger.info(f"[ARRAY CHECK] NEW RECORDS DETECTED for {trigger_id}: {new_records_count} new records added (total: {current_length})")
                
                # Store the new records for the agent to process
                if new_records_count > 0 and hasattr(self, '_store_new_records'):
                    new_records = array_data[-new_records_count:]  # Get the last N records
                    setattr(self, f"new_records_{trigger_id}", new_records)
                    logger.info(f"[ARRAY CHECK] Stored {len(new_records)} new records for processing")
                
                return True
            elif current_length < last_length:
                # Records were deleted - update count but don't trigger
                setattr(self, stored_key, current_length)
                logger.info(f"[ARRAY CHECK] Records deleted for {trigger_id}: {last_length} -> {current_length} (no trigger)")
                return False
                
            return False
            
        except Exception as e:
            logger.error(f"[ARRAY CHECK] Error for {trigger_id}: {str(e)}")
            return False

    async def _check_timestamp_change(self, trigger_id: str, data: dict, trigger_data: Dict) -> bool:
        """Check if a timestamp field has changed"""
        try:
            from datetime import datetime
            
            timestamp_field = trigger_data.get('timestampField')
            if not timestamp_field:
                return False
                
            # Get timestamp value
            timestamp_value = self._get_nested_value(data, timestamp_field)
            
            if not timestamp_value:
                return False
                
            # Parse timestamp with fallback methods
            try:
                if isinstance(timestamp_value, str):
                    # Try common timestamp formats
                    for fmt in ['%Y-%m-%dT%H:%M:%S.%fZ', '%Y-%m-%dT%H:%M:%SZ', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d']:
                        try:
                            current_timestamp = datetime.strptime(timestamp_value, fmt)
                            break
                        except ValueError:
                            continue
                    else:
                        # If all formats fail, try dateutil if available
                        try:
                            import dateutil.parser
                            current_timestamp = dateutil.parser.parse(timestamp_value)
                        except ImportError:
                            logger.warning(f"[TIMESTAMP CHECK] Could not parse timestamp '{timestamp_value}' for {trigger_id} - dateutil not available")
                            return False
                        except Exception:
                            logger.warning(f"[TIMESTAMP CHECK] Could not parse timestamp '{timestamp_value}' for {trigger_id}")
                            return False
                elif isinstance(timestamp_value, (int, float)):
                    current_timestamp = datetime.fromtimestamp(timestamp_value)
                else:
                    current_timestamp = timestamp_value
            except Exception as e:
                logger.warning(f"[TIMESTAMP CHECK] Could not parse timestamp '{timestamp_value}' for {trigger_id}: {str(e)}")
                return False
            
            # Store/compare with last timestamp
            stored_key = f"last_timestamp_{trigger_id}"
            last_timestamp = getattr(self, stored_key, None)
            
            if last_timestamp is None:
                setattr(self, stored_key, current_timestamp)
                logger.info(f"[TIMESTAMP CHECK] Initial timestamp stored for {trigger_id}: {current_timestamp}")
                return False
            elif current_timestamp > last_timestamp:
                setattr(self, stored_key, current_timestamp)
                logger.info(f"[TIMESTAMP CHECK] Timestamp updated for {trigger_id}: {last_timestamp} -> {current_timestamp}")
                return True
                
            return False
             
        except Exception as e:
            logger.error(f"[TIMESTAMP CHECK] Error for {trigger_id}: {str(e)}")
            return False

    async def execute_full_workflow(self, trigger_id: str) -> Dict[str, Any]:
        """Execute the complete workflow associated with a trigger automatically"""
        try:
            logger.info(f"[AUTO-EXECUTION] Starting automatic workflow execution for trigger: {trigger_id}")
            
            # Get the trigger flow with execution count increment
            flow = await self.execute_trigger_flow(trigger_id)
            if not flow:
                raise ValueError(f"Trigger {trigger_id} not found")
            
            # Import the unified runner to execute the workflow
            from backend.core.runner import UnifiedRunner
            runner = UnifiedRunner()
            
            # Prepare workflow data for execution
            workflow_data = {
                "nodes": flow.get("nodes", []),
                "edges": flow.get("edges", []),
                "inputs": flow.get("inputs", {}),
                "trigger_id": trigger_id,
                "execution_type": "automatic",
                "triggered_at": datetime.now().isoformat()
            }
            
            logger.info(f"[AUTO-EXECUTION] Executing workflow with {len(workflow_data['nodes'])} nodes")
            
            # Execute the workflow and collect results
            results = []
            async for result in runner.execute_workflow(workflow_data):
                results.append(result)
                logger.info(f"[AUTO-EXECUTION] Node result: {result}")
            
            # Log successful execution
            logger.info(f"[AUTO-EXECUTION] Workflow execution completed for trigger {trigger_id}")
            
            return {
                "success": True,
                "trigger_id": trigger_id,
                "execution_type": "automatic",
                "results": results,
                "executed_at": datetime.now().isoformat(),
                "node_count": len(workflow_data['nodes'])
            }
            
        except Exception as e:
            logger.error(f"[AUTO-EXECUTION] Failed to execute workflow for trigger {trigger_id}: {str(e)}")
            return {
                "success": False,
                "trigger_id": trigger_id,
                "error": str(e),
                "executed_at": datetime.now().isoformat()
            }

    # Event-driven monitoring functions
    async def _check_api_changes(self, trigger_id: str, trigger_data: Dict) -> bool:
        """Check if API endpoint has changes"""
        try:
            import aiohttp
            import json
            
            api_endpoint = trigger_data.get('apiEndpoint')
            headers = {}
            
            # Parse headers if provided
            api_headers = trigger_data.get('apiHeaders')
            if api_headers:
                try:
                    headers = json.loads(api_headers)
                except:
                    logger.warning(f"Invalid headers format for trigger {trigger_id}")
            
            # Make API request
            async with aiohttp.ClientSession() as session:
                async with session.get(api_endpoint, headers=headers, timeout=30) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Check for changes using the specified field
                        change_field = trigger_data.get('changeDetectionField')
                        if change_field:
                            # Get current value
                            current_value = self._get_nested_value(data, change_field)
                            
                            # Compare with stored value
                            stored_key = f"last_value_{trigger_id}"
                            last_value = getattr(self, stored_key, None)
                            
                            if last_value is None:
                                # First time, store the value
                                setattr(self, stored_key, current_value)
                                logger.info(f"[API POLLING] Initial value stored for {trigger_id}: {current_value}")
                                return False
                            elif current_value != last_value:
                                # Value changed, update stored value and trigger
                                setattr(self, stored_key, current_value)
                                logger.info(f"[API POLLING] Change detected for {trigger_id}: {last_value} -> {current_value}")
                                return True
                        else:
                            # No specific field, check if response changed
                            response_hash = hash(str(data))
                            stored_key = f"last_hash_{trigger_id}"
                            last_hash = getattr(self, stored_key, None)
                            
                            if last_hash is None:
                                setattr(self, stored_key, response_hash)
                                return False
                            elif response_hash != last_hash:
                                setattr(self, stored_key, response_hash)
                                logger.info(f"[API POLLING] Response changed for {trigger_id}")
                                return True
                    else:
                        logger.warning(f"[API POLLING] API request failed for {trigger_id}: {response.status}")
                        
            return False
            
        except Exception as e:
            logger.error(f"[API POLLING] Error checking API changes for {trigger_id}: {str(e)}")
            return False
    
    async def _check_data_changes(self, trigger_id: str, trigger_data: Dict) -> bool:
        """Check if data source has changes"""
        try:
            data_source_type = trigger_data.get('dataSourceType', 'database')
            data_source_url = trigger_data.get('dataSourceUrl')
            change_query = trigger_data.get('changeQuery')
            
            if data_source_type == 'api':
                # Reuse API polling logic
                return await self._check_api_changes(trigger_id, {
                    'apiEndpoint': data_source_url,
                    'changeDetectionField': change_query
                })
            elif data_source_type == 'file':
                # Check file modification time
                import os
                if os.path.exists(data_source_url):
                    current_mtime = os.path.getmtime(data_source_url)
                    stored_key = f"last_mtime_{trigger_id}"
                    last_mtime = getattr(self, stored_key, None)
                    
                    if last_mtime is None:
                        setattr(self, stored_key, current_mtime)
                        return False
                    elif current_mtime != last_mtime:
                        setattr(self, stored_key, current_mtime)
                        logger.info(f"[DATA MONITOR] File changed for {trigger_id}")
                        return True
            elif data_source_type == 'database':
                # Database monitoring would require specific implementation
                logger.info(f"[DATA MONITOR] Database monitoring not yet implemented for {trigger_id}")
                return False
            elif data_source_type == 'spreadsheet':
                # Google Sheets monitoring would require API integration
                logger.info(f"[DATA MONITOR] Spreadsheet monitoring not yet implemented for {trigger_id}")
                return False
                
            return False
            
        except Exception as e:
            logger.error(f"[DATA MONITOR] Error checking data changes for {trigger_id}: {str(e)}")
            return False
    
    async def _check_file_changes(self, trigger_id: str, trigger_data: Dict) -> bool:
        """Check if file has changes"""
        try:
            import os
            import glob
            
            file_path = trigger_data.get('filePath')
            monitor_type = trigger_data.get('monitorType', 'modified')
            file_pattern = trigger_data.get('filePattern')
            
            if not os.path.exists(file_path):
                logger.warning(f"[FILE MONITOR] Path does not exist: {file_path}")
                return False
            
            # Handle directory monitoring with pattern
            if os.path.isdir(file_path):
                if file_pattern:
                    pattern_path = os.path.join(file_path, file_pattern)
                    files = glob.glob(pattern_path)
                else:
                    files = [os.path.join(file_path, f) for f in os.listdir(file_path) 
                            if os.path.isfile(os.path.join(file_path, f))]
            else:
                files = [file_path]
            
            stored_key = f"file_state_{trigger_id}"
            last_state = getattr(self, stored_key, {})
            current_state = {}
            
            for file in files:
                if os.path.exists(file):
                    stat = os.stat(file)
                    current_state[file] = {
                        'mtime': stat.st_mtime,
                        'size': stat.st_size,
                        'exists': True
                    }
                else:
                    current_state[file] = {'exists': False}
            
            # Check for changes based on monitor type
            changes_detected = False
            
            if monitor_type == 'modified':
                for file, state in current_state.items():
                    if file not in last_state or last_state[file].get('mtime') != state.get('mtime'):
                        changes_detected = True
                        logger.info(f"[FILE MONITOR] File modified: {file}")
                        break
            elif monitor_type == 'created':
                for file, state in current_state.items():
                    if file not in last_state and state.get('exists'):
                        changes_detected = True
                        logger.info(f"[FILE MONITOR] File created: {file}")
                        break
            elif monitor_type == 'deleted':
                for file, state in last_state.items():
                    if file not in current_state or not current_state[file].get('exists'):
                        changes_detected = True
                        logger.info(f"[FILE MONITOR] File deleted: {file}")
                        break
            elif monitor_type == 'size_change':
                for file, state in current_state.items():
                    if file not in last_state or last_state[file].get('size') != state.get('size'):
                        changes_detected = True
                        logger.info(f"[FILE MONITOR] File size changed: {file}")
                        break
            
            # Update stored state
            setattr(self, stored_key, current_state)
            
            return changes_detected
            
        except Exception as e:
            logger.error(f"[FILE MONITOR] Error checking file changes for {trigger_id}: {str(e)}")
            return False
    
    async def _check_new_emails(self, trigger_id: str, trigger_data: Dict) -> bool:
        """Check for new emails"""
        try:
            email_provider = trigger_data.get('emailProvider', 'imap')
            email_server = trigger_data.get('emailServer')
            email_username = trigger_data.get('emailUsername')
            email_password = trigger_data.get('emailPassword')
            email_filter = trigger_data.get('emailFilter', '')
            
            if not all([email_server, email_username, email_password]):
                logger.warning(f"[EMAIL POLLING] Missing email credentials for {trigger_id}")
                return False
            
            if email_provider == 'imap':
                return await self._check_imap_emails(trigger_id, trigger_data)
            elif email_provider == 'gmail_api':
                return await self._check_gmail_api_emails(trigger_id, trigger_data)
            elif email_provider == 'outlook_api':
                return await self._check_outlook_api_emails(trigger_id, trigger_data)
            else:
                logger.warning(f"[EMAIL POLLING] Unsupported email provider: {email_provider}")
                return False
                
        except Exception as e:
            logger.error(f"[EMAIL POLLING] Error checking emails for {trigger_id}: {str(e)}")
            return False
    
    async def _check_imap_emails(self, trigger_id: str, trigger_data: Dict) -> bool:
        """Check IMAP emails for new messages"""
        try:
            import imaplib
            import email
            from email.header import decode_header
            
            email_server = trigger_data.get('emailServer')
            email_username = trigger_data.get('emailUsername')
            email_password = trigger_data.get('emailPassword')
            email_filter = trigger_data.get('emailFilter', '')
            
            # Parse server and port
            if ':' in email_server:
                server, port = email_server.split(':')
                port = int(port)
            else:
                server = email_server
                port = 993  # Default IMAP SSL port
            
            # Connect to IMAP server
            mail = imaplib.IMAP4_SSL(server, port)
            mail.login(email_username, email_password)
            mail.select('inbox')
            
            # Search for emails
            search_criteria = 'UNSEEN'  # Only unread emails
            if email_filter:
                # Simple filter parsing (can be enhanced)
                if 'subject:' in email_filter:
                    subject = email_filter.split('subject:')[1].split(',')[0].strip()
                    search_criteria = f'UNSEEN SUBJECT "{subject}"'
                elif 'from:' in email_filter:
                    sender = email_filter.split('from:')[1].split(',')[0].strip()
                    search_criteria = f'UNSEEN FROM "{sender}"'
            
            status, messages = mail.search(None, search_criteria)
            
            if status == 'OK':
                email_ids = messages[0].split()
                new_email_count = len(email_ids)
                
                # Store last check count
                stored_key = f"last_email_count_{trigger_id}"
                last_count = getattr(self, stored_key, 0)
                
                if new_email_count > last_count:
                    setattr(self, stored_key, new_email_count)
                    logger.info(f"[EMAIL POLLING] {new_email_count - last_count} new emails for {trigger_id}")
                    mail.close()
                    mail.logout()
                    return True
                
                setattr(self, stored_key, new_email_count)
            
            mail.close()
            mail.logout()
            return False
            
        except Exception as e:
            logger.error(f"[EMAIL POLLING] IMAP error for {trigger_id}: {str(e)}")
            return False
    
    async def _check_gmail_api_emails(self, trigger_id: str, trigger_data: Dict) -> bool:
        """Check Gmail API for new emails (placeholder)"""
        logger.info(f"[EMAIL POLLING] Gmail API monitoring not yet implemented for {trigger_id}")
        return False
    
    async def _check_outlook_api_emails(self, trigger_id: str, trigger_data: Dict) -> bool:
        """Check Outlook API for new emails (placeholder)"""
        logger.info(f"[EMAIL POLLING] Outlook API monitoring not yet implemented for {trigger_id}")
        return False
    
    def _get_nested_value(self, data: dict, path: str):
        """Get nested value from dictionary using dot notation"""
        try:
            keys = path.split('.')
            value = data
            for key in keys:
                if isinstance(value, dict):
                    value = value.get(key)
                elif isinstance(value, list) and key.isdigit():
                    value = value[int(key)]
                else:
                    return None
            return value
        except:
            return None 