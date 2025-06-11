from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
from .nodes import Node

class Edge(BaseModel):
    id: str
    source: str
    target: str
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)

class WorkflowConfig(BaseModel):
    name: str
    description: Optional[str] = None
    version: str = "1.0"
    owner: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    settings: Dict[str, Any] = Field(default_factory=dict)

class WorkflowInput(BaseModel):
    """Model for workflow execution inputs"""
    inputs: Dict[str, Any] = Field(default_factory=dict)
    global_inputs: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ExecutionContext(BaseModel):
    workflow_id: Optional[str] = None
    execution_id: str
    node_results: Dict[str, Any] = Field(default_factory=dict)
    global_inputs: Dict[str, Any] = Field(default_factory=dict)
    memory: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class Workflow(BaseModel):
    id: str
    nodes: List[Node]
    edges: List[Edge]
    config: WorkflowConfig
    inputs: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    def get_node_by_id(self, node_id: str) -> Optional[Node]:
        return next((node for node in self.nodes if node.id == node_id), None)
    
    def get_downstream_nodes(self, node_id: str) -> List[Node]:
        downstream_ids = [edge.target for edge in self.edges if edge.source == node_id]
        return [node for node in self.nodes if node.id in downstream_ids]
    
    def get_upstream_nodes(self, node_id: str) -> List[Node]:
        upstream_ids = [edge.source for edge in self.edges if edge.target == node_id]
        return [node for node in self.nodes if node.id in upstream_ids]
    
    def get_start_nodes(self) -> List[Node]:
        """Get nodes with no incoming edges (start nodes)"""
        target_nodes = {edge.target for edge in self.edges}
        return [node for node in self.nodes if node.id not in target_nodes]
    
    def get_end_nodes(self) -> List[Node]:
        """Get nodes with no outgoing edges (end nodes)"""
        source_nodes = {edge.source for edge in self.edges}
        return [node for node in self.nodes if node.id not in source_nodes]

class WorkflowValidationResult(BaseModel):
    """Result of workflow validation"""
    is_valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    node_count: int = 0
    edge_count: int = 0
    validation_details: Dict[str, Any] = Field(default_factory=dict)
    
    def add_error(self, error: str):
        """Add an error to the validation result"""
        self.errors.append(error)
        self.is_valid = False
    
    def add_warning(self, warning: str):
        """Add a warning to the validation result"""
        self.warnings.append(warning)
    
    def has_errors(self) -> bool:
        """Check if there are any errors"""
        return len(self.errors) > 0
    
    def has_warnings(self) -> bool:
        """Check if there are any warnings"""
        return len(self.warnings) > 0
