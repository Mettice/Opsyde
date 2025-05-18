import logging
import importlib
import inspect
from typing import Dict, Any, Optional, Type, List
from datetime import datetime
from pathlib import Path
import json
import asyncio

logger = logging.getLogger(__name__)

class CustomTool:
    """Base class for all custom tools"""
    
    name: str = "base_tool"  # Tool name for registration
    description: str = "Base custom tool"  # Tool description
    version: str = "1.0.0"  # Tool version
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.validate_config()
        
    def validate_config(self):
        """Validate tool configuration"""
        pass
        
    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the tool with given inputs"""
        raise NotImplementedError("Custom tools must implement execute method")
        
    def _format_response(self, success: bool, data: Any = None, error: str = None) -> Dict[str, Any]:
        """Format tool response"""
        response = {
            "success": success,
            "timestamp": datetime.now().isoformat(),
            "tool": {
                "name": self.name,
                "version": self.version
            }
        }
        
        if success:
            response["data"] = data
        else:
            response["error"] = error
            
        return response

class ToolRegistry:
    """Registry for custom tools"""
    
    def __init__(self):
        self._tools: Dict[str, Type[CustomTool]] = {}
        self._instances: Dict[str, Dict[str, CustomTool]] = {}
        
    def register(self, tool_class: Type[CustomTool]):
        """Register a tool class"""
        if not issubclass(tool_class, CustomTool):
            raise ValueError(f"{tool_class.__name__} must inherit from CustomTool")
            
        self._tools[tool_class.name] = tool_class
        logger.info(f"Registered tool: {tool_class.name} (v{tool_class.version})")
        
    def create_instance(self, tool_name: str, instance_id: str, config: Dict[str, Any]) -> CustomTool:
        """Create a tool instance"""
        if tool_name not in self._tools:
            raise ValueError(f"Tool '{tool_name}' not registered")
            
        tool_class = self._tools[tool_name]
        instance = tool_class(config)
        
        if tool_name not in self._instances:
            self._instances[tool_name] = {}
            
        self._instances[tool_name][instance_id] = instance
        return instance
        
    def get_instance(self, tool_name: str, instance_id: str) -> Optional[CustomTool]:
        """Get a tool instance"""
        return self._instances.get(tool_name, {}).get(instance_id)
        
    def list_tools(self) -> List[Dict[str, Any]]:
        """List all registered tools"""
        return [
            {
                "name": tool_class.name,
                "description": tool_class.description,
                "version": tool_class.version
            }
            for tool_class in self._tools.values()
        ]

class PluginLoader:
    """Loads custom tool plugins from a directory"""
    
    def __init__(self, plugin_dir: str = "plugins"):
        self.plugin_dir = Path(plugin_dir)
        self.registry = ToolRegistry()
        
    def load_plugins(self):
        """Load all plugins from the plugin directory"""
        if not self.plugin_dir.exists():
            logger.warning(f"Plugin directory {self.plugin_dir} does not exist")
            return
            
        for plugin_file in self.plugin_dir.glob("*.py"):
            if plugin_file.name.startswith("_"):
                continue
                
            try:
                # Import plugin module
                spec = importlib.util.spec_from_file_location(
                    plugin_file.stem,
                    plugin_file
                )
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                
                # Find and register tool classes
                for name, obj in inspect.getmembers(module):
                    if (inspect.isclass(obj) and 
                        issubclass(obj, CustomTool) and 
                        obj != CustomTool):
                        self.registry.register(obj)
                        
            except Exception as e:
                logger.error(f"Error loading plugin {plugin_file}: {str(e)}")

# Example custom tools

class DataTransformTool(CustomTool):
    """Tool for data transformation operations"""
    
    name = "data_transform"
    description = "Transforms data between different formats"
    version = "1.0.0"
    
    def validate_config(self):
        required = ["input_format", "output_format"]
        if not all(key in self.config for key in required):
            raise ValueError(f"Missing required config: {required}")
            
    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        try:
            input_format = self.config["input_format"]
            output_format = self.config["output_format"]
            
            if input_format == "json" and output_format == "csv":
                result = self._json_to_csv(inputs["data"])
            elif input_format == "csv" and output_format == "json":
                result = self._csv_to_json(inputs["data"])
            else:
                raise ValueError(f"Unsupported conversion: {input_format} → {output_format}")
                
            return self._format_response(True, result)
            
        except Exception as e:
            return self._format_response(False, error=str(e))
            
    def _json_to_csv(self, data: List[Dict]) -> str:
        # Implementation here
        pass
        
    def _csv_to_json(self, data: str) -> List[Dict]:
        # Implementation here
        pass

class DataValidationTool(CustomTool):
    """Tool for data validation"""
    
    name = "data_validation"
    description = "Validates data against schema"
    version = "1.0.0"
    
    def validate_config(self):
        if "schema" not in self.config:
            raise ValueError("Missing schema in config")
            
    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        try:
            schema = self.config["schema"]
            data = inputs["data"]
            
            # Validate data against schema
            validation_result = self._validate_data(data, schema)
            
            return self._format_response(True, validation_result)
            
        except Exception as e:
            return self._format_response(False, error=str(e))
            
    def _validate_data(self, data: Any, schema: Dict) -> Dict[str, Any]:
        # Implementation here
        pass

# Create global registry and plugin loader
tool_registry = ToolRegistry()
plugin_loader = PluginLoader()

# Register built-in tools
tool_registry.register(DataTransformTool)
tool_registry.register(DataValidationTool)

# Example usage:
# plugin_loader.load_plugins()  # Load custom plugins
# transform_tool = tool_registry.create_instance(
#     "data_transform",
#     "instance_1",
#     {"input_format": "json", "output_format": "csv"}
# )
# result = await transform_tool.execute({"data": [{"name": "John"}]})
