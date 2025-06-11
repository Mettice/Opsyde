// Communication Integration Templates
// Slack, Discord, Teams

export const communicationTemplates = {
  slack: [
    {
      id: 'slack-message',
      name: 'Slack Message',
      description: 'Send messages to Slack channels or users',
      category: 'Communication',
      icon: '📢',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'slack',
        description: 'Slack messaging API',
        protocol: 'rest',
        base_url: 'https://slack.com/api',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'post_message',
            path: '/chat.postMessage',
            method: 'POST',
            description: 'Post a message to a channel',
            parameters: {
              channel: { type: 'string', required: true, description: 'Channel ID or name' },
              text: { type: 'string', required: true, description: 'Message text' },
              blocks: { type: 'array', required: false, description: 'Rich message blocks' }
            }
          },
          {
            name: 'upload_file',
            path: '/files.upload',
            method: 'POST',
            description: 'Upload and share a file',
            parameters: {
              channels: { type: 'string', required: true, description: 'Channel to share file' },
              filename: { type: 'string', required: true, description: 'File name' },
              title: { type: 'string', required: false, description: 'File title' }
            }
          }
        ]
      },
      defaultParameters: {
        channel: '#general',
        text: 'Hello from Nodai!'
      },
      authSetup: {
        type: 'oauth2',
        scopes: ['chat:write', 'files:write'],
        docs_url: 'https://api.slack.com/authentication'
      }
    },
    {
      id: 'slack-workflow',
      name: 'Slack Workflow Trigger',
      description: 'Trigger Slack workflows and automation',
      category: 'Communication',
      icon: '⚡',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'slack',
        description: 'Slack workflow automation',
        protocol: 'rest',
        base_url: 'https://slack.com/api',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'trigger_workflow',
            path: '/workflows.stepCompleted',
            method: 'POST',
            description: 'Complete a workflow step',
            parameters: {
              workflow_step_execute_id: { type: 'string', required: true },
              outputs: { type: 'object', required: false }
            }
          }
        ]
      }
    }
  ],
  
  discord: [
    {
      id: 'discord-message',
      name: 'Discord Message',
      description: 'Send messages to Discord channels',
      category: 'Communication',
      icon: '🎮',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'discord',
        description: 'Discord bot messaging API',
        protocol: 'rest',
        base_url: 'https://discord.com/api/v10',
        auth_type: 'bot_token',
        primary_endpoints: [
          {
            name: 'send_message',
            path: '/channels/{channel_id}/messages',
            method: 'POST',
            description: 'Send a message to a channel',
            parameters: {
              channel_id: { type: 'string', required: true, description: 'Discord channel ID' },
              content: { type: 'string', required: true, description: 'Message content' },
              embeds: { type: 'array', required: false, description: 'Rich embeds' }
            }
          },
          {
            name: 'create_webhook',
            path: '/channels/{channel_id}/webhooks',
            method: 'POST',
            description: 'Create a webhook for the channel',
            parameters: {
              channel_id: { type: 'string', required: true },
              name: { type: 'string', required: true, description: 'Webhook name' }
            }
          }
        ]
      },
      defaultParameters: {
        content: 'Hello from Nodai! 🤖'
      },
      authSetup: {
        type: 'bot_token',
        docs_url: 'https://discord.com/developers/docs/intro'
      }
    }
  ],
  
  teams: [
    {
      id: 'teams-message',
      name: 'Teams Message',
      description: 'Send messages to Microsoft Teams channels',
      category: 'Communication',
      icon: '💼',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'teams',
        description: 'Microsoft Teams messaging API',
        protocol: 'rest',
        base_url: 'https://graph.microsoft.com/v1.0',
        auth_type: 'oauth2',
        primary_endpoints: [
          {
            name: 'send_channel_message',
            path: '/teams/{team_id}/channels/{channel_id}/messages',
            method: 'POST',
            description: 'Send message to a Teams channel',
            parameters: {
              team_id: { type: 'string', required: true, description: 'Team ID' },
              channel_id: { type: 'string', required: true, description: 'Channel ID' },
              body: { 
                type: 'object', 
                required: true,
                properties: {
                  content: { type: 'string', description: 'Message content' },
                  contentType: { type: 'string', default: 'text' }
                }
              }
            }
          },
          {
            name: 'send_chat_message',
            path: '/chats/{chat_id}/messages',
            method: 'POST',
            description: 'Send message to a Teams chat',
            parameters: {
              chat_id: { type: 'string', required: true, description: 'Chat ID' },
              body: { 
                type: 'object', 
                required: true,
                properties: {
                  content: { type: 'string', description: 'Message content' }
                }
              }
            }
          }
        ]
      },
      authSetup: {
        type: 'oauth2',
        scopes: ['ChannelMessage.Send', 'Chat.ReadWrite'],
        docs_url: 'https://docs.microsoft.com/en-us/graph/auth/'
      }
    }
  ]
};

// Export individual categories for easy access
export const slackTools = communicationTemplates.slack;
export const discordTools = communicationTemplates.discord;
export const teamsTools = communicationTemplates.teams;

// Export all communication tools as a flat array
export const allCommunicationTools = [
  ...communicationTemplates.slack,
  ...communicationTemplates.discord,
  ...communicationTemplates.teams
];

export default communicationTemplates; 