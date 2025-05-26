from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional
from pydantic import BaseModel
import logging

from backend.frameworks.universal_api_runner import UniversalAPIRunner
from backend.frameworks.shared_api_research import research_for_tool, research_for_output
from backend.utils.security import get_current_user
from backend.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["tools"])

class APIResearchRequest(BaseModel):
    service_name: str
    description: str
    endpoint_hint: Optional[str] = None

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
    current_user: Dict = Depends(get_current_user)
):
    """Enhanced API research supporting all protocols"""
    try:
        logger.info(f"API research request for {request.service_name} by user {current_user.get('user_id')}")
        
        user_keys = await _get_user_api_keys(current_user.get('user_id'))
        
        # Use shared research
        research_result = await research_for_tool(
            service_name=request.service_name,
            description=request.description,
            endpoint_hint=request.endpoint_hint,
            user_keys=user_keys
        )
        
        logger.info(f"API research completed for {request.service_name}: {research_result.get('success')}")
        
        return APIResearchResponse(**research_result)
        
    except Exception as e:
        logger.error(f"API research failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"API research failed: {str(e)}")

@router.post("/research-output-api", response_model=APIResearchResponse)
async def research_output_api(
    request: APIResearchRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Research API for output integrations"""
    try:
        from backend.frameworks.shared_api_research import research_for_output
        
        # Get user's API keys for enhanced research
        user_keys = await _get_user_api_keys(current_user.get("id"))
        
        result = await research_for_output(
            service_name=request.service_name,
            description=request.description,
            endpoint_hint=request.endpoint_hint,
            user_keys=user_keys
        )
        
        return APIResearchResponse(**result)
        
    except Exception as e:
        logger.error(f"Output API research failed: {str(e)}")
        return APIResearchResponse(
            success=False,
            error=str(e),
            suggestions=["Try providing more specific service details", "Check if the service has public API documentation"]
        )

@router.post("/research-email-format", response_model=APIResearchResponse)
async def research_email_format(
    request: APIResearchRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Research email formatting and configuration for smart email outputs"""
    try:
        from backend.frameworks.ai_integration_runner import AIIntegrationRunner
        
        ai_runner = AIIntegrationRunner()
        
        # Build email-specific research prompt
        email_config = {
            "description": request.description,
            "email_style": getattr(request, 'email_style', 'professional'),
            "output_type": "smart_email",
            "service_type": "email"
        }
        
        # Generate email format plan
        result = await ai_runner._generate_integration_plan_with_user_key(
            output_type="smart_email",
            ai_config=email_config,
            data={"sample": "workflow data"},
            llm_config={
                "provider": "openai",
                "model": "gpt-4",
                "key": "demo-key"  # You'll need to get user's actual key
            }
        )
        
        if result.get("success"):
            plan = result.get("plan", {})
            return APIResearchResponse(
                success=True,
                service_name="Email",
                api_type="SMTP/Email Service",
                base_url="email://smart-formatting",
                auth_type="smtp_credentials",
                primary_method="SEND",
                endpoints=[
                    {
                        "name": "send_formatted_email",
                        "description": "Send AI-formatted email",
                        "method": "POST"
                    }
                ],
                default_headers={"Content-Type": "text/html"},
                sample_input={
                    "recipient": "user@example.com",
                    "subject": plan.get("subject_template", "AI-Generated Report"),
                    "style": email_config.get("email_style", "professional"),
                    "data": "workflow_results"
                },
                confidence=0.95,
                protocol="email",
                protocol_config={
                    "email_format": plan.get("email_format", "html"),
                    "template_style": plan.get("template_style", "professional"),
                    "include_attachments": plan.get("include_attachments", False)
                }
            )
        else:
            return APIResearchResponse(
                success=False,
                error="Failed to generate email format plan",
                suggestions=[
                    "Try being more specific about the email style",
                    "Specify the type of data to include in the email",
                    "Mention any branding or formatting requirements"
                ]
            )
            
    except Exception as e:
        logger.error(f"Email format research failed: {str(e)}")
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

async def _get_user_api_keys(user_id: str) -> Dict[str, str]:
    """Get user's API keys for research (implement based on your user settings)"""
    try:
        # If you have user settings service implemented:
        # from backend.services.user_settings_service import user_settings_service
        # settings = await user_settings_service.get_user_settings(int(user_id))
        # return {
        #     "openai_key": await user_settings_service.get_api_key(int(user_id), "openai"),
        #     "anthropic_key": await user_settings_service.get_api_key(int(user_id), "anthropic"),
        # }
        
        # For now, fallback to environment variables
        import os
        return {
            "openai_key": os.getenv("OPENAI_API_KEY"),
            "anthropic_key": os.getenv("ANTHROPIC_API_KEY"),
            "openrouter_key": os.getenv("OPENROUTER_API_KEY")
        }
    except Exception as e:
        logger.warning(f"Could not get user API keys: {str(e)}")
        return {}