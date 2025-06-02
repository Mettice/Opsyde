import logging
from typing import Dict, Any, Optional
from datetime import datetime
import aiohttp
import asyncio
import json

# NEW: Import the advanced data state manager
from services.data_state_manager import data_state_manager

# Import the universal data transformer
from core.data_transformer import data_transformer

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
    elif trigger_type == "universal_polling":
        service_name = data.get("serviceName", "Unknown API")
        api_endpoint = data.get("apiEndpoint", "")
        
        # Actually fetch the API data for the agent
        try:
            import requests
            
            # Set up authentication headers
            headers = {'User-Agent': 'CrewBuilder-Universal-Polling/1.0'}
            auth_type = data.get('authType', 'none')
            
            if auth_type == 'api_key' and data.get('apiKey'):
                api_key = data.get('apiKey')
                if 'airtable' in api_endpoint.lower():
                    headers['Authorization'] = f'Bearer {api_key}'
                else:
                    headers['Authorization'] = f'Bearer {api_key}'
                    headers['X-API-Key'] = api_key
                    
            elif auth_type == 'bearer_token' and data.get('bearerToken'):
                headers['Authorization'] = f'Bearer {data.get("bearerToken")}'
                
            elif auth_type == 'basic_auth' and data.get('username') and data.get('password'):
                import base64
                credentials = base64.b64encode(f"{data.get('username')}:{data.get('password')}".encode()).decode()
                headers['Authorization'] = f'Basic {credentials}'
            
            # Fetch the actual data
            response = requests.get(api_endpoint, headers=headers, timeout=30)
            
            if response.status_code == 200:
                api_data = response.json()
                
                # Use the universal data transformer instead of hardcoded logic
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    standard_records = loop.run_until_complete(
                        data_transformer.transform_api_response(api_data, service_name)
                    )
                    
                    # Convert to agent format
                    agent_data = data_transformer.to_agent_format(standard_records)
                    
                    return {
                        "output": f"Universal API data from {service_name}",
                        "type": "api_data",
                        "trigger_type": "universal_polling",
                        "trigger_id": trigger_id,
                        "service_name": service_name,
                        "api_data": agent_data,
                        "standard_records": standard_records,
                        "data_summary": f"Transformed {len(standard_records)} records from {service_name}",
                        "transformation_confidence": agent_data.get("transformation_summary", {}).get("avg_confidence", 0)
                    }
                finally:
                    loop.close()
            else:
                raise Exception(f"API request failed: {response.status_code}")
                
        except Exception as api_error:
            logger.error(f"Failed to fetch API data: {str(api_error)}")
            return {
                "output": f"Universal API Polling - monitoring {service_name} (failed to fetch data: {str(api_error)})",
                "type": "trigger_status",
                "trigger_type": "universal_polling",
                "trigger_id": trigger_id,
                "service_name": service_name,
                "error": str(api_error)
            }
    elif trigger_type == "universal_webhook":
        service_name = data.get("serviceName", "Unknown Service")
        return {
            "output": f"Universal Webhook - ready for {service_name}",
            "type": "trigger_status",
            "trigger_type": "universal_webhook",
            "trigger_id": trigger_id,
            "service_name": service_name
        }
    else:
        return {
            "output": f"Unknown trigger type: {trigger_type}",
            "type": "error",
            "trigger_type": trigger_type,
            "trigger_id": trigger_id
        }

