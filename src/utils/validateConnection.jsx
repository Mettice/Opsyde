export const validateConnection = (params, nodes, edges, toast) => {
  const { source, target, sourceHandle } = params;
  
  const sourceNode = nodes.find(n => n.id === source);
  const targetNode = nodes.find(n => n.id === target);
  
  // Basic validation
  if (!sourceNode || !targetNode) {
    toast?.error("Invalid connection: Source or target node not found");
    return false;
  }
  if (source === target) {
    toast?.error("Self connections are not allowed");
    return false;
  }
  
  const from = sourceNode.type;
  const to = targetNode.type;
  
  // Check for existing connections if needed
  const hasExistingConnection = edges.some(
    edge => edge.source === source && edge.target === target
  );
  if (hasExistingConnection) {
    toast?.error("Connection already exists between these nodes");
    return false;
  }
  
  // Validate maximum connections
  const getConnectionCount = (nodeId, type) => {
    return edges.filter(edge => 
      type === 'in' ? edge.target === nodeId : edge.source === nodeId
    ).length;
  };
  
  // === Special Logic for Triggers ===
  if (from === 'trigger') {
    // Only one outgoing connection per trigger
    if (getConnectionCount(source, 'out') > 0) {
      toast?.error("Trigger nodes can only have one outgoing connection");
      return false;
    }
    // Trigger can connect to any node except another trigger or output
    if (to === 'trigger' || to === 'output') {
      toast?.error("Trigger cannot connect to another trigger or output node");
      return false;
    }
    return true;
  }
  
  if (to === 'trigger') {
    toast?.error("Trigger nodes cannot receive connections");
    return false;
  }
  
  // === Input Node ===
  if (from === 'input') {
    if (to === 'trigger' || to === 'input') {
      toast?.error("Input nodes cannot connect to triggers or other inputs");
      return false;
    }
    // Input nodes can have multiple outgoing connections
    return true;
  }
  
  if (to === 'input') {
    toast?.error("Input nodes cannot receive connections");
    return false;
  }
  
  // === Output Node ===
  if (to === 'output') {
    // Check if output already has an incoming connection
    if (getConnectionCount(target, 'in') > 0) {
      toast?.error("Output nodes can only have one incoming connection");
      return false;
    }
    return from !== 'trigger';
  }
  
  if (from === 'output') {
    toast?.error("Output nodes cannot have outgoing connections");
    return false;
  }
  
  // === Logic Node ===
  if (from === 'logic') {
    // Logic nodes can have two outgoing connections (true/false paths)
    if (getConnectionCount(source, 'out') >= 2) {
      toast?.error("Logic nodes can only have two outgoing connections (true/false)");
      return false;
    }
    if (to === 'trigger') {
      toast?.error("Logic nodes cannot connect to triggers");
      return false;
    }
    return true;
  }
  
  if (to === 'logic') {
    if (from === 'logic') {
      toast?.error("Logic nodes cannot connect to other logic nodes");
      return false;
    }
    return true;
  }
  
  // === Tool Node ===
  if (from === 'tool') {
    // Tool can connect to agent, chatbot, task or output
    const validTargets = ['agent', 'chatbot', 'chat', 'task', 'output'];
    if (!validTargets.includes(to)) {
      toast?.error(`Tools can only connect to: ${validTargets.join(', ')}`);
      return false;
    }
    
    // Check if the tool has valid type and configuration
    const sourceNodeData = sourceNode.data || {};
    if (!sourceNodeData.toolType) {
      toast?.error("Tool node is missing required tool type");
      return false;
    }

    // Set edge label based on tool output type
    params.label = sourceNodeData.toolType;
    
    return true;
  }
  
  if (to === 'tool') {
    // Tools can receive input from input nodes or other tools
    const validSources = ['input', 'tool'];
    if (!validSources.includes(from)) {
      toast?.error(`Tools can only receive connections from: ${validSources.join(', ')}`);
      return false;
    }

    // If source is an input node, set edge label to match the input type
    if (from === 'input') {
      const sourceNodeData = sourceNode.data || {};
      params.label = sourceNodeData.inputType === 'file' ? 'file_upload' : 'text_input';
    }

    return true;
  }
  
  // === Agent Node ===
  if (from === 'agent') {
    // Agent can connect to task, chatbot, delay, or output
    const validTargets = ['task', 'chatbot', 'chat', 'delay', 'output'];
    if (!validTargets.includes(to)) {
      toast?.error(`Agents can only connect to: ${validTargets.join(', ')}`);
      return false;
    }
    return true;
  }
  
  // === Task Node ===
  if (from === 'task') {
    // Task can connect to task, chatbot, delay, or output
    const validTargets = ['task', 'chatbot', 'chat', 'delay', 'output'];
    if (!validTargets.includes(to)) {
      toast?.error(`Tasks can only connect to: ${validTargets.join(', ')}`);
      return false;
    }
    return true;
  }
  
  // === Chat/Chatbot Node ===
  if (from === 'chatbot' || from === 'chat') {
    if (to === 'trigger') {
      toast?.error("Chat nodes cannot connect to triggers");
      return false;
    }
    // Check maximum outgoing connections for chat nodes
    if (getConnectionCount(source, 'out') >= 3) {
      toast?.error("Chat nodes can have at most 3 outgoing connections");
      return false;
    }
    return true;
  }
  
  // === Delay Node ===
  if (from === 'delay') {
    if (to === 'trigger') {
      toast?.error("Delay nodes cannot connect to triggers");
      return false;
    }
    // Delay nodes can only have one outgoing connection
    if (getConnectionCount(source, 'out') > 0) {
      toast?.error("Delay nodes can only have one outgoing connection");
      return false;
    }
    return true;
  }
  
  if (to === 'delay') {
    // Delay nodes can only have one incoming connection
    if (getConnectionCount(target, 'in') > 0) {
      toast?.error("Delay nodes can only have one incoming connection");
      return false;
    }
    return true;
  }
  
  // If we get here, the connection is not valid
  toast?.error(`Invalid connection: ${from} → ${to}`);
  return false;
};
  