import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * Enhanced Node Display System
 * Implements hierarchy-based sizing, minimal views, and hover-to-expand
 */
const EnhancedNodeDisplay = ({ 
  node, 
  isSelected = false,
  isConnected = false,
  executionStatus = 'idle',
  onNodeClick,
  onNodeHover,
  displayMode = 'minimal', // 'minimal', 'expanded', 'auto'
  className = ""
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [nodeSize, setNodeSize] = useState('medium');
  const nodeRef = useRef(null);

  // Define node hierarchy and sizing
  const getNodeHierarchy = (nodeType, nodeData) => {
    const hierarchies = {
      // Core workflow nodes (largest)
      'agent': { 
        size: 'large', 
        priority: 'core',
        icon: '🤖',
        color: 'purple',
        category: 'intelligence'
      },
      'task': { 
        size: 'large', 
        priority: 'core',
        icon: '📋',
        color: 'blue', 
        category: 'intelligence'
      },
      
      // Important nodes (medium)
      'trigger': { 
        size: 'medium', 
        priority: 'important',
        icon: '⚡',
        color: 'blue',
        category: 'data'
      },
      'logic': { 
        size: 'medium', 
        priority: 'important',
        icon: '🔀',
        color: 'orange',
        category: 'processing'
      },
      'input': { 
        size: 'medium', 
        priority: 'important',
        icon: '📥',
        color: 'gray',
        category: 'data'
      },
      
      // Support nodes (small)
      'tool': { 
        size: 'small', 
        priority: 'support',
        icon: '🔧',
        color: 'orange',
        category: 'processing'
      },
      'output': { 
        size: 'small', 
        priority: 'support',
        icon: '📤',
        color: 'green',
        category: 'data'
      },
      'chatbot': { 
        size: 'small', 
        priority: 'support',
        icon: '💬',
        color: 'blue',
        category: 'communication'
      },
      
      // Utility nodes (tiny)
      'delay': { 
        size: 'tiny', 
        priority: 'utility',
        icon: '⏰',
        color: 'gray',
        category: 'processing'
      }
    };

    const normalizedType = (nodeType || nodeData?.nodeType || '').toLowerCase();
    return hierarchies[normalizedType] || {
      size: 'medium',
      priority: 'normal', 
      icon: '📦',
      color: 'gray',
      category: 'other'
    };
  };

  const hierarchy = getNodeHierarchy(node.type, node.data);

  // Size configurations
  const sizeConfigs = {
    tiny: { width: 80, height: 60, fontSize: 'text-xs', padding: 'p-1' },
    small: { width: 120, height: 80, fontSize: 'text-sm', padding: 'p-2' },
    medium: { width: 180, height: 120, fontSize: 'text-sm', padding: 'p-3' },
    large: { width: 240, height: 160, fontSize: 'text-base', padding: 'p-4' }
  };

  const currentSize = sizeConfigs[hierarchy.size];

  // Color configurations
  const colorConfigs = {
    purple: {
      bg: 'from-purple-500 to-purple-600',
      bgLight: 'from-purple-50 to-purple-100', 
      border: 'border-purple-300',
      text: 'text-purple-700',
      shadow: 'shadow-purple-200/60'
    },
    blue: {
      bg: 'from-blue-500 to-blue-600',
      bgLight: 'from-blue-50 to-blue-100',
      border: 'border-blue-300', 
      text: 'text-blue-700',
      shadow: 'shadow-blue-200/60'
    },
    orange: {
      bg: 'from-orange-500 to-orange-600',
      bgLight: 'from-orange-50 to-orange-100',
      border: 'border-orange-300',
      text: 'text-orange-700', 
      shadow: 'shadow-orange-200/60'
    },
    green: {
      bg: 'from-green-500 to-green-600',
      bgLight: 'from-green-50 to-green-100',
      border: 'border-green-300',
      text: 'text-green-700',
      shadow: 'shadow-green-200/60'
    },
    gray: {
      bg: 'from-gray-500 to-gray-600', 
      bgLight: 'from-gray-50 to-gray-100',
      border: 'border-gray-300',
      text: 'text-gray-700',
      shadow: 'shadow-gray-200/60'
    }
  };

  const colors = colorConfigs[hierarchy.color] || colorConfigs.gray;

  // Status configurations
  const statusConfigs = {
    idle: { indicator: 'bg-gray-400', pulse: false },
    running: { indicator: 'bg-blue-500', pulse: true },
    success: { indicator: 'bg-green-500', pulse: false },
    error: { indicator: 'bg-red-500', pulse: true },
    pending: { indicator: 'bg-yellow-500', pulse: true }
  };

  const status = statusConfigs[executionStatus] || statusConfigs.idle;

  // Determine what to show based on display mode and state
  const shouldShowMinimal = displayMode === 'minimal' && !isHovered && !isSelected;
  const shouldShowExpanded = displayMode === 'expanded' || isHovered || isSelected || showDetails;

  // Extract essential info for minimal display
  const getMinimalInfo = () => {
    return {
      title: node.data?.label || node.data?.role || node.type || 'Node',
      subtitle: getNodeSubtitle(),
      status: executionStatus
    };
  };

  const getNodeSubtitle = () => {
    const data = node.data || {};
    if (data.serviceName) return data.serviceName;
    if (data.goal) return data.goal.substring(0, 30) + '...';
    if (data.description) return data.description.substring(0, 30) + '...';
    return hierarchy.category;
  };

  // Handle mouse events
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (onNodeHover) onNodeHover(node, true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (onNodeHover) onNodeHover(node, false);
  };

  const handleClick = () => {
    setShowDetails(!showDetails);
    if (onNodeClick) onNodeClick(node);
  };

  // Responsive sizing based on zoom level
  useEffect(() => {
    const updateSize = () => {
      // This would integrate with your zoom level
      const zoomLevel = 1; // Get from your zoom context
      if (zoomLevel < 0.5) {
        setNodeSize('tiny');
      } else if (zoomLevel < 0.8) {
        setNodeSize('small');
      } else {
        setNodeSize(hierarchy.size);
      }
    };

    updateSize();
  }, [hierarchy.size]);

  return (
    <div
      ref={nodeRef}
      className={`
        enhanced-node relative cursor-pointer
        transition-all duration-300 ease-out
        ${isHovered ? 'z-20 scale-105' : 'z-10'}
        ${isSelected ? 'ring-4 ring-blue-400 ring-opacity-60' : ''}
        ${className}
      `}
      style={{
        width: currentSize.width,
        height: shouldShowExpanded ? 'auto' : currentSize.height,
        minHeight: currentSize.height
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Node Card */}
      <div className={`
        relative w-full h-full
        bg-gradient-to-br ${colors.bgLight}
        border-2 ${isSelected ? 'border-blue-400' : colors.border}
        rounded-2xl shadow-lg ${colors.shadow}
        hover:shadow-xl
        ${isHovered ? 'shadow-2xl' : ''}
        transition-all duration-300
      `}>
        
        {/* Status Indicator */}
        <div className={`
          absolute -top-1 -right-1 w-4 h-4 rounded-full
          ${status.indicator} border-2 border-white
          ${status.pulse ? 'animate-pulse' : ''}
          shadow-lg z-10
        `} />

        {/* Priority Badge */}
        {hierarchy.priority === 'core' && (
          <div className="absolute -top-2 -left-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-yellow-900 shadow-lg">
            ⭐
          </div>
        )}

        {/* Minimal Display */}
        {shouldShowMinimal && (
          <div className={`${currentSize.padding} h-full flex flex-col justify-center`}>
            <div className="text-center">
              <div className="text-2xl mb-1">{hierarchy.icon}</div>
              <div className={`font-semibold ${currentSize.fontSize} ${colors.text} line-clamp-1`}>
                {getMinimalInfo().title}
              </div>
              <div className={`text-xs text-gray-500 line-clamp-1 mt-1`}>
                {getMinimalInfo().subtitle}
              </div>
            </div>
          </div>
        )}

        {/* Expanded Display */}
        {shouldShowExpanded && (
          <div className={`${currentSize.padding}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`
                  w-8 h-8 rounded-lg bg-gradient-to-br ${colors.bg}
                  flex items-center justify-center text-white text-lg
                  shadow-lg
                `}>
                  {hierarchy.icon}
                </div>
                <div>
                  <div className={`font-bold ${colors.text} text-sm line-clamp-1`}>
                    {node.data?.label || node.data?.role || node.type}
                  </div>
                  <div className="text-xs text-gray-500">
                    {hierarchy.category}
                  </div>
                </div>
              </div>
              
              {/* Expand Toggle */}
              <button
                className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-xs hover:bg-gray-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetails(!showDetails);
                }}
              >
                {showDetails ? '−' : '+'}
              </button>
            </div>

            {/* Content Preview */}
            <div className="space-y-2">
              {node.data?.goal && (
                <div>
                  <div className="text-xs font-medium text-gray-600">Goal:</div>
                  <div className={`text-xs ${colors.text} line-clamp-2`}>
                    {node.data.goal}
                  </div>
                </div>
              )}
              
              {node.data?.serviceName && (
                <div>
                  <div className="text-xs font-medium text-gray-600">Service:</div>
                  <div className={`text-xs ${colors.text}`}>
                    {node.data.serviceName}
                  </div>
                </div>
              )}
              
              {node.data?.description && (
                <div>
                  <div className="text-xs font-medium text-gray-600">Description:</div>
                  <div className={`text-xs ${colors.text} line-clamp-2`}>
                    {node.data.description}
                  </div>
                </div>
              )}

              {/* Connection Points */}
              <div className="flex justify-between items-center pt-2">
                <div className="text-xs text-gray-500">
                  {isConnected ? '🔗 Connected' : '⚪ Standalone'}
                </div>
                <div className="text-xs text-gray-500">
                  {hierarchy.priority}
                </div>
              </div>
            </div>

            {/* Full Details (when expanded) */}
            {showDetails && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs space-y-2">
                  {Object.entries(node.data || {}).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium text-gray-600">{key}:</span>
                      <span className="ml-1 text-gray-800">
                        {typeof value === 'string' 
                          ? value.length > 50 
                            ? value.substring(0, 50) + '...'
                            : value
                          : JSON.stringify(value)
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hover Hint */}
        {!shouldShowExpanded && isHovered && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            Click to expand
          </div>
        )}
      </div>
    </div>
  );
};

EnhancedNodeDisplay.propTypes = {
  node: PropTypes.object.isRequired,
  isSelected: PropTypes.bool,
  isConnected: PropTypes.bool,
  executionStatus: PropTypes.oneOf(['idle', 'running', 'success', 'error', 'pending']),
  onNodeClick: PropTypes.func,
  onNodeHover: PropTypes.func,
  displayMode: PropTypes.oneOf(['minimal', 'expanded', 'auto']),
  className: PropTypes.string
};

export default EnhancedNodeDisplay; 