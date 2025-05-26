import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useStore } from 'reactflow';
import PropTypes from 'prop-types';

// Simple flowing particle component
const FlowingParticle = ({ 
  path, 
  duration = 2000, 
  delay = 0, 
  color = '#3b82f6', 
  size = 3,
  isActive = false
}) => {
  const [position, setPosition] = useState(0);

  useEffect(() => {
    if (!isActive || !path) return;

    const startTime = Date.now() + delay;
    let animationId;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= 0) {
        const progress = ((elapsed % duration) / duration);
        setPosition(progress);
      }
      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [duration, delay, isActive, path]);

  if (!isActive || !path) return null;

  // Create path element to get point at length
  const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathElement.setAttribute('d', path);
  
  let point = { x: 0, y: 0 };
  try {
    const pathLength = pathElement.getTotalLength?.() || 0;
    point = pathElement.getPointAtLength?.(position * pathLength) || { x: 0, y: 0 };
  } catch (error) {
    // Fallback if path calculation fails
    return null;
  }

  return (
    <circle
      cx={point.x}
      cy={point.y}
      r={size}
      fill={color}
      style={{
        filter: `drop-shadow(0 0 4px ${color})`,
      }}
      className="animate-pulse"
    />
  );
};

// Simple connection label
const ConnectionLabel = ({ 
  labelX, 
  labelY, 
  label, 
  isActive = false
}) => {
  if (!label) return null;

  return (
    <g>
      <rect
        x={labelX - 30}
        y={labelY - 10}
        width={60}
        height={20}
        rx={10}
        fill="white"
        stroke={isActive ? '#3b82f6' : '#9ca3af'}
        strokeWidth={1}
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
        }}
      />
      <text
        x={labelX}
        y={labelY + 4}
        textAnchor="middle"
        className="text-xs font-medium"
        fill={isActive ? '#3b82f6' : '#6b7280'}
      >
        {label}
      </text>
    </g>
  );
};

// Get connection style based on state
const getConnectionStyle = (data = {}) => {
  const state = data.state || 'idle';
  
  switch (state) {
    case 'active':
    case 'processing':
      return {
        stroke: '#3b82f6',
        strokeWidth: 3,
        animated: true,
        particles: true,
        glow: true
      };
    case 'success':
      return {
        stroke: '#22c55e',
        strokeWidth: 2,
        animated: false,
        particles: false,
        glow: false
      };
    case 'error':
      return {
        stroke: '#ef4444',
        strokeWidth: 2,
        animated: false,
        particles: false,
        glow: false,
        dashArray: '5,5'
      };
    default:
      return {
        stroke: '#9ca3af',
        strokeWidth: 2,
        animated: false,
        particles: false,
        glow: false
      };
  }
};

// Main AnimatedEdge component - simplified for better performance
const AnimatedEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data = {},
  markerEnd,
  selected
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Calculate bezier path - this will update automatically when positions change
  const [edgePath, labelX, labelY] = useMemo(() => {
    return getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
  }, [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition]);

  // Get connection styling
  const connectionStyle = useMemo(() => 
    getConnectionStyle(data),
    [data]
  );

  // Generate unique IDs
  const gradientId = `gradient-${id}`;
  const markerId = `marker-${id}`;

  const isActive = data.state === 'active' || data.state === 'processing';

  return (
    <>
      <defs>
        {/* Gradient */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={connectionStyle.stroke} />
          <stop offset="100%" stopColor={connectionStyle.stroke} opacity="0.6" />
        </linearGradient>

        {/* Arrow marker */}
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="9"
          refY="3"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,6 L9,3 z"
            fill={connectionStyle.stroke}
          />
        </marker>
      </defs>

      {/* Glow effect for active connections */}
      {connectionStyle.glow && (
        <path
          d={edgePath}
          stroke={connectionStyle.stroke}
          strokeWidth={connectionStyle.strokeWidth + 4}
          fill="none"
          opacity="0.3"
          className="animate-pulse"
        />
      )}

      {/* Main connection path */}
      <BaseEdge
        path={edgePath}
        style={{
          ...style,
          stroke: isActive ? `url(#${gradientId})` : connectionStyle.stroke,
          strokeWidth: connectionStyle.strokeWidth,
          strokeDasharray: connectionStyle.dashArray,
        }}
        markerEnd={`url(#${markerId})`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Flowing particles for active connections */}
      {connectionStyle.particles && isActive && (
        <>
          <FlowingParticle
            path={edgePath}
            duration={2000}
            delay={0}
            color={connectionStyle.stroke}
            isActive={true}
          />
          <FlowingParticle
            path={edgePath}
            duration={2000}
            delay={666}
            color={connectionStyle.stroke}
            isActive={true}
          />
          <FlowingParticle
            path={edgePath}
            duration={2000}
            delay={1333}
            color={connectionStyle.stroke}
            isActive={true}
          />
        </>
      )}

      {/* Connection label */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {(data.label || isHovered) && (
            <div
              className={`
                px-2 py-1 rounded-full text-xs font-medium border
                ${isActive 
                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                  : 'bg-white text-gray-600 border-gray-200'
                }
                shadow-sm transition-all duration-200
              `}
            >
              {data.label || 'Connection'}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

AnimatedEdge.propTypes = {
  id: PropTypes.string.isRequired,
  sourceX: PropTypes.number.isRequired,
  sourceY: PropTypes.number.isRequired,
  targetX: PropTypes.number.isRequired,
  targetY: PropTypes.number.isRequired,
  sourcePosition: PropTypes.string,
  targetPosition: PropTypes.string,
  style: PropTypes.object,
  data: PropTypes.object,
  markerEnd: PropTypes.string,
  selected: PropTypes.bool,
};

export default AnimatedEdge; 