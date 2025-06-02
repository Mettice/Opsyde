"""
Universal Data Transformation Layer
Handles conversion between any API data structure and our standardized node format
"""

import json
import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
import re

logger = logging.getLogger(__name__)

class DataType(Enum):
    """Standard data types in our system"""
    TEXT = "text"
    NUMBER = "number"
    BOOLEAN = "boolean"
    DATE = "date"
    ARRAY = "array"
    OBJECT = "object"
    URL = "url"
    EMAIL = "email"
    PHONE = "phone"
    CURRENCY = "currency"
    PERCENTAGE = "percentage"

@dataclass
class StandardField:
    """Standard field definition in our system"""
    name: str
    type: DataType
    value: Any
    confidence: float = 1.0
    source_path: str = ""
    metadata: Dict[str, Any] = None

@dataclass
class StandardRecord:
    """Standard record format that flows between nodes"""
    id: str
    fields: List[StandardField]
    record_type: str = "generic"
    source_api: str = ""
    timestamp: str = ""
    metadata: Dict[str, Any] = None

class UniversalDataTransformer:
    """
    Universal data transformer that converts any API response 
    to our standardized format using AI-powered semantic understanding
    """
    
    def __init__(self):
        self.field_mappings = {}
        self.semantic_cache = {}
        
    async def transform_api_response(
        self, 
        api_data: Dict[str, Any], 
        source_name: str,
        context: Optional[Dict[str, Any]] = None
    ) -> List[StandardRecord]:
        """
        Transform API response into standardized records with optional smart summarization
        
        Args:
            api_data: Raw API response data
            source_name: Name of the API source
            context: Optional context including summarization settings
            
        Returns:
            List of standardized records
        """
        try:
            # Extract summarization settings from context (ChatGPT's approach)
            summary_mode = context.get('summary_mode', False) if context else False
            target_fields = context.get('target_fields', []) if context else []
            exclude_fields = context.get('exclude_fields', []) if context else []
            max_records = context.get('max_records', 10) if context else 10
            max_tokens = context.get('max_tokens', 4000) if context else 4000
            
            logger.info(f"🧠 Transform API response: source={source_name}, summary_mode={summary_mode}")
            
            # Step 1: Extract records from API response
            records_data = self._extract_records(api_data, source_name)
            
            if not records_data:
                logger.warning(f"No records found in {source_name} response")
                return []
            
            # Step 2: Apply ChatGPT's smart filtering if enabled
            if summary_mode:
                logger.info(f"🎯 Applying smart summarization: max_records={max_records}, target_fields={len(target_fields)}")
                records_data = self._apply_smart_filtering(
                    records_data, 
                    target_fields, 
                    exclude_fields, 
                    max_records,
                    source_name
                )
            
            # Step 3: Transform each record
            standard_records = []
            token_count = 0
            
            for i, record_data in enumerate(records_data):
                try:
                    # Create standard record
                    record = StandardRecord(
                        id=self._generate_record_id(record_data, i),
                        fields=self._transform_fields(record_data, source_name),
                        record_type=self._detect_record_type(record_data, source_name),
                        source_api=source_name,
                        timestamp=datetime.now().isoformat(),
                        metadata={
                            'transformation_timestamp': datetime.now().isoformat(),
                            'source_confidence': self._calculate_confidence(record_data, source_name),
                            'original_index': i,
                            'smart_filtering_applied': summary_mode,
                            'raw_data': record_data  # Store raw data in metadata instead
                        }
                    )
                    
                    # Token estimation for smart summarization
                    if summary_mode:
                        estimated_tokens = self._estimate_record_tokens(record)
                        if token_count + estimated_tokens > max_tokens:
                            logger.info(f"🚫 Token limit reached ({token_count}/{max_tokens}), stopping at record {i}")
                            break
                        token_count += estimated_tokens
                    
                    standard_records.append(record)
                    
                except Exception as e:
                    logger.error(f"Error transforming record {i}: {str(e)}")
                    continue
            
            logger.info(f"✅ Transformed {len(standard_records)} records from {source_name}")
            if summary_mode:
                logger.info(f"📊 Token usage: {token_count}/{max_tokens} ({(token_count/max_tokens)*100:.1f}%)")
            
            return standard_records
            
        except Exception as e:
            logger.error(f"Error transforming API response: {str(e)}")
            return []

    def _apply_smart_filtering(
        self, 
        records_data: List[Dict], 
        target_fields: List[str], 
        exclude_fields: List[str],
        max_records: int,
        source_name: str
    ) -> List[Dict]:
        """
        Apply smart filtering strategy respecting user configuration
        """
        try:
            # Respect user configuration - no more emergency overrides!
            logger.info(f"🎯 Applying smart filtering: max_records={max_records}, target_fields={len(target_fields)}, exclude_fields={len(exclude_fields)}")
            
            # Step 1: Limit number of records based on user setting
            if len(records_data) > max_records:
                records_data = records_data[:max_records]
                logger.info(f"🎯 Limited to {max_records} records (was {len(records_data)})")
            
            # Step 2: Apply field filtering based on user configuration
            if target_fields or exclude_fields:
                filtered_records = []
                for record in records_data:
                    filtered_record = self._filter_record_fields(record, target_fields, exclude_fields)
                    filtered_records.append(filtered_record)
                records_data = filtered_records
                logger.info(f"🎯 Applied field filtering: include={len(target_fields)}, exclude={len(exclude_fields)}")
            
            # Step 3: Apply source-specific optimizations (user-friendly suggestions, not overrides)
            if 'dexscreener' in source_name.lower() and not target_fields and not exclude_fields:
                # Provide helpful defaults for DexScreener, but don't force them
                logger.info(f"💡 DexScreener detected - consider using target fields like: baseToken.symbol, priceUsd, liquidity.usd")
            
            # Step 4: Apply source-specific optimizations
            optimized_records = []
            for record in records_data:
                optimized_record = self._apply_source_specific_filtering(record, source_name)
                optimized_records.append(optimized_record)
            
            logger.info(f"🎯 Smart filtering complete: {len(optimized_records)} records processed")
            return optimized_records
            
        except Exception as e:
            logger.error(f"Error in smart filtering: {str(e)}")
            # Emergency fallback: return only first record with minimal data
            if records_data:
                emergency_record = {
                    'symbol': records_data[0].get('baseToken', {}).get('symbol', 'UNKNOWN'),
                    'price': records_data[0].get('priceUsd', 'N/A')
                }
                return [emergency_record]
            return []

    def _apply_source_specific_filtering(self, record: Dict, source_name: str) -> Dict:
        """
        Apply source-specific smart filtering (ChatGPT's approach)
        """
        try:
            source_lower = source_name.lower()
            
            # DexScreener specific filtering (ChatGPT's crypto optimization)
            if 'dexscreener' in source_lower:
                # EMERGENCY: Ultra-aggressive filtering for token limiting
                essential_fields = {
                    'baseToken': {
                        'symbol': record.get('baseToken', {}).get('symbol', 'Unknown'),
                        'name': record.get('baseToken', {}).get('name', 'Unknown')
                    },
                    'priceUsd': str(record.get('priceUsd', '0'))[:10],  # Limit string length
                    'liquidity': {'usd': str(record.get('liquidity', {}).get('usd', '0'))[:15]},
                    'volume': {'h24': str(record.get('volume', {}).get('h24', '0'))[:15]},
                    'priceChange': {'h24': str(record.get('priceChange', {}).get('h24', '0'))[:10]},
                    'chainId': str(record.get('chainId', 'unknown'))[:20]
                }
                
                return essential_fields
            
            # Airtable specific filtering
            elif 'airtable' in source_lower:
                # Keep fields object and essential metadata
                return {
                    'id': record.get('id'),
                    'fields': record.get('fields', {}),
                    'createdTime': record.get('createdTime')
                }
            
            # Default: return as-is
            return record
            
        except Exception as e:
            logger.error(f"Error in source-specific filtering: {str(e)}")
            return record

    def _estimate_record_tokens(self, record: StandardRecord) -> int:
        """
        Estimate token usage for a record (ChatGPT's token optimization)
        """
        try:
            # Simple estimation: ~4 characters per token
            text_content = str(record.raw_data)
            return len(text_content) // 4
        except:
            return 100  # Default estimate

    def _get_nested_field(self, data: Dict, field_path: str) -> Any:
        """Get nested field value using dot notation"""
        try:
            keys = field_path.split('.')
            current = data
            
            for key in keys:
                if isinstance(current, dict) and key in current:
                    current = current[key]
                else:
                    return None
            
            return current
        except:
            return None

    def _set_nested_field(self, data: Dict, field_path: str, value: Any):
        """Set nested field value using dot notation"""
        try:
            keys = field_path.split('.')
            current = data
            
            for key in keys[:-1]:
                if key not in current:
                    current[key] = {}
                current = current[key]
            
            current[keys[-1]] = value
        except:
            pass

    def _remove_nested_field(self, data: Dict, field_path: str):
        """Remove nested field using dot notation"""
        try:
            keys = field_path.split('.')
            current = data
            
            for key in keys[:-1]:
                if isinstance(current, dict) and key in current:
                    current = current[key]
                else:
                    return
            
            if isinstance(current, dict) and keys[-1] in current:
                del current[keys[-1]]
        except:
            pass
    
    async def _analyze_data_structure(self, data: Any, source_api: str) -> Dict[str, Any]:
        """
        Analyze the structure of incoming data using AI
        """
        try:
            # Use AI to understand the data structure
            analysis_prompt = f"""
            Analyze this API response structure and provide a JSON analysis:
            
            API: {source_api}
            Data: {json.dumps(data, indent=2)[:2000]}...
            
            Return ONLY this JSON format:
            {{
                "data_type": "array|object|primitive",
                "record_location": "path.to.records.array",
                "record_count": number,
                "field_mappings": {{
                    "semantic_field_name": {{
                        "source_path": "actual.path.in.data",
                        "data_type": "text|number|boolean|date|array|object",
                        "confidence": 0.95,
                        "examples": ["sample", "values"]
                    }}
                }},
                "api_pattern": "airtable|notion|slack|github|generic",
                "primary_id_field": "path.to.id.field"
            }}
            
            Focus on semantic meaning:
            - "title" could be "name", "subject", "heading"
            - "description" could be "content", "body", "text"
            - "created_date" could be "timestamp", "date", "created_at"
            - "status" could be "state", "condition", "phase"
            """
            
            # Get AI analysis
            ai_analysis = await self._get_ai_analysis(analysis_prompt)
            
            # Parse AI response
            if ai_analysis:
                try:
                    return json.loads(ai_analysis)
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse AI analysis for {source_api}")
            
            # Fallback to rule-based analysis
            return self._fallback_structure_analysis(data, source_api)
            
        except Exception as e:
            logger.error(f"Error analyzing structure for {source_api}: {str(e)}")
            return self._fallback_structure_analysis(data, source_api)
    
    def _fallback_structure_analysis(self, data: Any, source_api: str) -> Dict[str, Any]:
        """
        Fallback rule-based structure analysis when AI fails
        """
        analysis = {
            "data_type": "unknown",
            "record_location": "",
            "record_count": 0,
            "field_mappings": {},
            "api_pattern": "generic",
            "primary_id_field": ""
        }
        
        if isinstance(data, list):
            analysis["data_type"] = "array"
            analysis["record_location"] = "root"
            analysis["record_count"] = len(data)
            
            # Analyze first item for field mappings
            if data and isinstance(data[0], dict):
                analysis["field_mappings"] = self._analyze_object_fields(data[0])
                
        elif isinstance(data, dict):
            analysis["data_type"] = "object"
            
            # Look for common array patterns
            array_fields = [k for k, v in data.items() if isinstance(v, list)]
            if array_fields:
                # Use the largest array as records
                largest_array = max(array_fields, key=lambda k: len(data[k]))
                analysis["record_location"] = largest_array
                analysis["record_count"] = len(data[largest_array])
                
                # Analyze first record
                if data[largest_array] and isinstance(data[largest_array][0], dict):
                    analysis["field_mappings"] = self._analyze_object_fields(data[largest_array][0])
            else:
                # Single object
                analysis["record_location"] = "root"
                analysis["record_count"] = 1
                analysis["field_mappings"] = self._analyze_object_fields(data)
        
        # Detect API patterns
        if "records" in str(data).lower() and "fields" in str(data).lower():
            analysis["api_pattern"] = "airtable"
        elif "pairs" in str(data).lower() and "baseToken" in str(data).lower():
            analysis["api_pattern"] = "dexscreener"
        elif "messages" in str(data).lower() and "channel" in str(data).lower():
            analysis["api_pattern"] = "slack"
        
        return analysis
    
    def _analyze_object_fields(self, obj: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze fields in an object and map them to semantic meanings
        """
        field_mappings = {}
        
        for key, value in obj.items():
            # Determine semantic meaning based on key name and value
            semantic_name = self._get_semantic_field_name(key, value)
            data_type = self._detect_data_type(value)
            
            field_mappings[semantic_name] = {
                "source_path": key,
                "data_type": data_type.value,
                "confidence": self._calculate_confidence(key, semantic_name),
                "examples": [str(value)[:100]] if value is not None else []
            }
        
        return field_mappings
    
    def _get_semantic_field_name(self, key: str, value: Any) -> str:
        """Convert technical field names to semantic names"""
        try:
            # Universal field mappings - covers crypto, business, and common API patterns
            semantic_mappings = {
                # Crypto/DexScreener specific
                'pairAddress': 'Pair Address',
                'baseToken': 'Base Token',
                'quoteToken': 'Quote Token',
                'priceUsd': 'Price (USD)',
                'priceNative': 'Price (Native)',
                'priceChange': 'Price Change',
                'liquidity': 'Liquidity',
                'volume': 'Volume',
                'marketCap': 'Market Cap',
                'fdv': 'Fully Diluted Value',
                'chainId': 'Chain ID',
                'dexId': 'DEX ID',
                'pairCreatedAt': 'Pair Created',
                
                # Business/CRM fields
                'firstName': 'First Name',
                'lastName': 'Last Name',
                'fullName': 'Full Name',
                'companyName': 'Company Name',
                'jobTitle': 'Job Title',
                'phoneNumber': 'Phone Number',
                'emailAddress': 'Email Address',
                'streetAddress': 'Street Address',
                'postalCode': 'Postal Code',
                'dateOfBirth': 'Date of Birth',
                
                # Airtable/Database fields
                'createdTime': 'Created Time',
                'lastModified': 'Last Modified',
                'recordId': 'Record ID',
                'tableId': 'Table ID',
                'baseId': 'Base ID',
                
                # E-commerce fields
                'productName': 'Product Name',
                'productPrice': 'Product Price',
                'orderTotal': 'Order Total',
                'orderStatus': 'Order Status',
                'customerId': 'Customer ID',
                'orderId': 'Order ID',
                'inventoryCount': 'Inventory Count',
                
                # Social/Content fields
                'postTitle': 'Post Title',
                'postContent': 'Post Content',
                'authorName': 'Author Name',
                'publishDate': 'Publish Date',
                'viewCount': 'View Count',
                'likeCount': 'Like Count',
                'commentCount': 'Comment Count',
                
                # Generic common fields
                'symbol': 'Symbol',
                'name': 'Name',
                'address': 'Address',
                'url': 'URL',
                'info': 'Information',
                'boosts': 'Boosts',
                'status': 'Status',
                'description': 'Description',
                'category': 'Category',
                'tags': 'Tags',
                'priority': 'Priority',
                'assignee': 'Assignee',
                'dueDate': 'Due Date',
                'startDate': 'Start Date',
                'endDate': 'End Date',
                'updatedAt': 'Updated At',
                'createdAt': 'Created At'
            }
            
            # Return mapped name if exists
            if key in semantic_mappings:
                return semantic_mappings[key]
            
            # Convert camelCase to Title Case
            # Split camelCase
            words = re.sub('([A-Z][a-z]+)', r' \1', re.sub('([a-z0-9])([A-Z])', r'\1 \2', key)).split()
            # Capitalize each word
            return ' '.join(word.capitalize() for word in words if word)
            
        except Exception as e:
            logger.error(f"Error getting semantic field name for {key}: {str(e)}")
            return key.replace('_', ' ').title()
    
    def _detect_data_type(self, value: Any) -> DataType:
        """
        Detect the data type of a value
        """
        if value is None:
            return DataType.TEXT
        
        if isinstance(value, bool):
            return DataType.BOOLEAN
        
        if isinstance(value, (int, float)):
            return DataType.NUMBER
        
        if isinstance(value, list):
            return DataType.ARRAY
        
        if isinstance(value, dict):
            return DataType.OBJECT
        
        if isinstance(value, str):
            # Check for specific patterns
            if '@' in value and '.' in value:
                return DataType.EMAIL
            elif value.startswith(('http://', 'https://')):
                return DataType.URL
            elif value.replace('.', '').replace('-', '').isdigit():
                return DataType.NUMBER
            elif '%' in value:
                return DataType.PERCENTAGE
            elif '$' in value or any(curr in value.lower() for curr in ['usd', 'eur', 'gbp']):
                return DataType.CURRENCY
            else:
                return DataType.TEXT
        
        return DataType.TEXT
    
    def _calculate_confidence(self, original_key: str, semantic_name: str) -> float:
        """
        Calculate confidence score for field mapping
        """
        if original_key.lower() == semantic_name.lower():
            return 1.0
        
        # Check for partial matches
        if semantic_name.lower() in original_key.lower():
            return 0.9
        
        # Check for common variations
        variations = {
            'title': ['name', 'subject', 'heading'],
            'description': ['content', 'body', 'text'],
            'created_date': ['created_at', 'timestamp', 'date'],
            'status': ['state', 'condition']
        }
        
        if semantic_name in variations:
            for variation in variations[semantic_name]:
                if variation in original_key.lower():
                    return 0.8
        
        return 0.5
    
    def _extract_records(self, data: Any, source_api: str) -> List[Dict[str, Any]]:
        """
        Extract individual records from the data based on structure analysis
        """
        # Use synchronous analysis instead of async
        structure_analysis = self._fallback_structure_analysis(data, source_api)
        record_location = structure_analysis.get("record_location", "")
        
        if not record_location or record_location == "root":
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                return [data]
            else:
                return [{"value": data}]
        
        # Navigate to the record location
        try:
            current = data
            for part in record_location.split('.'):
                if part in current:
                    current = current[part]
                else:
                    logger.warning(f"Path {record_location} not found in data")
                    return [data]
            
            if isinstance(current, list):
                return current
            else:
                return [current]
                
        except Exception as e:
            logger.error(f"Error extracting records: {str(e)}")
            return [data]
    
    async def _transform_record(
        self, 
        raw_record: Dict[str, Any], 
        source_api: str,
        structure_analysis: Dict[str, Any],
        record_id: str
    ) -> StandardRecord:
        """
        Transform a single record to standard format
        """
        fields = []
        field_mappings = structure_analysis.get("field_mappings", {})
        
        # Transform each field based on mappings
        for semantic_name, mapping_info in field_mappings.items():
            source_path = mapping_info["source_path"]
            data_type = DataType(mapping_info["data_type"])
            confidence = mapping_info["confidence"]
            
            # Extract value from raw record
            value = self._extract_value_by_path(raw_record, source_path)
            
            if value is not None:
                # Create standard field
                field = StandardField(
                    name=semantic_name,
                    type=data_type,
                    value=value,
                    confidence=confidence,
                    source_path=source_path,
                    metadata={
                        "original_key": source_path,
                        "transformation_method": "ai_semantic"
                    }
                )
                fields.append(field)
        
        # Add any unmapped fields as raw data
        for key, value in raw_record.items():
            if not any(f.source_path == key for f in fields):
                field = StandardField(
                    name=f"raw_{key}",
                    type=self._detect_data_type(value),
                    value=value,
                    confidence=0.3,
                    source_path=key,
                    metadata={
                        "original_key": key,
                        "transformation_method": "raw_passthrough"
                    }
                )
                fields.append(field)
        
        return StandardRecord(
            id=record_id,
            fields=fields,
            record_type=structure_analysis.get("api_pattern", "generic"),
            source_api=source_api,
            timestamp=datetime.now().isoformat(),
            metadata={
                "transformation_confidence": sum(f.confidence for f in fields) / len(fields) if fields else 0,
                "field_count": len(fields),
                "structure_analysis": structure_analysis
            }
        )
    
    def _extract_value_by_path(self, data: Dict[str, Any], path: str) -> Any:
        """
        Extract value from nested data using dot notation path
        """
        try:
            current = data
            for part in path.split('.'):
                if isinstance(current, dict) and part in current:
                    current = current[part]
                elif isinstance(current, list) and part.isdigit():
                    current = current[int(part)]
                else:
                    return None
            return current
        except Exception:
            return None
    
    async def _get_ai_analysis(self, prompt: str) -> Optional[str]:
        """
        Get AI analysis of data structure
        """
        try:
            from backend.frameworks.openai_runner import run_openai_chat
            
            messages = [{"role": "user", "content": prompt}]
            response = await run_openai_chat(
                messages=messages,
                model="gpt-4",
                temperature=0.1
            )
            return response
        except Exception as e:
            logger.error(f"AI analysis failed: {str(e)}")
            return None
    
    def to_agent_format(self, records: List[StandardRecord]) -> Dict[str, Any]:
        """
        Convert standard records to format suitable for agents
        """
        return {
            "records": [
                {
                    "id": record.id,
                    "data": {field.name: field.value for field in record.fields},
                    "metadata": {
                        "source_api": record.source_api,
                        "record_type": record.record_type,
                        "timestamp": record.timestamp,
                        "confidence": record.metadata.get("transformation_confidence", 0)
                    }
                }
                for record in records
            ],
            "total_records": len(records),
            "transformation_summary": {
                "source_apis": list(set(r.source_api for r in records)),
                "record_types": list(set(r.record_type for r in records)),
                "avg_confidence": sum(r.metadata.get("transformation_confidence", 0) for r in records) / len(records) if records else 0
            }
        }
    
    def to_output_format(self, records: List[StandardRecord], output_type: str = "webhook") -> Any:
        """
        Convert standard records to format suitable for outputs
        """
        if output_type == "webhook":
            return {
                "data": [
                    {field.name: field.value for field in record.fields}
                    for record in records
                ],
                "metadata": {
                    "total_records": len(records),
                    "timestamp": datetime.now().isoformat()
                }
            }
        elif output_type == "telegram":
            # Format for Telegram messages
            messages = []
            for record in records:
                field_dict = {field.name: field.value for field in record.fields}
                title = field_dict.get('title', field_dict.get('name', 'Record'))
                description = field_dict.get('description', field_dict.get('content', ''))
                
                message = f"📋 {title}\n"
                if description:
                    message += f"📝 {description[:200]}...\n" if len(str(description)) > 200 else f"📝 {description}\n"
                
                # Add other relevant fields
                for field in record.fields:
                    if field.name not in ['title', 'name', 'description', 'content']:
                        message += f"• {field.name}: {field.value}\n"
                
                messages.append(message)
            
            return "\n\n".join(messages)
        
        return records

    def _generate_record_id(self, record_data: Dict, index: int) -> str:
        """Generate a unique ID for a record"""
        try:
            # Try to use existing ID fields
            if isinstance(record_data, dict):
                for id_field in ['id', 'pairAddress', 'uuid', '_id']:
                    if id_field in record_data:
                        return str(record_data[id_field])
            
            # Fallback to timestamp + index
            timestamp = datetime.now().timestamp()
            return f"record_{timestamp}_{index}"
        except:
            return f"record_{index}"

    def _detect_record_type(self, record_data: Dict, source_name: str) -> str:
        """Detect the type of record based on source and content"""
        try:
            source_lower = source_name.lower()
            
            if 'dexscreener' in source_lower:
                return 'crypto_pair'
            elif 'airtable' in source_lower:
                return 'airtable_record'
            elif 'notion' in source_lower:
                return 'notion_page'
            elif 'slack' in source_lower:
                return 'slack_message'
            else:
                return 'generic_record'
        except:
            return 'unknown'

    def _transform_fields(self, record_data: Dict, source_name: str) -> List[StandardField]:
        """Transform record data into standard fields"""
        try:
            fields = []
            
            if not isinstance(record_data, dict):
                return [StandardField(
                    name="raw_value",
                    type=DataType.TEXT,
                    value=str(record_data),
                    source_path="root"
                )]
            
            for key, value in record_data.items():
                # Create standard field
                field = StandardField(
                    name=self._get_semantic_field_name(key, value),
                    type=self._detect_data_type(value),
                    value=value,
                    confidence=0.8,
                    source_path=key,
                    metadata={"original_key": key}
                )
                fields.append(field)
            
            return fields
        except Exception as e:
            logger.error(f"Error transforming fields: {str(e)}")
            return []

    def _calculate_confidence(self, record_data: Dict, source_name: str) -> float:
        """Calculate confidence score for record transformation"""
        try:
            if not isinstance(record_data, dict):
                return 0.3
            
            # Higher confidence for known sources
            source_lower = source_name.lower()
            if any(known in source_lower for known in ['dexscreener', 'airtable', 'notion']):
                return 0.9
            
            # Medium confidence for structured data
            if len(record_data) > 3:
                return 0.7
            
            return 0.5
        except:
            return 0.5

    def _filter_record_fields(self, record: Dict, target_fields: List[str], exclude_fields: List[str]) -> Dict:
        """
        Filter record fields based on target and exclude lists
        """
        if not target_fields and not exclude_fields:
            return record
            
        filtered_record = {}
        
        # If target fields specified, only include those
        if target_fields:
            for field in target_fields:
                if field in record:
                    filtered_record[field] = record[field]
                elif '.' in field:
                    # Handle nested fields like 'baseToken.symbol'
                    value = self._get_nested_field(record, field)
                    if value is not None:
                        self._set_nested_field(filtered_record, field, value)
        else:
            # Include all fields
            filtered_record = record.copy()
        
        # Remove excluded fields
        for field in exclude_fields:
            if field in filtered_record:
                del filtered_record[field]
            elif '.' in field:
                # Handle nested field removal
                self._remove_nested_field(filtered_record, field)
        
        return filtered_record

    def transform_for_target(
        self, 
        source_output: Any, 
        source_type: str, 
        target_type: str,
        edge_label: str = None
    ) -> Dict[str, Any]:
        """
        Transform data from source node type to target node type format
        This method provides compatibility with the graph utilities
        
        Args:
            source_output: Output from source node
            source_type: Type of source node (trigger, agent, task, etc.)
            target_type: Type of target node
            edge_label: Label of the connecting edge
            
        Returns:
            Transformed data compatible with target node
        """
        try:
            logger.info(f"🔄 Transforming {source_type} → {target_type}")
            
            # Handle NodeData wrapper
            if hasattr(source_output, 'value'):
                actual_data = source_output.value
            else:
                actual_data = source_output
            
            # Simple transformation based on target type
            if target_type == 'logic':
                # Logic nodes need simple key-value pairs for condition evaluation
                if isinstance(actual_data, dict):
                    return actual_data
                else:
                    return {"value": actual_data}
                    
            elif target_type == 'chat':
                # Chat nodes need text input
                if isinstance(actual_data, dict):
                    # Extract meaningful text from the data
                    text_content = ""
                    if "value" in actual_data:
                        text_content = str(actual_data["value"])
                    elif "message" in actual_data:
                        text_content = str(actual_data["message"])
                    else:
                        text_content = str(actual_data)
                    return {"text_input": text_content}
                else:
                    return {"text_input": str(actual_data)}
                    
            elif target_type == 'output':
                # Output nodes can handle any data
                return {"output_data": actual_data}
                
            elif target_type == 'delay':
                # Delay nodes pass data through
                return {"passthrough_data": actual_data}
                
            else:
                # Generic transformation
                if isinstance(actual_data, dict):
                    return actual_data
                else:
                    return {"value": actual_data}
                    
        except Exception as e:
            logger.error(f"❌ Data transformation failed: {str(e)}")
            return {
                "type": "error",
                "error": f"Data transformation failed: {str(e)}",
                "source_type": source_type,
                "target_type": target_type
            }

# Global transformer instance
data_transformer = UniversalDataTransformer() 