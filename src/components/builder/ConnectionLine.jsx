// components/Builder/ConnectionLine.js
import React from 'react';

// Custom connection line component
const ConnectionLine = ({ fromX, fromY, toX, toY, connectionLineType, connectionLineStyle }) => {
  // Calculate controlPoint for a nice bezier curve
  const offsetX = Math.abs(toX - fromX) * 0.3;
  const controlPointX1 = fromX + offsetX;
  const controlPointX2 = toX - offsetX;
  
  return (
    <g>
      <path
        d={`M${fromX},${fromY} C${controlPointX1},${fromY} ${controlPointX2},${toY} ${toX},${toY}`}
        stroke="#909090"
        strokeWidth={2}
        strokeDasharray="5,5"
        fill="none"
        className="animated"
      />
      <circle
        cx={toX}
        cy={toY}
        r={4}
        fill="#909090"
      />
    </g>
  );
};

export default ConnectionLine;