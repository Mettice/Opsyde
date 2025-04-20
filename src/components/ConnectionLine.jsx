import React from 'react';
import PropTypes from 'prop-types';

// Update the getConnectionStyle function to handle all valid connection types
const getConnectionStyle = (sourceType, targetType, sourceHandle) => {
  // Special styling for logic node connections
  if (sourceType === 'logic') {
    if (sourceHandle === 'true') {
      return {
        gradient: {
          startColor: '#22c55e', // green
          stopColor: '#22c55e',
        },
        stroke: '#22c55e',
        strokeWidth: 2,
        dashArray: null,
      };
    } else if (sourceHandle === 'false') {
      return {
        gradient: {
          startColor: '#ef4444', // red
          stopColor: '#ef4444',
        },
        stroke: '#ef4444',
        strokeWidth: 2,
        dashArray: null,
      };
    }
  }
  
  // Default style for when we're just starting a connection
  if (!targetType) {
    return {
      gradient: {
        start: '#4299e1',
        end: '#9f7aea'
      },
      valid: true,
      strokeWidth: 2
    };
  }
  
  // Normalize types
  const normalizedSourceType = sourceType?.replace('Node', '').toLowerCase();
  const normalizedTargetType = targetType?.replace('Node', '').toLowerCase();
  
  // Define valid connections
  const validConnections = [
    // Tool → Agent (allowed)
    { source: 'tool', target: 'agent' },
    
    // Agent → Task (allowed)
    { source: 'agent', target: 'task' },
    
    // Task → Task (dependency, allowed)
    { source: 'task', target: 'task' },
    
    // Trigger can connect to any node
    { source: 'trigger', target: 'agent' },
    { source: 'trigger', target: 'task' },
    { source: 'trigger', target: 'tool' },
    { source: 'trigger', target: 'chatbot' },
    { source: 'trigger', target: 'logic' },
    
    // Logic can connect to any node
    { source: 'logic', target: 'agent' },
    { source: 'logic', target: 'task' },
    { source: 'logic', target: 'tool' },
    { source: 'logic', target: 'chatbot' },
    { source: 'logic', target: 'logic' },
    
    // Chat connections
    { source: 'chatbot', target: 'agent' },
    { source: 'chatbot', target: 'task' },
    { source: 'agent', target: 'chatbot' },
    { source: 'task', target: 'chatbot' },
    { source: 'tool', target: 'chatbot' },
    
    // Delay can connect to any node
    { source: 'delay', target: 'agent' },
    { source: 'delay', target: 'task' },
    { source: 'delay', target: 'tool' },
    { source: 'delay', target: 'chatbot' },
    { source: 'delay', target: 'logic' },
  ];
  
  // Check if the connection is valid
  const isValid = validConnections.some(
    conn => conn.source === normalizedSourceType && conn.target === normalizedTargetType
  );
  
  // Return appropriate style based on validity
  if (isValid) {
    return {
      gradient: {
        start: '#4299e1',
        end: '#9f7aea'
      },
      valid: true,
      strokeWidth: 2
    };
  } else {
    return {
      gradient: {
        start: '#f56565',
        end: '#e53e3e'
      },
      valid: false,
      strokeWidth: 2
    };
  }
};

/**
 * Custom ConnectionLine component for ReactFlow.
 */
const ConnectionLine = ({
  fromX,
  fromY,
  fromPosition,
  toX,
  toY,
  toPosition,
  connectionLineType = 'default',
  connectionLineStyle,
  animated = true,
  showOverlay = true,
  baseStrokeColor = '#b1b1b7',
  overlayStrokeColor = '#fff',
  baseStrokeWidth = 2,
  overlayStrokeWidth = 1,
  dashArray = '5,5',
  sourceType,
  targetType,
  sourceHandle,
}) => {
  // Ensure we have valid values
  const validatedFromX = isNaN(fromX) ? 0 : fromX;
  const validatedFromY = isNaN(fromY) ? 0 : fromY;
  const validatedToX = isNaN(toX) ? validatedFromX + 50 : toX;
  const validatedToY = isNaN(toY) ? validatedFromY + 50 : toY;

  // Get connection style based on node types
  const connectionStyle = getConnectionStyle(sourceType, targetType, sourceHandle);
  const connectionLineId = `connection-line-${validatedFromX}-${validatedFromY}-${validatedToX}-${validatedToY}`;
  const gradientId = `gradient-${connectionLineId}`;

  // Calculate control points for a smooth curved line
  // This creates a more natural curve like in your first screenshot
  const dx = Math.abs(validatedToX - validatedFromX);
  const dy = Math.abs(validatedToY - validatedFromY);
  const curvature = 0.5;
  
  // Calculate control points for a smooth S-curve
  let path;
  
  // If the nodes are far apart horizontally, use an S-curve
  if (dx > 100) {
    const cp1x = validatedFromX;
    const cp1y = validatedFromY + Math.min(80, dy * curvature);
    const cp2x = validatedToX;
    const cp2y = validatedToY - Math.min(80, dy * curvature);
    
    path = `M${validatedFromX},${validatedFromY} C${cp1x},${cp1y} ${cp2x},${cp2y} ${validatedToX},${validatedToY}`;
  } else {
    // For nodes that are closer, use a simple curve
    const midX = (validatedFromX + validatedToX) / 2;
    const midY = (validatedFromY + validatedToY) / 2;
    
    path = `M${validatedFromX},${validatedFromY} Q${midX},${midY} ${validatedToX},${validatedToY}`;
  }

  return (
    <g key={connectionLineId}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={connectionStyle.gradient.start} />
          <stop offset="100%" stopColor={connectionStyle.gradient.end} />
        </linearGradient>
      </defs>
      <path
        id={`${connectionLineId}-base`}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={connectionStyle.strokeWidth}
        className={animated ? 'animated' : ''}
        d={path}
        style={connectionLineStyle}
        strokeDasharray={connectionStyle.valid ? '' : '5,5'}
      />
      {showOverlay && (
        <path
          id={`${connectionLineId}-overlay`}
          fill="none"
          stroke={overlayStrokeColor}
          strokeWidth={overlayStrokeWidth}
          className={animated ? 'animated' : ''}
          d={path}
          style={connectionLineStyle}
          strokeDasharray={dashArray}
        />
      )}
      <circle cx={validatedFromX} cy={validatedFromY} fill={baseStrokeColor} r={3} />
    </g>
  );
};

ConnectionLine.propTypes = {
  fromX: PropTypes.number,
  fromY: PropTypes.number,
  fromPosition: PropTypes.string,
  toX: PropTypes.number,
  toY: PropTypes.number,
  toPosition: PropTypes.string,
  connectionLineType: PropTypes.string,
  connectionLineStyle: PropTypes.object,
  animated: PropTypes.bool,
  showOverlay: PropTypes.bool,
  baseStrokeColor: PropTypes.string,
  overlayStrokeColor: PropTypes.string,
  baseStrokeWidth: PropTypes.number,
  overlayStrokeWidth: PropTypes.number,
  dashArray: PropTypes.string,
  sourceType: PropTypes.string,
  targetType: PropTypes.string,
  sourceHandle: PropTypes.string,
};

ConnectionLine.displayName = 'ConnectionLine';

export default ConnectionLine;
