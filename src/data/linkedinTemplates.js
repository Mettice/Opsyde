// LinkedIn Automation Templates - Complete and Modular
// Professional LinkedIn automation workflows

const convertToAnimatedEdges = (edges) => {
  return edges.map(edge => ({
    ...edge,
    animated: true,
    style: { stroke: '#0ea5e9', strokeWidth: 2 },
    type: 'smoothstep'
  }));
};

export const linkedinTemplates = [
  {
    id: 'linkedin-lead-generation-pipeline',
    name: '🎯 LinkedIn Lead Generation Pipeline',
    description: 'Complete automated lead generation system that finds prospects, analyzes profiles, personalizes outreach, and tracks responses with CRM integration',
    category: 'LinkedIn',
    difficulty: 'Advanced',
    estimatedTime: '45 minutes',
    tags: ['linkedin', 'leads', 'automation', 'sales', 'prospecting'],
    nodes: [
      {
        id: 'trigger-linkedin-search',
        type: 'trigger',
        position: { x: 100, y: 200 },
        data: {
          label: '🔍 LinkedIn Search Trigger',
          triggerType: 'schedule',
          schedule: 'daily',
          description: 'Automated daily prospect search on LinkedIn Sales Navigator',
          config: {
            searchCriteria: {
              jobTitles: ['CEO', 'CTO', 'VP Sales', 'Marketing Director', 'Founder'],
              industries: ['Technology', 'SaaS', 'Fintech', 'E-commerce'],
              companySize: '50-500',
              location: 'United States',
              keywords: 'B2B, automation, AI, growth'
            },
            maxResults: 50
          }
        }
      },
      {
        id: 'agent-prospect-researcher',
        type: 'agent',
        position: { x: 400, y: 100 },
        data: {
          label: '🕵️ Prospect Research Agent',
          role: 'LinkedIn Prospect Research Specialist',
          goal: 'Analyze LinkedIn profiles to determine lead quality and identify personalization opportunities',
          backstory: 'You are an expert at analyzing LinkedIn profiles to assess lead quality, identify pain points, and find personalization hooks for outreach.',
          
          prompt: 'Analyze this LinkedIn prospect profile data:\n\n**PROFILE DATA:**\n{{trigger.profileData}}\n\n**ANALYSIS REQUIRED:**\n1. Lead Quality Score (1-10)\n2. Company Fit Assessment\n3. Job Title Relevance\n4. Recent Activity/Posts\n5. Mutual Connections\n6. Personalization Opportunities\n7. Pain Points/Challenges\n8. Best Outreach Timing\n\n**OUTPUT FORMAT:**\n{\n  "leadScore": 8,\n  "companyFit": "High - SaaS company with 200+ employees",\n  "jobRelevance": "Perfect - VP of Sales at growing tech company",\n  "recentActivity": "Posted about sales automation challenges",\n  "mutualConnections": 3,\n  "personalizationHooks": ["Recent post about scaling sales", "Company just raised Series B"],\n  "painPoints": ["Manual lead qualification", "Sales team efficiency"],\n  "bestOutreachTime": "Tuesday-Thursday 10AM-2PM",\n  "recommendation": "HIGH_PRIORITY|MEDIUM_PRIORITY|LOW_PRIORITY"*\n}',

          framework: 'crewai',
          agentType: 'researcher',
          tools: ['web_scraper', 'linkedin_analyzer', 'company_research'],
          maxIterations: 3,
          temperature: 0.3,
          description: 'AI agent that deeply analyzes LinkedIn prospects for lead qualification and personalization'
        }
      },
      {
        id: 'logic-lead-qualifier',
        type: 'logic',
        position: { x: 700, y: 200 },
        data: {
          label: '⚖️ Lead Qualification Logic',
          description: 'Routes high-quality leads (score 7+) to personalized outreach',
          condition: 'leadScore >= 7 && recommendation === "HIGH_PRIORITY"',
          nodeId: 'logic-lead-qualifier',
          nodeType: 'logic'
        }
      },
      {
        id: 'agent-message-personalizer',
        type: 'agent',
        position: { x: 1000, y: 100 },
        data: {
          label: '✍️ Message Personalization Agent',
          role: 'LinkedIn Outreach Specialist',
          goal: 'Create highly personalized LinkedIn connection requests and follow-up messages that get responses',
          backstory: 'You are a master of LinkedIn outreach who writes personalized messages that feel authentic and get high response rates.',
          
          prompt: 'Create personalized LinkedIn outreach for this prospect:\n\n**PROSPECT DATA:**\n{{analysis}}\n\n**PERSONALIZATION HOOKS:**\n{{analysis.personalizationHooks}}\n\n**PAIN POINTS:**\n{{analysis.painPoints}}\n\n**CREATE 3 MESSAGES:**\n\n1. **CONNECTION REQUEST** (300 chars max):\n   - Reference specific detail from their profile\n   - Mention mutual connection or shared interest\n   - Clear value proposition\n\n2. **FOLLOW-UP MESSAGE** (if they accept):\n   - Thank them for connecting\n   - Provide genuine value/insight\n   - Soft ask for brief call\n\n3. **VALUE-FIRST MESSAGE** (if no response):\n   - Share relevant resource/insight\n   - No direct ask\n   - Build relationship\n\n**OUTPUT:**\n{\n  "connectionRequest": "Hi [Name], saw your post about scaling sales teams. We help companies like [Company] automate lead qualification - would love to connect and share some insights!",\n  "followUpMessage": "Thanks for connecting! Your post about sales challenges resonated. I recently helped a similar SaaS company increase qualified leads by 300%. Happy to share the strategy if you\'re interested.",\n  "valueFirstMessage": "Thought you\'d find this interesting - [Specific Resource]. It addresses the exact challenges you mentioned in your recent post about [Specific Topic].",\n  "sentiment": "professional",\n  "personalizationScore": 9\n}',

          framework: 'openai',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 1000,
          description: 'AI agent that creates highly personalized LinkedIn messages'
        }
      },
      {
        id: 'task-send-connection',
        type: 'task',
        position: { x: 1300, y: 200 },
        data: {
          label: '🤝 Send Connection Request',
          description: 'Sends personalized connection request via LinkedIn automation',
          expectedOutput: 'Connection request sent with tracking ID and status',
          
          prompt: 'Send LinkedIn connection request:\n\n**PROSPECT:** {{trigger.prospect}}\n**MESSAGE:** {{personalization.connectionRequest}}\n**TIMING:** {{analysis.bestOutreachTime}}\n\n**AUTOMATION SETTINGS:**\n- Rate limit: 10 requests per hour\n- Daily limit: 50 requests\n- Weekend pause: true\n- Retry failed: 3 attempts\n\nReturn status and tracking information.',

          agent: 'agent-message-personalizer',
          tools: ['linkedin_automation']
        }
      },
      {
        id: 'agent-response-tracker',
        type: 'agent',
        position: { x: 1000, y: 400 },
        data: {
          label: '📊 Response Tracking Agent',
          role: 'LinkedIn Engagement Tracker',
          goal: 'Monitor connection requests, track responses, and manage follow-up sequences',
          backstory: 'You are responsible for tracking all LinkedIn outreach activities and managing the follow-up process.',
          
          prompt: 'Track LinkedIn outreach response:\n\n**CONNECTION DATA:**\n{{connection_result}}\n\n**TRACK:**\n1. Connection acceptance rate\n2. Response to first message\n3. Engagement with content\n4. Profile views\n5. Meeting requests\n\n**FOLLOW-UP LOGIC:**\n- If accepted but no response after 3 days → Send follow-up\n- If responded → Schedule meeting\n- If no acceptance after 7 days → Add to nurture sequence\n\n**CRM UPDATE:**\n{\n  "leadId": "{{prospect.id}}",\n  "status": "CONNECTED|PENDING|DECLINED",\n  "responseReceived": true/false,\n  "nextAction": "FOLLOW_UP|SCHEDULE_MEETING|NURTURE",\n  "notes": "Detailed interaction notes"\n}',

          framework: 'crewai',
          agentType: 'tracker',
          tools: ['linkedin_api', 'crm_integration'],
          maxIterations: 2,
          temperature: 0.2,
          description: 'Tracks LinkedIn outreach responses and manages follow-up workflows'
        }
      },
      {
        id: 'output-crm-sync',
        type: 'output',
        position: { x: 1300, y: 400 },
        data: {
          label: '📈 CRM Integration',
          outputType: 'webhook',
          webhookUrl: 'https://api.hubspot.com/crm/v3/objects/contacts',
          webhookMethod: 'POST',
          webhookHeaders: {
            'Authorization': 'Bearer {CRM_API_KEY}',
            'Content-Type': 'application/json'
          },
          webhookPayload: {
            'properties': {
              'email': '{prospect.email}',
              'firstname': '{prospect.firstName}',
              'lastname': '{prospect.lastName}',
              'company': '{prospect.company}',
              'jobtitle': '{prospect.jobTitle}',
              'linkedin_url': '{prospect.linkedinUrl}',
              'lead_score': '{analysis.leadScore}',
              'outreach_status': '{tracking.status}',
              'last_contact': '{tracking.lastContact}',
              'next_follow_up': '{tracking.nextAction}'
            }
          },
          description: 'Syncs prospect data and outreach status to CRM system'
        }
      }
    ],
    edges: [
      {
        id: 'e1-2',
        source: 'trigger-linkedin-search',
        target: 'agent-prospect-researcher',
        type: 'smoothstep',
        animated: true,
        data: { label: '🔍 Prospect Data' }
      },
      {
        id: 'e2-3',
        source: 'agent-prospect-researcher',
        target: 'logic-lead-qualifier',
        type: 'smoothstep',
        animated: true,
        data: { label: '📊 Lead Analysis' }
      },
      {
        id: 'e3-4',
        source: 'logic-lead-qualifier',
        target: 'agent-message-personalizer',
        type: 'smoothstep',
        animated: true,
        sourceHandle: 'true',
        data: { label: '✅ Qualified Lead' }
      },
      {
        id: 'e4-5',
        source: 'agent-message-personalizer',
        target: 'task-send-connection',
        type: 'smoothstep',
        animated: true,
        data: { label: '💌 Personalized Message' }
      },
      {
        id: 'e5-6',
        source: 'task-send-connection',
        target: 'agent-response-tracker',
        type: 'smoothstep',
        animated: true,
        data: { label: '📤 Connection Sent' }
      },
      {
        id: 'e6-7',
        source: 'agent-response-tracker',
        target: 'output-crm-sync',
        type: 'smoothstep',
        animated: true,
        data: { label: '📊 Tracking Data' }
      }
    ],
    metadata: {
      version: '1.0',
      created: '2024-01-15',
      author: 'CrewBuilder AI',
      complexity: 'advanced',
      useCase: 'linkedin-lead-generation',
      industry: ['sales', 'marketing', 'b2b', 'lead-generation'],
      estimatedCost: '$0.50-1.00 per lead processed',
      
      setupInstructions: [
        '1. Connect LinkedIn Sales Navigator account',
        '2. Set up CRM integration (HubSpot/Salesforce)',
        '3. Configure LinkedIn automation tool (Phantombuster/LinkedHelper)',
        '4. Set daily/weekly limits for outreach',
        '5. Create message templates and personalization rules',
        '6. Test with small batch of prospects first'
      ],
      
      useCases: [
        '🎯 B2B lead generation',
        '🚀 Sales pipeline automation',
        '🤝 Network expansion',
        '📊 Prospect qualification',
        '💌 Personalized outreach at scale'
      ],
      
      benefits: [
        '⚡ 10x faster prospect identification',
        '🎯 Higher connection acceptance rates (35-45%)',
        '📈 Improved lead quality scoring',
        '🤖 24/7 automated outreach',
        '📊 Data-driven personalization',
        '💰 3-5x ROI on lead generation'
      ],
      
      keyFeatures: [
        '🧠 AI-powered prospect analysis',
        '✍️ Personalized message generation',
        '⚖️ Intelligent lead qualification',
        '📊 Response tracking & analytics',
        '🔄 CRM integration',
        '⏰ Smart timing optimization'
      ]
    }
  },

  {
    id: 'linkedin-content-automation-engine',
    name: '📝 LinkedIn Content Automation Engine',
    description: 'AI-powered content creation, scheduling, and engagement system for LinkedIn thought leadership and brand building',
    category: 'LinkedIn',
    difficulty: 'Intermediate',
    estimatedTime: '30 minutes',
    tags: ['content', 'automation', 'engagement', 'thought-leadership', 'branding'],
    nodes: [
      {
        id: 'trigger-content-schedule',
        type: 'trigger',
        position: { x: 100, y: 200 },
        data: {
          label: '⏰ Content Schedule Trigger',
          triggerType: 'schedule',
          schedule: 'daily',
          description: 'Automated daily content creation and posting schedule',
          config: {
            postingTimes: ['9:00 AM', '1:00 PM', '5:00 PM'],
            contentTypes: ['industry_insights', 'company_updates', 'thought_leadership'],
            frequency: 'daily',
            weekendsIncluded: false
          }
        }
      },
      {
        id: 'agent-trend-researcher',
        type: 'agent',
        position: { x: 400, y: 100 },
        data: {
          label: '📊 Trend Research Agent',
          role: 'Industry Trend Analyst',
          goal: 'Research trending topics, industry news, and content opportunities for LinkedIn posts',
          backstory: 'You are an expert at identifying trending topics and industry insights that will engage LinkedIn audiences.',
          
          prompt: 'Research trending topics for LinkedIn content:\n\n**RESEARCH AREAS:**\n1. Industry news and trends\n2. Technology developments\n3. Business insights\n4. Professional development\n5. Company achievements\n\n**SOURCES TO CHECK:**\n- Industry publications\n- LinkedIn trending hashtags\n- Google Trends\n- Company news\n- Competitor content\n\n**OUTPUT:**\n{\n  "trendingTopics": [\n    {\n      "topic": "AI in Sales",\n      "relevanceScore": 9,\n      "trending": true,\n      "hashtags": ["#AI", "#Sales", "#Automation"],\n      "contentAngle": "How AI is transforming B2B sales processes"\n    }\n  ],\n  "contentOpportunities": ["Share case study", "Industry prediction", "How-to guide"],\n  "recommendedHashtags": ["#SaaS", "#B2B", "#Innovation"],\n  "bestPostingTime": "Tuesday 1:00 PM"\n}',

          framework: 'perplexity',
          model: 'sonar-pro',
          temperature: 0.4,
          maxTokens: 2000,
          description: 'AI agent that researches trending topics and content opportunities'
        }
      },
      {
        id: 'agent-content-creator',
        type: 'agent',
        position: { x: 700, y: 100 },
        data: {
          label: '✍️ Content Creation Agent',
          role: 'LinkedIn Content Creator',
          goal: 'Create engaging LinkedIn posts that drive engagement and establish thought leadership',
          backstory: 'You are a master LinkedIn content creator who knows how to write posts that get high engagement.',
          
          prompt: 'Create engaging LinkedIn content based on trends:\n\n**TREND DATA:**\n{{research.trendingTopics}}\n\n**CONTENT REQUIREMENTS:**\n1. Hook that grabs attention (first 2 lines)\n2. Valuable insight or story\n3. Call-to-action for engagement\n4. Relevant hashtags\n5. Professional but personable tone\n\n**POST STRUCTURE:**\n- Hook (attention-grabbing)\n- Context/Story (2-3 sentences)\n- Insight/Value (main point)\n- Call-to-action (question or request)\n- Hashtags (5-7 relevant)\n\n**OUTPUT:**\n{\n  "postContent": "🚀 Just saw a company increase their sales by 300% with AI automation...\n\nHere\'s what they did differently:\n\n✅ Automated lead scoring\n✅ Personalized outreach at scale\n✅ Real-time response tracking\n\nThe result? Their sales team now focuses on closing deals instead of chasing leads.\n\nWhat\'s one sales process you\'d automate first?\n\n#AI #Sales #Automation #B2B #SaaS #Innovation #GrowthHacking",\n  "contentType": "thought_leadership",\n  "estimatedEngagement": "high",\n  "hashtags": ["#AI", "#Sales", "#Automation"],\n  "callToAction": "What\'s one sales process you\'d automate first?"\n}',

          framework: 'openai',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 1500,
          description: 'AI agent that creates engaging LinkedIn content'
        }
      },
      {
        id: 'task-create-visual',
        type: 'task',
        position: { x: 1000, y: 200 },
        data: {
          label: '🎨 Create Visual Content',
          description: 'Generates carousel slides, infographics, or images for LinkedIn posts',
          expectedOutput: 'Professional visual content ready for LinkedIn posting',
          
          prompt: 'Create visual content for LinkedIn post:\n\n**POST CONTENT:**\n{{content.postContent}}\n\n**VISUAL REQUIREMENTS:**\n- Professional branded design\n- LinkedIn carousel format (1080x1080)\n- Clear, readable text\n- Brand colors and fonts\n- Engaging visual elements\n\n**VISUAL TYPES:**\n1. Infographic (for data/statistics)\n2. Quote carousel (for insights)\n3. Process diagram (for how-to content)\n4. Before/after comparison\n\nGenerate appropriate visual based on content type.',

          agent: 'agent-content-creator',
          tools: ['canva_api', 'design_generator']
        }
      },
      {
        id: 'logic-content-scheduler',
        type: 'logic',
        position: { x: 700, y: 300 },
        data: {
          label: '📅 Scheduling Logic',
          description: 'Determines optimal posting time based on audience analytics',
          condition: 'currentTime === bestPostingTime && contentQuality >= 8',
          nodeId: 'logic-content-scheduler',
          nodeType: 'logic'
        }
      },
      {
        id: 'output-linkedin-post',
        type: 'output',
        position: { x: 1000, y: 300 },
        data: {
          label: '📤 LinkedIn Publisher',
          outputType: 'webhook',
          webhookUrl: 'https://api.linkedin.com/v2/ugcPosts',
          webhookMethod: 'POST',
          webhookHeaders: {
            'Authorization': 'Bearer {LINKEDIN_ACCESS_TOKEN}',
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          },
          webhookPayload: {
            'author': 'urn:li:person:{PERSON_ID}',
            'lifecycleState': 'PUBLISHED',
            'specificContent': {
              'com.linkedin.ugc.ShareContent': {
                'shareCommentary': {
                  'text': '{content.postContent}'
                },
                'shareMediaCategory': 'NONE'
              }
            },
            'visibility': {
              'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
            }
          },
          description: 'Posts content to LinkedIn with optimal timing'
        }
      },
      {
        id: 'agent-engagement-monitor',
        type: 'agent',
        position: { x: 1300, y: 100 },
        data: {
          label: '📊 Engagement Monitor',
          role: 'LinkedIn Engagement Specialist',
          goal: 'Monitor post performance and engage with comments and reactions authentically',
          backstory: 'You manage LinkedIn engagement by responding to comments and analyzing post performance.',
          
          prompt: 'Monitor and respond to LinkedIn post engagement:\n\n**POST DATA:**\n{{post_result}}\n\n**ENGAGEMENT TASKS:**\n1. Monitor likes, comments, shares\n2. Respond to comments authentically\n3. Thank commenters for engagement\n4. Continue conversations\n5. Track performance metrics\n\n**RESPONSE GUIDELINES:**\n- Professional but friendly tone\n- Add value to the conversation\n- Ask follow-up questions\n- Thank people for sharing\n- No sales pitches in responses\n\n**ANALYTICS:**\n{\n  "likes": count,\n  "comments": count,\n  "shares": count,\n  "engagementRate": percentage,\n  "topComments": ["comment text"],\n  "responsesSent": count,\n  "newConnections": count\n}',

          framework: 'anthropic',
          model: 'claude-3-sonnet',
          temperature: 0.6,
          maxTokens: 1000,
          description: 'Monitors and manages LinkedIn post engagement'
        }
      },
      {
        id: 'task-engagement-analysis',
        type: 'task',
        position: { x: 1600, y: 100 },
        data: {
          label: '📈 Engagement Analysis Task',
          description: 'Analyze post performance and generate engagement insights',
          expectedOutput: 'Comprehensive engagement report with metrics, insights, and next actions',
          
          prompt: 'Analyze post engagement and provide insights:\n\n**ENGAGEMENT DATA:**\n{{monitor.engagementData}}\n\n**ANALYSIS REQUIREMENTS:**\n1. Performance metrics comparison\n2. Engagement quality assessment\n3. Audience insights\n4. Content optimization recommendations\n5. Future posting strategy\n\n**OUTPUT FORMAT:**\n- Performance summary\n- Top performing content elements\n- Audience engagement patterns\n- Optimization recommendations\n- Next post suggestions',

          agent: 'agent-engagement-monitor',
          tools: ['analytics_tracker', 'content_optimizer']
        }
      },
      {
        id: 'output-engagement-report',
        type: 'output',
        position: { x: 1900, y: 100 },
        data: {
          label: '📊 Engagement Report',
          outputType: 'structured',
          description: 'Export detailed engagement analysis and recommendations',
          nodeId: 'output-engagement-report',
          nodeType: 'output'
        }
      }
    ],
    edges: [
      {
        id: 'e1-2',
        source: 'trigger-content-schedule',
        target: 'agent-trend-researcher',
        type: 'smoothstep',
        animated: true,
        data: { label: '⏰ Content Trigger' }
      },
      {
        id: 'e2-3',
        source: 'agent-trend-researcher',
        target: 'agent-content-creator',
        type: 'smoothstep',
        animated: true,
        data: { label: '📊 Trend Data' }
      },
      {
        id: 'e3-4',
        source: 'agent-content-creator',
        target: 'task-create-visual',
        type: 'smoothstep',
        animated: true,
        data: { label: '📝 Content Created' }
      },
      {
        id: 'e3-5',
        source: 'agent-content-creator',
        target: 'logic-content-scheduler',
        type: 'smoothstep',
        animated: true,
        data: { label: '📝 Content Ready' }
      },
      {
        id: 'e5-6',
        source: 'logic-content-scheduler',
        target: 'output-linkedin-post',
        type: 'smoothstep',
        animated: true,
        sourceHandle: 'true',
        data: { label: '✅ Ready to Post' }
      },
      {
        id: 'e6-7',
        source: 'output-linkedin-post',
        target: 'agent-engagement-monitor',
        type: 'smoothstep',
        animated: true,
        data: { label: '📤 Posted' }
      },
      {
        id: 'e7-8',
        source: 'agent-engagement-monitor',
        target: 'task-engagement-analysis',
        type: 'smoothstep',
        animated: true,
        data: { label: '📈 Engagement Analysis' }
      },
      {
        id: 'e8-9',
        source: 'task-engagement-analysis',
        target: 'output-engagement-report',
        type: 'smoothstep',
        animated: true,
        data: { label: '📊 Engagement Report' }
      }
    ],
    metadata: {
      version: '1.0',
      created: '2024-01-15',
      author: 'CrewBuilder AI',
      complexity: 'intermediate',
      useCase: 'linkedin-content-automation',
      industry: ['marketing', 'branding', 'thought-leadership', 'content'],
      estimatedCost: '$0.20-0.50 per post',
      
      useCases: [
        '📝 Thought leadership content',
        '🚀 Brand awareness campaigns',
        '📊 Industry expertise showcase',
        '🤝 Community building',
        '📈 Lead generation through content'
      ],
      
      benefits: [
        '⏰ 80% time savings on content creation',
        '📈 Consistent posting schedule',
        '🎯 Higher engagement rates (15-25%)',
        '🤖 Automated community management',
        '📊 Data-driven content optimization',
        '🔥 Increased thought leadership visibility'
      ]
    }
  },

  {
    id: 'linkedin-recruitment-automation',
    name: '👥 LinkedIn Recruitment Automation',
    description: 'End-to-end recruitment pipeline for sourcing, screening, and managing candidates on LinkedIn with automated interview scheduling',
    category: 'LinkedIn',
    difficulty: 'Advanced',
    estimatedTime: '60 minutes',
    tags: ['recruitment', 'hr', 'screening', 'automation', 'candidates', 'hiring'],
    nodes: [
      {
        id: 'trigger-job-posting',
        type: 'trigger',
        position: { x: 100, y: 200 },
        data: {
          label: '📋 Job Posting Trigger',
          triggerType: 'manual',
          description: 'Triggered when new job posting is created or candidate search is initiated',
          config: {
            jobRequirements: {
              title: 'Senior Software Engineer',
              skills: ['Python', 'React', 'AWS', 'Docker'],
              experience: '5+ years',
              location: 'Remote/San Francisco',
              salary: '$120k-$180k'
            },
            searchCriteria: {
              keywords: 'software engineer python react',
              location: 'San Francisco Bay Area',
              currentCompanies: 'exclude competitors'
            }
          }
        }
      },
      {
        id: 'agent-candidate-sourcer',
        type: 'agent',
        position: { x: 400, y: 100 },
        data: {
          label: '🔍 Candidate Sourcing Agent',
          role: 'Technical Recruiter & Sourcing Specialist',
          goal: 'Find and identify top software engineering candidates on LinkedIn who match job requirements',
          backstory: 'You are an expert technical recruiter who knows how to find the best software engineers on LinkedIn.',
          
          prompt: 'Source candidates for this role:\n\n**JOB REQUIREMENTS:**\n{{trigger.jobRequirements}}\n\n**SOURCING STRATEGY:**\n1. Search LinkedIn Recruiter with keywords\n2. Identify candidates at target companies\n3. Check for relevant skills and experience\n4. Assess career progression\n5. Look for active vs passive candidates\n\n**CANDIDATE EVALUATION:**\n- Technical skills match\n- Experience level\n- Career trajectory\n- Company culture fit indicators\n- Willingness to relocate/remote work\n\n**OUTPUT:**\n{\n  "candidatesFound": [\n    {\n      "name": "John Smith",\n      "currentRole": "Senior Software Engineer",\n      "company": "TechCorp",\n      "skills": ["Python", "React", "AWS"],\n      "experience": "6 years",\n      "location": "San Francisco",\n      "linkedinUrl": "https://linkedin.com/in/johnsmith",\n      "sourcingScore": 8.5,\n      "reasoning": "Strong technical background, relevant experience"\n    }\n  ],\n  "totalFound": 25,\n  "searchQuery": "senior software engineer python react",\n  "searchFilters": "applied filters"\n}',

          framework: 'crewai',
          agentType: 'researcher',
          tools: ['linkedin_recruiter', 'candidate_search', 'company_analyzer'],
          maxIterations: 3,
          temperature: 0.2,
          description: 'AI agent that sources and identifies qualified candidates'
        }
      },
      {
        id: 'agent-profile-screener',
        type: 'agent',
        position: { x: 700, y: 100 },
        data: {
          label: '📋 Profile Screening Agent',
          role: 'Technical Profile Analyst',
          goal: 'Analyze candidate LinkedIn profiles for technical skills, experience fit, and cultural alignment',
          backstory: 'You are an expert at analyzing technical profiles to assess job fit and candidate quality.',
          
          prompt: 'Screen this candidate profile:\n\n**CANDIDATE:**\n{{sourcing.candidate}}\n\n**JOB REQUIREMENTS:**\n{{trigger.jobRequirements}}\n\n**SCREENING CRITERIA:**\n1. Technical Skills Assessment (1-10)\n2. Experience Level Match (1-10)\n3. Career Progression Quality (1-10)\n4. Company Culture Fit (1-10)\n5. Geographic Fit (1-10)\n6. Salary Range Alignment (1-10)\n\n**ANALYSIS POINTS:**\n- Programming languages and frameworks\n- System design and architecture experience\n- Leadership and mentoring experience\n- Open source contributions\n- Education and certifications\n- Recent projects and achievements\n\n**OUTPUT:**\n{\n  "overallScore": 8.2,\n  "technicalSkills": 9,\n  "experienceMatch": 8,\n  "careerProgression": 7,\n  "cultureFit": 8,\n  "geographicFit": 10,\n  "salaryAlignment": 8,\n  "strengths": ["Strong React experience", "AWS certified", "Team lead experience"],\n  "concerns": ["Limited Python experience", "No Docker experience"],\n  "recommendation": "STRONG_CANDIDATE|GOOD_CANDIDATE|WEAK_CANDIDATE|REJECT",\n  "interviewTopics": ["System design", "React architecture", "Team leadership"]\n}',

          framework: 'openai',
          model: 'gpt-4',
          temperature: 0.3,
          maxTokens: 1500,
          description: 'AI agent that screens and evaluates candidate profiles'
        }
      },
      {
        id: 'logic-candidate-filter',
        type: 'logic',
        position: { x: 1000, y: 200 },
        data: {
          label: '⚖️ Candidate Filtering Logic',
          description: 'Routes qualified candidates (score 7.5+) to outreach process',
          condition: 'overallScore >= 7.5 && recommendation !== "REJECT"',
          nodeId: 'logic-candidate-filter',
          nodeType: 'logic'
        }
      },
      {
        id: 'agent-recruiter-outreach',
        type: 'agent',
        position: { x: 700, y: 300 },
        data: {
          label: '📩 Recruiter Outreach Agent',
          role: 'Technical Recruitment Specialist',
          goal: 'Create personalized InMail messages that attract top candidates and generate responses',
          backstory: 'You are a master at crafting recruitment messages that candidates actually want to respond to.',
          
          prompt: 'Create personalized recruitment outreach:\n\n**CANDIDATE:**\n{{screening.candidate}}\n\n**SCREENING RESULTS:**\n{{screening}}\n\n**JOB OPPORTUNITY:**\n{{trigger.jobRequirements}}\n\n**MESSAGE STRATEGY:**\n1. Personalized opening (reference specific achievement)\n2. Company value proposition\n3. Role highlight (exciting challenges)\n4. Clear next steps\n5. Professional but enthusiastic tone\n\n**OUTREACH FORMATS:**\n\n**INMAIL MESSAGE** (300 words max):\n- Subject line that grabs attention\n- Personalized opening\n- Brief company/role overview\n- Specific value proposition\n- Clear call-to-action\n\n**FOLLOW-UP MESSAGE** (if no response):\n- Reference previous message\n- Add more value/detail\n- Alternative engagement approach\n\n**OUTPUT:**\n{\n  "subject": "Exciting Senior Engineer Role - [Specific Hook]",\n  "inmailMessage": "Hi [Name],\\n\\nI came across your profile and was impressed by [specific achievement]. Your experience with [technology] at [company] caught my attention.\\n\\nWe\'re building [exciting project] at [company] and looking for a Senior Software Engineer to lead [specific responsibility]. The role offers [compelling benefits/challenges].\\n\\nWould you be open to a brief conversation about this opportunity?\\n\\nBest regards,\\n[Recruiter Name]",\n  "followUpMessage": "Hi [Name],\\n\\nFollowing up on my previous message about the Senior Engineer role. I wanted to share more about [additional compelling detail].\\n\\nEven if you\'re not actively looking, I\'d love to connect and keep you in mind for future opportunities.\\n\\nBest,\\n[Recruiter Name]",\n  "personalizationElements": ["specific achievement mentioned", "company connection"],\n  "expectedResponseRate": "25-35%"\n}',

          framework: 'anthropic',
          model: 'claude-3-sonnet',
          temperature: 0.7,
          maxTokens: 1200,
          description: 'AI agent that creates personalized recruitment messages'
        }
      },
      {
        id: 'task-send-inmail',
        type: 'task',
        position: { x: 1000, y: 300 },
        data: {
          label: '📨 Send InMail',
          description: 'Sends personalized InMail messages to qualified candidates',
          expectedOutput: 'InMail sent with delivery confirmation and tracking ID',
          
          prompt: 'Send recruitment InMail:\n\n**CANDIDATE:** {{screening.candidate}}\n**MESSAGE:** {{outreach.inmailMessage}}\n**SUBJECT:** {{outreach.subject}}\n\n**SENDING PARAMETERS:**\n- InMail credits available: Check balance\n- Optimal sending time: Tuesday-Thursday 10AM-2PM\n- Personalization level: High\n- Follow-up schedule: 5 days if no response\n\nTrack delivery status and response rates.',

          agent: 'agent-recruiter-outreach',
          tools: ['linkedin_recruiter_api', 'inmail_sender']
        }
      },
      {
        id: 'agent-response-handler',
        type: 'agent',
        position: { x: 1300, y: 200 },
        data: {
          label: '💬 Response Handler Agent',
          role: 'Recruitment Coordinator',
          goal: 'Handle candidate responses, schedule interviews, and manage the recruitment pipeline',
          backstory: 'You coordinate the recruitment process and ensure smooth candidate experience.',
          
          prompt: 'Handle candidate response and next steps:\n\n**CANDIDATE RESPONSE:**\n{{inmail_response}}\n\n**RESPONSE ANALYSIS:**\n1. Interest level (High/Medium/Low)\n2. Availability for interview\n3. Salary expectations\n4. Timeline for job change\n5. Specific questions or concerns\n\n**NEXT STEPS:**\n- If interested → Schedule phone screen\n- If questions → Provide detailed information\n- If not interested → Add to nurture pipeline\n- If timing issues → Schedule follow-up\n\n**SCHEDULING:**\n{\n  "responseType": "INTERESTED|QUESTIONS|NOT_NOW|NOT_INTERESTED",\n  "interestLevel": 8,\n  "nextAction": "SCHEDULE_INTERVIEW|SEND_INFO|NURTURE|CLOSE",\n  "schedulingDetails": {\n    "interviewType": "phone_screen",\n    "duration": 30,\n    "availableTimes": ["Tuesday 2PM", "Wednesday 10AM"],\n    "interviewers": ["Hiring Manager", "Tech Lead"]\n  },\n  "candidateQuestions": ["Remote work policy", "Tech stack details"],\n  "priority": "HIGH|MEDIUM|LOW"\n}',

          framework: 'crewai',
          agentType: 'coordinator',
          tools: ['calendar_integration', 'ats_system', 'email_sender'],
          maxIterations: 2,
          temperature: 0.4,
          description: 'Handles responses and coordinates interview scheduling'
        }
      },
      {
        id: 'output-ats-update',
        type: 'output',
        position: { x: 1300, y: 400 },
        data: {
          label: '🗃️ ATS Integration',
          outputType: 'webhook',
          webhookUrl: 'https://api.greenhouse.io/v1/candidates',
          webhookMethod: 'POST',
          webhookHeaders: {
            'Authorization': 'Basic {ATS_API_KEY}',
            'Content-Type': 'application/json'
          },
          webhookPayload: {
            'first_name': '{candidate.firstName}',
            'last_name': '{candidate.lastName}',
            'email_addresses': ['{candidate.email}'],
            'phone_numbers': ['{candidate.phone}'],
            'applications': [{
              'job_id': '{job.id}',
              'source_id': 'linkedin',
              'candidate_stage': 'phone_screen',
              'notes': '{screening.notes}'
            }],
            'custom_fields': {
              'linkedin_url': '{candidate.linkedinUrl}',
              'sourcing_score': '{screening.overallScore}',
              'technical_skills': '{screening.technicalSkills}',
              'outreach_response': '{response.responseType}'
            }
          },
          description: 'Updates ATS with candidate information and interview status'
        }
      }
    ],
    edges: [
      {
        id: 'e1-2',
        source: 'trigger-job-posting',
        target: 'agent-candidate-sourcer',
        type: 'smoothstep',
        animated: true,
        data: { label: '📋 Job Requirements' }
      },
      {
        id: 'e2-3',
        source: 'agent-candidate-sourcer',
        target: 'agent-profile-screener',
        type: 'smoothstep',
        animated: true,
        data: { label: '👥 Candidates Found' }
      },
      {
        id: 'e3-4',
        source: 'agent-profile-screener',
        target: 'logic-candidate-filter',
        type: 'smoothstep',
        animated: true,
        data: { label: '📊 Screening Results' }
      },
      {
        id: 'e4-5',
        source: 'logic-candidate-filter',
        target: 'agent-recruiter-outreach',
        type: 'smoothstep',
        animated: true,
        sourceHandle: 'true',
        data: { label: '✅ Qualified Candidate' }
      },
      {
        id: 'e5-6',
        source: 'agent-recruiter-outreach',
        target: 'task-send-inmail',
        type: 'smoothstep',
        animated: true,
        data: { label: '📩 Personalized Message' }
      },
      {
        id: 'e6-7',
        source: 'task-send-inmail',
        target: 'agent-response-handler',
        type: 'smoothstep',
        animated: true,
        data: { label: '📨 InMail Sent' }
      },
      {
        id: 'e7-8',
        source: 'agent-response-handler',
        target: 'output-ats-update',
        type: 'smoothstep',
        animated: true,
        data: { label: '📊 Pipeline Update' }
      }
    ],
    metadata: {
      version: '1.0',
      created: '2024-01-15',
      author: 'CrewBuilder AI',
      complexity: 'advanced',
      useCase: 'linkedin-recruitment',
      industry: ['hr', 'recruitment', 'talent-acquisition', 'hiring'],
      estimatedCost: '$2-5 per candidate processed',
      
      useCases: [
        '👥 Technical recruitment',
        '🚀 Startup hiring',
        '📊 Executive search',
        '🎯 Bulk candidate sourcing',
        '⚡ Fast-track hiring'
      ],
      
      benefits: [
        '⚡ 5x faster candidate sourcing',
        '🎯 Higher response rates to outreach (25-35%)',
        '📊 Data-driven candidate ranking',
        '🤖 24/7 talent pipeline building',
        '📈 Improved hiring efficiency',
        '💰 50% reduction in recruiting costs'
      ]
    }
  }
].map(template => ({
  ...template,
  edges: convertToAnimatedEdges(template.edges)
}));

export default linkedinTemplates; 