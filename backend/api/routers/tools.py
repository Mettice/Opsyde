from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, Any, Optional
from pydantic import BaseModel
import logging

from backend.frameworks.universal_api_runner import UniversalAPIRunner
from backend.frameworks.shared_api_research import research_for_tool, research_for_output
from backend.utils.security import get_current_user, security_manager
from backend.utils.logging import get_logger

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
                    from backend.services.user_settings_service import user_settings_service
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
            user_id=current_user.get('user_id') if current_user else "anonymous"
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
                from backend.services.user_settings_service import user_settings_service
                
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
        from backend.frameworks.shared_api_research import research_for_output
        
        result = await research_for_output(
            service_name=request.service_name,
            description=request.description,
            endpoint_hint=request.endpoint_hint,
            user_id=current_user.get('user_id') if current_user else "anonymous"
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
                from backend.services.user_settings_service import user_settings_service
                
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
        from backend.frameworks.shared_api_research import research_for_output
        
        # Build email-specific description
        email_description = f"Email formatting and delivery for: {request.description}"
        
        result = await research_for_output(
            service_name="Email Service",
            description=email_description,
            endpoint_hint=request.endpoint_hint,
            user_id=current_user.get('user_id') if current_user else "anonymous"
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