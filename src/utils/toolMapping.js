// Tool mapping between Smart Tool Selector and backend services
export const serviceMapping = {
    // Map Smart Tool Selector categories/services to backend categories/services
    image_generation: {
      dalle: {
        backendCategory: 'image_generation',
        backendService: 'dalle',
        provider: 'openai'
      },
      midjourney: {
        backendCategory: 'image_generation',
        backendService: 'midjourney',
        provider: 'midjourney'
      },
      runway: {
        backendCategory: 'image_generation',
        backendService: 'runway',
        provider: 'runway'
      }
    },
    text_generation: {
      gpt4: {
        backendCategory: 'text_generation',
        backendService: 'gpt4',
        provider: 'openai'
      },
      claude: {
        backendCategory: 'text_generation',
        backendService: 'claude',
        provider: 'anthropic'
      },
      openrouter: {
        backendCategory: 'text_generation',
        backendService: 'openrouter',
        provider: 'openrouter'
      },
      huggingface: {
        backendCategory: 'text_generation',
        backendService: 'huggingface',
        provider: 'huggingface'
      }
    },
    web_search: {
      serper: {
        backendCategory: 'web_search',
        backendService: 'serper',
        provider: 'serper'
      },
      tavily: {
        backendCategory: 'web_search',
        backendService: 'tavily',
        provider: 'tavily'
      },
      duckduckgo: {
        backendCategory: 'web_search',
        backendService: 'bing', // Maps to duckduckgo in backend
        provider: 'duckduckgo'
      }
    },
    llm_tools: {
      openai_llm: {
        backendCategory: 'llm_tools',
        backendService: 'openai',
        provider: 'openai'
      },
      openrouter_llm: {
        backendCategory: 'llm_tools',
        backendService: 'openrouter',
        provider: 'openrouter'
      },
      huggingface_llm: {
        backendCategory: 'llm_tools',
        backendService: 'huggingface',
        provider: 'huggingface'
      }
    }
  };
  
  // Transform Smart Tool Selector config to backend format
  export const transformConfigForBackend = (categoryId, serviceId, config, serviceConfig) => {
    
    
    if (!categoryId || !serviceId) {
        console.error('Missing categoryId or serviceId:', { categoryId, serviceId });
        throw new Error(`Missing required parameters: categoryId=${categoryId}, serviceId=${serviceId}`);
      }
    
    
    const mapping = serviceMapping[categoryId]?.[serviceId];
    if (!mapping) {
      console.error('Available mappings:', Object.keys(serviceMapping));
      console.error('Available services for category:', categoryId, Object.keys(serviceMapping[categoryId] || {}));  
      throw new Error(`No mapping found for ${categoryId}.${serviceId}`);
    }
  
    // Base configuration for all services
    const baseConfig = {
      api_key: config.api_key || config.apiKey,
      ...config
    };
  
    // Transform based on category
    switch (categoryId) {
      case 'image_generation':
        return {
          category: mapping.backendCategory,
          service: mapping.backendService,
          provider: mapping.provider,
          config: {
            ...baseConfig,
            prompt: config.prompt,
            size: config.size || config.image_size,
            quality: config.quality,
            style: config.style,
            aspect_ratio: config.aspect_ratio,
            stylize: config.stylize,
            version: config.version
          }
        };
  
      case 'text_generation':
        return {
          category: mapping.backendCategory,
          service: mapping.backendService,
          provider: mapping.provider,
          config: {
            ...baseConfig,
            prompt: config.prompt,
            model: config.model,
            system_message: config.system_message,
            temperature: parseFloat(config.temperature || 0.7),
            max_tokens: parseInt(config.max_tokens || 2000),
            top_p: parseFloat(config.top_p || 1.0),
            frequency_penalty: parseFloat(config.frequency_penalty || 0.0),
            presence_penalty: parseFloat(config.presence_penalty || 0.0),
            stop_sequences: config.stop_sequences ? config.stop_sequences.split(',').map(s => s.trim()) : undefined
          }
        };
  
      case 'web_search':
        return {
          category: mapping.backendCategory,
          service: mapping.backendService,
          provider: mapping.provider,
          config: {
            ...baseConfig,
            query: config.query,
            type: config.search_type || 'search',
            num: parseInt(config.num_results || 10),
            country: config.country || 'us',
            time_range: config.time_range,
            search_depth: config.search_depth,
            max_results: parseInt(config.max_results || 5),
            include_domains: config.include_domains,
            exclude_domains: config.exclude_domains
          }
        };
  
      case 'llm_tools':
        return {
          category: mapping.backendCategory,
          service: mapping.backendService,
          provider: mapping.provider,
          config: {
            ...baseConfig,
            model: config.model,
            temperature: parseFloat(config.temperature || 0.7),
            max_tokens: parseInt(config.max_tokens || 2000),
            system_message: config.system_message,
            top_p: parseFloat(config.top_p || 1.0),
            frequency_penalty: parseFloat(config.frequency_penalty || 0.0),
            presence_penalty: parseFloat(config.presence_penalty || 0.0),
            stop_sequences: config.stop_sequences ? config.stop_sequences.split(',').map(s => s.trim()) : undefined
          }
        };
  
      default:
        throw new Error(`Unsupported category: ${categoryId}`);
    }
  };
  
  // Generate workflow node configuration
  export const generateWorkflowNode = (transformedConfig, serviceConfig) => {
    return {
      id: `${transformedConfig.category}_${transformedConfig.service}_${Date.now()}`,
      type: 'tool',
      data: {
        label: serviceConfig.name,
        description: serviceConfig.description,
        category: transformedConfig.category,
        service: transformedConfig.service,
        provider: transformedConfig.provider,
        config: transformedConfig.config,
        capabilities: serviceConfig.capabilities,
        pricing: serviceConfig.pricing,
        icon: serviceConfig.icon
      },
      position: { x: 100, y: 100 } // Default position
    };
  };