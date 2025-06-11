// Marketing Integration Templates
// Mailchimp, SendGrid

export const marketingTemplates = {
  mailchimp: [
    {
      id: 'mailchimp-add-subscriber',
      name: 'Mailchimp Add Subscriber',
      description: 'Add subscribers to Mailchimp audiences',
      category: 'Marketing',
      icon: '📧',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'mailchimp',
        description: 'Mailchimp email marketing API',
        protocol: 'rest',
        base_url: 'https://{dc}.api.mailchimp.com/3.0',
        auth_type: 'api_key',
        primary_endpoints: [
          {
            name: 'add_member',
            path: '/lists/{list_id}/members',
            method: 'POST',
            description: 'Add a member to an audience',
            parameters: {
              list_id: { type: 'string', required: true, description: 'Audience/List ID' },
              email_address: { type: 'string', required: true, description: 'Email address' },
              status: { 
                type: 'string', 
                required: true, 
                enum: ['subscribed', 'unsubscribed', 'cleaned', 'pending'],
                default: 'subscribed',
                description: 'Subscription status'
              },
              merge_fields: { type: 'object', required: false, description: 'Additional fields (FNAME, LNAME, etc.)' },
              interests: { type: 'object', required: false, description: 'Interest group preferences' },
              tags: { type: 'array', required: false, description: 'Tags to apply' }
            }
          },
          {
            name: 'update_member',
            path: '/lists/{list_id}/members/{subscriber_hash}',
            method: 'PATCH',
            description: 'Update existing member',
            parameters: {
              list_id: { type: 'string', required: true },
              subscriber_hash: { type: 'string', required: true, description: 'MD5 hash of email' },
              merge_fields: { type: 'object', required: false },
              interests: { type: 'object', required: false }
            }
          }
        ]
      },
      defaultParameters: {
        status: 'subscribed',
        merge_fields: {
          FNAME: '',
          LNAME: ''
        }
      },
      authSetup: {
        type: 'api_key',
        docs_url: 'https://mailchimp.com/developer/marketing/api/lists/'
      }
    },
    {
      id: 'mailchimp-send-campaign',
      name: 'Mailchimp Send Campaign',
      description: 'Create and send email campaigns',
      category: 'Marketing',
      icon: '📬',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'mailchimp',
        description: 'Mailchimp campaign management',
        protocol: 'rest',
        base_url: 'https://{dc}.api.mailchimp.com/3.0',
        auth_type: 'api_key',
        primary_endpoints: [
          {
            name: 'create_campaign',
            path: '/campaigns',
            method: 'POST',
            description: 'Create a new campaign',
            parameters: {
              type: { type: 'string', required: true, default: 'regular', description: 'Campaign type' },
              recipients: {
                type: 'object',
                required: true,
                properties: {
                  list_id: { type: 'string', description: 'Audience ID' }
                }
              },
              settings: {
                type: 'object',
                required: true,
                properties: {
                  subject_line: { type: 'string', description: 'Email subject' },
                  from_name: { type: 'string', description: 'Sender name' },
                  reply_to: { type: 'string', description: 'Reply-to email' }
                }
              }
            }
          },
          {
            name: 'send_campaign',
            path: '/campaigns/{campaign_id}/actions/send',
            method: 'POST',
            description: 'Send a campaign',
            parameters: {
              campaign_id: { type: 'string', required: true, description: 'Campaign ID' }
            }
          }
        ]
      }
    }
  ],
  
  sendgrid: [
    {
      id: 'sendgrid-send-email',
      name: 'SendGrid Send Email',
      description: 'Send transactional emails via SendGrid',
      category: 'Marketing',
      icon: '✉️',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'sendgrid',
        description: 'SendGrid email delivery API',
        protocol: 'rest',
        base_url: 'https://api.sendgrid.com/v3',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'send_mail',
            path: '/mail/send',
            method: 'POST',
            description: 'Send an email',
            parameters: {
              personalizations: {
                type: 'array',
                required: true,
                description: 'Email personalizations',
                items: {
                  type: 'object',
                  properties: {
                    to: { type: 'array', description: 'Recipients' },
                    subject: { type: 'string', description: 'Email subject' }
                  }
                }
              },
              from: {
                type: 'object',
                required: true,
                properties: {
                  email: { type: 'string', description: 'Sender email' },
                  name: { type: 'string', description: 'Sender name' }
                }
              },
              content: {
                type: 'array',
                required: true,
                description: 'Email content',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', description: 'Content type (text/plain, text/html)' },
                    value: { type: 'string', description: 'Content body' }
                  }
                }
              },
              template_id: { type: 'string', required: false, description: 'Template ID' },
              dynamic_template_data: { type: 'object', required: false, description: 'Template variables' }
            }
          }
        ]
      },
      defaultParameters: {
        personalizations: [
          {
            to: [{ email: 'recipient@example.com' }],
            subject: 'Email from Nodai'
          }
        ],
        from: {
          email: 'noreply@yourdomain.com',
          name: 'Nodai Workflow'
        },
        content: [
          {
            type: 'text/plain',
            value: 'This email was sent from a Nodai workflow.'
          }
        ]
      },
      authSetup: {
        type: 'api_key',
        docs_url: 'https://docs.sendgrid.com/api-reference/mail-send/mail-send'
      }
    },
    {
      id: 'sendgrid-add-contact',
      name: 'SendGrid Add Contact',
      description: 'Add contacts to SendGrid marketing lists',
      category: 'Marketing',
      icon: '👥',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'sendgrid',
        description: 'SendGrid marketing contacts API',
        protocol: 'rest',
        base_url: 'https://api.sendgrid.com/v3',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'add_contacts',
            path: '/marketing/contacts',
            method: 'PUT',
            description: 'Add or update contacts',
            parameters: {
              list_ids: { type: 'array', required: false, description: 'List IDs to add contacts to' },
              contacts: {
                type: 'array',
                required: true,
                description: 'Array of contacts',
                items: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', description: 'Contact email' },
                    first_name: { type: 'string', description: 'First name' },
                    last_name: { type: 'string', description: 'Last name' },
                    custom_fields: { type: 'object', description: 'Custom field values' }
                  }
                }
              }
            }
          },
          {
            name: 'search_contacts',
            path: '/marketing/contacts/search',
            method: 'POST',
            description: 'Search for contacts',
            parameters: {
              query: { type: 'string', required: true, description: 'Search query' }
            }
          }
        ]
      },
      defaultParameters: {
        contacts: [
          {
            email: 'newcontact@example.com',
            first_name: 'New',
            last_name: 'Contact'
          }
        ]
      }
    }
  ]
};

// Export individual categories
export const mailchimpTools = marketingTemplates.mailchimp;
export const sendgridTools = marketingTemplates.sendgrid;

// Export all marketing tools as a flat array
export const allMarketingTools = [
  ...marketingTemplates.mailchimp,
  ...marketingTemplates.sendgrid
];

export default marketingTemplates; 