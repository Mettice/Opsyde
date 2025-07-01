import React from 'react';

// Common fields that appear in all nodes
const commonFields = {
  label: {
    type: 'string',
    description: 'Node name',
    optional: false
  },
  description: {
    type: 'string',
    description: 'Node description',
    optional: true
  },
  // Add field mappings support to all nodes
  field_mappings: {
    type: 'object',
    description: 'Explicit field mappings from previous nodes',
    optional: true,
    ui_component: 'field_mapper',
    ui_hidden: false,
    ui_label: 'Field Mappings',
    ui_description: 'Map fields from previous nodes to this node\'s inputs'
  }
};

// Task node schema - Simplified and standardized
const taskNodeSchema = {
  fields: {
    ...commonFields,
    agent_ref: {
      type: 'string',
      description: 'Agent Reference (select agent node to use)',
      optional: false
    },
    expected_output: {
      type: 'string',
      description: 'Expected output/result of the task',
      optional: true
    },
    async_execution: {
      type: 'boolean',
      description: 'Execute task asynchronously',
      optional: true,
      default: false
    },
    dependencies: {
      type: 'array',
      description: 'List of node IDs this task depends on',
      optional: true,
      default: []
    }
  }
};

// Tool node schema - Standardized field names
const toolNodeSchema = {
  fields: {
    ...commonFields,
    tool_type: {
      type: 'string',
      description: 'Tool type',
      optional: false,
      options: ['api', 'webhook', 'database', 'file', 'custom', 'llm', 'universal_api'],
      ui_component: 'select',
      ui_placeholder: 'Select tool type...'
    },
    framework: {
      type: 'string',
      description: 'Framework',
      optional: false,
      options: ['openai', 'anthropic', 'requests', 'axios', 'fetch', 'custom', 'universal_api'],
      ui_component: 'select',
      ui_placeholder: 'Select framework...'
    },
    framework_config: {
      type: 'object',
      description: 'Framework configuration',
      optional: true,
      ui_component: 'object_editor',
      properties: {
        endpoint: {
          type: 'string',
          description: 'API endpoint URL',
          optional: true,
          ui_component: 'input',
          ui_placeholder: 'https://api.example.com/endpoint'
        },
        method: {
          type: 'string',
          description: 'HTTP method',
          optional: true,
          options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          ui_component: 'select',
          default: 'POST'
        },
        headers: {
          type: 'object',
          description: 'Request headers',
          optional: true,
          ui_component: 'key_value_editor',
          ui_placeholder: 'Add custom headers...'
        },
        url: {
          type: 'string',
          description: 'Webhook URL',
          optional: true,
          ui_component: 'input',
          ui_placeholder: 'https://webhook.site/your-unique-id'
        },
        provider: {
          type: 'string',
          description: 'LLM provider',
          optional: true,
          options: ['openai', 'anthropic', 'openrouter', 'huggingface', 'perplexity', 'gemini'],
          ui_component: 'byok_provider_selector'
        },
        model: {
          type: 'string',
          description: 'LLM model',
          optional: true,
          ui_component: 'model_selector',
          depends_on: ['provider']
        },
        temperature: {
          type: 'float',
          description: 'Temperature (0.0 - 2.0)',
          optional: true,
          default: 0.7,
          ui_component: 'slider',
          validation: { min_value: 0.0, max_value: 2.0 }
        },
        max_tokens: {
          type: 'integer',
          description: 'Maximum tokens',
          optional: true,
          default: 4000,
          ui_component: 'number',
          validation: { min_value: 1, max_value: 32000 }
        },
        service_name: {
          type: 'string',
          description: 'Service name for universal API',
          optional: true,
          ui_component: 'input',
          ui_placeholder: 'OpenWeatherMap, GitHub, etc.'
        },
        description: {
          type: 'string',
          description: 'Service description',
          optional: true,
          ui_component: 'textarea',
          ui_placeholder: 'What this API does'
        }
      }
    },
    parameters: {
      type: 'object',
      description: 'Tool parameters',
      optional: true,
      ui_component: 'key_value_editor'
    },
    retry_count: {
      type: 'integer',
      description: 'Number of retry attempts',
      optional: true,
      default: 3,
      ui_component: 'number'
    },
    timeout: {
      type: 'integer',
      description: 'Request timeout (seconds)',
      optional: true,
      default: 30,
      ui_component: 'number'
    },
    is_async: {
      type: 'boolean',
      description: 'Execute asynchronously',
      optional: true,
      default: false,
      ui_component: 'switch'
    }
  }
};

