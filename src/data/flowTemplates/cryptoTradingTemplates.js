// Crypto Trading Templates
// Collection of templates for cryptocurrency monitoring, analysis, and trading

export const cryptoTradingTemplates = [
  // Simple Crypto Data Extractor Template
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
        type: 'animated',
        animated: true,
        data: {
          label: '🔍 API Data',
          dataType: 'api',
          state: 'idle'
        }
      },
      {
        id: 'edge-agent-task',
        source: 'agent-crypto-simple',
        target: 'task-crypto-simple',
        type: 'animated',
        animated: true,
        data: {
          label: '🤖 Processed Data',
          dataType: 'agent',
          state: 'idle'
        }
      },
      {
        id: 'edge-task-output',
        source: 'task-crypto-simple',
        target: 'output-crypto-simple',
        type: 'animated',
        animated: true,
        data: {
          label: '📱 Telegram Message',
          dataType: 'webhook',
          state: 'idle'
        }
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

  // WORKING DexScreener Live Template
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
          goal: 'Extract and format crypto trading data from DexScreener API responses without giving advice',
          backstory: 'You are a crypto data extraction specialist. Your ONLY job is to extract and format trading data from DexScreener API responses.',
          prompt: `You are a crypto data extraction specialist. Your ONLY job is to extract and format trading data from DexScreener API responses.

CRITICAL INSTRUCTIONS:
1. Extract ONLY the raw trading data
2. DO NOT give trading advice
3. DO NOT analyze or recommend
4. JUST format the data cleanly

INPUT: You will receive DexScreener API data
OUTPUT: Format it like this:

🔥 NEW CRYPTO TOKENS DETECTED:

Token: [TOKEN_NAME]
Symbol: [SYMBOL]
Price: $[PRICE]
Chain: [BLOCKCHAIN]
Liquidity: $[LIQUIDITY]
Volume 24h: $[VOLUME]
Price Change: [CHANGE]%
Status: [ACTIVE/NEW/TRENDING]

---

If NO new tokens: Output exactly "No new crypto data detected"

REMEMBER: Extract data, don't give advice!

Return JSON format:
{
  "decision": "STRONG_BUY|BUY|HOLD|AVOID",
  "confidence": 0.85,
  "risk_score": 0.3,
  "token_data": "formatted token info",
  "raw_data": "extracted data"
}`,
          framework: 'crewai',
          frameworkConfig: {
            model: 'gpt-4',
            temperature: 0.1,
            max_tokens: 1500,
            api_key: ''
          },
          llmModel: 'gpt-4',
          temperature: 0.1,
          max_tokens: 1500,
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

  // Smart Crypto Monitor with Field Filtering
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
  },

  // Live Dex Coin Scanner & Auto-Buyer
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
          
          prompt: `You are a crypto data extraction specialist. Your ONLY job is to extract and format trading data from DexScreener API responses.

CRITICAL INSTRUCTIONS:
1. Extract ONLY the raw trading data
2. DO NOT give trading advice
3. DO NOT analyze or recommend
4. JUST format the data cleanly

INPUT: You will receive DexScreener API data
OUTPUT: Format it like this:

🔥 NEW CRYPTO TOKENS DETECTED:

Token: [TOKEN_NAME]
Symbol: [SYMBOL]
Price: $[PRICE]
Chain: [BLOCKCHAIN]
Liquidity: $[LIQUIDITY]
Volume 24h: $[VOLUME]
Price Change: [CHANGE]%
Status: [ACTIVE/NEW/TRENDING]

---

If NO new tokens: Output exactly "No new crypto data detected"

REMEMBER: Extract data, don't give advice!

Return JSON format:
{
  "decision": "STRONG_BUY|BUY|HOLD|AVOID",
  "confidence": 0.85,
  "risk_score": 0.3,
  "token_data": "formatted token info",
  "raw_data": "extracted data"
}`,

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
          
          prompt: `Execute a token purchase based on this analysis:

**TRADE PARAMETERS:**
- Token: \${trigger.baseToken.symbol}
- Current Price: $\${trigger.priceUsd}
- Liquidity: $\${trigger.liquidity.usd}

**EXECUTION CHECKLIST:**
1. Verify price is reasonable
2. Check liquidity is sufficient
3. Calculate slippage (max 5%)
4. Set stop-loss at -20%
5. Execute trade

Return execution details:
{
  "action": "BUY_EXECUTED|BUY_FAILED|BUY_SKIPPED",
  "amount_usd": 50,
  "tokens_received": 125000,
  "price_paid": 0.0004,
  "tx_hash": "0x123...",
  "reason": "Trade executed successfully"
}`,

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
          
          prompt: `Create a Telegram notification for this crypto trade. Return ONLY the message text, no JSON or extra formatting:

**TRADE SUMMARY:**
Token: \${trigger.baseToken.symbol} (\${trigger.baseToken.name})
Action: \${trade_result.action}
Amount: $\${trade_result.amount_usd}
Price: $\${trade_result.price_paid}
Tokens: \${trade_result.tokens_received}

**ANALYSIS:**
Decision: \${analysis.decision}
Confidence: \${analysis.confidence}%

**MARKET DATA:**
Liquidity: $\${trigger.liquidity.usd}
24h Volume: $\${trigger.volume.h24}
24h Change: \${trigger.priceChange.h24}%

Format as an engaging Telegram message with emojis and clear sections. Output should be plain text ready to send to Telegram.`,

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
          
          prompt: `Monitor trading risk and portfolio health:

**CURRENT TRADE:**
\${trade_result}

**RISK ANALYSIS:**
1. Calculate position size vs total portfolio
2. Assess concentration risk
3. Monitor stop-loss levels
4. Track daily/weekly P&L

**ALERTS:**
- If daily loss > 5% of portfolio
- If single position > 10% of portfolio  
- If stop-loss triggered
- If unusual market volatility

Provide risk recommendations and alerts.`,

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

// Export for use in main templates file
export default cryptoTradingTemplates; 