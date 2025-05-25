from typing import Dict, Any, Optional, List, Union
from enum import Enum
from pydantic import BaseModel, Field

class NodeType(str, Enum):
    AGENT = "agent"
    TASK = "task"
    TOOL = "tool"
    TRIGGER = "trigger"
    LOGIC = "logic"
    INPUT = "input"
    OUTPUT = "output"
    CHAT = "chat"
    DELAY = "delay"

class ToolType(str, Enum):
    LLM = "llm"
    API = "api"
    WEBHOOK = "webhook"
    CUSTOM = "custom"

# NEW: Inheritance configuration
class InheritanceConfig(BaseModel):
    """Configuration for inheritance relationships"""
    inherit_fields: List[str] = Field(default_factory=lambda: ["framework", "llm_model", "temperature", "max_tokens"])
    override_fields: Dict[str, Any] = Field(default_factory=dict)
    
class BaseNodeConfig(BaseModel):
    label: str
    description: Optional[str] = None
    condition: Optional[str] = None
    
    # NEW: Add inheritance support (optional, backward compatible)
    inherits_from: Optional[str] = Field(None, description="ID of parent node to inherit from")
    inheritance_config: Optional[InheritanceConfig] = Field(None, description="Inheritance configuration")
    
    def can_inherit_from(self, parent_type: NodeType) -> bool:
        """Define which node types can inherit from which parents"""
        # Base implementation - can be overridden in subclasses
        return False

class AgentConfig(BaseNodeConfig):
    role: str
    goal: str
    backstory: Optional[str] = None
    llm_model: str = "gpt-4"
    temperature: float = 0.7
    max_tokens: int = 4000
    allow_delegation: bool = False
    enable_memory: bool = False
    framework: str
    framework_config: Dict[str, Any] = Field(default_factory=dict)
    
    def can_inherit_from(self, parent_type: NodeType) -> bool:
        """Agents can inherit from other agents"""
        return parent_type == NodeType.AGENT

class TaskConfig(BaseNodeConfig):
    description: str
    expected_output: Optional[str] = None
    async_execution: bool = False
    dependencies: List[str] = Field(default_factory=list)
    
    # NEW: Task-specific inheritance fields
    agent_ref: Optional[str] = Field(None, description="Reference to associated agent for inheritance")
    
    def can_inherit_from(self, parent_type: NodeType) -> bool:
        """Tasks can inherit from agents"""
        return parent_type == NodeType.AGENT

class ToolConfig(BaseNodeConfig):
    tool_type: ToolType
    framework: str
    framework_config: Dict[str, Any] = Field(default_factory=dict)
    parameters: Dict[str, Any] = Field(default_factory=dict)
    
    def can_inherit_from(self, parent_type: NodeType) -> bool:
        """Tools can inherit from agents"""
        return parent_type == NodeType.AGENT

class ChatConfig(BaseNodeConfig):
    """Chat/Chatbot node configuration"""
    prompt: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    enable_memory: bool = False
    framework: Optional[str] = None
    framework_config: Dict[str, Any] = Field(default_factory=dict)
    
    def can_inherit_from(self, parent_type: NodeType) -> bool:
        """Chat nodes can inherit from agents"""
        return parent_type == NodeType.AGENT

class OutputConfig(BaseNodeConfig):
    output_type: str
    config: Dict[str, Any] = Field(default_factory=dict)

