from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Dict, List, Optional, AsyncGenerator, Any
import logging
from fastapi.responses import StreamingResponse
from datetime import datetime
import json

from models.api_models import (
    APIResponse, TriggerBase, TriggerExecutionResponse, TriggerListResponse,
    TriggerRegistrationResponse, TriggerScheduleResponse, TriggerType,
    TriggerStatus, ErrorCode
)
from services.trigger_service import TriggerService
from utils.logging import get_logger
from utils.security import get_current_user, security_manager
from utils.api_utils import handle_exception
from core.runner import UnifiedRunner
from core.di import get_trigger_service

logger = get_logger(__name__)

async def get_current_user_optional(request: Request) -> Optional[Dict]:
    """Get current user if authenticated, otherwise return None"""
    try:
        # Try to get the Authorization header
        auth_header = request.headers.get("Authorization")
        logger.debug(f"Authorization header: {auth_header[:20] if auth_header else 'None'}...")
        
        if not auth_header:
            logger.debug("No Authorization header found")
            return None
            
        if not auth_header.startswith("Bearer "):
            logger.debug("Authorization header doesn't start with 'Bearer '")
            return None
        
        # Extract token
        token = auth_header.split(" ")[1]
        logger.debug(f"Extracted token: {token[:20]}...")
        
        # Verify token
        payload = security_manager.verify_token(token)
        logger.debug(f"Token verified successfully for user: {payload.get('user_id', 'unknown')}")
        return payload
        
    except Exception as e:
        # Log the specific error for debugging
        logger.debug(f"Authentication failed (optional): {str(e)}")
        # If any error occurs, just return None (unauthenticated)
        return None

# Create two routers - one with prefix and one without
router = APIRouter(tags=["triggers"])
root_router = APIRouter(tags=["triggers"])  # No prefix for backward compatibility

async def run_crew(data: Dict[str, Any]) -> AsyncGenerator[str, None]:
    """
    Run a crew workflow with proper execution tracking
    
    Args:
        data: Dictionary containing workflow data including nodes, edges, and inputs
        
    Yields:
        JSON strings containing execution results for each node
    """
    try:
        runner = UnifiedRunner()
        nodes = data.get("nodes", [])
        edges = data.get("edges", [])
        inputs = data.get("inputs", {})
        
        logger.info(f"Starting workflow execution with {len(nodes)} nodes")
        
        # Initialize tracking
        node_results = {}
        executed_nodes = set()
        
        # Get execution order
        execution_order = runner.determine_execution_order(nodes, edges)
        
        # Create node lookup
        node_map = {node.get("id"): node for node in nodes}
        
        for node_id in execution_order:
            try:
                # Skip if already executed
                if node_id in executed_nodes:
                    continue
                    
                node = node_map.get(node_id)
                if not node:
                    continue

                # Get node inputs
                node_inputs = runner.get_node_inputs(node_id, edges, node_results, inputs)

                # Execute node
                result = await runner.execute_node(node, node_inputs)
                
                # Store result
                node_results[node_id] = result
                executed_nodes.add(node_id)
                
                # Format output
                output = {
                    "node_id": node_id,
                    "node_type": node.get("type", "unknown"),
                    "node_label": node.get("data", {}).get("label", "Unnamed Node"),
                    "result": result,
                    "metadata": {
                        "timestamp": datetime.now().isoformat(),
                        "execution_index": len(executed_nodes),
                        "has_error": isinstance(result, dict) and result.get("type") == "error"
                    }
                }
                
                yield json.dumps(output)
                
            except Exception as e:
                error_output = {
                    "node_id": node_id,
                    "type": "error",
                    "error": str(e),
                    "metadata": {
                        "timestamp": datetime.now().isoformat(),
                        "execution_index": len(executed_nodes)
                    }
                }
                yield json.dumps(error_output)
                logger.error(f"Error executing node {node_id}: {str(e)}")
                
    except Exception as e:
        error_output = {
            "type": "error",
            "error": str(e),
            "metadata": {
                "timestamp": datetime.now().isoformat()
            }
        }
        yield json.dumps(error_output)
        logger.error(f"Error in workflow execution: {str(e)}")

@router.get("/executed", response_model=APIResponse[TriggerListResponse])
@router.get("/executed-triggers", response_model=APIResponse[TriggerListResponse])
async def get_executed_triggers(
    trigger_service: TriggerService = Depends(get_trigger_service)
) -> APIResponse[TriggerListResponse]:
    """List all executed triggers"""
    try:
        triggers = await trigger_service.list_triggers()
        executed_triggers = [
            TriggerBase(**trigger) for trigger in triggers 
            if trigger.get("trigger_count", 0) > 0
        ]
        
        response = TriggerListResponse(
            triggers=executed_triggers,
            total_count=len(executed_triggers)
        )
        return APIResponse.success_response(response)
        
    except Exception as e:
        return handle_exception(e)

# Also add the root_router route for backward compatibility
root_router.get("/executed-triggers")(get_executed_triggers)

