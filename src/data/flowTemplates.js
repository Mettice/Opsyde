// Import modularized templates
import { autoEmailReplyTemplate } from './flowTemplates/autoEmailReplyTemplate';
import { flowTemplates as crmQualifierTemplates } from './flowTemplates/crm_qualifier_bot';
import { flowTemplates as cvTemplates } from './flowTemplates/cvTemplates';

// Define base templates
const baseTemplates = [
    {
      name: 'Automation Platform Market Research 2025',
      description: '🔄 Comprehensive market analysis of automation platforms: n8n, Make.com, Zapier with competitive positioning',
      thumbnail: '/img/automation-market-research.png',
      nodes: [
        {
          id: 'input-automation-1',
          type: 'input',
          position: { x: 100, y: 100 },
          data: {
            label: 'Research Query',
            description: 'Enter your automation platform research requirements',
            inputType: 'text',
            placeholder: 'Enter specific research focus or questions...',
            value: 'Analyze the competitive landscape of automation platforms in 2025, focusing on n8n, Make.com, and Zapier. Include market positioning, pricing strategies, target audiences, and growth opportunities.',
            nodeId: 'input-automation-1',
            nodeType: 'input'
          }
        },
        {
          id: 'agent-automation-research-1',
          type: 'agent',
          position: { x: 350, y: 100 },
          data: {
            label: 'Automation Market Analyst',
            role: 'Senior Automation Market Research Analyst',
            goal: 'Provide comprehensive market analysis of automation platforms with focus on competitive positioning and strategic insights',
            backstory: 'You are a specialized market research analyst with 8+ years of experience in the automation and workflow technology sector. You have deep expertise in analyzing SaaS platforms, particularly automation tools like n8n, Make.com (formerly Integromat), and Zapier. You understand the nuances of no-code/low-code markets, enterprise adoption patterns, and competitive dynamics in the automation space.',
            framework: 'crewai',
            frameworkConfig: {
              model: 'gpt-4',
              temperature: 0.7,
              max_tokens: 4000,
              api_key: ''
            },
            llmModel: 'gpt-4',
            temperature: 0.7,
            max_tokens: 4000,
            allowDelegation: true,
            enableMemory: true,
            verbose: true,
            nodeId: 'agent-automation-research-1',
            nodeType: 'agent'
          }
        },
        {
          id: 'task-market-analysis-1',
          type: 'task',
          position: { x: 600, y: 50 },
          data: {
            label: 'Market Landscape Analysis',
            description: 'Analyze the overall automation platform market with focus on key players',
            expectedOutput: 'Comprehensive market analysis including: 1) Market size and growth projections for automation platforms, 2) Key market segments (SMB, Enterprise, Developer), 3) Technology trends driving adoption, 4) Competitive landscape overview with market share estimates, 5) Regulatory and compliance considerations',
            async: false,
            agentId: 'agent-automation-research-1',
            nodeId: 'task-market-analysis-1',
            nodeType: 'task'
          }
        },
        {
          id: 'task-platform-comparison-1',
          type: 'task',
          position: { x: 600, y: 200 },
          data: {
            label: 'Platform Competitive Analysis',
            description: 'Deep dive comparison of n8n, Make.com, and Zapier positioning strategies',
            expectedOutput: 'Detailed competitive analysis including: 1) Feature comparison matrix (integrations, pricing, ease of use), 2) Target audience analysis for each platform, 3) Pricing strategy comparison and value propositions, 4) Strengths and weaknesses of each platform, 5) Market positioning and differentiation strategies, 6) Customer acquisition and retention approaches',
            async: false,
            agentId: 'agent-automation-research-1',
            nodeId: 'task-platform-comparison-1',
            nodeType: 'task'
          }
        },
        {
          id: 'task-strategic-recommendations-1',
          type: 'task',
          position: { x: 600, y: 350 },
          data: {
            label: 'Strategic Recommendations',
            description: 'Provide actionable strategic insights and market opportunities',
            expectedOutput: 'Strategic recommendations including: 1) Market opportunities and gaps for each platform, 2) Recommended positioning strategies for 2025, 3) Potential partnership and integration opportunities, 4) Risk assessment and mitigation strategies, 5) Investment and growth recommendations, 6) Future market predictions and emerging trends',
            async: false,
            agentId: 'agent-automation-research-1',
            nodeId: 'task-strategic-recommendations-1',
            nodeType: 'task'
          }
        },
        {
          id: 'output-automation-1',
          type: 'output',
          position: { x: 850, y: 200 },
          data: {
            label: 'Market Research Report',
            description: 'Comprehensive automation platform market analysis with insights and recommendations',
            outputFormat: 'rich_content',
            displayOptions: {
              showCharts: true,
              showInsights: true,
              enableSharing: true
            },
            metadata: {
              postable: true,
              contentType: 'market_research',
              shareableFormats: ['linkedin', 'twitter', 'email', 'notion', 'slack'],
              autoInsights: true,
              chartTypes: ['market_share', 'growth_trends', 'competitive_matrix'],
              tags: ['automation', 'market-research', 'competitive-analysis', 'saas']
            },
            nodeId: 'output-automation-1',
            nodeType: 'output'
          }
        }
      ],
      edges: [
        {
          id: 'edge-input-agent',
          source: 'input-automation-1',
          target: 'agent-automation-research-1',
          type: 'smoothstep',
          animated: true
        },
        {
          id: 'edge-agent-market',
          source: 'agent-automation-research-1',
          target: 'task-market-analysis-1',
          type: 'smoothstep',
          animated: true
        },
        {
          id: 'edge-agent-comparison',
          source: 'agent-automation-research-1',
          target: 'task-platform-comparison-1',
          type: 'smoothstep',
          animated: true
        },
        {
          id: 'edge-agent-strategy',
          source: 'agent-automation-research-1',
          target: 'task-strategic-recommendations-1',
          type: 'smoothstep',
          animated: true
        },
        {
          id: 'edge-strategy-output',
          source: 'task-strategic-recommendations-1',
          target: 'output-automation-1',
          type: 'smoothstep',
          animated: true
        }
      ],
      tags: ['Market Research', 'Automation', 'Competitive Analysis', 'n8n', 'Make.com', 'Zapier', 'Strategic Planning'],
      frameworksUsed: ['crewai'],
      version: '1.0',
      author: 'CrewBuilder AI',
      created: '2024-12-19',
      complexity: 'Advanced',
      estimatedTime: '4-6 minutes',
      useCase: 'Perfect for businesses evaluating automation platforms, investors analyzing the market, or platform teams developing competitive strategies.',
      metadata: {
        category: 'Market Research',
        industry: ['SaaS', 'Automation', 'No-Code', 'Enterprise Software'],
        outputFormat: 'Comprehensive Market Research Report',
        aiCapabilities: ['Market Analysis', 'Competitive Intelligence', 'Strategic Planning'],
        businessValue: 'Very High - Provides deep market insights for strategic decision-making',
        features: ['Rich Content Display', 'Auto Insights', 'Social Sharing', 'Chart Generation']
      }
    },
    {
      name: 'RAG Retriever Flow',
      description: 'A complete Retrieval-Augmented Generation pipeline',
      thumbnail: '/img/rag-flow.png',
      nodes: [
        {
          id: 'agent-rag-1',
          type: 'agent',
          position: { x: 250, y: 100 },
          data: {
            label: 'Research Agent',
            role: 'Researcher',
            goal: 'Find and analyze information from documents',
            backstory: 'You are a specialized research agent with expertise in retrieving and analyzing information.',
            llmModel: 'gpt-4',
            allowDelegation: true,
            verbose: true,
            nodeId: 'agent-rag-1',
            nodeType: 'agent'
          }
        },
        {
          id: 'tool-vector-1',
          type: 'tool',
          position: { x: 100, y: 250 },
          data: {
            label: 'Vector Database',
            description: 'Connects to a vector database for semantic search',
            toolType: 'api',
            parameters: 'query\nnum_results\ncollection_name',
            icon: '🔍',
            category: 'Database',
            nodeId: 'tool-vector-1',
            nodeType: 'tool'
          }
        },
        {
          id: 'task-retrieve-1',
          type: 'task',
          position: { x: 400, y: 250 },
          data: {
            label: 'Retrieve Documents',
            description: 'Search and retrieve relevant documents from the vector database',
            expectedOutput: 'List of relevant document chunks',
            async: true,
            nodeId: 'task-retrieve-1',
            nodeType: 'task'
          }
        },
        {
          id: 'task-analyze-1',
          type: 'task',
          position: { x: 400, y: 400 },
          data: {
            label: 'Analyze Content',
            description: 'Analyze retrieved documents and extract key information',
            expectedOutput: 'Analysis report with key findings',
            async: false,
            nodeId: 'task-analyze-1',
            nodeType: 'task'
          }
        }
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'agent-rag-1',
          target: 'task-retrieve-1',
          type: 'smoothstep'
        },
        {
          id: 'edge-2',
          source: 'tool-vector-1',
          target: 'task-retrieve-1',
          type: 'smoothstep'
        },
        {
          id: 'edge-3',
          source: 'task-retrieve-1',
          target: 'task-analyze-1',
          type: 'smoothstep'
        }
      ],
      tags: ['Research', 'Content', 'LangChain'],
      version: '1.0',
      author: 'CrewAI Team',
      created: '2023-12-15'
    },
    {
      name: 'Customer Support Flow',
      description: 'Automated customer support workflow with ticket classification and response generation',
      nodes: [
        {
          id: 'agent-support-1',
          type: 'agent',
          position: { x: 250, y: 100 },
          data: {
            label: 'Support Agent',
            role: 'Customer Support',
            goal: 'Provide helpful responses to customer inquiries',
            backstory: 'You are a customer support agent with expertise in resolving customer issues efficiently.',
            llmModel: 'gpt-3.5-turbo',
            allowDelegation: false,
            verbose: true,
            nodeId: 'agent-support-1',
            nodeType: 'agent'
          }
        },
        {
          id: 'task-classify-1',
          type: 'task',
          position: { x: 250, y: 250 },
          data: {
            label: 'Classify Ticket',
            description: 'Analyze the customer inquiry and classify it by type and priority',
            expectedOutput: 'Ticket classification with type and priority',
            async: false,
            nodeId: 'task-classify-1',
            nodeType: 'task'
          }
        },
        {
          id: 'task-respond-1',
          type: 'task',
          position: { x: 250, y: 400 },
          data: {
            label: 'Generate Response',
            description: 'Generate a helpful response to the customer inquiry',
            expectedOutput: 'Customer response with solution or next steps',
            async: false,
            nodeId: 'task-respond-1',
            nodeType: 'task'
          }
        }
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'agent-support-1',
          target: 'task-classify-1',
          type: 'smoothstep'
        },
        {
          id: 'edge-2',
          source: 'task-classify-1',
          target: 'task-respond-1',
          type: 'smoothstep'
        }
      ],
      tags: ['Support', 'Automation', 'Classification'],
      thumbnail: '/img/support-preview.png',
      version: '1.0',
      author: 'CrewAI Team',
      created: '2023-12-20'
    },
    
    {
      name: 'Lead Qualification Scorer',
      description: 'Enrich, score, and log B2B leads based on your ICP',
      thumbnail: '/img/lead-score.png',
      nodes: [
        {
          id: 'agent-lead-1',
          type: 'agent',
          position: { x: 100, y: 80 },
          data: {
            label: 'Lead Agent',
            role: 'Marketing Analyst',
            goal: 'Qualify and enrich incoming leads',
            backstory: 'You process incoming marketing leads to assess quality.',
            llmModel: 'gpt-3.5-turbo',
            allowDelegation: true,
            verbose: true,
            nodeId: 'agent-lead-1',
            nodeType: 'agent'
          }
        },
        {
          id: 'tool-enrich-1',
          type: 'tool',
          position: { x: 320, y: 180 },
          data: {
            label: 'Clearbit Enrichment',
            description: 'Enriches lead info with company data',
            toolType: 'api',
            framework: 'custom',
            parameters: 'email\ncompany_name',
            icon: '🔍',
            category: 'CRM',
            nodeId: 'tool-enrich-1',
            nodeType: 'tool'
          }
        },
        {
          id: 'task-score-1',
          type: 'task',
          position: { x: 550, y: 180 },
          data: {
            label: 'Score Lead',
            description: 'Calculate fit score using rules (ICP, firmographics, etc)',
            expectedOutput: 'Lead score 0–100',
            async: false,
            nodeId: 'task-score-1',
            nodeType: 'task'
          }
        },
        {
          id: 'tool-log-1',
          type: 'tool',
          position: { x: 750, y: 300 },
          data: {
            label: 'Lead Sheet Logger',
            description: 'Logs hot leads to a Google Sheet',
            toolType: 'api',
            framework: 'custom',
            parameters: 'name\nemail\ncompany\nindustry\nscore',
            icon: '📄',
            category: 'Output',
            nodeId: 'tool-log-1',
            nodeType: 'tool'
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'agent-lead-1', target: 'tool-enrich-1', type: 'smoothstep' },
        { id: 'e2', source: 'tool-enrich-1', target: 'task-score-1', type: 'smoothstep' },
        { id: 'e3', source: 'task-score-1', target: 'tool-log-1', type: 'smoothstep' }
      ],
      tags: ['CRM', 'Sales', 'Automation'],
      frameworksUsed: ["openrouter", "sheets_logger", "email_notifier"],
      version: '1.0',
      author: 'NodAi',
      created: '2025-04-15'
    },
    
    // NEW: Market Analysis AI Agent Template
    {
      name: 'Market Analysis AI Agent',
      description: '🔥 Professional market research workflow with AI-powered analysis and comprehensive reporting',
      thumbnail: '/img/market-analysis-flow.png',
      nodes: [
        {
          id: 'input-market-1',
          type: 'input',
          position: { x: 100, y: 100 },
          data: {
            label: 'Market Research Input',
            description: 'Input for market research query',
            inputType: 'text',
            placeholder: 'Enter your market research topic...',
            value: 'Analyze the current trends in AI automation tools for small businesses in 2024',
            nodeId: 'input-market-1',
            nodeType: 'input'
          }
        },
        {
          id: 'agent-market-1',
          type: 'agent',
          position: { x: 350, y: 100 },
          data: {
            label: 'Senior Market Research Analyst',
            role: 'Senior Market Research Analyst',
            goal: 'Provide comprehensive market analysis and actionable insights for business decision-making',
            backstory: 'You are a seasoned market research analyst with over 10 years of experience in the tech industry. You specialize in AI and automation trends, have worked with Fortune 500 companies, and are known for delivering data-driven insights that drive strategic business decisions. Your expertise includes market sizing, competitive analysis, trend forecasting, and strategic recommendations.',
            framework: 'crewai',
            frameworkConfig: {
              model: 'gpt-4',
              temperature: 0.7,
              max_tokens: 4000,
              api_key: ''
            },
            llmModel: 'gpt-4',
            temperature: 0.7,
            max_tokens: 4000,
            allowDelegation: true,
            enableMemory: true,
            verbose: true,
            nodeId: 'agent-market-1',
            nodeType: 'agent'
          }
        },
        {
          id: 'task-analysis-1',
          type: 'task',
          position: { x: 600, y: 100 },
          data: {
            label: 'Comprehensive Market Analysis',
            description: 'Conduct thorough analysis of market trends, competitive landscape, and provide strategic recommendations',
            expectedOutput: 'A detailed market research report including: 1) Executive Summary with key findings, 2) Market size and growth projections with specific numbers, 3) Competitive landscape analysis with major players, 4) Current trends and emerging opportunities, 5) Target audience insights and demographics, 6) Strategic recommendations with actionable next steps, 7) Risk assessment and mitigation strategies. Format as a professional business report with clear sections, bullet points, and data-driven insights.',
            async: false,
            agentId: 'agent-market-1',
            agentName: 'Senior Market Research Analyst',
            agentRole: 'Senior Market Research Analyst',
            nodeId: 'task-analysis-1',
            nodeType: 'task'
          }
        }
      ],
      edges: [
        {
          id: 'edge-input-agent',
          source: 'input-market-1',
          target: 'agent-market-1',
          type: 'smoothstep',
          animated: true
        },
        {
          id: 'edge-agent-task',
          source: 'agent-market-1',
          target: 'task-analysis-1',
          type: 'smoothstep',
          animated: true
        }
      ],
      tags: ['Market Research', 'AI Analysis', 'Business Intelligence', 'Strategic Planning', 'CrewAI'],
      frameworksUsed: ['crewai'],
      version: '1.0',
      author: 'CrewBuilder AI',
      created: '2024-12-19',
      complexity: 'Medium',
      estimatedTime: '2-3 minutes',
      useCase: 'Perfect for businesses needing professional market research reports, competitive analysis, and strategic insights for decision-making.',
      metadata: {
        category: 'Business Intelligence',
        industry: ['Technology', 'Consulting', 'Startups', 'Enterprise'],
        outputFormat: 'Professional Report',
        aiCapabilities: ['Market Analysis', 'Trend Forecasting', 'Competitive Intelligence'],
        businessValue: 'High - Provides actionable insights for strategic planning'
      }
    },

    // Simple Test Flow Template
    {
      name: 'Simple Test Flow',
      description: '🚀 Basic workflow with Input → Agent → Task for testing',
      thumbnail: '/img/simple-test-flow.png',
      nodes: [
        {
          id: 'input-test-1',
          type: 'input',
          position: { x: 100, y: 100 },
          data: {
            label: 'User Input',
            description: 'Enter your request or question',
            inputType: 'text',
            placeholder: 'Enter your request here...',
            value: 'Analyze the benefits of AI automation for small businesses',
            nodeId: 'input-test-1',
            nodeType: 'input'
          }
        },
        {
          id: 'agent-test-1',
          type: 'agent',
          position: { x: 350, y: 100 },
          data: {
            label: 'AI Assistant',
            role: 'AI Assistant',
            goal: 'Help users with their requests and provide helpful information',
            backstory: 'You are a helpful AI assistant with expertise in various topics. You provide clear, accurate, and actionable information.',
            framework: 'crewai',
            llmModel: 'gpt-4',
            temperature: 0.7,
            max_tokens: 2000,
            allowDelegation: false,
            enableMemory: false,
            verbose: true,
            nodeId: 'agent-test-1',
            nodeType: 'agent'
          }
        },
        {
          id: 'task-test-1',
          type: 'task',
          position: { x: 600, y: 100 },
          data: {
            label: 'Process Request',
            description: 'Process the user input and provide a helpful response',
            expectedOutput: 'A clear and helpful response to the user\'s request with actionable insights',
            async: false,
            agentId: 'agent-test-1',
            nodeId: 'task-test-1',
            nodeType: 'task'
          }
        }
      ],
      edges: [
        {
          id: 'edge-input-agent',
          source: 'input-test-1',
          target: 'agent-test-1',
          type: 'smoothstep',
          animated: true
        },
        {
          id: 'edge-agent-task',
          source: 'agent-test-1',
          target: 'task-test-1',
          type: 'smoothstep',
          animated: true
        }
      ],
      tags: ['Test', 'Simple', 'Basic', 'Getting Started'],
      frameworksUsed: ['crewai'],
      version: '1.0',
      author: 'CrewBuilder AI',
      created: '2024-12-19',
      complexity: 'Simple',
      estimatedTime: '30 seconds',
      useCase: 'Perfect for testing the system and understanding basic workflow concepts.',
      metadata: {
        category: 'Testing',
        industry: ['All'],
        outputFormat: 'Text Response',
        aiCapabilities: ['General AI Assistant'],
        businessValue: 'Low - For testing and learning purposes'
      }
    },

    // Marketing Campaign Analyzer Template
    {
      name: 'Marketing Campaign Analyzer',
      description: '📊 Comprehensive marketing campaign analysis with performance insights and recommendations',
      thumbnail: '/img/marketing-campaign-flow.png',
      nodes: [
        {
          id: 'input-campaign-1',
          type: 'input',
          position: { x: 100, y: 100 },
          data: {
            label: 'Campaign Data Input',
            description: 'Input campaign data for analysis',
            inputType: 'text',
            placeholder: 'Enter campaign details, metrics, and goals...',
            value: 'Email campaign for SaaS product launch: 10,000 emails sent, 2,500 opens (25% open rate), 250 clicks (10% CTR), 25 conversions (10% conversion rate). Goal: Increase trial signups by 20%.',
            nodeId: 'input-campaign-1',
            nodeType: 'input'
          }
        },
        {
          id: 'agent-marketing-1',
          type: 'agent',
          position: { x: 350, y: 100 },
          data: {
            label: 'Marketing Analytics Expert',
            role: 'Senior Marketing Analytics Specialist',
            goal: 'Analyze marketing campaign performance and provide actionable insights for optimization',
            backstory: 'You are a seasoned marketing analytics expert with 8+ years of experience in digital marketing. You specialize in campaign performance analysis, conversion optimization, and ROI improvement. You have worked with companies ranging from startups to Fortune 500, helping them achieve 30-50% improvements in campaign performance.',
            framework: 'crewai',
            llmModel: 'gpt-4',
            temperature: 0.7,
            max_tokens: 3000,
            allowDelegation: true,
            enableMemory: true,
            verbose: true,
            nodeId: 'agent-marketing-1',
            nodeType: 'agent'
          }
        },
        {
          id: 'task-analyze-1',
          type: 'task',
          position: { x: 600, y: 100 },
          data: {
            label: 'Campaign Performance Analysis',
            description: 'Analyze campaign metrics and provide optimization recommendations',
            expectedOutput: 'Detailed campaign analysis report including: 1) Performance summary with key metrics, 2) Benchmark comparison against industry standards, 3) Strengths and weaknesses identification, 4) Specific optimization recommendations, 5) Projected impact of improvements, 6) Next steps action plan. Include specific numbers and percentages.',
            async: false,
            agentId: 'agent-marketing-1',
            nodeId: 'task-analyze-1',
            nodeType: 'task'
          }
        }
      ],
      edges: [
        {
          id: 'edge-input-agent',
          source: 'input-campaign-1',
          target: 'agent-marketing-1',
          type: 'smoothstep',
          animated: true
        },
        {
          id: 'edge-agent-task',
          source: 'agent-marketing-1',
          target: 'task-analyze-1',
          type: 'smoothstep',
          animated: true
        }
      ],
      tags: ['Marketing', 'Analytics', 'Campaign Analysis', 'Performance', 'ROI'],
      frameworksUsed: ['crewai'],
      version: '1.0',
      author: 'CrewBuilder AI',
      created: '2024-12-19',
      complexity: 'Medium',
      estimatedTime: '2-3 minutes',
      useCase: 'Perfect for marketing teams needing detailed campaign performance analysis and optimization recommendations.',
      metadata: {
        category: 'Marketing',
        industry: ['SaaS', 'E-commerce', 'Digital Marketing', 'Advertising'],
        outputFormat: 'Analytics Report',
        aiCapabilities: ['Performance Analysis', 'Benchmarking', 'Optimization Recommendations'],
        businessValue: 'High - Improves campaign ROI and performance'
      }
    },

    // Email Marketing Automation Template
    {
      name: 'Email Marketing Automation',
      description: '📧 Automated email marketing workflow with personalization and segmentation',
      thumbnail: '/img/email-marketing-flow.png',
      nodes: [
        {
          id: 'input-email-1',
          type: 'input',
          position: { x: 100, y: 100 },
          data: {
            label: 'Email Campaign Brief',
            description: 'Input email campaign requirements',
            inputType: 'text',
            placeholder: 'Describe your email campaign goals, target audience, and key messages...',
            value: 'Create a welcome email series for new SaaS trial users. Target: Software developers and tech leads. Goal: Increase trial-to-paid conversion. Include product benefits, success stories, and clear CTAs.',
            nodeId: 'input-email-1',
            nodeType: 'input'
          }
        },
        {
          id: 'agent-email-1',
          type: 'agent',
          position: { x: 350, y: 100 },
          data: {
            label: 'Email Marketing Specialist',
            role: 'Senior Email Marketing Specialist',
            goal: 'Create high-converting email campaigns with personalized content and strategic messaging',
            backstory: 'You are an expert email marketing specialist with 6+ years of experience in B2B and B2C email marketing. You have created campaigns that achieve 40%+ open rates and 15%+ click-through rates. You specialize in segmentation, personalization, and conversion optimization.',
            framework: 'crewai',
            llmModel: 'gpt-4',
            temperature: 0.8,
            max_tokens: 3000,
            allowDelegation: false,
            enableMemory: true,
            verbose: true,
            nodeId: 'agent-email-1',
            nodeType: 'agent'
          }
        },
        {
          id: 'task-email-strategy-1',
          type: 'task',
          position: { x: 600, y: 50 },
          data: {
            label: 'Email Strategy Development',
            description: 'Develop comprehensive email marketing strategy and segmentation plan',
            expectedOutput: 'Email marketing strategy including: 1) Target audience segments, 2) Email sequence timeline, 3) Key messaging themes, 4) Personalization strategy, 5) Success metrics and KPIs',
            async: false,
            agentId: 'agent-email-1',
            nodeId: 'task-email-strategy-1',
            nodeType: 'task'
          }
        },
        {
          id: 'task-email-content-1',
          type: 'task',
          position: { x: 600, y: 200 },
          data: {
            label: 'Email Content Creation',
            description: 'Create compelling email content with subject lines and CTAs',
            expectedOutput: 'Complete email content package including: 1) Compelling subject lines (3-5 options), 2) Email body copy with personalization, 3) Clear call-to-action buttons, 4) Mobile-optimized formatting, 5) A/B testing variations',
            async: false,
            agentId: 'agent-email-1',
            nodeId: 'task-email-content-1',
            nodeType: 'task'
          }
        }
      ],
      edges: [
        {
          id: 'edge-input-agent',
          source: 'input-email-1',
          target: 'agent-email-1',
          type: 'smoothstep',
          animated: true
        },
        {
          id: 'edge-agent-strategy',
          source: 'agent-email-1',
          target: 'task-email-strategy-1',
          type: 'smoothstep',
          animated: true
        },
        {
          id: 'edge-agent-content',
          source: 'agent-email-1',
          target: 'task-email-content-1',
          type: 'smoothstep',
          animated: true
        }
      ],
      tags: ['Email Marketing', 'Automation', 'Personalization', 'Conversion', 'B2B'],
      frameworksUsed: ['crewai'],
      version: '1.0',
      author: 'CrewBuilder AI',
      created: '2024-12-19',
      complexity: 'Medium',
      estimatedTime: '3-4 minutes',
      useCase: 'Perfect for marketing teams creating email campaigns that need strategic planning and compelling content.',
      metadata: {
        category: 'Email Marketing',
        industry: ['SaaS', 'E-commerce', 'B2B', 'Technology'],
        outputFormat: 'Email Campaign Package',
        aiCapabilities: ['Content Creation', 'Strategy Development', 'Personalization'],
        businessValue: 'High - Increases email engagement and conversions'
      }
    },

    // Social Media Content Generator Template
    {
      name: 'Social Media Content Generator',
      description: '📱 AI-powered social media content creation for multiple platforms',
      thumbnail: '/img/social-media-flow.png',
      nodes: [
        {
          id: 'input-social-1',
          type: 'input',
          position: { x: 100, y: 100 },
          data: {
            label: 'Content Brief',
            description: 'Input content requirements and brand guidelines',
            inputType: 'text',
            placeholder: 'Describe your content goals, target audience, brand voice, and key messages...',
            value: 'Create social media content for a productivity app launch. Target: Remote workers and entrepreneurs. Brand voice: Professional but friendly. Key message: Save 2+ hours daily with smart automation. Platforms: LinkedIn, Twitter, Instagram.',
            nodeId: 'input-social-1',
            nodeType: 'input'
          }
        },
        {
          id: 'agent-social-1',
          type: 'agent',
          position: { x: 350, y: 100 },
          data: {
            label: 'Social Media Content Creator',
            role: 'Senior Social Media Content Strategist',
            goal: 'Create engaging, platform-optimized social media content that drives engagement and conversions',
            backstory: 'You are a creative social media expert with 5+ years of experience managing social media for tech companies and startups. You understand platform algorithms, trending formats, and what content performs best on each platform. Your content consistently achieves 3x higher engagement than industry averages.',
            framework: 'crewai',
            llmModel: 'gpt-4',
            temperature: 0.9,
            max_tokens: 3000,
            allowDelegation: false,
            enableMemory: true,
            verbose: true,
            nodeId: 'agent-social-1',
            nodeType: 'agent'
          }
        },
        {
          id: 'task-content-strategy-1',
          type: 'task',
          position: { x: 600, y: 50 },
          data: {
            label: 'Content Strategy Planning',
            description: 'Develop platform-specific content strategy and posting schedule',
            expectedOutput: 'Content strategy including: 1) Platform-specific content themes, 2) Optimal posting times and frequency, 3) Hashtag strategy for each platform, 4) Content calendar for 1 week, 5) Engagement tactics and community management tips',
            async: false,
            agentId: 'agent-social-1',
            nodeId: 'task-content-strategy-1',
            nodeType: 'task'
          }
        },
        {
          id: 'task-content-creation-1',
          type: 'task',
          position: { x: 600, y: 200 },
          data: {
            label: 'Multi-Platform Content Creation',
            description: 'Create platform-optimized content for LinkedIn, Twitter, and Instagram',
            expectedOutput: 'Complete content package including: 1) LinkedIn posts (3-5 professional posts with industry insights), 2) Twitter threads (2-3 engaging threads with trending hashtags), 3) Instagram captions (3-5 visual-focused posts), 4) Story ideas for each platform, 5) Engagement hooks and CTAs for each post',
            async: false,
            agentId: 'agent-social-1',
            nodeId: 'task-content-creation-1',
            nodeType: 'task'
          }
        }
      ],
      edges: [
        {
          id: 'edge-input-agent',
          source: 'input-social-1',
          target: 'agent-social-1',
          type: 'smoothstep',
          animated: true
        },
        {
          id: 'edge-agent-strategy',
          source: 'agent-social-1',
          target: 'task-content-strategy-1',
          type: 'smoothstep',
          animated: true
        },
        {
          id: 'edge-agent-content',
          source: 'agent-social-1',
          target: 'task-content-creation-1',
          type: 'smoothstep',
          animated: true
        }
      ],
      tags: ['Social Media', 'Content Creation', 'Multi-Platform', 'Engagement', 'Brand'],
      frameworksUsed: ['crewai'],
      version: '1.0',
      author: 'CrewBuilder AI',
      created: '2024-12-19',
      complexity: 'Medium',
      estimatedTime: '3-4 minutes',
      useCase: 'Perfect for marketing teams and content creators needing consistent, engaging social media content across platforms.',
      metadata: {
        category: 'Social Media Marketing',
        industry: ['Technology', 'SaaS', 'E-commerce', 'Startups'],
        outputFormat: 'Multi-Platform Content Package',
        aiCapabilities: ['Content Creation', 'Platform Optimization', 'Strategy Development'],
        businessValue: 'High - Increases social media engagement and brand awareness'
      }
    }
];

// Combine all templates
export const flowTemplates = [
  ...baseTemplates,
  autoEmailReplyTemplate,
  ...crmQualifierTemplates,
  ...cvTemplates
];
      
      
      
      
      
      
      
      
      
    
      