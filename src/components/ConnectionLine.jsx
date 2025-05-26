import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Animated particle component
const FlowingParticle = ({ path, duration, delay, color, size = 3 }) => {
  const [position, setPosition] = useState(0);

  useEffect(() => {
    const startTime = Date.now() + delay;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= 0) {
        const progress = ((elapsed % duration) / duration);
        setPosition(progress);
      }
      requestAnimationFrame(animate);
    };
    animate();
  }, [duration, delay]);

  if (!path) return null;

  const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathElement.setAttribute('d', path);
  const pathLength = pathElement.getTotalLength?.() || 0;
  const point = pathElement.getPointAtLength?.(position * pathLength) || { x: 0, y: 0 };

  return (
    <circle
      cx={point.x}
      cy={point.y}
      r={size}
      fill={color}
      className="animate-pulse"
      style={{
        filter: 'drop-shadow(0 0 3px currentColor)',
        opacity: 0.8
      }}
    />
  );
};

// Connection label component
const ConnectionLabel = ({ path, label, isActive }) => {
  if (!path || !label) return null;

  const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathElement.setAttribute('d', path);
  const pathLength = pathElement.getTotalLength?.() || 0;
  const midPoint = pathElement.getPointAtLength?.(pathLength * 0.5) || { x: 0, y: 0 };

  return (
    <g>
      <rect
        x={midPoint.x - 25}
        y={midPoint.y - 8}
        width={50}
        height={16}
        rx={8}
        fill="white"
        stroke={isActive ? '#3b82f6' : '#9ca3af'}
        strokeWidth={1}
        className={`transition-all duration-300 ${isActive ? 'drop-shadow-md' : ''}`}
      />
      <text
        x={midPoint.x}
        y={midPoint.y + 3}
        textAnchor="middle"
        className={`text-xs font-medium fill-current ${
          isActive ? 'text-blue-600' : 'text-gray-600'
        }`}
      >
        {label}
      </text>
    </g>
  );
};

// Update the getConnectionStyle function to handle all connection types and states
const getConnectionStyle = (sourceType, targetType, sourceHandle, connectionState = 'idle', dataType = null) => {
  // Get base connection type styling
  const getBaseStyle = () => {
    // Special styling for logic node connections
    if (sourceType === 'logic') {
      if (sourceHandle === 'true') {
        return {
          type: 'success',
          gradient: { start: '#22c55e', end: '#16a34a' },
          stroke: '#22c55e',
          strokeWidth: 3,
          dashArray: null,
          particles: true,
          particleColor: '#22c55e'
        };
      } else if (sourceHandle === 'false') {
        return {
          type: 'error',
          gradient: { start: '#ef4444', end: '#dc2626' },
          stroke: '#ef4444',
          strokeWidth: 3,
          dashArray: null,
          particles: true,
          particleColor: '#ef4444'
        };
      }
    }

    // Error connections
    if (connectionState === 'error') {
      return {
        type: 'error',
        gradient: { start: '#ef4444', end: '#dc2626' },
        stroke: '#ef4444',
        strokeWidth: 2,
        dashArray: '3,3',
        particles: false,
        particleColor: '#ef4444'
      };
    }

    // Success connections
    if (connectionState === 'success') {
      return {
        type: 'success',
        gradient: { start: '#22c55e', end: '#16a34a' },
        stroke: '#22c55e',
        strokeWidth: 3,
        dashArray: null,
        particles: true,
        particleColor: '#22c55e'
      };
    }

    // Active/processing connections
    if (connectionState === 'active' || connectionState === 'processing') {
      return {
        type: 'active',
        gradient: { start: '#3b82f6', end: '#1d4ed8' },
        stroke: '#3b82f6',
        strokeWidth: 4,
        dashArray: null,
        particles: true,
        particleColor: '#3b82f6',
        pulse: true
      };
    }

    // Data type specific styling
    if (dataType) {
      switch (dataType) {
        case 'file':
          return {
            type: 'data',
            gradient: { start: '#8b5cf6', end: '#7c3aed' },
            stroke: '#8b5cf6',
            strokeWidth: 2,
            dashArray: null,
            particles: false,
            particleColor: '#8b5cf6'
          };
        case 'text':
          return {
            type: 'data',
            gradient: { start: '#06b6d4', end: '#0891b2' },
            stroke: '#06b6d4',
            strokeWidth: 2,
            dashArray: null,
            particles: false,
            particleColor: '#06b6d4'
          };
        case 'api':
          return {
            type: 'data',
            gradient: { start: '#f59e0b', end: '#d97706' },
            stroke: '#f59e0b',
            strokeWidth: 2,
            dashArray: null,
            particles: false,
            particleColor: '#f59e0b'
          };
      }
    }

    // Default style for when we're just starting a connection
    if (!targetType) {
      return {
        type: 'preview',
        gradient: { start: '#4299e1', end: '#9f7aea' },
        stroke: '#4299e1',
        strokeWidth: 2,
        dashArray: '5,5',
        particles: false,
        particleColor: '#4299e1'
      };
    }

    // Normalize types
    const normalizedSourceType = sourceType?.replace('Node', '').toLowerCase();
    const normalizedTargetType = targetType?.replace('Node', '').toLowerCase();
    
    // Define valid connections
    const validConnections = [
      { source: 'tool', target: 'agent' },
      { source: 'agent', target: 'task' },
      { source: 'task', target: 'task' },
      { source: 'trigger', target: 'agent' },
      { source: 'trigger', target: 'task' },
      { source: 'trigger', target: 'tool' },
      { source: 'trigger', target: 'chatbot' },
      { source: 'trigger', target: 'logic' },
      { source: 'logic', target: 'agent' },
      { source: 'logic', target: 'task' },
      { source: 'logic', target: 'tool' },
      { source: 'logic', target: 'chatbot' },
      { source: 'logic', target: 'logic' },
      { source: 'chatbot', target: 'agent' },
      { source: 'chatbot', target: 'task' },
      { source: 'agent', target: 'chatbot' },
      { source: 'task', target: 'chatbot' },
      { source: 'tool', target: 'chatbot' },
      { source: 'delay', target: 'agent' },
      { source: 'delay', target: 'task' },
      { source: 'delay', target: 'tool' },
      { source: 'delay', target: 'chatbot' },
      { source: 'delay', target: 'logic' },
      { source: 'input', target: 'agent' },
      { source: 'input', target: 'task' },
      { source: 'input', target: 'tool' },
      { source: 'agent', target: 'output' },
      { source: 'task', target: 'output' },
      { source: 'tool', target: 'output' }
    ];
    
    // Check if the connection is valid
    const isValid = validConnections.some(
      conn => conn.source === normalizedSourceType && conn.target === normalizedTargetType
    );
    
    // Return appropriate style based on validity
    if (isValid) {
      return {
        type: 'valid',
        gradient: { start: '#4299e1', end: '#9f7aea' },
        stroke: '#4299e1',
        strokeWidth: 2,
        dashArray: null,
        particles: false,
        particleColor: '#4299e1'
      };
    } else {
      return {
        type: 'invalid',
        gradient: { start: '#f56565', end: '#e53e3e' },
        stroke: '#f56565',
        strokeWidth: 2,
        dashArray: '3,3',
        particles: false,
        particleColor: '#f56565'
      };
    }
  };

  return getBaseStyle();
};

