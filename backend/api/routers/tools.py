from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, Any, Optional
from pydantic import BaseModel
import logging
import sys
import os

# Fix imports to use relative paths
from frameworks.universal_api_runner import UniversalAPIRunner
from frameworks.shared_api_research import research_for_tool, research_for_output
from utils.security import get_current_user, security_manager
from utils.logging import get_logger
# Import HuggingFace functions directly
try:
    # Try relative import first (when running from backend directory)
    from frameworks.huggingface_utils import (
        get_frontend_task_config, 
        validate_task_input,
        get_task_info_enhanced,
        get_models_for_task_enhanced
    )
    HF_IMPORT_SUCCESS = True
except ImportError:
    try:
        # Try absolute import (when sys.path includes root directory)
        from backend.frameworks.huggingface_utils import (
            get_frontend_task_config, 
            validate_task_input,
            get_task_info_enhanced,
            get_models_for_task_enhanced
        )
        HF_IMPORT_SUCCESS = True
    except ImportError as e:
        print(f"Warning: Could not import HuggingFace utils: {e}")
        HF_IMPORT_SUCCESS = False

# Import LangChain functions
try:
    from frameworks.langchain_runner import (
        get_available_tools,
        get_execution_modes, 
        get_langchain_capabilities,
        LANGCHAIN_AVAILABLE
    )
    LANGCHAIN_IMPORT_SUCCESS = True
except ImportError as e:
    print(f"Warning: Could not import LangChain utils: {e}")
    LANGCHAIN_IMPORT_SUCCESS = False

# Import LlamaIndex functions
try:
    from frameworks.llamaindex_runner import (
        get_llamaindex_capabilities,
        LLAMAINDEX_FEATURES,
        LLAMAINDEX_AVAILABLE
    )
    LLAMAINDEX_IMPORT_SUCCESS = True
except ImportError as e:
    print(f"Warning: Could not import LlamaIndex utils: {e}")
    LLAMAINDEX_IMPORT_SUCCESS = False

# Import AutoGen functions
try:
    from frameworks.autogen_runner import (
        get_autogen_capabilities,
        get_agent_templates,
        get_conversation_templates,
        AUTOGEN_FEATURES,
        AUTOGEN_AVAILABLE
    )
    AUTOGEN_IMPORT_SUCCESS = True
except ImportError as e:
    print(f"Warning: Could not import AutoGen utils: {e}")
    AUTOGEN_IMPORT_SUCCESS = False

# Import CrewAI functions
try:
    from frameworks.crewai_runner import (
        get_crewai_capabilities,
        CREWAI_AVAILABLE
    )
    CREWAI_IMPORT_SUCCESS = True
except ImportError as e:
    print(f"Warning: Could not import CrewAI utils: {e}")
    CREWAI_IMPORT_SUCCESS = False

logger = get_logger(__name__)
router = APIRouter(tags=["tools"])

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

class APIResearchRequest(BaseModel):
    service_name: str
    description: str
    endpoint_hint: Optional[str] = None
    selected_llm: Optional[Dict[str, str]] = None

class APIResearchResponse(BaseModel):
    success: bool
    service_name: Optional[str] = None
    api_type: Optional[str] = None
    base_url: Optional[str] = None
    auth_type: Optional[str] = None
    primary_method: Optional[str] = None
    endpoints: Optional[list] = None
    default_headers: Optional[dict] = None
    sample_input: Optional[dict] = None
    confidence: Optional[float] = None
    error: Optional[str] = None
    suggestions: Optional[list] = None
    protocol: Optional[str] = None
    protocol_config: Optional[dict] = None