@router.post("/register", response_model=APIResponse[TriggerRegistrationResponse])
async def register_trigger(
    trigger_data: Dict,
    request: Request,
    trigger_service: TriggerService = Depends(get_trigger_service)
) -> APIResponse[TriggerRegistrationResponse]:
    """Register a new trigger with its associated flow"""
    try:
        trigger_id = trigger_data.get("trigger_id")
        flow = trigger_data.get("flow")
        
        # Use optional authentication
        current_user = await get_current_user_optional(request)
        owner = current_user.get("id", "system") if current_user else "system"
        
        success = await trigger_service.register_trigger(trigger_id, flow, owner)
        
        if not success:
            return APIResponse.error_response(
                code=ErrorCode.VALIDATION_ERROR,
                message="Failed to register trigger"
            )
        
        # Create webhook URL if it's a webhook trigger
        webhook_url = None
        if trigger_data.get("type") == TriggerType.WEBHOOK:
            webhook_url = f"/api/triggers/{trigger_id}"
        
        response = TriggerRegistrationResponse(
            trigger_id=trigger_id,
            webhook_url=webhook_url,
            status=TriggerStatus.ACTIVE
        )
        return APIResponse.success_response(response)
        
    except Exception as e:
        return handle_exception(e)

# Protected routes that require authentication
@router.post("/{trigger_id}", response_model=APIResponse[TriggerExecutionResponse])
async def handle_trigger(
    trigger_id: str,
    request: Request,
    trigger_service: TriggerService = Depends(get_trigger_service)
) -> APIResponse[TriggerExecutionResponse]:
    """Handle incoming webhook triggers for flows"""
    try:
        payload = await request.json()
        logger.info(f"Received trigger for ID: {trigger_id}")
        
        # Use execute_trigger_flow here to increment the count properly
        flow = await trigger_service.execute_trigger_flow(trigger_id)
        if not flow:
            return APIResponse.error_response(
                code=ErrorCode.NOT_FOUND,
                message=f"Trigger {trigger_id} not found"
            )
        
        # Add payload to flow context
        flow["trigger_payload"] = payload
        
        # Start execution
        start_time = datetime.now()
        execution_id = f"exec_{trigger_id}_{start_time.timestamp()}"
        
        # Return streaming response with proper structure
        return StreamingResponse(
            run_crew(flow),
            media_type="text/event-stream",
            headers={
                "X-Execution-ID": execution_id,
                "X-Trigger-ID": trigger_id
            }
        )
        
    except Exception as e:
        return handle_exception(e)

@router.get("", response_model=APIResponse[TriggerListResponse])
async def list_triggers(
    owner: Optional[str] = None,
    trigger_service: TriggerService = Depends(get_trigger_service)
) -> APIResponse[TriggerListResponse]:
    """List all registered triggers"""
    try:
        triggers = await trigger_service.list_triggers(owner)
        
        response = TriggerListResponse(
            triggers=[TriggerBase(**trigger) for trigger in triggers],
            total_count=len(triggers)
        )
        return APIResponse.success_response(response)
        
    except Exception as e:
        return handle_exception(e)

@router.delete("/{trigger_id}", response_model=APIResponse[Dict[str, str]])
async def delete_trigger(
    trigger_id: str,
    trigger_service: TriggerService = Depends(get_trigger_service),
    current_user: Dict = Depends(get_current_user)
) -> APIResponse[Dict[str, str]]:
    """Delete a trigger"""
    try:
        success = await trigger_service.delete_trigger(trigger_id)
        
        if not success:
            return APIResponse.error_response(
                code=ErrorCode.NOT_FOUND,
                message=f"Trigger {trigger_id} not found"
            )
        
        return APIResponse.success_response({
            "message": f"Trigger {trigger_id} deleted successfully"
        })
        
    except Exception as e:
        return handle_exception(e)

@router.post("/schedule", response_model=APIResponse[TriggerScheduleResponse])
async def schedule_trigger(
    trigger_data: Dict,
    request: Request,
    trigger_service: TriggerService = Depends(get_trigger_service)
) -> APIResponse[TriggerScheduleResponse]:
    """Schedule a trigger for future execution"""
    try:
        trigger_id = trigger_data.get("trigger_id")
        if not trigger_id:
            return APIResponse.error_response(
                code=ErrorCode.VALIDATION_ERROR,
                message="Missing trigger_id"
            )
        
        # Register the trigger first
        flow = trigger_data.get("flow")
        
        # Use optional authentication
        current_user = await get_current_user_optional(request)
        owner = current_user.get("id", "system") if current_user else "system"
        
        success = await trigger_service.register_trigger(trigger_id, flow, owner)
        if not success:
            return APIResponse.error_response(
                code=ErrorCode.VALIDATION_ERROR,
                message="Failed to register trigger"
            )
        
        # Get next scheduled run
        schedule_info = trigger_service.get_schedule_info(trigger_data)
        
        response = TriggerScheduleResponse(
            trigger_id=trigger_id,
            schedule_type=schedule_info["type"],
            next_run=schedule_info["next_run"],
            status=TriggerStatus.ACTIVE
        )
        return APIResponse.success_response(response)
        
    except Exception as e:
        return handle_exception(e)

