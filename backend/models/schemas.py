from typing import Dict, Any, Optional, List, Union, Tuple
from pydantic import BaseModel, Field, validator
from enum import Enum

class SchemaType(str, Enum):
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    OBJECT = "object"
    ARRAY = "array"
    ANY = "any"

class ValidationError(BaseModel):
    """Detailed validation error information"""
    field_path: str
    error_type: str
    message: str
    expected_type: Optional[str] = None
    actual_value: Optional[Any] = None

class SchemaField(BaseModel):
    """Definition of a single field in a schema"""
    type: SchemaType
    description: str
    optional: bool = False
    default: Optional[Any] = None
    enum: Optional[List[Any]] = None
    properties: Optional[Dict[str, 'SchemaField']] = None
    items: Optional['SchemaField'] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    pattern: Optional[str] = None
    minimum: Optional[float] = None
    maximum: Optional[float] = None
    version: Optional[str] = Field(default="1.0", description="Schema version")

    @validator('properties')
    def validate_properties(cls, v, values):
        if values.get('type') == SchemaType.OBJECT and not v:
            raise ValueError("Object type must have properties defined")
        return v

    @validator('items')
    def validate_items(cls, v, values):
        if values.get('type') == SchemaType.ARRAY and not v:
            raise ValueError("Array type must have items defined")
        return v

class NodeSchema(BaseModel):
    """Complete schema definition for a node's inputs or outputs"""
    fields: Dict[str, SchemaField]
    required_fields: List[str] = Field(default_factory=list)
    additional_properties: bool = False
    version: str = Field(default="1.0", description="Schema version")
    description: Optional[str] = Field(default=None, description="Schema description")

    def validate_data(self, data: Dict[str, Any]) -> Tuple[bool, List[ValidationError]]:
        """Validate data against this schema with detailed error reporting"""
        errors = []
        
        # Check required fields
        for field in self.required_fields:
            if field not in data:
                errors.append(ValidationError(
                    field_path=field,
                    error_type="missing_required_field",
                    message=f"Required field '{field}' is missing"
                ))

        # Validate each field
        for field_name, field_value in data.items():
            if field_name not in self.fields and not self.additional_properties:
                errors.append(ValidationError(
                    field_path=field_name,
                    error_type="unknown_field",
                    message=f"Field '{field_name}' is not defined in schema"
                ))
                continue

            field_schema = self.fields.get(field_name)
            if field_schema:
                field_errors = self._validate_field(field_value, field_schema, field_name)
                errors.extend(field_errors)

        return len(errors) == 0, errors

    def _validate_field(self, value: Any, schema: SchemaField, field_path: str) -> List[ValidationError]:
        """Validate a single field against its schema with detailed error reporting"""
        errors = []
        
        if value is None:
            if not schema.optional:
                errors.append(ValidationError(
                    field_path=field_path,
                    error_type="null_value",
                    message=f"Field '{field_path}' cannot be null",
                    expected_type=schema.type.value
                ))
            return errors

        # Type validation
        if schema.type == SchemaType.OBJECT:
            if not isinstance(value, dict):
                errors.append(ValidationError(
                    field_path=field_path,
                    error_type="type_mismatch",
                    message=f"Field '{field_path}' must be an object",
                    expected_type="object",
                    actual_value=type(value).__name__
                ))
            elif schema.properties:
                for prop_name, prop_schema in schema.properties.items():
                    if prop_name in value:
                        prop_errors = self._validate_field(
                            value[prop_name], 
                            prop_schema, 
                            f"{field_path}.{prop_name}"
                        )
                        errors.extend(prop_errors)

        elif schema.type == SchemaType.ARRAY:
            if not isinstance(value, list):
                errors.append(ValidationError(
                    field_path=field_path,
                    error_type="type_mismatch",
                    message=f"Field '{field_path}' must be an array",
                    expected_type="array",
                    actual_value=type(value).__name__
                ))
            elif schema.items:
                for i, item in enumerate(value):
                    item_errors = self._validate_field(
                        item, 
                        schema.items, 
                        f"{field_path}[{i}]"
                    )
                    errors.extend(item_errors)

        elif schema.type == SchemaType.STRING:
            if not isinstance(value, str):
                errors.append(ValidationError(
                    field_path=field_path,
                    error_type="type_mismatch",
                    message=f"Field '{field_path}' must be a string",
                    expected_type="string",
                    actual_value=type(value).__name__
                ))
            else:
                if schema.min_length and len(value) < schema.min_length:
                    errors.append(ValidationError(
                        field_path=field_path,
                        error_type="length_validation",
                        message=f"Field '{field_path}' must be at least {schema.min_length} characters",
                        actual_value=len(value)
                    ))
                if schema.max_length and len(value) > schema.max_length:
                    errors.append(ValidationError(
                        field_path=field_path,
                        error_type="length_validation",
                        message=f"Field '{field_path}' must be at most {schema.max_length} characters",
                        actual_value=len(value)
                    ))
                if schema.pattern:
                    import re
                    if not re.match(schema.pattern, value):
                        errors.append(ValidationError(
                            field_path=field_path,
                            error_type="pattern_validation",
                            message=f"Field '{field_path}' does not match pattern '{schema.pattern}'"
                        ))

        elif schema.type == SchemaType.NUMBER:
            if not isinstance(value, (int, float)):
                errors.append(ValidationError(
                    field_path=field_path,
                    error_type="type_mismatch",
                    message=f"Field '{field_path}' must be a number",
                    expected_type="number",
                    actual_value=type(value).__name__
                ))
            else:
                if schema.minimum is not None and value < schema.minimum:
                    errors.append(ValidationError(
                        field_path=field_path,
                        error_type="range_validation",
                        message=f"Field '{field_path}' must be at least {schema.minimum}",
                        actual_value=value
                    ))
                if schema.maximum is not None and value > schema.maximum:
                    errors.append(ValidationError(
                        field_path=field_path,
                        error_type="range_validation",
                        message=f"Field '{field_path}' must be at most {schema.maximum}",
                        actual_value=value
                    ))

        elif schema.type == SchemaType.BOOLEAN:
            if not isinstance(value, bool):
                errors.append(ValidationError(
                    field_path=field_path,
                    error_type="type_mismatch",
                    message=f"Field '{field_path}' must be a boolean",
                    expected_type="boolean",
                    actual_value=type(value).__name__
                ))

        # Enum validation
        if schema.enum and value not in schema.enum:
            errors.append(ValidationError(
                field_path=field_path,
                error_type="enum_validation",
                message=f"Field '{field_path}' must be one of {schema.enum}",
                actual_value=value
            ))

        return errors

    def get_field_info(self, field_name: str) -> Optional[SchemaField]:
        """Get information about a specific field"""
        return self.fields.get(field_name)

    def get_required_fields(self) -> List[str]:
        """Get list of required fields"""
        return self.required_fields.copy()

    def get_optional_fields(self) -> List[str]:
        """Get list of optional fields"""
        return [name for name in self.fields.keys() if name not in self.required_fields] 