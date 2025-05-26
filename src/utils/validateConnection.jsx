export const validateConnection = (params, nodes, edges, toast) => {
  const { source, target, sourceHandle, targetHandle } = params;
  
  // Log connection parameters for debugging
  console.log('Connection params:', { source, target, sourceHandle, targetHandle });
  
  const sourceNode = nodes.find(n => n.id === source);
  const targetNode = nodes.find(n => n.id === target);
  
  // Basic validation
  if (!sourceNode || !targetNode) {
    console.warn("Invalid connection: Source or target node not found");
    return false;
  }
  
  if (source === target) {
    console.warn("Self connections are not allowed");
    return false;
  }
  
  // Check for existing connections
  const hasExistingConnection = edges.some(
    edge => edge.source === source && edge.target === target
  );
  if (hasExistingConnection) {
    console.warn("Connection already exists between these nodes");
    return false;
  }
  
  const from = sourceNode.type;
  const to = targetNode.type;
  
  // Log node types
  console.log('Connecting nodes:', { from, to, sourceHandle, targetHandle });
  
  // Define comprehensive valid connection patterns for multi-agent workflows
  const validConnections = [
    // Basic flow patterns
    ['trigger', 'agent'],
    ['trigger', 'task'],
    ['trigger', 'tool'],
    ['trigger', 'chatbot'],
    ['trigger', 'logic'],
    ['trigger', 'delay'],
    ['trigger', 'input'],
    
    // Input connections
    ['input', 'agent'],
    ['input', 'task'],
    ['input', 'tool'],
    ['input', 'chatbot'],
    ['input', 'logic'],
    
    // Agent connections (including agent-to-agent for multi-agent workflows)
    ['agent', 'agent'],     // 🔥 CRITICAL: Agent-to-agent communication
    ['agent', 'task'],
    ['agent', 'tool'],
    ['agent', 'chatbot'],
    ['agent', 'output'],
    ['agent', 'delay'],
    ['agent', 'logic'],
    
    // Task connections
    ['task', 'task'],
    ['task', 'tool'],
    ['task', 'agent'],
    ['task', 'chatbot'],
    ['task', 'output'],
    ['task', 'delay'],
    ['task', 'logic'],
    
    // Tool connections
    ['tool', 'agent'],
    ['tool', 'task'],
    ['tool', 'tool'],       // Tool chaining
    ['tool', 'chatbot'],
    ['tool', 'output'],
    ['tool', 'delay'],
    ['tool', 'logic'],
    
    // Logic connections
    ['logic', 'agent'],
    ['logic', 'task'],
    ['logic', 'tool'],
    ['logic', 'chatbot'],
    ['logic', 'output'],
    ['logic', 'delay'],
    ['logic', 'logic'],     // Logic chaining
    
    // Delay connections
    ['delay', 'agent'],
    ['delay', 'task'],
    ['delay', 'tool'],
    ['delay', 'chatbot'],
    ['delay', 'output'],
    ['delay', 'logic'],
    
    // Chatbot connections
    ['chatbot', 'agent'],
    ['chatbot', 'task'],
    ['chatbot', 'tool'],
    ['chatbot', 'chatbot'], // Chatbot chaining
    ['chatbot', 'output'],
    ['chatbot', 'delay'],
    ['chatbot', 'logic']
  ];
  
  // Check if this connection pattern is valid
  const isValidPattern = validConnections.some(
    ([validSource, validTarget]) => validSource === from && validTarget === to
  );
  
  if (!isValidPattern) {
    console.warn(`Invalid connection pattern: ${from} -> ${to}`);
    if (toast) {
      toast.error(`Cannot connect ${from} to ${to}. This connection type is not supported.`);
    }
    return false;
  }
  
  // Special handling for agent-to-agent connections
  if (from === 'agent' && to === 'agent') {
    console.log('🤖 Agent-to-agent connection established for multi-agent workflow');
    
    // Update target agent with source agent information for collaboration
    const targetNodeIndex = nodes.findIndex(n => n.id === target);
    if (targetNodeIndex !== -1) {
      nodes[targetNodeIndex] = {
        ...nodes[targetNodeIndex],
        data: {
          ...nodes[targetNodeIndex].data,
          collaboratingAgents: [
            ...(nodes[targetNodeIndex].data?.collaboratingAgents || []),
            {
              id: sourceNode.id,
              name: sourceNode.data?.label || 'Unknown Agent',
              role: sourceNode.data?.role || 'Assistant',
              framework: sourceNode.data?.framework || 'openrouter'
            }
          ]
        }
      };
    }
  }
  
  // Special handling for agent-task connections
  if (from === 'agent' && to === 'task') {
    // Set the target handle to 'agent' for proper task assignment
    params.targetHandle = 'agent';
    
    // Update the task node's data with agent information
    const taskNodeIndex = nodes.findIndex(n => n.id === target);
    if (taskNodeIndex !== -1) {
      nodes[taskNodeIndex] = {
        ...nodes[taskNodeIndex],
        data: {
          ...nodes[taskNodeIndex].data,
          agentId: sourceNode.id,
          agentName: sourceNode.data?.label || 'Unknown Agent',
          agentRole: sourceNode.data?.role || 'Assistant',
          agentFramework: sourceNode.data?.framework || 'openrouter'
        }
      };
    }
  }
  
  // Special handling for task-to-agent connections (task delegation)
  if (from === 'task' && to === 'agent') {
    console.log('📋 Task-to-agent delegation connection established');
    
    // Update agent with task delegation information
    const targetNodeIndex = nodes.findIndex(n => n.id === target);
    if (targetNodeIndex !== -1) {
      nodes[targetNodeIndex] = {
        ...nodes[targetNodeIndex],
        data: {
          ...nodes[targetNodeIndex].data,
          delegatedTasks: [
            ...(nodes[targetNodeIndex].data?.delegatedTasks || []),
            {
              id: sourceNode.id,
              name: sourceNode.data?.label || 'Unknown Task',
              description: sourceNode.data?.description || ''
            }
          ]
        }
      };
    }
  }
  
  console.log('✅ Connection validated successfully:', { from, to });
  return true;
};
  