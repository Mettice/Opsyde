"""
Storage Integration Runner
Handles Google Drive, Dropbox integrations
"""

import json
import logging
from typing import Dict, List, Any, Optional
from .base_integration_runner import BaseIntegrationRunner

logger = logging.getLogger(__name__)

class StorageIntegrationRunner(BaseIntegrationRunner):
    """
    Specialized runner for storage platform integrations
    Supports: Google Drive, Dropbox
    """
    
    def __init__(self):
        super().__init__("storage")
        self._setup_platforms()
        self._setup_auth_handlers()
        self._setup_response_transformers()

    def get_supported_platforms(self) -> List[str]:
        return ["google_drive", "dropbox"]

    def get_platform_config(self, platform: str) -> Dict[str, Any]:
        return self.platform_configs.get(platform, {})

    def _setup_platforms(self):
        """Setup platform-specific configurations"""
        # Google Drive Configuration
        self.register_platform("google_drive", {
            "base_url": "https://www.googleapis.com/drive/v3",
            "upload_url": "https://www.googleapis.com/upload/drive/v3",
            "auth_type": "oauth2",
            "headers": {
                "Content-Type": "application/json"
            },
            "endpoints": {
                "files": "/files",
                "upload": "/files",
                "create_folder": "/files",
                "list_files": "/files",
                "get_file": "/files/{file_id}",
                "update_file": "/files/{file_id}",
                "delete_file": "/files/{file_id}",
                "permissions": "/files/{file_id}/permissions",
                "share": "/files/{file_id}/permissions"
            },
            "scopes": [
                "https://www.googleapis.com/auth/drive",
                "https://www.googleapis.com/auth/drive.file"
            ],
            "rate_limits": {
                "requests_per_second": 10,
                "burst_limit": 100
            }
        })

        # Dropbox Configuration
        self.register_platform("dropbox", {
            "base_url": "https://api.dropboxapi.com/2",
            "content_url": "https://content.dropboxapi.com/2",
            "auth_type": "bearer",
            "headers": {
                "Content-Type": "application/json"
            },
            "endpoints": {
                "list_folder": "/files/list_folder",
                "upload": "/files/upload",
                "download": "/files/download",
                "create_folder": "/files/create_folder_v2",
                "delete": "/files/delete_v2",
                "move": "/files/move_v2",
                "copy": "/files/copy_v2",
                "get_metadata": "/files/get_metadata",
                "search": "/files/search_v2",
                "sharing_create_link": "/sharing/create_shared_link_with_settings"
            },
            "rate_limits": {
                "requests_per_second": 5,
                "burst_limit": 25
            }
        })

    def _setup_auth_handlers(self):
        """Setup custom authentication handlers for each platform"""
        
        async def google_drive_auth_handler(inputs: Dict[str, Any]) -> Dict[str, Any]:
            """Handle Google Drive OAuth2 authentication"""
            access_token = inputs.get("auth_token") or inputs.get("google_token")
            if not access_token:
                raise ValueError("Google Drive integration requires 'auth_token' or 'google_token'")
            
            inputs["headers"] = {
                **inputs.get("headers", {}),
                "Authorization": f"Bearer {access_token}"
            }
            return inputs

        async def dropbox_auth_handler(inputs: Dict[str, Any]) -> Dict[str, Any]:
            """Handle Dropbox Bearer token authentication"""
            access_token = inputs.get("auth_token") or inputs.get("dropbox_token")
            if not access_token:
                raise ValueError("Dropbox integration requires 'auth_token' or 'dropbox_token'")
            
            inputs["headers"] = {
                **inputs.get("headers", {}),
                "Authorization": f"Bearer {access_token}"
            }
            return inputs

        self.register_auth_handler("google_drive", google_drive_auth_handler)
        self.register_auth_handler("dropbox", dropbox_auth_handler)

    def _setup_response_transformers(self):
        """Setup response transformers for standardized output"""
        
        def google_drive_response_transformer(response_data: Any) -> Dict[str, Any]:
            """Transform Google Drive API responses to standard format"""
            if isinstance(response_data, dict):
                if "files" in response_data:
                    # Files list response
                    return {
                        "platform": "google_drive",
                        "action": "files_listed",
                        "data": {
                            "files": response_data["files"],
                            "total_count": len(response_data["files"]),
                            "next_page_token": response_data.get("nextPageToken"),
                            "incomplete_search": response_data.get("incompleteSearch", False)
                        }
                    }
                elif response_data.get("kind") == "drive#file":
                    # Single file response
                    return {
                        "platform": "google_drive",
                        "action": "file_processed",
                        "data": {
                            "file_id": response_data.get("id"),
                            "name": response_data.get("name"),
                            "mime_type": response_data.get("mimeType"),
                            "size": response_data.get("size"),
                            "created_time": response_data.get("createdTime"),
                            "modified_time": response_data.get("modifiedTime"),
                            "web_view_link": response_data.get("webViewLink"),
                            "web_content_link": response_data.get("webContentLink"),
                            "parents": response_data.get("parents", [])
                        }
                    }
                elif response_data.get("kind") == "drive#permission":
                    # Permission response
                    return {
                        "platform": "google_drive",
                        "action": "permission_processed",
                        "data": {
                            "permission_id": response_data.get("id"),
                            "type": response_data.get("type"),
                            "role": response_data.get("role"),
                            "email_address": response_data.get("emailAddress"),
                            "display_name": response_data.get("displayName")
                        }
                    }
            
            return {"platform": "google_drive", "data": response_data}

        def dropbox_response_transformer(response_data: Any) -> Dict[str, Any]:
            """Transform Dropbox API responses to standard format"""
            if isinstance(response_data, dict):
                if "entries" in response_data:
                    # Folder listing response
                    return {
                        "platform": "dropbox",
                        "action": "folder_listed",
                        "data": {
                            "entries": response_data["entries"],
                            "total_count": len(response_data["entries"]),
                            "cursor": response_data.get("cursor"),
                            "has_more": response_data.get("has_more", False)
                        }
                    }
                elif response_data.get(".tag") in ["file", "folder"]:
                    # File/folder metadata response
                    return {
                        "platform": "dropbox",
                        "action": "metadata_retrieved",
                        "data": {
                            "name": response_data.get("name"),
                            "path_lower": response_data.get("path_lower"),
                            "path_display": response_data.get("path_display"),
                            "id": response_data.get("id"),
                            "type": response_data.get(".tag"),
                            "size": response_data.get("size"),
                            "server_modified": response_data.get("server_modified"),
                            "client_modified": response_data.get("client_modified"),
                            "content_hash": response_data.get("content_hash")
                        }
                    }
                elif "url" in response_data:
                    # Shared link response
                    return {
                        "platform": "dropbox",
                        "action": "shared_link_created",
                        "data": {
                            "url": response_data.get("url"),
                            "name": response_data.get("name"),
                            "path": response_data.get("path"),
                            "link_permissions": response_data.get("link_permissions", {}),
                            "expires": response_data.get("expires")
                        }
                    }
                elif "matches" in response_data:
                    # Search response
                    return {
                        "platform": "dropbox",
                        "action": "search_completed",
                        "data": {
                            "matches": response_data["matches"],
                            "total_count": len(response_data["matches"]),
                            "has_more": response_data.get("has_more", False),
                            "cursor": response_data.get("cursor")
                        }
                    }
            
            return {"platform": "dropbox", "data": response_data}

        self.register_response_transformer("google_drive", google_drive_response_transformer)
        self.register_response_transformer("dropbox", dropbox_response_transformer)

    # Storage-specific helper methods
    async def upload_file(self, platform: str, file_name: str, file_content: bytes, **kwargs) -> Dict[str, Any]:
        """Upload a file across storage platforms"""
        if platform == "google_drive":
            # Create file metadata
            metadata = {
                "name": file_name,
                "parents": kwargs.get("parents", [])
            }
            
            return await self.execute_integration({
                "api_service_name": "google_drive_upload",
                "method": "POST",
                "endpoint": "/files",
                "params": {"uploadType": "multipart"},
                "data": metadata,
                "files": {"file": (file_name, file_content)},
                **kwargs
            })
        elif platform == "dropbox":
            # Dropbox upload
            path = kwargs.get("path", f"/{file_name}")
            return await self.execute_integration({
                "api_service_name": "dropbox_upload",
                "method": "POST",
                "endpoint": "/files/upload",
                "headers": {
                    "Content-Type": "application/octet-stream",
                    "Dropbox-API-Arg": json.dumps({
                        "path": path,
                        "mode": kwargs.get("mode", "add"),
                        "autorename": kwargs.get("autorename", True),
                        "mute": kwargs.get("mute", False)
                    })
                },
                "data": file_content,
                **kwargs
            })
        else:
            return {
                "success": False,
                "error": f"Platform {platform} not supported for file upload"
            }

    async def create_folder(self, platform: str, folder_name: str, **kwargs) -> Dict[str, Any]:
        """Create a folder across storage platforms"""
        if platform == "google_drive":
            return await self.execute_integration({
                "api_service_name": "google_drive_create_folder",
                "method": "POST",
                "endpoint": "/files",
                "data": {
                    "name": folder_name,
                    "mimeType": "application/vnd.google-apps.folder",
                    "parents": kwargs.get("parents", [])
                },
                **kwargs
            })
        elif platform == "dropbox":
            path = kwargs.get("path", f"/{folder_name}")
            return await self.execute_integration({
                "api_service_name": "dropbox_create_folder",
                "method": "POST",
                "endpoint": "/files/create_folder_v2",
                "data": {
                    "path": path,
                    "autorename": kwargs.get("autorename", False)
                },
                **kwargs
            })
        else:
            return {
                "success": False,
                "error": f"Platform {platform} not supported for folder creation"
            }

    async def list_files(self, platform: str, **kwargs) -> Dict[str, Any]:
        """List files across storage platforms"""
        if platform == "google_drive":
            params = {
                "pageSize": kwargs.get("page_size", 100),
                "fields": kwargs.get("fields", "files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,parents)")
            }
            
            if kwargs.get("folder_id"):
                params["q"] = f"'{kwargs['folder_id']}' in parents"
            elif kwargs.get("query"):
                params["q"] = kwargs["query"]
                
            return await self.execute_integration({
                "api_service_name": "google_drive_list_files",
                "method": "GET",
                "endpoint": "/files",
                "params": params,
                **kwargs
            })
        elif platform == "dropbox":
            path = kwargs.get("path", "")
            return await self.execute_integration({
                "api_service_name": "dropbox_list_folder",
                "method": "POST",
                "endpoint": "/files/list_folder",
                "data": {
                    "path": path,
                    "recursive": kwargs.get("recursive", False),
                    "include_media_info": kwargs.get("include_media_info", False),
                    "include_deleted": kwargs.get("include_deleted", False),
                    "include_has_explicit_shared_members": kwargs.get("include_shared_members", False),
                    "include_mounted_folders": kwargs.get("include_mounted", True)
                },
                **kwargs
            })
        else:
            return {
                "success": False,
                "error": f"Platform {platform} not supported for file listing"
            }

    async def share_file(self, platform: str, file_id: str, **kwargs) -> Dict[str, Any]:
        """Share a file/create public link across storage platforms"""
        if platform == "google_drive":
            return await self.execute_integration({
                "api_service_name": "google_drive_share",
                "method": "POST",
                "endpoint": f"/files/{file_id}/permissions",
                "data": {
                    "role": kwargs.get("role", "reader"),
                    "type": kwargs.get("type", "anyone")
                },
                **kwargs
            })
        elif platform == "dropbox":
            path = kwargs.get("path") or file_id  # Dropbox uses path, not ID
            return await self.execute_integration({
                "api_service_name": "dropbox_create_shared_link",
                "method": "POST",
                "endpoint": "/sharing/create_shared_link_with_settings",
                "data": {
                    "path": path,
                    "settings": {
                        "requested_visibility": kwargs.get("visibility", "public"),
                        "audience": kwargs.get("audience", "public"),
                        "access": kwargs.get("access", "viewer")
                    }
                },
                **kwargs
            })
        else:
            return {
                "success": False,
                "error": f"Platform {platform} not supported for file sharing"
            }

    async def search_files(self, platform: str, query: str, **kwargs) -> Dict[str, Any]:
        """Search files across storage platforms"""
        if platform == "google_drive":
            return await self.execute_integration({
                "api_service_name": "google_drive_search",
                "method": "GET",
                "endpoint": "/files",
                "params": {
                    "q": f"name contains '{query}'",
                    "pageSize": kwargs.get("page_size", 100),
                    "fields": kwargs.get("fields", "files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink)")
                },
                **kwargs
            })
        elif platform == "dropbox":
            return await self.execute_integration({
                "api_service_name": "dropbox_search",
                "method": "POST",
                "endpoint": "/files/search_v2",
                "data": {
                    "query": query,
                    "options": {
                        "path": kwargs.get("path", ""),
                        "max_results": kwargs.get("max_results", 100),
                        "file_status": kwargs.get("file_status", "active"),
                        "filename_only": kwargs.get("filename_only", False)
                    }
                },
                **kwargs
            })
        else:
            return {
                "success": False,
                "error": f"Platform {platform} not supported for file search"
            }

# Create global instance
storage_runner = StorageIntegrationRunner()

async def run_storage_tool(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute storage platform integrations
    """
    try:
        return await storage_runner.execute_integration(inputs)
    except Exception as e:
        logger.error(f"Storage integration error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "platform": inputs.get("api_service_name", "unknown"),
            "category": "storage"
        } 