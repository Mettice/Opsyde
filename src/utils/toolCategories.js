// import { toolCategories, getCategoryList, getServicesForCategory, getServiceConfig } from './toolCategories';

export const TOOL_CATEGORIES = {
    image_generation: {
      name: 'Image Generation',
      description: 'Generate, edit, and manipulate images',
      icon: '🎨',
      services: {
        dalle: {
          name: 'DALL-E 3',
          description: 'OpenAI\'s most advanced image generation model',
          icon: '🤖',
          provider: 'openai',
          framework: 'openai',
          toolType: 'api',
          category: 'image_generation',
          capabilities: ['text-to-image', 'high-quality', 'creative'],
          pricing: '$0.040 per image (1024x1024)',
          config: {
            required: ['api_key', 'prompt'],
            fields: {
              api_key: {
                type: 'password',
                label: 'OpenAI API Key',
                placeholder: 'sk-...',
                required: true
              },
              prompt: {
                type: 'textarea',
                label: 'Image Prompt',
                placeholder: 'A detailed description of the image you want to create...',
                required: true,
                maxLength: 4000
              },
              size: {
                type: 'select',
                label: 'Image Size',
                options: [
                  { value: '1024x1024', label: '1024x1024 (Square)' },
                  { value: '1792x1024', label: '1792x1024 (Landscape)' },
                  { value: '1024x1792', label: '1024x1792 (Portrait)' }
                ],
                default: '1024x1024'
              },
              quality: {
                type: 'select',
                label: 'Quality',
                options: [
                  { value: 'standard', label: 'Standard' },
                  { value: 'hd', label: 'HD (+$0.040)' }
                ],
                default: 'standard'
              },
              style: {
                type: 'select',
                label: 'Style',
                options: [
                  { value: 'vivid', label: 'Vivid (more dramatic)' },
                  { value: 'natural', label: 'Natural (more realistic)' }
                ],
                default: 'vivid'
              }
            },
            frameworkConfig: {
              url: 'https://api.openai.com/v1/images/generations',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ${api_key}'
              }
            }
          }
        },
        midjourney: {
          name: 'Midjourney',
          description: 'Premium AI art generator known for artistic quality',
          icon: '🎭',
          provider: 'midjourney',
          framework: 'api',
          toolType: 'api',
          category: 'image_generation',
          capabilities: ['artistic', 'stylized', 'creative'],
          pricing: '$10/month (Basic)',
          config: {
            required: ['api_key', 'prompt'],
            fields: {
              api_key: {
                type: 'password',
                label: 'Midjourney API Key',
                placeholder: 'mj-...',
                required: true
              },
              prompt: {
                type: 'textarea',
                label: 'Art Prompt',
                placeholder: 'Describe the artwork you want to create...',
                required: true,
                maxLength: 4000
              },
              aspect_ratio: {
                type: 'select',
                label: 'Aspect Ratio',
                options: [
                  { value: '1:1', label: '1:1 (Square)' },
                  { value: '16:9', label: '16:9 (Landscape)' },
                  { value: '9:16', label: '9:16 (Portrait)' },
                  { value: '3:2', label: '3:2 (Photography)' }
                ],
                default: '1:1'
              },
              stylize: {
                type: 'range',
                label: 'Stylization',
                min: 0,
                max: 1000,
                default: 100,
                description: 'How artistic vs literal the image should be'
              },
              version: {
                type: 'select',
                label: 'Model Version',
                options: [
                  { value: '6', label: 'Version 6 (Latest)' },
                  { value: '5.2', label: 'Version 5.2' },
                  { value: '5.1', label: 'Version 5.1' }
                ],
                default: '6'
              }
            },
            frameworkConfig: {
              url: 'https://api.midjourney.com/v1/imagine',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ${api_key}'
              }
            }
          }
        },
        runway: {
          name: 'Runway ML',
          description: 'Creative AI tools for image and video generation',
          icon: '🛫',
          provider: 'runway',
          framework: 'api',
          toolType: 'api',
          category: 'image_generation',
          capabilities: ['image-to-video', 'creative-editing', 'ai-magic-tools'],
          pricing: '$15/month (Standard)',
          config: {
            required: ['api_key', 'prompt'],
            fields: {
              api_key: {
                type: 'password',
                label: 'Runway API Key',
                placeholder: 'rw-...',
                required: true
              },
              prompt: {
                type: 'textarea',
                label: 'Generation Prompt',
                placeholder: 'Describe what you want to create...',
                required: true
              },
              model: {
                type: 'select',
                label: 'Model',
                options: [
                  { value: 'gen2', label: 'Gen-2 (Video)' },
                  { value: 'gen1', label: 'Gen-1 (Video)' },
                  { value: 'inpainting', label: 'Inpainting' },
                  { value: 'expand-image', label: 'Expand Image' }
                ],
                default: 'gen2'
              },
              duration: {
                type: 'select',
                label: 'Duration (for video)',
                options: [
                  { value: '4', label: '4 seconds' },
                  { value: '8', label: '8 seconds' },
                  { value: '16', label: '16 seconds' }
                ],
                default: '4'
              }
            },
            frameworkConfig: {
              url: 'https://api.runwayml.com/v1/generate',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ${api_key}'
              }
            }
          }
        }
      }
    },
  
    text_generation: {
      name: 'Text Generation',
      description: 'Generate, process, and analyze text content',
      icon: '📝',
      services: {
        gpt4: {
          name: 'GPT-4 Turbo',
          description: 'OpenAI\'s most capable language model',
          icon: '🧠',
          provider: 'openai',
          framework: 'openai',
          toolType: 'llm',
          category: 'text_generation',
          capabilities: ['reasoning', 'coding', 'analysis', 'creative-writing'],
          pricing: '$0.01 per 1K tokens',
          config: {
            required: ['api_key', 'prompt'],
            fields: {
              api_key: {
                type: 'password',
                label: 'OpenAI API Key',
                placeholder: 'sk-...',
                required: true
              },
              prompt: {
                type: 'textarea',
                label: 'Prompt',
                placeholder: 'Enter your prompt here...',
                required: true
              },
              model: {
                type: 'select',
                label: 'Model',
                options: [
                  { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo (Latest)' },
                  { value: 'gpt-4', label: 'GPT-4' },
                  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
                ],
                default: 'gpt-4-turbo-preview'
              },
              temperature: {
                type: 'range',
                label: 'Temperature',
                min: 0,
                max: 2,
                step: 0.1,
                default: 0.7,
                description: 'Controls randomness (0 = focused, 2 = random)'
              },
              max_tokens: {
                type: 'number',
                label: 'Max Tokens',
                min: 1,
                max: 4000,
                default: 2000,
                description: 'Maximum length of the response'
              },
              system_message: {
                type: 'textarea',
                label: 'System Message (Optional)',
                placeholder: 'You are a helpful assistant...',
                description: 'Instructions that guide the model\'s behavior'
              }
            },
            frameworkConfig: {
              url: 'https://api.openai.com/v1/chat/completions',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ${api_key}'
              }
            }
          }
        },
        claude: {
          name: 'Claude 3',
          description: 'Anthropic\'s powerful and safe language model',
          icon: '🎭',
          provider: 'anthropic',
          framework: 'anthropic',
          toolType: 'llm',
          category: 'text_generation',
          capabilities: ['analysis', 'reasoning', 'safety', 'coding'],
          pricing: '$0.015 per 1K tokens',
          config: {
            required: ['api_key', 'prompt'],
            fields: {
              api_key: {
                type: 'password',
                label: 'Anthropic API Key',
                placeholder: 'sk-ant-...',
                required: true
              },
              prompt: {
                type: 'textarea',
                label: 'Prompt',
                placeholder: 'Enter your prompt here...',
                required: true
              },
              model: {
                type: 'select',
                label: 'Model',
                options: [
                  { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Most Capable)' },
                  { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet (Balanced)' },
                  { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Fastest)' }
                ],
                default: 'claude-3-sonnet-20240229'
              },
              temperature: {
                type: 'range',
                label: 'Temperature',
                min: 0,
                max: 1,
                step: 0.1,
                default: 0.7,
                description: 'Controls randomness'
              },
              max_tokens: {
                type: 'number',
                label: 'Max Tokens',
                min: 1,
                max: 4000,
                default: 2000
              }
            },
            frameworkConfig: {
              url: 'https://api.anthropic.com/v1/messages',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': '${api_key}',
                'anthropic-version': '2023-06-01'
              }
            }
          }
        }
      }
    },
  
    web_search: {
      name: 'Web Search',
      description: 'Search and research information from the web',
      icon: '🔍',
      services: {
        serper: {
          name: 'Serper',
          description: 'Fast and reliable Google search API',
          icon: '🔎',
          provider: 'serper',
          framework: 'api',
          toolType: 'api',
          category: 'web_search',
          capabilities: ['google-search', 'news', 'images', 'videos'],
          pricing: '$50 per 100K searches',
          config: {
            required: ['api_key', 'query'],
            fields: {
              api_key: {
                type: 'password',
                label: 'Serper API Key',
                placeholder: 'ser-...',
                required: true
              },
              query: {
                type: 'text',
                label: 'Search Query',
                placeholder: 'Enter your search query...',
                required: true
              },
              type: {
                type: 'select',
                label: 'Search Type',
                options: [
                  { value: 'search', label: 'Web Search' },
                  { value: 'news', label: 'News' },
                  { value: 'images', label: 'Images' },
                  { value: 'videos', label: 'Videos' }
                ],
                default: 'search'
              },
              num: {
                type: 'number',
                label: 'Number of Results',
                min: 1,
                max: 100,
                default: 10
              },
              country: {
                type: 'select',
                label: 'Country',
                options: [
                  { value: 'us', label: 'United States' },
                  { value: 'uk', label: 'United Kingdom' },
                  { value: 'ca', label: 'Canada' },
                  { value: 'de', label: 'Germany' },
                  { value: 'fr', label: 'France' }
                ],
                default: 'us'
              }
            },
            frameworkConfig: {
              url: 'https://google.serper.dev/search',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': '${api_key}'
              }
            }
          }
        },
        tavily: {
          name: 'Tavily',
          description: 'AI-powered research and search API',
          icon: '🎯',
          provider: 'tavily',
          framework: 'api',
          toolType: 'api',
          category: 'web_search',
          capabilities: ['ai-research', 'summarization', 'fact-checking'],
          pricing: '$0.001 per search',
          config: {
            required: ['api_key', 'query'],
            fields: {
              api_key: {
                type: 'password',
                label: 'Tavily API Key',
                placeholder: 'tvly-...',
                required: true
              },
              query: {
                type: 'text',
                label: 'Research Query',
                placeholder: 'What would you like to research?',
                required: true
              },
              search_depth: {
                type: 'select',
                label: 'Search Depth',
                options: [
                  { value: 'basic', label: 'Basic' },
                  { value: 'advanced', label: 'Advanced' }
                ],
                default: 'basic'
              },
              include_domains: {
                type: 'text',
                label: 'Include Domains (Optional)',
                placeholder: 'example.com, another.com',
                description: 'Comma-separated list of domains to focus on'
              },
              exclude_domains: {
                type: 'text',
                label: 'Exclude Domains (Optional)',
                placeholder: 'spam.com, ads.com',
                description: 'Comma-separated list of domains to avoid'
              },
              max_results: {
                type: 'number',
                label: 'Max Results',
                min: 1,
                max: 20,
                default: 5
              }
            },
            frameworkConfig: {
              url: 'https://api.tavily.com/search',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ${api_key}'
              }
            }
          }
        }
      }
    },
  
    data_processing: {
      name: 'Data Processing',
      description: 'Process, analyze, and transform data',
      icon: '📊',
      services: {
        pandas_analyzer: {
          name: 'Pandas Analyzer',
          description: 'Analyze data using Python Pandas',
          icon: '🐼',
          provider: 'custom',
          framework: 'custom',
          toolType: 'custom',
          category: 'data_processing',
          capabilities: ['data-analysis', 'statistics', 'visualization'],
          pricing: 'Free',
          config: {
            required: ['data_input'],
            fields: {
              data_input: {
                type: 'textarea',
                label: 'Data Input (CSV/JSON)',
                placeholder: 'Paste your data here or provide a URL...',
                required: true
              },
              operation: {
                type: 'select',
                label: 'Operation',
                options: [
                  { value: 'describe', label: 'Describe Data' },
                  { value: 'groupby', label: 'Group By Analysis' },
                  { value: 'correlation', label: 'Correlation Matrix' },
                  { value: 'plot', label: 'Create Visualization' }
                ],
                default: 'describe'
              },
              columns: {
                type: 'text',
                label: 'Columns (Optional)',
                placeholder: 'column1, column2, column3',
                description: 'Specify which columns to analyze'
              }
            },
            frameworkConfig: {
              type: 'custom_python',
              handler: 'pandas_processor'
            }
          }
        }
      }
    },
  
    communication: {
      name: 'Communication',
      description: 'Send emails, messages, and notifications',
      icon: '📬',
      services: {
        gmail: {
          name: 'Gmail',
          description: 'Send emails via Gmail API',
          icon: '📧',
          provider: 'google',
          framework: 'api',
          toolType: 'api',
          category: 'communication',
          capabilities: ['email-sending', 'attachments', 'templates'],
          pricing: 'Free (with quotas)',
          config: {
            required: ['client_id', 'client_secret', 'to', 'subject', 'body'],
            fields: {
              client_id: {
                type: 'password',
                label: 'Google Client ID',
                required: true
              },
              client_secret: {
                type: 'password',
                label: 'Google Client Secret',
                required: true
              },
              to: {
                type: 'text',
                label: 'To Email',
                placeholder: 'recipient@email.com',
                required: true
              },
              subject: {
                type: 'text',
                label: 'Subject',
                placeholder: 'Email subject...',
                required: true
              },
              body: {
                type: 'textarea',
                label: 'Email Body',
                placeholder: 'Email content...',
                required: true
              },
              cc: {
                type: 'text',
                label: 'CC (Optional)',
                placeholder: 'cc@email.com'
              },
              bcc: {
                type: 'text',
                label: 'BCC (Optional)',
                placeholder: 'bcc@email.com'
              }
            },
            frameworkConfig: {
              url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ${access_token}'
              }
            }
          }
        }
      }
    }
  };
  
  // Helper functions
  export function getCategoryList() {
    return Object.entries(TOOL_CATEGORIES).map(([key, category]) => ({
      id: key,
      name: category.name,
      description: category.description,
      icon: category.icon,
      serviceCount: Object.keys(category.services).length
    }));
  }
  
  export function getServicesForCategory(categoryId) {
    const category = TOOL_CATEGORIES[categoryId];
    if (!category) return [];
    
    return Object.entries(category.services).map(([key, service]) => ({
      id: key,
      categoryId,
      ...service
    }));
  }
  
  export function getServiceConfig(categoryId, serviceId) {
    const category = TOOL_CATEGORIES[categoryId];
    if (!category || !category.services[serviceId]) return null;
    
    return {
      categoryId,
      serviceId,
      ...category.services[serviceId]
    };
  }
  
  export function getFieldsForService(categoryId, serviceId) {
    const service = getServiceConfig(categoryId, serviceId);
    if (!service || !service.config) return [];
    
    return Object.entries(service.config.fields).map(([key, field]) => ({
      name: key,
      ...field
    }));
  }
  
  // Search and filtering helpers
  export function searchServices(query) {
    const results = [];
    const searchTerm = query.toLowerCase();
    
    Object.entries(TOOL_CATEGORIES).forEach(([categoryId, category]) => {
      Object.entries(category.services).forEach(([serviceId, service]) => {
        if (
          service.name.toLowerCase().includes(searchTerm) ||
          service.description.toLowerCase().includes(searchTerm) ||
          service.capabilities.some(cap => cap.includes(searchTerm))
        ) {
          results.push({
            categoryId,
            serviceId,
            category: category.name,
            ...service
          });
        }
      });
    });
    
    return results;
  }
  
  export function getServicesByProvider(provider) {
    const results = [];
    
    Object.entries(TOOL_CATEGORIES).forEach(([categoryId, category]) => {
      Object.entries(category.services).forEach(([serviceId, service]) => {
        if (service.provider === provider) {
          results.push({
            categoryId,
            serviceId,
            category: category.name,
            ...service
          });
        }
      });
    });
    
    return results;
  }
  
  export default TOOL_CATEGORIES;