@router.get("/debug/test")
async def debug_test_endpoint() -> Dict[str, Any]:
    """Simple test endpoint to verify routing is working"""
    return {
        "success": True,
        "message": "Debug endpoint is working!",
        "timestamp": datetime.now().isoformat()
    }

@router.post("/debug/test-api-polling-simple")
async def debug_test_api_polling_simple(
    test_data: Dict[str, Any],
    trigger_service: TriggerService = Depends(get_trigger_service)
) -> Dict[str, Any]:
    """Simple API polling test without AI analysis - just returns raw data"""
    try:
        logger.info(f"Simple API polling test started with data: {test_data}")
        
        import aiohttp
        
        # Extract test parameters
        api_endpoint = test_data.get('apiEndpoint')
        auth_type = test_data.get('authType', 'none')
        api_key = test_data.get('apiKey')
        bearer_token = test_data.get('bearerToken')
        username = test_data.get('username')
        password = test_data.get('password')
        service_name = test_data.get('serviceName', 'Unknown API')
        
        logger.info(f"Testing endpoint: {api_endpoint}, service: {service_name}, auth: {auth_type}")
        
        if not api_endpoint:
            return {"success": False, "error": "API endpoint is required"}
        
        # Set up headers
        headers = {'User-Agent': 'CrewBuilder-Simple-Test/1.0'}
        
        # Handle different authentication types
        if auth_type == 'api_key' and api_key:
            if 'airtable' in api_endpoint.lower():
                headers['Authorization'] = f'Bearer {api_key}'
            else:
                headers['Authorization'] = f'Bearer {api_key}'
                headers['X-API-Key'] = api_key
                
        elif auth_type == 'bearer_token' and bearer_token:
            headers['Authorization'] = f'Bearer {bearer_token}'
            
        elif auth_type == 'basic_auth' and username and password:
            import base64
            credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
            headers['Authorization'] = f'Basic {credentials}'
        
        logger.info(f"Making request to {api_endpoint} with headers: {list(headers.keys())}")
        
        # Make the API request
        async with aiohttp.ClientSession() as session:
            async with session.get(api_endpoint, headers=headers, timeout=30) as response:
                logger.info(f"API response status: {response.status}")
                
                if response.status == 200:
                    try:
                        # Check content type to handle different response formats
                        content_type = response.headers.get('content-type', '').lower()
                        
                        if 'text/csv' in content_type or 'csv' in api_endpoint.lower():
                            # Handle CSV response (Google Sheets, etc.)
                            logger.info(f"Detected CSV response, parsing as CSV")
                            csv_text = await response.text()
                            
                            # Parse CSV into JSON-like structure
                            import csv
                            import io
                            
                            csv_reader = csv.reader(io.StringIO(csv_text))
                            rows = list(csv_reader)
                            
                            if rows:
                                headers = rows[0]  # First row as headers
                                data_rows = rows[1:]  # Remaining rows as data
                                
                                # Convert to JSON-like structure
                                data = {
                                    "values": rows,  # Google Sheets API format
                                    "headers": headers,
                                    "data_rows": data_rows,
                                    "records": [  # Alternative format for easier processing
                                        {headers[i]: (row[i] if i < len(row) else '') for i in range(len(headers))}
                                        for row in data_rows
                                    ],
                                    "source": "csv_parsed",
                                    "total_rows": len(data_rows),
                                    "total_columns": len(headers)
                                }
                                
                                logger.info(f"Successfully parsed CSV: {len(headers)} columns, {len(data_rows)} data rows")
                            else:
                                data = {"error": "Empty CSV response", "raw_csv": csv_text}
                        
                        else:
                            # Handle JSON response (normal APIs)
                            data = await response.json()
                            logger.info(f"Successfully got JSON data")
                        
                        # Apply field filtering if specified (like the agent will receive)
                        filtered_data = data
                        selected_fields = test_data.get('selectedFields', [])
                        target_fields = test_data.get('targetFields', [])
                        exclude_fields = test_data.get('excludeFields', [])
                        max_records = test_data.get('maxRecords', 10)
                        
                        if selected_fields or target_fields or exclude_fields:
                            logger.info(f"Applying field filtering: selected={len(selected_fields)}, target={len(target_fields)}, exclude={len(exclude_fields)}")
                            filtered_data = _apply_field_filtering(data, selected_fields, target_fields, exclude_fields, max_records)
                            logger.info(f"Filtered data applied - this is what your agent will receive")
                        
                        # Simple analysis without AI
                        analysis = _basic_api_analysis(filtered_data, test_data.get('changeDetectionMethod', 'array_length'))
                        
                        return {
                            "success": True,
                            "status_code": response.status,
                            "service_detected": service_name,
                            "endpoint_tested": api_endpoint,
                            "sample_data": filtered_data,  # Show filtered data
                            "raw_data": data if filtered_data != data else None,  # Include raw data if filtering was applied
                            "data_structure": analysis.get("data_structure", {}),
                            "change_detection_info": analysis.get("change_detection_info", {}),
                            "filtering_applied": selected_fields or target_fields or exclude_fields,
                            "content_type": content_type,
                            "note": "Simple analysis without AI" + (" - Field filtering applied" if (selected_fields or target_fields or exclude_fields) else "") + (" - CSV parsed" if 'csv' in content_type else "")
                        }
                        
                    except Exception as json_error:
                        logger.error(f"Failed to parse JSON response: {str(json_error)}")
                        response_text = await response.text()
                        return {
                            "success": False,
                            "error": f"Failed to parse API response as JSON: {str(json_error)}",
                            "response_preview": response_text[:200] + "..." if len(response_text) > 200 else response_text
                        }
                    
                else:
                    error_text = await response.text()
                    logger.error(f"API request failed with status {response.status}: {error_text}")
                    return {
                        "success": False,
                        "status_code": response.status,
                        "error": f"API request failed: {response.status} {response.reason}",
                        "error_details": error_text
                    }
                    
    except Exception as e:
        logger.error(f"Simple API polling test failed: {str(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return {
            "success": False,
            "error": f"Test failed: {str(e)}"
        }

