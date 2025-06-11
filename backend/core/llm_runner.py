"""
LLM Runner - Core execution engine for LLM-centric architecture
Centralizes all LLM interactions and provides unified interface
"""

import logging
import asyncio
from typing import Dict, Any, Optional, List, Union
from datetime import datetime
import json

from services.user_settings_service import user_settings_service
from utils.logging import get_logger

logger = get_logger(__name__)

class LLMRunner:
    """
    Core LLM execution engine that centralizes all AI interactions
    Handles prompt formatting, model switching, token budgeting, and streaming
    """
    
    def __init__(self):
        self.execution_cache = {}
        self.token_usage = {}
        
    async def execute_llm_task(
        self,
        task_type: str,
        input_data: Dict[str, Any],
        context: Dict[str, Any] = None,
        user_id: str = None,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        Main LLM execution method - handles all types of tasks
        
        Args:
            task_type: Type of task (reasoning, transformation, routing, etc.)
            input_data: Input data including text, files, context
            context: Execution context with memory and previous outputs
            user_id: User ID for API key resolution
            stream: Whether to stream the response
            
        Returns:
            Structured LLM response with metadata
        """
        try:
            start_time = datetime.now()
            
            # 1. Get user's preferred LLM configuration
            llm_config = await self._get_user_llm_config(user_id)
            
            # 2. Build task-specific prompt
            prompt = await self._build_prompt(task_type, input_data, context)
            
            # 3. Execute LLM call
            if stream:
                return await self._execute_streaming(llm_config, prompt, input_data)
            else:
                return await self._execute_standard(llm_config, prompt, input_data, start_time)
                
        except Exception as e:
            logger.error(f"❌ LLM execution failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "task_type": task_type,
                "timestamp": datetime.now().isoformat()
            }
    
    async def _get_user_llm_config(self, user_id: str) -> Dict[str, Any]:
        """Get user's LLM configuration with API keys"""
        try:
            # Get user's execution keys
            user_keys = await user_settings_service.get_user_keys_for_execution(user_id or "anonymous")
            
            # Default to OpenAI GPT-4 if available, otherwise best available
            if user_keys.get('openai'):
                return {
                    'provider': 'openai',
                    'model': 'gpt-4',
                    'api_key': user_keys['openai'],
                    'temperature': 0.7,
                    'max_tokens': 4000
                }
            elif user_keys.get('anthropic'):
                return {
                    'provider': 'anthropic',
                    'model': 'claude-3-sonnet-20240229',
                    'api_key': user_keys['anthropic'],
                    'temperature': 0.7,
                    'max_tokens': 4000
                }
            elif user_keys.get('openrouter'):
                return {
                    'provider': 'openrouter',
                    'model': 'openai/gpt-4',
                    'api_key': user_keys['openrouter'],
                    'temperature': 0.7,
                    'max_tokens': 4000
                }
            else:
                # Fallback to environment variables
                import os
                openai_key = os.getenv('OPENAI_API_KEY')
                if openai_key:
                    return {
                        'provider': 'openai',
                        'model': 'gpt-4',
                        'api_key': openai_key,
                        'temperature': 0.7,
                        'max_tokens': 4000
                    }
                else:
                    raise ValueError("No LLM provider available")
                    
        except Exception as e:
            logger.error(f"Failed to get LLM config: {str(e)}")
            raise
    
    async def _build_prompt(
        self,
        task_type: str,
        input_data: Dict[str, Any],
        context: Dict[str, Any] = None
    ) -> str:
        """Build task-specific prompts for different operations"""
        
        # Base context
        base_context = ""
        if context and context.get('variables'):
            base_context = f"Context Variables:\n{json.dumps(context['variables'], indent=2)}\n\n"
        
        # Task-specific prompt templates
        prompt_templates = {
            "input_processing": {
                "system": "You are an intelligent input processor. Analyze the input and extract structured data.",
                "task": f"""
{base_context}Process this input and return structured JSON with:
1. content_type: The type of content (text, data, query, etc.)
2. main_content: The primary content/message
3. extracted_data: Any structured data found
4. intent: What the user wants to accomplish
5. routing_suggestion: Which type of node/tool should handle this next

Input: {input_data.get('input', input_data)}

Return ONLY valid JSON, no additional text.
"""
            },
            
            "agent_reasoning": {
                "system": "You are an intelligent agent. Process the task and provide reasoned output.",
                "task": f"""
{base_context}Task: {input_data.get('task', input_data.get('input', ''))}

Agent Configuration:
- Role: {input_data.get('role', 'Assistant')}
- Goal: {input_data.get('goal', 'Help the user')}
- Context: {input_data.get('backstory', '')}

Provide your response as JSON with:
1. reasoning: Your step-by-step thinking
2. output: Your final answer/result
3. confidence: Confidence level (0-1)
4. next_actions: Suggested next steps
"""
            },
            
            "task_execution": {
                "system": "You are a task executor. Process the task and return results.",
                "task": f"""
{base_context}Execute this task:
Description: {input_data.get('description', '')}
Expected Output: {input_data.get('expected_output', 'Complete the task')}
Input Data: {input_data.get('input_data', input_data)}

Return JSON with:
1. task_completed: boolean
2. result: The task output
3. status: success/partial/failed
4. summary: Brief summary of what was done
"""
            },
            
            "tool_routing": {
                "system": "You are a tool router. Determine what tool/API to use and format the request.",
                "task": f"""
{base_context}Route this request to the appropriate tool:
Request: {input_data.get('request', input_data)}
Available Tools: {input_data.get('available_tools', [])}

Return JSON with:
1. recommended_tool: Tool name or 'api'
2. formatted_request: Data formatted for the tool
3. reasoning: Why this tool was chosen
4. confidence: Confidence in the routing decision
"""
            },
            
            "output_formatting": {
                "system": "You are an output formatter. Format data for the specified output destination.",
                "task": f"""
{base_context}Format this data for output:
Data: {input_data.get('data', input_data)}
Output Type: {input_data.get('output_type', 'display')}
Template: {input_data.get('template', '')}

Return JSON with:
1. formatted_output: Data formatted for the destination
2. metadata: Any metadata about the formatting
3. ready_to_send: boolean indicating if it's ready
"""
            }
        }
        
        template = prompt_templates.get(task_type, prompt_templates["input_processing"])
        
        return f"System: {template['system']}\n\nUser: {template['task']}"
    
    async def _execute_standard(
        self,
        llm_config: Dict[str, Any],
        prompt: str,
        input_data: Dict[str, Any],
        start_time: datetime
    ) -> Dict[str, Any]:
        """Execute standard (non-streaming) LLM call"""
        
        provider = llm_config['provider']
        
        try:
            if provider == 'openai':
                result = await self._call_openai(llm_config, prompt)
            elif provider == 'anthropic':
                result = await self._call_anthropic(llm_config, prompt)
            elif provider == 'openrouter':
                result = await self._call_openrouter(llm_config, prompt)
            else:
                raise ValueError(f"Unsupported provider: {provider}")
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            # Try to parse JSON response
            try:
                if isinstance(result, str):
                    parsed_result = json.loads(result)
                else:
                    parsed_result = result
            except:
                parsed_result = {"content": result, "raw_response": True}
            
            return {
                "success": True,
                "result": parsed_result,
                "provider": provider,
                "model": llm_config['model'],
                "execution_time": execution_time,
                "timestamp": datetime.now().isoformat(),
                "token_usage": self._estimate_tokens(prompt, result)
            }
            
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            return {
                "success": False,
                "error": str(e),
                "provider": provider,
                "execution_time": execution_time,
                "timestamp": datetime.now().isoformat()
            }
    
    async def _execute_streaming(
        self,
        llm_config: Dict[str, Any],
        prompt: str,
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute streaming LLM call"""
        # TODO: Implement streaming for real-time responses
        return await self._execute_standard(llm_config, prompt, input_data, datetime.now())
    
    async def _call_openai(self, config: Dict[str, Any], prompt: str) -> str:
        """Call OpenAI API"""
        import aiohttp
        
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {config['api_key']}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": config['model'],
            "messages": [{"role": "user", "content": prompt}],
            "temperature": config.get('temperature', 0.7),
            "max_tokens": config.get('max_tokens', 4000)
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return data['choices'][0]['message']['content']
                else:
                    error_text = await response.text()
                    raise Exception(f"OpenAI API error: {response.status} - {error_text}")
    
    async def _call_anthropic(self, config: Dict[str, Any], prompt: str) -> str:
        """Call Anthropic Claude API"""
        import aiohttp
        
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": config['api_key'],
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        payload = {
            "model": config['model'],
            "max_tokens": config.get('max_tokens', 4000),
            "messages": [{"role": "user", "content": prompt}],
            "temperature": config.get('temperature', 0.7)
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return data['content'][0]['text']
                else:
                    error_text = await response.text()
                    raise Exception(f"Anthropic API error: {response.status} - {error_text}")
    
    async def _call_openrouter(self, config: Dict[str, Any], prompt: str) -> str:
        """Call OpenRouter API"""
        import aiohttp
        
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {config['api_key']}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": config['model'],
            "messages": [{"role": "user", "content": prompt}],
            "temperature": config.get('temperature', 0.7),
            "max_tokens": config.get('max_tokens', 4000)
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return data['choices'][0]['message']['content']
                else:
                    error_text = await response.text()
                    raise Exception(f"OpenRouter API error: {response.status} - {error_text}")
    
    def _estimate_tokens(self, prompt: str, response: str) -> Dict[str, int]:
        """Estimate token usage (rough approximation)"""
        prompt_tokens = len(prompt.split()) * 1.3  # Rough estimate
        response_tokens = len(str(response).split()) * 1.3
        
        return {
            "prompt_tokens": int(prompt_tokens),
            "completion_tokens": int(response_tokens),
            "total_tokens": int(prompt_tokens + response_tokens)
        }

# Global instance
llm_runner = LLMRunner() 