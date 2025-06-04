// flowTemplates/crm_qualifier_bot.js

// Utility function to convert smoothstep edges to animated edges with data
const convertToAnimatedEdges = (edges) => {
  return edges.map(edge => {
    if (edge.type === 'smoothstep' || !edge.type) {
      const dataType = getDataTypeFromConnection(edge.source, edge.target);
      const label = getLabelFromConnection(edge.source, edge.target, dataType);
      
      return {
        ...edge,
        type: 'animated',
        data: edge.data || {
          label: label,
          dataType: dataType
        }
      };
    }
    return edge;
  });
};

// Helper function to determine data type based on connection
const getDataTypeFromConnection = (sourceId, targetId) => {
  if (sourceId.includes('trigger')) return 'trigger_data';
  if (sourceId.includes('agent') && targetId.includes('task')) return 'agent_output';
  if (sourceId.includes('task') && targetId.includes('tool')) return 'task_result';
  if (sourceId.includes('tool') && targetId.includes('task')) return 'tool_data';
  if (targetId.includes('output')) return 'final_output';
  return 'workflow_data';
};

// Helper function to generate appropriate labels
const getLabelFromConnection = (sourceId, targetId, dataType) => {
  const labels = {
    'trigger_data': '🔄 Trigger Data',
    'agent_output': '🤖 Agent Response',
    'task_result': '✅ Task Complete',
    'tool_data': '🔧 Tool Output', 
    'final_output': '📤 Final Result',
    'workflow_data': '📊 Data Flow'
  };
  return labels[dataType] || '📊 Data Flow';
};

export const flowTemplates = [
    {
      name: "CRM Qualifier Bot",
      description: "Automatically qualify leads, score intent, and sync to CRM",
      frameworksUsed: ["openrouter", "sheets", "discord"],
      tags: ["CRM", "Sales", "Automation"],
      thumbnail: "/img/crm-bot.png",
      nodes: [
        {
          id: "agent-qualifier",
          type: "agent",
          position: { x: 100, y: 100 },
          data: {
            label: "Qualification Agent",
            role: "CRM Assistant",
            goal: "Score leads and trigger CRM workflows",
            backstory: "You qualify leads based on fit and readiness",
            llmModel: "gpt-4",
            framework: "openrouter",
            allowDelegation: false,
            verbose: true,
            nodeType: "agent"
          }
        },
        {
          id: "task-check-readiness",
          type: "task",
          position: { x: 300, y: 150 },
          data: {
            label: "Check Readiness",
            description: "Analyze lead timing, budget, and urgency",
            expectedOutput: "Readiness level + comments",
            nodeType: "task"
          }
        },
        {
          id: "tool-crm-logger",
          type: "tool",
          position: { x: 500, y: 200 },
          data: {
            label: "CRM Sync",
            description: "Send qualified leads to CRM or Sheets",
            toolType: "api",
            parameters: "email\nscore\nintent",
            icon: "\ud83d\udd01",
            category: "CRM",
            framework: "custom",
            nodeType: "tool"
          }
        },
        {
          id: "tool-notify",
          type: "tool",
          position: { x: 700, y: 300 },
          data: {
            label: "Notify Team",
            description: "Send Slack/Discord alert to Sales",
            toolType: "api",
            parameters: "message\nchannel",
            icon: "\ud83d\udce3",
            category: "Communication",
            framework: "discord",
            nodeType: "tool"
          }
        }
      ],
      edges: [
        { id: "e1", source: "agent-qualifier", target: "task-check-readiness", type: "smoothstep" },
        { id: "e2", source: "task-check-readiness", target: "tool-crm-logger", type: "smoothstep" },
        { id: "e3", source: "tool-crm-logger", target: "tool-notify", type: "smoothstep" }
      ],
      version: "1.0",
      author: "NodAi",
      created: "2025-04-15"
    }
  ].map(template => ({
    ...template,
    edges: convertToAnimatedEdges(template.edges)
  }));
  