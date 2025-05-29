import logging
import json
import os
from typing import Dict, Any, Optional, List, Union
from datetime import datetime
import aiohttp
from openai import AsyncOpenAI
import asyncio

from models.types import (
    ToolType,
    LLMProvider,
    LLMConfig,
    ToolResult,
    LLMError
)

logger = logging.getLogger(__name__)

class LLMTool:
    """Base class for LLM tools"""
    
    def __init__(self, config: LLMConfig):
        self.config = config
        self.model = config.model
        self.temperature = config.temperature
        self.max_tokens = config.max_tokens
        self.system_message = config.system_message
        self.stop_sequences = config.stop_sequences
        self.top_p = config.top_p
        self.frequency_penalty = config.frequency_penalty
        self.presence_penalty = config.presence_penalty

    async def execute(self, inputs: Dict[str, Any]) -> ToolResult:
        """Execute LLM tool with inputs"""
        raise NotImplementedError("Subclasses must implement execute method")

    def _format_error(self, error_type: str, message: str, details: Optional[Dict] = None) -> ToolResult:
        """Format error response"""
        return ToolResult(
            success=False,
            tool_type=ToolType.LLM,
            tool_name=self.config.name,
            timestamp=datetime.now(),
            error={
                "type": error_type,
                "message": message,
                "details": details or {}
            }
        )

    def _format_success(self, output: str, metadata: Optional[Dict] = None) -> ToolResult:
        """Format success response"""
        return ToolResult(
            success=True,
            tool_type=ToolType.LLM,
            tool_name=self.config.name,
            timestamp=datetime.now(),
            data=output,
            metadata={
                **(metadata or {}),
                "model": self.model,
                "provider": self.config.provider
            }
        )

class OpenAITool(LLMTool):
    """OpenAI-specific LLM tool"""
    
    def __init__(self, config: LLMConfig):
        if config.provider != LLMProvider.OPENAI:
            raise LLMError("Invalid provider for OpenAITool")
        super().__init__(config)
        self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    async def execute(self, inputs: Dict[str, Any]) -> ToolResult:
        """Execute using OpenAI API"""
        try:
            messages = []
            
            # Add system message if provided
            if self.system_message:
                messages.append({"role": "system", "content": self.system_message})
            
            # Add input as user message
            if isinstance(inputs, str):
                messages.append({"role": "user", "content": inputs})
            elif isinstance(inputs, dict):
                # Format dictionary input as string
                content = "\n".join(f"{k}: {v}" for k, v in inputs.items())
                messages.append({"role": "user", "content": content})
            else:
                return self._format_error(
                    "invalid_input",
                    "Input must be string or dictionary"
                )

            # Call OpenAI API
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                stop=self.stop_sequences if self.stop_sequences else None,
                top_p=self.top_p,
                frequency_penalty=self.frequency_penalty,
                presence_penalty=self.presence_penalty
            )
            
            return self._format_success(
                response.choices[0].message.content,
                {"usage": response.usage.model_dump()}
            )
            
        except Exception as e:
            return self._format_error("openai_error", str(e))

class OpenRouterTool(LLMTool):
    """OpenRouter-specific LLM tool"""
    
    def __init__(self, config: LLMConfig):
        if config.provider != LLMProvider.OPENROUTER:
            raise LLMError("Invalid provider for OpenRouterTool")
        super().__init__(config)
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"

    async def execute(self, inputs: Dict[str, Any]) -> ToolResult:
        """Execute using OpenRouter API"""
        try:
            messages = []
            
            if self.system_message:
                messages.append({"role": "system", "content": self.system_message})
            
            if isinstance(inputs, str):
                messages.append({"role": "user", "content": inputs})
            elif isinstance(inputs, dict):
                content = "\n".join(f"{k}: {v}" for k, v in inputs.items())
                messages.append({"role": "user", "content": content})
            else:
                return self._format_error(
                    "invalid_input",
                    "Input must be string or dictionary"
                )

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    headers=headers,
                    json={
                        "model": self.model,
                        "messages": messages,
                        "temperature": self.temperature,
                        "max_tokens": self.max_tokens,
                        "stop": self.stop_sequences if self.stop_sequences else None,
                        "top_p": self.top_p,
                        "frequency_penalty": self.frequency_penalty,
                        "presence_penalty": self.presence_penalty
                    }
                ) as response:
                    result = await response.json()
                    
                    if "error" in result:
                        return self._format_error(
                            "openrouter_error",
                            result["error"]["message"]
                        )
                    
                    return self._format_success(
                        result["choices"][0]["message"]["content"],
                        {"usage": result.get("usage", {})}
                    )
                    
        except Exception as e:
            return self._format_error("openrouter_error", str(e))

