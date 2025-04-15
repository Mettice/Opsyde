// components/Builder/GraphMetricsPanel.js
import React from 'react';
import { normalizeType } from '../../utils/nodeHelpers';

const GraphMetricsPanel = ({ nodes, edges }) => {
  const agentCount = nodes.filter(n => n.type === 'agent').length;
  const taskCount = nodes.filter(n => n.type === 'task').length;
  const toolCount = nodes.filter(n => n.type === 'tool').length;
  
  // Count valid connections
  const validConnections = edges.filter(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return false;
    
    const sourceType = normalizeType(sourceNode);
    const targetType = normalizeType(targetNode);
    
    // Valid connection patterns
    return (
      (sourceType === 'tool' && targetType === 'agent') ||
      (sourceType === 'agent' && targetType === 'task') ||
      (sourceType === 'task' && targetType === 'task')
    );
  }).length;
  
  return (
    <div className="absolute top-16 right-4 bg-white p-3 rounded shadow-md z-40">
      <h3 className="font-bold text-sm mb-2">Graph Metrics</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          <span>Agents:</span>
        </div>
        <div className="font-medium">{agentCount}</div>
        
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
          <span>Tasks:</span>
        </div>
        <div className="font-medium">{taskCount}</div>
        
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span>Tools:</span>
        </div>
        <div className="font-medium">{toolCount}</div>
        
        <div className="flex items-center">
          <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
          <span>Valid Connections:</span>
        </div>
        <div className="font-medium">{validConnections} ✅</div>
      </div>
    </div>
  );
};

export default React.memo(GraphMetricsPanel);