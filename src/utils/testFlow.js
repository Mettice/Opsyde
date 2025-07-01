import { buildNodeFromSchema } from './dynamicNodeBuilder';

// Utility to create a node with required fields
function createNode({ id, type, data, x = 100, y = 100 }) {
  return {
    id,
    type,
    position: { x, y },
    data
  };
}

// Test flow configuration for end-to-end testing
export const testFlow = {
  nodes: [
    createNode({
      id: 'trigger-1',
      type: 'trigger',
      data: {
        label: 'Manual Trigger',
        description: 'Start the workflow manually',
        triggerType: 'manual',
        config: {
          triggerMode: 'manual',
          validation: { required: true }
        }
      },
      x: 100, y: 100
    }),
    createNode({
      id: 'input-1',
      type: 'input',
      data: {
        label: 'Content Input',
        description: 'Input content for processing',
        inputType: 'multimodal',
        config: {
          acceptTypes: ['text', 'file'],
          maxSize: 10485760,
          validation: { required: true }
        }
      },
      x: 100, y: 250
    }),
    createNode({
      id: 'langchain-1',
      type: 'tool',
      data: {
        label: 'LangChain Processor',
        description: 'Process content with LangChain',
        toolType: 'llm',
        framework: 'langchain',
        config: {
          chainType: 'conversation',
          llmConfig: {
            provider: 'openai',
            model: 'gpt-4',
            temperature: 0.7,
            max_tokens: 2000
          },
          memory: { type: 'buffer', maxTokens: 2000 },
          tools: ['calculator', 'web_search']
        }
      },
      x: 100, y: 400
    }),
    createNode({
      id: 'crewai-1',
      type: 'agent',
      data: {
        label: 'CrewAI Team',
        description: 'Process with AI team',
        framework: 'crewai',
        config: {
          agents: [
            { role: 'researcher', goal: 'Research and analyze the content', backstory: 'Expert researcher with deep knowledge' },
            { role: 'writer', goal: 'Create high-quality output', backstory: 'Professional content writer' }
          ],
          tasks: [
            { description: 'Analyze and research the input', agent: 'researcher' },
            { description: 'Create final output', agent: 'writer' }
          ]
        }
      },
      x: 100, y: 550
    }),
    createNode({
      id: 'huggingface-1',
      type: 'tool',
      data: {
        label: 'HuggingFace Processor',
        description: 'Process with HuggingFace models',
        toolType: 'llm',
        framework: 'huggingface',
        config: {
          task: 'summarization',
          model: 'facebook/bart-large-cnn',
          parameters: { max_length: 130, min_length: 30, do_sample: false }
        }
      },
      x: 100, y: 700
    }),
    createNode({
      id: 'output-1',
      type: 'output',
      data: {
        label: 'Final Output',
        description: 'Display and export results',
        outputType: 'smart_api',
        config: {
          format: 'json',
          postProcessing: ['markdown_to_html', 'extract_text'],
          exportOptions: { formats: ['json', 'markdown', 'html'], compression: true }
        }
      },
      x: 100, y: 850
    })
  ],
  edges: [
    { id: 'e1-2', source: 'trigger-1', target: 'input-1', type: 'default' },
    { id: 'e2-3', source: 'input-1', target: 'langchain-1', type: 'default' },
    { id: 'e3-4', source: 'langchain-1', target: 'crewai-1', type: 'default' },
    { id: 'e4-5', source: 'crewai-1', target: 'huggingface-1', type: 'default' },
    { id: 'e5-6', source: 'huggingface-1', target: 'output-1', type: 'default' }
  ]
};