class HuggingFaceTool(LLMTool):
    """HuggingFace-specific LLM tool"""
    
    def __init__(self, config: LLMConfig):
        if config.provider != LLMProvider.HUGGINGFACE:
            raise LLMError("Invalid provider for HuggingFaceTool")
        super().__init__(config)
        self.api_key = os.getenv("HUGGINGFACE_API_KEY")
        self.api_url = f"https://api-inference.huggingface.co/models/{self.model}"

    async def execute(self, inputs: Dict[str, Any]) -> ToolResult:
        """Execute using HuggingFace API"""
        try:
            # Format input
            if isinstance(inputs, dict):
                prompt = "\n".join(f"{k}: {v}" for k, v in inputs.items())
            else:
                prompt = str(inputs)

            if self.system_message:
                prompt = f"{self.system_message}\n\n{prompt}"

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    headers=headers,
                    json={
                        "inputs": prompt,
                        "parameters": {
                            "temperature": self.temperature,
                            "max_tokens": self.max_tokens,
                            "stop": self.stop_sequences if self.stop_sequences else None,
                            "top_p": self.top_p,
                            "frequency_penalty": self.frequency_penalty,
                            "presence_penalty": self.presence_penalty
                        }
                    }
                ) as response:
                    result = await response.json()
                    
                    if isinstance(result, list) and len(result) > 0:
                        if isinstance(result[0], dict) and "generated_text" in result[0]:
                            text = result[0]["generated_text"]
                        else:
                            text = str(result[0])
                            
                        return self._format_success(text)
                    else:
                        return self._format_error(
                            "huggingface_error",
                            "Invalid response format"
                        )
                    
        except Exception as e:
            return self._format_error("huggingface_error", str(e))

def create_llm_tool(config: LLMConfig) -> LLMTool:
    """Create an LLM tool instance based on provider"""
    providers = {
        LLMProvider.OPENAI: OpenAITool,
        LLMProvider.OPENROUTER: OpenRouterTool,
        LLMProvider.HUGGINGFACE: HuggingFaceTool
    }
    
    tool_class = providers.get(config.provider)
    if not tool_class:
        raise LLMError(f"Unsupported LLM provider: {config.provider}")
        
    return tool_class(config)

async def run_llm_tool(config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Run LLM tool with configuration and inputs"""
    try:
        # Extract LLM configuration
        provider = config.get("provider", "openai")
        model = config.get("model", "gpt-4")
        
        # Create LLM config
        llm_config = LLMConfig(
            name=f"{provider}_{model}",
            provider=LLMProvider(provider.upper()),
            model=model,
            temperature=config.get("temperature", 0.7),
            max_tokens=config.get("max_tokens", 1000),
            system_message=config.get("system_message", ""),
            top_p=config.get("top_p", 1.0),
            frequency_penalty=config.get("frequency_penalty", 0.0),
            presence_penalty=config.get("presence_penalty", 0.0)
        )
        
        # Create and execute tool
        tool = create_llm_tool(llm_config)
        result = await tool.execute(inputs)
        
        if result.success:
            return {
                "success": True,
                "output": result.data,
                "metadata": result.metadata,
                "framework": "llm_tool"
            }
        else:
            return {
                "success": False,
                "error": result.error,
                "framework": "llm_tool"
            }
            
    except Exception as e:
        logger.error(f"LLM tool execution failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "framework": "llm_tool"
        }
