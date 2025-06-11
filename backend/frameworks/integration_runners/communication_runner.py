# backend/frameworks/integration_runners/communication_runner.py
import logging
from typing import Dict, Any, List
from datetime import datetime

from .base_integration_runner import BaseIntegrationRunner
from utils.logging import get_logger

logger = get_logger(__name__)

class CommunicationIntegrationRunner(BaseIntegrationRunner):
    """
    Communication platforms integration runner
    Handles Slack, Discord, Teams with platform-specific optimizations
    """
    
    def __init__(self):
        super().__init__("communication")
        self._setup_platforms()
        self._setup_auth_handlers()
        self._setup_response_transformers()
    
    def get_supported_platforms(self) -> List[str]:
        return ['slack', 'discord', 'teams']
    
    def get_platform_config(self, platform: str) -> Dict[str, Any]:
        return self.platform_configs.get(platform, {})
    
    def _setup_platforms(self):
        """Setup platform-specific configurations"""
        
        # Slack configuration
        self.register_platform('slack', {
            'base_url': 'https://slack.com/api',
            'auth_type': 'bearer',
            'headers': {
                'Content-Type': 'application/json; charset=utf-8'
            },
            'default_params': {
                'mrkdwn': True
            },
            'test_endpoint': 'auth.test',
            'rate_limits': {
                'tier1': 1,  # 1 request per minute for tier 1 methods
                'tier2': 20, # 20 requests per minute for tier 2 methods
                'tier3': 50, # 50 requests per minute for tier 3 methods
                'tier4': 100 # 100 requests per minute for tier 4 methods
            }
        })
        
        # Discord configuration
        self.register_platform('discord', {
            'base_url': 'https://discord.com/api/v10',
            'auth_type': 'bot',
            'headers': {
                'Content-Type': 'application/json'
            },
            'default_params': {},
            'test_endpoint': 'users/@me',
            'rate_limits': {
                'global': 50,  # 50 requests per second globally
                'per_route': 5  # 5 requests per second per route
            }
        })
        
        # Microsoft Teams configuration
        self.register_platform('teams', {
            'base_url': 'https://graph.microsoft.com/v1.0',
            'auth_type': 'oauth2',
            'headers': {
                'Content-Type': 'application/json'
            },
            'default_params': {},
            'test_endpoint': 'me',
            'rate_limits': {
                'per_user': 10000,  # 10,000 requests per 10 minutes per user
                'per_app': 600000   # 600,000 requests per 10 minutes per app
            }
        })
    
    def _setup_auth_handlers(self):
        """Setup custom authentication handlers for each platform"""
        
        async def slack_auth_handler(inputs: Dict[str, Any]) -> Dict[str, Any]:
            """Custom Slack authentication logic"""
            # Slack uses Bearer token in Authorization header
            if 'auth_token' in inputs:
                if 'headers' not in inputs:
                    inputs['headers'] = {}
                inputs['headers']['Authorization'] = f"Bearer {inputs['auth_token']}"
            
            return inputs
        
        async def discord_auth_handler(inputs: Dict[str, Any]) -> Dict[str, Any]:
            """Custom Discord authentication logic"""
            # Discord uses Bot token in Authorization header
            if 'auth_token' in inputs:
                if 'headers' not in inputs:
                    inputs['headers'] = {}
                token = inputs['auth_token']
                if not token.startswith('Bot '):
                    token = f"Bot {token}"
                inputs['headers']['Authorization'] = token
            
            return inputs
        
        async def teams_auth_handler(inputs: Dict[str, Any]) -> Dict[str, Any]:
            """Custom Teams authentication logic"""
            # Teams uses OAuth2 Bearer token
            if 'auth_token' in inputs:
                if 'headers' not in inputs:
                    inputs['headers'] = {}
                inputs['headers']['Authorization'] = f"Bearer {inputs['auth_token']}"
            
            return inputs
        
        self.register_auth_handler('slack', slack_auth_handler)
        self.register_auth_handler('discord', discord_auth_handler)
        self.register_auth_handler('teams', teams_auth_handler)
    
    def _setup_response_transformers(self):
        """Setup response transformers for platform-specific formatting"""
        
        def slack_response_transformer(response_data: Any) -> Dict[str, Any]:
            """Transform Slack API responses to standardized format"""
            if isinstance(response_data, dict):
                # Slack responses typically have 'ok' field
                if 'ok' in response_data:
                    return {
                        'success': response_data.get('ok', False),
                        'message_data': response_data,
                        'channel_id': response_data.get('channel'),
                        'message_ts': response_data.get('ts'),
                        'platform': 'slack'
                    }
            
            return {
                'raw_response': response_data,
                'platform': 'slack'
            }
        
        def discord_response_transformer(response_data: Any) -> Dict[str, Any]:
            """Transform Discord API responses to standardized format"""
            if isinstance(response_data, dict):
                return {
                    'message_data': response_data,
                    'message_id': response_data.get('id'),
                    'channel_id': response_data.get('channel_id'),
                    'author': response_data.get('author', {}),
                    'timestamp': response_data.get('timestamp'),
                    'platform': 'discord'
                }
            
            return {
                'raw_response': response_data,
                'platform': 'discord'
            }
        
        def teams_response_transformer(response_data: Any) -> Dict[str, Any]:
            """Transform Teams API responses to standardized format"""
            if isinstance(response_data, dict):
                return {
                    'message_data': response_data,
                    'message_id': response_data.get('id'),
                    'chat_id': response_data.get('chatId'),
                    'from': response_data.get('from', {}),
                    'created_datetime': response_data.get('createdDateTime'),
                    'platform': 'teams'
                }
            
            return {
                'raw_response': response_data,
                'platform': 'teams'
            }
        
        self.register_response_transformer('slack', slack_response_transformer)
        self.register_response_transformer('discord', discord_response_transformer)
        self.register_response_transformer('teams', teams_response_transformer)
    
    async def send_message(self, platform: str, channel_id: str, message: str, **kwargs) -> Dict[str, Any]:
        """Unified method to send messages across communication platforms"""
        
        platform_configs = {
            'slack': {
                'api_service_name': 'slack',
                'api_endpoint_hint': 'chat.postMessage',
                'parameters': {
                    'channel': channel_id,
                    'text': message,
                    **kwargs
                }
            },
            'discord': {
                'api_service_name': 'discord',
                'api_endpoint_hint': f'channels/{channel_id}/messages',
                'parameters': {
                    'content': message,
                    **kwargs
                }
            },
            'teams': {
                'api_service_name': 'teams',
                'api_endpoint_hint': f'chats/{channel_id}/messages',
                'parameters': {
                    'body': {
                        'content': message
                    },
                    **kwargs
                }
            }
        }
        
        if platform not in platform_configs:
            return {
                'success': False,
                'error': f'Platform {platform} not supported for messaging',
                'metadata': {'category': 'communication'}
            }
        
        try:
            inputs = platform_configs[platform]
            result = await self.execute_integration(inputs)
            
            # Add unified messaging metadata
            if result.get('success'):
                result['metadata'] = result.get('metadata', {})
                result['metadata'].update({
                    'action': 'send_message',
                    'platform': platform,
                    'channel_id': channel_id,
                    'message_length': len(message)
                })
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Failed to send message via {platform}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'metadata': {
                    'category': 'communication',
                    'platform': platform,
                    'action': 'send_message',
                    'failed_at': datetime.utcnow().isoformat()
                }
            }
    
    async def create_channel(self, platform: str, name: str, **kwargs) -> Dict[str, Any]:
        """Unified method to create channels across communication platforms"""
        
        platform_configs = {
            'slack': {
                'api_service_name': 'slack',
                'api_endpoint_hint': 'conversations.create',
                'parameters': {
                    'name': name,
                    **kwargs
                }
            },
            'discord': {
                'api_service_name': 'discord',
                'api_endpoint_hint': 'guilds/{guild_id}/channels',
                'parameters': {
                    'name': name,
                    'type': kwargs.get('type', 0),  # 0 = text channel
                    **{k: v for k, v in kwargs.items() if k != 'type'}
                }
            },
            'teams': {
                'api_service_name': 'teams',
                'api_endpoint_hint': 'teams/{team_id}/channels',
                'parameters': {
                    'displayName': name,
                    'membershipType': kwargs.get('membershipType', 'standard'),
                    **{k: v for k, v in kwargs.items() if k != 'membershipType'}
                }
            }
        }
        
        if platform not in platform_configs:
            return {
                'success': False,
                'error': f'Platform {platform} not supported for channel creation',
                'metadata': {'category': 'communication'}
            }
        
        try:
            inputs = platform_configs[platform]
            result = await self.execute_integration(inputs)
            
            if result.get('success'):
                result['metadata'] = result.get('metadata', {})
                result['metadata'].update({
                    'action': 'create_channel',
                    'platform': platform,
                    'channel_name': name
                })
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Failed to create channel on {platform}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'metadata': {
                    'category': 'communication',
                    'platform': platform,
                    'action': 'create_channel',
                    'failed_at': datetime.utcnow().isoformat()
                }
            }

# Create global instance
communication_runner = CommunicationIntegrationRunner()

# Main execution function for the framework registry
async def run_communication_tool(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main entry point for communication integration tools
    """
    try:
        result = await communication_runner.execute_integration(inputs)
        
        logger.info(f"✅ Communication integration completed: {result.get('success', False)}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Communication integration failed: {str(e)}")
        return {
            'success': False,
            'data': None,
            'error': f'Communication integration error: {str(e)}',
            'metadata': {
                'category': 'communication',
                'error_type': type(e).__name__,
                'failed_at': datetime.utcnow().isoformat()
            }
        } 