import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import FlowLanes from './FlowLanes';
import EnhancedNodeDisplay from './EnhancedNodeDisplay';
import SmartFlowLayout from './SmartFlowLayout';

/**
 * Flow Enhancement Suite
 * Comprehensive visual improvement system for workflow visualization
 */
const FlowEnhancementSuite = ({
  nodes = [],
  edges = [],
  onNodesChange,
  onEdgesChange,
  containerRef,
  // Props from parent FlowCanvass
  enhancementMode = 'smart',
  onEnhancementModeChange,
  focusedNodeId = null,
  onFocusedNodeChange,
  showFlowEnhancements = true,
  onShowFlowEnhancementsChange,
  className = ""
}) => {
  // Use props from parent instead of internal state
  const [showConnections, setShowConnections] = useState(true);
  const [themeMode, setThemeMode] = useState('light'); // 'light', 'dark', 'auto'

  // Enhancement configurations
  const enhancementConfigs = {
    smart: {
      name: '🧠 Smart Mode',
      description: 'Intelligent layout with auto-organization',
      features: ['Smart Layout', 'Enhanced Nodes', 'Flow Lanes']
    },
    lanes: {
      name: '🛤️ Lanes Mode',
      description: 'Organized lanes for clear workflow structure',
      features: ['Flow Lanes', 'Category Grouping', 'Clean Routing']
    },
    compact: {
      name: '📦 Compact Mode',
      description: 'Minimal nodes with hover details',
      features: ['Minimal Nodes', 'Hover Expansion', 'Dense Layout']
    },
    focus: {
      name: '🎯 Focus Mode',
      description: 'Highlight specific workflow paths',
      features: ['Path Highlighting', 'Node Dimming', 'Connection Focus']
    }
  };

  // Node visibility and filtering
  const getVisibleNodes = useCallback(() => {
    if (!showFlowEnhancements) return nodes;

    switch (enhancementMode) {
      case 'focus':
        if (!focusedNodeId) return nodes;
        
        // Show focused node and its connections
        const connectedNodeIds = new Set([focusedNodeId]);
        edges.forEach(edge => {
          if (edge.source === focusedNodeId) connectedNodeIds.add(edge.target);
          if (edge.target === focusedNodeId) connectedNodeIds.add(edge.source);
        });
        
        return nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            dimmed: !connectedNodeIds.has(node.id),
            highlighted: node.id === focusedNodeId
          }
        }));

      case 'compact':
        return nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            compact: true,
            minimal: true
          }
        }));

      default:
        return nodes;
    }
  }, [nodes, enhancementMode, showFlowEnhancements, focusedNodeId, edges]);

  // Edge visibility and styling
  const getVisibleEdges = useCallback(() => {
    if (!showFlowEnhancements || !showConnections) return edges;

    switch (enhancementMode) {
      case 'focus':
        if (!focusedNodeId) return edges;
        
        return edges.map(edge => ({
          ...edge,
          style: {
            ...edge.style,
            opacity: (edge.source === focusedNodeId || edge.target === focusedNodeId) ? 1 : 0.2,
            strokeWidth: (edge.source === focusedNodeId || edge.target === focusedNodeId) ? 3 : 1
          }
        }));

      case 'compact':
        return edges.map(edge => ({
          ...edge,
          style: {
            ...edge.style,
            strokeWidth: 1,
            opacity: 0.6
          }
        }));

      default:
        return edges;
    }
  }, [edges, enhancementMode, showFlowEnhancements, showConnections, focusedNodeId]);

  // Theme styles
  const getThemeStyles = useCallback(() => {
    const baseStyles = {
      light: {
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        nodeBackground: 'rgba(255, 255, 255, 0.9)',
        textColor: '#1a202c',
        borderColor: '#e2e8f0'
      },
      dark: {
        background: 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)',
        nodeBackground: 'rgba(45, 55, 72, 0.9)',
        textColor: '#f7fafc',
        borderColor: '#4a5568'
      }
    };

    return baseStyles[themeMode] || baseStyles.light;
  }, [themeMode]);

  // Performance optimization - memoize expensive calculations
  const nodeStats = useMemo(() => {
    const types = {};
    nodes.forEach(node => {
      const type = node.type || 'unknown';
      types[type] = (types[type] || 0) + 1;
    });

    return {
      total: nodes.length,
      connections: edges.length,
      types: Object.keys(types).length,
      distribution: types
    };
  }, [nodes, edges]);

  // Auto-save enhancement preferences
  useEffect(() => {
    const preferences = {
      enhancementMode,
      showFlowEnhancements,
      showConnections,
      themeMode
    };
    localStorage.setItem('flowEnhancementPreferences', JSON.stringify(preferences));
  }, [enhancementMode, showFlowEnhancements, showConnections, themeMode]);

  // Load saved preferences
  useEffect(() => {
    try {
      const saved = localStorage.getItem('flowEnhancementPreferences');
      if (saved) {
        const preferences = JSON.parse(saved);
        onEnhancementModeChange(preferences.enhancementMode || 'smart');
        onShowFlowEnhancementsChange(preferences.showFlowEnhancements !== false);
        setShowConnections(preferences.showConnections !== false);
        setThemeMode(preferences.themeMode || 'light');
      }
    } catch (error) {
      console.warn('Failed to load enhancement preferences:', error);
    }
  }, [onEnhancementModeChange, onShowFlowEnhancementsChange]);

  // Enhanced node selection handler
  const handleNodeClick = useCallback((nodeId) => {
    onFocusedNodeChange(focusedNodeId === nodeId ? null : nodeId);
  }, [focusedNodeId, onFocusedNodeChange]);

  // Quick enhancement toggles
  const quickActions = {
    toggleCompactMode: () => onEnhancementModeChange(enhancementMode === 'compact' ? 'smart' : 'compact'),
    toggleFocusMode: () => onEnhancementModeChange(enhancementMode === 'focus' ? 'smart' : 'focus'),
    toggleConnections: () => setShowConnections(!showConnections),
    toggleTheme: () => setThemeMode(themeMode === 'light' ? 'dark' : 'light'),
    resetView: () => {
      onFocusedNodeChange(null);
      setShowConnections(true);
      onEnhancementModeChange('smart');
    }
  };

  const visibleNodes = getVisibleNodes();
  const visibleEdges = getVisibleEdges();
  const themeStyles = getThemeStyles();

  return (
    <div 
      className={`flow-enhancement-suite relative ${className}`}
      style={{ background: themeStyles.background }}
    >
image.png      {/* Smart Layout Integration */}
      {showFlowEnhancements && enhancementMode === 'smart' && (
        <SmartFlowLayout
          nodes={visibleNodes}
          edges={visibleEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          containerRef={containerRef}
        />
      )}

      {/* Flow Lanes Integration */}
      {showFlowEnhancements && enhancementMode === 'lanes' && (
        <FlowLanes
          nodes={visibleNodes}
          edges={visibleEdges}
          onNodesChange={onNodesChange}
          className="flow-lanes-overlay"
        />
      )}

      {/* Enhanced Node Display Integration */}
      {showFlowEnhancements && (
        <div className="enhanced-nodes-overlay">
          {visibleNodes.map(node => (
            <EnhancedNodeDisplay
              key={node.id}
              node={node}
              isCompact={enhancementMode === 'compact'}
              isFocused={node.id === focusedNodeId}
              isDimmed={node.data?.dimmed}
              onClick={() => handleNodeClick(node.id)}
              themeStyles={themeStyles}
            />
          ))}
        </div>
      )}
    </div>
  );
};

FlowEnhancementSuite.propTypes = {
  nodes: PropTypes.array,
  edges: PropTypes.array,
  onNodesChange: PropTypes.func,
  onEdgesChange: PropTypes.func,
  containerRef: PropTypes.object,
  enhancementMode: PropTypes.string,
  onEnhancementModeChange: PropTypes.func,
  focusedNodeId: PropTypes.string,
  onFocusedNodeChange: PropTypes.func,
  showFlowEnhancements: PropTypes.bool,
  onShowFlowEnhancementsChange: PropTypes.func,
  className: PropTypes.string
};

export default FlowEnhancementSuite; 