// Logic node schema - Standardized
const logicNodeSchema = {
  fields: {
    ...commonFields,
    conditions: {
      type: 'array',
      description: 'Logic conditions',
      optional: false
    },
    operator: {
      type: 'string',
      description: 'Logic operator (AND/OR)',
      optional: true,
      default: 'AND'
    }
  }
};

// Input node schema - Standardized
const inputNodeSchema = {
  fields: {
    ...commonFields,
    input_type: {
      type: 'string',
      description: 'Input type',
      optional: false,
      options: ['text', 'file', 'multimodal', 'url']
    },
    placeholder: {
      type: 'string',
      description: 'Placeholder text',
      optional: true
    },
    default_value: {
      type: 'string',
      description: 'Default value',
      optional: true
    },
    validation: {
      type: 'object',
      description: 'Input validation rules',
      optional: true
    }
  }
};

// Trigger node schema - Standardized
const triggerNodeSchema = {
  fields: {
    ...commonFields,
    trigger_type: {
      type: 'string',
      description: 'Trigger type',
      optional: false,
      options: ['manual', 'webhook', 'schedule', 'universal_polling', 'universal_webhook']
    },
    // Universal Polling specific fields
    service_name: {
      type: 'string',
      description: 'Service name (e.g., Airtable, Notion, GitHub)',
      optional: true,
      showWhen: { field: 'trigger_type', value: 'universal_polling' }
    },
    api_endpoint: {
      type: 'string',
      description: 'API endpoint URL',
      optional: true,
      showWhen: { field: 'trigger_type', value: 'universal_polling' }
    },
    polling_interval: {
      type: 'number',
      description: 'Polling interval (minutes)',
      optional: true,
      default: 5,
      min: 1,
      max: 1440,
      showWhen: { field: 'trigger_type', value: 'universal_polling' }
    },
    auth_type: {
      type: 'string',
      description: 'Authentication type',
      optional: true,
      options: ['none', 'api_key', 'bearer_token', 'basic_auth'],
      default: 'none',
      showWhen: { field: 'trigger_type', value: 'universal_polling' }
    },
    change_detection_method: {
      type: 'string',
      description: 'Method to detect changes',
      optional: true,
      options: ['array_length', 'field_value', 'timestamp', 'response_hash'],
      default: 'array_length',
      showWhen: { field: 'trigger_type', value: 'universal_polling' }
    },
    // Schedule specific fields
    schedule: {
      type: 'object',
      description: 'Schedule configuration',
      optional: true,
      showWhen: { field: 'trigger_type', value: 'schedule' },
      properties: {
        schedule_type: {
          type: 'string',
          description: 'Schedule type',
          options: ['once', 'daily', 'weekly', 'monthly']
        },
        run_at: {
          type: 'string',
          description: 'When to run (for once)'
        },
        run_time: {
          type: 'string',
          description: 'Time to run (HH:MM)'
        },
        schedule_weekday: {
          type: 'string',
          description: 'Day of week (for weekly)',
          options: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        },
        schedule_month_day: {
          type: 'number',
          description: 'Day of month (for monthly)',
          min: 1,
          max: 31
        }
      }
    },
    // Webhook specific fields
    webhook: {
      type: 'object',
      description: 'Webhook configuration',
      optional: true,
      showWhen: { field: 'trigger_type', value: 'webhook' },
      properties: {
        method: {
          type: 'string',
          description: 'HTTP method',
          options: ['GET', 'POST', 'PUT', 'DELETE'],
          default: 'POST'
        },
        path: {
          type: 'string',
          description: 'Webhook path'
        }
      }
    }
  }
};

