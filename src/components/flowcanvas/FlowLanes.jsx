import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * FlowLanes component - Creates visual zones/lanes for organizing workflow nodes
 * Addresses the visual clutter issue by grouping nodes into logical layers
 */
const FlowLanes = ({ 
  nodes = [], 
  edges = [],
  onNodePositionUpdate,
  showLanes = true,
  laneWidth = 300,
  className = ""
}) => {
  const [lanes, setLanes] = useState([]);
  const [draggedNode, setDraggedNode] = useState(null);

  // Define flow lanes with colors and categories
  const flowLanes = [
    {
      id: 'data',
      title: '📊 Data Layer',
      subtitle: 'Sources & Triggers',
      color: 'from-blue-500/10 to-blue-600/10',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      nodeTypes: ['trigger', 'input', 'api'],
      position: { x: 0, y: 0 },
      width: laneWidth
    },
    {
      id: 'intelligence',
      title: '🧠 Intelligence Layer', 
      subtitle: 'AI Agents & Analysis',
      color: 'from-purple-500/10 to-purple-600/10',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700',
      nodeTypes: ['agent', 'task', 'ai'],
      position: { x: laneWidth + 50, y: 0 },
      width: laneWidth
    },
    {
      id: 'processing',
      title: '⚙️ Processing Layer',
      subtitle: 'Tools & Logic',
      color: 'from-orange-500/10 to-orange-600/10',
      borderColor: 'border-orange-200', 
      textColor: 'text-orange-700',
      nodeTypes: ['tool', 'logic', 'delay'],
      position: { x: (laneWidth + 50) * 2, y: 0 },
      width: laneWidth
    },
    {
      id: 'action',
      title: '📤 Action Layer',
      subtitle: 'Outputs & Distribution',
      color: 'from-green-500/10 to-green-600/10',
      borderColor: 'border-green-200',
      textColor: 'text-green-700', 
      nodeTypes: ['output', 'webhook', 'email', 'notification'],
      position: { x: (laneWidth + 50) * 3, y: 0 },
      width: laneWidth
    }
  ];

  // Calculate lane heights based on content
  const calculateLaneHeight = (laneId) => {
    const laneNodes = nodes.filter(node => {
      const lane = flowLanes.find(l => l.id === laneId);
      return lane?.nodeTypes.includes(node.type?.toLowerCase()) || 
             lane?.nodeTypes.includes(node.data?.nodeType?.toLowerCase());
    });
    
    return Math.max(400, laneNodes.length * 150 + 100);
  };

  // Auto-organize nodes into lanes
  const organizeNodesIntoLanes = () => {
    const updatedNodes = nodes.map(node => {
      const nodeType = (node.type || node.data?.nodeType || '').toLowerCase();
      const targetLane = flowLanes.find(lane => 
        lane.nodeTypes.some(type => nodeType.includes(type))
      );

      if (targetLane && (!node.position || node.position.x < 100)) {
        // Auto-position nodes in their appropriate lanes
        const laneNodes = nodes.filter(n => {
          const nType = (n.type || n.data?.nodeType || '').toLowerCase();
          return targetLane.nodeTypes.some(type => nType.includes(type));
        });
        
        const nodeIndex = laneNodes.indexOf(node);
        const newPosition = {
          x: targetLane.position.x + 20,
          y: targetLane.position.y + 80 + (nodeIndex * 120)
        };

        if (onNodePositionUpdate) {
          onNodePositionUpdate(node.id, newPosition);
        }

        return { ...node, position: newPosition };
      }

      return node;
    });

    return updatedNodes;
  };

  // Handle drag and drop between lanes
  const handleNodeDrop = (event, laneId) => {
    event.preventDefault();
    
    if (draggedNode) {
      const targetLane = flowLanes.find(l => l.id === laneId);
      if (targetLane) {
        const rect = event.currentTarget.getBoundingClientRect();
        const newPosition = {
          x: targetLane.position.x + 20,
          y: Math.max(targetLane.position.y + 80, event.clientY - rect.top - 50)
        };

        if (onNodePositionUpdate) {
          onNodePositionUpdate(draggedNode.id, newPosition);
        }
      }
      setDraggedNode(null);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  // Get nodes for a specific lane
  const getNodesForLane = (laneId) => {
    const lane = flowLanes.find(l => l.id === laneId);
    if (!lane) return [];

    return nodes.filter(node => {
      const nodeType = (node.type || node.data?.nodeType || '').toLowerCase();
      return lane.nodeTypes.some(type => nodeType.includes(type));
    });
  };

  // Auto-organize nodes on mount
  useEffect(() => {
    if (nodes.length > 0) {
      organizeNodesIntoLanes();
    }
  }, []);

  if (!showLanes) return null;

  return (
    <div className={`flow-lanes absolute inset-0 pointer-events-none ${className}`}>
      {/* Lane Background Zones */}
      {flowLanes.map(lane => {
        const laneHeight = calculateLaneHeight(lane.id);
        const nodeCount = getNodesForLane(lane.id).length;
        
        return (
          <div
            key={lane.id}
            className={`
              absolute pointer-events-auto
              bg-gradient-to-b ${lane.color}
              border-2 border-dashed ${lane.borderColor}
              rounded-2xl transition-all duration-300
              hover:shadow-lg hover:border-solid
            `}
            style={{
              left: lane.position.x,
              top: lane.position.y,
              width: lane.width,
              height: laneHeight,
              zIndex: -1
            }}
            onDrop={(e) => handleNodeDrop(e, lane.id)}
            onDragOver={handleDragOver}
          >
            {/* Lane Header */}
            <div className={`
              p-4 border-b border-current border-opacity-20
              bg-white/60 backdrop-blur-sm rounded-t-2xl
            `}>
              <div className={`font-bold text-lg ${lane.textColor}`}>
                {lane.title}
              </div>
              <div className={`text-sm opacity-80 ${lane.textColor}`}>
                {lane.subtitle}
              </div>
              <div className={`text-xs opacity-60 ${lane.textColor} mt-1`}>
                {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
              </div>
            </div>

            {/* Lane Guidelines */}
            <div className="absolute inset-x-4 top-20 bottom-4 pointer-events-none">
              <div className={`
                w-full h-full border border-dashed ${lane.borderColor} 
                rounded-lg opacity-30
              `} />
              
              {/* Drop Hint */}
              <div className={`
                absolute inset-0 flex items-center justify-center
                text-center ${lane.textColor} opacity-40
                transition-opacity duration-200
              `}>
                <div className="text-sm">
                  Drop {lane.nodeTypes.join(', ')} nodes here
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Flow Direction Indicators */}
      <div className="absolute top-4 left-4 pointer-events-auto">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 border border-gray-200 shadow-lg">
          <div className="font-semibold text-gray-800 mb-2">📊 Workflow Flow</div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="text-blue-600">📊 Data</span>
            <span>→</span>
            <span className="text-purple-600">🧠 AI</span>
            <span>→</span>
            <span className="text-orange-600">⚙️ Process</span>
            <span>→</span>
            <span className="text-green-600">📤 Action</span>
          </div>
        </div>
      </div>

      {/* Lane Toggle */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <button
          onClick={() => {/* Toggle lanes visibility */}}
          className="bg-white/90 backdrop-blur-sm rounded-xl p-3 border border-gray-200 shadow-lg hover:shadow-xl transition-all"
          title="Toggle flow lanes"
        >
          <span className="text-lg">🗂️</span>
        </button>
      </div>

      {/* Mini Flow Map */}
      <div className="absolute bottom-4 right-4 pointer-events-auto">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 border border-gray-200 shadow-lg">
          <div className="text-xs font-semibold text-gray-800 mb-2">Flow Overview</div>
          <div className="grid grid-cols-4 gap-1">
            {flowLanes.map(lane => {
              const nodeCount = getNodesForLane(lane.id).length;
              return (
                <div
                  key={lane.id}
                  className={`
                    w-4 h-8 rounded bg-gradient-to-b ${lane.color}
                    border ${lane.borderColor} relative
                  `}
                  title={`${lane.title}: ${nodeCount} nodes`}
                >
                  <div className={`
                    absolute -top-1 -right-1 w-3 h-3 rounded-full
                    bg-gray-600 text-white text-xs flex items-center justify-center
                    ${nodeCount > 0 ? 'opacity-100' : 'opacity-0'}
                  `}>
                    {nodeCount}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

FlowLanes.propTypes = {
  nodes: PropTypes.array,
  edges: PropTypes.array,
  onNodePositionUpdate: PropTypes.func,
  showLanes: PropTypes.bool,
  laneWidth: PropTypes.number,
  className: PropTypes.string
};

export default FlowLanes; 