// Smart path calculation with bezier curves and obstacle avoidance
const calculateSmartPath = (fromX, fromY, toX, toY, fromPosition, toPosition, obstacles = []) => {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Calculate control points based on positions and distance
  let cp1x, cp1y, cp2x, cp2y;
  
  // Determine control point offset based on connection direction
  const offset = Math.min(distance * 0.4, 150);
  
  switch (fromPosition) {
    case 'right':
      cp1x = fromX + offset;
      cp1y = fromY;
      break;
    case 'left':
      cp1x = fromX - offset;
      cp1y = fromY;
      break;
    case 'bottom':
      cp1x = fromX;
      cp1y = fromY + offset;
      break;
    case 'top':
    default:
      cp1x = fromX;
      cp1y = fromY - offset;
      break;
  }
  
  switch (toPosition) {
    case 'left':
      cp2x = toX - offset;
      cp2y = toY;
      break;
    case 'right':
      cp2x = toX + offset;
      cp2y = toY;
      break;
    case 'top':
      cp2x = toX;
      cp2y = toY - offset;
      break;
    case 'bottom':
    default:
      cp2x = toX;
      cp2y = toY + offset;
      break;
  }
  
  // Simple obstacle avoidance - adjust control points if they intersect with obstacles
  obstacles.forEach(obstacle => {
    const { x, y, width, height } = obstacle;
    
    // Check if control points are inside obstacles and adjust
    if (cp1x >= x && cp1x <= x + width && cp1y >= y && cp1y <= y + height) {
      cp1y += height + 20;
    }
    if (cp2x >= x && cp2x <= x + width && cp2y >= y && cp2y <= y + height) {
      cp2y += height + 20;
    }
  });
  
  return `M${fromX},${fromY} C${cp1x},${cp1y} ${cp2x},${cp2y} ${toX},${toY}`;
};

