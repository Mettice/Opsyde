import { useCallback } from 'react';
import { useFlow } from '../contexts/FlowContext';
import { getSafeNodePosition } from '../utils/getSafeNodePosition';

export const useNodeManagement = () => {
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    setSelectedNode
  } = useFlow();

  // Node edit handler - Move to the top
  const handleNodeEdit = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      // Normalize the node type
      let normalizedType = node.type;
      if (normalizedType === 'agentNode') normalizedType = 'agent';
      if (normalizedType === 'taskNode') normalizedType = 'task';
      if (normalizedType === 'toolNode') normalizedType = 'tool';
      
      setSelectedNode({
        ...node,
        type: normalizedType
      });
    }
  }, [nodes, setSelectedNode]);

  // Node delete handler - Move to the top
  const handleNodeDelete = useCallback((nodeId) => {
    setNodes(nodes => nodes.filter(node => node.id !== nodeId));
    setEdges(edges => edges.filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    ));
  }, [setNodes, setEdges]);

  // Save edits to a node - Move to the top
  const onSaveEdit = useCallback((data) => {
    if (!data) return;
    
    setNodes(nodes => nodes.map(node => {
      if (node.id === data.nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            ...data,
            // Preserve/re-add the event handlers after save
            onEdit: () => handleNodeEdit(node.id),
            onDelete: () => handleNodeDelete(node.id)
          }
        };
      }
      return node;
    }));
  }, [setNodes, handleNodeEdit, handleNodeDelete]);

  // Add agent node
  const addAgent = useCallback(() => {
    const id = `agent-${Date.now()}`;
    const newNode = {
      id,
      type: 'agent',
      position: getSafeNodePosition(nodes),
      data: {
        label: 'New Agent',
        role: 'Assistant',
        description: '',
        goal: 'Help the user with their task',
        backstory: 'I am an AI assistant.',
        framework: 'crewai',
        llmModel: 'gpt-4',
        temperature: 0.7,
        max_tokens: 4000,
        allowDelegation: false,
        verbose: true,
        nodeId: id,
        nodeType: 'agent',
        // Add event handlers
        onEdit: () => handleNodeEdit(id),
        onDelete: () => handleNodeDelete(id)
      }
    };
    
    setNodes(prev => [...prev, newNode]);
    return newNode;
  }, [nodes, setNodes, handleNodeEdit, handleNodeDelete]);

  // Add task node
  const addTask = useCallback(() => {
    const id = `task-${Date.now()}`;
    const newNode = {
      id,
      type: 'task',
      position: getSafeNodePosition(nodes),
      data: {
        label: 'New Task',
        description: 'Task description',
        expectedOutput: '',
        dependencies: [],
        nodeId: id,
        nodeType: 'task',
        // Add event handlers
        onEdit: () => handleNodeEdit(id),
        onDelete: () => handleNodeDelete(id)
      }
    };
    
    setNodes(prev => [...prev, newNode]);
    return newNode;
  }, [nodes, setNodes, handleNodeEdit, handleNodeDelete]);

  // Add chatbot node
  const addChatNode = useCallback(() => {
    const id = `chat-${Date.now()}`;
    const newNode = {
      id,
      type: 'chatbot',
      position: getSafeNodePosition(nodes),
      data: {
        label: 'Chat',
        systemPrompt: 'You are a helpful assistant.',
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 500,
        nodeId: id,
        nodeType: 'chatbot',
        // Add event handlers
        onEdit: () => handleNodeEdit(id),
        onDelete: () => handleNodeDelete(id)
      }
    };
    
    setNodes(prev => [...prev, newNode]);
    return newNode;
  }, [nodes, setNodes, handleNodeEdit, handleNodeDelete]);

  // Add delay node
  const addDelayNode = useCallback(() => {
    const id = `delay-${Date.now()}`;
    const newNode = {
      id,
      type: 'delay',
      position: getSafeNodePosition(nodes),
      data: {
        label: 'Delay',
        duration: '5s',
        nodeId: id,
        nodeType: 'delay',
        // Add event handlers
        onEdit: () => handleNodeEdit(id),
        onDelete: () => handleNodeDelete(id)
      }
    };
    
    setNodes(prev => [...prev, newNode]);
    return newNode;
  }, [nodes, setNodes, handleNodeEdit, handleNodeDelete]);

  // Add trigger node
  const addTriggerNode = useCallback(() => {
    const id = `trigger-${Date.now()}`;
    const newNode = {
      id,
      type: 'trigger',
      position: getSafeNodePosition(nodes),
      data: {
        label: 'Trigger',
        triggerType: 'manual',
        runAt: '',
        scheduleType: 'once',
        scheduleDays: [],
        scheduleWeekday: 'monday',
        scheduleMonthDay: 1,
        nodeId: id,
        nodeType: 'trigger',
        // Add event handlers
        onEdit: () => handleNodeEdit(id),
        onDelete: () => handleNodeDelete(id)
      }
    };
    
    setNodes(prev => [...prev, newNode]);
    return newNode;
  }, [nodes, setNodes, handleNodeEdit, handleNodeDelete]);

  // Add logic node
  const addLogicNode = useCallback(() => {
    const id = `logic-${Date.now()}`;
    const newNode = {
      id,
      type: 'logic',
      position: getSafeNodePosition(nodes),
      data: {
        label: 'Logic',
        condition: '',
        nodeId: id,
        nodeType: 'logic',
        // Add event handlers
        onEdit: () => handleNodeEdit(id),
        onDelete: () => handleNodeDelete(id)
      }
    };
    
    setNodes(prev => [...prev, newNode]);
    return newNode;
  }, [nodes, setNodes, handleNodeEdit, handleNodeDelete]);

  // Add input node
  const addInputNode = useCallback(() => {
    const id = `input-${Date.now()}`;
    const newNode = {
      id,
      type: 'input',
      position: getSafeNodePosition(nodes),
      data: {
        label: 'Input',
        inputType: 'text',
        variableName: 'user_input',
        isRequired: false,
        nodeId: id,
        nodeType: 'input',
        // Add event handlers
        onEdit: () => handleNodeEdit(id),
        onDelete: () => handleNodeDelete(id)
      }
    };
    
    setNodes(prev => [...prev, newNode]);
    return newNode;
  }, [nodes, setNodes, handleNodeEdit, handleNodeDelete]);

  // Add output node
  const addOutputNode = useCallback(() => {
    const id = `output-${Date.now()}`;
    const newNode = {
      id,
      type: 'output',
      position: getSafeNodePosition(nodes),
      data: {
        label: 'Output',
        outputType: 'webhook',
        webhookUrl: '',
        email: '',
        nodeId: id,
        nodeType: 'output',
        // Add event handlers
        onEdit: () => handleNodeEdit(id),
        onDelete: () => handleNodeDelete(id)
      }
    };
    
    setNodes(prev => [...prev, newNode]);
    return newNode;
  }, [nodes, setNodes, handleNodeEdit, handleNodeDelete]);

  // Add tool node 
  const addTool = useCallback(() => {
    const id = `tool-${Date.now()}`;
    const newNode = {
      id,
      type: 'tool',
      position: getSafeNodePosition(nodes),
      data: {
        // Basic fields
        label: 'New Tool',
        description: 'Tool description',
        
        // Tool configuration
        toolType: 'api',
        framework: '',
        frameworkConfig: {},
        
        // Additional fields for enhanced editor
        expectedOutput: '',
        condition: '',
        async: false,
        parameters: '',
        apiKey: '',
        
        // Legacy field (for backward compatibility)
        apiEndpoint: '',
        
        // Node metadata
        nodeId: id,
        nodeType: 'tool',
        
        // Event handlers
        onEdit: () => handleNodeEdit(id),
        onDelete: () => handleNodeDelete(id)
      }
    };
    
    setNodes(prev => [...prev, newNode]);
    return newNode;
  }, [nodes, setNodes, handleNodeEdit, handleNodeDelete]);

  return {
    addAgent,
    addTask,
    addChatNode,
    addDelayNode,
    addTriggerNode,
    addLogicNode,
    addInputNode,
    addOutputNode,
    addTool,
    handleNodeEdit,
    handleNodeDelete,
    onSaveEdit
  };
};