@router.post("/debug/test-api-polling")
async def debug_test_api_polling(
    test_data: Dict[str, Any],
    trigger_service: TriggerService = Depends(get_trigger_service)
) -> Dict[str, Any]:
    """AI-powered API polling test and analysis with better error handling"""
    try:
        logger.info(f"Debug API polling test started with data: {test_data}")
        
        import aiohttp
        
        # Extract test parameters
        api_endpoint = test_data.get('apiEndpoint')
        auth_type = test_data.get('authType', 'none')
        api_key = test_data.get('apiKey')
        bearer_token = test_data.get('bearerToken')
        username = test_data.get('username')
        password = test_data.get('password')
        change_method = test_data.get('changeDetectionMethod', 'array_length')
        service_name = test_data.get('serviceName', 'Unknown API')
        
        logger.info(f"Testing endpoint: {api_endpoint}, service: {service_name}, auth: {auth_type}")
        
        if not api_endpoint:
            return {"success": False, "error": "API endpoint is required"}
        
        # Set up headers
        headers = {'User-Agent': 'CrewBuilder-AI-Analysis/1.0'}
        
        # Handle different authentication types
        if auth_type == 'api_key' and api_key:
            # Smart auth detection based on service
            if 'airtable' in api_endpoint.lower():
                headers['Authorization'] = f'Bearer {api_key}'
            elif 'notion' in api_endpoint.lower():
                headers['Authorization'] = f'Bearer {api_key}'
                headers['Notion-Version'] = '2022-06-28'
            elif 'github' in api_endpoint.lower():
                headers['Authorization'] = f'token {api_key}'
            elif 'slack' in api_endpoint.lower():
                headers['Authorization'] = f'Bearer {api_key}'
            else:
                # Default patterns
                headers['Authorization'] = f'Bearer {api_key}'
                headers['X-API-Key'] = api_key
                
        elif auth_type == 'bearer_token' and bearer_token:
            headers['Authorization'] = f'Bearer {bearer_token}'
            
        elif auth_type == 'basic_auth' and username and password:
            import base64
            credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
            headers['Authorization'] = f'Basic {credentials}'
        
        logger.info(f"Making request to {api_endpoint} with headers: {list(headers.keys())}")
        
        # Make the API request
        async with aiohttp.ClientSession() as session:
            async with session.get(api_endpoint, headers=headers, timeout=30) as response:
                logger.info(f"API response status: {response.status}")
                
                if response.status == 200:
                    try:
                        # Check content type to handle different response formats
                        content_type = response.headers.get('content-type', '').lower()
                        
                        if 'text/csv' in content_type or 'csv' in api_endpoint.lower():
                            # Handle CSV response (Google Sheets, etc.)
                            logger.info(f"Detected CSV response, parsing as CSV")
                            csv_text = await response.text()
                            
                            # Parse CSV into JSON-like structure
                            import csv
                            import io
                            
                            csv_reader = csv.reader(io.StringIO(csv_text))
                            rows = list(csv_reader)
                            
                            if rows:
                                headers = rows[0]  # First row as headers
                                data_rows = rows[1:]  # Remaining rows as data
                                
                                # Convert to JSON-like structure
                                data = {
                                    "values": rows,  # Google Sheets API format
                                    "headers": headers,
                                    "data_rows": data_rows,
                                    "records": [  # Alternative format for easier processing
                                        {headers[i]: (row[i] if i < len(row) else '') for i in range(len(headers))}
                                        for row in data_rows
                                    ],
                                    "source": "csv_parsed",
                                    "total_rows": len(data_rows),
                                    "total_columns": len(headers)
                                }
                                
                                logger.info(f"Successfully parsed CSV: {len(headers)} columns, {len(data_rows)} data rows")
                            else:
                                data = {"error": "Empty CSV response", "raw_csv": csv_text}
                        
                        else:
                            # Handle JSON response (normal APIs)
                            data = await response.json()
                            logger.info(f"Successfully got JSON data")
                        
                        # Apply field filtering if specified (like the agent will receive)
                        filtered_data = data
                        selected_fields = test_data.get('selectedFields', [])
                        target_fields = test_data.get('targetFields', [])
                        exclude_fields = test_data.get('excludeFields', [])
                        max_records = test_data.get('maxRecords', 10)
                        
                        if selected_fields or target_fields or exclude_fields:
                            logger.info(f"Applying field filtering: selected={len(selected_fields)}, target={len(target_fields)}, exclude={len(exclude_fields)}")
                            filtered_data = _apply_field_filtering(data, selected_fields, target_fields, exclude_fields, max_records)
                            logger.info(f"Filtered data applied - this is what your agent will receive")
                        
                        # Simple analysis without AI
                        analysis = _basic_api_analysis(filtered_data, test_data.get('changeDetectionMethod', 'array_length'))
                        
                        return {
                            "success": True,
                            "status_code": response.status,
                            "service_detected": service_name,
                            "endpoint_tested": api_endpoint,
                            "sample_data": filtered_data,  # Show filtered data
                            "raw_data": data if filtered_data != data else None,  # Include raw data if filtering was applied
                            "data_structure": analysis.get("data_structure", {}),
                            "change_detection_info": analysis.get("change_detection_info", {}),
                            "filtering_applied": selected_fields or target_fields or exclude_fields,
                            "content_type": content_type,
                            "note": "Simple analysis without AI" + (" - Field filtering applied" if (selected_fields or target_fields or exclude_fields) else "") + (" - CSV parsed" if 'csv' in content_type else "")
                        }
                        
                    except Exception as json_error:
                        logger.error(f"Failed to parse JSON response: {str(json_error)}")
                        response_text = await response.text()
                        return {
                            "success": False,
                            "error": f"Failed to parse API response as JSON: {str(json_error)}",
                            "response_preview": response_text[:200] + "..." if len(response_text) > 200 else response_text
                        }
                    
                else:
                    error_text = await response.text()
                    logger.error(f"API request failed with status {response.status}: {error_text}")
                    return {
                        "success": False,
                        "status_code": response.status,
                        "error": f"API request failed: {response.status} {response.reason}",
                        "error_details": error_text,
                        "ai_suggestion": await _ai_suggest_fix(response.status, error_text, api_endpoint)
                    }
                    
    except Exception as e:
        logger.error(f"Debug API polling test failed: {str(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return {
            "success": False,
            "error": f"Test failed: {str(e)}",
            "ai_suggestion": "Check your API endpoint URL and authentication credentials"
        }

