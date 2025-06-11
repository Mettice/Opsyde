// Social Media Integration Templates
// Leverages existing Universal API + AI Integration infrastructure

export const socialMediaTemplates = {
  linkedin: [
    {
      id: 'linkedin-post',
      name: 'LinkedIn Post',
      description: 'Create and publish LinkedIn posts',
      category: 'Social Media',
      icon: '💼',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'linkedin',
        description: 'LinkedIn API for posting content',
        protocol: 'rest',
        base_url: 'https://api.linkedin.com/v2',
        auth_type: 'oauth2',
        primary_endpoints: [
          {
            name: 'create_post',
            path: '/ugcPosts',
            method: 'POST',
            description: 'Create a new LinkedIn post'
          }
        ],
        data_mapping: {
          'text': 'specificContent.com.linkedin.ugc.ShareContent.shareCommentary.text',
          'visibility': 'visibility.com.linkedin.ugc.MemberNetworkVisibility'
        }
      },
      parameters: {
        content: {
          type: 'textarea',
          description: 'Post content',
          required: true,
          placeholder: 'What would you like to share on LinkedIn?'
        },
        visibility: {
          type: 'select',
          description: 'Post visibility',
          options: ['PUBLIC', 'CONNECTIONS'],
          default: 'PUBLIC'
        }
      },
      template_data: {
        apiEndpoint: 'https://api.linkedin.com/v2/ugcPosts',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {{linkedin_token}}'
        }
      }
    },
    {
      id: 'linkedin-company-post',
      name: 'LinkedIn Company Post',
      description: 'Post content to LinkedIn company page',
      category: 'Social Media',
      icon: '🏢',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'linkedin',
        description: 'LinkedIn Company API for organizational posting',
        protocol: 'rest',
        base_url: 'https://api.linkedin.com/v2',
        auth_type: 'oauth2'
      },
      parameters: {
        content: {
          type: 'textarea',
          description: 'Company post content',
          required: true
        },
        company_id: {
          type: 'text',
          description: 'LinkedIn Company ID',
          required: true
        }
      }
    },
    {
      id: 'linkedin-profile-update',
      name: 'LinkedIn Profile Update',
      description: 'Update LinkedIn profile information',
      category: 'Social Media',
      icon: '👤',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'linkedin',
        description: 'LinkedIn Profile API for updating profile data',
        protocol: 'rest',
        base_url: 'https://api.linkedin.com/v2'
      }
    }
  ],
  facebook: [
    {
      id: 'facebook-page-post',
      name: 'Facebook Page Post',
      description: 'Post content to Facebook page',
      category: 'Social Media',
      icon: '📘',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'facebook',
        description: 'Facebook Graph API for page posting',
        protocol: 'rest',
        base_url: 'https://graph.facebook.com/v18.0',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'create_page_post',
            path: '/{page-id}/feed',
            method: 'POST',
            description: 'Create a post on Facebook page'
          }
        ]
      },
      parameters: {
        message: {
          type: 'textarea',
          description: 'Post message',
          required: true,
          placeholder: 'What would you like to post?'
        },
        page_id: {
          type: 'text',
          description: 'Facebook Page ID',
          required: true
        },
        link: {
          type: 'url',
          description: 'Optional link to share',
          required: false
        }
      },
      template_data: {
        apiEndpoint: 'https://graph.facebook.com/v18.0/{{page_id}}/feed',
        method: 'POST'
      }
    },
    {
      id: 'facebook-story',
      name: 'Facebook Story',
      description: 'Create Facebook story',
      category: 'Social Media',
      icon: '📖',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'facebook',
        description: 'Facebook Stories API',
        protocol: 'rest',
        base_url: 'https://graph.facebook.com/v18.0'
      }
    },
    {
      id: 'facebook-event',
      name: 'Facebook Event',
      description: 'Create Facebook event',
      category: 'Social Media',
      icon: '📅',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'facebook',
        description: 'Facebook Events API',
        protocol: 'rest',
        base_url: 'https://graph.facebook.com/v18.0'
      }
    }
  ],
  whatsapp: [
    {
      id: 'whatsapp-message',
      name: 'WhatsApp Business Message',
      description: 'Send WhatsApp Business messages',
      category: 'Messaging',
      icon: '💬',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'whatsapp',
        description: 'WhatsApp Business API for messaging',
        protocol: 'rest',
        base_url: 'https://graph.facebook.com/v18.0',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'send_message',
            path: '/{phone-number-id}/messages',
            method: 'POST',
            description: 'Send WhatsApp message'
          }
        ]
      },
      parameters: {
        to: {
          type: 'text',
          description: 'Recipient phone number (with country code)',
          required: true,
          placeholder: '+1234567890'
        },
        message: {
          type: 'textarea',
          description: 'Message content',
          required: true,
          placeholder: 'Your WhatsApp message...'
        },
        message_type: {
          type: 'select',
          description: 'Message type',
          options: ['text', 'template', 'media'],
          default: 'text'
        }
      },
      template_data: {
        apiEndpoint: 'https://graph.facebook.com/v18.0/{{phone_number_id}}/messages',
        method: 'POST'
      }
    },
    {
      id: 'whatsapp-template',
      name: 'WhatsApp Template Message',
      description: 'Send approved WhatsApp template messages',
      category: 'Messaging',
      icon: '📋',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'whatsapp',
        description: 'WhatsApp Business Template API',
        protocol: 'rest',
        base_url: 'https://graph.facebook.com/v18.0'
      }
    },
    {
      id: 'whatsapp-broadcast',
      name: 'WhatsApp Broadcast',
      description: 'Send broadcast messages to multiple recipients',
      category: 'Messaging',
      icon: '📢',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'whatsapp',
        description: 'WhatsApp Business Broadcast API',
        protocol: 'rest',
        base_url: 'https://graph.facebook.com/v18.0'
      }
    }
  ],
  telegram: [
    {
      id: 'telegram-message',
      name: 'Telegram Message',
      description: 'Send Telegram messages',
      category: 'Messaging',
      icon: '✈️',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'telegram',
        description: 'Telegram Bot API for messaging',
        protocol: 'rest',
        base_url: 'https://api.telegram.org/bot{{bot_token}}',
        auth_type: 'none',
        primary_endpoints: [
          {
            name: 'send_message',
            path: '/sendMessage',
            method: 'POST',
            description: 'Send text message'
          }
        ]
      },
      parameters: {
        chat_id: {
          type: 'text',
          description: 'Chat ID or username',
          required: true,
          placeholder: '@username or chat_id'
        },
        text: {
          type: 'textarea',
          description: 'Message text',
          required: true,
          placeholder: 'Your Telegram message...'
        },
        parse_mode: {
          type: 'select',
          description: 'Message formatting',
          options: ['HTML', 'Markdown', 'MarkdownV2'],
          default: 'HTML'
        }
      },
      template_data: {
        apiEndpoint: 'https://api.telegram.org/bot{{bot_token}}/sendMessage',
        method: 'POST'
      }
    },
    {
      id: 'telegram-photo',
      name: 'Telegram Photo',
      description: 'Send photos via Telegram',
      category: 'Messaging',
      icon: '📷',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'telegram',
        description: 'Telegram Bot API for sending photos',
        protocol: 'rest',
        base_url: 'https://api.telegram.org/bot{{bot_token}}'
      }
    },
    {
      id: 'telegram-channel-post',
      name: 'Telegram Channel Post',
      description: 'Post to Telegram channel',
      category: 'Social Media',
      icon: '📣',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'telegram',
        description: 'Telegram Bot API for channel posting',
        protocol: 'rest',
        base_url: 'https://api.telegram.org/bot{{bot_token}}'
      }
    }
  ]
};

// Quick-access flat list for easy integration
export const allSocialMediaTools = [
  ...socialMediaTemplates.linkedin,
  ...socialMediaTemplates.facebook,
  ...socialMediaTemplates.whatsapp,
  ...socialMediaTemplates.telegram
];

// Category groupings
export const socialMediaCategories = {
  'Social Media': ['linkedin-post', 'linkedin-company-post', 'facebook-page-post', 'telegram-channel-post'],
  'Messaging': ['whatsapp-message', 'whatsapp-broadcast', 'telegram-message'],
  'Professional': ['linkedin-post', 'linkedin-company-post', 'linkedin-profile-update'],
  'Business': ['facebook-page-post', 'whatsapp-message', 'whatsapp-template']
};

export default socialMediaTemplates; 