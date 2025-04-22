export const validateConnection = (params, nodes, edges, toast) => {
  const { source, target, sourceHandle } = params;
  
  const sourceNode = nodes.find(n => n.id === source);
  const targetNode = nodes.find(n => n.id === target);
  
  if (!sourceNode || !targetNode) return false;
  if (source === target) return false; // prevent self-loop
  
  const from = sourceNode.type;
  const to = targetNode.type;
  
  console.log("Validating connection:", {
    source,
    target,
    sourceHandle,
    sourceType: from,
    targetType: to
  });
  
  // === Special Logic for Triggers ===
  if (from === 'trigger') {
    // Trigger can connect to any node
    console.log("Valid connection: trigger → any");
    return true;
  }
  
  if (to === 'trigger') {
    // Nothing can connect to a trigger
    console.log("Invalid connection: any → trigger");
    return false;
  }
  
  // === Input Node ===
  if (from === 'input') {
    // Input can connect to any node except trigger
    console.log("Valid connection: input → any (except trigger)");
    return to !== 'trigger';
  }
  
  // === Output Node ===
  if (to === 'output') {
    // Any node can connect to output except trigger
    console.log("Valid connection: any → output (except trigger)");
    return from !== 'trigger';
  }
  
  // === Logic Node ===
  if (from === 'logic') {
    // Logic nodes can connect to anything except triggers
    console.log("Valid connection: logic → any (except trigger)");
    return to !== 'trigger';
  }
  
  if (to === 'logic') {
    // Anything except logic can connect to logic
    console.log("Valid connection: any → logic (except logic)");
    return from !== 'logic';
  }
  
  // === Delay Node ===
  if (from === 'delay') {
    // Delay can connect to anything except triggers
    console.log("Valid connection: delay → any (except trigger)");
    return to !== 'trigger';
  }
  
  if (to === 'delay') {
    // Anything can connect to delay
    console.log("Valid connection: any → delay");
    return true;
  }
  
  // === Chat/Chatbot Node ===
  if (from === 'chatbot' || from === 'chat') {
    // Chatbot can connect to anything except trigger
    console.log("Valid connection: chatbot → any (except trigger)");
    return to !== 'trigger';
  }
  
  if (to === 'chatbot' || to === 'chat') {
    // Anything can connect to chatbot except trigger
    console.log("Valid connection: any → chatbot (except trigger)");
    return from !== 'trigger';
  }
  
  // === Tool Node ===
  if (from === 'tool') {
    // Tool can connect to agent, chatbot, or output
    console.log("Valid connection: tool → agent/chatbot/output");
    return to === 'agent' || to === 'chatbot' || to === 'chat' || to === 'output';
  }
  
  // === Agent Node ===
  if (from === 'agent') {
    // Agent can connect to task, chatbot, delay, or output
    console.log("Valid connection: agent → task/chatbot/delay/output");
    return to === 'task' || to === 'chatbot' || to === 'chat' || to === 'delay' || to === 'output';
  }
  
  // === Task Node ===
  if (from === 'task') {
    // Task can connect to task, chatbot, delay, or output
    console.log("Valid connection: task → task/chatbot/delay/output");
    return to === 'task' || to === 'chatbot' || to === 'chat' || to === 'delay' || to === 'output';
  }
  
  // If we get here, the connection is not valid
  console.log("Connection rejected:", { from, to, sourceHandle });
  return false;
};
  