from typing import Dict, Any, Optional, List, Union
import logging
from datetime import datetime
from enum import Enum

from backend.models.nodes import Node, NodeType
from backend.models.workflow import ExecutionContext
from backend.models.results import NodeResult, ExecutionStatus
from backend.core.exceptions import ValidationError, FrameworkError
from backend.models.data import NodeData

logger = logging.getLogger(__name__)

class LLMProvider(str, Enum):
    """LLM Providers"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    OPENROUTER = "openrouter"

class AgentFramework(str, Enum):
    """Agent Frameworks"""
    CREWAI = "crewai"
    AUTOGEN = "autogen"
    LLAMAINDEX = "llamaindex"
    CUSTOM = "custom"

class AgentNode:
    """Handles execution of agent nodes using the unified runner"""

    def __init__(self):
        pass

    async def process(self, node: Union[Node, Dict[str, Any]], inputs: Dict[str, Any], context: ExecutionContext) -> NodeData:
        """Process an agent node without recursive calls to node_processor"""
        try:
            # Extract and validate configuration
            config = node.get("data", {}) if isinstance(node, dict) else node.get_config()
            self.validate_config(config)
            
            # Get node ID for logging and tracking
            node_id = node.get("id") if isinstance(node, dict) else node.id
            logger.info(f"Processing agent node {node_id}: {config.get('label', 'Unnamed Agent')}")
            
            # Create base result structure with agent configuration
            base_result = self._create_base_result(node, config, inputs, context)
            
            # Determine the appropriate framework runner to use
            framework = config.get('framework')
            provider = config.get('llm_provider')
            
            # Execute the agent based on framework
            execution_result = await self._execute_with_framework(framework, provider, config, inputs)
            
            # Update base result with execution outcome
            base_result.update({
                "status": "completed" if not execution_result.get("error") else "error",
                "result": execution_result.get("output"),
                "error": execution_result.get("error")
            })
            
            # Handle memory if enabled
            if config.get('enable_memory'):
                memory_result = await self._handle_memory(config, base_result, context)
                base_result["memory"] = memory_result
            
            # Return as NodeData - no recursive nesting
            return NodeData(
                value={
                    "type": "agent_result",
                    "data": base_result
                },
                metadata={
                    "node_id": node_id,
                    "node_type": "agent",
                    "timestamp": datetime.now().isoformat()
                }
            )

        except ValidationError as ve:
            logger.error(f"Validation error in agent node: {str(ve)}")
            return NodeData.from_error(str(ve))
        except FrameworkError as fe:
            logger.error(f"Framework error in agent node: {str(fe)}")
            return NodeData.from_error(str(fe))
        except Exception as e:
            logger.error(f"Unexpected error in agent node: {str(e)}")
            return NodeData.from_error(str(e))

    async def _execute_with_framework(self, framework: str, provider: str, config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute agent with the appropriate framework"""
        try:
            # Standardize framework and provider values to handle different formats
            framework = framework.lower() if framework else "openai"
            provider = provider.lower() if provider else "openai"
            
            # Initialize default result structure
            result = {
                "output": "Agent execution not implemented for this framework",
                "error": None
            }
            
            # Handle framework selection
            if framework == "crewai" or framework == AgentFramework.CREWAI.value:
                # Import crewai runner
                from backend.frameworks.crewai_runner import run_agent_chat
                
                # Extract relevant inputs
                # Make sure we're not passing NodeData objects, extract values
                formatted_inputs = {}
                for key, value in inputs.items():
                    if hasattr(value, 'get_value') and callable(getattr(value, 'get_value')):
                        try:
                            formatted_inputs[key] = value.get_value()
                        except:
                            # If there's an error getting value, use string representation
                            formatted_inputs[key] = str(value)
                    else:
                        formatted_inputs[key] = value
                
                # Execute with CrewAI framework
                output = run_agent_chat(config, formatted_inputs)
                result = {
                    "output": output,
                    "framework": "crewai"
                }
                
            elif framework == "openai" or provider == "openai":
                # Import openai runner
                from backend.frameworks.openrouter_runner import run_openrouter_chat_sync
                
                # Format prompt
                system_message = f"""Role: {config.get('role', 'Assistant')}
Goal: {config.get('goal', '')}
Backstory: {config.get('backstory', '')}

You are an AI assistant helping with this task."""

                # Format input message
                input_message = ""
                for key, val in inputs.items():
                    # Extract value from NodeData if needed
                    if hasattr(val, 'get_value') and callable(getattr(val, 'get_value')):
                        try:
                            input_message += f"{key}: {val.get_value()}\n"
                        except:
                            input_message += f"{key}: {str(val)}\n"
                    else:
                        input_message += f"{key}: {val}\n"
                
                if not input_message:
                    input_message = "Hello, I need your help with a task."
                
                # Create messages array
                messages = [
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": input_message}
                ]
                
                # Execute chat
                try:
                    # Use synchronous version to avoid coroutine object in result
                    output = run_openrouter_chat_sync(
                        messages=messages,
                        model=config.get("llm_model", "gpt-4"),
                        temperature=float(config.get("temperature", 0.7)),
                        max_tokens=int(config.get("max_tokens", 2000))
                    )
                    result = {
                        "output": output,
                        "framework": "openai"
                    }
                except Exception as e:
                    result = {
                        "output": None,
                        "error": f"OpenAI execution error: {str(e)}",
                        "framework": "openai"
                    }
            
            elif framework == "anthropic" or provider == "anthropic":
                # Use similar approach to OpenAI but with Anthropic's API
                # This is a placeholder; the actual implementation would use Anthropic's client
                result = {
                    "output": "Anthropic agent execution would happen here",
                    "framework": "anthropic"
                }
                
            else:
                # Default/fallback for unknown frameworks
                result = {
                    "output": f"Agent execution not implemented for framework: {framework}",
                    "error": f"Unsupported framework: {framework}"
                }
                
            return result
                
        except Exception as e:
            logger.error(f"Error executing agent with framework {framework}: {str(e)}")
            return {
                "output": None,
                "error": f"Framework execution error: {str(e)}"
            }

    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Enhanced configuration validation"""
        # Check required fields
        required_fields = ['role', 'goal']
        missing_fields = [field for field in required_fields if not config.get(field)]
        if missing_fields:
            raise ValidationError(f"Missing required fields: {', '.join(missing_fields)}")
        
        # Get provider and framework
        provider = config.get('llm_provider')
        
        # Check for framework in various possible fields (handle frontend/backend mismatch)
        framework = config.get('framework')
        
        # For backwards compatibility, treat 'openai' as a valid framework
        # since it might be sent from the frontend as a framework rather than a provider
        valid_frameworks = [f.value for f in AgentFramework] + ['openai', 'anthropic', 'huggingface']
        
        # Validate provider if specified
        if provider and provider not in [p.value for p in LLMProvider]:
            # Provider validation is optional - log a warning but don't fail
            logger.warning(f"Non-standard LLM provider: {provider}")
            
        # Validate framework if specified
        if framework and framework not in valid_frameworks:
            logger.warning(f"Invalid agent framework: {framework}, valid frameworks are: {valid_frameworks}")
            raise ValidationError(f"Invalid agent framework: {framework}")
        
        # Validate temperature
        if 'temperature' in config:
            try:
                temp = float(config['temperature'])
                if temp < 0 or temp > 2:
                    raise ValidationError("Temperature must be between 0 and 2")
            except (ValueError, TypeError):
                # If temperature can't be converted to float, use default
                config['temperature'] = 0.7
                logger.warning("Invalid temperature value, using default 0.7")
        
        # Validate max_tokens
        if 'max_tokens' in config:
            try:
                tokens = int(config['max_tokens'])
                if tokens < 1:
                    raise ValidationError("max_tokens must be positive")
            except (ValueError, TypeError):
                # If max_tokens can't be converted to int, use default
                config['max_tokens'] = 2000
                logger.warning("Invalid max_tokens value, using default 2000")
        
        return True

    def _create_base_result(self, node: Union[Node, Dict[str, Any]], config: Dict[str, Any], inputs: Dict[str, Any], context: ExecutionContext) -> Dict[str, Any]:
        """Create base result structure"""
        return {
            "type": "agent_status",
            "agent_name": config.get('label', 'Unnamed Agent'),
            "role": config.get('role'),
            "goal": config.get('goal'),
            "llm_provider": config.get('llm_provider'),
            "llm_model": config.get('llm_model'),
            "framework": config.get('framework'),
            "temperature": config.get('temperature', 0.7),
            "max_tokens": config.get('max_tokens', 2000),
            "allow_delegation": config.get('allow_delegation', False),
            "memory_enabled": config.get('enable_memory', False),
            "status": "initialized",
            "timestamp": datetime.now().isoformat(),
            "metadata": {
                "node_id": node.get("id") if isinstance(node, dict) else node.id,
                "backstory": config.get('backstory'),
                "execution_id": context.execution_id if hasattr(context, 'execution_id') else context.get('execution_id')
            }
        }

    def _create_error_response(self, error_type: str, message: str, config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create standardized error response"""
        return {
            "success": False,
            "type": "error",
            "error_type": error_type,
            "error": message,
            "agent_name": config.get('label', 'Unnamed Agent') if config else "Unnamed Agent",
            "timestamp": datetime.now().isoformat()
        }

    async def _handle_memory(self, config: Dict[str, Any], result: Dict[str, Any], context: ExecutionContext) -> Dict[str, Any]:
        """Handle agent memory operations"""
        try:
            from utils.memory import MemoryManager
            memory_manager = MemoryManager()
            return await memory_manager.process_memory(config, result, context)
        except ImportError:
            logger.warning("Memory manager not available, memory handling skipped")
            return {"status": "memory_unavailable"}
        except Exception as e:
            logger.error(f"Error handling memory: {str(e)}")
            return {"status": "error", "error": str(e)}

    def get_capabilities(self) -> Dict[str, Any]:
        """Get agent capabilities"""
        return {
            "can_delegate": True,
            "supports_memory": True,
            "llm_providers": [p.value for p in LLMProvider],
            "frameworks": [f.value for f in AgentFramework]
        } 