// Agent node schema - Standardized field names
const agentNodeSchema = {
  fields: {
    ...commonFields,
    role: {
      type: 'string',
      description: 'Agent role',
      optional: false
    },
    goal: {
      type: 'string',
      description: 'Agent goal',
      optional: false
    },
    backstory: {
      type: 'string',
      description: 'Agent backstory',
      optional: true
    },
    llm_model: {
      type: 'string',
      description: 'LLM model',
      optional: false,
      default: 'gpt-4'
    },
    temperature: {
      type: 'float',
      description: 'Temperature',
      optional: true,
      default: 0.7
    },
    max_tokens: {
      type: 'integer',
      description: 'Max tokens',
      optional: true,
      default: 4000
    },
    framework: {
      type: 'string',
      description: 'LLM framework',
      optional: false
    },
    framework_config: {
      type: 'object',
      description: 'Framework configuration',
      optional: true
    },
    allow_delegation: {
      type: 'boolean',
      description: 'Allow delegation to other agents',
      optional: true,
      default: false
    },
    enable_memory: {
      type: 'boolean',
      description: 'Enable memory',
      optional: true,
      default: false
    }
  }
};

// Chat node schema - Standardized
const chatNodeSchema = {
  fields: {
    ...commonFields,
    system_prompt: {
      type: 'string',
      description: 'System prompt for the chat',
      optional: true,
      ui_component: 'textarea',
      ui_placeholder: 'Enter system prompt to define the AI assistant behavior...'
    },
    llm_model: {
      type: 'string',
      description: 'LLM model',
      optional: false,
      ui_component: 'model_selector'
    },
    temperature: {
      type: 'float',
      description: 'Sampling temperature (0.0 = deterministic, 2.0 = very creative)',
      optional: true,
      default: 0.7,
      ui_component: 'slider',
      validation: { min_value: 0.0, max_value: 2.0 },
      ui_step: 0.1
    },
    max_tokens: {
      type: 'integer',
      description: 'Maximum tokens in response',
      optional: true,
      default: 4000,
      ui_component: 'number',
      validation: { min_value: 1, max_value: 32000 }
    },
    framework: {
      type: 'string',
      description: 'LLM framework',
      optional: false
    },
    framework_config: {
      type: 'object',
      description: 'Framework configuration',
      optional: true
    },
    enable_memory: {
      type: 'boolean',
      description: 'Enable conversation memory',
      optional: true,
      default: false
    },
    max_history: {
      type: 'integer',
      description: 'Maximum conversation history length',
      optional: true,
      default: 10,
      ui_component: 'number',
      validation: { min_value: 1, max_value: 100 }
    }
  }
};

// Output node schema - Standardized
const outputNodeSchema = {
  fields: {
    ...commonFields,
    output_type: {
      type: 'string',
      description: 'Output type',
      optional: false,
      options: ['console', 'file', 'webhook', 'email', 'database', 'api']
    },
    config: {
      type: 'object',
      description: 'Output configuration',
      optional: true
    }
  }
};

// Delay node schema - Standardized
const delayNodeSchema = {
  fields: {
    ...commonFields,
    duration: {
      type: 'number',
      description: 'Duration (seconds)',
      optional: false,
      default: 5,
      min: 1
    }
  }
};

export {
  taskNodeSchema,
  toolNodeSchema,
  logicNodeSchema,
  inputNodeSchema,
  triggerNodeSchema,
  agentNodeSchema,
  chatNodeSchema,
  outputNodeSchema,
  delayNodeSchema
};