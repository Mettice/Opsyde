// Import modularized templates
import { autoEmailReplyTemplate } from './flowTemplates/autoEmailReplyTemplate';
import { flowTemplates as crmQualifierTemplates } from './flowTemplates/crm_qualifier_bot';
import { flowTemplates as cvTemplates } from './flowTemplates/cvTemplates';

// Define base templates
const baseTemplates = [
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
    }
];

// Combine all templates
export const flowTemplates = [
  ...baseTemplates,
  autoEmailReplyTemplate,
  ...crmQualifierTemplates,
  ...cvTemplates
];
      
      
      
      
      
      
      
      
      
    
      