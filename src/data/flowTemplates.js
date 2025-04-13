export const flowTemplates = [
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
    }
  ];
      