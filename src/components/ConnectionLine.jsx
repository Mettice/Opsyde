import React from 'react';
import PropTypes from 'prop-types';

// Add this function at the top of the file, before the ConnectionLine component
const getConnectionStyle = (sourceType, targetType) => {
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
  const normalizedSourceType = sourceType?.replace('Node', '');
  const normalizedTargetType = targetType?.replace('Node', '');
  
  // Valid connections
  if (
    (normalizedSourceType === 'tool' && normalizedTargetType === 'agent') ||
    (normalizedSourceType === 'agent' && normalizedTargetType === 'task') ||
    (normalizedSourceType === 'task' && normalizedTargetType === 'task')
  ) {
    return {
      gradient: {
        start: '#4299e1',
        end: '#9f7aea'
      },
      valid: true,
      strokeWidth: 2
    };
  }
  
  // Invalid connections
  return {
    gradient: {
      start: '#f56565',
      end: '#e53e3e'
    },
    valid: false,
    strokeWidth: 2
  };
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
}) => {
  // Ensure we have valid values
  const validatedFromX = isNaN(fromX) ? 0 : fromX;
  const validatedFromY = isNaN(fromY) ? 0 : fromY;
  const validatedToX = isNaN(toX) ? validatedFromX + 50 : toX;
  const validatedToY = isNaN(toY) ? validatedFromY + 50 : toY;

  // Get connection style based on node types
  const connectionStyle = getConnectionStyle(sourceType, targetType);
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
};

ConnectionLine.displayName = 'ConnectionLine';

export default ConnectionLine;
