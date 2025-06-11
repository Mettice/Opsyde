// Demo Templates for Testing CrewBuilder Capabilities
// These are working demos that showcase real-world use cases

import { linkedinEcosystemDemo } from '../../demo_linkedin_ecosystem.js';

export const demoTemplates = [
  linkedinEcosystemDemo,
  
  // Quick Content Creation Demo
  {
    name: "Quick Content Creator",
    description: "⚡ Fast content generation for social media and marketing",
    category: "Content Creation",
    complexity: "Simple",
    estimatedTime: "2-3 minutes",
    
    nodes: [
      {
        id: 'input-topic',
        type: 'input',
        position: { x: 100, y: 200 },
        data: {
          label: '📝 Content Topic',
          description: 'Enter your content topic or theme',
          inputType: 'text',
          value: 'AI automation benefits for small businesses',
          nodeId: 'input-topic',
          nodeType: 'input'
        }
      },
      
      {
        id: 'agent-content-creator',
        type: 'agent',
        position: { x: 400, y: 200 },
        data: {
          label: '✍️ Content Creator',
          role: 'Social Media Content Specialist',
          goal: 'Create engaging, platform-optimized content that drives engagement and conversions',
          backstory: 'You are a creative content specialist who understands what works on different social platforms and can adapt messaging for maximum impact.',
          
          framework: 'crewai',
          llmModel: 'gpt-4',
          temperature: 0.8,
          max_tokens: 2000,
          allowDelegation: false,
          enableMemory: false,
          verbose: true,
          
          systemMessage: `Create engaging social media content based on the topic: {{input-topic}}

Create content for 3 platforms:

1. LINKEDIN POST (professional):
   - Hook + insight + call-to-action
   - 3-5 hashtags
   - Professional tone

2. TWITTER THREAD (5 tweets):
   - Hook tweet
   - 3 value tweets with tips
   - Call-to-action tweet
   - Engaging and conversational

3. INSTAGRAM CAPTION:
   - Visual storytelling approach
   - Emojis and hashtags
   - Story-driven content

Format as JSON with platform, content, hashtags, and engagement_tips.`,
          
          nodeId: 'agent-content-creator',
          nodeType: 'agent'
        }
      },
      
      {
        id: 'output-content',
        type: 'output',
        position: { x: 700, y: 200 },
        data: {
          label: '📤 Multi-Platform Content',
          description: 'Ready-to-post content for all platforms',
          outputType: 'rich_content',
          nodeId: 'output-content',
          nodeType: 'output'
        }
      }
    ],
    
    edges: [
      {
        id: 'e1',
        source: 'input-topic',
        target: 'agent-content-creator',
        type: 'smoothstep',
        animated: true
      },
      {
        id: 'e2',
        source: 'agent-content-creator',
        target: 'output-content',
        type: 'smoothstep',
        animated: true
      }
    ]
  },
  
  // Simple API Integration Demo
  {
    name: "Universal API Test",
    description: "🌐 Test the Universal API system with a real API call",
    category: "API Integration",
    complexity: "Simple", 
    estimatedTime: "2-3 minutes",
    
    nodes: [
      {
        id: 'input-query',
        type: 'input',
        position: { x: 100, y: 200 },
        data: {
          label: '🔍 API Query',
          description: 'Enter what data you want to fetch',
          inputType: 'text',
          value: 'Get sample user data',
          nodeId: 'input-query',
          nodeType: 'input'
        }
      },
      
      {
        id: 'tool-universal-api',
        type: 'tool',
        position: { x: 400, y: 200 },
        data: {
          label: '🔗 Universal API Call',
          description: 'AI-powered API integration',
          framework: 'universal_api',
          toolType: 'universal_api',
          
          config: {
            api_service_name: "JSONPlaceholder",
            ai_description: "Get sample user data from JSONPlaceholder API",
            api_endpoint_hint: "https://jsonplaceholder.typicode.com/users",
            
            // Pre-configured for demo
            api_research_result: {
              service_name: "JSONPlaceholder",
              api_type: "REST",
              base_url: "https://jsonplaceholder.typicode.com/users",
              auth_type: "none",
              primary_method: "GET",
              confidence: 0.95
            }
          },
          
          nodeId: 'tool-universal-api',
          nodeType: 'tool'
        }
      },
      
      {
        id: 'output-api-data',
        type: 'output',
        position: { x: 700, y: 200 },
        data: {
          label: '📊 API Results',
          description: 'Data fetched from external API',
          outputType: 'json',
          nodeId: 'output-api-data',
          nodeType: 'output'
        }
      }
    ],
    
    edges: [
      {
        id: 'e1',
        source: 'input-query',
        target: 'tool-universal-api',
        type: 'smoothstep',
        animated: true
      },
      {
        id: 'e2',
        source: 'tool-universal-api',
        target: 'output-api-data',
        type: 'smoothstep',
        animated: true
      }
    ]
  }
];

// Export the LinkedIn demo specifically for easy testing
export { linkedinEcosystemDemo };

// Helper function to get demo by name
export const getDemoTemplate = (name) => {
  return demoTemplates.find(template => template.name === name);
};

// Get all demo names for selection
export const getDemoNames = () => {
  return demoTemplates.map(template => template.name);
}; 