// Build the test flow dynamically using backend schemas
export async function buildDynamicTestFlow() {
  try {
    // Define node configurations with required fields
    const nodeConfigs = [
      {
        id: 'trigger-1',
        type: 'trigger',
        x: 100,
        y: 100,
        overrides: {
          label: 'Manual Trigger',
          triggerType: 'manual',
          config: {
            triggerMode: 'manual',
            validation: { required: true }
          }
        }
      },
      {
        id: 'input-1',
        type: 'input',
        x: 100,
        y: 250,
        overrides: {
          label: 'Content Input',
          inputType: 'multimodal',
          config: {
            acceptTypes: ['text', 'file'],
            maxSize: 10485760,
            validation: { required: true }
          }
        }
      },
      {
        id: 'langchain-1',
        type: 'tool',
        x: 100,
        y: 400,
        overrides: {
          label: 'LangChain Processor',
          toolType: 'llm',
          framework: 'langchain',
          config: {
            chainType: 'conversation',
            llmConfig: {
              provider: 'openai',
              model: 'gpt-4',
              temperature: 0.7,
              max_tokens: 2000
            },
            memory: { type: 'buffer', maxTokens: 2000 },
            tools: ['calculator', 'web_search']
          }
        }
      },
      {
        id: 'crewai-1',
        type: 'agent',
        x: 100,
        y: 550,
        overrides: {
          label: 'CrewAI Team',
          framework: 'crewai',
          config: {
            agents: [
              { role: 'researcher', goal: 'Research and analyze the content', backstory: 'Expert researcher with deep knowledge' },
              { role: 'writer', goal: 'Create high-quality output', backstory: 'Professional content writer' }
            ],
            tasks: [
              { description: 'Analyze and research the input', agent: 'researcher' },
              { description: 'Create final output', agent: 'writer' }
            ]
          }
        }
      },
      {
        id: 'huggingface-1',
        type: 'tool',
        x: 100,
        y: 700,
        overrides: {
          label: 'HuggingFace Processor',
          toolType: 'llm',
          framework: 'huggingface',
          config: {
            task: 'summarization',
            model: 'facebook/bart-large-cnn',
            parameters: { max_length: 130, min_length: 30, do_sample: false }
          }
        }
      },
      {
        id: 'output-1',
        type: 'output',
        x: 100,
        y: 850,
        overrides: {
          label: 'Final Output',
          outputType: 'smart_api',
          config: {
            format: 'json',
            postProcessing: ['markdown_to_html', 'extract_text'],
            exportOptions: { formats: ['json', 'markdown', 'html'], compression: true }
          }
        }
      }
    ];

    // Build nodes using schema
    const nodes = await Promise.all(
      nodeConfigs.map(config => buildNodeFromSchema(config))
    );

    // Define edges
    const edges = [
      { id: 'e1-2', source: 'trigger-1', target: 'input-1', type: 'default' },
      { id: 'e2-3', source: 'input-1', target: 'langchain-1', type: 'default' },
      { id: 'e3-4', source: 'langchain-1', target: 'crewai-1', type: 'default' },
      { id: 'e4-5', source: 'crewai-1', target: 'huggingface-1', type: 'default' },
      { id: 'e5-6', source: 'huggingface-1', target: 'output-1', type: 'default' }
    ];

    return { nodes, edges };
  } catch (error) {
    console.error('Error building dynamic test flow:', error);
    throw error;
  }
}

// Test input data
export const testInput = {
  text: "The quick brown fox jumps over the lazy dog. This is a test input for our workflow. We want to see how the system processes this through various stages.",
  metadata: {
    source: "test",
    timestamp: new Date().toISOString()
  }
};

// Test execution function
export const executeTestFlow = async (flow, input = testInput) => {
  try {
    const response = await fetch('/api/workflows/execute-enhanced', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nodes: flow.nodes,
        edges: flow.edges,
        inputs: input,
        execution_mode: 'enhanced',
        enable_smart_mapping: true,
        enable_multimodal: true
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error executing test flow:', error);
    throw error;
  }
};

// Test validation function
export const validateTestFlow = async (flow) => {
  try {
    const response = await fetch('/api/workflows/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nodes: flow.nodes,
        edges: flow.edges
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error validating test flow:', error);
    throw error;
  }
}; 