// components/Builder/GraphMetricsPanel.js
import React, { useState } from 'react';
import { normalizeType } from '../../utils/nodeHelpers';

const GraphMetricsPanel = ({ nodes, edges, onHighlightNodes }) => {
  // Count nodes by type
  const agentCount = nodes.filter(n => n.type === 'agent').length;
  const taskCount = nodes.filter(n => n.type === 'task').length;
  const toolCount = nodes.filter(n => n.type === 'tool').length;
  const triggerCount = nodes.filter(n => n.type === 'trigger').length;
  const chatCount = nodes.filter(n => n.type === 'chatbot').length;
  const logicCount = nodes.filter(n => n.type === 'logic').length;
  const delayCount = nodes.filter(n => n.type === 'delay').length;
  
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
    ['delay', 'logic']
  ];

  // Count valid and invalid connections
  const { validConnections, invalidConnections } = edges.reduce(
    (acc, edge) => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

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
  const inputBindingsCount = nodes.filter(node => 
    node.data && node.data.inputs && Object.keys(node.data.inputs).length > 0
  ).length;
  
  // Handle highlighting nodes of a specific type
  const handleHighlight = (nodeType) => {
    if (onHighlightNodes) {
      onHighlightNodes(nodeType);
    }
  };

  return (
    <div className="absolute top-24 right-4 bg-white rounded shadow-md z-40 w-64 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-3 flex justify-between items-center">
        <h3 className="font-bold text-white">Graph Metrics</h3>
      </div>
      
      <div className="p-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {/* Node counts */}
          <div 
            className="flex items-center cursor-pointer hover:bg-blue-50 p-1 rounded"
            onClick={() => handleHighlight('agent')}
          >
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span>Agents:</span>
          </div>
          <div className="font-medium">{agentCount}</div>

          <div 
            className="flex items-center cursor-pointer hover:bg-yellow-50 p-1 rounded"
            onClick={() => handleHighlight('task')}
          >
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span>Tasks:</span>
          </div>
          <div className="font-medium">{taskCount}</div>

          <div 
            className="flex items-center cursor-pointer hover:bg-green-50 p-1 rounded"
            onClick={() => handleHighlight('tool')}
          >
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span>Tools:</span>
          </div>
          <div className="font-medium">{toolCount}</div>
          
          <div 
            className="flex items-center cursor-pointer hover:bg-purple-50 p-1 rounded"
            onClick={() => handleHighlight('trigger')}
          >
            <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
            <span>Triggers:</span>
          </div>
          <div className="font-medium">{triggerCount}</div>
          
          <div 
            className="flex items-center cursor-pointer hover:bg-pink-50 p-1 rounded"
            onClick={() => handleHighlight('chatbot')}
          >
            <div className="w-3 h-3 bg-pink-500 rounded-full mr-2"></div>
            <span>Chat Nodes:</span>
          </div>
          <div className="font-medium">{chatCount}</div>
          
          <div 
            className="flex items-center cursor-pointer hover:bg-yellow-50 p-1 rounded"
            onClick={() => handleHighlight('logic')}
          >
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span>Logic Nodes:</span>
          </div>
          <div className="font-medium">{logicCount}</div>
          
          <div 
            className="flex items-center cursor-pointer hover:bg-orange-50 p-1 rounded"
            onClick={() => handleHighlight('delay')}
          >
            <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
            <span>Delay Nodes:</span>
          </div>
          <div className="font-medium">{delayCount}</div>
          
          {/* Connection counts */}
          <div className="flex items-center col-span-2 mt-2 border-t pt-2">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span>Valid Connections:</span>
            <div className="font-medium ml-auto">{validConnections.length}</div>
          </div>
          
          <div className="flex items-center col-span-2">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span>Invalid Connections:</span>
            <div className="font-medium ml-auto">{invalidConnections.length}</div>
          </div>
          
          <div className="flex items-center col-span-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span>Input Bindings:</span>
            <div className="font-medium ml-auto">{inputBindingsCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(GraphMetricsPanel);
