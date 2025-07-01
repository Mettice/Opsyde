"""
Schema validation utilities for testing and validating framework configurations
"""
from typing import Dict, Any, List, Optional, Tuple
from ..models.schemas import NodeSchema, SchemaField, SchemaType, ValidationError
from ..models.runner_schemas import (
    BaseRunnerConfig, CrewAIRunnerConfig, LangChainRunnerConfig,
    HuggingFaceRunnerConfig, AutoGenRunnerConfig, LlamaIndexRunnerConfig,
    LLMConfig, ToolConfig
)
from ..framework_registry import FRAMEWORK_METADATA, LLM_METADATA
import logging

logger = logging.getLogger(__name__)

class SchemaValidator:
    """Comprehensive schema validation utility"""
    
    def __init__(self):
        self.validation_results = []
    
    def validate_framework_config(self, framework: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate framework configuration against metadata and schemas"""
        results = {
            "framework": framework,
            "valid": True,
            "errors": [],
            "warnings": [],
            "metadata_validation": {},
            "schema_validation": {},
            "compatibility_check": {}
        }
        
        # 1. Validate against framework metadata
        metadata_result = self._validate_against_metadata(framework, config)
        results["metadata_validation"] = metadata_result
        if not metadata_result["valid"]:
            results["valid"] = False
            results["errors"].extend(metadata_result["errors"])
        
        # 2. Validate against Pydantic schemas
        schema_result = self._validate_against_schema(framework, config)
        results["schema_validation"] = schema_result
        if not schema_result["valid"]:
            results["valid"] = False
            results["errors"].extend(schema_result["errors"])
        
        # 3. Check LLM compatibility
        if "llm_config" in config or "provider" in config:
            compatibility_result = self._check_llm_compatibility(framework, config)
            results["compatibility_check"] = compatibility_result
            if not compatibility_result["valid"]:
                results["warnings"].extend(compatibility_result["warnings"])
        
        return results
    
    def _validate_against_metadata(self, framework: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate configuration against framework metadata"""
        if framework not in FRAMEWORK_METADATA:
            return {
                "valid": False,
                "errors": [f"Framework '{framework}' not found in metadata"]
            }
        
        metadata = FRAMEWORK_METADATA[framework]
        errors = []
        warnings = []
        
        # Check required fields
        for field in metadata.get("required_fields", []):
            if field not in config:
                errors.append(f"Missing required field: {field}")
        
        # Check optional fields (for warnings)
        optional_fields = metadata.get("optional_fields", [])
        for field in config.keys():
            if field not in metadata.get("required_fields", []) and field not in optional_fields:
                warnings.append(f"Unknown field: {field}")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "metadata_version": metadata.get("version", "unknown")
        }
    
    def _validate_against_schema(self, framework: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate configuration against Pydantic schemas"""
        schema_class = self._get_schema_class(framework)
        if not schema_class:
            return {
                "valid": False,
                "errors": [f"No schema class found for framework: {framework}"]
            }
        
        try:
            # Try to create instance from config
            validated_config = schema_class(**config)
            return {
                "valid": True,
                "errors": [],
                "schema_version": getattr(validated_config, 'version', 'unknown')
            }
        except Exception as e:
            return {
                "valid": False,
                "errors": [f"Schema validation failed: {str(e)}"]
            }
    
    def _get_schema_class(self, framework: str):
        """Get the appropriate schema class for a framework"""
        schema_map = {
            # AI Frameworks
            "crewai": CrewAIRunnerConfig,
            "langchain": LangChainRunnerConfig,
            "autogen": AutoGenRunnerConfig,
            "llamaindex": LlamaIndexRunnerConfig,
            "huggingface": HuggingFaceRunnerConfig,
            
            # LLM Providers (use LLMConfig for these)
            "openai": LLMConfig,
            "anthropic": LLMConfig,
            "perplexity": LLMConfig,
            "openrouter": LLMConfig,
            "gemini": LLMConfig,
            "mistral": LLMConfig,
            "cohere": LLMConfig,
            
            # Tool Types (use ToolConfig for these)
            "api": ToolConfig,
            "webhook": ToolConfig,
            "universal_api": ToolConfig,
            "communication": ToolConfig,
            "productivity": ToolConfig,
            "developer": ToolConfig,
            "marketing": ToolConfig,
            "crm": ToolConfig,
            "social_media": ToolConfig,
            "ecommerce": ToolConfig,
            "storage": ToolConfig,
            
            # Structural Nodes (use BaseRunnerConfig for these)
            "task": BaseRunnerConfig,
            "logic": BaseRunnerConfig,
            "trigger": BaseRunnerConfig,
            "input": BaseRunnerConfig,
            "output": BaseRunnerConfig,
            "delay": BaseRunnerConfig,
            "chat": BaseRunnerConfig,
            "output_webhook": BaseRunnerConfig,
            "output_email": BaseRunnerConfig,
            "output_file": BaseRunnerConfig,
            "output_database": BaseRunnerConfig,
            "output_cms": BaseRunnerConfig
        }
        return schema_map.get(framework.lower())
    
    def _check_llm_compatibility(self, framework: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Check LLM provider compatibility"""
        if framework not in FRAMEWORK_METADATA:
            return {"valid": False, "warnings": ["Framework not found"]}
        
        metadata = FRAMEWORK_METADATA[framework]
        supported_providers = metadata.get("supported_llm_providers", [])
        
        # Extract provider from config
        provider = None
        if "llm_config" in config and config["llm_config"]:
            provider = config["llm_config"].get("provider")
        elif "provider" in config:
            provider = config["provider"]
        
        if not provider:
            return {"valid": True, "warnings": ["No LLM provider specified"]}
        
        if provider not in supported_providers:
            return {
                "valid": False,
                "warnings": [f"Provider '{provider}' not in supported list: {supported_providers}"]
            }
        
        return {"valid": True, "warnings": []}
    
    def validate_node_schema(self, schema: NodeSchema, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate data against a NodeSchema"""
        is_valid, errors = schema.validate_data(data)
        
        return {
            "valid": is_valid,
            "errors": [error.dict() for error in errors],
            "schema_version": schema.version,
            "required_fields": schema.get_required_fields(),
            "optional_fields": schema.get_optional_fields()
        }
    
    def generate_test_cases(self, framework: str) -> List[Dict[str, Any]]:
        """Generate test cases for framework validation"""
        if framework not in FRAMEWORK_METADATA:
            return []
        
        metadata = FRAMEWORK_METADATA[framework]
        test_cases = []
        
        # Get schema class to understand actual requirements
        schema_class = self._get_schema_class(framework)
        
        # Valid configuration - use realistic defaults based on framework type
        valid_config = self._generate_realistic_config(framework, metadata, schema_class)
        
        test_cases.append({
            "name": "Valid Configuration",
            "config": valid_config,
            "expected_valid": True
        })
        
        # Missing required field tests - only test fields that are actually required
        if schema_class:
            # Get actual required fields from schema
            required_fields = []
            if hasattr(schema_class, 'model_fields'):
                # Pydantic v2
                for field_name, field in schema_class.model_fields.items():
                    if field.is_required():
                        required_fields.append(field_name)
            elif hasattr(schema_class, '__fields__'):
                # Pydantic v1
                for field_name, field in schema_class.__fields__.items():
                    if field.required:
                        required_fields.append(field_name)
            
            # Test missing required fields
            for field in required_fields[:3]:  # Limit to first 3 to avoid too many test cases
                invalid_config = valid_config.copy()
                if field in invalid_config:
                    del invalid_config[field]
                    test_cases.append({
                        "name": f"Missing Required Field: {field}",
                        "config": invalid_config,
                        "expected_valid": False
                    })
        else:
            # Fallback to metadata required fields
            for field in metadata.get("required_fields", [])[:3]:
                invalid_config = valid_config.copy()
                if field in invalid_config:
                    del invalid_config[field]
                    test_cases.append({
                        "name": f"Missing Required Field: {field}",
                        "config": invalid_config,
                        "expected_valid": False
                    })
        
        return test_cases
    
    def _generate_realistic_config(self, framework: str, metadata: Dict[str, Any], schema_class) -> Dict[str, Any]:
        """Generate realistic configuration based on framework type"""
        base_config = {
            "framework": framework,
            "temperature": 0.7,
            "max_tokens": 1000
        }
        
        # Framework-specific configurations
        if framework in ["crewai", "langchain", "autogen", "llamaindex", "huggingface"]:
            # AI Framework configs
            base_config.update({
                "provider": "openai",
                "model": "gpt-4"
            })
            
            if framework == "crewai":
                base_config.update({
                    "role": "Software Developer",
                    "goal": "Create a web application"
                })
            elif framework == "langchain":
                base_config.update({
                    "chain_type": "llm"
                })
            elif framework == "autogen":
                base_config.update({
                    "agent_type": "assistant"
                })
            elif framework == "llamaindex":
                base_config.update({
                    "index_type": "vector",
                    "chunk_size": 512
                })
            elif framework == "huggingface":
                base_config.update({
                    "task_type": "text-generation",
                    "model_name": "gpt2",
                    "framework": "huggingface"  # Use correct framework name
                })
                
        elif framework in ["openai", "anthropic", "perplexity", "openrouter", "gemini", "mistral", "cohere"]:
            # LLM Provider configs
            base_config.update({
                "provider": framework,
                "model": "gpt-4" if framework == "openai" else "claude-3-opus" if framework == "anthropic" else "sonar-pro" if framework == "perplexity" else "openai/gpt-4" if framework == "openrouter" else "gemini-pro" if framework == "gemini" else "test-model",
                "framework": "openai"  # Required field for LLMConfig
            })
            
        elif framework in ["api", "webhook", "universal_api", "communication", "productivity", "developer", "marketing", "crm", "social_media", "ecommerce", "storage"]:
            # Tool configs
            base_config.update({
                "tool_type": framework if framework in ["api", "webhook", "universal_api"] else "api",
                "framework": framework,
                "endpoint": "https://api.example.com" if framework == "api" else None,
                "url": "https://webhook.example.com" if framework == "webhook" else None,
                "api_service_name": "test_service" if framework == "universal_api" else None
            })
            
        elif framework in ["task", "logic", "trigger", "input", "output", "delay", "chat", "output_webhook", "output_email", "output_file", "output_database", "output_cms"]:
            # Structural node configs
            base_config.update({
                "framework": framework,
                "provider": "openai",
                "model": "gpt-4",
                "description": "Test node"
            })
            
            if framework == "chat":
                base_config.update({
                    "prompt": "Hello, how are you?"
                })
            elif framework == "output":
                base_config.update({
                    "output_type": "email"
                })
            elif framework == "logic":
                base_config.update({
                    "condition": "input.value > 10"
                })
            elif framework == "trigger":
                base_config.update({
                    "trigger_type": "manual"
                })
            elif framework == "delay":
                base_config.update({
                    "duration": 60
                })
            elif framework == "output_webhook":
                base_config.update({
                    "webhook_url": "https://webhook.example.com"
                })
            elif framework == "output_email":
                base_config.update({
                    "to": "test@example.com",
                    "subject": "Test Email"
                })
            elif framework == "output_file":
                base_config.update({
                    "file_path": "/tmp/test.txt"
                })
            elif framework == "output_database":
                base_config.update({
                    "connection_string": "sqlite:///test.db",
                    "table": "test_table"
                })
            elif framework == "output_cms":
                base_config.update({
                    "cms_type": "wordpress"
                })
        
        return base_config
    
    def compare_schema_versions(self, framework: str) -> Dict[str, Any]:
        """Compare metadata and schema versions for a framework"""
        metadata = FRAMEWORK_METADATA.get(framework, {})
        schema_class = self._get_schema_class(framework)
        
        result = {
            "framework": framework,
            "metadata_version": metadata.get("version", "unknown"),
            "schema_version": "unknown",
            "field_alignment": {},
            "discrepancies": []
        }
        
        if schema_class:
            # Get schema fields from Pydantic model
            schema_fields = list(schema_class.__fields__.keys())
            metadata_required = metadata.get("required_fields", [])
            metadata_optional = metadata.get("optional_fields", [])
            metadata_all = metadata_required + metadata_optional
            
            # Check field alignment
            schema_only = set(schema_fields) - set(metadata_all)
            metadata_only = set(metadata_all) - set(schema_fields)
            
            if schema_only:
                result["discrepancies"].append(f"Fields only in schema: {list(schema_only)}")
            if metadata_only:
                result["discrepancies"].append(f"Fields only in metadata: {list(metadata_only)}")
            
            result["field_alignment"] = {
                "schema_fields": schema_fields,
                "metadata_fields": metadata_all,
                "schema_only": list(schema_only),
                "metadata_only": list(metadata_only)
            }
        
        return result

def validate_all_frameworks() -> Dict[str, Any]:
    """Validate all framework configurations"""
    validator = SchemaValidator()
    results = {}
    
    for framework in FRAMEWORK_METADATA.keys():
        # Generate test cases
        test_cases = validator.generate_test_cases(framework)
        
        # Run validation for each test case
        framework_results = []
        for test_case in test_cases:
            validation_result = validator.validate_framework_config(
                framework, 
                test_case["config"]
            )
            framework_results.append({
                "test_case": test_case["name"],
                "expected_valid": test_case["expected_valid"],
                "actual_valid": validation_result["valid"],
                "passed": test_case["expected_valid"] == validation_result["valid"],
                "errors": validation_result["errors"],
                "warnings": validation_result["warnings"]
            })
        
        # Compare schema versions
        version_comparison = validator.compare_schema_versions(framework)
        
        results[framework] = {
            "test_results": framework_results,
            "version_comparison": version_comparison,
            "overall_valid": all(r["passed"] for r in framework_results)
        }
    
    return results

def generate_schema_report() -> Dict[str, Any]:
    """Generate a comprehensive schema analysis report"""
    validator = SchemaValidator()
    
    report = {
        "summary": {
            "total_frameworks": len(FRAMEWORK_METADATA),
            "total_llm_providers": len(LLM_METADATA),
            "validation_results": {}
        },
        "framework_details": {},
        "recommendations": []
    }
    
    # Validate all frameworks
    validation_results = validate_all_frameworks()
    
    for framework, results in validation_results.items():
        report["framework_details"][framework] = {
            "metadata": FRAMEWORK_METADATA[framework],
            "validation": results,
            "schema_class": validator._get_schema_class(framework).__name__ if validator._get_schema_class(framework) else None
        }
    
    # Generate recommendations
    for framework, details in report["framework_details"].items():
        validation = details["validation"]
        
        if not validation["overall_valid"]:
            report["recommendations"].append({
                "framework": framework,
                "type": "validation_error",
                "message": f"Framework '{framework}' has validation issues",
                "details": validation["test_results"]
            })
        
        version_comp = validation["version_comparison"]
        if version_comp["discrepancies"]:
            report["recommendations"].append({
                "framework": framework,
                "type": "version_mismatch",
                "message": f"Schema version mismatch for '{framework}'",
                "details": version_comp["discrepancies"]
            })
    
    return report 