# services/data_state_manager.py
import json
import hashlib
import sqlite3
import asyncio
import logging
from typing import Dict, Any, List, Optional, Set, Tuple
from datetime import datetime, timedelta
from pathlib import Path
import aiofiles
import aiosqlite

logger = logging.getLogger(__name__)

class DataStateManager:
    """
    Advanced data state management for incremental processing and live data updates.
    Handles state persistence, change detection, and intelligent filtering.
    """
    
    def __init__(self, storage_dir: str = "data_states"):
        """Initialize the DataStateManager with storage directory"""
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)  # Create parent directories if needed
        self.db_path = self.storage_dir / "state_data.db"
        self.memory_cache = {}
        self.change_listeners = {}
        
    async def initialize(self):
        """Initialize the database and create necessary tables"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS data_states (
                    trigger_id TEXT PRIMARY KEY,
                    data TEXT,
                    last_hash TEXT,
                    last_timestamp TEXT,
                    last_count INTEGER,
                    last_value TEXT,
                    metadata TEXT,
                    created_at TEXT,
                    updated_at TEXT
                )
            """)
            
            # Add data column if it doesn't exist (for existing databases)
            try:
                await db.execute("ALTER TABLE data_states ADD COLUMN data TEXT")
            except Exception:
                # Column already exists or other error, ignore
                pass
            
            await db.execute("""
                CREATE TABLE IF NOT EXISTS processed_records (
                    trigger_id TEXT,
                    record_id TEXT,
                    record_hash TEXT,
                    processed_at TEXT,
                    metadata TEXT,
                    PRIMARY KEY (trigger_id, record_id)
                )
            """)
            
            await db.execute("""
                CREATE TABLE IF NOT EXISTS incremental_snapshots (
                    trigger_id TEXT,
                    snapshot_id TEXT,
                    snapshot_data TEXT,
                    snapshot_hash TEXT,
                    created_at TEXT,
                    PRIMARY KEY (trigger_id, snapshot_id)
                )
            """)
            
            await db.commit()
            logger.info("Data state manager initialized successfully")
    
    async def detect_changes(self, trigger_id: str, current_data: Any, 
                           detection_method: str = "smart", 
                           config: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Advanced change detection with multiple strategies
        
        Args:
            trigger_id: Unique identifier for the data source
            current_data: Current data to analyze
            detection_method: Method to use for change detection
            config: Additional configuration for detection
            
        Returns:
            Dict containing change information and new data
        """
        config = config or {}
        
        try:
            # Get previous state
            previous_state = await self._get_state(trigger_id)
            
            # Initialize result
            result = {
                "has_changes": False,
                "change_type": None,
                "new_records": [],
                "modified_records": [],
                "deleted_records": [],
                "summary": {},
                "metadata": {}
            }
            
            if detection_method == "smart":
                # Intelligent detection based on data structure
                result = await self._smart_change_detection(trigger_id, current_data, previous_state, config)
            elif detection_method == "array_length":
                result = await self._array_length_detection(trigger_id, current_data, previous_state, config)
            elif detection_method == "field_value":
                result = await self._field_value_detection(trigger_id, current_data, previous_state, config)
            elif detection_method == "response_hash":
                result = await self._hash_detection(trigger_id, current_data, previous_state, config)
            elif detection_method == "timestamp":
                result = await self._timestamp_detection(trigger_id, current_data, previous_state, config)
            elif detection_method == "incremental_records":
                result = await self._incremental_record_detection(trigger_id, current_data, previous_state, config)
            
            # Update state if changes detected
            if result["has_changes"]:
                await self._update_state(trigger_id, current_data, result["metadata"])
                
                # Trigger change listeners
                await self._notify_change_listeners(trigger_id, result)
            
            return result
            
        except Exception as e:
            logger.error(f"Error detecting changes for {trigger_id}: {str(e)}")
            return {"has_changes": False, "error": str(e)}
    
    async def _smart_change_detection(self, trigger_id: str, current_data: Any, 
                                    previous_state: Dict, config: Dict) -> Dict[str, Any]:
        """Smart change detection that automatically chooses the best method"""
        
        # Check if we have any previous state stored in the database
        stored_state = await self._get_state(trigger_id)
        
        # If no stored state exists, this is the first run - no changes to detect
        if not stored_state or stored_state.get("data") is None:
            # Store initial state but report no changes
            await self._update_state(trigger_id, current_data, {
                "detection_method": "smart_initial",
                "first_run": True
            })
            
            # For array data, also mark initial records as processed
            if isinstance(current_data, list):
                id_field = config.get("id_field", "id")
                for record in current_data:
                    if isinstance(record, dict):
                        record_id = self._generate_record_id(record, id_field)
                        record_hash = self._generate_record_hash(record)
                        await self._mark_record_processed(trigger_id, record_id, record_hash)
            
            return {
                "has_changes": False,
                "change_type": "initial_state",
                "new_records": [],
                "modified_records": [],
                "deleted_records": [],
                "summary": {
                    "new_count": 0,
                    "modified_count": 0,
                    "total_processed": len(current_data) if isinstance(current_data, list) else 1,
                    "current_total": len(current_data) if isinstance(current_data, list) else 1
                },
                "metadata": {
                    "detection_method": "smart_initial",
                    "timestamp": datetime.now().isoformat(),
                    "config": config or {},
                    "note": "Initial state stored, no changes detected"
                }
            }
        
        # For subsequent runs, use incremental record detection for arrays
        if isinstance(current_data, list):
            return await self._incremental_record_detection(trigger_id, current_data, stored_state, config)
        else:
            # For non-array data, use hash detection
            return await self._hash_detection(trigger_id, current_data, stored_state, config)
    
    async def _incremental_record_detection(self, trigger_id: str, current_data: List, 
                                          previous_state: Dict, config: Dict) -> Dict[str, Any]:
        """
        Detect new or modified records in array data using intelligent comparison
        """
        try:
            id_field = config.get("id_field", "id")
            max_new_records = config.get("max_new_records", 10)
            
            # NEW: Get user-selected change detection fields
            change_detection_fields = config.get("change_detection_fields", None)
            
            # Get previously processed record hashes
            processed_records = await self._get_processed_record_ids(trigger_id)
            
            new_records = []
            modified_records = []
            
            for record in current_data:
                if not isinstance(record, dict):
                    continue
                
                record_id = self._generate_record_id(record, id_field)
                
                # Generate hash using user-selected fields or smart defaults
                record_hash = self._generate_record_hash(record, change_detection_fields)
                
                if record_id not in processed_records:
                    # New record
                    new_records.append({
                        "id": record_id,
                        "data": record,
                        "hash": record_hash
                    })
                    await self._mark_record_processed(trigger_id, record_id, record_hash)
                else:
                    # Check if existing record was modified
                    stored_hash = await self._get_record_hash(trigger_id, record_id)
                    if stored_hash != record_hash:
                        modified_records.append({
                            "id": record_id,
                            "data": record,
                            "old_hash": stored_hash,
                            "new_hash": record_hash
                        })
                        await self._update_record_hash(trigger_id, record_id, record_hash)
            
            # Limit new records to prevent overwhelming the system
            if len(new_records) > max_new_records:
                logger.warning(f"Limiting new records from {len(new_records)} to {max_new_records}")
                new_records = new_records[:max_new_records]
            
            has_changes = len(new_records) > 0 or len(modified_records) > 0
            
            return {
                "has_changes": has_changes,
                "change_type": "incremental_records",
                "new_records": new_records,
                "modified_records": modified_records,
                "summary": {
                    "new_count": len(new_records),
                    "modified_count": len(modified_records),
                    "total_processed": len(current_data),
                    "change_detection_fields": change_detection_fields or "all_fields_except_metadata"
                }
            }
            
        except Exception as e:
            logger.error(f"Error in incremental record detection: {str(e)}")
            return {
                "has_changes": False,
                "change_type": "error",
                "error": str(e),
                "summary": {"error": str(e)}
            }
    
    async def _array_length_detection(self, trigger_id: str, current_data: Any, 
                                    previous_state: Dict, config: Dict) -> Dict[str, Any]:
        """Enhanced array length detection with new record extraction"""
        
        # Extract array from data
        array_data = self._extract_array_data(current_data, config.get("data_path"))
        
        if not isinstance(array_data, list):
            return {"has_changes": False, "error": "No array found in data"}
        
        current_length = len(array_data)
        previous_length = previous_state.get("last_count", 0)
        
        if current_length > previous_length:
            # New records added
            new_records_count = current_length - previous_length
            new_records = array_data[-new_records_count:] if new_records_count > 0 else []
            
            return {
                "has_changes": True,
                "change_type": "array_growth",
                "new_records": new_records,
                "modified_records": [],
                "deleted_records": [],
                "summary": {
                    "new_count": new_records_count,
                    "previous_length": previous_length,
                    "current_length": current_length
                },
                "metadata": {
                    "detection_method": "array_length",
                    "timestamp": datetime.now().isoformat()
                }
            }
        elif current_length < previous_length:
            # Records removed (usually don't trigger)
            return {
                "has_changes": False,
                "change_type": "array_shrink",
                "summary": {
                    "removed_count": previous_length - current_length,
                    "previous_length": previous_length,
                    "current_length": current_length
                }
            }
        
        return {"has_changes": False, "change_type": "no_change"}
    
    async def _field_value_detection(self, trigger_id: str, current_data: Any, 
                                   previous_state: Dict, config: Dict) -> Dict[str, Any]:
        """Field value change detection"""
        
        field_path = config.get("field_path", "")
        current_value = self._get_nested_value(current_data, field_path)
        previous_value = previous_state.get("last_value")
        
        if previous_value is None:
            # First time
            return {
                "has_changes": False,
                "change_type": "initial_value",
                "summary": {"initial_value": current_value}
            }
        
        if current_value != previous_value:
            return {
                "has_changes": True,
                "change_type": "field_value_change",
                "new_records": [{"field": field_path, "old_value": previous_value, "new_value": current_value}],
                "summary": {
                    "field": field_path,
                    "previous_value": previous_value,
                    "current_value": current_value
                },
                "metadata": {
                    "detection_method": "field_value",
                    "timestamp": datetime.now().isoformat()
                }
            }
        
        return {"has_changes": False, "change_type": "no_change"}
    
    async def _hash_detection(self, trigger_id: str, current_data: Any, 
                            previous_state: Dict, config: Dict) -> Dict[str, Any]:
        """Response hash change detection"""
        
        current_hash = self._generate_data_hash(current_data)
        previous_hash = previous_state.get("last_hash")
        
        if previous_hash is None:
            return {
                "has_changes": False,
                "change_type": "initial_hash",
                "summary": {"initial_hash": current_hash}
            }
        
        if current_hash != previous_hash:
            return {
                "has_changes": True,
                "change_type": "response_hash_change",
                "new_records": [{"type": "full_response_change", "data": current_data}],
                "summary": {
                    "previous_hash": previous_hash,
                    "current_hash": current_hash
                },
                "metadata": {
                    "detection_method": "response_hash",
                    "timestamp": datetime.now().isoformat()
                }
            }
        
        return {"has_changes": False, "change_type": "no_change"}
    
    async def _timestamp_detection(self, trigger_id: str, current_data: Any, 
                                 previous_state: Dict, config: Dict) -> Dict[str, Any]:
        """Timestamp-based change detection"""
        
        timestamp_field = config.get("timestamp_field", "updated_at")
        current_timestamp = self._extract_timestamp(current_data, timestamp_field)
        previous_timestamp = previous_state.get("last_timestamp")
        
        if not current_timestamp:
            return {"has_changes": False, "error": f"No timestamp found at field '{timestamp_field}'"}
        
        if previous_timestamp is None:
            return {
                "has_changes": False,
                "change_type": "initial_timestamp",
                "summary": {"initial_timestamp": current_timestamp}
            }
        
        if current_timestamp > previous_timestamp:
            return {
                "has_changes": True,
                "change_type": "timestamp_update",
                "new_records": [{"type": "timestamp_change", "data": current_data}],
                "summary": {
                    "previous_timestamp": previous_timestamp,
                    "current_timestamp": current_timestamp
                },
                "metadata": {
                    "detection_method": "timestamp",
                    "timestamp": datetime.now().isoformat()
                }
            }
        
        return {"has_changes": False, "change_type": "no_change"}
    
    async def filter_and_transform_data(self, data: Any, filters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Advanced data filtering and transformation for focused processing
        """
        try:
            result = {
                "filtered_data": None,
                "original_count": 0,
                "filtered_count": 0,
                "transformations_applied": [],
                "metadata": {}
            }
            
            # Handle different data types
            if isinstance(data, list):
                result["original_count"] = len(data)
                filtered_data = await self._filter_array_data(data, filters)
                result["filtered_data"] = filtered_data
                result["filtered_count"] = len(filtered_data) if isinstance(filtered_data, list) else 1
            elif isinstance(data, dict):
                result["original_count"] = 1
                filtered_data = await self._filter_object_data(data, filters)
                result["filtered_data"] = filtered_data
                result["filtered_count"] = 1 if filtered_data else 0
            else:
                result["filtered_data"] = data
                result["original_count"] = 1
                result["filtered_count"] = 1
            
            return result
            
        except Exception as e:
            logger.error(f"Error filtering data: {str(e)}")
            return {"error": str(e), "filtered_data": data}
    
    async def _filter_array_data(self, data: List, filters: Dict[str, Any]) -> List:
        """Filter array data based on conditions, fields, sorting, and limits"""
        if not data:
            return []
        
        filtered_data = []
        include_fields = filters.get("include_fields", [])
        exclude_fields = filters.get("exclude_fields", [])
        field_conditions = filters.get("field_conditions", {})
        
        # First pass: Apply field conditions only
        for item in data:
            if not isinstance(item, dict):
                continue
            
            # Check field conditions
            if field_conditions and not self._matches_conditions(item, field_conditions):
                continue
            
            # Keep the full item for now (we'll filter fields later)
            filtered_data.append(item)
        
        # Apply sorting BEFORE field filtering (so sort field is available)
        sort_by = filters.get("sort_by")
        if sort_by and filtered_data:
            reverse = False
            sort_field = sort_by
            
            # Handle descending sort (prefix with -)
            if sort_by.startswith("-"):
                reverse = True
                sort_field = sort_by[1:]
            
            try:
                # Sort by the specified field
                filtered_data.sort(
                    key=lambda x: self._get_nested_value(x, sort_field) or 0,
                    reverse=reverse
                )
            except Exception as e:
                logger.warning(f"Failed to sort by {sort_field}: {str(e)}")
        
        # Apply limit if specified
        limit = filters.get("limit")
        if limit and isinstance(limit, int) and limit > 0:
            filtered_data = filtered_data[:limit]
        
        # Finally, filter fields (include/exclude)
        final_filtered_data = []
        for item in filtered_data:
            filtered_item = {}
            
            if include_fields:
                # Only include specified fields
                for field in include_fields:
                    if "." in field:
                        # Handle nested fields
                        value = self._get_nested_value(item, field)
                        if value is not None:
                            self._set_nested_value(filtered_item, field, value)
                    elif field in item:
                        filtered_item[field] = item[field]
            else:
                # Include all fields except excluded ones
                filtered_item = item.copy()
                for field in exclude_fields:
                    if "." in field:
                        # Handle nested fields
                        self._remove_nested_field(filtered_item, field)
                    elif field in filtered_item:
                        del filtered_item[field]
            
            final_filtered_data.append(filtered_item)
        
        return final_filtered_data
    
    async def _filter_object_data(self, data: Dict, filters: Dict[str, Any]) -> Dict:
        """Filter object data based on specified criteria"""
        
        if not filters:
            return data
        
        include_fields = filters.get("include_fields", [])
        exclude_fields = filters.get("exclude_fields", [])
        
        filtered_data = {}
        
        if include_fields:
            # Only include specified fields
            for field in include_fields:
                value = self._get_nested_value(data, field)
                if value is not None:
                    self._set_nested_value(filtered_data, field, value)
        else:
            # Include all fields except excluded ones
            filtered_data = data.copy()
            for field in exclude_fields:
                self._remove_nested_field(filtered_data, field)
        
        return filtered_data
    
    # Utility methods
    def _generate_record_id(self, record: Dict, id_field: str) -> str:
        """Generate a unique ID for a record"""
        if id_field in record:
            return str(record[id_field])
        
        # Fallback: use hash of record
        return hashlib.md5(json.dumps(record, sort_keys=True).encode()).hexdigest()[:16]
    
    def _generate_record_hash(self, record: Dict, filter_fields: List[str] = None) -> str:
        """Generate a hash for a record, optionally filtering fields"""
        if filter_fields:
            # User explicitly specified which fields to include - respect their choice
            filtered_record = {k: v for k, v in record.items() if k in filter_fields}
        else:
            # No user filtering specified - use smart defaults but be less aggressive
            # Only filter out truly meaningless fields that change constantly
            always_volatile_fields = {
                # System/cache fields that are never meaningful for business logic
                'cache_time', 'cache_key', 'etag', 'last_fetch', 'sync_time', 
                'refresh_time', 'update_count', 'internal_id', 'debug',
                
                # Metadata that rarely affects business decisions
                'metadata', 'meta', 'info'
            }
            
            # Keep most fields by default - only exclude truly meaningless ones
            filtered_record = {}
            for k, v in record.items():
                # Skip only the always-volatile fields (case-insensitive)
                if k.lower() in always_volatile_fields:
                    continue
                    
                # Skip nested always-volatile fields
                if isinstance(v, dict):
                    filtered_v = {}
                    for nested_k, nested_v in v.items():
                        if nested_k.lower() not in always_volatile_fields:
                            filtered_v[nested_k] = nested_v
                    if filtered_v:  # Only include if there's meaningful data
                        filtered_record[k] = filtered_v
                else:
                    filtered_record[k] = v
        
        return hashlib.md5(json.dumps(filtered_record, sort_keys=True, default=str).encode()).hexdigest()
    
    def _generate_data_hash(self, data: Any) -> str:
        """Generate a hash for any data structure"""
        return hashlib.md5(json.dumps(data, sort_keys=True, default=str).encode()).hexdigest()
    
    def _get_nested_value(self, data: Dict, path: str) -> Any:
        """Get value from nested dictionary using dot notation"""
        if not path:
            return data
        
        keys = path.split('.')
        current = data
        
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None
        
        return current
    
    def _set_nested_value(self, data: Dict, path: str, value: Any):
        """Set value in nested dictionary using dot notation"""
        keys = path.split('.')
        current = data
        
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        
        current[keys[-1]] = value
    
    def _remove_nested_field(self, data: Dict, path: str):
        """Remove field from nested dictionary using dot notation"""
        keys = path.split('.')
        current = data
        
        for key in keys[:-1]:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return
        
        if isinstance(current, dict) and keys[-1] in current:
            del current[keys[-1]]
    
    def _extract_array_data(self, data: Any, path: str = None) -> List:
        """Extract array data from response"""
        if path:
            return self._get_nested_value(data, path) or []
        elif isinstance(data, list):
            return data
        elif isinstance(data, dict):
            # Look for the largest array
            arrays = [(k, v) for k, v in data.items() if isinstance(v, list)]
            if arrays:
                return max(arrays, key=lambda x: len(x[1]))[1]
        
        return []
    
    def _extract_timestamp(self, data: Any, field: str) -> Optional[str]:
        """Extract timestamp from data"""
        timestamp = self._get_nested_value(data, field)
        if timestamp:
            return str(timestamp)
        return None
    
    def _matches_conditions(self, item: Dict, conditions: Dict) -> bool:
        """Check if item matches filter conditions"""
        for field, condition in conditions.items():
            value = self._get_nested_value(item, field)
            
            if isinstance(condition, dict):
                # Complex condition
                if "equals" in condition and value != condition["equals"]:
                    return False
                if "contains" in condition and condition["contains"] not in str(value):
                    return False
                if "greater_than" in condition and value <= condition["greater_than"]:
                    return False
                if "less_than" in condition and value >= condition["less_than"]:
                    return False
            else:
                # Simple equality
                if value != condition:
                    return False
        
        return True
    
    # Database operations
    async def _get_state(self, trigger_id: str) -> Dict[str, Any]:
        """Get stored state for a trigger"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                cursor = await db.execute(
                    "SELECT data, metadata, updated_at FROM data_states WHERE trigger_id = ? ORDER BY updated_at DESC LIMIT 1",
                    (trigger_id,)
                )
                row = await cursor.fetchone()
                
                if row:
                    data_json, metadata_json, updated_at = row
                    return {
                        "data": json.loads(data_json) if data_json else None,
                        "metadata": json.loads(metadata_json) if metadata_json else {},
                        "updated_at": updated_at
                    }
                else:
                    # No state found
                    return {}
                    
        except Exception as e:
            logger.error(f"Error getting state for {trigger_id}: {str(e)}")
            return {}
    
    async def _update_state(self, trigger_id: str, data: Any, metadata: Dict = None):
        """Update stored state for trigger"""
        try:
            current_time = datetime.now().isoformat()
            data_hash = self._generate_data_hash(data)
            count = len(data) if isinstance(data, list) else 1
            value = json.dumps(data) if data is not None else None
            metadata_json = json.dumps(metadata or {})
            
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    INSERT OR REPLACE INTO data_states 
                    (trigger_id, data, last_hash, last_timestamp, last_count, last_value, metadata, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 
                            COALESCE((SELECT created_at FROM data_states WHERE trigger_id = ?), ?), ?)
                """, (trigger_id, value, data_hash, current_time, count, value, metadata_json, trigger_id, current_time, current_time))
                
                await db.commit()
                
        except Exception as e:
            logger.error(f"Error updating state for {trigger_id}: {str(e)}")
    
    async def _get_processed_record_ids(self, trigger_id: str) -> Set[str]:
        """Get set of processed record IDs"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                cursor = await db.execute(
                    "SELECT record_id FROM processed_records WHERE trigger_id = ?",
                    (trigger_id,)
                )
                rows = await cursor.fetchall()
                return {row[0] for row in rows}
        except Exception as e:
            logger.error(f"Error getting processed records for {trigger_id}: {str(e)}")
            return set()
    
    async def _mark_record_processed(self, trigger_id: str, record_id: str, record_hash: str):
        """Mark a record as processed"""
        try:
            current_time = datetime.now().isoformat()
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    INSERT OR REPLACE INTO processed_records 
                    (trigger_id, record_id, record_hash, processed_at, metadata)
                    VALUES (?, ?, ?, ?, ?)
                """, (trigger_id, record_id, record_hash, current_time, "{}"))
                await db.commit()
        except Exception as e:
            logger.error(f"Error marking record processed: {str(e)}")
    
    async def _get_record_hash(self, trigger_id: str, record_id: str) -> Optional[str]:
        """Get hash for a specific record"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                cursor = await db.execute(
                    "SELECT record_hash FROM processed_records WHERE trigger_id = ? AND record_id = ?",
                    (trigger_id, record_id)
                )
                row = await cursor.fetchone()
                return row[0] if row else None
        except Exception as e:
            logger.error(f"Error getting record hash: {str(e)}")
            return None
    
    async def _update_record_hash(self, trigger_id: str, record_id: str, record_hash: str):
        """Update hash for a specific record"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    UPDATE processed_records 
                    SET record_hash = ?, processed_at = ?
                    WHERE trigger_id = ? AND record_id = ?
                """, (record_hash, datetime.now().isoformat(), trigger_id, record_id))
                await db.commit()
        except Exception as e:
            logger.error(f"Error updating record hash: {str(e)}")
    
    async def register_change_listener(self, trigger_id: str, callback):
        """Register a callback for when changes are detected"""
        if trigger_id not in self.change_listeners:
            self.change_listeners[trigger_id] = []
        self.change_listeners[trigger_id].append(callback)
    
    async def _notify_change_listeners(self, trigger_id: str, change_result: Dict):
        """Notify registered change listeners"""
        if trigger_id in self.change_listeners:
            for callback in self.change_listeners[trigger_id]:
                try:
                    await callback(trigger_id, change_result)
                except Exception as e:
                    logger.error(f"Error in change listener callback: {str(e)}")
    
    async def cleanup_old_data(self, days_to_keep: int = 30):
        """Clean up old processed records and snapshots"""
        try:
            cutoff_date = (datetime.now() - timedelta(days=days_to_keep)).isoformat()
            
            async with aiosqlite.connect(self.db_path) as db:
                # Clean up old processed records
                await db.execute(
                    "DELETE FROM processed_records WHERE processed_at < ?",
                    (cutoff_date,)
                )
                
                # Clean up old snapshots
                await db.execute(
                    "DELETE FROM incremental_snapshots WHERE created_at < ?",
                    (cutoff_date,)
                )
                
                await db.commit()
                logger.info(f"Cleaned up data older than {days_to_keep} days")
        except Exception as e:
            logger.error(f"Error cleaning up old data: {str(e)}")

# Global instance for easy importing
data_state_manager = DataStateManager() 