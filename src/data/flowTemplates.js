// Import modularized templates
import { autoEmailReplyTemplate } from './flowTemplates/autoEmailReplyTemplate';
import { flowTemplates as crmQualifierTemplates } from './flowTemplates/crm_qualifier_bot';
import { flowTemplates as cvTemplates } from './flowTemplates/cvTemplates';

// Define base templates
const baseTemplates = [
    // NEW: Simple Crypto Data Extractor Template
    {
      name: '🔥 Simple Crypto Data Extractor',
      description: 'Extract real crypto data from DexScreener and send to Telegram - WORKING VERSION',
      thumbnail: '/img/crypto-simple-flow.png',
      nodes: [
        {
          id: 'trigger-crypto-simple',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'DexScreener Monitor',
            triggerType: 'universal_polling',
            serviceName: 'DexScreener',
            apiEndpoint: 'https://api.dexscreener.com/latest/dex/search?q=PEPE',
            pollingInterval: 60,
            authType: 'none',
            changeDetectionMethod: 'array_length',
            nodeId: 'trigger-crypto-simple',
            nodeType: 'trigger'
          }
        },
        {
          id: 'agent-crypto-simple',
          type: 'agent',
          position: { x: 350, y: 100 },
          data: {
            label: 'Crypto Data Extractor',
            role: 'Crypto Data Extraction Specialist',
            goal: 'Extract and format crypto trading data from DexScreener API responses',
            backstory: 'You are a crypto data extraction specialist. Your ONLY job is to extract and format trading data.',
            prompt: `You are a crypto data extraction specialist. Extract crypto data from DexScreener API and format it cleanly.

🎯 INSTRUCTIONS:
1. You will receive DexScreener API data with this structure:
   - "pairs" array containing crypto trading pairs
   - Each pair has: baseToken, priceUsd, liquidity, volume, priceChange
2. Extract ONLY the essential crypto data
3. Format it clearly for Telegram
4. DO NOT give trading advice
5. Keep it concise to save tokens

📊 INPUT: DexScreener API response with "pairs" array
📤 OUTPUT: Format like this:

🔥 CRYPTO DATA UPDATE:

Token: [baseToken.name] ([baseToken.symbol])
💰 Price: $[priceUsd]
💧 Liquidity: $[liquidity.usd]
📊 Volume 24h: $[volume.h24]
📈 Change 24h: [priceChange.h24]%
🔗 Chain: [chainId]

---
⏰ Updated: [current timestamp]

If multiple tokens, show top 3 only.
If no pairs in data: "No crypto data available"

REMEMBER: Extract data only, no advice!`,
            framework: 'crewai',
            frameworkConfig: {
              model: 'gpt-4',
              temperature: 0.3,
              max_tokens: 2000,
              api_key: ''
            },
            llmModel: 'gpt-4',
            temperature: 0.3,
            max_tokens: 2000,
            allowDelegation: false,
            enableMemory: false,
            verbose: true,
            nodeId: 'agent-crypto-simple',
            nodeType: 'agent'
          }
        },
        {
          id: 'task-crypto-simple',
          type: 'task',
          position: { x: 600, y: 100 },
          data: {
            label: 'Extract Crypto Data',
            description: 'Extract and format crypto data from DexScreener',
            expectedOutput: 'Formatted crypto data ready for Telegram',
            async: false,
            agentId: 'agent-crypto-simple',
            nodeId: 'task-crypto-simple',
            nodeType: 'task'
          }
        },
        {
          id: 'output-crypto-simple',
          type: 'output',
          position: { x: 850, y: 100 },
          data: {
            label: 'Telegram Sender',
            description: 'Send crypto data to Telegram',
            outputType: 'webhook',
            webhookUrl: 'https://api.telegram.org/bot{BOT_TOKEN}/sendMessage',
            webhookMethod: 'POST',
            webhookHeaders: {
              'Content-Type': 'application/json'
            },
            webhookPayload: {
              'chat_id': '5251498620',
              'text': '{task_output}'
            },
            nodeId: 'output-crypto-simple',
            nodeType: 'output'
          }
        }
      ],
      edges: [
        {
          id: 'edge-trigger-agent',
          source: 'trigger-crypto-simple',
          target: 'agent-crypto-simple',
          type: 'smoothstep',
          animated: true
        },
        {
          id: 'edge-agent-task',
          source: 'agent-crypto-simple',
          target: 'task-crypto-simple',
          type: 'smoothstep',
          animated: true
        },
        {
          id: 'edge-task-output',
          source: 'task-crypto-simple',
          target: 'output-crypto-simple',
          type: 'smoothstep',
          animated: true
        }
      ],
      tags: ['Crypto', 'DexScreener', 'Telegram', 'Data Extraction', 'Simple'],
      frameworksUsed: ['crewai'],
      version: '1.0',
      author: 'CrewBuilder AI',
      created: '2024-12-19',
      complexity: 'Simple',
      estimatedTime: '1-2 minutes',
      useCase: 'Extract real crypto data from DexScreener and send to Telegram without trading advice.',
      metadata: {
        category: 'Crypto Data',
        industry: ['Cryptocurrency', 'Trading', 'Data'],
        outputFormat: 'Telegram Message',
        aiCapabilities: ['Data Extraction', 'Format Conversion'],
        businessValue: 'High - Get real crypto data notifications'
      }
    },
    // Simple test template for field detection
    {
      name: '🧪 Field Detection Test',
      description: 'Simple template to test field detection in Logic nodes',
      thumbnail: '/img/test-flow.png',
      nodes: [
        {
          id: 'trigger-test',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Test Trigger',
            triggerType: 'universal_polling',
            serviceName: 'Test API',
            apiEndpoint: 'https://api.test.com/data',
            nodeId: 'trigger-test',
            nodeType: 'trigger'
          }
        },
        {
          id: 'agent-test',
          type: 'agent',
          position: { x: 350, y: 100 },
          data: {
            label: 'Token Safety Analyzer',
            role: 'DeFi Token Safety Analyst',
            goal: 'Analyze tokens for safety and make buy/sell decisions',
            backstory: 'Expert crypto analyst who makes trading decisions',
            prompt: 'Analyze this token data and return a JSON decision with confidence and risk_score',
            nodeId: 'agent-test',
            nodeType: 'agent'
          }
        },
        {
          id: 'logic-test',
          type: 'logic',
          position: { x: 600, y: 100 },
          data: {
            label: 'Buy Decision Logic',
            description: 'Test logic node for field detection',
            condition: 'inputs.decision === "STRONG_BUY"',
            nodeId: 'logic-test',
            nodeType: 'logic'
          }
        }
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'trigger-test',
          target: 'agent-test',
          type: 'smoothstep',
          animated: true
        },
        {
          id: 'edge-2',
          source: 'agent-test',
          target: 'logic-test',
          type: 'smoothstep',
          animated: true
        }
      ],
      tags: ['Test', 'Debug', 'Field Detection'],
      frameworksUsed: ['test'],
      version: '1.0',
      author: 'CrewBuilder AI',
      created: '2024-12-19',
      complexity: 'Simple',
      estimatedTime: '30 seconds',
      useCase: 'Testing field detection in Logic nodes'
    },
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
    },

    // NEW: Targeted Column Research Template
    {
      name: 'Targeted Column Research Agent',
      description: '🎯 Smart agent that only processes specific columns (topic + description) and triggers only on new data',
      thumbnail: '/img/targeted-research-flow.png',
      nodes: [
        {
          id: 'trigger-targeted-1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Smart Airtable Monitor',
            triggerType: 'universal_polling',
            serviceName: 'Airtable',
            apiEndpoint: 'https://api.airtable.com/v0/YOUR_BASE_ID/YOUR_TABLE_NAME',
            pollingInterval: 300, // 5 minutes
            authType: 'api_key',
            apiKey: '', // User will fill this
            changeDetectionMethod: 'array_length', // Only trigger on NEW records
            nodeId: 'trigger-targeted-1',
            nodeType: 'trigger'
          }
        },
        {
          id: 'agent-targeted-1',
          type: 'agent',
          position: { x: 350, y: 100 },
          data: {
            label: 'Targeted Research Specialist',
            role: 'Targeted Research Specialist',
            goal: 'Extract and research ONLY the topic and description fields from new Airtable records, ignoring all other data',
            backstory: 'You are a focused research specialist who processes only specific data fields. You ignore metadata, IDs, timestamps, and other irrelevant fields. You focus exclusively on the "topic" and "description" fields to conduct targeted research.',
            framework: 'crewai',
            frameworkConfig: {
              model: 'gpt-4',
              temperature: 0.7,
              max_tokens: 3000,
              api_key: ''
            },
            llmModel: 'gpt-4',
            temperature: 0.7,
            max_tokens: 3000,
            allowDelegation: false,
            enableMemory: true,
            verbose: true,
            prompt: "IMPORTANT: You will receive Airtable data with many fields. ONLY focus on these fields:\n- \"Topic\" or \"title\" field\n- \"Description\" or \"desc\" field\n\nIGNORE all other fields like: id, createdTime, metadata, etc.\n\nFor each NEW record, extract ONLY the topic and description, then conduct focused research on that specific topic.",
            nodeId: 'agent-targeted-1',
            nodeType: 'agent'
          }
        },
        {
          id: 'task-research-1',
          type: 'task',
          position: { x: 600, y: 100 },
          data: {
            label: 'Focused Column Research',
            description: 'Research each topic and description pair from new Airtable records only',
            expectedOutput: 'For each NEW record: 1) Extract topic and description only, 2) Conduct targeted research on the topic, 3) Provide insights based on the description context, 4) Format as: "Topic: [topic] | Research: [findings] | Insights: [analysis]"',
            async: false,
            agentId: 'agent-targeted-1',
            nodeId: 'task-research-1',
            nodeType: 'task'
          }
        }
      ],
      edges: [
        {
          id: 'edge-trigger-agent',
          source: 'trigger-targeted-1',
          target: 'agent-targeted-1',
          type: 'smoothstep',
          animated: true
        },
        {
          id: 'edge-agent-task',
          source: 'agent-targeted-1',
          target: 'task-research-1',
          type: 'smoothstep',
          animated: true
        }
      ],
      tags: ['Targeted', 'Column-Specific', 'Event-Driven', 'Airtable', 'Research'],
      frameworksUsed: ['crewai'],
      version: '1.0',
      author: 'CrewBuilder AI',
      created: '2024-12-19',
      complexity: 'Medium',
      estimatedTime: '2-3 minutes',
      useCase: 'Perfect for processing only specific columns from APIs and triggering only when new data arrives.',
      metadata: {
        category: 'Targeted Processing',
        industry: ['Data Processing', 'Research', 'Content Analysis'],
        outputFormat: 'Focused Research Report',
        aiCapabilities: ['Field-Specific Processing', 'Event-Driven Triggers', 'Targeted Research'],
        businessValue: 'High - Reduces noise and focuses on relevant data only'
      }
    },
    // NEW: WORKING DexScreener Live Template
    {
      name: '🔥 WORKING DexScreener Live Monitor',
      description: 'LIVE crypto monitoring using the working universal polling trigger - REAL DATA!',
      thumbnail: '/img/crypto-live-flow.png',
      nodes: [
        {
          id: 'dexscreener-live-trigger',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'DexScreener Live Monitor',
            triggerType: 'universal_polling',
            serviceName: 'DexScreener',
            apiEndpoint: 'https://api.dexscreener.com/latest/dex/search?q=PEPE',
            pollingInterval: 60,
            authType: 'none',
            changeDetectionMethod: 'array_length',
            nodeId: 'dexscreener-live-trigger',
            nodeType: 'trigger'
          }
        },
        {
          id: 'crypto-agent',
          type: 'agent',
          position: { x: 350, y: 100 },
          data: {
            label: 'Crypto Data Extractor',
            role: 'Crypto Data Extraction Specialist',
            goal: 'Extract and format crypto trading data from DexScreener API responses',
            backstory: 'You are a crypto data extraction specialist. Your ONLY job is to extract and format trading data.',
            prompt: `You are a crypto data extraction specialist. Extract crypto data from DexScreener API and format it cleanly.

🎯 INSTRUCTIONS:
1. You will receive DexScreener API data with this structure:
   - "pairs" array containing crypto trading pairs
   - Each pair has: baseToken, priceUsd, liquidity, volume, priceChange
2. Extract ONLY the essential crypto data
3. Format it clearly for Telegram
4. DO NOT give trading advice
5. Keep it concise to save tokens

📊 INPUT: DexScreener API response with "pairs" array
📤 OUTPUT: Format like this:

🔥 CRYPTO DATA UPDATE:

Token: [baseToken.name] ([baseToken.symbol])
💰 Price: $[priceUsd]
💧 Liquidity: $[liquidity.usd]
📊 Volume 24h: $[volume.h24]
📈 Change 24h: [priceChange.h24]%
🔗 Chain: [chainId]

---
⏰ Updated: [current timestamp]

If multiple tokens, show top 3 only.
If no pairs in data: "No crypto data available"

REMEMBER: Extract data only, no advice!`,
            framework: 'crewai',
            frameworkConfig: {
              model: 'gpt-4',
              temperature: 0.1,
              max_tokens: 800,
              api_key: ''
            },
            llmModel: 'gpt-4',
            temperature: 0.1,
            max_tokens: 800,
            allowDelegation: false,
            enableMemory: false,
            verbose: true,
            nodeId: 'crypto-agent',
            nodeType: 'agent'
          }
        },
        {
          id: 'crypto-task',
          type: 'task',
          position: { x: 600, y: 100 },
          data: {
            label: 'Extract Crypto Data',
            description: 'Extract and format crypto data from DexScreener',
            expectedOutput: 'Formatted crypto data ready for Telegram',
            async: false,
            agentId: 'crypto-agent',
            nodeId: 'crypto-task',
            nodeType: 'task'
          }
        },
        {
          id: 'telegram-output',
          type: 'output',
          position: { x: 850, y: 100 },
          data: {
            label: 'Telegram Sender',
            description: 'Send crypto data to Telegram',
            outputType: 'webhook',
            webhookUrl: 'https://api.telegram.org/bot8163116561:AAH5mKM-MDINf5gJXMsRxycNsRfFILBcJZ0/sendMessage',
            webhookMethod: 'POST',
            webhookHeaders: {
              'Content-Type': 'application/json'
            },
            webhookPayload: {
              'chat_id': '5251498620',
              'text': '{task_output}'
            },
            nodeId: 'telegram-output',
            nodeType: 'output'
          }
        }
      ],
      edges: [
        {
          id: 'edge-trigger-agent',
          source: 'dexscreener-live-trigger',
          target: 'crypto-agent',
          type: 'smoothstep',
          animated: true
        },
        {
          id: 'edge-agent-task',
          source: 'crypto-agent',
          target: 'crypto-task',
          type: 'smoothstep',
          animated: true
        },
        {
          id: 'edge-task-output',
          source: 'crypto-task',
          target: 'telegram-output',
          type: 'smoothstep',
          animated: true
        }
      ],
      tags: ['WORKING', 'Live', 'DexScreener', 'Telegram', 'Real Data'],
      frameworksUsed: ['crewai'],
      version: '1.0',
      author: 'CrewBuilder AI',
      created: '2025-05-29',
      complexity: 'Simple',
      estimatedTime: '30 seconds',
      useCase: 'WORKING template that uses the live universal polling trigger for real DexScreener data.',
      metadata: {
        category: 'Live Crypto Data',
        industry: ['Cryptocurrency', 'Trading', 'Data'],
        outputFormat: 'Telegram Message',
        aiCapabilities: ['Data Extraction', 'Format Conversion'],
        businessValue: 'High - Uses WORKING live trigger for real crypto data'
      }
    },
    // Add this new enhanced template after the existing crypto templates
    {
      name: '🧠 Smart Crypto Monitor with Field Filtering',
      description: 'Advanced crypto monitoring with intelligent field selection and token optimization - implements ChatGPT\'s smart filtering strategy',
      thumbnail: '/img/crypto-smart-flow.png',
      nodes: [
        {
          id: 'smart-crypto-trigger',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: '🧠 Smart DexScreener Monitor',
            triggerType: 'universal_polling',
            serviceName: 'DexScreener',
            apiEndpoint: 'https://api.dexscreener.com/latest/dex/search?q=PEPE',
            pollingInterval: 60,
            authType: 'none',
            changeDetectionMethod: 'array_length',
            
            // ChatGPT's Smart Field Filtering Implementation
            targetFields: ['baseToken.symbol', 'baseToken.name', 'priceUsd', 'liquidity.usd', 'volume.h24', 'priceChange.h24', 'chainId'],
            excludeFields: ['info', 'labels', 'boosts', 'profile'],
            
            // Smart summarization settings
            summaryMode: true,
            maxRecords: 5,
            maxTokens: 2000,
            
            nodeId: 'smart-crypto-trigger',
            nodeType: 'trigger'
          }
        },
        {
          id: 'smart-crypto-agent',
          type: 'agent',
          position: { x: 350, y: 100 },
          data: {
            label: '🧠 Smart Crypto Analyzer',
            role: 'Smart Crypto Data Analyst',
            goal: 'Analyze filtered crypto data and provide intelligent insights with minimal token usage',
            backstory: 'You are an advanced crypto analyst who works with pre-filtered, high-quality data to provide concise insights.',
            
            // ChatGPT's digest-style prompt instead of JSON dumps
            prompt: `You are a smart crypto analyst receiving pre-filtered, high-quality data.

🎯 INPUT FORMAT: You receive a clean summary of top crypto pairs with only essential fields:
- Token Symbol & Name
- Current Price (USD)
- Liquidity (USD)
- 24h Volume
- 24h Price Change
- Blockchain

📊 YOUR TASK: Create a concise crypto market digest

🔥 OUTPUT FORMAT:
📈 CRYPTO MARKET DIGEST

🪙 TOP TOKENS:
• [Symbol]: $[Price] ([Change]%) - Vol: $[Volume] - Chain: [Chain]
• [Symbol]: $[Price] ([Change]%) - Vol: $[Volume] - Chain: [Chain]
• [Symbol]: $[Price] ([Change]%) - Vol: $[Volume] - Chain: [Chain]

💡 QUICK INSIGHTS:
- [Brief market observation]
- [Notable price movements]
- [Volume/liquidity highlights]

⏰ Updated: [timestamp]

Keep it under 500 characters for Telegram efficiency!`,

            framework: 'crewai',
            frameworkConfig: {
              model: 'gpt-4',
              temperature: 0.2,
              max_tokens: 300,  // EMERGENCY: Reduced from 800 to 300 - ChatGPT's ultra-compact approach
              api_key: ''
            },
            llmModel: 'gpt-4',
            temperature: 0.2,
            max_tokens: 300,  // EMERGENCY: Reduced from 800 to 300
            allowDelegation: false,
            enableMemory: false,
            verbose: true,
            nodeId: 'smart-crypto-agent',
            nodeType: 'agent'
          }
        },
        {
          id: 'smart-crypto-task',
          type: 'task',
          position: { x: 600, y: 100 },
          data: {
            label: '📊 Generate Market Digest',
            description: 'Create intelligent crypto market digest from filtered data',
            expectedOutput: 'Concise crypto market digest optimized for Telegram',
            async: false,
            agentId: 'smart-crypto-agent',
            nodeId: 'smart-crypto-task',
            nodeType: 'task'
          }
        },
        {
          id: 'smart-crypto-output',
          type: 'output',
          position: { x: 850, y: 100 },
          data: {
            label: '📱 Smart Telegram Sender',
            description: 'Send optimized crypto digest to Telegram',
            outputType: 'webhook',
            webhookUrl: 'https://api.telegram.org/bot{BOT_TOKEN}/sendMessage',
            webhookMethod: 'POST',
            webhookHeaders: {
              'Content-Type': 'application/json'
            },
            webhookPayload: {
              'chat_id': '5251498620',
              'text': '{task_output}',
              'parse_mode': 'HTML'
            },
            nodeId: 'smart-crypto-output',
            nodeType: 'output'
          }
        }
      ],
      edges: [
        {
          id: 'edge-smart-trigger-agent',
          source: 'smart-crypto-trigger',
          target: 'smart-crypto-agent',
          type: 'smoothstep',
          animated: true
        },
        {
          id: 'edge-smart-agent-task',
          source: 'smart-crypto-agent',
          target: 'smart-crypto-task',
          type: 'smoothstep',
          animated: true
        },
        {
          id: 'edge-smart-task-output',
          source: 'smart-crypto-task',
          target: 'smart-crypto-output',
          type: 'smoothstep',
          animated: true
        }
      ],
      tags: ['Smart', 'Crypto', 'Field Filtering', 'Token Optimized', 'ChatGPT Strategy'],
      frameworksUsed: ['crewai'],
      version: '2.0',
      author: 'CrewBuilder AI + ChatGPT Strategy',
      created: '2025-05-29',
      complexity: 'Intermediate',
      estimatedTime: '30 seconds',
      useCase: 'Smart crypto monitoring with intelligent field filtering and token optimization.',
      metadata: {
        category: 'Smart Crypto Analysis',
        industry: ['Cryptocurrency', 'Trading', 'Data Intelligence'],
        outputFormat: 'Optimized Telegram Digest',
        aiCapabilities: ['Smart Field Selection', 'Token Optimization', 'Intelligent Summarization'],
        businessValue: 'High - Efficient crypto monitoring with minimal token usage',
        chatgptStrategy: true,
        tokenOptimized: true,
        smartFiltering: true
      }
    }
];

