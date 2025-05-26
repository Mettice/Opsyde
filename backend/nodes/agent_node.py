from typing import Dict, Any, Optional, List, Union
import logging
from datetime import datetime
from enum import Enum

from backend.models.nodes import Node, NodeType, AgentConfig
from backend.models.workflow import ExecutionContext
from backend.models.results import NodeResult, ExecutionStatus
from backend.core.exceptions import ValidationError, FrameworkError
from backend.models.data import NodeData

# Import the enhanced framework registry
from backend.framework_registry import framework_registry

logger = logging.getLogger(__name__)

class LLMProvider(Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    OPENROUTER = "openrouter"
    HUGGINGFACE = "huggingface"

class AgentFramework(Enum):
    CREWAI = "crewai"
    AUTOGEN = "autogen"
    LANGCHAIN = "langchain"

class AgentNode:
    """Enhanced agent node with framework registry integration"""

    def __init__(self):
        pass

    async def process(self, node: Node, inputs: Dict[str, Any], context: ExecutionContext) -> Dict[str, Any]:
        """Process an agent node using the framework registry"""
        try:
            # Migrate old node data format if needed
            node_data = self._migrate_node_data(node.data)
            
            # Extract and validate agent configuration
            config = AgentConfig(**node_data)
            framework = config.framework
            framework_config = config.framework_config
            
            # Validate configuration
            if not self.validate_config(config.dict()):
                return {
                    "success": False,
                    "type": "error",
                    "error": "Invalid agent configuration"
                }

            # Get framework handler from registry
            framework_handler = framework_registry._frameworks.get(framework)
            if not framework_handler:
                # Try to re-register frameworks in case they were missed during startup
                logger.warning(f"Framework '{framework}' not found in registry. Available frameworks: {list(framework_registry._frameworks.keys())}")
                logger.info("Attempting to re-register frameworks...")
                framework_registry.register_all_frameworks()
                
                # Try again after re-registration
                framework_handler = framework_registry._frameworks.get(framework)
                if not framework_handler:
                    available_frameworks = list(framework_registry._frameworks.keys())
                    logger.error(f"Framework '{framework}' still not available after re-registration. Available: {available_frameworks}")
                    return {
                        "success": False,
                        "type": "error",
                        "error": f"Framework '{framework}' not available or not registered. Available frameworks: {available_frameworks}"
                    }

            # Execute with the framework handler
            result = await self._execute_with_framework(
                framework_handler, 
                framework_config, 
                config.dict(), 
                inputs, 
                context
            )

            # Add agent metadata
            result["metadata"] = {
                "node_id": node.id,
                "framework": framework,
                "execution_id": context.execution_id,
                "agent_type": config.dict().get("type", "unknown"),
                **result.get("metadata", {})
            }

            return result

        except Exception as e:
            logger.error(f"Error in agent node: {str(e)}")
            return {
                "success": False,
                "type": "error",
                "error": str(e),
                "framework": framework if 'framework' in locals() else "unknown",
                "timestamp": datetime.now().isoformat()
            }

    async def _execute_with_framework(
        self, 
        framework_handler, 
        framework_config: Dict[str, Any], 
        agent_config: Dict[str, Any], 
        inputs: Dict[str, Any], 
        context: ExecutionContext
    ) -> Dict[str, Any]:
        """Execute agent using the framework handler from registry"""
        try:
            # Get the LLM provider from framework_config
            llm_provider = framework_config.get("provider", "openai")
            
            # Prepare execution parameters in the format expected by framework registry
            execution_params = {
                "config": {
                    "llm": {
                        "provider": llm_provider,
                        "model": framework_config.get("model", "gpt-4"),
                        "temperature": framework_config.get("temperature", 0.7),
                        "max_tokens": framework_config.get("max_tokens", 4000),
                        "api_key": framework_config.get("api_key")
                    },
                    "agent": agent_config,
                    "framework_config": framework_config
                },
                "inputs": inputs
            }

            # Execute with the framework handler - unpack the execution_params
            result = await framework_handler(**execution_params)
            
            if result.get("success", False):
                return {
                    "success": True,
                    "type": "agent_result",
                    "data": result.get("data", {}),
                    "metadata": result.get("metadata", {}),
                    "execution_time": result.get("execution_time"),
                    "memory": result.get("memory", {})
                }
            else:
                return {
                    "success": False,
                    "type": "agent_error",
                    "error": result.get("error", "Agent execution failed"),
                    "details": result.get("details", {})
                }

        except Exception as e:
            logger.error(f"Framework execution error: {str(e)}")
            return {
                "success": False,
                "type": "error",
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

    def _migrate_node_data(self, node_data: Dict[str, Any]) -> Dict[str, Any]:
        """Migrate old agent node data format to new format"""
        migrated = dict(node_data)
        
        # Handle legacy field mappings
        if 'name' in migrated and 'label' not in migrated:
            migrated['label'] = migrated['name']
        
        # Ensure label is always present
        if 'label' not in migrated:
            migrated['label'] = migrated.get('role', 'Agent')
        
        # Ensure framework is set
        if 'framework' not in migrated:
            migrated['framework'] = 'crewai'  # default framework for agents
        
        # Ensure framework_config exists and has LLM provider
        if 'framework_config' not in migrated:
            migrated['framework_config'] = {}
        
        # Handle frameworkConfig -> framework_config mapping
        if 'frameworkConfig' in migrated and not migrated['framework_config']:
            migrated['framework_config'] = migrated['frameworkConfig']
        
        # Ensure LLM provider is set in framework_config
        if 'provider' not in migrated['framework_config']:
            # Try to get from various possible fields
            llm_provider = (
                migrated.get('llmProvider') or 
                migrated.get('llm_provider') or 
                migrated.get('framework_config', {}).get('llm_provider') or
                'openai'  # default
            )
            migrated['framework_config']['provider'] = llm_provider
        
        # Ensure model is set
        if 'model' not in migrated['framework_config']:
            model = (
                migrated.get('llmModel') or 
                migrated.get('llm_model') or 
                migrated.get('framework_config', {}).get('model') or
                'gpt-4'  # default
            )
            migrated['framework_config']['model'] = model
        
        # Ensure temperature is set
        if 'temperature' not in migrated['framework_config']:
            temperature = (
                migrated.get('temperature') or 
                migrated.get('framework_config', {}).get('temperature') or
                0.7  # default
            )
            migrated['framework_config']['temperature'] = temperature
        
        # Ensure max_tokens is set
        if 'max_tokens' not in migrated['framework_config']:
            max_tokens = (
                migrated.get('max_tokens') or 
                migrated.get('framework_config', {}).get('max_tokens') or
                4000  # default
            )
            migrated['framework_config']['max_tokens'] = max_tokens
        
        # Ensure required agent fields have defaults
        if 'role' not in migrated:
            migrated['role'] = 'Assistant'
        
        if 'goal' not in migrated:
            migrated['goal'] = 'Help the user with their request'
        
        if 'backstory' not in migrated:
            migrated['backstory'] = ''
        
        if 'llm_model' not in migrated:
            migrated['llm_model'] = migrated['framework_config'].get('model', 'gpt-4')
        
        if 'temperature' not in migrated:
            migrated['temperature'] = migrated['framework_config'].get('temperature', 0.7)
        
        if 'max_tokens' not in migrated:
            migrated['max_tokens'] = migrated['framework_config'].get('max_tokens', 4000)
        
        if 'allow_delegation' not in migrated:
            migrated['allow_delegation'] = False
        
        if 'enable_memory' not in migrated:
            migrated['enable_memory'] = False
        
        return migrated 


# Standalone function for node processor compatibility
async def process_agent_node(
    node_data: Dict[str, Any], 
    inputs: Dict[str, NodeData], 
    context: Dict[str, Any] = None
) -> NodeData:
    """
    Process agent node - standalone function for node processor
    """
    try:
        from backend.models.data import NodeData
        from backend.models.workflow import ExecutionContext
        
        # Create AgentNode instance
        agent_node = AgentNode()
        
        # Convert context to ExecutionContext if needed
        if context and not isinstance(context, ExecutionContext):
            exec_context = ExecutionContext(
                execution_id=context.get('execution_id', 'unknown'),
                workflow_id=context.get('workflow_id', 'unknown'),
                user_id=context.get('user_id'),
                metadata=context.get('metadata', {})
            )
        else:
            exec_context = context or ExecutionContext(
                execution_id='unknown',
                workflow_id='unknown'
            )
        
        # Create a Node object from node_data
        from backend.models.nodes import Node, NodeType
        node = Node(
            id=node_data.get('nodeId', node_data.get('id', 'unknown')),
            type=NodeType.AGENT,
            data=node_data,
            position=node_data.get('position', {'x': 0, 'y': 0})
        )
        
        # Process the node
        result = await agent_node.process(node, inputs, exec_context)
        
        # Ensure result is wrapped in NodeData
        if isinstance(result, NodeData):
            return result
        else:
            return NodeData(
                value=result,
                metadata={
                    'node_id': node.id,
                    'node_type': 'agent',
                    'timestamp': datetime.now().isoformat()
                }
            )
            
    except Exception as e:
        logger.error(f"Error in process_agent_node: {str(e)}")
        return NodeData(
            value={
                "success": False,
                "type": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            },
            metadata={
                'node_id': node_data.get('nodeId', 'unknown'),
                'node_type': 'agent',
                'error': True
            }
        ) 