async def _ai_analyze_api_response(
    data: Dict[str, Any], 
    service_name: str, 
    change_method: str,
    api_endpoint: str
) -> Dict[str, Any]:
    """Use AI to analyze API response and provide intelligent recommendations"""
    try:
        # Import AI integration - USE OPENAI INSTEAD OF OPENROUTER
        from backend.frameworks.openai_runner import run_openai_chat
        
        # Prepare data sample for AI (truncate large responses)
        data_sample = str(data)[:2000] + "..." if len(str(data)) > 2000 else str(data)
        
        # AI prompt for universal analysis
        prompt = f"""
You are an API integration expert. Analyze this REAL API response and provide intelligent recommendations.

SERVICE: {service_name}
ENDPOINT: {api_endpoint}
CURRENT CHANGE DETECTION: {change_method}
ACTUAL API RESPONSE: {data_sample}

Analyze the ACTUAL response structure and provide recommendations in this JSON format:
{{
    "data_structure": {{
        "type": "object|array",
        "main_data_path": "path.to.main.data",
        "item_count": number_of_items_if_array,
        "records_count": number_of_records_if_applicable,
        "key_fields": ["field1", "field2", "field3"],
        "has_timestamps": true/false,
        "timestamp_fields": ["created_at", "updated_at"],
        "keys": ["top_level_keys"]
    }},
    "change_detection_recommendations": {{
        "best_method": "array_length|field_value|timestamp|response_hash",
        "reasoning": "why this method is best for THIS specific data",
        "suggested_field_paths": ["actual.path.from.response", "another.real.path"],
        "confidence": 0.95,
        "explanation": "Clear explanation of what to monitor and why"
    }},
    "service_insights": {{
        "detected_service": "actual service name based on response structure",
        "api_type": "REST|GraphQL|webhook",
        "data_freshness": "real-time|cached|batch",
        "typical_update_frequency": "seconds|minutes|hours"
    }}
}}

IMPORTANT: 
- Base ALL recommendations on the ACTUAL response structure
- Use REAL field paths from the response
- Don't make assumptions about what the service "might" be
- Analyze the actual data patterns and structure
- Provide specific, actionable recommendations

Focus on practical recommendations for change detection monitoring based on what's actually in the response.
"""
        
        # Get AI analysis using OpenAI instead of OpenRouter
        messages = [{"role": "user", "content": prompt}]
        ai_response = await run_openai_chat(
            messages, 
            model="gpt-4",
            temperature=0.3
        )
        
        # Parse AI response
        try:
            import json
            # Extract JSON from AI response
            if "```json" in ai_response:
                json_start = ai_response.find("```json") + 7
                json_end = ai_response.find("```", json_start)
                json_str = ai_response[json_start:json_end].strip()
            elif "{" in ai_response and "}" in ai_response:
                json_start = ai_response.find("{")
                json_end = ai_response.rfind("}") + 1
                json_str = ai_response[json_start:json_end]
            else:
                raise ValueError("No JSON found in AI response")
            
            ai_analysis = json.loads(json_str)
            
            # Add basic fallback analysis only if AI analysis is incomplete
            basic_analysis = _basic_api_analysis(data, change_method)
            
            # Merge AI insights with basic analysis (AI takes priority)
            return {
                "data_structure": {
                    **basic_analysis.get("data_structure", {}),
                    **ai_analysis.get("data_structure", {})
                },
                "change_detection_info": ai_analysis.get("change_detection_recommendations", {}),
                "ai_insights": ai_analysis.get("service_insights", {}),
                "ai_raw_response": ai_response
            }
            
        except Exception as e:
            logger.warning(f"Failed to parse AI analysis: {str(e)}")
            # Only fallback to basic analysis if AI completely fails
            basic_result = _basic_api_analysis(data, change_method)
            basic_result["ai_parsing_error"] = str(e)
            return basic_result
            
    except Exception as e:
        logger.error(f"AI analysis failed: {str(e)}")
        # Only fallback to basic analysis if AI completely fails
        basic_result = _basic_api_analysis(data, change_method)
        basic_result["ai_analysis_error"] = str(e)
        return basic_result