// Combine all templates
export const flowTemplates = [
  ...baseTemplates,
  autoEmailReplyTemplate,
  ...crmQualifierTemplates,
  ...cvTemplates,
  {
    id: "intelligent-incremental-processing",
    name: "🧠 Intelligent Incremental Data Processing",
    description: "Advanced template for smart incremental data processing with state management, change detection, and intelligent filtering. Perfect for monitoring APIs and processing only new/changed data.",
    category: "Advanced Automation",
    tags: ["incremental", "state-management", "smart-filtering", "change-detection", "api-monitoring"],
    difficulty: "Advanced",
    estimatedTime: "15-30 minutes",
    features: [
      "🔍 Smart change detection (multiple methods)",
      "📊 Incremental record processing",
      "🎯 Intelligent field filtering",
      "💾 Persistent state management",
      "🚀 Performance optimized",
      "📈 Processing analytics"
    ],
    nodes: [
      {
        id: "trigger-incremental",
        type: "trigger",
        position: { x: 100, y: 200 },
        data: {
          label: "🔄 Smart API Monitor",
          trigger_type: "universal_polling",
          serviceName: "Data Source API",
          apiEndpoint: "https://api.example.com/data",
          pollingInterval: 300,
          changeDetectionMethod: "smart", // Auto-detects best method
          
          // Advanced filtering configuration
          includeFields: ["id", "title", "description", "status", "updated_at"],
          excludeFields: ["internal_notes", "debug_info"],
          fieldConditions: {
            "status": "active",
            "updated_at": { "greater_than": "2024-01-01" }
          },
          recordLimit: 50,
          sortBy: "-updated_at",
          idField: "id",
          timestampField: "updated_at",
          maxNewRecords: 25,
          
          // Authentication
          authType: "api_key",
          apiKey: "${API_KEY}",
          
          description: "Monitors API for changes and processes only new/modified records with intelligent filtering"
        }
      },
      {
        id: "agent-data-processor",
        type: "agent",
        position: { x: 400, y: 200 },
        data: {
          label: "🤖 Incremental Data Processor",
          role: "Data Processing Specialist",
          goal: "Process only new and modified records efficiently while maintaining context of previous processing",
          backstory: "You are an expert at processing incremental data updates. You focus only on new or changed records, avoiding redundant processing while maintaining awareness of the overall data context.",
          
          // Enhanced prompt for incremental processing
          prompt: "You are processing incremental data updates. Focus on:\n\n1. **New Records**: Process each new record thoroughly\n2. **Modified Records**: Identify what changed and process accordingly  \n3. **Context Awareness**: Understand the relationship between records\n4. **Efficiency**: Avoid reprocessing unchanged data\n5. **Quality**: Ensure consistent processing standards\n\nFor each record, provide:\n- Summary of key information\n- Identified changes (for modified records)\n- Processing recommendations\n- Quality assessment\n\nCurrent batch contains: {new_records_count} new records, {modified_records_count} modified records.\n\nProcessing metadata: {processing_metadata}",

          framework: "openrouter",
          model: "anthropic/claude-3.5-sonnet",
          temperature: 0.3,
          maxTokens: 2000,
          description: "Processes incremental data updates with context awareness and efficiency focus"
        }
      },
      {
        id: "task-analytics",
        type: "task",
        position: { x: 700, y: 200 },
        data: {
          label: "📊 Processing Analytics",
          description: "Generate analytics and insights from the incremental processing results",
          expectedOutput: "Comprehensive analytics report including processing metrics, data quality insights, and trend analysis",
          
          prompt: "Analyze the incremental data processing results and generate a comprehensive analytics report.\n\nInclude:\n\n## Processing Metrics\n- Records processed (new vs modified)\n- Processing efficiency metrics\n- Data quality indicators\n- Change detection accuracy\n\n## Data Insights  \n- Key trends identified\n- Anomalies or outliers\n- Data quality issues\n- Recommendations for optimization\n\n## Performance Analysis\n- Processing time analysis\n- Resource utilization\n- Bottlenecks identified\n- Optimization opportunities\n\n## Summary & Recommendations\n- Overall processing health\n- Suggested improvements\n- Alert conditions\n- Next steps\n\nFormat as a structured report with clear sections and actionable insights.",

          agent: "agent-data-processor"
        }
      },
      {
        id: "output-results",
        type: "output",
        position: { x: 1000, y: 200 },
        data: {
          label: "📤 Smart Output Manager",
          outputType: "multi",
          
          // Email configuration for alerts
          emailEnabled: true,
          emailSubject: "Incremental Data Processing Report - {timestamp}",
          emailTemplate: `
# Incremental Data Processing Report

## Summary
- **New Records**: {new_records_count}
- **Modified Records**: {modified_records_count}  
- **Processing Time**: {processing_time}
- **Status**: {status}

## Key Insights
{analytics_summary}

## Full Report
{full_report}

---
Generated by CrewBuilder Intelligent Processing System
`,

          // Webhook for real-time notifications
          webhookEnabled: true,
          webhookUrl: "https://hooks.example.com/data-processing",
          webhookPayload: {
            "event": "incremental_processing_complete",
            "timestamp": "{timestamp}",
            "metrics": {
              "new_records": "{new_records_count}",
              "modified_records": "{modified_records_count}",
              "processing_time": "{processing_time}"
            },
            "summary": "{analytics_summary}"
          },
          
          // Database storage
          databaseEnabled: true,
          databaseTable: "processing_results",
          databaseFields: {
            "timestamp": "{timestamp}",
            "new_records_count": "{new_records_count}",
            "modified_records_count": "{modified_records_count}",
            "processing_status": "{status}",
            "analytics_data": "{full_report}"
          },
          
          description: "Manages multiple output channels for processing results and analytics"
        }
      }
    ],
    edges: [
      {
        id: "e1-2",
        source: "trigger-incremental",
        target: "agent-data-processor",
        type: "smoothstep",
        animated: true,
        data: {
          label: "📊 Incremental Data",
          description: "Passes only new/modified records with change metadata"
        }
      },
      {
        id: "e2-3", 
        source: "agent-data-processor",
        target: "task-analytics",
        type: "smoothstep",
        animated: true,
        data: {
          label: "🔍 Processed Results",
          description: "Processed data with insights and recommendations"
        }
      },
      {
        id: "e3-4",
        source: "task-analytics", 
        target: "output-results",
        type: "smoothstep",
        animated: true,
        data: {
          label: "📈 Analytics Report",
          description: "Comprehensive analytics and performance metrics"
        }
      }
    ],
    metadata: {
      version: "2.0",
      created: "2024-01-28",
      author: "CrewBuilder AI",
      complexity: "advanced",
      useCase: "incremental-data-processing",
      industry: ["technology", "data-analytics", "automation"],
      estimatedCost: "$0.15-0.30 per execution",
      
      setupInstructions: [
        "1. Configure your API endpoint and authentication",
        "2. Set up field filtering based on your data structure", 
        "3. Choose appropriate change detection method",
        "4. Configure output channels (email, webhook, database)",
        "5. Test with a small dataset first",
        "6. Monitor processing metrics and adjust as needed"
      ],
      
      bestPractices: [
        "Start with 'smart' change detection for automatic optimization",
        "Use field filtering to reduce processing overhead",
        "Set reasonable limits on new records per batch",
        "Monitor processing metrics for performance optimization",
        "Implement proper error handling and alerting",
        "Regular cleanup of old state data"
      ],
      
      troubleshooting: [
        "If no changes detected: Check API endpoint and authentication",
        "If too many records: Adjust maxNewRecords and filtering",
        "If processing slow: Review field filtering and record limits",
        "If duplicates: Verify idField configuration",
        "If missing data: Check includeFields configuration"
      ]
    }
  },
  {
    id: "live-dex-coin-scanner",
    name: "🚀 Live Dex Coin Scanner & Auto-Buyer",
    description: "Advanced crypto trading bot that monitors DexScreener for new tokens, analyzes them with AI, and executes trades automatically. Includes Telegram notifications and risk management.",
    category: "Crypto Trading",
    tags: ["crypto", "trading", "dexscreener", "automation", "telegram", "defi"],
    difficulty: "Expert",
    estimatedTime: "30-45 minutes",
    features: [
      "🔍 Real-time DexScreener monitoring",
      "🧠 AI-powered token analysis",
      "💰 Automated buying with risk management",
      "📱 Telegram notifications",
      "🛡️ Scam detection & filtering",
      "📊 Performance tracking"
    ],
    nodes: [
      {
        id: "trigger-dex-scanner",
        type: "trigger",
        position: { x: 100, y: 200 },
        data: {
          label: "🔍 DexScreener Monitor",
          trigger_type: "universal_polling",
          serviceName: "DexScreener",
          apiEndpoint: "https://api.dexscreener.com/latest/dex/search?q=PEPE",
          pollingInterval: 60,
          changeDetectionMethod: "array_length",
          
          includeFields: [
            "pairCreatedAt", 
            "baseToken.symbol", 
            "baseToken.name",
            "priceUsd", 
            "liquidity.usd",
            "volume.h24",
            "priceChange.h24",
            "url",
            "chainId"
          ],
          
          authType: "none",
          description: "Monitors DexScreener for new PEPE pairs with real crypto data"
        }
      },
      {
        id: "agent-token-analyzer",
        type: "agent",
        position: { x: 400, y: 150 },
        data: {
          label: "🧠 Crypto Data Extractor",
          role: "Crypto Data Extraction Specialist",
          goal: "Extract and format crypto trading data from DexScreener API responses without giving advice",
          backstory: "You are a crypto data extraction specialist. Your ONLY job is to extract and format trading data from DexScreener API responses.",
          
          prompt: "You are a crypto data extraction specialist. Your ONLY job is to extract and format trading data from DexScreener API responses.\n\nCRITICAL INSTRUCTIONS:\n1. Extract ONLY the raw trading data\n2. DO NOT give trading advice\n3. DO NOT analyze or recommend\n4. JUST format the data cleanly\n\nINPUT: You will receive DexScreener API data\nOUTPUT: Format it like this:\n\n🔥 NEW CRYPTO TOKENS DETECTED:\n\nToken: [TOKEN_NAME]\nSymbol: [SYMBOL]\nPrice: $[PRICE]\nChain: [BLOCKCHAIN]\nLiquidity: $[LIQUIDITY]\nVolume 24h: $[VOLUME]\nPrice Change: [CHANGE]%\nStatus: [ACTIVE/NEW/TRENDING]\n\n---\n\nIf NO new tokens: Output exactly \"No new crypto data detected\"\n\nREMEMBER: Extract data, don't give advice!\n\nReturn JSON format:\n{\n  \"decision\": \"STRONG_BUY|BUY|HOLD|AVOID\",\n  \"confidence\": 0.85,\n  \"risk_score\": 0.3,\n  \"token_data\": \"formatted token info\",\n  \"raw_data\": \"extracted data\"\n}",

          framework: "openrouter",
          model: "anthropic/claude-3.5-sonnet",
          temperature: 0.3,
          maxTokens: 1500,
          description: "AI agent that extracts crypto data without giving trading advice"
        }
      },
      {
        id: "logic-buy-decision",
        type: "logic",
        position: { x: 700, y: 200 },
        data: {
          label: "💡 Buy Decision Logic",
          description: "Decides whether to execute buy based on AI analysis",
          condition: `decision == "STRONG_BUY" || decision == "BUY"`,
          nodeId: "logic-buy-decision",
          nodeType: "logic"
        }
      },
      {
        id: "agent-trade-executor",
        type: "agent",
        position: { x: 1000, y: 150 },
        data: {
          label: "💰 Trade Executor",
          role: "DeFi Trading Specialist",
          goal: "Execute safe and profitable token purchases with proper risk management",
          backstory: "You are a professional DeFi trader who executes trades with precision. You always use proper slippage, check for sufficient liquidity, and implement stop-losses.",
          
          prompt: "Execute a token purchase based on this analysis:\n\n**TRADE PARAMETERS:**\n- Token: {{trigger.baseToken.symbol}}\n- Current Price: ${{trigger.priceUsd}}\n- Liquidity: ${{trigger.liquidity.usd}}\n\n**EXECUTION CHECKLIST:**\n1. Verify price is reasonable\n2. Check liquidity is sufficient\n3. Calculate slippage (max 5%)\n4. Set stop-loss at -20%\n5. Execute trade\n\nReturn execution details:\n{\n  \"action\": \"BUY_EXECUTED|BUY_FAILED|BUY_SKIPPED\",\n  \"amount_usd\": 50,\n  \"tokens_received\": 125000,\n  \"price_paid\": 0.0004,\n  \"tx_hash\": \"0x123...\",\n  \"reason\": \"Trade executed successfully\"\n}",

          framework: "openrouter", 
          model: "openai/gpt-4",
          temperature: 0.2,
          maxTokens: 1000,
          description: "Executes token purchases with risk management"
        }
      },
      {
        id: "task-telegram-notify",
        type: "task",
        position: { x: 1300, y: 200 },
        data: {
          label: "📱 Telegram Notification",
          description: "Send trading results to Telegram channel",
          expectedOutput: "Formatted Telegram message with trade details and performance metrics",
          
          prompt: "Create a Telegram notification for this crypto trade. Return ONLY the message text, no JSON or extra formatting:\n\n**TRADE SUMMARY:**\nToken: {{trigger.baseToken.symbol}} ({{trigger.baseToken.name}})\nAction: {{trade_result.action}}\nAmount: ${{trade_result.amount_usd}}\nPrice: ${{trade_result.price_paid}}\nTokens: {{trade_result.tokens_received}}\n\n**ANALYSIS:**\nDecision: {{analysis.decision}}\nConfidence: {{analysis.confidence}}%\n\n**MARKET DATA:**\nLiquidity: ${{trigger.liquidity.usd}}\n24h Volume: ${{trigger.volume.h24}}\n24h Change: {{trigger.priceChange.h24}}%\n\nFormat as an engaging Telegram message with emojis and clear sections. Output should be plain text ready to send to Telegram.",

          agent: "agent-trade-executor"
        }
      },
      {
        id: "output-telegram",
        type: "output",
        position: { x: 1600, y: 200 },
        data: {
          label: "📤 Telegram Sender",
          outputType: "webhook",
          
          webhookUrl: "https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
          webhookMethod: "POST",
          webhookHeaders: {
            "Content-Type": "application/json"
          },
          webhookPayload: {
            "chat_id": "5251498620",
            "text": "{task_output}"
          },
          
          description: "Sends formatted trading notifications to Telegram"
        }
      },
      {
        id: "task-risk-monitor",
        type: "task",
        position: { x: 1000, y: 350 },
        data: {
          label: "🛡️ Risk Monitor",
          description: "Monitor portfolio risk and set alerts",
          expectedOutput: "Risk assessment and portfolio recommendations",
          
          prompt: "Monitor trading risk and portfolio health:\n\n**CURRENT TRADE:**\n{{trade_result}}\n\n**RISK ANALYSIS:**\n1. Calculate position size vs total portfolio\n2. Assess concentration risk\n3. Monitor stop-loss levels\n4. Track daily/weekly P&L\n\n**ALERTS:**\n- If daily loss > 5% of portfolio\n- If single position > 10% of portfolio  \n- If stop-loss triggered\n- If unusual market volatility\n\nProvide risk recommendations and alerts.",

          agent: "agent-trade-executor"
        }
      }
    ],
    edges: [
      {
        id: "e1-2",
        source: "trigger-dex-scanner",
        target: "agent-token-analyzer",
        type: "smoothstep",
        animated: true,
        data: { label: "🔍 New Token Data" }
      },
      {
        id: "e2-3",
        source: "agent-token-analyzer", 
        target: "logic-buy-decision",
        type: "smoothstep",
        animated: true,
        data: { label: "📊 Analysis Results" }
      },
      {
        id: "e3-4",
        source: "logic-buy-decision",
        target: "agent-trade-executor",
        type: "smoothstep",
        animated: true,
        sourceHandle: "true",
        data: { label: "✅ Buy Approved" }
      },
      {
        id: "e4-5",
        source: "agent-trade-executor",
        target: "task-telegram-notify",
        type: "smoothstep", 
        animated: true,
        data: { label: "💰 Trade Results" }
      },
      {
        id: "e5-6",
        source: "task-telegram-notify",
        target: "output-telegram",
        type: "smoothstep",
        animated: true,
        data: { label: "📱 Notification" }
      },
      {
        id: "e4-7",
        source: "agent-trade-executor",
        target: "task-risk-monitor", 
        type: "smoothstep",
        animated: true,
        data: { label: "🛡️ Risk Check" }
      }
    ],
    metadata: {
      version: "1.0",
      created: "2024-01-28",
      author: "CrewBuilder AI",
      complexity: "expert",
      useCase: "crypto-trading-automation",
      industry: ["cryptocurrency", "defi", "trading", "fintech"],
      estimatedCost: "$2-5 per execution",
      
      setupInstructions: [
        "1. Get DexScreener API access (free)",
        "2. Set up Telegram bot and get bot token",
        "3. Configure trading wallet/exchange API",
        "4. Set risk management parameters",
        "5. Test with small amounts first",
        "6. Monitor performance and adjust filters"
      ],
      
      riskWarnings: [
        "⚠️ CRYPTO TRADING IS HIGH RISK - Only invest what you can afford to lose",
        "⚠️ Test thoroughly with small amounts before scaling",
        "⚠️ Always use stop-losses and position sizing",
        "⚠️ Monitor for honeypots and rug pulls",
        "⚠️ Comply with local regulations"
      ],
      
      bestPractices: [
        "Start with very small position sizes ($10-50)",
        "Use multiple safety checks and filters",
        "Monitor performance daily",
        "Set strict stop-losses (-20% max)",
        "Diversify across multiple tokens",
        "Keep detailed trading logs"
      ],
      
      profitPotential: [
        "💰 Early detection of 10-100x tokens",
        "🚀 Automated 24/7 monitoring",
        "⚡ Faster than manual traders",
        "🎯 Consistent strategy execution",
        "📈 Compound growth potential"
      ]
    }
  }
];
      
      
      
      
      
      
      
      
      
    
      