// Developer Integration Templates
// GitHub, GitLab, Webhooks

export const developerTemplates = {
  github: [
    {
      id: 'github-create-issue',
      name: 'GitHub Create Issue',
      description: 'Create issues in GitHub repositories',
      category: 'Developer',
      icon: '🐛',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'github',
        description: 'GitHub API for repository management',
        protocol: 'rest',
        base_url: 'https://api.github.com',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'create_issue',
            path: '/repos/{owner}/{repo}/issues',
            method: 'POST',
            description: 'Create a new issue',
            parameters: {
              owner: { type: 'string', required: true, description: 'Repository owner' },
              repo: { type: 'string', required: true, description: 'Repository name' },
              title: { type: 'string', required: true, description: 'Issue title' },
              body: { type: 'string', required: false, description: 'Issue description' },
              labels: { type: 'array', required: false, description: 'Issue labels' },
              assignees: { type: 'array', required: false, description: 'Assigned users' }
            }
          },
          {
            name: 'create_pull_request',
            path: '/repos/{owner}/{repo}/pulls',
            method: 'POST',
            description: 'Create a pull request',
            parameters: {
              owner: { type: 'string', required: true },
              repo: { type: 'string', required: true },
              title: { type: 'string', required: true, description: 'PR title' },
              head: { type: 'string', required: true, description: 'Source branch' },
              base: { type: 'string', required: true, description: 'Target branch' },
              body: { type: 'string', required: false, description: 'PR description' }
            }
          }
        ]
      },
      defaultParameters: {
        title: 'Issue created from Nodai',
        body: 'This issue was automatically created by a Nodai workflow.'
      },
      authSetup: {
        type: 'personal_access_token',
        scopes: ['repo', 'issues:write'],
        docs_url: 'https://docs.github.com/en/authentication'
      }
    },
    {
      id: 'github-repo-stats',
      name: 'GitHub Repository Stats',
      description: 'Get repository statistics and information',
      category: 'Developer',
      icon: '📊',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'github',
        description: 'GitHub repository analytics',
        protocol: 'rest',
        base_url: 'https://api.github.com',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'get_repo',
            path: '/repos/{owner}/{repo}',
            method: 'GET',
            description: 'Get repository information',
            parameters: {
              owner: { type: 'string', required: true },
              repo: { type: 'string', required: true }
            }
          },
          {
            name: 'get_contributors',
            path: '/repos/{owner}/{repo}/contributors',
            method: 'GET',
            description: 'Get repository contributors',
            parameters: {
              owner: { type: 'string', required: true },
              repo: { type: 'string', required: true }
            }
          },
          {
            name: 'get_commits',
            path: '/repos/{owner}/{repo}/commits',
            method: 'GET',
            description: 'Get repository commits',
            parameters: {
              owner: { type: 'string', required: true },
              repo: { type: 'string', required: true },
              since: { type: 'string', required: false, description: 'Only commits after this date' }
            }
          }
        ]
      }
    }
  ],
  
  gitlab: [
    {
      id: 'gitlab-create-issue',
      name: 'GitLab Create Issue',
      description: 'Create issues in GitLab projects',
      category: 'Developer',
      icon: '🦊',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'gitlab',
        description: 'GitLab API for project management',
        protocol: 'rest',
        base_url: 'https://gitlab.com/api/v4',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'create_issue',
            path: '/projects/{project_id}/issues',
            method: 'POST',
            description: 'Create a new issue',
            parameters: {
              project_id: { type: 'string', required: true, description: 'Project ID or path' },
              title: { type: 'string', required: true, description: 'Issue title' },
              description: { type: 'string', required: false, description: 'Issue description' },
              labels: { type: 'string', required: false, description: 'Comma-separated labels' },
              assignee_ids: { type: 'array', required: false, description: 'Assigned user IDs' }
            }
          },
          {
            name: 'create_merge_request',
            path: '/projects/{project_id}/merge_requests',
            method: 'POST',
            description: 'Create a merge request',
            parameters: {
              project_id: { type: 'string', required: true },
              source_branch: { type: 'string', required: true, description: 'Source branch' },
              target_branch: { type: 'string', required: true, description: 'Target branch' },
              title: { type: 'string', required: true, description: 'MR title' },
              description: { type: 'string', required: false, description: 'MR description' }
            }
          }
        ]
      },
      defaultParameters: {
        title: 'Issue created from Nodai',
        description: 'This issue was automatically created by a Nodai workflow.'
      },
      authSetup: {
        type: 'personal_access_token',
        scopes: ['api', 'write_repository'],
        docs_url: 'https://docs.gitlab.com/ee/api/'
      }
    }
  ],
  
  webhooks: [
    {
      id: 'custom-webhook',
      name: 'Custom Webhook',
      description: 'Send data to any custom webhook endpoint',
      category: 'Developer',
      icon: '🔗',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'webhook',
        description: 'Custom webhook integration',
        protocol: 'rest',
        base_url: 'configurable',
        auth_type: 'configurable',
        primary_endpoints: [
          {
            name: 'post_webhook',
            path: 'configurable',
            method: 'POST',
            description: 'Send POST request to webhook',
            parameters: {
              url: { type: 'string', required: true, description: 'Webhook URL' },
              headers: { type: 'object', required: false, description: 'Custom headers' },
              data: { type: 'object', required: true, description: 'Payload data' }
            }
          },
          {
            name: 'get_webhook',
            path: 'configurable',
            method: 'GET',
            description: 'Send GET request to webhook',
            parameters: {
              url: { type: 'string', required: true, description: 'Webhook URL' },
              headers: { type: 'object', required: false, description: 'Custom headers' },
              params: { type: 'object', required: false, description: 'Query parameters' }
            }
          }
        ]
      },
      defaultParameters: {
        data: {
          message: 'Hello from Nodai!',
          timestamp: new Date().toISOString(),
          source: 'nodai-workflow'
        }
      },
      authSetup: {
        type: 'configurable',
        docs_url: 'https://webhook.site'
      }
    },
    {
      id: 'discord-webhook',
      name: 'Discord Webhook',
      description: 'Send messages via Discord webhooks',
      category: 'Developer',
      icon: '🎮',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'discord_webhook',
        description: 'Discord webhook messaging',
        protocol: 'rest',
        base_url: 'https://discord.com/api/webhooks',
        auth_type: 'none',
        primary_endpoints: [
          {
            name: 'send_message',
            path: '/{webhook_id}/{webhook_token}',
            method: 'POST',
            description: 'Send message via Discord webhook',
            parameters: {
              webhook_id: { type: 'string', required: true, description: 'Webhook ID' },
              webhook_token: { type: 'string', required: true, description: 'Webhook token' },
              content: { type: 'string', required: false, description: 'Message content' },
              embeds: { type: 'array', required: false, description: 'Rich embeds' },
              username: { type: 'string', required: false, description: 'Override username' }
            }
          }
        ]
      },
      defaultParameters: {
        content: 'Message from Nodai workflow! 🤖'
      }
    },
    {
      id: 'slack-webhook',
      name: 'Slack Webhook',
      description: 'Send messages via Slack incoming webhooks',
      category: 'Developer',
      icon: '📢',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'slack_webhook',
        description: 'Slack incoming webhook',
        protocol: 'rest',
        base_url: 'configurable',
        auth_type: 'none',
        primary_endpoints: [
          {
            name: 'send_message',
            path: 'configurable',
            method: 'POST',
            description: 'Send message via Slack webhook',
            parameters: {
              webhook_url: { type: 'string', required: true, description: 'Slack webhook URL' },
              text: { type: 'string', required: false, description: 'Message text' },
              blocks: { type: 'array', required: false, description: 'Rich blocks' },
              channel: { type: 'string', required: false, description: 'Override channel' },
              username: { type: 'string', required: false, description: 'Override username' }
            }
          }
        ]
      },
      defaultParameters: {
        text: 'Message from Nodai workflow! 🚀'
      }
    }
  ]
};

// Export individual categories
export const githubTools = developerTemplates.github;
export const gitlabTools = developerTemplates.gitlab;
export const webhookTools = developerTemplates.webhooks;

// Export all developer tools as a flat array
export const allDeveloperTools = [
  ...developerTemplates.github,
  ...developerTemplates.gitlab,
  ...developerTemplates.webhooks
];

export default developerTemplates; 