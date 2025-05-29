#!/usr/bin/env python3
"""
Debug script for state persistence
"""

import asyncio
import tempfile
import shutil
from services.data_state_manager import DataStateManager

async def debug_state_persistence():
    # Create temp directory
    temp_dir = tempfile.mkdtemp()
    print(f"Using temp directory: {temp_dir}")
    
    try:
        # Create first manager
        manager1 = DataStateManager(storage_dir=temp_dir)
        await manager1.initialize()
        
        trigger_id = "debug_test"
        initial_data = [{"id": 1, "value": "test"}]
        
        print("=== First run ===")
        result1 = await manager1.detect_changes(
            trigger_id=trigger_id,
            current_data=initial_data,
            detection_method="smart"
        )
        print(f"Result 1: {result1}")
        
        # Check stored state
        state1 = await manager1._get_state(trigger_id)
        print(f"Stored state after first run: {state1}")
        
        # Create second manager
        manager2 = DataStateManager(storage_dir=temp_dir)
        await manager2.initialize()
        
        # Check if second manager can see the state
        state2 = await manager2._get_state(trigger_id)
        print(f"State seen by second manager: {state2}")
        
        updated_data = initial_data + [{"id": 2, "value": "test2"}]
        
        print("=== Second run ===")
        result2 = await manager2.detect_changes(
            trigger_id=trigger_id,
            current_data=updated_data,
            detection_method="smart"
        )
        print(f"Result 2: {result2}")
        
    finally:
        # Cleanup
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    asyncio.run(debug_state_persistence()) 