# NEW: Enhanced Node class with inheritance support
class Node(BaseModel):
    id: str
    type: NodeType
    data: Dict[str, Any]
    position: Dict[str, int]
    
    def get_config(self) -> BaseNodeConfig:
        """Get typed configuration for this node"""
        config_classes = {
            NodeType.AGENT: AgentConfig,
            NodeType.TASK: TaskConfig,
            NodeType.TOOL: ToolConfig,
            NodeType.OUTPUT: OutputConfig,
            NodeType.CHAT: ChatConfig,  # NEW
        }
        
        config_class = config_classes.get(self.type, BaseNodeConfig)
        return config_class(**self.data)
    
    def get_effective_config(self, parent_node: Optional['Node'] = None) -> BaseNodeConfig:
        """
        Get configuration with inheritance applied.
        Returns merged config if inheritance is configured.
        """
        config = self.get_config()
        
        # No inheritance configured
        if not config.inherits_from or not parent_node:
            return config
            
        # Validate inheritance relationship
        parent_config = parent_node.get_config()
        if not config.can_inherit_from(parent_node.type):
            raise ValueError(f"{self.type} cannot inherit from {parent_node.type}")
            
        # Merge configurations
        return self._merge_configs(parent_config, config)
    
    def _merge_configs(self, parent_config: BaseNodeConfig, child_config: BaseNodeConfig) -> BaseNodeConfig:
        """Merge parent and child configurations intelligently"""
        # Convert to dictionaries for merging
        parent_dict = parent_config.dict(exclude_unset=True)
        child_dict = child_config.dict(exclude_unset=True)
        
        # Determine which fields to inherit
        inherit_fields = child_config.inheritance_config.inherit_fields if child_config.inheritance_config else []
        if not inherit_fields:
            # Default inheritance fields based on node type
            inherit_fields = self._get_default_inherit_fields()
        
        # Start with child config
        merged_dict = child_dict.copy()
        
        # Inherit specified fields from parent (only if not set in child)
        for field in inherit_fields:
            if field in parent_dict and (field not in child_dict or child_dict[field] is None):
                merged_dict[field] = parent_dict[field]
                
        # Handle nested framework_config merging
        if 'framework_config' in parent_dict and 'framework_config' in merged_dict:
            merged_dict['framework_config'] = {
                **parent_dict['framework_config'],
                **merged_dict['framework_config']
            }
        elif 'framework_config' in parent_dict and 'framework_config' not in merged_dict:
            merged_dict['framework_config'] = parent_dict['framework_config']
            
        # Apply any override fields
        if child_config.inheritance_config and child_config.inheritance_config.override_fields:
            merged_dict.update(child_config.inheritance_config.override_fields)
        
        # Return the appropriate config type
        config_class = type(child_config)
        return config_class(**merged_dict)
    
    def _get_default_inherit_fields(self) -> List[str]:
        """Get default fields to inherit based on node type"""
        default_inheritance = {
            NodeType.TASK: ["framework", "llm_model", "temperature", "max_tokens", "framework_config"],
            NodeType.TOOL: ["framework", "llm_model", "temperature", "max_tokens", "framework_config"],
            NodeType.CHAT: ["framework", "llm_model", "temperature", "max_tokens", "framework_config", "enable_memory"],
        }
        return default_inheritance.get(self.type, [])
    
    def has_inheritance(self) -> bool:
        """Check if this node has inheritance configured"""
        config = self.get_config()
        return config.inherits_from is not None
    
    def get_inheritance_summary(self, parent_node: Optional['Node'] = None) -> Dict[str, Any]:
        """Get a summary of inheritance relationships for debugging/UI"""
        if not self.has_inheritance():
            return {"has_inheritance": False}
            
        config = self.get_config()
        return {
            "has_inheritance": True,
            "inherits_from": config.inherits_from,
            "inherit_fields": config.inheritance_config.inherit_fields if config.inheritance_config else self._get_default_inherit_fields(),
            "can_inherit": config.can_inherit_from(parent_node.type) if parent_node else False,
            "parent_type": parent_node.type if parent_node else None
        }

# NEW: Workflow-level inheritance resolver
class WorkflowInheritanceResolver:
    """Resolves inheritance relationships within a workflow"""
    
    def __init__(self, nodes: List[Node]):
        self.nodes = {node.id: node for node in nodes}
        self.resolved_cache = {}
        
    def resolve_node(self, node_id: str) -> Node:
        """Resolve a node with inheritance applied"""
        if node_id in self.resolved_cache:
            return self.resolved_cache[node_id]
            
        node = self.nodes.get(node_id)
        if not node:
            raise ValueError(f"Node {node_id} not found")
            
        config = node.get_config()
        if not config.inherits_from:
            # No inheritance, return as-is
            self.resolved_cache[node_id] = node
            return node
            
        # Get parent node
        parent_node = self.nodes.get(config.inherits_from)
        if not parent_node:
            raise ValueError(f"Parent node {config.inherits_from} not found")
            
        # Recursively resolve parent (in case of inheritance chains)
        resolved_parent = self.resolve_node(config.inherits_from)
        
        # Get effective configuration with inheritance
        effective_config = node.get_effective_config(resolved_parent)
        
        # Create resolved node
        resolved_node = Node(
            id=node.id,
            type=node.type,
            data=effective_config.dict(),
            position=node.position
        )
        
        self.resolved_cache[node_id] = resolved_node
        return resolved_node
    
    def resolve_all_nodes(self) -> Dict[str, Node]:
        """Resolve all nodes in the workflow"""
        return {node_id: self.resolve_node(node_id) for node_id in self.nodes.keys()}
    
    def validate_inheritance_graph(self) -> List[str]:
        """Validate the inheritance graph for cycles and invalid relationships"""
        errors = []
        
        for node_id, node in self.nodes.items():
            config = node.get_config()
            if config.inherits_from:
                # Check if parent exists
                if config.inherits_from not in self.nodes:
                    errors.append(f"Node {node_id} inherits from non-existent node {config.inherits_from}")
                    continue
                    
                # Check if inheritance is valid
                parent_node = self.nodes[config.inherits_from]
                if not config.can_inherit_from(parent_node.type):
                    errors.append(f"Node {node_id} ({node.type}) cannot inherit from {config.inherits_from} ({parent_node.type})")
                    
                # Check for cycles
                if self._has_inheritance_cycle(node_id, set()):
                    errors.append(f"Inheritance cycle detected involving node {node_id}")
                    
        return errors
    
    def _has_inheritance_cycle(self, node_id: str, visited: set) -> bool:
        """Check for cycles in inheritance graph"""
        if node_id in visited:
            return True
            
        visited.add(node_id)
        
        node = self.nodes.get(node_id)
        if not node:
            return False
            
        config = node.get_config()
        if config.inherits_from:
            return self._has_inheritance_cycle(config.inherits_from, visited.copy())
            
        return False