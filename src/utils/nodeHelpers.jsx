// utils/nodeHelpers.js
import { getSafeNodePosition } from './getSafeNodePosition';

// Utility to inspect node properties for debugging
export function inspectNode(node) {
  return {
    id: node.id,
    type: node.type,
    dataType: node.data?.nodeType,
    label: node.data?.label,
    rawNode: { ...node }
  };
}

// Normalize node type for connection validation
export function normalizeType(node) {
  if (!node) return 'unknown';
  
  const type = (node.type || '').toLowerCase();
  const dataType = (node.data?.nodeType || '').toLowerCase();
  
  if (type.includes('agent') || dataType.includes('agent')) return 'agent';
  if (type.includes('task') || dataType.includes('task')) return 'task';
  if (type.includes('tool') || dataType.includes('tool')) return 'tool';
  return 'unknown';
}

// Generate default nodes for initial load
export function generateDefaultNodes() {
  const agentId = `agent-${Date.now()}`;
  const toolId = `tool-${Date.now() + 1}`;

  return [
    {
      id: agentId,
      type: 'agent',
      position: { x: 150 + Math.random() * 40, y: 200 + Math.random() * 40 },
      draggable: true,
      selectable: true,
      connectable: true,
      data: {
        label: 'Agent Alpha',
        role: 'Assistant',
        goal: 'Help with research',
        backstory: 'Default preloaded agent',
        llmModel: 'gpt-4',
        allowDelegation: true,
        verbose: true,
        nodeId: agentId,
        nodeType: 'agent'
      }
    },
    {
      id: toolId,
      type: 'tool',
      position: { x: 400, y: 250 },
      draggable: true,
      selectable: true,
      connectable: true,
      data: {
        label: 'Search Tool',
        description: 'Performs web search',
        toolType: 'api',
        apiEndpoint: '',
        apiKey: '',
        parameters: 'query',
        nodeId: toolId,
        nodeType: 'tool'
      }
    }
  ];
}

// Create a new node based on the node type
export function createNode(type, position) {
  const id = `${type}-${Date.now()}`;
  
  switch (type) {
    case 'agent':
      return {
        id,
        type: 'agent',
        position,
        sourcePosition: 'bottom',
        targetPosition: 'top',
        data: {
          label: `New Agent`,
          role: 'Assistant',
          goal: '',
          backstory: '',
          llmModel: 'gpt-4',
          allowDelegation: false,
          verbose: true,
          nodeId: id,
          nodeType: 'agent'
        }
      };
      
    case 'task':
      return {
        id,
        type: 'task',
        position,
        sourcePosition: 'bottom',
        targetPosition: 'top',
        data: {
          label: `New Task`,
          description: 'Task description',
          expectedOutput: 'Expected output of the task',
          async: false,
          nodeId: id,
          nodeType: 'task'
        }
      };
      
    case 'tool':
      return {
        id,
        type: 'tool',
        position,
        sourcePosition: 'bottom',
        targetPosition: 'top',
        data: {
          label: `New Tool`,
          description: 'Tool description',
          toolType: 'api',
          apiEndpoint: '',
          parameters: '',
          nodeId: id,
          nodeType: 'tool'
        }
      };
      
    default:
      throw new Error(`Unknown node type: ${type}`);
  }
}