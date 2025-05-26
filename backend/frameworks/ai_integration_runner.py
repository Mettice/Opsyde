# backend/frameworks/ai_integration_runner.py - NEW FILE
import logging
from typing import Dict, Any, Optional
import json
import aiohttp
from datetime import datetime
from backend.framework_registry import run_framework_tool
from backend.frameworks.shared_api_research import research_for_output

logger = logging.getLogger(__name__)

class AIIntegrationRunner:
    """Enhanced to use shared research"""
    
    async def run_smart_output(
        self,
        output_type: str,
        ai_config: Dict[str, Any],
        data: Any,
        context: Dict[str, Any],
        user_keys: Dict[str, str]
    ) -> Dict[str, Any]:
        """Enhanced smart output with shared research"""
        
        # If no existing research, perform it
        if not ai_config.get('api_research_result'):
            service_name = self._extract_service_name(ai_config.get('description', ''))
            
            research_result = await research_for_output(
                service_name=service_name,
                description=ai_config.get('description', ''),
                endpoint_hint=ai_config.get('manual_endpoint'),
                user_keys=user_keys
            )
            
            if research_result.get('success'):
                ai_config['api_research_result'] = research_result
            else:
                return research_result
        
        # Execute with research results
        return await self._execute_integration_plan(
            ai_config['api_research_result'], 
            data, 
            user_keys
        )
    
    def _extract_service_name(self, description: str) -> str:
        """Extract service name from description"""
        # Simple extraction logic - can be enhanced
        common_services = ['hubspot', 'slack', 'notion', 'discord', 'airtable', 'linear', 'webflow']
        description_lower = description.lower()
        
        for service in common_services:
            if service in description_lower:
                return service
        
        # Try to extract from common patterns
        words = description_lower.split()
        for word in words:
            if len(word) > 3 and word.endswith('api'):
                return word.replace('api', '')
        
        return 'unknown_service'
    
    def _select_best_llm(self, user_keys: Dict[str, str], ai_config: Dict[str, Any]) -> Optional[Dict]:
        """Select best available LLM based on user's keys and task"""
        
        # Priority order (most capable first)
        llm_priority = [
            {"provider": "openai", "model": "gpt-4", "key": user_keys.get("openai_key")},
            {"provider": "anthropic", "model": "claude-3-sonnet", "key": user_keys.get("anthropic_key")},
            {"provider": "openrouter", "model": "openai/gpt-4", "key": user_keys.get("openrouter_key")},
        ]
        
        # Return first available
        for llm in llm_priority:
            if llm["key"]:
                return llm
                
        return None
    
    async def _generate_integration_plan(
        self,
        output_type: str,
        ai_config: Dict[str, Any],
        data: Any
    ) -> Dict[str, Any]:
        """Use AI to generate integration plan"""
        try:
            # Build AI prompt
            prompt = self._build_integration_prompt(output_type, ai_config, data)
            
            # Call your existing LLM
            from backend.frameworks.openrouter_runner import run_openrouter_chat
            
            messages = [{"role": "user", "content": prompt}]
            ai_response = await run_openrouter_chat(
                messages, 
                model="gpt-4",
                temperature=0.3  # Lower temperature for more consistent results
            )
            
            # Parse AI response into structured plan
            plan = self._parse_ai_response(ai_response)
            
            return {
                "success": True,
                "plan": plan,
                "ai_reasoning": ai_response
            }
            
        except Exception as e:
            logger.error(f"AI plan generation failed: {str(e)}")
            return {
                "success": False,
                "error": f"AI planning failed: {str(e)}"
            }
    
    def _build_integration_prompt(
        self,
        output_type: str,
        ai_config: Dict[str, Any],
        data: Any
    ) -> str:
        """Build prompt for AI integration planning"""
        
        description = ai_config.get("description", "")
        service_type = ai_config.get("service_type", "")
        
        # Sample data (truncated for token efficiency)
        sample_data = str(data)[:500] + "..." if len(str(data)) > 500 else str(data)
        
        prompt = f"""
You are an API integration expert. Generate a structured integration plan for this request:

REQUEST: {description}
SERVICE TYPE: {service_type}
OUTPUT TYPE: {output_type}
SAMPLE DATA: {sample_data}

Generate a JSON response with this exact structure:
{{
    "service_name": "detected service name",
    "integration_type": "api|webhook|database|email",
    "endpoint": "API endpoint URL",
    "method": "HTTP method",
    "headers": {{"header": "value"}},
    "auth_type": "none|bearer|api_key|basic",
    "data_mapping": {{
        "field1": "path.to.data.field1",
        "field2": "path.to.data.field2"
    }},
    "request_format": "json|form|query",
    "confidence": 0.95
}}

Examples:
- "Send to HubSpot CRM" → detect HubSpot API, map contact fields
- "Update Notion page" → detect Notion API, format content
- "Post to Slack channel" → detect Slack webhook, format message

Be specific about endpoints and data mapping. Return only valid JSON.
        """
        
        return prompt
    
    def _parse_ai_response(self, ai_response: str) -> Dict[str, Any]:
        """Parse AI response into structured integration plan"""
        try:
            # Try to extract JSON from response
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
            
            plan = json.loads(json_str)
            
            # Validate required fields
            required_fields = ["service_name", "integration_type", "confidence"]
            for field in required_fields:
                if field not in plan:
                    raise ValueError(f"Missing required field: {field}")
            
            return plan
            
        except Exception as e:
            logger.error(f"Failed to parse AI response: {str(e)}")
            raise ValueError(f"Could not parse AI integration plan: {str(e)}")
    
    async def _execute_integration_plan(self, plan: Dict, data: Any, user_keys: Dict) -> Dict:
        """Execute integration using user's service keys"""
        
        service_name = plan.get("service_name", "").lower()
        
        # Use user's service-specific keys
        if "hubspot" in service_name and user_keys.get("hubspot_key"):
            return await self._execute_hubspot_integration(plan, data, user_keys["hubspot_key"])
        elif "slack" in service_name and user_keys.get("slack_webhook"):
            return await self._execute_slack_integration(plan, data, user_keys["slack_webhook"])
        elif "notion" in service_name and user_keys.get("notion_token"):
            return await self._execute_notion_integration(plan, data, user_keys["notion_token"])
        else:
            # Generic API integration
            try:
                # Build a basic framework config from the AI-generated plan
                framework_config = {
                    "prompt": json.dumps(plan, indent=2),
                    "framework": "langchain",
                    "temperature": 0.3,
                    "model": "gpt-4"
                }

                result = run_framework_tool("langchain", framework_config, data)

                return {
                    "success": True,
                    "result": result,
                    "service_detected": plan.get("service_name", "unknown")
                }

            except Exception as e:
                return {
                    "success": False,
                    "error": f"Fallback via LangChain failed: {str(e)}"
                }
    
    async def _execute_api_integration(
        self,
        plan: Dict[str, Any],
        data: Any
    ) -> Dict[str, Any]:
        """Execute API integration"""
        try:
            endpoint = plan.get("endpoint")
            method = plan.get("method", "POST").upper()
            headers = plan.get("headers", {})
            
            # Map data according to AI plan
            mapped_data = self._map_data(data, plan.get("data_mapping", {}))
            
            # Make API request
            async with aiohttp.ClientSession() as session:
                async with session.request(
                    method=method,
                    url=endpoint,
                    headers=headers,
                    json=mapped_data,
                    timeout=30
                ) as response:
                    
                    result = {
                        "success": response.status < 400,
                        "status_code": response.status,
                        "service_detected": plan.get("service_name"),
                        "endpoint_used": endpoint,
                        "summary": f"Successfully sent data to {plan.get('service_name')}" if response.status < 400 else f"Failed to send data to {plan.get('service_name')}"
                    }
                    
                    if response.status >= 400:
                        error_text = await response.text()
                        result["error"] = f"API error {response.status}: {error_text}"
                    
                    return result
                    
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "service_detected": plan.get("service_name")
            }
    
    async def _execute_webhook_integration(
        self,
        plan: Dict[str, Any],
        data: Any
    ) -> Dict[str, Any]:
        """Execute webhook integration"""
        # Use your existing webhook infrastructure
        from backend.frameworks.webhook_runner import post_to_webhook
        
        try:
            endpoint = plan.get("endpoint")
            mapped_data = self._map_data(data, plan.get("data_mapping", {}))
            
            result = await post_to_webhook(endpoint, mapped_data)
            
            return {
                "success": True,
                "service_detected": plan.get("service_name"),
                "summary": f"Successfully sent webhook to {plan.get('service_name')}",
                "data": result
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "service_detected": plan.get("service_name")
            }
    
    async def _execute_email_integration(
        self,
        plan: Dict[str, Any],
        data: Any
    ) -> Dict[str, Any]:
        """Execute smart email integration"""
        # Use your existing email infrastructure
        from backend.frameworks.email_notifier import send_email
        
        try:
            # AI should provide email details in the plan
            recipient = plan.get("recipient") or plan.get("email")
            subject = plan.get("subject", "AI-Generated Report")
            
            # Format email body using data mapping
            mapped_data = self._map_data(data, plan.get("data_mapping", {}))
            body = self._format_email_body(mapped_data, plan)
            
            result = await send_email(recipient, subject, body)
            
            return {
                "success": result.get("success", False),
                "service_detected": "Email",
                "summary": f"Successfully sent email to {recipient}" if result.get("success") else "Failed to send email",
                "data": result
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "service_detected": "Email"
            }
    
    def _map_data(self, source_data: Any, mapping: Dict[str, str]) -> Dict[str, Any]:
        """Map source data to target format using AI-provided mapping"""
        if not mapping:
            return source_data if isinstance(source_data, dict) else {"data": source_data}
        
        result = {}
        
        for target_field, source_path in mapping.items():
            try:
                # Simple path traversal (e.g., "result.summary")
                value = source_data
                for part in source_path.split('.'):
                    if isinstance(value, dict) and part in value:
                        value = value[part]
                    elif isinstance(value, list) and part.isdigit():
                        value = value[int(part)]
                    else:
                        value = None
                        break
                if value is not None:
                    result[target_field] = value
            except Exception as e:
                logger.warning(f"Failed to map field {target_field}: {str(e)}")
                continue
        return result
   
    def _format_email_body(self, data: Dict[str, Any], plan: Dict[str, Any]) -> str:
        """Format email body from mapped data"""
        try:
            # Try to use AI-suggested format from plan
            email_template = plan.get("email_template")
            if email_template:
                return email_template.format(**data)
            
            # Default formatting
            if isinstance(data, dict):
                formatted_lines = []
                for key, value in data.items():
                    formatted_lines.append(f"{key.replace('_', ' ').title()}: {value}")
                return "\n".join(formatted_lines)
            else:
                return str(data)
            
        except Exception as e:
            logger.warning(f"Email formatting failed: {str(e)}")
            return json.dumps(data, indent=2) if isinstance(data, dict) else str(data)

    async def _generate_integration_plan_with_user_key(
        self,
        output_type: str,
        ai_config: Dict[str, Any],
        data: Any,
        llm_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate integration plan using user's LLM key"""
        try:
            # Build AI prompt
            prompt = self._build_integration_prompt(output_type, ai_config, data)
            
            # Use user's LLM configuration
            if llm_config["provider"] == "openai":
                from backend.frameworks.openai_runner import run_openai_chat
                messages = [{"role": "user", "content": prompt}]
                ai_response = await run_openai_chat(
                    messages, 
                    model=llm_config["model"],
                    api_key=llm_config["key"],
                    temperature=0.3
                )
            elif llm_config["provider"] == "anthropic":
                from backend.frameworks.anthropic_runner import run_anthropic_chat
                ai_response = await run_anthropic_chat(
                    prompt,
                    model=llm_config["model"],
                    api_key=llm_config["key"],
                    temperature=0.3
                )
            else:
                # Fallback to OpenRouter
                from backend.frameworks.openrouter_runner import run_openrouter_chat
                messages = [{"role": "user", "content": prompt}]
                ai_response = await run_openrouter_chat(
                    messages, 
                    model=llm_config["model"],
                    api_key=llm_config["key"],
                    temperature=0.3
                )
            
            # Parse AI response into structured plan
            plan = self._parse_ai_response(ai_response)
            
            return {
                "success": True,
                "plan": plan,
                "ai_reasoning": ai_response
            }
            
        except Exception as e:
            logger.error(f"AI plan generation with user key failed: {str(e)}")
            return {
                "success": False,
                "error": f"AI planning failed: {str(e)}"
            }

    async def _execute_hubspot_integration(self, plan: Dict, data: Any, api_key: str) -> Dict:
        """Execute HubSpot integration with user's API key"""
        # Implementation for HubSpot integration
        return {"success": False, "error": "HubSpot integration not implemented"}
    
    async def _execute_slack_integration(self, plan: Dict, data: Any, webhook_url: str) -> Dict:
        """Execute Slack integration with user's webhook"""
        # Implementation for Slack integration
        return {"success": False, "error": "Slack integration not implemented"}
    
    async def _execute_notion_integration(self, plan: Dict, data: Any, token: str) -> Dict:
        """Execute Notion integration with user's token"""
        # Implementation for Notion integration
        return {"success": False, "error": "Notion integration not implemented"}