@router.post("/research-api", response_model=APIResearchResponse)
async def research_api(
    request: APIResearchRequest,
    current_user: Optional[Dict] = Depends(get_current_user_optional)
):
    """Enhanced API research supporting all protocols with BYOK LLM selection"""
    try:
        # Debug logging
        logger.info(f"Research API called for {request.service_name}")
        logger.info(f"Selected LLM: {request.selected_llm}")
        logger.info(f"Current user: {current_user.get('user_id') if current_user else 'anonymous'}")
        
        # Prepare user keys based on selected LLM
        user_keys = {}
        if request.selected_llm:
            # Get the selected provider
            provider = request.selected_llm.get('provider')
            
            if provider:
                # Get the actual API key from BYOK system
                try:
                    # Use actual user ID if authenticated, otherwise anonymous
                    user_id = current_user.get('user_id') if current_user else "anonymous"
                    
                    # Get user's execution keys from BYOK system
                    from services.user_settings_service import user_settings_service
                    execution_keys = await user_settings_service.get_user_keys_for_execution(user_id)
                    
                    # Map provider to the expected key format
                    if provider == 'openai' and 'openai' in execution_keys:
                        user_keys['openai_key'] = execution_keys['openai']
                        logger.info(f"Using OpenAI key from BYOK system")
                    elif provider == 'anthropic' and 'anthropic' in execution_keys:
                        user_keys['anthropic_key'] = execution_keys['anthropic']
                        logger.info(f"Using Anthropic key from BYOK system")
                    elif provider == 'openrouter' and 'openrouter' in execution_keys:
                        user_keys['openrouter_key'] = execution_keys['openrouter']
                        logger.info(f"Using OpenRouter key from BYOK system")
                    else:
                        logger.warning(f"No {provider} key found in BYOK system for user {user_id}")
                        
                except Exception as byok_error:
                    logger.error(f"Failed to get keys from BYOK system: {str(byok_error)}")
                    # Fallback to environment variables
                    logger.info("Falling back to environment variables")
                    user_keys = await _get_user_api_keys('anonymous')
            else:
                logger.warning("Selected LLM missing provider")
        else:
            # Fallback to environment variables if no LLM selected
            logger.info("No LLM selected, falling back to environment variables")
            user_keys = await _get_user_api_keys('anonymous')
        
        logger.info(f"User keys available: {list(user_keys.keys()) if user_keys else 'None'}")
        
        # Use shared research
        research_result = await research_for_tool(
            service_name=request.service_name,
            description=request.description,
            endpoint_hint=request.endpoint_hint,
            user_keys=user_keys,
            selected_llm=request.selected_llm
        )
        
        logger.info(f"API research completed for {request.service_name}: {research_result.get('success')}")
        
        return APIResearchResponse(**research_result)
        
    except Exception as e:
        logger.error(f"API research failed: {str(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"API research failed: {str(e)}")

@router.post("/research-output-api", response_model=APIResearchResponse)
async def research_output_api(
    request: APIResearchRequest,
    current_user: Optional[Dict] = Depends(get_current_user_optional)
):
    """Research API for output integrations - Enhanced with BYOK support"""
    try:
        logger.info(f"Output API research request: {request.service_name} - {request.description}")
        logger.info(f"Current user: {current_user.get('user_id') if current_user else 'anonymous'}")
        
        # Handle LLM selection and user keys
        user_keys = {}
        
        if request.selected_llm and request.selected_llm.get('provider'):
            try:
                # Get user's API keys from BYOK system
                from services.user_settings_service import user_settings_service
                
                # Use actual user ID if authenticated, otherwise anonymous
                user_id = current_user.get('user_id') if current_user else "anonymous"
                
                # Get user execution keys based on selected LLM provider
                user_execution_keys = await user_settings_service.get_user_keys_for_execution(user_id)
                
                # Map the provider to the correct key format
                provider = request.selected_llm.get('provider')
                if provider in user_execution_keys:
                    user_keys[f"{provider}_key"] = user_execution_keys[provider]
                    logger.info(f"Using user's {provider} key from BYOK system")
                else:
                    logger.warning(f"No {provider} key found in BYOK system for user {user_id}")
                        
            except Exception as byok_error:
                logger.error(f"Failed to get keys from BYOK system: {str(byok_error)}")
                # Fallback to environment variables
                logger.info("Falling back to environment variables")
                user_keys = await _get_user_api_keys('anonymous')
        else:
            # Fallback to environment variables if no LLM selected
            logger.info("No LLM selected, falling back to environment variables")
            user_keys = await _get_user_api_keys('anonymous')
        
        logger.info(f"User keys available: {list(user_keys.keys()) if user_keys else 'None'}")
        
        # Use shared research for output
        from frameworks.shared_api_research import research_for_output
        
        result = await research_for_output(
            service_name=request.service_name,
            description=request.description,
            endpoint_hint=request.endpoint_hint,
            user_id=current_user.get('user_id') if current_user else "anonymous",
            selected_llm=request.selected_llm
        )
        
        logger.info(f"Output API research completed for {request.service_name}: {result.get('success')}")
        
        return APIResearchResponse(**result)
        
    except Exception as e:
        logger.error(f"Output API research failed: {str(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return APIResearchResponse(
            success=False,
            error=str(e),
            suggestions=["Try providing more specific service details", "Check if the service has public API documentation"]
        )

@router.post("/research-email-format", response_model=APIResearchResponse)
async def research_email_format(
    request: APIResearchRequest,
    current_user: Optional[Dict] = Depends(get_current_user_optional)
):
    """Research email formatting and configuration for smart email outputs - Enhanced with BYOK support"""
    try:
        logger.info(f"Email format research request: {request.service_name} - {request.description}")
        logger.info(f"Current user: {current_user.get('user_id') if current_user else 'anonymous'}")
        
        # Handle LLM selection and user keys
        user_keys = {}
        
        if request.selected_llm and request.selected_llm.get('provider'):
            try:
                # Get user's API keys from BYOK system
                from services.user_settings_service import user_settings_service
                
                # Use actual user ID if authenticated, otherwise anonymous
                user_id = current_user.get('user_id') if current_user else "anonymous"
                
                # Get user execution keys based on selected LLM provider
                user_execution_keys = await user_settings_service.get_user_keys_for_execution(user_id)
                
                # Map the provider to the correct key format
                provider = request.selected_llm.get('provider')
                if provider in user_execution_keys:
                    user_keys[f"{provider}_key"] = user_execution_keys[provider]
                    logger.info(f"Using user's {provider} key from BYOK system for email research")
                else:
                    logger.warning(f"No {provider} key found in BYOK system for user {user_id}")
                        
            except Exception as byok_error:
                logger.error(f"Failed to get keys from BYOK system: {str(byok_error)}")
                # Fallback to environment variables
                logger.info("Falling back to environment variables")
                user_keys = await _get_user_api_keys('anonymous')
        else:
            # Fallback to environment variables if no LLM selected
            logger.info("No LLM selected, falling back to environment variables")
            user_keys = await _get_user_api_keys('anonymous')
        
        # Use shared research for email formatting
        from frameworks.shared_api_research import research_for_output
        
        # Build email-specific description
        email_description = f"Email formatting and delivery for: {request.description}"
        
        result = await research_for_output(
            service_name="Email Service",
            description=email_description,
            endpoint_hint=request.endpoint_hint,
            user_id=current_user.get('user_id') if current_user else "anonymous",
            selected_llm=request.selected_llm
        )
        
        # Enhance result for email-specific use case
        if result.get('success'):
            result.update({
                "service_name": "Email",
                "api_type": "SMTP/Email Service",
                "base_url": "email://smart-formatting",
                "auth_type": "smtp_credentials",
                "primary_method": "SEND",
                "protocol": "email",
                "protocol_config": {
                    "email_format": "html",
                    "template_style": "professional",
                    "include_attachments": False
                }
            })
        
        logger.info(f"Email format research completed: {result.get('success')}")
        
        return APIResearchResponse(**result)
            
    except Exception as e:
        logger.error(f"Email format research failed: {str(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return APIResearchResponse(
            success=False,
            error=str(e),
            suggestions=[
                "Try using a simpler email description",
                "Check if email configuration is properly set up"
            ]
        )

@router.post("/test-universal-api")
async def test_universal_api(
    config: Dict[str, Any],
    test_data: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    """Test a universal API configuration"""
    try:
        runner = UniversalAPIRunner()
        
        # Execute test
        result = await runner.run_universal_api_tool(config, test_data)
        
        return {
            "success": result.get("success", False),
            "result": result,
            "timestamp": result.get("metadata", {}).get("timestamp")
        }
        
    except Exception as e:
        logger.error(f"Universal API test failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Test failed: {str(e)}"
        )

@router.get("/api-examples/{service_name}")
async def get_api_examples(service_name: str):
    """Get example configurations for popular APIs"""
    
    examples = {
        "linear": {
            "description": "Create issues in Linear project management",
            "sample_requests": [
                {
                    "action": "create_issue",
                    "data": {
                        "title": "Bug: Login not working",
                        "description": "Users cannot log in",
                        "priority": 1,
                        "teamId": "TEAM_ID"
                    }
                }
            ],
            "endpoints": ["https://api.linear.app/graphql"]
        },
        "notion": {
            "description": "Create and update Notion pages",
            "sample_requests": [
                {
                    "action": "create_page",
                    "data": {
                        "title": "New Project",
                        "content": "Project details here",
                        "parent_page_id": "PAGE_ID"
                    }
                }
            ],
            "endpoints": ["https://api.notion.com/v1"]
        },
        "airtable": {
            "description": "Add records to Airtable base",
            "sample_requests": [
                {
                    "action": "create_record",
                    "data": {
                        "fields": {
                            "Name": "John Doe",
                            "Email": "john@example.com",
                            "Status": "Active"
                        }
                    }
                }
            ],
            "endpoints": ["https://api.airtable.com/v0"]
        },
        "github": {
            "description": "Create issues and manage repositories",
            "sample_requests": [
                {
                    "action": "create_issue",
                    "data": {
                        "title": "Bug report",
                        "body": "Description of the bug",
                        "labels": ["bug", "priority-high"]
                    }
                }
            ],
            "endpoints": ["https://api.github.com"]
        }
    }
    
    return examples.get(service_name.lower(), {
        "description": f"Custom integration for {service_name}",
        "sample_requests": [{"action": "api_call", "data": {}}],
        "endpoints": [f"https://api.{service_name.lower()}.com"]
    })

@router.get("/test")
async def test_endpoint():
    """Simple test endpoint to verify backend connectivity"""
    return {
        "status": "success",
        "message": "Backend is working!",
        "timestamp": "2024-01-01T00:00:00Z"
    }

@router.get("/huggingface/debug")
async def debug_huggingface_imports():
    """Debug HuggingFace imports step by step AND return full task configuration"""
    try:
        result = {"status": "debugging", "steps": []}
        
        # Step 1: Check import success flag
        result["steps"].append(f"Import success flag: {HF_IMPORT_SUCCESS}")
        
        if HF_IMPORT_SUCCESS:
            # Step 2: Try to call the function
            try:
                result["steps"].append("Attempting to call get_frontend_task_config...")
                config = get_frontend_task_config()
                result["steps"].append(f"Function call successful - got {len(config.get('tasks', []))} tasks")
                result["status"] = "success"
                
                # CRITICAL FIX: Safely serialize data by filtering out non-serializable objects
                def make_serializable(obj):
                    """Recursively make an object JSON serializable"""
                    if obj is None:
                        return None
                    elif isinstance(obj, (str, int, float, bool)):
                        return obj
                    elif isinstance(obj, (list, tuple)):
                        return [make_serializable(item) for item in obj]
                    elif isinstance(obj, dict):
                        return {k: make_serializable(v) for k, v in obj.items() 
                               if not callable(v) and not k.startswith('_')}
                    elif callable(obj):
                        return f"<function {getattr(obj, '__name__', 'unknown')}>"
                    else:
                        try:
                            # Try to convert to string if it's not a basic type
                            return str(obj)
                        except:
                            return f"<non-serializable {type(obj).__name__}>"
                
                # Safely serialize the config
                safe_config = make_serializable(config)
                
                # Return safe, serializable configuration for frontend use
                result["success"] = True
                result["tasks"] = safe_config.get("tasks", [])
                result["categories"] = safe_config.get("categories", {})
                result["task_formats"] = safe_config.get("task_formats", {})
                result["verified_models"] = safe_config.get("verified_models", {})
                result["examples"] = safe_config.get("examples", {})
                result["message"] = "HuggingFace configuration retrieved successfully"
                
            except Exception as func_error:
                result["steps"].append(f"Function call failed: {str(func_error)}")
                result["status"] = "function_error"
                result["error"] = str(func_error)
                # Add fallback empty data
                result["success"] = False
                result["tasks"] = []
                result["categories"] = {}
                result["task_formats"] = {}
                result["verified_models"] = {}
                result["examples"] = {}
        else:
            result["steps"].append("Import failed - using mock config")
            result["status"] = "import_failed"
            # Add fallback empty data
            result["success"] = False
            result["tasks"] = []
            result["categories"] = {}
            result["task_formats"] = {}
            result["verified_models"] = {}
            result["examples"] = {}
        
        return result
        
    except Exception as e:
        return {
            "status": "debug_error",
            "error": str(e),
            "type": type(e).__name__,
            # Add fallback empty data
            "success": False,
            "tasks": [],
            "categories": {},
            "task_formats": {},
            "verified_models": {},
            "examples": {}
        }

@router.get("/huggingface/tasks")
async def get_huggingface_tasks():
    """Get HuggingFace task configuration for frontend"""
    try:
        logger.info("Starting HuggingFace tasks endpoint...")
        
        if HF_IMPORT_SUCCESS:
            try:
                logger.info("Calling get_frontend_task_config()...")
                config = get_frontend_task_config()
                logger.info(f"Config received: {type(config)}, keys: {list(config.keys()) if isinstance(config, dict) else 'not a dict'}")
                
                # Safely serialize data by filtering out non-serializable objects
                def make_serializable(obj):
                    """Recursively make an object JSON serializable"""
                    if obj is None:
                        return None
                    elif isinstance(obj, (str, int, float, bool)):
                        return obj
                    elif isinstance(obj, (list, tuple)):
                        return [make_serializable(item) for item in obj]
                    elif isinstance(obj, dict):
                        return {k: make_serializable(v) for k, v in obj.items() 
                               if not callable(v) and not k.startswith('_')}
                    elif callable(obj):
                        return f"<function {getattr(obj, '__name__', 'unknown')}>"
                    else:
                        try:
                            # Try to convert to string if it's not a basic type
                            return str(obj)
                        except:
                            return f"<non-serializable {type(obj).__name__}>"
                
                # Safely serialize the config
                safe_config = make_serializable(config)
                
                # Safely extract data with explicit type checking
                tasks = safe_config.get("tasks", []) if isinstance(safe_config, dict) else []
                categories = safe_config.get("categories", {}) if isinstance(safe_config, dict) else {}
                task_formats = safe_config.get("task_formats", {}) if isinstance(safe_config, dict) else {}
                verified_models = safe_config.get("verified_models", {}) if isinstance(safe_config, dict) else {}
                examples = safe_config.get("examples", {}) if isinstance(safe_config, dict) else {}
                
                logger.info(f"Extracted data - tasks: {len(tasks)}, categories: {len(categories)}")
                
                # Return in the format the frontend expects
                response = {
                    "success": True,
                    "tasks": tasks,
                    "categories": categories,
                    "task_formats": task_formats,
                    "verified_models": verified_models,
                    "examples": examples,
                    "message": "HuggingFace task configuration retrieved successfully"
                }
                
                logger.info(f"Returning response with {len(tasks)} tasks")
                return response
                
            except Exception as func_error:
                logger.error(f"Function call failed: {str(func_error)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                
                return {
                    "success": False,
                    "error": f"Function call failed: {str(func_error)}",
                    "message": "Failed to get HuggingFace task configuration",
                    "tasks": []
                }
        else:
            logger.warning("HuggingFace imports failed")
            return {
                "success": False,
                "error": "HuggingFace imports failed",
                "message": "HuggingFace configuration not available",
                "tasks": []
            }
            
    except Exception as e:
        logger.error(f"Unexpected error in HuggingFace tasks endpoint: {str(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        
        return {
            "success": False,
            "error": str(e),
            "message": "Unexpected error occurred",
            "tasks": []
        }

@router.get("/huggingface/tasks/{task}")
async def get_huggingface_task_info(task: str):
    """Get detailed information about a specific HuggingFace task"""
    try:
        logger.info(f"Getting info for HuggingFace task: {task}")
        
        task_info = get_task_info_enhanced(task)
        
        return {
            "success": True,
            "data": task_info,
            "message": f"Task information for {task} retrieved successfully"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get task info for {task}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get task information: {str(e)}"
        )

@router.get("/huggingface/models/{task}")
async def get_huggingface_models(task: str):
    """Get available models for a specific HuggingFace task"""
    try:
        logger.info(f"Getting models for HuggingFace task: {task}")
        
        models = get_models_for_task_enhanced(task)
        
        return {
            "success": True,
            "models": models,
            "task": task,
            "message": f"Models for {task} retrieved successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to get models for {task}: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "models": {},
            "task": task,
            "message": f"Failed to get models for {task}"
        }

class HuggingFaceTaskValidationRequest(BaseModel):
    task: str
    inputs: Dict[str, Any]

@router.post("/huggingface/validate")
async def validate_huggingface_inputs(request: HuggingFaceTaskValidationRequest):
    """Validate inputs for a specific HuggingFace task"""
    try:
        logger.info(f"Validating inputs for HuggingFace task: {request.task}")
        
        result = validate_task_input(request.task, request.inputs)
        
        return {
            "success": True,
            "data": result,
            "message": "Input validation completed"
        }
        
    except Exception as e:
        logger.error(f"Failed to validate inputs for {request.task}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Input validation failed: {str(e)}"
        )

async def _get_user_api_keys(user_id: str) -> Dict[str, str]:
    """Get user API keys from environment variables or user settings"""
    import os
    
    # For now, return environment variables
    # In the future, this could be enhanced to get user-specific keys
    return {
        'openai_key': os.getenv('OPENAI_API_KEY'),
        'anthropic_key': os.getenv('ANTHROPIC_API_KEY'),
        'openrouter_key': os.getenv('OPENROUTER_API_KEY'),
        'huggingface_key': os.getenv('HUGGINGFACE_API_KEY'),
        'groq_key': os.getenv('GROQ_API_KEY')
    }

@router.get("/huggingface/test")
async def test_huggingface_path():
    """Debug endpoint to test HuggingFace module path resolution"""
    try:
        logger.info("Testing HuggingFace module path resolution...")
        
        # Test basic imports
        if HF_IMPORT_SUCCESS:
            logger.info("✅ HuggingFace utils imported successfully")
            
            # Test function availability
            test_config = get_frontend_task_config()
            if test_config:
                logger.info("✅ get_frontend_task_config() working")
                return {
                    "status": "success",
                    "imports": "✅ All imports successful",
                    "functions": "✅ All functions accessible",
                    "test_config_keys": list(test_config.keys())
                }
            else:
                logger.warning("⚠️ get_frontend_task_config() returned None")
                return {
                    "status": "partial",
                    "imports": "✅ Imports successful",
                    "functions": "⚠️ Some functions not working",
                    "issue": "get_frontend_task_config() returned None"
                }
        else:
            logger.error("❌ HuggingFace utils import failed")
            return {
                "status": "error",
                "imports": "❌ Import failed",
                "functions": "❌ Functions not available"
            }
        
    except Exception as e:
        logger.error(f"HuggingFace path test failed: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "type": type(e).__name__
        }

# 🦜 LANGCHAIN ENDPOINTS
@router.get("/langchain/capabilities")
async def get_langchain_capabilities_endpoint():
    """Get LangChain capabilities for frontend configuration"""
    try:
        if not LANGCHAIN_IMPORT_SUCCESS:
            return {
                "available": False,
                "error": "LangChain not available",
                "tools": {},
                "execution_modes": {},
                "supported_providers": [],
                "features": {}
            }
        
        logger.info("Getting LangChain capabilities...")
        capabilities = get_langchain_capabilities()
        logger.info(f"✅ LangChain capabilities retrieved: {len(capabilities.get('tools', {}))} tools")
        
        return capabilities
        
    except Exception as e:
        logger.error(f"Failed to get LangChain capabilities: {str(e)}")
        return {
            "available": False,
            "error": str(e),
            "tools": {},
            "execution_modes": {},
            "supported_providers": [],
            "features": {}
        }

@router.get("/langchain/tools")
async def get_langchain_tools():
    """Get available LangChain tools"""
    try:
        if not LANGCHAIN_IMPORT_SUCCESS:
            raise HTTPException(status_code=503, detail="LangChain not available")
        
        logger.info("Getting LangChain tools...")
        tools = get_available_tools()
        
        # Format for frontend
        formatted_tools = []
        for tool_id, tool_info in tools.items():
            formatted_tools.append({
                "id": tool_id,
                "name": tool_info["name"],
                "description": tool_info["description"],
                "category": tool_info["category"],
                "requires_api": tool_info["requires_api"]
            })
        
        logger.info(f"✅ Found {len(formatted_tools)} LangChain tools")
        
        return {
            "success": True,
            "tools": formatted_tools,
            "count": len(formatted_tools)
        }
        
    except Exception as e:
        logger.error(f"Failed to get LangChain tools: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get tools: {str(e)}")

@router.get("/langchain/execution-modes")
async def get_langchain_execution_modes():
    """Get available LangChain execution modes"""
    try:
        if not LANGCHAIN_IMPORT_SUCCESS:
            raise HTTPException(status_code=503, detail="LangChain not available")
        
        logger.info("Getting LangChain execution modes...")
        modes = get_execution_modes()
        
        # Format for frontend
        formatted_modes = []
        for mode_id, description in modes.items():
            formatted_modes.append({
                "id": mode_id,
                "name": mode_id.replace('_', ' ').title(),
                "description": description
            })
        
        logger.info(f"✅ Found {len(formatted_modes)} execution modes")
        
        return {
            "success": True,
            "execution_modes": formatted_modes,
            "count": len(formatted_modes)
        }
        
    except Exception as e:
        logger.error(f"Failed to get execution modes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get execution modes: {str(e)}")

@router.get("/langchain/test")
async def test_langchain_integration():
    """Test LangChain integration and capabilities"""
    try:
        logger.info("Testing LangChain integration...")
        
        test_results = {
            "import_success": LANGCHAIN_IMPORT_SUCCESS,
            "langchain_available": False,
            "tools_count": 0,
            "execution_modes_count": 0,
            "supported_providers": [],
            "features": {}
        }
        
        if LANGCHAIN_IMPORT_SUCCESS:
            try:
                # Test capabilities
                capabilities = get_langchain_capabilities()
                test_results.update({
                    "langchain_available": capabilities.get("available", False),
                    "tools_count": len(capabilities.get("tools", {})),
                    "execution_modes_count": len(capabilities.get("execution_modes", {})),
                    "supported_providers": capabilities.get("supported_providers", []),
                    "features": capabilities.get("features", {})
                })
                
                # Test tools
                tools = get_available_tools()
                test_results["tools_available"] = list(tools.keys())
                
                # Test execution modes
                modes = get_execution_modes()
                test_results["execution_modes_available"] = list(modes.keys())
                
                logger.info("✅ LangChain integration test passed")
                test_results["status"] = "success"
                
            except Exception as e:
                logger.error(f"LangChain functions failed: {str(e)}")
                test_results.update({
                    "status": "partial",
                    "function_error": str(e)
                })
        else:
            test_results["status"] = "import_failed"
            
        return test_results
        
    except Exception as e:
        logger.error(f"LangChain integration test failed: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "import_success": LANGCHAIN_IMPORT_SUCCESS
        }

# 📚 LLAMAINDEX ENDPOINTS
@router.get("/llamaindex/capabilities")
async def get_llamaindex_capabilities_endpoint():
    """Get LlamaIndex capabilities for frontend configuration"""
    try:
        if not LLAMAINDEX_IMPORT_SUCCESS:
            return {
                "available": False,
                "error": "LlamaIndex not available",
                "features": {},
                "supported_providers": [],
                "index_types": [],
                "document_sources": [],
                "query_modes": [],
                "vector_stores": []
            }
        
        logger.info("Getting LlamaIndex capabilities...")
        capabilities = get_llamaindex_capabilities()
        logger.info(f"✅ LlamaIndex capabilities retrieved")
        
        return capabilities
        
    except Exception as e:
        logger.error(f"Failed to get LlamaIndex capabilities: {str(e)}")
        return {
            "available": False,
            "error": str(e),
            "features": {},
            "supported_providers": [],
            "index_types": [],
            "document_sources": [],
            "query_modes": [],
            "vector_stores": []
        }

@router.get("/llamaindex/index-types")
async def get_llamaindex_index_types():
    """Get available LlamaIndex index types"""
    try:
        if not LLAMAINDEX_IMPORT_SUCCESS:
            raise HTTPException(status_code=503, detail="LlamaIndex not available")
        
        logger.info("Getting LlamaIndex index types...")
        index_types = LLAMAINDEX_FEATURES.get("index_types", [])
        
        # Format for frontend
        formatted_types = []
        descriptions = {
            "vector": "Vector embeddings for semantic search",
            "list": "Simple list index for small documents", 
            "tree": "Hierarchical tree structure for complex documents",
            "keyword": "Keyword-based search index",
            "knowledge_graph": "Graph-based knowledge representation"
        }
        
        for index_type in index_types:
            formatted_types.append({
                "id": index_type,
                "name": index_type.replace('_', ' ').title(),
                "description": descriptions.get(index_type, f"{index_type} index")
            })
        
        logger.info(f"✅ Found {len(formatted_types)} index types")
        
        return {
            "success": True,
            "index_types": formatted_types,
            "count": len(formatted_types)
        }
        
    except Exception as e:
        logger.error(f"Failed to get index types: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get index types: {str(e)}")

@router.get("/llamaindex/document-sources")
async def get_llamaindex_document_sources():
    """Get available LlamaIndex document sources"""
    try:
        if not LLAMAINDEX_IMPORT_SUCCESS:
            raise HTTPException(status_code=503, detail="LlamaIndex not available")
        
        logger.info("Getting LlamaIndex document sources...")
        sources = LLAMAINDEX_FEATURES.get("document_sources", [])
        
        # Format for frontend
        formatted_sources = []
        descriptions = {
            "text": "Direct text input from user",
            "url": "Load content from web URLs",
            "file": "Upload and process files (PDF, TXT, etc.)",
            "database": "Connect to database sources",
            "api": "Fetch content from external APIs"
        }
        
        for source in sources:
            formatted_sources.append({
                "id": source,
                "name": source.replace('_', ' ').title(),
                "description": descriptions.get(source, f"{source} source")
            })
        
        logger.info(f"✅ Found {len(formatted_sources)} document sources")
        
        return {
            "success": True,
            "document_sources": formatted_sources,
            "count": len(formatted_sources)
        }
        
    except Exception as e:
        logger.error(f"Failed to get document sources: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get document sources: {str(e)}")

@router.get("/llamaindex/test")
async def test_llamaindex_integration():
    """Test LlamaIndex integration and capabilities"""
    try:
        logger.info("Testing LlamaIndex integration...")
        
        test_results = {
            "import_success": LLAMAINDEX_IMPORT_SUCCESS,
            "llamaindex_available": False,
            "features": {},
            "supported_providers": [],
            "index_types": [],
            "document_sources": [],
            "query_modes": [],
            "vector_stores": []
        }
        
        if LLAMAINDEX_IMPORT_SUCCESS:
            try:
                # Test capabilities
                capabilities = get_llamaindex_capabilities()
                test_results.update({
                    "llamaindex_available": capabilities.get("available", False),
                    "features": capabilities.get("features", {}),
                    "supported_providers": capabilities.get("supported_providers", []),
                    "index_types": capabilities.get("index_types", []),
                    "document_sources": capabilities.get("document_sources", []),
                    "query_modes": capabilities.get("query_modes", []),
                    "vector_stores": capabilities.get("vector_stores", [])
                })
                
                logger.info("✅ LlamaIndex integration test passed")
                test_results["status"] = "success"
                
            except Exception as e:
                logger.error(f"LlamaIndex functions failed: {str(e)}")
                test_results.update({
                    "status": "partial",
                    "function_error": str(e)
                })
        else:
            test_results["status"] = "import_failed"
            
        return test_results
        
    except Exception as e:
        logger.error(f"LlamaIndex integration test failed: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "import_success": LLAMAINDEX_IMPORT_SUCCESS
        }

# 🤝 AUTOGEN ENDPOINTS
@router.get("/autogen/capabilities")
async def get_autogen_capabilities_endpoint():
    """Get AutoGen capabilities for frontend configuration"""
    try:
        if not AUTOGEN_IMPORT_SUCCESS:
            return {
                "available": False,
                "error": "AutoGen not available",
                "version": "not_installed",
                "features": {},
                "supported_providers": [],
                "agent_types": [],
                "conversation_modes": [],
                "code_execution": [],
                "human_input_modes": [],
                "termination_criteria": []
            }
        
        logger.info("Getting AutoGen capabilities...")
        capabilities = get_autogen_capabilities()
        logger.info(f"✅ AutoGen capabilities retrieved")
        
        return capabilities
        
    except Exception as e:
        logger.error(f"Failed to get AutoGen capabilities: {str(e)}")
        return {
            "available": False,
            "error": str(e),
            "version": "error",
            "features": {},
            "supported_providers": [],
            "agent_types": [],
            "conversation_modes": [],
            "code_execution": [],
            "human_input_modes": [],
            "termination_criteria": []
        }

@router.get("/autogen/agent-templates")
async def get_autogen_agent_templates():
    """Get predefined AutoGen agent templates"""
    try:
        if not AUTOGEN_IMPORT_SUCCESS:
            raise HTTPException(status_code=503, detail="AutoGen not available")
        
        logger.info("Getting AutoGen agent templates...")
        templates = get_agent_templates()
        
        # Format for frontend
        formatted_templates = []
        for template_id, template_config in templates.items():
            formatted_templates.append({
                "id": template_id,
                "name": template_config.get("name", template_id.title()),
                "agentType": template_config.get("agentType"),
                "systemMessage": template_config.get("systemMessage"),
                "description": template_config.get("description"),
                "codeExecution": template_config.get("codeExecution", False),
                "humanInputMode": template_config.get("humanInputMode", "NEVER")
            })
        
        logger.info(f"✅ Found {len(formatted_templates)} agent templates")
        
        return {
            "success": True,
            "agent_templates": formatted_templates,
            "count": len(formatted_templates)
        }
        
    except Exception as e:
        logger.error(f"Failed to get agent templates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get agent templates: {str(e)}")

@router.get("/autogen/conversation-templates")
async def get_autogen_conversation_templates():
    """Get predefined AutoGen conversation templates"""
    try:
        if not AUTOGEN_IMPORT_SUCCESS:
            raise HTTPException(status_code=503, detail="AutoGen not available")
        
        logger.info("Getting AutoGen conversation templates...")
        templates = get_conversation_templates()
        
        # Format for frontend
        formatted_templates = []
        for template_id, template_config in templates.items():
            formatted_templates.append({
                "id": template_id,
                "name": template_id.replace('_', ' ').title(),
                "conversationMode": template_config.get("conversationMode"),
                "maxTurns": template_config.get("maxTurns"),
                "description": template_config.get("description"),
                "agents": template_config.get("agents", [])
            })
        
        logger.info(f"✅ Found {len(formatted_templates)} conversation templates")
        
        return {
            "success": True,
            "conversation_templates": formatted_templates,
            "count": len(formatted_templates)
        }
        
    except Exception as e:
        logger.error(f"Failed to get conversation templates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get conversation templates: {str(e)}")

@router.get("/autogen/test")
async def test_autogen_integration():
    """Test AutoGen integration and capabilities"""
    try:
        logger.info("Testing AutoGen integration...")
        
        test_results = {
            "import_success": AUTOGEN_IMPORT_SUCCESS,
            "autogen_available": False,
            "version": "unknown",
            "features": {},
            "supported_providers": [],
            "agent_types": [],
            "conversation_modes": [],
            "templates_count": {
                "agents": 0,
                "conversations": 0
            }
        }
        
        if AUTOGEN_IMPORT_SUCCESS:
            try:
                # Test capabilities
                capabilities = get_autogen_capabilities()
                test_results.update({
                    "autogen_available": capabilities.get("available", False),
                    "version": capabilities.get("version", "unknown"),
                    "features": capabilities.get("features", {}),
                    "supported_providers": capabilities.get("supported_providers", []),
                    "agent_types": capabilities.get("agent_types", []),
                    "conversation_modes": capabilities.get("conversation_modes", [])
                })
                
                # Test templates
                agent_templates = get_agent_templates()
                conversation_templates = get_conversation_templates()
                
                test_results["templates_count"] = {
                    "agents": len(agent_templates),
                    "conversations": len(conversation_templates)
                }
                
                test_results["agent_templates_available"] = list(agent_templates.keys())
                test_results["conversation_templates_available"] = list(conversation_templates.keys())
                
                logger.info("✅ AutoGen integration test passed")
                test_results["status"] = "success"
                
            except Exception as e:
                logger.error(f"AutoGen functions failed: {str(e)}")
                test_results.update({
                    "status": "partial",
                    "function_error": str(e)
                })
        else:
            test_results["status"] = "import_failed"
            
        return test_results
        
    except Exception as e:
        logger.error(f"AutoGen integration test failed: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "import_success": AUTOGEN_IMPORT_SUCCESS
        }

# 🚀 ADVANCED MULTI-FRAMEWORK ENDPOINT
@router.get("/frameworks/all-capabilities")
async def get_all_framework_capabilities():
    """Get capabilities for all available frameworks"""
    try:
        logger.info("Getting all framework capabilities...")
        
        all_capabilities = {
            "timestamp": datetime.now().isoformat(),
            "frameworks": {}
        }
        
        # HuggingFace
        if HF_IMPORT_SUCCESS:
            try:
                hf_config = get_frontend_task_config()
                all_capabilities["frameworks"]["huggingface"] = {
                    "available": True,
                    "tasks": hf_config.get("tasks", []),
                    "categories": hf_config.get("categories", {}),
                    "verified_models": len(hf_config.get("verified_models", {})),
                    "examples": len(hf_config.get("examples", {}))
                }
            except Exception as e:
                all_capabilities["frameworks"]["huggingface"] = {
                    "available": False,
                    "error": str(e)
                }
        else:
            all_capabilities["frameworks"]["huggingface"] = {
                "available": False,
                "error": "Import failed"
            }
        
        # LangChain
        if LANGCHAIN_IMPORT_SUCCESS:
            try:
                lc_capabilities = get_langchain_capabilities()
                all_capabilities["frameworks"]["langchain"] = lc_capabilities
            except Exception as e:
                all_capabilities["frameworks"]["langchain"] = {
                    "available": False,
                    "error": str(e)
                }
        else:
            all_capabilities["frameworks"]["langchain"] = {
                "available": False,
                "error": "Import failed"
            }
        
        # LlamaIndex
        if LLAMAINDEX_IMPORT_SUCCESS:
            try:
                li_capabilities = get_llamaindex_capabilities()
                all_capabilities["frameworks"]["llamaindex"] = li_capabilities
            except Exception as e:
                all_capabilities["frameworks"]["llamaindex"] = {
                    "available": False,
                    "error": str(e)
                }
        else:
            all_capabilities["frameworks"]["llamaindex"] = {
                "available": False,
                "error": "Import failed"
            }
        
        # AutoGen
        if AUTOGEN_IMPORT_SUCCESS:
            try:
                ag_capabilities = get_autogen_capabilities()
                all_capabilities["frameworks"]["autogen"] = ag_capabilities
            except Exception as e:
                all_capabilities["frameworks"]["autogen"] = {
                    "available": False,
                    "error": str(e)
                }
        else:
            all_capabilities["frameworks"]["autogen"] = {
                "available": False,
                "error": "Import failed"
            }
        
        # CrewAI
        if CREWAI_IMPORT_SUCCESS:
            try:
                crewai_capabilities = get_crewai_capabilities()
                all_capabilities["frameworks"]["crewai"] = crewai_capabilities
            except Exception as e:
                all_capabilities["frameworks"]["crewai"] = {
                    "available": False,
                    "error": str(e)
                }
        else:
            all_capabilities["frameworks"]["crewai"] = {
                "available": False,
                "error": "Import failed"
            }
        
        # Summary
        available_frameworks = [
            name for name, config in all_capabilities["frameworks"].items() 
            if config.get("available", False)
        ]
        
        all_capabilities["summary"] = {
            "total_frameworks": len(all_capabilities["frameworks"]),
            "available_frameworks": len(available_frameworks),
            "framework_names": available_frameworks,
            "import_status": {
                "huggingface": HF_IMPORT_SUCCESS,
                "langchain": LANGCHAIN_IMPORT_SUCCESS,
                "llamaindex": LLAMAINDEX_IMPORT_SUCCESS,
                "autogen": AUTOGEN_IMPORT_SUCCESS,
                "crewai": CREWAI_IMPORT_SUCCESS
            }
        }
        
        logger.info(f"✅ All framework capabilities retrieved: {len(available_frameworks)}/{len(all_capabilities['frameworks'])} available")
        
        return all_capabilities
        
    except Exception as e:
        logger.error(f"Failed to get all framework capabilities: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get framework capabilities: {str(e)}")

# Add missing import for datetime
from datetime import datetime

@router.get("/debug/byok-keys")
async def debug_byok_keys(
    current_user: Optional[Dict] = Depends(get_current_user_optional)
):
    """Debug endpoint to test BYOK key retrieval and LLM selection"""
    try:
        user_id = current_user.get('user_id') if current_user else "anonymous"
        
        # Get user keys from BYOK system
        from services.user_settings_service import user_settings_service
        execution_keys = await user_settings_service.get_user_keys_for_execution(user_id)
        
        # Test LLM selection
        from frameworks.shared_api_research import shared_api_research
        llm_config = await shared_api_research._select_best_llm(user_id, {})
        
        return {
            "success": True,
            "user_id": user_id,
            "execution_keys": {
                "available_providers": list(execution_keys.keys()),
                "key_count": len(execution_keys)
            },
            "llm_selection": {
                "selected_provider": llm_config.get("provider") if llm_config else None,
                "selected_model": llm_config.get("model") if llm_config else None,
                "has_key": bool(llm_config)
            },
            "debug_info": {
                "user_settings_service_type": "unified",
                "timestamp": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"BYOK debug failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "user_id": current_user.get('user_id') if current_user else "anonymous"
        }