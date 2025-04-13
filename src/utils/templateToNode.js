// utils/templateToNode.js
import { v4 as uuidv4 } from 'uuid';

export const templateToNode = (template) => {
  const id = uuidv4();

  // Normalize the template type if needed
  let normalizedType = template.type || '';
  if (normalizedType === 'agentNode') normalizedType = 'agent';
  if (normalizedType === 'taskNode') normalizedType = 'task';
  if (normalizedType === 'toolNode') normalizedType = 'tool';
  
  // Determine the type based on template properties if not explicitly set
  if (!normalizedType) {
    if (template.role || template.backstory) {
      normalizedType = 'agent';
    } else if (template.expectedOutput) {
      normalizedType = 'task';
    } else if (template.toolType || template.parameters) {
      normalizedType = 'tool';
    }
  }
  
  const baseNode = {
    id,
    position: { x: 250, y: 150 },
    data: {},
    type: normalizedType,
  };

  if (normalizedType === 'tool') {
    // It's a tool template
    return {
      ...baseNode,
      data: {
        label: template.label || template.name,
        parameters: template.parameters ? template.parameters.split('\n') : [],
        toolType: template.toolType || 'custom',
        icon: template.icon || '🔧',
        description: template.description || '',
        apiEndpoint: template.apiEndpoint || '',
        category: template.category || 'Custom',
        nodeId: id,
        nodeType: 'tool'
      }
    };
  }

  if (normalizedType === 'agent') {
    // It's an agent template
    return {
      ...baseNode,
      data: {
        label: template.name,
        role: template.role,
        goal: template.goal,
        backstory: template.backstory,
        icon: template.icon,
        category: template.category,
        nodeId: id,
        nodeType: 'agent'
      }
    };
  }

  if (normalizedType === 'task') {
    // It's a task template
    return {
      ...baseNode,
      data: {
        label: template.name,
        description: template.description,
        expectedOutput: template.expectedOutput,
        async: false,
        nodeId: id,
        nodeType: 'task'
      }
    };
  }

  // Default case
  return null;
};
