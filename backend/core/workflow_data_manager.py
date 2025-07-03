#!/usr/bin/env python3
"""
🔄 Workflow Data Manager
Production-grade data flow management for all node types
"""

import logging
from typing import Dict, Any, Optional, List, Union
from datetime import datetime
import json
import re

logger = logging.getLogger(__name__)

class WorkflowExecutionContext:
    """Manages data flow and variable resolution across workflow execution"""
    
    def __init__(self, workflow_id: str = None):
        self.workflow_id = workflow_id or f"workflow_{datetime.now().timestamp()}"
        self.node_outputs = {}  # node_id -> output_data
        self.variables = {}     # variable_name -> value
        self.execution_order = []
        self.metadata = {
            "started_at": datetime.now().isoformat(),
            "total_nodes": 0,
            "completed_nodes": 0
        }
        
    def register_node_output(self, node_id: str, node_type: str, output_data: Any):
        """Register output from a node and create standard variables"""
        
        # Store the raw output
        self.node_outputs[node_id] = {
            "data": output_data,
            "node_type": node_type,
            "timestamp": datetime.now().isoformat(),
            "node_id": node_id
        }
        
        # Create standard variables based on node type
        if node_type == 'trigger':
            self.variables['trigger_output'] = output_data
            self.variables['trigger_data'] = output_data
            
        elif node_type == 'agent':
            self.variables['agent_output'] = output_data
            self.variables['agent_result'] = output_data
            # If output_data is a dict and has 'result', set agent_output to that value for mapping
            if isinstance(output_data, dict) and 'result' in output_data:
                self.variables['agent_output'] = output_data['result']
            
        elif node_type == 'task':
            self.variables['task_output'] = output_data
            self.variables['task_result'] = output_data
            # If output_data is a dict and has 'result', set task_output to that value for mapping
            if isinstance(output_data, dict) and 'result' in output_data:
                self.variables['task_output'] = output_data['result']
            
        elif node_type == 'input':
            self.variables['input_data'] = output_data
            self.variables['user_input'] = output_data
            
        elif node_type == 'logic':
            self.variables['logic_result'] = output_data
            self.variables['condition_result'] = output_data
            
        # Always create a "previous_output" variable
        self.variables['previous_output'] = output_data
        
        # Create node-specific variable (node_id -> output)
        self.variables[f"{node_id}_output"] = output_data
        
        # Track execution
        self.execution_order.append(node_id)
        self.metadata["completed_nodes"] += 1
        
        logger.info(f"Registered output for {node_type} node '{node_id}': {type(output_data)}")
        
    def resolve_template_variables(self, template: Union[str, Dict, List]) -> Union[str, Dict, List]:
        """Resolve all template variables in strings, dicts, or lists"""
        
        if isinstance(template, str):
            return self._resolve_string_template(template)
        elif isinstance(template, dict):
            return self._resolve_dict_template(template)
        elif isinstance(template, list):
            return self._resolve_list_template(template)
        else:
            return template
            
    def _resolve_string_template(self, template: str) -> str:
        """Resolve template variables in a string"""
        
        if not isinstance(template, str):
            return template
            
        # Find all template variables: {variable_name}
        pattern = r'\{([^}]+)\}'
        matches = re.findall(pattern, template)
        
        resolved_template = template
        
        for variable_name in matches:
            value = self._get_variable_value(variable_name)
            
            if value is not None:
                # Convert value to string for replacement
                if isinstance(value, (dict, list)):
                    value_str = json.dumps(value, indent=2)
                else:
                    value_str = str(value)
                    
                resolved_template = resolved_template.replace(f"{{{variable_name}}}", value_str)
                logger.debug(f"Resolved {{{variable_name}}} -> {type(value)}")
            else:
                logger.warning(f"Template variable '{variable_name}' not found in context")
                
        return resolved_template
        
    def _resolve_dict_template(self, template: Dict) -> Dict:
        """Resolve template variables in a dictionary"""
        resolved = {}
        
        for key, value in template.items():
            resolved_key = self.resolve_template_variables(key)
            resolved_value = self.resolve_template_variables(value)
            resolved[resolved_key] = resolved_value
            
        return resolved
        
    def _resolve_list_template(self, template: List) -> List:
        """Resolve template variables in a list"""
        return [self.resolve_template_variables(item) for item in template]
        
    def _get_variable_value(self, variable_name: str) -> Any:
        """Get value for a variable name with fallback strategies"""
        
        # 1. Direct variable lookup
        if variable_name in self.variables:
            return self.variables[variable_name]
            
        # 2. Node output lookup (for node_id references)
        if variable_name in self.node_outputs:
            return self.node_outputs[variable_name]["data"]
            
        # 3. Nested path lookup (e.g., "trigger_output.data.symbol")
        if '.' in variable_name:
            return self._get_nested_value(variable_name)
            
        # 4. Smart lookup for common patterns
        return self._smart_variable_lookup(variable_name)
        
    def _get_nested_value(self, path: str) -> Any:
        """Get nested value using dot notation with array support"""
        import re
        
        # Get the base variable
        parts = path.split('.')
        base_var = parts[0]
        
        # Get the base value
        value = self.variables.get(base_var)
        if value is None:
            return None
            
        # Process the remaining path
        remaining_path = '.'.join(parts[1:]) if len(parts) > 1 else ''
        
        if not remaining_path:
            return value
            
        # Parse the path to handle array indices
        # Convert api_data[0].symbol to ['api_data', 0, 'symbol']
        path_parts = []
        current_part = ''
        i = 0
        
        while i < len(remaining_path):
            char = remaining_path[i]
            
            if char == '.':
                if current_part:
                    path_parts.append(current_part)
                    current_part = ''
            elif char == '[':
                # Found array index
                if current_part:
                    path_parts.append(current_part)
                    current_part = ''
                
                # Find the closing bracket
                j = i + 1
                while j < len(remaining_path) and remaining_path[j] != ']':
                    j += 1
                
                if j < len(remaining_path):
                    index_str = remaining_path[i+1:j]
                    if index_str.isdigit():
                        path_parts.append(int(index_str))
                    else:
                        path_parts.append(index_str)
                    i = j  # Skip to after the ]
                else:
                    current_part += char
            else:
                current_part += char
            
            i += 1
        
        # Add the last part if any
        if current_part:
            path_parts.append(current_part)
        
        # Navigate through the path
        for part in path_parts:
            if isinstance(part, int):
                # Array index
                if isinstance(value, list) and 0 <= part < len(value):
                    value = value[part]
                else:
                    return None
            elif isinstance(part, str):
                # Object key
                if isinstance(value, dict) and part in value:
                    value = value[part]
                else:
                    return None
            else:
                return None
                
        return value
        
    def _smart_variable_lookup(self, variable_name: str) -> Any:
        """Smart lookup for common variable patterns"""
        
        # Common aliases
        aliases = {
            'output': 'previous_output',
            'result': 'previous_output', 
            'data': 'previous_output',
            'response': 'previous_output',
            'content': 'previous_output'
        }
        
        if variable_name in aliases:
            return self.variables.get(aliases[variable_name])
            
        # Look for partial matches
        for var_name, value in self.variables.items():
            if variable_name.lower() in var_name.lower():
                return value
                
        # Last resort: look in the most recent output
        if self.execution_order:
            last_node_id = self.execution_order[-1]
            if last_node_id in self.node_outputs:
                return self.node_outputs[last_node_id]["data"]
                
        return None
        
    def get_available_variables(self) -> Dict[str, str]:
        """Get all available variables with descriptions"""
        available = {}
        
        # Standard variables
        for var_name, value in self.variables.items():
            available[var_name] = f"{type(value).__name__} - {str(value)[:50]}..."
            
        # Node outputs
        for node_id, output_info in self.node_outputs.items():
            available[f"{node_id}_output"] = f"Output from {output_info['node_type']} node"
            
        return available
        
    def get_execution_summary(self) -> Dict[str, Any]:
        """Get summary of workflow execution"""
        return {
            "workflow_id": self.workflow_id,
            "execution_order": self.execution_order,
            "total_variables": len(self.variables),
            "node_outputs_count": len(self.node_outputs),
            "metadata": self.metadata,
            "available_variables": list(self.variables.keys()),
            "data_flow_analysis": self._analyze_data_flow(),
            "performance_metrics": self._get_performance_metrics()
        }
    
    def _analyze_data_flow(self) -> Dict[str, Any]:
        """Analyze data flow between nodes"""
        analysis = {
            "data_sources": {},
            "data_sinks": {},
            "data_transformations": {},
            "potential_issues": []
        }
        
        for node_id, output_info in self.node_outputs.items():
            node_type = output_info['node_type']
            output_data = output_info['data']
            
            # Track data sources
            if node_type in ['input', 'trigger']:
                analysis["data_sources"][node_id] = {
                    "type": node_type,
                    "data_type": type(output_data).__name__,
                    "size": len(str(output_data)) if output_data else 0
                }
            
            # Track data sinks
            if node_type in ['output']:
                analysis["data_sinks"][node_id] = {
                    "type": node_type,
                    "data_type": type(output_data).__name__
                }
            
            # Track transformations
            if node_type in ['agent', 'task', 'tool', 'logic']:
                analysis["data_transformations"][node_id] = {
                    "type": node_type,
                    "input_size": 0,  # Could be enhanced to track actual input size
                    "output_size": len(str(output_data)) if output_data else 0,
                    "transformation_type": "processing"
                }
        
        return analysis
    
    def _get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics for the workflow"""
        if not self.execution_order:
            return {"status": "no_execution"}
        
        total_nodes = len(self.execution_order)
        completed_nodes = len(self.node_outputs)
        
        return {
            "total_nodes": total_nodes,
            "completed_nodes": completed_nodes,
            "success_rate": (completed_nodes / total_nodes) if total_nodes > 0 else 0,
            "execution_time": (datetime.now() - datetime.fromisoformat(self.metadata["started_at"])).total_seconds(),
            "average_node_execution_time": 0,  # Could be enhanced to track individual node times
            "memory_usage": len(str(self.variables)) + len(str(self.node_outputs))
        }

class WorkflowDataManager:
    """Global manager for workflow data contexts"""
    
    def __init__(self):
        self.active_contexts = {}  # workflow_id -> WorkflowExecutionContext
        
    def create_context(self, workflow_id: str = None) -> WorkflowExecutionContext:
        """Create a new workflow execution context"""
        context = WorkflowExecutionContext(workflow_id)
        self.active_contexts[context.workflow_id] = context
        return context
        
    def get_context(self, workflow_id: str) -> Optional[WorkflowExecutionContext]:
        """Get an existing workflow context"""
        return self.active_contexts.get(workflow_id)
        
    def cleanup_context(self, workflow_id: str):
        """Clean up a completed workflow context"""
        if workflow_id in self.active_contexts:
            del self.active_contexts[workflow_id]
            
    def get_active_contexts(self) -> List[str]:
        """Get list of active workflow IDs"""
        return list(self.active_contexts.keys())

# Global instance
workflow_data_manager = WorkflowDataManager()

def get_workflow_context(workflow_id: str = None) -> WorkflowExecutionContext:
    """Get or create a workflow context"""
    if workflow_id and workflow_id in workflow_data_manager.active_contexts:
        return workflow_data_manager.get_context(workflow_id)
    else:
        return workflow_data_manager.create_context(workflow_id) 