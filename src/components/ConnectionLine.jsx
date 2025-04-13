import React from 'react';
import { getBezierPath, getSmoothStepPath, getStraightPath } from 'reactflow';
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
      strokeWidth: 3
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
      strokeWidth: 3
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
  baseStrokeWidth = 3,
  overlayStrokeWidth = 1,
  dashArray = '5,5',
  curvature = 0.5,
  // For backward compatibility
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  sourceType,
  targetType,
}) => {
  // Use the new prop names if available, otherwise fall back to the old ones
  const validFromX = fromX !== undefined ? fromX : sourceX;
  const validFromY = fromY !== undefined ? fromY : sourceY;
  const validFromPosition = fromPosition !== undefined ? fromPosition : sourcePosition;
  const validToX = toX !== undefined ? toX : targetX;
  const validToY = toY !== undefined ? toY : targetY;
  const validToPosition = toPosition !== undefined ? toPosition : targetPosition;

  // Ensure we have valid values
  const validatedFromX = isNaN(validFromX) ? 0 : validFromX;
  const validatedFromY = isNaN(validFromY) ? 0 : validFromY;
  const validatedToX = isNaN(validToX) ? validatedFromX + 50 : validToX;
  const validatedToY = isNaN(validToY) ? validatedFromY + 50 : validToY;

  let pathFunction;
  switch (connectionLineType) {
    case 'bezier':
      pathFunction = getBezierPath;
      break;
    case 'straight':
      pathFunction = getStraightPath;
      break;
    case 'smoothstep':
    case 'step':
    default:
      pathFunction = getSmoothStepPath;
      break;
  }

  const [edgePath] = pathFunction({
    sourceX: validatedFromX,
    sourceY: validatedFromY,
    sourcePosition: validFromPosition,
    targetX: validatedToX,
    targetY: validatedToY,
    targetPosition: validToPosition,
    curvature: curvature,
  });

  const animatedClass = animated ? 'animated' : '';
  const connectionLineId = `connection-line-${validatedFromX}-${validatedFromY}-${validatedToX}-${validatedToY}`;

  // Get connection style based on node types
  const connectionStyle = getConnectionStyle(sourceType, targetType);
  const gradientId = `gradient-${connectionLineId}`;

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
        className={animatedClass}
        d={edgePath}
        style={connectionLineStyle}
        strokeDasharray={connectionStyle.valid ? '' : '5,5'}
      />
      {showOverlay && (
        <path
          id={`${connectionLineId}-overlay`}
          fill="none"
          stroke={overlayStrokeColor}
          strokeWidth={overlayStrokeWidth}
          className={animatedClass}
          d={edgePath}
          style={connectionLineStyle}
          strokeDasharray={dashArray}
        />
      )}
    </g>
  );
};

ConnectionLine.propTypes = {
  // New prop names (React Flow v10+)
  fromX: PropTypes.number,
  fromY: PropTypes.number,
  fromPosition: PropTypes.string,
  toX: PropTypes.number,
  toY: PropTypes.number,
  toPosition: PropTypes.string,
  
  // Old prop names (for backward compatibility)
  sourceX: PropTypes.number,
  sourceY: PropTypes.number,
  sourcePosition: PropTypes.string,
  targetX: PropTypes.number,
  targetY: PropTypes.number,
  targetPosition: PropTypes.string,
  
  // Common props
  connectionLineType: PropTypes.oneOf(['bezier', 'straight', 'step', 'smoothstep', 'default']),
  connectionLineStyle: PropTypes.object,
  animated: PropTypes.bool,
  showOverlay: PropTypes.bool,
  baseStrokeColor: PropTypes.string,
  overlayStrokeColor: PropTypes.string,
  baseStrokeWidth: PropTypes.number,
  overlayStrokeWidth: PropTypes.number,
  dashArray: PropTypes.string,
  curvature: PropTypes.number,
  sourceType: PropTypes.string,
  targetType: PropTypes.string,
};

ConnectionLine.displayName = 'ConnectionLine';

export default ConnectionLine;
