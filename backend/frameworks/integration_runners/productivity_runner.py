"""
Productivity Integration Runner
Handles Notion, Airtable, Google Sheets integrations
"""

import logging
from typing import Dict, List, Any, Optional
from .base_integration_runner import BaseIntegrationRunner

logger = logging.getLogger(__name__)

class ProductivityIntegrationRunner(BaseIntegrationRunner):
    """
    Specialized runner for productivity platform integrations
    Supports: Notion, Airtable, Google Sheets
    """
    
    def __init__(self):
        super().__init__("productivity")
        self._setup_platforms()
        self._setup_auth_handlers()
        self._setup_response_transformers()

    def get_supported_platforms(self) -> List[str]:
        return ["notion", "airtable", "googlesheets"]

    def get_platform_config(self, platform: str) -> Dict[str, Any]:
        return self.platform_configs.get(platform, {})

    def _setup_platforms(self):
        """Setup platform-specific configurations"""
        # Notion Configuration
        self.register_platform("notion", {
            "base_url": "https://api.notion.com/v1",
            "auth_type": "bearer",
            "headers": {
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json"
            },
            "endpoints": {
                "create_page": "/pages",
                "update_page": "/pages/{page_id}",
                "query_database": "/databases/{database_id}/query",
                "create_database": "/databases",
                "search": "/search"
            },
            "rate_limits": {
                "requests_per_second": 3,
                "burst_limit": 10
            }
        })

        # Airtable Configuration
        self.register_platform("airtable", {
            "base_url": "https://api.airtable.com/v0",
            "auth_type": "bearer",
            "headers": {
                "Content-Type": "application/json"
            },
            "endpoints": {
                "list_records": "/{base_id}/{table_name}",
                "create_record": "/{base_id}/{table_name}",
                "update_record": "/{base_id}/{table_name}/{record_id}",
                "delete_record": "/{base_id}/{table_name}/{record_id}",
                "list_bases": "/meta/bases",
                "list_tables": "/meta/bases/{base_id}/tables"
            },
            "rate_limits": {
                "requests_per_second": 5,
                "burst_limit": 15
            }
        })

        # Google Sheets Configuration
        self.register_platform("googlesheets", {
            "base_url": "https://sheets.googleapis.com/v4/spreadsheets",
            "auth_type": "oauth2",
            "headers": {
                "Content-Type": "application/json"
            },
            "endpoints": {
                "get_values": "/{spreadsheet_id}/values/{range}",
                "update_values": "/{spreadsheet_id}/values/{range}",
                "append_values": "/{spreadsheet_id}/values/{range}:append",
                "batch_update": "/{spreadsheet_id}:batchUpdate",
                "create_spreadsheet": "",
                "get_spreadsheet": "/{spreadsheet_id}"
            },
            "rate_limits": {
                "requests_per_second": 10,
                "burst_limit": 50
            },
            "scopes": [
                "https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive.file"
            ]
        })

    def _setup_auth_handlers(self):
        """Setup custom authentication handlers for each platform"""
        
        async def notion_auth_handler(inputs: Dict[str, Any]) -> Dict[str, Any]:
            """Handle Notion Bearer token authentication"""
            api_key = inputs.get("auth_token") or inputs.get("notion_token")
            if not api_key:
                raise ValueError("Notion integration requires 'auth_token' or 'notion_token'")
            
            inputs["headers"] = {
                **inputs.get("headers", {}),
                "Authorization": f"Bearer {api_key}",
                "Notion-Version": "2022-06-28"
            }
            return inputs

        async def airtable_auth_handler(inputs: Dict[str, Any]) -> Dict[str, Any]:
            """Handle Airtable Bearer token authentication"""
            api_key = inputs.get("auth_token") or inputs.get("airtable_token")
            if not api_key:
                raise ValueError("Airtable integration requires 'auth_token' or 'airtable_token'")
            
            inputs["headers"] = {
                **inputs.get("headers", {}),
                "Authorization": f"Bearer {api_key}"
            }
            return inputs

        async def googlesheets_auth_handler(inputs: Dict[str, Any]) -> Dict[str, Any]:
            """Handle Google Sheets OAuth2 authentication"""
            access_token = inputs.get("auth_token") or inputs.get("google_token")
            if not access_token:
                raise ValueError("Google Sheets integration requires 'auth_token' or 'google_token'")
            
            inputs["headers"] = {
                **inputs.get("headers", {}),
                "Authorization": f"Bearer {access_token}"
            }
            return inputs

        self.register_auth_handler("notion", notion_auth_handler)
        self.register_auth_handler("airtable", airtable_auth_handler)
        self.register_auth_handler("googlesheets", googlesheets_auth_handler)

    def _setup_response_transformers(self):
        """Setup response transformers for standardized output"""
        
        def notion_response_transformer(response_data: Any) -> Dict[str, Any]:
            """Transform Notion API responses to standard format"""
            if isinstance(response_data, dict):
                if "results" in response_data:
                    # Database query response
                    return {
                        "platform": "notion",
                        "action": "query_completed",
                        "data": {
                            "pages": response_data["results"],
                            "has_more": response_data.get("has_more", False),
                            "next_cursor": response_data.get("next_cursor"),
                            "total_count": len(response_data["results"])
                        },
                        "metadata": {
                            "object": response_data.get("object"),
                            "type": response_data.get("type")
                        }
                    }
                elif response_data.get("object") == "page":
                    # Page response
                    return {
                        "platform": "notion",
                        "action": "page_processed",
                        "data": {
                            "page_id": response_data.get("id"),
                            "title": response_data.get("properties", {}).get("title", {}).get("title", [{}])[0].get("plain_text", ""),
                            "url": response_data.get("url"),
                            "created_time": response_data.get("created_time"),
                            "last_edited_time": response_data.get("last_edited_time")
                        }
                    }
            
            return {"platform": "notion", "data": response_data}

        def airtable_response_transformer(response_data: Any) -> Dict[str, Any]:
            """Transform Airtable API responses to standard format"""
            if isinstance(response_data, dict):
                if "records" in response_data:
                    # Records list response
                    return {
                        "platform": "airtable",
                        "action": "records_retrieved",
                        "data": {
                            "records": response_data["records"],
                            "total_count": len(response_data["records"]),
                            "offset": response_data.get("offset")
                        }
                    }
                elif response_data.get("id") and response_data.get("fields"):
                    # Single record response
                    return {
                        "platform": "airtable",
                        "action": "record_processed",
                        "data": {
                            "record_id": response_data.get("id"),
                            "fields": response_data.get("fields"),
                            "created_time": response_data.get("createdTime")
                        }
                    }
            
            return {"platform": "airtable", "data": response_data}

        def googlesheets_response_transformer(response_data: Any) -> Dict[str, Any]:
            """Transform Google Sheets API responses to standard format"""
            if isinstance(response_data, dict):
                if "values" in response_data:
                    # Values response
                    return {
                        "platform": "googlesheets",
                        "action": "data_retrieved",
                        "data": {
                            "values": response_data["values"],
                            "range": response_data.get("range"),
                            "major_dimension": response_data.get("majorDimension"),
                            "row_count": len(response_data["values"]) if response_data["values"] else 0
                        }
                    }
                elif response_data.get("spreadsheetId"):
                    # Spreadsheet metadata response
                    return {
                        "platform": "googlesheets",
                        "action": "spreadsheet_processed",
                        "data": {
                            "spreadsheet_id": response_data.get("spreadsheetId"),
                            "title": response_data.get("properties", {}).get("title"),
                            "sheet_count": len(response_data.get("sheets", [])),
                            "sheets": [sheet.get("properties", {}).get("title") for sheet in response_data.get("sheets", [])]
                        }
                    }
            
            return {"platform": "googlesheets", "data": response_data}

        self.register_response_transformer("notion", notion_response_transformer)
        self.register_response_transformer("airtable", airtable_response_transformer)
        self.register_response_transformer("googlesheets", googlesheets_response_transformer)

    # Productivity-specific helper methods
    async def create_notion_page(self, database_id: str, properties: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Create a new Notion page in a database"""
        return await self.execute_integration({
            "api_service_name": "notion_create_page",
            "method": "POST",
            "endpoint": "/pages",
            "data": {
                "parent": {"database_id": database_id},
                "properties": properties
            },
            **kwargs
        })

    async def create_airtable_record(self, base_id: str, table_name: str, fields: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Create a new Airtable record"""
        return await self.execute_integration({
            "api_service_name": "airtable_create_record",
            "method": "POST",
            "endpoint": f"/{base_id}/{table_name}",
            "data": {"fields": fields},
            **kwargs
        })

    async def update_google_sheet(self, spreadsheet_id: str, range_name: str, values: List[List[Any]], **kwargs) -> Dict[str, Any]:
        """Update Google Sheets values"""
        return await self.execute_integration({
            "api_service_name": "googlesheets_update_values",
            "method": "PUT",
            "endpoint": f"/{spreadsheet_id}/values/{range_name}",
            "params": {"valueInputOption": "USER_ENTERED"},
            "data": {
                "range": range_name,
                "majorDimension": "ROWS",
                "values": values
            },
            **kwargs
        })

# Create global instance
productivity_runner = ProductivityIntegrationRunner()

async def run_productivity_tool(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute productivity platform integrations
    """
    try:
        return await productivity_runner.execute_integration(inputs)
    except Exception as e:
        logger.error(f"Productivity integration error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "platform": inputs.get("api_service_name", "unknown"),
            "category": "productivity"
        } 