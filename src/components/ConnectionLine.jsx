import React from 'react';
import { getBezierPath, getSmoothStepPath, getStraightPath } from 'reactflow';
import PropTypes from 'prop-types';

/**
 * Custom ConnectionLine component for ReactFlow.
 */
const ConnectionLine = ({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  connectionLineType = 'step',
  connectionLineStyle,
  animated = false,
  showOverlay = true,
  baseStrokeColor = '#b1b1b7',
  overlayStrokeColor = '#fff',
  baseStrokeWidth = 2,
  overlayStrokeWidth = 1,
  dashArray = '5,5',
}) => {
  let pathFunction;
  switch (connectionLineType) {
    case 'bezier':
      pathFunction = getBezierPath;
      break;
    case 'straight':
      pathFunction = getStraightPath;
      break;
    case 'step':
    default:
      pathFunction = getSmoothStepPath;
      break;
  }

  const validatedSourceX = isNaN(sourceX) ? 0 : sourceX;
  const validatedSourceY = isNaN(sourceY) ? 0 : sourceY;
  const validatedTargetX = isNaN(targetX) ? validatedSourceX + 50 : targetX;
  const validatedTargetY = isNaN(targetY) ? validatedSourceY + 50 : targetY;

  const [edgePath] = pathFunction({
    sourceX: validatedSourceX,
    sourceY: validatedSourceY,
    sourcePosition,
    targetX: validatedTargetX,
    targetY: validatedTargetY,
    targetPosition,
  });

  const animatedClass = animated ? 'animated' : '';
  const connectionLineId = `connection-line-${validatedSourceX}-${validatedSourceY}-${validatedTargetX}-${validatedTargetY}`;

  return (
    <g key={connectionLineId}>
      <path
        id={`${connectionLineId}-base`}
        fill="none"
        stroke={baseStrokeColor}
        strokeWidth={baseStrokeWidth}
        className={animatedClass}
        d={edgePath}
        style={connectionLineStyle}
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
  sourceX: PropTypes.number.isRequired,
  sourceY: PropTypes.number.isRequired,
  sourcePosition: PropTypes.string,
  targetX: PropTypes.number.isRequired,
  targetY: PropTypes.number.isRequired,
  targetPosition: PropTypes.string,
  connectionLineType: PropTypes.oneOf(['bezier', 'straight', 'step']),
  connectionLineStyle: PropTypes.object,
  animated: PropTypes.bool,
  showOverlay: PropTypes.bool,
  baseStrokeColor: PropTypes.string,
  overlayStrokeColor: PropTypes.string,
  baseStrokeWidth: PropTypes.number,
  overlayStrokeWidth: PropTypes.number,
  dashArray: PropTypes.string,
};

ConnectionLine.displayName = 'ConnectionLine';

export default ConnectionLine;