async def process_trigger_node(node_data: Dict[str, Any], inputs: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
    """Process trigger node with universal data transformation and intelligent change detection"""
    
    if not node_data:
        logger.error("No node data provided to trigger processor")
        return {"error": "No node data provided", "status": "error"}
    
    # Fix: Handle both camelCase and snake_case trigger type fields
    trigger_type = node_data.get('triggerType') or node_data.get('trigger_type', 'manual')
    trigger_id = node_data.get('nodeId') or node_data.get('id', 'unknown')
    
    logger.info(f"Processing trigger node with type: {trigger_type}")
    
    try:
        if trigger_type == 'manual':
            return {
                "status": "success",
                "message": "Manual trigger activated",
                "trigger_type": "manual",
                "timestamp": datetime.now().isoformat()
            }
        
        elif trigger_type == 'webhook':
            webhook_data = node_data.get('webhookData', {})
            return {
                "status": "success",
                "message": f"Webhook trigger activated for {webhook_data.get('service', 'unknown service')}",
                "trigger_type": "webhook",
                "webhook_service": webhook_data.get('service'),
                "timestamp": datetime.now().isoformat(),
                "data": webhook_data
            }
        
        elif trigger_type == 'schedule':
            schedule_type = node_data.get('scheduleType', 'once')
            schedule_time = node_data.get('scheduleTime')
            
            return {
                "status": "success",
                "message": f"Schedule trigger activated ({schedule_type})",
                "trigger_type": "schedule",
                "schedule_type": schedule_type,
                "schedule_time": schedule_time,
                "timestamp": datetime.now().isoformat()
            }
        
        elif trigger_type == 'universal_polling':
            # Enhanced universal polling with DataStateManager integration
            service_name = node_data.get('serviceName', 'Unknown Service')
            api_endpoint = node_data.get('apiEndpoint')
            polling_interval = node_data.get('pollingInterval', 300)
            change_detection_method = node_data.get('changeDetectionMethod', 'array_length')
            
            # User configuration (no more hardcoded overrides!)
            summary_mode = node_data.get('summaryMode', False)
            target_fields = node_data.get('targetFields', [])
            exclude_fields = node_data.get('excludeFields', [])
            max_records = node_data.get('maxRecords', 10)  # User controls this now
            max_tokens = node_data.get('maxTokens', 4000)  # User controls this now
            
            logger.info(f"Universal polling trigger: {service_name} - {api_endpoint}")
            logger.info(f"🎯 User Configuration: max_records={max_records}, max_tokens={max_tokens}, summary_mode={summary_mode}")
            
            if not api_endpoint:
                return {
                    "status": "error",
                    "message": "API endpoint is required for universal polling",
                    "trigger_type": "universal_polling"
                }
            
            try:
                # Step 1: Fetch API data
                api_data = await fetch_api_data(node_data)
                
                if not api_data:
                    return {
                        "status": "error",
                        "message": f"Failed to fetch data from {service_name}",
                        "trigger_type": "universal_polling"
                    }
                
                logger.info(f"Successfully fetched data from {service_name}")
                
                # Step 2: Use DataStateManager to detect changes (THE KEY FIX!)
                change_config = {
                    "id_field": "pairAddress" if 'dexscreener' in service_name.lower() else "id",
                    "max_new_records": max_records,
                    "filter_fields": target_fields if target_fields else None,
                    "change_detection_fields": node_data.get('selectedFields', None)
                }
                
                # Initialize DataStateManager if needed
                await data_state_manager.initialize()
                
                # Detect changes using smart detection
                changes = await data_state_manager.detect_changes(
                    trigger_id=trigger_id,
                    current_data=api_data,
                    detection_method="smart",
                    config=change_config
                )
                
                logger.info(f"🔍 Change Detection Results: {changes.get('summary', {})}")
                
                # NEW: Check if user wants to review data before processing
                require_approval = node_data.get('requireDataApproval', False)
                
                if require_approval and changes.get('has_changes', False):
                    # Return data for user review instead of auto-processing
                    new_records = changes.get('new_records', [])
                    modified_records = changes.get('modified_records', [])
                    
                    # Combine new and modified records for review
                    records_for_review = []
                    for record in new_records:
                        records_for_review.append({
                            "type": "new",
                            "data": record.get('data', record),
                            "id": record.get('id', 'unknown')
                        })
                    for record in modified_records:
                        records_for_review.append({
                            "type": "modified", 
                            "data": record.get('data', record),
                            "id": record.get('id', 'unknown')
                        })
                    
                    logger.info(f"🔍 Requiring user approval for {len(records_for_review)} changed records")
                    
                    return {
                        "status": "pending_approval",
                        "message": f"Changes detected in {service_name} - Review required",
                        "trigger_type": "universal_polling",
                        "service_name": service_name,
                        "api_endpoint": api_endpoint,
                        "timestamp": datetime.now().isoformat(),
                        "type": "pending_approval",
                        "records_for_review": records_for_review,
                        "available_fields": node_data.get('discoveredFields', []),
                        "selected_fields": node_data.get('selectedFields', []),
                        "change_summary": changes.get('summary', {}),
                        "approval_endpoint": f"/api/triggers/data-approval/{trigger_id}",
                        "instructions": "Review the detected changes and approve the data you want to send to your agent."
                    }
                
                # Step 3: Process only NEW or MODIFIED records OR initial data
                if not changes.get('has_changes', False):
                    # Check if this is the first run or if we should pass initial data
                    change_type = changes.get('change_type', '')
                    is_first_run = change_type == 'initial_state'
                    pass_initial_data = node_data.get('passInitialData', True)  # Default to True for better UX
                    
                    if is_first_run and pass_initial_data:
                        logger.info(f"🚀 First run detected - processing initial data from {service_name}")
                        # Process a sample of the initial data for the agent
                        if isinstance(api_data, list):
                            initial_records = api_data[:max_records]  # Respect user's max_records setting
                        elif isinstance(api_data, dict) and 'pairs' in api_data:
                            initial_records = api_data['pairs'][:max_records]
                        else:
                            initial_records = [api_data] if api_data else []
                        
                        # Process initial data same as changed data
                        if initial_records:
                            # For DexScreener, wrap in expected structure
                            if 'dexscreener' in service_name.lower():
                                if isinstance(api_data, dict):
                                    processed_data = {
                                        "pairs": initial_records,
                                        "schemaVersion": api_data.get('schemaVersion', '1.0.0'),
                                        "source": "DexScreener",
                                        "timestamp": datetime.now().isoformat()
                                    }
                                else:
                                    processed_data = {
                                        "pairs": initial_records,
                                        "schemaVersion": "1.0.0",
                                        "source": "DexScreener",
                                        "timestamp": datetime.now().isoformat()
                                    }
                            else:
                                processed_data = initial_records
                            
                            # Create context for transformation
                            transformation_context = {
                                "trigger_type": "universal_polling", 
                                "node_data": node_data,
                                "summary_mode": summary_mode,
                                "target_fields": target_fields,
                                "exclude_fields": exclude_fields,
                                "max_records": max_records,
                                "max_tokens": max_tokens,
                                "change_detection_enabled": True,
                                "is_initial_data": True
                            }
                            
                            # Transform using universal data transformer
                            standard_records = await data_transformer.transform_api_response(
                                processed_data, 
                                service_name,
                                context=transformation_context
                            )
                            
                            # Convert to agent format
                            agent_data = data_transformer.to_agent_format(standard_records)
                            
                            # Add metadata for initial data
                            agent_data["change_detection"] = {
                                "enabled": True,
                                "is_initial_data": True,
                                "initial_records": len(initial_records),
                                "detection_method": "smart",
                                "summary": changes.get('summary', {})
                            }
                            
                            logger.info(f"✅ Processed {len(standard_records)} initial records for agent")
                            
                            return {
                                "status": "success",
                                "message": f"Initial data from {service_name} - {len(initial_records)} records",
                                "trigger_type": "universal_polling",
                                "service_name": service_name,
                                "api_endpoint": api_endpoint,
                                "timestamp": datetime.now().isoformat(),
                                "type": "api_data",
                                "api_data": agent_data,
                                "raw_api_data": processed_data,
                                "standard_records": standard_records,
                                "data_summary": f"Initial data: {len(standard_records)} records from {service_name}",
                                "transformation_confidence": agent_data.get("transformation_summary", {}).get("avg_confidence", 0),
                                "record_types": agent_data.get("transformation_summary", {}).get("record_types", []),
                                "field_count": sum(len(record.fields) for record in standard_records),
                                "change_detection_enabled": True,
                                "change_summary": changes.get('summary', {}),
                                "is_initial_data": True
                            }
                    
                    # No changes and not first run - return no changes status
                    logger.info(f"✅ No changes detected for {service_name} - skipping processing")
                    return {
                        "status": "success",
                        "message": f"No changes detected in {service_name}",
                        "trigger_type": "universal_polling",
                        "service_name": service_name,
                        "timestamp": datetime.now().isoformat(),
                        "type": "no_changes",
                        "summary": changes.get('summary', {}),
                        "change_detection_enabled": True
                    }
                    
                # Extract only the changed data (when changes ARE detected)
                new_records = changes.get('new_records', [])
                modified_records = changes.get('modified_records', [])
                
                # Combine new and modified records for processing
                records_to_process = []
                for record in new_records:
                    records_to_process.append(record.get('data', record))
                for record in modified_records:
                    records_to_process.append(record.get('data', record))
                
                logger.info(f"🚀 Processing {len(records_to_process)} changed records (was {len(api_data) if isinstance(api_data, list) else 1} total)")
                
                # Step 4: Transform only the changed data
                if records_to_process:
                    # For DexScreener, wrap in expected structure
                    if 'dexscreener' in service_name.lower():
                        # Handle both object and array responses from DexScreener
                        if isinstance(api_data, dict):
                            # Standard DexScreener search API response
                            processed_data = {
                                "pairs": records_to_process,
                                "schemaVersion": api_data.get('schemaVersion', '1.0.0'),
                                "source": "DexScreener",
                                "timestamp": datetime.now().isoformat()
                            }
                        else:
                            # Token profiles API returns direct array
                            processed_data = {
                                "pairs": records_to_process,
                                "schemaVersion": "1.0.0",
                                "source": "DexScreener",
                                "timestamp": datetime.now().isoformat()
                            }
                    else:
                        processed_data = records_to_process
                    
                    # Create context for transformation (user controls, no emergency overrides)
                    transformation_context = {
                        "trigger_type": "universal_polling", 
                        "node_data": node_data,
                        "summary_mode": summary_mode,
                        "target_fields": target_fields,
                        "exclude_fields": exclude_fields,
                        "max_records": max_records,  # User setting respected
                        "max_tokens": max_tokens,    # User setting respected
                        "change_detection_enabled": True,
                        "only_changed_data": True
                    }
                    
                    # Transform using universal data transformer
                    standard_records = await data_transformer.transform_api_response(
                        processed_data, 
                        service_name,
                        context=transformation_context
                    )
                    
                    # Convert to agent format
                    agent_data = data_transformer.to_agent_format(standard_records)
                    
                    # Add change detection metadata
                    agent_data["change_detection"] = {
                        "enabled": True,
                        "new_records": len(new_records),
                        "modified_records": len(modified_records),
                        "total_changes": len(records_to_process),
                        "detection_method": "smart",
                        "summary": changes.get('summary', {})
                    }
                    
                    logger.info(f"✅ Processed {len(standard_records)} changed records with avg confidence: {agent_data.get('transformation_summary', {}).get('avg_confidence', 0):.2f}")
                    
                    # Return standardized data for the agent
                    return {
                        "status": "success",
                        "message": f"Changes detected in {service_name} - {len(records_to_process)} new/modified records",
                        "trigger_type": "universal_polling",
                        "service_name": service_name,
                        "api_endpoint": api_endpoint,
                        "timestamp": datetime.now().isoformat(),
                        "type": "api_data",
                        "api_data": agent_data,  # Standardized format for agents
                        "raw_api_data": processed_data,  # Include processed data for debugging
                        "standard_records": standard_records,  # Full transformation details
                        "data_summary": f"Processed {len(standard_records)} changed records from {service_name}",
                        "transformation_confidence": agent_data.get("transformation_summary", {}).get("avg_confidence", 0),
                        "record_types": agent_data.get("transformation_summary", {}).get("record_types", []),
                        "field_count": sum(len(record.fields) for record in standard_records),
                        "change_detection_enabled": True,
                        "change_summary": changes.get('summary', {})
                    }
                else:
                    logger.warning(f"⚠️ Changes detected but no records to process for {service_name}")
                    return {
                        "status": "success",
                        "message": f"Changes detected but no processable records in {service_name}",
                        "trigger_type": "universal_polling",
                        "service_name": service_name,
                        "timestamp": datetime.now().isoformat(),
                        "type": "no_processable_changes",
                        "change_detection_enabled": True,
                        "change_summary": changes.get('summary', {})
                    }
            except Exception as e:
                logger.error(f"Error in universal polling for {service_name}: {str(e)}")
                return {
                    "status": "error",
                    "message": f"Universal polling error for {service_name}: {str(e)}",
                    "trigger_type": "universal_polling",
                    "error": str(e)
                }
        
        elif trigger_type == 'universal_webhook':
            service_name = node_data.get('serviceName', 'Unknown Service')
            webhook_service = node_data.get('webhookService', 'generic')
            
            return {
                "status": "success",
                "message": f"Universal webhook trigger activated for {service_name}",
                "trigger_type": "universal_webhook",
                "service_name": service_name,
                "webhook_service": webhook_service,
                "timestamp": datetime.now().isoformat(),
                "ready_for_webhooks": True
            }
        
        else:
            logger.warning(f"Unsupported trigger type: {trigger_type}")
            return {
                "status": "error",
                "message": f"Unsupported trigger type: {trigger_type}",
                "trigger_type": trigger_type
            }
    
    except Exception as e:
        logger.error(f"Error processing trigger node: {str(e)}")
        return {
            "status": "error",
            "message": f"Error processing trigger: {str(e)}",
            "trigger_type": trigger_type,
            "error": str(e)
        }

async def fetch_api_data(node_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Fetch data from API endpoint with authentication support
    """
    try:
        api_endpoint = node_data.get('apiEndpoint')
        if not api_endpoint:
            return None
        
        # Set up authentication headers
        headers = {'User-Agent': 'CrewBuilder-Universal-Polling/1.0'}
        auth_type = node_data.get('authType', 'none')
        
        if auth_type == 'api_key' and node_data.get('apiKey'):
            api_key = node_data.get('apiKey')
            if 'airtable' in api_endpoint.lower():
                headers['Authorization'] = f'Bearer {api_key}'
            else:
                headers['Authorization'] = f'Bearer {api_key}'
                headers['X-API-Key'] = api_key
                
        elif auth_type == 'bearer_token' and node_data.get('bearerToken'):
            headers['Authorization'] = f'Bearer {node_data.get("bearerToken")}'
            
        elif auth_type == 'basic_auth' and node_data.get('username') and node_data.get('password'):
            import base64
            credentials = base64.b64encode(f"{node_data.get('username')}:{node_data.get('password')}".encode()).decode()
            headers['Authorization'] = f'Basic {credentials}'
        
        # Make async HTTP request
        async with aiohttp.ClientSession() as session:
            async with session.get(api_endpoint, headers=headers, timeout=30) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    logger.error(f"API request failed with status {response.status}")
                    return None
                    
    except Exception as e:
        logger.error(f"Error fetching API data: {str(e)}")
        return None

def _filter_api_data(api_data, node_data):
    """
    Legacy filtering function for backward compatibility
    Enhanced to work with the new filtering system
    """
    try:
        if not api_data:
            return api_data
        
        # Get filter configuration from node_data
        include_fields = node_data.get('includeFields', [])
        exclude_fields = node_data.get('excludeFields', [])
        
        # If no filtering specified, return original data
        if not include_fields and not exclude_fields:
            return api_data
        
        def filter_record(record):
            """Filter a single record based on include/exclude fields"""
            if not isinstance(record, dict):
                return record
            
            filtered_record = {}
            
            if include_fields:
                # Only include specified fields
                for field in include_fields:
                    if '.' in field:
                        # Handle nested fields
                        value = _get_nested_value(record, field)
                        if value is not None:
                            _set_nested_value(filtered_record, field, value)
                    elif field in record:
                        filtered_record[field] = record[field]
            else:
                # Include all fields except excluded ones
                filtered_record = record.copy()
                for field in exclude_fields:
                    if '.' in field:
                        # Handle nested fields
                        _remove_nested_field(filtered_record, field)
                    elif field in filtered_record:
                        del filtered_record[field]
            
            return filtered_record
        
        # Apply filtering based on data structure
        if isinstance(api_data, list):
            # Direct array
            return [filter_record(record) for record in api_data]
        elif isinstance(api_data, dict):
            if 'records' in api_data and isinstance(api_data['records'], list):
                # Airtable-style response
                filtered_data = api_data.copy()
                filtered_data['records'] = [filter_record(record) for record in api_data['records']]
                return filtered_data
            elif 'data' in api_data and isinstance(api_data['data'], list):
                # Generic data wrapper
                filtered_data = api_data.copy()
                filtered_data['data'] = [filter_record(record) for record in api_data['data']]
                return filtered_data
            else:
                # Single object
                return filter_record(api_data)
        
        return api_data
        
    except Exception as e:
        logger.error(f"Error filtering API data: {str(e)}")
        return api_data

def _get_nested_value(data: Dict, path: str) -> Any:
    """Get value from nested dictionary using dot notation"""
    if not path:
        return data
    
    keys = path.split('.')
    current = data
    
    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return None
    
    return current

def _set_nested_value(data: Dict, path: str, value: Any):
    """Set value in nested dictionary using dot notation"""
    keys = path.split('.')
    current = data
    
    for key in keys[:-1]:
        if key not in current:
            current[key] = {}
        current = current[key]
    
    current[keys[-1]] = value

def _remove_nested_field(data: Dict, path: str):
    """Remove field from nested dictionary using dot notation"""
    keys = path.split('.')
    current = data
    
    for key in keys[:-1]:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return
    
    if isinstance(current, dict) and keys[-1] in current:
        del current[keys[-1]]