def _basic_api_analysis(data: Dict[str, Any], change_method: str) -> Dict[str, Any]:
    """Universal API analysis without AI - works with any data structure"""
    analysis = {
        "data_structure": {},
        "change_detection_info": {},
        "sample_data": data
    }
    
    # Analyze data structure universally
    if isinstance(data, dict):
        analysis["data_structure"]["type"] = "object"
        analysis["data_structure"]["keys"] = list(data.keys())
        
        # Look for common array patterns (universal detection)
        array_fields = []
        for key, value in data.items():
            if isinstance(value, list):
                array_fields.append({
                    "field": key,
                    "count": len(value),
                    "path": key
                })
        
        if array_fields:
            # Use the largest array as the main data source
            main_array = max(array_fields, key=lambda x: x["count"])
            analysis["data_structure"]["main_data_path"] = main_array["field"]
            analysis["data_structure"]["item_count"] = main_array["count"]
            
            # If the array has objects, analyze the first one
            array_data = data[main_array["field"]]
            if array_data and isinstance(array_data[0], dict):
                first_item = array_data[0]
                analysis["data_structure"]["sample_item_fields"] = list(first_item.keys())
                
                # Look for timestamp fields
                timestamp_fields = []
                for field_name, field_value in first_item.items():
                    if any(time_indicator in field_name.lower() for time_indicator in 
                          ['time', 'date', 'created', 'updated', 'modified', 'timestamp']):
                        timestamp_fields.append(f"{main_array['field']}[0].{field_name}")
                
                if timestamp_fields:
                    analysis["data_structure"]["timestamp_fields"] = timestamp_fields
                    analysis["data_structure"]["has_timestamps"] = True
        
        # Special handling for nested data structures
        for key, value in data.items():
            if isinstance(value, dict) and len(value) > 0:
                # Check if this nested object contains arrays
                for nested_key, nested_value in value.items():
                    if isinstance(nested_value, list):
                        analysis["data_structure"][f"nested_array_{key}_{nested_key}"] = len(nested_value)
                        
    elif isinstance(data, list):
        # Direct array
        analysis["data_structure"]["type"] = "array"
        analysis["data_structure"]["item_count"] = len(data)
        analysis["data_structure"]["main_data_path"] = ""
        
        if data and isinstance(data[0], dict):
            analysis["data_structure"]["sample_item_fields"] = list(data[0].keys())
    
    # Provide universal change detection guidance
    if change_method == "array_length":
        main_path = analysis["data_structure"].get("main_data_path", "")
        item_count = analysis["data_structure"].get("item_count")
        
        if item_count is not None:
            analysis["change_detection_info"] = {
                "method": "array_length",
                "current_count": item_count,
                "explanation": f"Currently monitoring {item_count} items at path '{main_path}'. Will trigger when this number changes.",
                "field_path": main_path or "root array"
            }
        else:
            analysis["change_detection_info"] = {
                "method": "array_length",
                "error": "No array found in response. Consider using 'field_value' or 'response_hash' method instead."
            }
    
    elif change_method == "field_value":
        analysis["change_detection_info"] = {
            "method": "field_value",
            "explanation": "Monitor a specific field for changes. Suggested paths based on your data structure:",
            "suggested_paths": []
        }
        
        # Generate universal field path suggestions
        suggested_paths = []
        
        # For objects with arrays
        if analysis["data_structure"].get("main_data_path") and analysis["data_structure"].get("sample_item_fields"):
            main_path = analysis["data_structure"]["main_data_path"]
            for field in analysis["data_structure"]["sample_item_fields"][:5]:  # Limit to 5
                suggested_paths.append(f"{main_path}[0].{field}")
        
        # For direct arrays
        elif analysis["data_structure"].get("type") == "array" and analysis["data_structure"].get("sample_item_fields"):
            for field in analysis["data_structure"]["sample_item_fields"][:5]:
                suggested_paths.append(f"[0].{field}")
        
        # For simple objects
        elif analysis["data_structure"].get("keys"):
            for key in analysis["data_structure"]["keys"][:5]:
                suggested_paths.append(key)
        
        analysis["change_detection_info"]["suggested_paths"] = suggested_paths
    
    elif change_method == "timestamp":
        timestamp_fields = analysis["data_structure"].get("timestamp_fields", [])
        if timestamp_fields:
            analysis["change_detection_info"] = {
                "method": "timestamp",
                "explanation": f"Monitor timestamp fields for changes. Found {len(timestamp_fields)} potential timestamp fields.",
                "suggested_paths": timestamp_fields[:3]  # Top 3 timestamp fields
            }
        else:
            analysis["change_detection_info"] = {
                "method": "timestamp",
                "explanation": "No timestamp fields detected in the response. Consider using 'array_length' or 'field_value' method instead.",
                "suggested_paths": []
            }
    
    elif change_method == "response_hash":
        analysis["change_detection_info"] = {
            "method": "response_hash",
            "explanation": "Monitor the entire response for any changes. This is the most sensitive method but may trigger frequently.",
            "current_hash": "Will be calculated during monitoring"
        }
    
    return analysis

