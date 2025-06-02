#!/usr/bin/env python3
"""
🚀 Supabase Workflow Service
Handles workflow storage, execution tracking, and trigger management in Supabase
"""

import logging
import json
import aiohttp
import os
from typing import Dict, Any, Optional, List
from datetime import datetime
from dotenv import load_dotenv
from services.supabase_rest_service import SupabaseRestService

logger = logging.getLogger(__name__)

class SupabaseWorkflowService(SupabaseRestService):
    """Extended Supabase service for workflow management"""
    
    def __init__(self):
        super().__init__()
    
    # ===== WORKFLOW MANAGEMENT =====
    
    async def save_workflow(self, user_id: str, workflow_data: Dict[str, Any]) -> Optional[str]:
        """Save a workflow to Supabase"""
        try:
            self._ensure_initialized()
            resolved_user_id = await self._resolve_user_id(user_id)
            
            workflow_record = {
                "user_id": resolved_user_id,
                "name": workflow_data.get("name", "Untitled Workflow"),
                "description": workflow_data.get("description"),
                "nodes": workflow_data.get("nodes", []),
                "edges": workflow_data.get("edges", []),
                "config": workflow_data.get("config", {}),
                "inputs": workflow_data.get("inputs", {}),
                "version": workflow_data.get("version", "1.0"),
                "status": workflow_data.get("status", "draft"),
                "tags": workflow_data.get("tags", []),
                "is_public": workflow_data.get("is_public", False),
                "created_at": datetime.utcnow().isoformat()
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.supabase_url}/rest/v1/workflows",
                    headers=self._get_headers(),
                    json=workflow_record
                ) as response:
                    if response.status in [200, 201]:
                        result = await response.json()
                        workflow_id = result[0]["id"] if isinstance(result, list) else result["id"]
                        logger.info(f"✅ Saved workflow {workflow_id} for user {user_id}")
                        return workflow_id
                    else:
                        error_text = await response.text()
                        logger.error(f"❌ Failed to save workflow: {response.status} - {error_text}")
                        return None
                        
        except Exception as e:
            logger.error(f"Failed to save workflow: {str(e)}")
            return None
    
    async def get_workflow(self, workflow_id: str, user_id: str = None) -> Optional[Dict[str, Any]]:
        """Get a workflow by ID"""
        try:
            self._ensure_initialized()
            
            url = f"{self.supabase_url}/rest/v1/workflows?id=eq.{workflow_id}"
            if user_id:
                resolved_user_id = await self._resolve_user_id(user_id)
                url += f"&user_id=eq.{resolved_user_id}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self._get_headers()) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data[0] if data else None
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to get workflow: {str(e)}")
            return None
    
    async def list_workflows(self, user_id: str) -> List[Dict[str, Any]]:
        """List workflows for a user"""
        try:
            self._ensure_initialized()
            resolved_user_id = await self._resolve_user_id(user_id)
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.supabase_url}/rest/v1/workflows?user_id=eq.{resolved_user_id}&order=created_at.desc",
                    headers=self._get_headers()
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    return []
                    
        except Exception as e:
            logger.error(f"Failed to list workflows: {str(e)}")
            return []
    
    # ===== EXECUTION TRACKING =====
    
    async def start_execution(self, workflow_id: str, user_id: str, trigger_id: str = None, 
                            execution_type: str = "manual", inputs: Dict[str, Any] = None) -> Optional[str]:
        """Start a new workflow execution"""
        try:
            self._ensure_initialized()
            resolved_user_id = await self._resolve_user_id(user_id)
            
            execution_record = {
                "workflow_id": workflow_id,
                "user_id": resolved_user_id,
                "trigger_id": trigger_id,
                "execution_type": execution_type,
                "status": "running",
                "inputs": inputs or {},
                "started_at": datetime.utcnow().isoformat()
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.supabase_url}/rest/v1/workflow_executions",
                    headers=self._get_headers(),
                    json=execution_record
                ) as response:
                    if response.status in [200, 201]:
                        result = await response.json()
                        execution_id = result[0]["id"] if isinstance(result, list) else result["id"]
                        logger.info(f"✅ Started execution {execution_id} for workflow {workflow_id}")
                        return execution_id
                    else:
                        error_text = await response.text()
                        logger.error(f"❌ Failed to start execution: {response.status} - {error_text}")
                        return None
                        
        except Exception as e:
            logger.error(f"Failed to start execution: {str(e)}")
            return None
    
    async def update_execution(self, execution_id: str, status: str = None, outputs: Dict[str, Any] = None,
                             error_message: str = None, node_count: int = None, completed_nodes: int = None) -> bool:
        """Update execution status"""
        try:
            self._ensure_initialized()
            
            update_data = {}
            if status:
                update_data["status"] = status
            if outputs:
                update_data["outputs"] = outputs
            if error_message:
                update_data["error_message"] = error_message
            if node_count is not None:
                update_data["node_count"] = node_count
            if completed_nodes is not None:
                update_data["completed_nodes"] = completed_nodes
            
            if status in ["completed", "failed", "cancelled"]:
                update_data["completed_at"] = datetime.utcnow().isoformat()
            
            async with aiohttp.ClientSession() as session:
                async with session.patch(
                    f"{self.supabase_url}/rest/v1/workflow_executions?id=eq.{execution_id}",
                    headers=self._get_headers(),
                    json=update_data
                ) as response:
                    return response.status in [200, 204]
                    
        except Exception as e:
            logger.error(f"Failed to update execution: {str(e)}")
            return False
    
    async def log_node_execution(self, execution_id: str, node_id: str, node_type: str,
                               status: str = "running", inputs: Dict[str, Any] = None,
                               outputs: Dict[str, Any] = None, error_message: str = None) -> bool:
        """Log individual node execution"""
        try:
            self._ensure_initialized()
            
            node_record = {
                "execution_id": execution_id,
                "node_id": node_id,
                "node_type": node_type,
                "status": status,
                "inputs": inputs or {},
                "outputs": outputs or {},
                "error_message": error_message,
                "started_at": datetime.utcnow().isoformat()
            }
            
            if status in ["completed", "failed", "skipped"]:
                node_record["completed_at"] = datetime.utcnow().isoformat()
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.supabase_url}/rest/v1/node_executions",
                    headers=self._get_headers(),
                    json=node_record
                ) as response:
                    return response.status in [200, 201]
                    
        except Exception as e:
            logger.error(f"Failed to log node execution: {str(e)}")
            return False
    
    # ===== TRIGGER MANAGEMENT =====
    
    async def save_trigger(self, trigger_id: str, user_id: str, workflow_id: str = None,
                          name: str = None, trigger_type: str = "manual", config: Dict[str, Any] = None) -> bool:
        """Save trigger configuration"""
        try:
            self._ensure_initialized()
            resolved_user_id = await self._resolve_user_id(user_id)
            
            trigger_record = {
                "trigger_id": trigger_id,
                "user_id": resolved_user_id,
                "workflow_id": workflow_id,
                "name": name or trigger_id,
                "trigger_type": trigger_type,
                "config": config or {},
                "status": "active",
                "created_at": datetime.utcnow().isoformat()
            }
            
            async with aiohttp.ClientSession() as session:
                # Try to update existing trigger first
                async with session.patch(
                    f"{self.supabase_url}/rest/v1/triggers?trigger_id=eq.{trigger_id}",
                    headers=self._get_headers(),
                    json=trigger_record
                ) as response:
                    if response.status in [200, 204]:
                        logger.info(f"✅ Updated trigger {trigger_id}")
                        return True
                
                # If no existing trigger, create new one
                async with session.post(
                    f"{self.supabase_url}/rest/v1/triggers",
                    headers=self._get_headers(),
                    json=trigger_record
                ) as response:
                    if response.status in [200, 201]:
                        logger.info(f"✅ Created trigger {trigger_id}")
                        return True
                    else:
                        error_text = await response.text()
                        logger.error(f"❌ Failed to save trigger: {response.status} - {error_text}")
                        return False
                        
        except Exception as e:
            logger.error(f"Failed to save trigger: {str(e)}")
            return False
    
    async def get_trigger(self, trigger_id: str) -> Optional[Dict[str, Any]]:
        """Get trigger by ID"""
        try:
            self._ensure_initialized()
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.supabase_url}/rest/v1/triggers?trigger_id=eq.{trigger_id}",
                    headers=self._get_headers()
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data[0] if data else None
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to get trigger: {str(e)}")
            return None
    
    async def update_trigger_execution_count(self, trigger_id: str) -> bool:
        """Increment trigger execution count"""
        try:
            self._ensure_initialized()
            
            # Get current count
            trigger = await self.get_trigger(trigger_id)
            if not trigger:
                return False
            
            new_count = trigger.get("execution_count", 0) + 1
            
            async with aiohttp.ClientSession() as session:
                async with session.patch(
                    f"{self.supabase_url}/rest/v1/triggers?trigger_id=eq.{trigger_id}",
                    headers=self._get_headers(),
                    json={
                        "execution_count": new_count,
                        "last_executed": datetime.utcnow().isoformat()
                    }
                ) as response:
                    return response.status in [200, 204]
                    
        except Exception as e:
            logger.error(f"Failed to update trigger execution count: {str(e)}")
            return False
    
    # ===== DATA STATE MANAGEMENT =====
    
    async def save_data_state(self, trigger_id: str, data_hash: str = None, 
                            last_value: str = None, last_count: int = None,
                            metadata: Dict[str, Any] = None) -> bool:
        """Save trigger data state for monitoring"""
        try:
            self._ensure_initialized()
            
            state_data = {
                "trigger_id": trigger_id,
                "data_hash": data_hash,
                "last_value": last_value,
                "last_count": last_count,
                "metadata": metadata or {},
                "updated_at": datetime.utcnow().isoformat()
            }
            
            async with aiohttp.ClientSession() as session:
                # Try to update existing state first
                async with session.patch(
                    f"{self.supabase_url}/rest/v1/data_states?trigger_id=eq.{trigger_id}",
                    headers=self._get_headers(),
                    json=state_data
                ) as response:
                    if response.status in [200, 204]:
                        return True
                
                # If no existing state, create new one
                state_data["created_at"] = datetime.utcnow().isoformat()
                async with session.post(
                    f"{self.supabase_url}/rest/v1/data_states",
                    headers=self._get_headers(),
                    json=state_data
                ) as response:
                    return response.status in [200, 201]
                    
        except Exception as e:
            logger.error(f"Failed to save data state: {str(e)}")
            return False
    
    async def get_data_state(self, trigger_id: str) -> Optional[Dict[str, Any]]:
        """Get trigger data state"""
        try:
            self._ensure_initialized()
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.supabase_url}/rest/v1/data_states?trigger_id=eq.{trigger_id}",
                    headers=self._get_headers()
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data[0] if data else None
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to get data state: {str(e)}")
            return None
    
    # ===== USAGE TRACKING =====
    
    async def log_api_usage(self, user_id: str, provider_id: str, model: str = None,
                          tokens_used: int = 0, cost_usd: float = 0.0,
                          execution_id: str = None) -> bool:
        """Log API usage for billing/tracking"""
        try:
            self._ensure_initialized()
            resolved_user_id = await self._resolve_user_id(user_id)
            
            usage_record = {
                "user_id": resolved_user_id,
                "provider_id": provider_id,
                "model": model,
                "tokens_used": tokens_used,
                "cost_usd": cost_usd,
                "execution_id": execution_id,
                "created_at": datetime.utcnow().isoformat()
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.supabase_url}/rest/v1/api_usage",
                    headers=self._get_headers(),
                    json=usage_record
                ) as response:
                    return response.status in [200, 201]
                    
        except Exception as e:
            logger.error(f"Failed to log API usage: {str(e)}")
            return False

# Create global instance
supabase_workflow_service = SupabaseWorkflowService() 