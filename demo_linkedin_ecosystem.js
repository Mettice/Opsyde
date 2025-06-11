// Demo LinkedIn AI Ecosystem - Complete 4-Agent System
// This demonstrates the exact capabilities requested by the recruiter

export const linkedinEcosystemDemo = {
  name: "LinkedIn AI Agent Ecosystem",
  description: "🚀 Complete 4-agent system for LinkedIn automation: Content → Prospects → Outreach → Analytics",
  category: "LinkedIn Automation",
  complexity: "Advanced",
  estimatedTime: "5-8 minutes",
  
  // Demo inputs to showcase the system
  demoInputs: {
    industry: "AI automation and workflow optimization",
    targetAudience: "SaaS founders, CTOs, operations managers",
    valueProposition: "CrewBuilder helps teams eliminate repetitive work with AI agent orchestration",
    prospectList: [
      {
        name: "Sarah Chen",
        company: "TechFlow Solutions", 
        title: "VP of Operations",
        linkedinUrl: "linkedin.com/in/sarahchen-ops",
        industry: "SaaS"
      },
      {
        name: "Michael Rodriguez",
        company: "AutoScale Inc",
        title: "CTO", 
        linkedinUrl: "linkedin.com/in/mrodriguez-cto",
        industry: "B2B Software"
      }
    ]
  },

  nodes: [
    // INPUT NODE - Campaign Configuration
    {
      id: 'input-campaign-config',
      type: 'input',
      position: { x: 100, y: 200 },
      data: {
        label: '🎯 Campaign Configuration',
        description: 'Configure the LinkedIn automation campaign',
        inputType: 'text',
        value: JSON.stringify({
          industry: "AI automation and workflow optimization",
          targetAudience: "SaaS founders, CTOs, operations managers", 
          valueProposition: "CrewBuilder helps teams eliminate repetitive work with AI agent orchestration",
          contentFrequency: "daily",
          outreachGoal: "20 connections per day",
          responseTarget: "35% acceptance rate"
        }, null, 2),
        nodeId: 'input-campaign-config',
        nodeType: 'input'
      }
    },

    // INPUT NODE - Prospect List
    {
      id: 'input-prospect-list',
      type: 'input', 
      position: { x: 100, y: 350 },
      data: {
        label: '👥 Prospect List',
        description: 'Target prospects for outreach',
        inputType: 'text',
        value: JSON.stringify([
          {
            name: "Sarah Chen",
            company: "TechFlow Solutions",
            title: "VP of Operations", 
            linkedinUrl: "linkedin.com/in/sarahchen-ops",
            industry: "SaaS",
            recentActivity: "Posted about scaling operations challenges"
          },
          {
            name: "Michael Rodriguez", 
            company: "AutoScale Inc",
            title: "CTO",
            linkedinUrl: "linkedin.com/in/mrodriguez-cto", 
            industry: "B2B Software",
            recentActivity: "Shared article about automation tools"
          }
        ], null, 2),
        nodeId: 'input-prospect-list',
        nodeType: 'input'
      }
    },

    // AGENT 1 - Content Intelligence Agent
    {
      id: 'agent-content-intelligence',
      type: 'agent',
      position: { x: 400, y: 100 },
      data: {
        label: '🧠 Content Intelligence Agent',
        role: 'LinkedIn Content Strategist',
        goal: 'Research trending topics and create engaging LinkedIn content that establishes thought leadership and drives engagement',
        backstory: 'You are an expert LinkedIn content strategist who understands what content performs best for B2B audiences. You research industry trends, analyze successful posts, and create content that drives meaningful engagement and establishes thought leadership.',
        
        framework: 'crewai',
        llmModel: 'gpt-4',
        temperature: 0.8,
        max_tokens: 2000,
        allowDelegation: false,
        enableMemory: true,
        verbose: true,
        
        // Enhanced prompt for realistic content creation
        systemMessage: `You are an expert LinkedIn content strategist. Based on the campaign configuration, create engaging LinkedIn content.

CAMPAIGN CONFIG: {{input-campaign-config}}

Create 3 different types of LinkedIn posts:

1. THOUGHT LEADERSHIP POST:
   - Hook that grabs attention (first 2 lines)
   - Personal insight or industry observation
   - Call-to-action for engagement
   - 3-5 relevant hashtags

2. VALUE-DRIVEN POST:
   - Start with a problem statement
   - Provide actionable solution/tip
   - Include specific example or case study
   - Clear call-to-action

3. ENGAGEMENT POST:
   - Question-based format
   - Industry-relevant scenario
   - Multiple engagement options (poll, comment, share)
   - Community-building focus

Format each post for optimal LinkedIn engagement and include:
- Character count optimization
- Emoji placement for visual appeal
- Strategic hashtag selection
- Clear engagement hooks

Return as JSON with post_type, content, hashtags, expected_engagement_rate`,

        nodeId: 'agent-content-intelligence',
        nodeType: 'agent'
      }
    },

    // AGENT 2 - Prospect Research Agent
    {
      id: 'agent-prospect-research',
      type: 'agent', 
      position: { x: 400, y: 300 },
      data: {
        label: '🔍 Prospect Research Agent',
        role: 'LinkedIn Intelligence Specialist',
        goal: 'Analyze prospect profiles and generate personalization insights for highly targeted outreach',
        backstory: 'You are an expert at analyzing LinkedIn profiles to find authentic personalization opportunities. You understand how to identify pain points, recent activities, mutual connections, and conversation starters that lead to meaningful business relationships.',
        
        framework: 'crewai',
        llmModel: 'gpt-4',
        temperature: 0.7,
        max_tokens: 2500,
        allowDelegation: false,
        enableMemory: true,
        verbose: true,
        
        systemMessage: `You are a LinkedIn intelligence specialist. Analyze each prospect and generate comprehensive research insights.

PROSPECT LIST: {{input-prospect-list}}
CAMPAIGN CONFIG: {{input-campaign-config}}

For each prospect, provide:

1. PROFILE ANALYSIS:
   - Role relevance to our value proposition
   - Seniority level and decision-making authority
   - Company context and industry challenges
   - Recent activity analysis

2. PERSONALIZATION HOOKS:
   - Specific recent posts or activities
   - Mutual connections or shared experiences
   - Company news or milestones
   - Industry-specific pain points

3. OUTREACH STRATEGY:
   - Best approach angle (peer-to-peer, solution-focused, etc.)
   - Optimal timing based on activity patterns
   - Conversation starters and ice breakers
   - Value proposition alignment

4. LEAD SCORING:
   - Priority level (High/Medium/Low)
   - Likelihood to respond (1-10)
   - Potential deal value assessment
   - Follow-up sequence recommendations

Return comprehensive analysis in JSON format with actionable insights for each prospect.`,

        nodeId: 'agent-prospect-research',
        nodeType: 'agent'
      }
    },

    // AGENT 3 - Message Automation Agent
    {
      id: 'agent-message-automation',
      type: 'agent',
      position: { x: 700, y: 200 },
      data: {
        label: '✍️ Message Automation Agent',
        role: 'LinkedIn Outreach Specialist', 
        goal: 'Create personalized connection requests, follow-up sequences, and engagement messages that drive high response rates',
        backstory: 'You are a master of LinkedIn outreach who understands the psychology of connection requests and follow-up messaging. You create authentic, personalized messages that feel human and build genuine business relationships.',
        
        framework: 'crewai',
        llmModel: 'gpt-4',
        temperature: 0.8,
        max_tokens: 3000,
        allowDelegation: false,
        enableMemory: true,
        verbose: true,
        
        systemMessage: `You are a LinkedIn outreach specialist. Create personalized messaging sequences for each prospect.

PROSPECT RESEARCH: {{agent-prospect-research}}
CAMPAIGN CONFIG: {{input-campaign-config}}

For each prospect, create:

1. CONNECTION REQUEST (300 chars max):
   - Personalized opening referencing specific detail
   - Clear value proposition
   - Professional but friendly tone
   - Compelling reason to connect

2. FIRST FOLLOW-UP (if connection accepted):
   - Thank them for connecting
   - Reference shared interest or mutual connection
   - Provide immediate value (insight, resource, tip)
   - Soft ask for conversation

3. SECOND FOLLOW-UP (if no response after 5 days):
   - Different angle/approach
   - Share relevant case study or success story
   - Address potential pain point
   - Alternative engagement option

4. ENGAGEMENT COMMENTS:
   - 3 different comment templates for their posts
   - Value-adding responses
   - Question-based engagement starters
   - Conversation continuing comments

5. POST INTERACTION STRATEGY:
   - Which posts to like/comment on
   - Timing for optimal engagement
   - Conversation escalation tactics

Return all messages in JSON format with timing recommendations and success probability scores.`,

        nodeId: 'agent-message-automation',
        nodeType: 'agent'
      }
    },

    // AGENT 4 - Response & Analytics Agent  
    {
      id: 'agent-response-analytics',
      type: 'agent',
      position: { x: 1000, y: 250 },
      data: {
        label: '📊 Response & Analytics Agent',
        role: 'LinkedIn Performance Analyst',
        goal: 'Monitor outreach performance, analyze response patterns, and optimize the entire LinkedIn automation ecosystem for maximum ROI',
        backstory: 'You are a data-driven LinkedIn performance specialist who understands how to track, measure, and optimize every aspect of LinkedIn automation. You provide actionable insights that improve response rates and business outcomes.',
        
        framework: 'crewai',
        llmModel: 'gpt-3.5-turbo', 
        temperature: 0.3,
        max_tokens: 2000,
        allowDelegation: false,
        enableMemory: true,
        verbose: true,
        
        systemMessage: `You are a LinkedIn performance analyst. Analyze the complete outreach strategy and provide optimization insights.

CONTENT STRATEGY: {{agent-content-intelligence}}
PROSPECT RESEARCH: {{agent-prospect-research}}
MESSAGE SEQUENCES: {{agent-message-automation}}
CAMPAIGN CONFIG: {{input-campaign-config}}

Provide comprehensive analysis:

1. CAMPAIGN METRICS PROJECTION:
   - Expected connection acceptance rate
   - Projected response rates by message type
   - Estimated conversations per week
   - Lead qualification probability

2. CONTENT PERFORMANCE FORECAST:
   - Engagement rate predictions by post type
   - Best posting times and frequency
   - Hashtag performance optimization
   - Content improvement suggestions

3. OUTREACH OPTIMIZATION:
   - Message performance scoring
   - A/B testing recommendations
   - Timing optimization suggestions
   - Personalization effectiveness analysis

4. CRM INTEGRATION PLAN:
   - Lead scoring criteria
   - Pipeline stage definitions
   - Follow-up automation triggers
   - Conversion tracking setup

5. DASHBOARD METRICS:
   - KPIs to track daily/weekly/monthly
   - Success benchmarks by prospect type
   - ROI calculation methodology
   - Scaling recommendations

6. COMPLIANCE & SAFETY:
   - LinkedIn ToS adherence score
   - Rate limiting recommendations
   - Risk mitigation strategies
   - Account safety protocols

Return a comprehensive analytics and optimization report in JSON format.`,

        nodeId: 'agent-response-analytics', 
        nodeType: 'agent'
      }
    },

    // TASK 1 - Content Creation Task
    {
      id: 'task-content-creation',
      type: 'task',
      position: { x: 400, y: 50 },
      data: {
        label: '📝 Content Creation Task',
        description: 'Create engaging LinkedIn content for thought leadership',
        agent: 'agent-content-intelligence',
        expectedOutput: 'JSON object with 3 optimized LinkedIn posts (thought leadership, value-driven, engagement), each with content, hashtags, and engagement predictions',
        
        prompt: `Create engaging LinkedIn content based on the campaign configuration.

CAMPAIGN DATA: {{input-campaign-config}}

Your task is to research trends and create 3 different types of LinkedIn posts:

1. THOUGHT LEADERSHIP POST
2. VALUE-DRIVEN POST  
3. ENGAGEMENT POST

For each post, provide:
- Optimized content (under 3000 characters)
- Strategic hashtags (3-5 relevant)
- Expected engagement rate
- Best posting time
- Call-to-action strategy

Return as structured JSON with post performance predictions.`,

        nodeId: 'task-content-creation',
        nodeType: 'task'
      }
    },

    // TASK 2 - Prospect Analysis Task
    {
      id: 'task-prospect-analysis',
      type: 'task',
      position: { x: 400, y: 450 },
      data: {
        label: '🔍 Prospect Analysis Task',
        description: 'Deep analysis of prospect profiles for personalization',
        agent: 'agent-prospect-research',
        expectedOutput: 'Comprehensive prospect analysis with personalization hooks, lead scores, and outreach strategy for each prospect',
        
        prompt: `Analyze each prospect in the prospect list for personalized outreach opportunities.

PROSPECT DATA: {{input-prospect-list}}
CAMPAIGN CONFIG: {{input-campaign-config}}

For each prospect, provide:

1. Profile analysis and lead scoring (1-10)
2. Personalization hooks and conversation starters
3. Optimal outreach timing and approach
4. Pain point identification
5. Value proposition alignment
6. Response probability assessment

Return detailed analysis in JSON format with actionable insights for outreach.`,

        nodeId: 'task-prospect-analysis',
        nodeType: 'task'
      }
    },

    // TASK 3 - Message Generation Task
    {
      id: 'task-message-generation',
      type: 'task',
      position: { x: 700, y: 350 },
      data: {
        label: '✍️ Message Generation Task',
        description: 'Create personalized outreach sequences for each prospect',
        agent: 'agent-message-automation',
        expectedOutput: 'Complete messaging sequences for each prospect including connection requests, follow-ups, and engagement comments',
        
        prompt: `Generate personalized messaging sequences based on prospect research.

PROSPECT INSIGHTS: {{task-prospect-analysis}}
CAMPAIGN CONFIG: {{input-campaign-config}}

For each prospect, create:

1. Personalized connection request (under 300 characters)
2. First follow-up message (if connection accepted)
3. Second follow-up message (if no response)
4. Comment templates for their posts
5. Engagement strategy recommendations

All messages must be:
- Highly personalized using research insights
- Professional but authentic
- Value-focused, not sales-heavy
- LinkedIn compliant

Return complete messaging toolkit in JSON format.`,

        nodeId: 'task-message-generation',
        nodeType: 'task'
      }
    },

    // TASK 4 - Performance Analysis Task
    {
      id: 'task-performance-analysis',
      type: 'task',
      position: { x: 1000, y: 100 },
      data: {
        label: '📊 Performance Analysis Task',
        description: 'Analyze strategy effectiveness and provide optimization recommendations',
        agent: 'agent-response-analytics',
        expectedOutput: 'Comprehensive performance analysis with KPIs, optimization recommendations, and CRM integration plan',
        
        prompt: `Analyze the complete LinkedIn automation strategy and provide optimization insights.

CONTENT STRATEGY: {{task-content-creation}}
PROSPECT RESEARCH: {{task-prospect-analysis}}
MESSAGE SEQUENCES: {{task-message-generation}}
CAMPAIGN CONFIG: {{input-campaign-config}}

Provide analysis on:

1. Expected campaign performance metrics
2. Content engagement predictions
3. Outreach success probability
4. Optimization recommendations
5. CRM integration requirements
6. Compliance and safety assessment

Return comprehensive analytics report with actionable optimization strategies.`,

        nodeId: 'task-performance-analysis',
        nodeType: 'task'
      }
    },

    // INTEGRATION NODE - CRM/Notion Sync
    {
      id: 'integration-crm-sync',
      type: 'tool',
      position: { x: 1300, y: 200 },
      data: {
        label: '🔗 CRM Integration',
        description: 'Sync all data to CRM/Notion dashboard',
        framework: 'universal_api',
        toolType: 'universal_api',
        
        config: {
          api_service_name: "Notion",
          ai_description: "Create a comprehensive LinkedIn automation dashboard in Notion with prospect tracking, message performance, and analytics",
          api_endpoint_hint: "https://api.notion.com/v1/pages",
          
          // Mock API research result for demo
          api_research_result: {
            service_name: "Notion",
            api_type: "REST",
            base_url: "https://api.notion.com/v1", 
            auth_type: "bearer_token",
            primary_method: "POST",
            confidence: 0.95
          }
        },
        
        nodeId: 'integration-crm-sync',
        nodeType: 'tool'
      }
    },

    // OUTPUT NODE - Campaign Dashboard
    {
      id: 'output-campaign-dashboard',
      type: 'output',
      position: { x: 1300, y: 350 },
      data: {
        label: '📈 Campaign Dashboard',
        description: 'Complete campaign results and next actions',
        outputType: 'rich_content',
        
        nodeId: 'output-campaign-dashboard',
        nodeType: 'output'
      }
    }
  ],

  edges: [
    // INPUT -> TASKS: Campaign config flows to tasks that need it
    {
      id: 'e1',
      source: 'input-campaign-config',
      target: 'task-content-creation',
      type: 'animated',
      animated: true,
      data: { label: '🎯 Campaign Data', dataType: 'text', state: 'idle' }
    },
    
    {
      id: 'e2',
      source: 'input-campaign-config',
      target: 'task-prospect-analysis',
      type: 'animated',
      animated: true,
      data: { label: '🎯 Campaign Context', dataType: 'text', state: 'idle' }
    },
    
    // Prospect list flows to prospect analysis task
    {
      id: 'e3', 
      source: 'input-prospect-list',
      target: 'task-prospect-analysis',
      type: 'animated',
      animated: true,
      data: { label: '👥 Prospect Data', dataType: 'text', state: 'idle' }
    },
    
    // TASKS -> AGENTS: Each task is assigned to its agent
    {
      id: 'e4',
      source: 'task-content-creation',
      target: 'agent-content-intelligence',
      type: 'animated',
      animated: true,
      data: { label: '📝 Content Task', dataType: 'task', state: 'idle' }
    },
    
    {
      id: 'e5',
      source: 'task-prospect-analysis',
      target: 'agent-prospect-research',
      type: 'animated',
      animated: true,
      data: { label: '🔍 Research Task', dataType: 'task', state: 'idle' }
    },
    
    // Message generation task needs prospect insights + campaign config
    {
      id: 'e6',
      source: 'input-campaign-config',
      target: 'task-message-generation',
      type: 'animated',
      animated: true,
      data: { label: '🎯 Campaign Parameters', dataType: 'text', state: 'idle' }
    },
    
    {
      id: 'e7',
      source: 'task-prospect-analysis',
      target: 'task-message-generation',
      type: 'animated',
      animated: true,
      data: { label: '🔍 Prospect Insights', dataType: 'context', state: 'idle' }
    },
    
    {
      id: 'e8',
      source: 'task-message-generation',
      target: 'agent-message-automation',
      type: 'animated',
      animated: true,
      data: { label: '✍️ Message Task', dataType: 'task', state: 'idle' }
    },
    
    // Performance analysis task needs all other task results
    {
      id: 'e9',
      source: 'task-content-creation',
      target: 'task-performance-analysis',
      type: 'animated',
      animated: true,
      data: { label: '📝 Content Results', dataType: 'context', state: 'idle' }
    },
    
    {
      id: 'e10',
      source: 'task-prospect-analysis',
      target: 'task-performance-analysis',
      type: 'animated',
      animated: true,
      data: { label: '🔍 Research Results', dataType: 'context', state: 'idle' }
    },
    
    {
      id: 'e11',
      source: 'task-message-generation',
      target: 'task-performance-analysis',
      type: 'animated',
      animated: true,
      data: { label: '✍️ Message Results', dataType: 'context', state: 'idle' }
    },
    
    {
      id: 'e12',
      source: 'input-campaign-config',
      target: 'task-performance-analysis',
      type: 'animated',
      animated: true,
      data: { label: '🎯 Campaign Config', dataType: 'text', state: 'idle' }
    },
    
    {
      id: 'e13',
      source: 'task-performance-analysis',
      target: 'agent-response-analytics',
      type: 'animated',
      animated: true,
      data: { label: '📊 Analytics Task', dataType: 'task', state: 'idle' }
    },
    
    // OUTPUTS: Analytics flows to integrations and final output
    {
      id: 'e14',
      source: 'agent-response-analytics',
      target: 'integration-crm-sync',
      type: 'animated',
      animated: true,
      data: { label: '📊 Performance Data', dataType: 'agent', state: 'idle' }
    },
    
    {
      id: 'e15',
      source: 'integration-crm-sync',
      target: 'output-campaign-dashboard',
      type: 'animated',
      animated: true,
      data: { label: '🔗 CRM Data', dataType: 'tool', state: 'idle' }
    },
    
    {
      id: 'e16',
      source: 'agent-response-analytics',
      target: 'output-campaign-dashboard', 
      type: 'animated',
      animated: true,
      data: { label: '📊 Analytics Report', dataType: 'agent', state: 'idle' }
    }
  ],

  // Expected outputs for demo
  expectedOutputs: {
    contentIntelligence: {
      thoughtLeadershipPost: "🚀 After helping 50+ companies automate their workflows, I've noticed a pattern...\n\nThe most successful teams don't just implement AI tools – they reimagine their entire process architecture.\n\nHere's what sets them apart:\n✅ They start with outcomes, not tools\n✅ They involve their team in the design process\n✅ They measure human time saved, not just efficiency gains\n\nWhat's your biggest workflow bottleneck right now?\n\n#WorkflowAutomation #AITransformation #OperationalExcellence #ProductivityHacks #BusinessAutomation",
      
      valuePost: "💡 Quick automation tip for SaaS teams:\n\nInstead of automating everything at once, start with your \"Friday 3pm tasks\" – those repetitive things you dread doing at the end of the week.\n\nWhy this works:\n→ High motivation to automate\n→ Clear success metrics\n→ Immediate team buy-in\n→ Fast ROI demonstration\n\nLast month, we helped AutoScale Inc eliminate their weekly report generation (saved 4 hours/week).\n\nResult? Their ops team now focuses on strategic initiatives instead of data compilation.\n\nWhat's your \"Friday 3pm task\" that needs automation?\n\n#AutomationStrategy #SaaSOps #TimeManagement",
      
      engagementPost: "🤔 Poll time: What's holding your team back from implementing AI automation?\n\nA) Lack of technical expertise\nB) Budget constraints\nC) Fear of job displacement\nD) Not sure where to start\nE) All of the above 😅\n\nComment with your letter + biggest specific challenge.\n\nI'll share actionable solutions for the top 3 responses!\n\n#AIAutomation #TeamChallenges #WorkflowOptimization"
    },
    
    prospectResearch: {
      sarahChen: {
        profileAnalysis: "VP Operations at TechFlow Solutions - high authority decision maker for process optimization tools. Recent post about scaling challenges indicates active pain point alignment.",
        personalizationHooks: ["Recent post about scaling operations challenges", "Company recently raised Series B", "Shared article about remote team management"],
        outreachStrategy: "Peer-to-peer approach focusing on scaling solutions and operational efficiency",
        leadScore: 9,
        priority: "High"
      },
      
      michaelRodriguez: {
        profileAnalysis: "CTO at AutoScale Inc - technical decision maker with strong automation interest. Recent engagement with automation content shows high intent.",
        personalizationHooks: ["Shared article about automation tools", "Active in SaaS CTO community", "Company focused on scaling solutions"],
        outreachStrategy: "Technical approach emphasizing architecture and implementation efficiency", 
        leadScore: 8,
        priority: "High"
      }
    },
    
    messageAutomation: {
      connectionRequests: [
        "Hi Sarah! Saw your post about scaling operations challenges - been helping similar SaaS teams eliminate workflow bottlenecks. Would love to connect and share some insights! 🚀",
        "Hi Michael! Your article share on automation tools caught my attention. We're building some innovative solutions in this space - would love to connect and exchange ideas!"
      ],
      
      followUpSequence: [
        "Thanks for connecting! Your insights on scaling operations really resonated. We recently helped AutoScale Inc reduce their weekly reporting time by 75% - happy to share the approach if you're interested.",
        "Following up on my previous message. I put together a quick case study on how we helped a similar SaaS company automate their ops workflows. Mind if I send it over?"
      ]
    },
    
    analyticsReport: {
      projectedMetrics: {
        connectionAcceptanceRate: "42%",
        responseRate: "38%", 
        conversationRate: "25%",
        qualifiedLeadRate: "15%"
      },
      optimizationRecommendations: [
        "Increase personalization depth by 30% for higher acceptance rates",
        "Schedule outreach for Tuesday-Thursday 10am-2pm for optimal response",
        "A/B test value-first vs peer-to-peer messaging approaches",
        "Implement 3-touch sequence with 5-day intervals"
      ]
    }
  },

  // Demo metadata
  metadata: {
    category: 'LinkedIn Automation',
    industry: ['SaaS', 'B2B', 'Sales', 'Marketing'],
    outputFormat: 'Complete LinkedIn Campaign Package',
    aiCapabilities: ['Research', 'Content Creation', 'Personalization', 'Analytics'],
    businessValue: 'High - Complete LinkedIn automation ecosystem',
    complianceLevel: 'Enterprise-grade LinkedIn ToS compliance',
    scalability: 'Infinite - Add unlimited agents and prospects'
  }
}; 