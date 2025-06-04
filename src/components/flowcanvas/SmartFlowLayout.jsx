import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * Smart Flow Layout System
 * Handles auto-layout, smart edge routing, and provides navigation tools
 */
const SmartFlowLayout = ({
  nodes = [],
  edges = [],
  onNodesChange,
  onEdgesChange,
  containerRef,
  className = ""
}) => {
  const [layoutMode, setLayoutMode] = useState('auto'); // 'auto', 'manual', 'hierarchical', 'circular'
  const [showMinimap, setShowMinimap] = useState(true);
  const [minimapPosition, setMinimapPosition] = useState({ x: 0, y: 0 });
  const [layoutInProgress, setLayoutInProgress] = useState(false);

  // Layout algorithms
  const layoutAlgorithms = {
    // Hierarchical layout (left-to-right flow)
    hierarchical: useCallback((nodes, edges) => {
      const nodeMap = new Map(nodes.map(node => [node.id, { ...node, level: -1, processed: false }]));
      const levels = [];
      
      // Find root nodes (no incoming edges)
      const rootNodes = nodes.filter(node => 
        !edges.some(edge => edge.target === node.id)
      );
      
      if (rootNodes.length === 0 && nodes.length > 0) {
        // If no clear root, use first node
        rootNodes.push(nodes[0]);
      }
      
      // Assign levels using BFS
      const queue = rootNodes.map(node => ({ ...node, level: 0 }));
      const processedNodes = new Set();
      
      while (queue.length > 0) {
        const currentNode = queue.shift();
        if (processedNodes.has(currentNode.id)) continue;
        
        processedNodes.add(currentNode.id);
        
        if (!levels[currentNode.level]) {
          levels[currentNode.level] = [];
        }
        levels[currentNode.level].push(currentNode);
        
        // Find child nodes
        const childEdges = edges.filter(edge => edge.source === currentNode.id);
        childEdges.forEach(edge => {
          const childNode = nodeMap.get(edge.target);
          if (childNode && !processedNodes.has(childNode.id)) {
            queue.push({ ...childNode, level: currentNode.level + 1 });
          }
        });
      }
      
      // Position nodes
      const levelWidth = 300;
      const nodeHeight = 150;
      const layoutNodes = [];
      
      levels.forEach((levelNodes, levelIndex) => {
        levelNodes.forEach((node, nodeIndex) => {
          const x = levelIndex * levelWidth;
          const y = nodeIndex * nodeHeight + (nodeIndex * 50); // Add spacing
          
          layoutNodes.push({
            ...node,
            position: { x, y }
          });
        });
      });
      
      return layoutNodes;
    }, []),

    // Circular layout
    circular: useCallback((nodes) => {
      const centerX = 400;
      const centerY = 300;
      const radius = Math.max(200, nodes.length * 30);
      
      return nodes.map((node, index) => {
        const angle = (2 * Math.PI * index) / nodes.length;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        return {
          ...node,
          position: { x, y }
        };
      });
    }, []),

    // Grid layout
    grid: useCallback((nodes) => {
      const cols = Math.ceil(Math.sqrt(nodes.length));
      const cellWidth = 250;
      const cellHeight = 180;
      
      return nodes.map((node, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        return {
          ...node,
          position: {
            x: col * cellWidth + 50,
            y: row * cellHeight + 50
          }
        };
      });
    }, []),

    // Smart flow layout (follows natural workflow progression)
    auto: useCallback((nodes, edges) => {
      // Categorize nodes by type for smart positioning
      const nodeCategories = {
        triggers: nodes.filter(n => (n.type || '').toLowerCase().includes('trigger')),
        inputs: nodes.filter(n => (n.type || '').toLowerCase().includes('input')),
        agents: nodes.filter(n => (n.type || '').toLowerCase().includes('agent')),
        tasks: nodes.filter(n => (n.type || '').toLowerCase().includes('task')),
        tools: nodes.filter(n => (n.type || '').toLowerCase().includes('tool')),
        logic: nodes.filter(n => (n.type || '').toLowerCase().includes('logic')),
        outputs: nodes.filter(n => (n.type || '').toLowerCase().includes('output')),
        others: nodes.filter(n => {
          const type = (n.type || '').toLowerCase();
          return !['trigger', 'input', 'agent', 'task', 'tool', 'logic', 'output'].some(t => type.includes(t));
        })
      };

      const layoutNodes = [];
      let currentX = 50;
      const categorySpacing = 350;
      const nodeSpacing = 120;

      // Position each category
      Object.entries(nodeCategories).forEach(([category, categoryNodes]) => {
        if (categoryNodes.length === 0) return;

        categoryNodes.forEach((node, index) => {
          layoutNodes.push({
            ...node,
            position: {
              x: currentX,
              y: 50 + (index * nodeSpacing)
            }
          });
        });

        currentX += categorySpacing;
      });

      return layoutNodes;
    }, [])
  };

  // Apply layout algorithm
  const applyLayout = useCallback(async (algorithm = layoutMode) => {
    if (!layoutAlgorithms[algorithm] || layoutInProgress) return;
    
    setLayoutInProgress(true);
    
    try {
      const layoutFunction = layoutAlgorithms[algorithm];
      const newNodes = layoutFunction(nodes, edges);
      
      // Animate to new positions
      if (onNodesChange) {
        onNodesChange(newNodes);
      }
      
      // Add small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error('Layout application failed:', error);
    } finally {
      setLayoutInProgress(false);
    }
  }, [layoutMode, nodes, edges, onNodesChange, layoutAlgorithms, layoutInProgress]);

  // Smart edge routing
  const getSmartEdgePath = useCallback((edge, nodes) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return '';
    
    const sourcePos = sourceNode.position;
    const targetPos = targetNode.position;
    
    // Calculate control points for smooth curves
    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    
    const controlPoint1X = sourcePos.x + dx * 0.3;
    const controlPoint1Y = sourcePos.y;
    const controlPoint2X = targetPos.x - dx * 0.3;
    const controlPoint2Y = targetPos.y;
    
    return `M ${sourcePos.x} ${sourcePos.y} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${targetPos.x} ${targetPos.y}`;
  }, []);

  // Calculate flow bounds for minimap
  const flowBounds = useMemo(() => {
    if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
    
    const positions = nodes.map(node => node.position).filter(Boolean);
    const xs = positions.map(pos => pos.x);
    const ys = positions.map(pos => pos.y);
    
    return {
      minX: Math.min(...xs) - 100,
      minY: Math.min(...ys) - 100,
      maxX: Math.max(...xs) + 300,
      maxY: Math.max(...ys) + 200
    };
  }, [nodes]);

  // Minimap component
  const Minimap = () => {
    const minimapScale = 0.1;
    const minimapWidth = (flowBounds.maxX - flowBounds.minX) * minimapScale;
    const minimapHeight = (flowBounds.maxY - flowBounds.minY) * minimapScale;
    
    return (
      <div className="minimap bg-white/90 backdrop-blur-sm border border-gray-300 rounded-lg p-2 shadow-lg">
        <div className="text-xs font-semibold text-gray-700 mb-2">Flow Overview</div>
        <div 
          className="relative bg-gray-100 rounded"
          style={{ width: Math.max(minimapWidth, 150), height: Math.max(minimapHeight, 100) }}
        >
          {/* Minimap nodes */}
          {nodes.map(node => {
            if (!node.position) return null;
            
            const x = (node.position.x - flowBounds.minX) * minimapScale;
            const y = (node.position.y - flowBounds.minY) * minimapScale;
            
            return (
              <div
                key={node.id}
                className="absolute w-2 h-2 bg-blue-500 rounded-full"
                style={{ left: x, top: y }}
                title={node.data?.label || node.id}
              />
            );
          })}
          
          {/* Minimap edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {edges.map(edge => {
              const sourceNode = nodes.find(n => n.id === edge.source);
              const targetNode = nodes.find(n => n.id === edge.target);
              
              if (!sourceNode?.position || !targetNode?.position) return null;
              
              const x1 = (sourceNode.position.x - flowBounds.minX) * minimapScale;
              const y1 = (sourceNode.position.y - flowBounds.minY) * minimapScale;
              const x2 = (targetNode.position.x - flowBounds.minX) * minimapScale;
              const y2 = (targetNode.position.y - flowBounds.minY) * minimapScale;
              
              return (
                <line
                  key={edge.id}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#3b82f6"
                  strokeWidth="1"
                  opacity="0.6"
                />
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className={`smart-flow-layout ${className}`}>
      {/* Layout Controls */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 border border-gray-200 shadow-lg">
          <div className="font-semibold text-gray-800 mb-2">🎨 Layout Tools</div>
          
          {/* Layout Mode Selector */}
          <div className="flex flex-wrap gap-1 mb-3">
            {Object.keys(layoutAlgorithms).map(mode => (
              <button
                key={mode}
                onClick={() => setLayoutMode(mode)}
                className={`px-2 py-1 text-xs rounded-md transition-all ${
                  layoutMode === mode
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => applyLayout()}
              disabled={layoutInProgress}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                layoutInProgress
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600 shadow-sm'
              }`}
            >
              {layoutInProgress ? '⏳ Applying...' : '✨ Apply Layout'}
            </button>
            
            <button
              onClick={() => applyLayout('auto')}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-all shadow-sm"
            >
              🚀 Smart Auto
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 border border-gray-200 shadow-lg">
          <div className="font-semibold text-gray-800 mb-2">⚡ Quick Actions</div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => applyLayout('hierarchical')}
              className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-all"
            >
              📊 Straighten Flow
            </button>
            <button
              onClick={() => setShowMinimap(!showMinimap)}
              className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-all"
            >
              🗺️ Toggle Minimap
            </button>
          </div>
        </div>
      </div>

      {/* Minimap */}
      {showMinimap && (
        <div className="absolute bottom-4 right-4 z-20">
          <Minimap />
        </div>
      )}

      {/* Layout Progress Indicator */}
      {layoutInProgress && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-gray-200 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-sm font-medium text-gray-800">
                Organizing your workflow...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flow Statistics */}
      <div className="absolute bottom-4 left-4 z-20">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 border border-gray-200 shadow-lg">
          <div className="text-xs font-semibold text-gray-700 mb-1">📈 Flow Stats</div>
          <div className="space-y-1 text-xs text-gray-600">
            <div>Nodes: {nodes.length}</div>
            <div>Connections: {edges.length}</div>
            <div>Layout: {layoutMode}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

SmartFlowLayout.propTypes = {
  nodes: PropTypes.array,
  edges: PropTypes.array,
  onNodesChange: PropTypes.func,
  onEdgesChange: PropTypes.func,
  containerRef: PropTypes.object,
  className: PropTypes.string
};

export default SmartFlowLayout; 