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
        """List all registered triggers, transformed to match TriggerBase model"""
        try:
            triggers = await storage_list_triggers(owner)
            if not triggers:
                logger.info(f"No triggers found for owner: {owner}")
                return []

            # Transform the triggers to match the TriggerBase model format
            transformed_triggers = []
            for trigger in triggers:
                try:
                    # Map fields to TriggerBase schema
                    transformed_trigger = {
                        "trigger_id": trigger.get("trigger_id") or trigger.get("id", "unknown"),
                        "type": trigger.get("trigger_type", "manual"),
                        "status": trigger.get("status", "active"),
                        "owner_id": trigger.get("owner", "system"),
                        "created_at": trigger.get("created_at"),
                        "last_executed": trigger.get("last_executed") or trigger.get("last_triggered"),
                        "execution_count": trigger.get("execution_count", trigger.get("trigger_count", 0)),
                    }
                    transformed_triggers.append(transformed_trigger)
                except Exception as e:
                    logger.error(f"Error transforming trigger: {str(e)}")
                    continue

            return transformed_triggers

        except Exception as e:
            logger.error(f"Error listing triggers: {str(e)}")
            return []  # Return empty list instead of raising exception

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
        """Check if a specific field value has changed - UNIVERSAL VERSION"""
        try:
            change_field = trigger_data.get('changeDetectionField')
            
            # UNIVERSAL FIELD DETECTION - Auto-detect important fields if not specified
            if not change_field:
                detected_field = self._detect_important_field(data, trigger_data)
                if detected_field:
                    change_field = detected_field
                    logger.info(f"[UNIVERSAL FIELD] Auto-detected important field: '{change_field}' for {trigger_id}")
                else:
                    logger.warning(f"[UNIVERSAL FIELD] No suitable field found for monitoring")
                    return False
            
            # Get current value using dot notation
            current_value = self._get_nested_value(data, change_field)
            
            # Store/compare with last value
            stored_key = f"last_field_value_{trigger_id}"
            last_value = getattr(self, stored_key, None)
            
            if last_value is None:
                # First time, store the value
                setattr(self, stored_key, current_value)
                logger.info(f"[UNIVERSAL FIELD] Initial value stored for {trigger_id}: '{change_field}' = {current_value}")
                return False
            elif current_value != last_value:
                # Value changed
                setattr(self, stored_key, current_value)
                logger.info(f"[UNIVERSAL FIELD] Field '{change_field}' changed for {trigger_id}: {last_value} -> {current_value}")
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"[UNIVERSAL FIELD] Error for {trigger_id}: {str(e)}")
            return False

    def _detect_important_field(self, data: dict, trigger_data: Dict) -> str:
        """
        UNIVERSAL FIELD DETECTION - Automatically find important fields to monitor
        Looks for status, count, timestamp, or other significant fields
        """
        try:
            service_name = trigger_data.get('serviceName', '').lower()
            
            # Step 1: Look for common important field patterns
            important_patterns = [
                'status', 'state', 'count', 'total', 'length', 'size',
                'updated_at', 'modified_at', 'last_modified', 'timestamp',
                'version', 'revision', 'build', 'release',
                'active', 'enabled', 'live', 'online'
            ]
            
            found_fields = []
            
            # Check root level fields
            for key, value in data.items():
                key_lower = key.lower()
                for pattern in important_patterns:
                    if pattern in key_lower:
                        found_fields.append({
                            'field': key,
                            'value': value,
                            'pattern': pattern,
                            'score': self._score_field_importance(key, value, pattern, service_name)
                        })
            
            # Check nested fields (one level deep)
            for key, value in data.items():
                if isinstance(value, dict):
                    for nested_key, nested_value in value.items():
                        nested_key_lower = nested_key.lower()
                        for pattern in important_patterns:
                            if pattern in nested_key_lower:
                                found_fields.append({
                                    'field': f"{key}.{nested_key}",
                                    'value': nested_value,
                                    'pattern': pattern,
                                    'score': self._score_field_importance(nested_key, nested_value, pattern, service_name)
                                })
            
            # Step 2: If we found important fields, return the highest scoring one
            if found_fields:
                best_field = max(found_fields, key=lambda x: x['score'])
                logger.info(f"[FIELD DETECTION] Selected '{best_field['field']}' (pattern: {best_field['pattern']}, score: {best_field['score']})")
                return best_field['field']
            
            # Step 3: Fallback - look for arrays and monitor their length
            for key, value in data.items():
                if isinstance(value, list):
                    logger.info(f"[FIELD DETECTION] Fallback to array length monitoring: '{key}' with {len(value)} items")
                    return key
            
            logger.warning(f"[FIELD DETECTION] No suitable field found for monitoring")
            return None
            
        except Exception as e:
            logger.error(f"[FIELD DETECTION] Error detecting important field: {str(e)}")
            return None

    def _score_field_importance(self, field_name: str, field_value: Any, pattern: str, service_name: str) -> float:
        """Score a field based on how important it is for change detection"""
        score = 0.0
        
        # Base score for pattern match
        pattern_scores = {
            'status': 10.0, 'state': 10.0, 'count': 8.0, 'total': 8.0,
            'updated_at': 9.0, 'modified_at': 9.0, 'timestamp': 7.0,
            'version': 6.0, 'active': 5.0, 'enabled': 5.0
        }
        score += pattern_scores.get(pattern, 3.0)
        
        # Value type scoring
        if isinstance(field_value, (int, float)):
            score += 3.0  # Numbers are good for change detection
        elif isinstance(field_value, str) and len(str(field_value)) < 50:
            score += 2.0  # Short strings are good
        elif isinstance(field_value, bool):
            score += 4.0  # Booleans are excellent for change detection
        
        # Service-specific scoring
        service_field_patterns = {
            'airtable': {'modified_time': 5.0, 'created_time': 3.0},
            'github': {'updated_at': 5.0, 'state': 4.0, 'merged': 4.0},
            'slack': {'ts': 5.0, 'latest': 4.0},
            'notion': {'last_edited_time': 5.0, 'status': 4.0}
        }
        
        for service, patterns in service_field_patterns.items():
            if service in service_name:
                for pattern_key, bonus in patterns.items():
                    if pattern_key in field_name.lower():
                        score += bonus
        
        return score

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
        """Check if an array length has changed (useful for new records) - UNIVERSAL VERSION"""
        try:
            change_field = trigger_data.get('changeDetectionField')
            
            # UNIVERSAL ARRAY DETECTION - Find the best array to monitor
            if not change_field:
                # Auto-detect the main array field
                detected_field = self._detect_main_array_field(data, trigger_data)
                if detected_field:
                    change_field = detected_field
                    logger.info(f"[UNIVERSAL ARRAY] Auto-detected main array field: '{change_field}' for {trigger_id}")
                else:
                    logger.warning(f"[UNIVERSAL ARRAY] No suitable array field found for {trigger_id}")
                    return False
            
            # Get array using dot notation
            array_data = self._get_nested_value(data, change_field)
            
            if not isinstance(array_data, list):
                logger.warning(f"[UNIVERSAL ARRAY] Field '{change_field}' is not an array for {trigger_id}")
                # If the specified field is not an array, try auto-detection as fallback
                if trigger_data.get('changeDetectionField'):  # Only if user specified a field
                    logger.info(f"[UNIVERSAL ARRAY] Attempting auto-detection as fallback for {trigger_id}")
                    detected_field = self._detect_main_array_field(data, trigger_data)
                    if detected_field:
                        change_field = detected_field
                        array_data = self._get_nested_value(data, change_field)
                        logger.info(f"[UNIVERSAL ARRAY] Fallback detected field: '{change_field}' for {trigger_id}")
                        if not isinstance(array_data, list):
                            return False
                    else:
                        return False
                else:
                    return False
                
            current_length = len(array_data)
            
            # Store/compare with last length
            stored_key = f"last_array_length_{trigger_id}"
            last_length = getattr(self, stored_key, None)
            
            if last_length is None:
                setattr(self, stored_key, current_length)
                logger.info(f"[UNIVERSAL ARRAY] Initial length stored for {trigger_id}: {current_length} items in '{change_field}'")
                return False
            elif current_length > last_length:
                # ONLY trigger on INCREASE (new records added)
                new_records_count = current_length - last_length
                setattr(self, stored_key, current_length)
                logger.info(f"[UNIVERSAL ARRAY] NEW RECORDS DETECTED for {trigger_id}: {new_records_count} new records added to '{change_field}' (total: {current_length})")
                
                # Store the new records for the agent to process
                if new_records_count > 0:
                    new_records = array_data[-new_records_count:]  # Get the last N records
                    setattr(self, f"new_records_{trigger_id}", new_records)
                    logger.info(f"[UNIVERSAL ARRAY] Stored {len(new_records)} new records for processing")
                
                return True
            elif current_length < last_length:
                # Records were deleted - update count but don't trigger
                setattr(self, stored_key, current_length)
                logger.info(f"[UNIVERSAL ARRAY] Records deleted for {trigger_id}: {last_length} -> {current_length} (no trigger)")
                return False
                
            return False
            
        except Exception as e:
            logger.error(f"[UNIVERSAL ARRAY] Error for {trigger_id}: {str(e)}")
            return False

    def _detect_main_array_field(self, data: dict, trigger_data: Dict) -> str:
        """
        UNIVERSAL ARRAY DETECTION - Automatically find the main array field in any API response
        Works with: Airtable (records), DexScreener (pairs), GitHub (items), Slack (messages), etc.
        """
        try:
            service_name = trigger_data.get('serviceName', '').lower()
            
            # Step 1: Look for arrays at the root level
            root_arrays = []
            for key, value in data.items():
                if isinstance(value, list) and len(value) > 0:
                    root_arrays.append({
                        'field': key,
                        'count': len(value),
                        'sample_item': value[0] if value else None
                    })
            
            if not root_arrays:
                # Step 2: Look for arrays in nested objects (one level deep)
                for key, value in data.items():
                    if isinstance(value, dict):
                        for nested_key, nested_value in value.items():
                            if isinstance(nested_value, list) and len(nested_value) > 0:
                                root_arrays.append({
                                    'field': f"{key}.{nested_key}",
                                    'count': len(nested_value),
                                    'sample_item': nested_value[0] if nested_value else None
                                })
            
            if not root_arrays:
                logger.warning(f"[ARRAY DETECTION] No arrays found in API response")
                return None
            
            # Step 3: Score arrays based on likelihood of being the main data array
            scored_arrays = []
            for array_info in root_arrays:
                score = self._score_array_field(array_info, service_name)
                scored_arrays.append({
                    **array_info,
                    'score': score
                })
            
            # Step 4: Return the highest scoring array
            best_array = max(scored_arrays, key=lambda x: x['score'])
            
            logger.info(f"[ARRAY DETECTION] Found {len(root_arrays)} arrays, selected '{best_array['field']}' with {best_array['count']} items (score: {best_array['score']})")
            
            return best_array['field']
            
        except Exception as e:
            logger.error(f"[ARRAY DETECTION] Error detecting main array: {str(e)}")
            return None

    def _score_array_field(self, array_info: dict, service_name: str) -> float:
        """
        Score an array field based on how likely it is to be the main data array
        Higher score = more likely to be the main data
        """
        field_name = array_info['field'].lower()
        count = array_info['count']
        sample_item = array_info['sample_item']
        
        score = 0.0
        
        # Base score from array size (larger arrays are more likely to be main data)
        if count > 0:
            score += min(count / 10.0, 5.0)  # Cap at 5 points for size
        
        # Field name scoring - common patterns for main data arrays
        main_data_patterns = [
            'records', 'items', 'data', 'results', 'entries', 'rows',
            'pairs', 'tokens', 'coins', 'trades', 'transactions',
            'messages', 'posts', 'comments', 'issues', 'pulls',
            'users', 'contacts', 'leads', 'customers', 'orders',
            'products', 'files', 'documents', 'pages', 'articles'
        ]
        
        for pattern in main_data_patterns:
            if pattern in field_name:
                score += 10.0  # High score for recognized patterns
                break
        
        # Service-specific scoring
        service_patterns = {
            'airtable': ['records'],
            'dexscreener': ['pairs'],
            'github': ['items', 'issues', 'pulls'],
            'slack': ['messages', 'channels'],
            'notion': ['results', 'pages'],
            'stripe': ['data', 'charges', 'customers'],
            'hubspot': ['results', 'contacts', 'deals']
        }
        
        for service, patterns in service_patterns.items():
            if service in service_name:
                for pattern in patterns:
                    if pattern in field_name:
                        score += 15.0  # Very high score for service-specific matches
                        break
        
        # Sample item scoring - objects with multiple fields are more likely to be main data
        if isinstance(sample_item, dict):
            field_count = len(sample_item.keys())
            if field_count > 3:
                score += 5.0  # Bonus for rich objects
            if field_count > 10:
                score += 5.0  # Extra bonus for very rich objects
        
        # Penalty for metadata-like arrays
        metadata_patterns = ['meta', 'debug', 'log', 'error', 'warning', 'info']
        for pattern in metadata_patterns:
            if pattern in field_name:
                score -= 5.0  # Penalty for metadata
        
        return score

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
        """Execute the full workflow associated with a trigger with LLM context"""
        try:
            logger.info(f"🚀 Executing full workflow for trigger: {trigger_id}")
            
            # Get the trigger flow
            flow = await storage_get_trigger_flow(trigger_id)
            if not flow:
                logger.error(f"❌ No flow found for trigger {trigger_id}")
                return {
                    "success": False,
                    "error": f"No flow found for trigger {trigger_id}",
                    "trigger_id": trigger_id
                }
            
            # Extract workflow components
            nodes = flow.get('nodes', [])
            edges = flow.get('edges', [])
            
            if not nodes:
                logger.warning(f"⚠️ No nodes found in flow for trigger {trigger_id}")
                return {
                    "success": False,
                    "error": "No nodes found in workflow",
                    "trigger_id": trigger_id
                }
            
            logger.info(f"📊 Workflow has {len(nodes)} nodes and {len(edges)} edges")
            
            # Get trigger owner for BYOK context
            owner = await storage_get_trigger_owner(trigger_id)
            
            # Create execution context with LLM support and BYOK
            from core.workflow_execution_context import create_execution_context
            execution_context = await create_execution_context(user_id=owner, workflow_id=trigger_id)
            
            # Prepare inputs with LLM context and user keys
            inputs = {
                "trigger_id": trigger_id,
                "trigger_type": "automated",
                "execution_mode": "trigger",
                # Auto-inject LLM context for triggered workflows
                "llm_mode_enabled": True,
                "smart_mapping_enabled": True,
                "user_keys": execution_context.user_api_keys if execution_context else {},
                "timestamp": datetime.now().isoformat()
            }
            
            logger.info(f"🤖 Executing workflow with LLM mode enabled and {len(inputs.get('user_keys', {}))} user API keys")
            
            # Execute the workflow using the engine
            from core.engine import workflow_engine
            from models.workflow import Workflow
            from models.nodes import Node
            
            # Convert to proper models
            workflow_nodes = [Node(**node) for node in nodes]
            workflow = Workflow(
                id=trigger_id,
                name=f"Triggered Workflow {trigger_id}",
                nodes=workflow_nodes,
                edges=edges
            )
            
            # Execute and collect results
            results = []
            async for event in workflow_engine.execute_workflow(workflow, inputs):
                results.append(event)
                logger.info(f"📝 Workflow event: {event.get('type', 'unknown')}")
            
            # Determine overall success
            workflow_completed = any(event.get('type') == 'workflow_completed' for event in results)
            workflow_errors = [event for event in results if event.get('type') in ['node_error', 'workflow_error']]
            
            success = workflow_completed and len(workflow_errors) == 0
            
            execution_result = {
                "success": success,
                "trigger_id": trigger_id,
                "workflow_id": trigger_id,
                "execution_events": results,
                "total_events": len(results),
                "errors": workflow_errors,
                "completed": workflow_completed,
                "execution_mode": "llm_centric",
                "user_keys_used": list(inputs.get('user_keys', {}).keys()),
                "timestamp": datetime.now().isoformat()
            }
            
            if success:
                logger.info(f"✅ Workflow execution completed successfully for trigger {trigger_id}")
            else:
                logger.error(f"❌ Workflow execution failed for trigger {trigger_id}: {len(workflow_errors)} errors")
            
            return execution_result
            
        except Exception as e:
            logger.error(f"❌ Error executing full workflow for trigger {trigger_id}: {str(e)}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            
            return {
                "success": False,
                "error": str(e),
                "trigger_id": trigger_id,
                "execution_mode": "llm_centric",
                "timestamp": datetime.now().isoformat()
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