import { agentTemplates } from '../data/agentTemplates';
import { taskTemplates } from '../data/taskTemplates';
import { flowTemplates } from '../data/flowTemplates';

export const recommendTemplates = (nodes, edges) => {
  const recommendations = [];
  
  // Count node types
  const nodeTypes = nodes.reduce((acc, node) => {
    acc[node.type] = (acc[node.type] || 0) + 1;
    return acc;
  }, {});
  
  // Check if workflow is empty or has very few nodes
  if (nodes.length < 2) {
    // Recommend starter flow templates
    recommendations.push(...flowTemplates.slice(0, 2).map(template => ({
      ...template,
      type: 'flow'
    })));
    
    // Also recommend an agent template
    recommendations.push({
      ...agentTemplates[0],
      type: 'agent'
    });
    
    return recommendations;
  }
  
  // Always include at least one flow template if available
  if (flowTemplates.length > 0) {
    recommendations.push({
      ...flowTemplates[0],
      type: 'flow'
    });
  }
  
  // Check if workflow has agents but no tasks
  if (nodeTypes.agent && (!nodeTypes.task || nodeTypes.task < nodeTypes.agent)) {
    // Recommend task templates
    recommendations.push(...taskTemplates.slice(0, 1).map(template => ({
      ...template,
      type: 'task'
    })));
  }
  
  // Check if workflow has tasks but no tools
  if (nodeTypes.task && (!nodeTypes.tool || nodeTypes.tool < 2)) {
    // Recommend tool templates
    const toolTemplates = [
      {
        name: 'Web Search',
        description: 'Web search capability to find information',
        toolType: 'search',
        parameters: 'query\nnum_results',
        icon: '🔍',
        category: 'Information',
        type: 'tool'
      }
    ];
    recommendations.push(...toolTemplates);
  }
  
  // If we have agents but no more agents, recommend another agent
  if (nodeTypes.agent && nodeTypes.agent < 2) {
    recommendations.push({
      ...agentTemplates[1],
      type: 'agent'
    });
  }
  
  return recommendations.slice(0, 3); // Return top 3 recommendations
}; 