/**
 * Enhanced ConnectionLine component with animations and smart routing
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
  sourceType,
  targetType,
  sourceHandle,
  connectionState = 'idle',
  dataType = null,
  label = null,
  obstacles = [],
  showParticles = true,
  showLabel = true
}) => {
  // Ensure we have valid values
  const validatedFromX = isNaN(fromX) ? 0 : fromX;
  const validatedFromY = isNaN(fromY) ? 0 : fromY;
  const validatedToX = isNaN(toX) ? validatedFromX + 50 : toX;
  const validatedToY = isNaN(toY) ? validatedFromY + 50 : toY;

  // Get connection style based on node types and state
  const connectionStyle = getConnectionStyle(sourceType, targetType, sourceHandle, connectionState, dataType);
  const connectionLineId = `connection-line-${validatedFromX}-${validatedFromY}-${validatedToX}-${validatedToY}`;
  const gradientId = `gradient-${connectionLineId}`;

  // Calculate smart path with bezier curves
  const path = calculateSmartPath(
    validatedFromX, 
    validatedFromY, 
    validatedToX, 
    validatedToY,
    fromPosition,
    toPosition,
    obstacles
  );

  // Determine if connection is active
  const isActive = connectionState === 'active' || connectionState === 'processing';
  const isError = connectionState === 'error';
  const isSuccess = connectionState === 'success';

  return (
    <g key={connectionLineId}>
      <defs>
        {/* Main gradient */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={connectionStyle.gradient.start} />
          <stop offset="100%" stopColor={connectionStyle.gradient.end} />
        </linearGradient>
        
        {/* Animated gradient for active connections */}
        {isActive && (
          <linearGradient id={`${gradientId}-animated`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={connectionStyle.gradient.start}>
              <animate attributeName="stop-color" 
                values={`${connectionStyle.gradient.start};${connectionStyle.gradient.end};${connectionStyle.gradient.start}`}
                dur="2s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor={connectionStyle.gradient.end}>
              <animate attributeName="stop-color" 
                values={`${connectionStyle.gradient.end};${connectionStyle.gradient.start};${connectionStyle.gradient.end}`}
                dur="2s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
        )}

        {/* Glow filter for active connections */}
        <filter id={`glow-${connectionLineId}`}>
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Arrow marker */}
        <marker
          id={`arrow-${connectionLineId}`}
          viewBox="0 0 10 10"
          refX="9"
          refY="3"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill={connectionStyle.stroke} />
        </marker>
      </defs>

      {/* Background glow for active connections */}
      {isActive && (
        <path
          fill="none"
          stroke={connectionStyle.stroke}
          strokeWidth={connectionStyle.strokeWidth + 4}
          d={path}
          opacity="0.3"
          filter={`url(#glow-${connectionLineId})`}
          className="animate-pulse"
        />
      )}

      {/* Main connection path */}
      <path
        id={`${connectionLineId}-base`}
        fill="none"
        stroke={isActive ? `url(#${gradientId}-animated)` : `url(#${gradientId})`}
        strokeWidth={connectionStyle.strokeWidth}
        d={path}
        style={connectionLineStyle}
        strokeDasharray={connectionStyle.dashArray}
        markerEnd={`url(#arrow-${connectionLineId})`}
        className={`transition-all duration-300 ${
          connectionStyle.pulse ? 'animate-pulse' : ''
        }`}
      />

      {/* Flowing particles for active connections */}
      {showParticles && connectionStyle.particles && isActive && (
        <>
          <FlowingParticle 
            path={path} 
            duration={2000} 
            delay={0} 
            color={connectionStyle.particleColor}
            size={3}
          />
          <FlowingParticle 
            path={path} 
            duration={2000} 
            delay={500} 
            color={connectionStyle.particleColor}
            size={2}
          />
          <FlowingParticle 
            path={path} 
            duration={2000} 
            delay={1000} 
            color={connectionStyle.particleColor}
            size={3}
          />
        </>
      )}

      {/* Connection label */}
      {showLabel && label && (
        <ConnectionLabel 
          path={path} 
          label={label} 
          isActive={isActive}
        />
      )}

      {/* Start point indicator */}
      <circle 
        cx={validatedFromX} 
        cy={validatedFromY} 
        r={isActive ? 4 : 3}
        fill={connectionStyle.stroke}
        className={isActive ? 'animate-pulse' : ''}
      />

      {/* End point indicator */}
      <circle 
        cx={validatedToX} 
        cy={validatedToY} 
        r={isActive ? 4 : 3}
        fill={connectionStyle.gradient.end}
        className={isActive ? 'animate-pulse' : ''}
      />
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
  sourceType: PropTypes.string,
  targetType: PropTypes.string,
  sourceHandle: PropTypes.string,
  connectionState: PropTypes.oneOf(['idle', 'active', 'processing', 'success', 'error']),
  dataType: PropTypes.string,
  label: PropTypes.string,
  obstacles: PropTypes.array,
  showParticles: PropTypes.bool,
  showLabel: PropTypes.bool,
};

ConnectionLine.displayName = 'ConnectionLine';

export default ConnectionLine;
