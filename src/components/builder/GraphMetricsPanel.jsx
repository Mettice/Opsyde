// components/Builder/GraphMetricsPanel.js
import React, { useState } from 'react';
import { normalizeType } from '../../utils/nodeHelpers';

const GraphMetricsPanel = ({ 
  nodes = [], 
  edges = [], 
  onHighlightNodes, 
  darkMode,
  nodeStates = new Map(),
  connectionStates = new Map(),
  isExecuting = false
}) => {
  // Ensure nodes and edges are arrays
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const safeEdges = Array.isArray(edges) ? edges : [];

  // Count nodes by type
  const agentCount = safeNodes.filter(n => n.type === 'agent').length;
  const taskCount = safeNodes.filter(n => n.type === 'task').length;
  const toolCount = safeNodes.filter(n => n.type === 'tool').length;
  const triggerCount = safeNodes.filter(n => n.type === 'trigger').length;
  const chatCount = safeNodes.filter(n => n.type === 'chatbot').length;
  const logicCount = safeNodes.filter(n => n.type === 'logic').length;
  const delayCount = safeNodes.filter(n => n.type === 'delay').length;

  // Count execution states
  const executionStats = {
    idle: 0,
    processing: 0,
    success: 0,
    error: 0
  };

  safeNodes.forEach(node => {
    const state = nodeStates.get(node.id);
    const status = state?.status || 'idle';
    if (executionStats.hasOwnProperty(status)) {
      executionStats[status]++;
    } else {
      executionStats.idle++;
    }
  });

  // Count connection states
  const connectionStats = {
    idle: 0,
    active: 0,
    success: 0,
    error: 0
  };

  safeEdges.forEach(edge => {
    const state = connectionStates.get(edge.id);
    const status = state?.state || 'idle';
    if (connectionStats.hasOwnProperty(status)) {
      connectionStats[status]++;
    } else {
      connectionStats.idle++;
    }
  });

  // Calculate performance metrics
  const totalThroughput = Array.from(connectionStates.values())
    .filter(state => state?.throughput)
    .reduce((sum, state) => sum + (state.throughput || 0), 0);

  const avgThroughput = connectionStates.size > 0 ? totalThroughput / connectionStates.size : 0;

  // Define all valid connection patterns
  const validPatterns = [
    ['tool', 'agent'],
    ['agent', 'task'],
    ['task', 'task'],
    ['trigger', 'agent'],
    ['trigger', 'task'],
    ['trigger', 'tool'],
    ['trigger', 'chatbot'],
    ['trigger', 'logic'],
    ['logic', 'agent'],
    ['logic', 'task'],
    ['logic', 'tool'],
    ['logic', 'chatbot'],
    ['logic', 'logic'],
    ['chatbot', 'agent'],
    ['chatbot', 'task'],
    ['agent', 'chatbot'],
    ['task', 'chatbot'],
    ['tool', 'chatbot'],
    ['delay', 'agent'],
    ['delay', 'task'],
    ['delay', 'tool'],
    ['delay', 'chatbot'],
    ['delay', 'logic'],
    ['input', 'agent'],
    ['input', 'task'],
    ['input', 'tool'],
    ['agent', 'output'],
    ['task', 'output'],
    ['tool', 'output']
  ];

  // Count valid and invalid connections
  const { validConnections, invalidConnections } = safeEdges.reduce(
    (acc, edge) => {
      const sourceNode = safeNodes.find(n => n.id === edge.source);
      const targetNode = safeNodes.find(n => n.id === edge.target);

      if (!sourceNode || !targetNode) return acc;

      const sourceType = normalizeType(sourceNode);
      const targetType = normalizeType(targetNode);

      // Check if this source-target pair is allowed
      const isValid = validPatterns.some(
        ([validSource, validTarget]) =>
          sourceType === validSource && targetType === validTarget
      );

      if (isValid) {
        acc.validConnections.push(edge);
      } else {
        acc.invalidConnections.push(edge);
      }

      return acc;
    },
    { validConnections: [], invalidConnections: [] }
  );
  
  // Count input bindings (nodes with data.inputs defined)
  const inputBindingsCount = safeNodes.filter(node => 
    node.data && node.data.inputs && Object.keys(node.data.inputs).length > 0
  ).length;
  
  // Handle highlighting nodes of a specific type
  const handleHighlight = (nodeType) => {
    if (onHighlightNodes) {
      onHighlightNodes(nodeType);
    }
  };

  const textColorClass = darkMode ? 'text-gray-200' : 'text-gray-800';
  const hoverBgClass = darkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-50';

  return (
    <div className="w-full h-full">
      {/* Execution Status Section */}
      {isExecuting && (
        <div className={`mb-4 p-3 rounded-lg ${darkMode ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
          <div className="flex items-center mb-2">
            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
            <span className={`font-semibold ${textColorClass}`}>Workflow Executing</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className={textColorClass}>Processing:</span>
              <span className="font-medium text-blue-500">{executionStats.processing}</span>
            </div>
            <div className="flex justify-between">
              <span className={textColorClass}>Completed:</span>
              <span className="font-medium text-green-500">{executionStats.success}</span>
            </div>
            <div className="flex justify-between">
              <span className={textColorClass}>Active Connections:</span>
              <span className="font-medium text-blue-500">{connectionStats.active}</span>
            </div>
            <div className="flex justify-between">
              <span className={textColorClass}>Avg Throughput:</span>
              <span className="font-medium text-purple-500">{avgThroughput.toFixed(1)}/s</span>
            </div>
          </div>
        </div>
      )}

      {/* Node Counts Section */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
        <div 
          className={`flex items-center cursor-pointer ${hoverBgClass} p-1 rounded`}
          onClick={() => handleHighlight('agent')}
        >
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          <span className={textColorClass}>Agents:</span>
        </div>
        <div className={`font-medium ${textColorClass}`}>{agentCount}</div>

        <div 
          className={`flex items-center cursor-pointer ${hoverBgClass} p-1 rounded`}
          onClick={() => handleHighlight('task')}
        >
          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
          <span className={textColorClass}>Tasks:</span>
        </div>
        <div className={`font-medium ${textColorClass}`}>{taskCount}</div>

        <div 
          className={`flex items-center cursor-pointer ${hoverBgClass} p-1 rounded`}
          onClick={() => handleHighlight('tool')}
        >
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span className={textColorClass}>Tools:</span>
        </div>
        <div className={`font-medium ${textColorClass}`}>{toolCount}</div>
        
        <div 
          className={`flex items-center cursor-pointer ${hoverBgClass} p-1 rounded`}
          onClick={() => handleHighlight('trigger')}
        >
          <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
          <span className={textColorClass}>Triggers:</span>
        </div>
        <div className={`font-medium ${textColorClass}`}>{triggerCount}</div>
        
        <div 
          className={`flex items-center cursor-pointer ${hoverBgClass} p-1 rounded`}
          onClick={() => handleHighlight('chatbot')}
        >
          <div className="w-3 h-3 bg-pink-500 rounded-full mr-2"></div>
          <span className={textColorClass}>Chat Nodes:</span>
        </div>
        <div className={`font-medium ${textColorClass}`}>{chatCount}</div>
        
        <div 
          className={`flex items-center cursor-pointer ${hoverBgClass} p-1 rounded`}
          onClick={() => handleHighlight('logic')}
        >
          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
          <span className={textColorClass}>Logic Nodes:</span>
        </div>
        <div className={`font-medium ${textColorClass}`}>{logicCount}</div>
        
        <div 
          className={`flex items-center cursor-pointer ${hoverBgClass} p-1 rounded`}
          onClick={() => handleHighlight('delay')}
        >
          <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
          <span className={textColorClass}>Delay Nodes:</span>
        </div>
        <div className={`font-medium ${textColorClass}`}>{delayCount}</div>
      </div>

      {/* Execution States Section */}
      {nodeStates.size > 0 && (
        <div className={`mb-4 p-3 rounded-lg ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
          <h4 className={`font-semibold mb-2 ${textColorClass}`}>Node States</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className={textColorClass}>Idle:</span>
              <span className="font-medium text-gray-500">{executionStats.idle}</span>
            </div>
            <div className="flex justify-between">
              <span className={textColorClass}>Processing:</span>
              <span className="font-medium text-blue-500">{executionStats.processing}</span>
            </div>
            <div className="flex justify-between">
              <span className={textColorClass}>Success:</span>
              <span className="font-medium text-green-500">{executionStats.success}</span>
            </div>
            <div className="flex justify-between">
              <span className={textColorClass}>Error:</span>
              <span className="font-medium text-red-500">{executionStats.error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status Section */}
      <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} pt-3`}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="flex items-center col-span-2">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className={textColorClass}>Valid Connections:</span>
            <div className={`font-medium ml-auto ${textColorClass}`}>{validConnections.length}</div>
          </div>
          
          <div className="flex items-center col-span-2">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span className={textColorClass}>Invalid Connections:</span>
            <div className={`font-medium ml-auto ${textColorClass}`}>{invalidConnections.length}</div>
          </div>
          
          <div className="flex items-center col-span-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span className={textColorClass}>Input Bindings:</span>
            <div className={`font-medium ml-auto ${textColorClass}`}>{inputBindingsCount}</div>
          </div>

          {/* Connection States */}
          {connectionStates.size > 0 && (
            <>
              <div className="flex items-center col-span-2 mt-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                <span className={textColorClass}>Active Connections:</span>
                <div className={`font-medium ml-auto text-blue-500`}>{connectionStats.active}</div>
              </div>
              
              <div className="flex items-center col-span-2">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                <span className={textColorClass}>Successful:</span>
                <div className={`font-medium ml-auto text-green-500`}>{connectionStats.success}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(GraphMetricsPanel);
