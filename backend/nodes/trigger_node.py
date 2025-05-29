import logging
from typing import Dict, Any, Optional
from datetime import datetime
import aiohttp
import asyncio
import json

# NEW: Import the advanced data state manager
from services.data_state_manager import data_state_manager

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
                
                # FIELD FILTERING: Extract only specified columns
                filtered_data = self._filter_api_data(api_data, data)
                
                return {
                    "output": f"Universal API Polling data from {service_name}",
                    "type": "api_data",
                    "trigger_type": "universal_polling",
                    "trigger_id": trigger_id,
                    "service_name": service_name,
                    "api_data": filtered_data,  # Pass filtered data instead of raw data
                    "original_count": len(api_data.get('records', api_data)) if isinstance(api_data, dict) and 'records' in api_data else len(api_data) if isinstance(api_data, list) else 'unknown',
                    "filtered_count": len(filtered_data.get('records', filtered_data)) if isinstance(filtered_data, dict) and 'records' in filtered_data else len(filtered_data) if isinstance(filtered_data, list) else 'unknown',
                    "data_summary": f"Retrieved {len(api_data.get('records', api_data)) if isinstance(api_data, dict) and 'records' in api_data else len(api_data) if isinstance(api_data, list) else 'unknown'} items from {service_name}, filtered to specified columns"
                }
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
    """Process trigger node with enhanced incremental data processing"""
    
    if not node_data:
        logger.error("No node data provided to trigger processor")
        return {"error": "No node data provided", "status": "error"}
    
    trigger_type = node_data.get('trigger_type', 'manual')
    
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
            # Enhanced universal polling with intelligent data processing
            service_name = node_data.get('serviceName', 'Unknown Service')
            api_endpoint = node_data.get('apiEndpoint')
            polling_interval = node_data.get('pollingInterval', 300)
            change_detection_method = node_data.get('changeDetectionMethod', 'smart')
            
            # NEW: Advanced filtering configuration
            filter_config = {
                "include_fields": node_data.get('includeFields', []),
                "exclude_fields": node_data.get('excludeFields', []),
                "field_conditions": node_data.get('fieldConditions', {}),
                "limit": node_data.get('recordLimit'),
                "sort_by": node_data.get('sortBy'),
                "id_field": node_data.get('idField', 'id'),
                "timestamp_field": node_data.get('timestampField'),
                "target_field": node_data.get('changeDetectionField'),
                "max_new_records": node_data.get('maxNewRecords', 100)
            }
            
            if not api_endpoint:
                return {
                    "status": "error",
                    "message": "API endpoint is required for universal polling",
                    "trigger_type": "universal_polling"
                }
            
            try:
                # Initialize data state manager if not already done
                await data_state_manager.initialize()
                
                # Fetch API data
                api_data = await fetch_api_data(node_data)
                
                if not api_data:
                    return {
                        "status": "error",
                        "message": f"Failed to fetch data from {service_name}",
                        "trigger_type": "universal_polling"
                    }
                
                # Generate unique trigger ID
                trigger_id = f"{service_name}_{hash(api_endpoint)}".replace(" ", "_").lower()
                
                # Detect changes using advanced state management
                change_result = await data_state_manager.detect_changes(
                    trigger_id=trigger_id,
                    current_data=api_data,
                    detection_method=change_detection_method,
                    config=filter_config
                )
                
                # Filter and transform data if changes detected
                if change_result.get("has_changes"):
                    # Apply advanced filtering to new/modified records
                    new_records = change_result.get("new_records", [])
                    modified_records = change_result.get("modified_records", [])
                    
                    # Extract actual data from change records
                    all_changed_data = []
                    for record in new_records:
                        if isinstance(record, dict) and "data" in record:
                            all_changed_data.append(record["data"])
                        else:
                            all_changed_data.append(record)
                    
                    for record in modified_records:
                        if isinstance(record, dict) and "data" in record:
                            all_changed_data.append(record["data"])
                        else:
                            all_changed_data.append(record)
                    
                    # Apply additional filtering if configured
                    if any(filter_config.values()):
                        filter_result = await data_state_manager.filter_and_transform_data(
                            all_changed_data, 
                            filter_config
                        )
                        filtered_data = filter_result.get("filtered_data", all_changed_data)
                    else:
                        filtered_data = all_changed_data
                    
                    # Prepare comprehensive result
                    result = {
                        "status": "success",
                        "message": f"Universal polling trigger activated for {service_name}",
                        "trigger_type": "universal_polling",
                        "service_name": service_name,
                        "api_endpoint": api_endpoint,
                        "polling_interval": polling_interval,
                        "change_detection_method": change_detection_method,
                        "timestamp": datetime.now().isoformat(),
                        
                        # Enhanced data processing results
                        "has_changes": True,
                        "change_type": change_result.get("change_type"),
                        "data": filtered_data,  # Only new/modified data
                        "full_response": api_data,  # Complete API response for reference
                        
                        # Change summary
                        "change_summary": change_result.get("summary", {}),
                        "new_records_count": len(new_records),
                        "modified_records_count": len(modified_records),
                        
                        # Processing metadata
                        "processing_metadata": {
                            "trigger_id": trigger_id,
                            "detection_method": change_detection_method,
                            "filter_applied": bool(any(filter_config.values())),
                            "original_data_size": len(api_data) if isinstance(api_data, list) else 1,
                            "filtered_data_size": len(filtered_data) if isinstance(filtered_data, list) else 1,
                            "processing_timestamp": datetime.now().isoformat()
                        }
                    }
                    
                    logger.info(f"[UNIVERSAL POLLING] Changes detected for {service_name}: {len(new_records)} new, {len(modified_records)} modified")
                    return result
                
                else:
                    # No changes detected
                    return {
                        "status": "success",
                        "message": f"Universal polling active for {service_name} - no changes detected",
                        "trigger_type": "universal_polling",
                        "service_name": service_name,
                        "has_changes": False,
                        "change_type": change_result.get("change_type", "no_change"),
                        "timestamp": datetime.now().isoformat(),
                        "processing_metadata": {
                            "trigger_id": trigger_id,
                            "detection_method": change_detection_method,
                            "last_check": datetime.now().isoformat()
                        }
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