async def _ai_suggest_fix(status_code: int, error_text: str, api_endpoint: str) -> str:
    """Use AI to suggest fixes for API errors"""
    try:
        from backend.frameworks.openai_runner import run_openai_chat
        
        prompt = f"""
API request failed. Suggest a fix:

STATUS CODE: {status_code}
ERROR: {error_text}
ENDPOINT: {api_endpoint}

Provide a brief, actionable suggestion to fix this API issue.
"""
        
        messages = [{"role": "user", "content": prompt}]
        suggestion = await run_openai_chat(
            messages, 
            model="gpt-3.5-turbo",
            temperature=0.3
        )
        
        return suggestion[:200] + "..." if len(suggestion) > 200 else suggestion
        
    except Exception:
        # Fallback suggestions
        if status_code == 401:
            return "Authentication failed. Check your API key or credentials."
        elif status_code == 403:
            return "Access forbidden. Verify your API permissions."
        elif status_code == 404:
            return "Endpoint not found. Check your API URL."
        elif status_code == 429:
            return "Rate limited. Try reducing polling frequency."
        else:
            return "API request failed. Check endpoint URL and authentication."

@router.post("/debug/test-scheduling/{trigger_id}")
async def debug_test_scheduling(
    trigger_id: str,
    trigger_service: TriggerService = Depends(get_trigger_service)
) -> Dict[str, Any]:
    """Debug endpoint to test trigger scheduling manually"""
    try:
        # Get the trigger
        trigger_flow = await trigger_service.get_trigger_flow(trigger_id)
        if not trigger_flow:
            return {"success": False, "error": f"Trigger {trigger_id} not found"}
        
        # Find the trigger node
        trigger_nodes = [n for n in trigger_flow.get('nodes', []) if n.get('id') == trigger_id]
        if not trigger_nodes:
            return {"success": False, "error": f"No trigger node found for {trigger_id}"}
        
        trigger_data = trigger_nodes[0].get('data', {})
        trigger_type = trigger_data.get('triggerType', 'unknown')
        
        # Test the scheduling setup
        try:
            await trigger_service._setup_schedule(trigger_id, trigger_data)
            return {
                "success": True,
                "message": f"Successfully set up scheduling for {trigger_type} trigger {trigger_id}",
                "trigger_data": trigger_data
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to set up scheduling: {str(e)}",
                "trigger_data": trigger_data
            }
            
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/data-approval/{trigger_id}")
async def handle_data_approval(
    trigger_id: str,
    approval_data: Dict[str, Any],
    trigger_service: TriggerService = Depends(get_trigger_service)
) -> Dict[str, Any]:
    """Handle user approval of detected data changes before sending to agent"""
    try:
        approved_data = approval_data.get("approved_data", [])
        selected_fields = approval_data.get("selected_fields", [])
        
        if not approved_data:
            return {
                "success": False,
                "message": "No data approved for processing"
            }
        
        # Get the trigger flow
        flow = await trigger_service.get_trigger_flow(trigger_id)
        if not flow:
            return {
                "success": False,
                "message": f"Trigger {trigger_id} not found"
            }
        
        # Filter the approved data to only include selected fields
        filtered_data = []
        for item in approved_data:
            if isinstance(item, dict) and selected_fields:
                filtered_item = {}
                for field_path in selected_fields:
                    # Extract field value using dot notation
                    value = _get_nested_value(item, field_path)
                    if value is not None:
                        _set_nested_value(filtered_item, field_path, value)
                if filtered_item:
                    filtered_data.append(filtered_item)
            else:
                filtered_data.append(item)
        
        # Add the approved data to the flow context
        flow["approved_data"] = filtered_data
        flow["user_selected_fields"] = selected_fields
        flow["approval_timestamp"] = datetime.now().isoformat()
        
        # Execute the workflow with the approved data
        return StreamingResponse(
            run_crew(flow),
            media_type="text/event-stream",
            headers={
                "X-Execution-ID": f"approved_{trigger_id}_{datetime.now().timestamp()}",
                "X-Trigger-ID": trigger_id,
                "X-Data-Source": "user_approved"
            }
        )
        
    except Exception as e:
        logger.error(f"Error in data approval for {trigger_id}: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def _get_nested_value(data: dict, path: str):
    """Get nested value from dictionary using dot notation"""
    try:
        keys = path.split('.')
        value = data
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            elif isinstance(value, list) and key.isdigit():
                value = value[int(key)]
            elif isinstance(value, list) and key.startswith('[') and key.endswith(']'):
                index = int(key[1:-1])
                value = value[index] if 0 <= index < len(value) else None
            else:
                return None
        return value
    except:
        return None

def _set_nested_value(data: dict, path: str, value):
    """Set nested value in dictionary using dot notation"""
    try:
        keys = path.split('.')
        current = data
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        current[keys[-1]] = value
    except:
        pass

def _apply_field_filtering(data: Any, selected_fields: List[str], target_fields: List[str], exclude_fields: List[str], max_records: int = 10) -> Any:
    """Apply field filtering to API data to show what the agent will actually receive"""
    try:
        if not (selected_fields or target_fields or exclude_fields):
            return data
        
        def filter_record(record: dict) -> dict:
            """Filter a single record based on field selections"""
            if not isinstance(record, dict):
                return record
            
            filtered_record = {}
            
            # If we have selected fields (from field discovery), use those
            if selected_fields:
                for field_path in selected_fields:
                    value = _get_nested_value(record, field_path)
                    if value is not None:
                        _set_nested_value(filtered_record, field_path, value)
            
            # If we have target fields (manual include), use those
            elif target_fields:
                for field_path in target_fields:
                    value = _get_nested_value(record, field_path)
                    if value is not None:
                        _set_nested_value(filtered_record, field_path, value)
            
            # Otherwise start with all fields and exclude specified ones
            else:
                filtered_record = record.copy()
                for field_path in exclude_fields:
                    _remove_nested_field(filtered_record, field_path)
            
            return filtered_record
        
        # Apply filtering based on data structure
        if isinstance(data, list):
            # Direct array - filter each item and limit records
            filtered_items = [filter_record(item) for item in data[:max_records]]
            return filtered_items
            
        elif isinstance(data, dict):
            # Check for CSV parsed data first
            if data.get('source') == 'csv_parsed' and 'records' in data:
                # CSV format with records array
                filtered_data = data.copy()
                filtered_records = [filter_record(record) for record in data['records'][:max_records]]
                filtered_data['records'] = filtered_records
                # Update metadata
                filtered_data['total_rows'] = len(filtered_records)
                return filtered_data
            
            # Check for common API response patterns
            elif 'pairs' in data and isinstance(data['pairs'], list):
                # DexScreener format
                filtered_data = data.copy()
                filtered_pairs = [filter_record(pair) for pair in data['pairs'][:max_records]]
                filtered_data['pairs'] = filtered_pairs
                return filtered_data
                
            elif 'records' in data and isinstance(data['records'], list):
                # Airtable format
                filtered_data = data.copy()
                filtered_records = [filter_record(record) for record in data['records'][:max_records]]
                filtered_data['records'] = filtered_records
                return filtered_data
                
            elif 'data' in data and isinstance(data['data'], list):
                # Generic data wrapper
                filtered_data = data.copy()
                filtered_items = [filter_record(item) for item in data['data'][:max_records]]
                filtered_data['data'] = filtered_items
                return filtered_data
                
            else:
                # Single object
                return filter_record(data)
        
        return data
        
    except Exception as e:
        logger.error(f"Error applying field filtering: {str(e)}")
        return data

def _remove_nested_field(data: dict, path: str):
    """Remove field from nested dictionary using dot notation"""
    try:
        keys = path.split('.')
        current = data
        
        for key in keys[:-1]:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return
        
        if isinstance(current, dict) and keys[-1] in current:
            del current[keys[-1]]
    except:
        pass 