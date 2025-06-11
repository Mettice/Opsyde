"""
Developer Integration Runner
Handles GitHub, GitLab, Webhooks integrations
"""

import logging
from typing import Dict, List, Any, Optional
from .base_integration_runner import BaseIntegrationRunner

logger = logging.getLogger(__name__)

class DeveloperIntegrationRunner(BaseIntegrationRunner):
    """
    Specialized runner for developer platform integrations
    Supports: GitHub, GitLab, Custom Webhooks
    """
    
    def __init__(self):
        super().__init__("developer")
        self._setup_platforms()
        self._setup_auth_handlers()
        self._setup_response_transformers()

    def get_supported_platforms(self) -> List[str]:
        return ["github", "gitlab", "webhook"]

    def get_platform_config(self, platform: str) -> Dict[str, Any]:
        return self.platform_configs.get(platform, {})

    def _setup_platforms(self):
        """Setup platform-specific configurations"""
        # GitHub Configuration
        self.register_platform("github", {
            "base_url": "https://api.github.com",
            "auth_type": "bearer",
            "headers": {
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json"
            },
            "endpoints": {
                "list_repos": "/user/repos",
                "get_repo": "/repos/{owner}/{repo}",
                "create_issue": "/repos/{owner}/{repo}/issues",
                "list_issues": "/repos/{owner}/{repo}/issues",
                "create_pull_request": "/repos/{owner}/{repo}/pulls",
                "list_pull_requests": "/repos/{owner}/{repo}/pulls",
                "get_user": "/user",
                "list_commits": "/repos/{owner}/{repo}/commits"
            },
            "rate_limits": {
                "requests_per_hour": 5000,
                "burst_limit": 100
            }
        })

        # GitLab Configuration
        self.register_platform("gitlab", {
            "base_url": "https://gitlab.com/api/v4",
            "auth_type": "bearer",
            "headers": {
                "Content-Type": "application/json"
            },
            "endpoints": {
                "list_projects": "/projects",
                "get_project": "/projects/{project_id}",
                "create_issue": "/projects/{project_id}/issues",
                "list_issues": "/projects/{project_id}/issues",
                "create_merge_request": "/projects/{project_id}/merge_requests",
                "list_merge_requests": "/projects/{project_id}/merge_requests",
                "get_user": "/user",
                "list_commits": "/projects/{project_id}/repository/commits"
            },
            "rate_limits": {
                "requests_per_minute": 300,
                "burst_limit": 50
            }
        })

        # Webhook Configuration
        self.register_platform("webhook", {
            "base_url": "",  # Custom URL for each webhook
            "auth_type": "custom",
            "headers": {
                "Content-Type": "application/json"
            },
            "endpoints": {
                "send": "",  # Custom endpoint
                "receive": ""  # For webhook receivers
            },
            "rate_limits": {
                "requests_per_second": 10,
                "burst_limit": 25
            }
        })

    def _setup_auth_handlers(self):
        """Setup custom authentication handlers for each platform"""
        
        async def github_auth_handler(inputs: Dict[str, Any]) -> Dict[str, Any]:
            """Handle GitHub token authentication"""
            token = inputs.get("auth_token") or inputs.get("github_token")
            if not token:
                raise ValueError("GitHub integration requires 'auth_token' or 'github_token'")
            
            inputs["headers"] = {
                **inputs.get("headers", {}),
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.v3+json"
            }
            return inputs

        async def gitlab_auth_handler(inputs: Dict[str, Any]) -> Dict[str, Any]:
            """Handle GitLab token authentication"""
            token = inputs.get("auth_token") or inputs.get("gitlab_token")
            if not token:
                raise ValueError("GitLab integration requires 'auth_token' or 'gitlab_token'")
            
            inputs["headers"] = {
                **inputs.get("headers", {}),
                "Authorization": f"Bearer {token}"
            }
            return inputs

        async def webhook_auth_handler(inputs: Dict[str, Any]) -> Dict[str, Any]:
            """Handle custom webhook authentication"""
            auth_config = inputs.get("auth_config", {})
            auth_type = auth_config.get("type", "none")
            
            if auth_type == "bearer":
                token = auth_config.get("token") or inputs.get("auth_token")
                if token:
                    inputs["headers"] = {
                        **inputs.get("headers", {}),
                        "Authorization": f"Bearer {token}"
                    }
            elif auth_type == "api_key":
                api_key = auth_config.get("api_key")
                header_name = auth_config.get("header_name", "X-API-Key")
                if api_key:
                    inputs["headers"] = {
                        **inputs.get("headers", {}),
                        header_name: api_key
                    }
            elif auth_type == "basic":
                username = auth_config.get("username")
                password = auth_config.get("password")
                if username and password:
                    import base64
                    credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
                    inputs["headers"] = {
                        **inputs.get("headers", {}),
                        "Authorization": f"Basic {credentials}"
                    }
            
            return inputs

        self.register_auth_handler("github", github_auth_handler)
        self.register_auth_handler("gitlab", gitlab_auth_handler)
        self.register_auth_handler("webhook", webhook_auth_handler)

    def _setup_response_transformers(self):
        """Setup response transformers for standardized output"""
        
        def github_response_transformer(response_data: Any) -> Dict[str, Any]:
            """Transform GitHub API responses to standard format"""
            if isinstance(response_data, list):
                # List of repositories, issues, etc.
                return {
                    "platform": "github",
                    "action": "list_retrieved",
                    "data": {
                        "items": response_data,
                        "total_count": len(response_data)
                    }
                }
            elif isinstance(response_data, dict):
                if response_data.get("id") and response_data.get("name"):
                    # Repository response
                    return {
                        "platform": "github",
                        "action": "repository_processed",
                        "data": {
                            "repo_id": response_data.get("id"),
                            "name": response_data.get("name"),
                            "full_name": response_data.get("full_name"),
                            "description": response_data.get("description"),
                            "url": response_data.get("html_url"),
                            "stars": response_data.get("stargazers_count"),
                            "forks": response_data.get("forks_count"),
                            "language": response_data.get("language")
                        }
                    }
                elif response_data.get("number") and "title" in response_data:
                    # Issue/PR response
                    return {
                        "platform": "github",
                        "action": "issue_processed",
                        "data": {
                            "number": response_data.get("number"),
                            "title": response_data.get("title"),
                            "state": response_data.get("state"),
                            "url": response_data.get("html_url"),
                            "created_at": response_data.get("created_at"),
                            "updated_at": response_data.get("updated_at")
                        }
                    }
            
            return {"platform": "github", "data": response_data}

        def gitlab_response_transformer(response_data: Any) -> Dict[str, Any]:
            """Transform GitLab API responses to standard format"""
            if isinstance(response_data, list):
                # List of projects, issues, etc.
                return {
                    "platform": "gitlab",
                    "action": "list_retrieved",
                    "data": {
                        "items": response_data,
                        "total_count": len(response_data)
                    }
                }
            elif isinstance(response_data, dict):
                if response_data.get("id") and response_data.get("name"):
                    # Project response
                    return {
                        "platform": "gitlab",
                        "action": "project_processed",
                        "data": {
                            "project_id": response_data.get("id"),
                            "name": response_data.get("name"),
                            "path_with_namespace": response_data.get("path_with_namespace"),
                            "description": response_data.get("description"),
                            "url": response_data.get("web_url"),
                            "stars": response_data.get("star_count"),
                            "forks": response_data.get("forks_count")
                        }
                    }
                elif response_data.get("iid") and "title" in response_data:
                    # Issue/MR response
                    return {
                        "platform": "gitlab",
                        "action": "issue_processed",
                        "data": {
                            "iid": response_data.get("iid"),
                            "title": response_data.get("title"),
                            "state": response_data.get("state"),
                            "url": response_data.get("web_url"),
                            "created_at": response_data.get("created_at"),
                            "updated_at": response_data.get("updated_at")
                        }
                    }
            
            return {"platform": "gitlab", "data": response_data}

        def webhook_response_transformer(response_data: Any) -> Dict[str, Any]:
            """Transform webhook responses to standard format"""
            return {
                "platform": "webhook",
                "action": "webhook_sent",
                "data": response_data,
                "metadata": {
                    "timestamp": str(__import__('datetime').datetime.now()),
                    "type": "custom_webhook"
                }
            }

        self.register_response_transformer("github", github_response_transformer)
        self.register_response_transformer("gitlab", gitlab_response_transformer)
        self.register_response_transformer("webhook", webhook_response_transformer)

    # Developer-specific helper methods
    async def create_github_issue(self, owner: str, repo: str, title: str, body: str = "", **kwargs) -> Dict[str, Any]:
        """Create a GitHub issue"""
        return await self.execute_integration({
            "api_service_name": "github_create_issue",
            "method": "POST",
            "endpoint": f"/repos/{owner}/{repo}/issues",
            "data": {
                "title": title,
                "body": body
            },
            **kwargs
        })

    async def create_gitlab_issue(self, project_id: str, title: str, description: str = "", **kwargs) -> Dict[str, Any]:
        """Create a GitLab issue"""
        return await self.execute_integration({
            "api_service_name": "gitlab_create_issue",
            "method": "POST",
            "endpoint": f"/projects/{project_id}/issues",
            "data": {
                "title": title,
                "description": description
            },
            **kwargs
        })

    async def send_custom_webhook(self, webhook_url: str, payload: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Send data to a custom webhook"""
        return await self.execute_integration({
            "api_service_name": "custom_webhook",
            "method": "POST",
            "api_endpoint": webhook_url,
            "data": payload,
            **kwargs
        })

# Create global instance
developer_runner = DeveloperIntegrationRunner()

async def run_developer_tool(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute developer platform integrations
    """
    try:
        return await developer_runner.execute_integration(inputs)
    except Exception as e:
        logger.error(f"Developer integration error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "platform": inputs.get("api_service_name", "unknown"),
            "category": "developer"
        } 