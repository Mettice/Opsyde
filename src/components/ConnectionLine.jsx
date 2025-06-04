import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Enhanced animated particle component with glassmorphism effects
const FlowingParticle = ({ path, duration, delay, color, size = 4, isActive = true }) => {
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

  const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathElement.setAttribute('d', path);
  
  let point = { x: 0, y: 0 };
  try {
    const pathLength = pathElement.getTotalLength?.() || 0;
    point = pathElement.getPointAtLength?.(position * pathLength) || { x: 0, y: 0 };
  } catch (error) {
    return null;
  }

  return (
    <g>
      {/* Outer glow */}
      <circle
        cx={point.x}
        cy={point.y}
        r={size + 3}
        fill={color}
        opacity="0.3"
        className="animate-pulse"
        style={{
          filter: `blur(3px)`
        }}
      />
      {/* Main particle */}
      <circle
        cx={point.x}
        cy={point.y}
        r={size}
        fill={color}
        className="animate-pulse"
        style={{
          filter: `drop-shadow(0 0 8px ${color})`,
          opacity: 0.9
        }}
      />
      {/* Inner highlight */}
      <circle
        cx={point.x}
        cy={point.y}
        r={size - 1}
        fill="white"
        opacity="0.6"
      />
    </g>
  );
};

// Enhanced connection label with glassmorphism
const ConnectionLabel = ({ path, label, isActive, dataType }) => {
  if (!path || !label) return null;

  const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathElement.setAttribute('d', path);
  const pathLength = pathElement.getTotalLength?.() || 0;
  const midPoint = pathElement.getPointAtLength?.(pathLength * 0.5) || { x: 0, y: 0 };

  const getLabelColor = () => {
    if (isActive) return '#3b82f6';
    switch (dataType) {
      case 'success': return '#22c55e';
      case 'error': return '#ef4444';
      case 'processing': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const labelColor = getLabelColor();

  return (
    <g>
      {/* Background blur effect */}
      <rect
        x={midPoint.x - 35}
        y={midPoint.y - 12}
        width={70}
        height={24}
        rx={12}
        fill="white"
        opacity="0.1"
        style={{ filter: 'blur(8px)' }}
      />
      {/* Main label background */}
      <rect
        x={midPoint.x - 35}
        y={midPoint.y - 12}
        width={70}
        height={24}
        rx={12}
        fill="rgba(255, 255, 255, 0.9)"
        stroke={labelColor}
        strokeWidth={isActive ? 2 : 1}
        style={{
          filter: `drop-shadow(0 4px 12px rgba(0,0,0,0.15))`,
          backdropFilter: 'blur(10px)'
        }}
        className={isActive ? 'animate-pulse' : ''}
      />
      {/* Label text */}
      <text
        x={midPoint.x}
        y={midPoint.y + 4}
        textAnchor="middle"
        className="text-xs font-bold"
        fill={labelColor}
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
      >
        {label}
      </text>
      {/* Active indicator dot */}
      {isActive && (
        <circle
          cx={midPoint.x + 25}
          cy={midPoint.y - 8}
          r={3}
          fill={labelColor}
          className="animate-pulse"
        />
      )}
    </g>
  );
};

// Enhanced connection style system
const getConnectionStyle = (sourceType, targetType, sourceHandle, connectionState = 'idle', dataType = null) => {
  // Premium glassmorphism connection styles
  const getBaseStyle = () => {
    // Logic node connections with premium styling
    if (sourceType === 'logic') {
      if (sourceHandle === 'true') {
        return {
          type: 'success',
          gradient: { start: '#10b981', end: '#059669', mid: '#34d399' },
          stroke: '#10b981',
          strokeWidth: 6,
          dashArray: null,
          particles: true,
          particleColor: '#10b981',
          glow: true,
          premium: true
        };
      } else if (sourceHandle === 'false') {
        return {
          type: 'error',
          gradient: { start: '#f43f5e', end: '#e11d48', mid: '#fb7185' },
          stroke: '#f43f5e',
          strokeWidth: 6,
          dashArray: null,
          particles: true,
          particleColor: '#f43f5e',
          glow: true,
          premium: true
        };
      }
    }

    // State-based styling with enhanced effects
    switch (connectionState) {
      case 'error':
        return {
          type: 'error',
          gradient: { start: '#f43f5e', end: '#e11d48', mid: '#fb7185' },
          stroke: '#f43f5e',
          strokeWidth: 5,
          dashArray: '6,4',
          particles: false,
          particleColor: '#f43f5e',
          glow: true,
          premium: true
        };

      case 'success':
        return {
          type: 'success',
          gradient: { start: '#10b981', end: '#059669', mid: '#34d399' },
          stroke: '#10b981',
          strokeWidth: 6,
          dashArray: null,
          particles: true,
          particleColor: '#10b981',
          glow: true,
          premium: true
        };

      case 'active':
      case 'processing':
        return {
          type: 'active',
          gradient: { start: '#3b82f6', end: '#1d4ed8', mid: '#60a5fa' },
          stroke: '#3b82f6',
          strokeWidth: 7,
          dashArray: null,
          particles: true,
          particleColor: '#3b82f6',
          pulse: true,
          glow: true,
          premium: true
        };

      default:
        // Enhanced default style
        return {
          type: 'default',
          gradient: { start: '#6366f1', end: '#4f46e5', mid: '#818cf8' },
          stroke: '#6366f1',
          strokeWidth: 5,
          dashArray: null,
          particles: false,
          particleColor: '#6366f1',
          glow: false,
          premium: true
        };
    }
  };

  return getBaseStyle();
};

// Enhanced smart path calculation
const calculateSmartPath = (fromX, fromY, toX, toY, fromPosition, toPosition, obstacles = []) => {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Enhanced control point calculation for smoother curves
  let cp1x, cp1y, cp2x, cp2y;
  const offset = Math.min(distance * 0.5, 200); // Increased for more dramatic curves
  
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
  
  return `M${fromX},${fromY} C${cp1x},${cp1y} ${cp2x},${cp2y} ${toX},${toY}`;
};

/**
 * Premium ConnectionLine component with glassmorphism effects
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
  // Ensure valid values
  const validatedFromX = isNaN(fromX) ? 0 : fromX;
  const validatedFromY = isNaN(fromY) ? 0 : fromY;
  const validatedToX = isNaN(toX) ? validatedFromX + 50 : toX;
  const validatedToY = isNaN(toY) ? validatedFromY + 50 : toY;

  // Get enhanced connection style
  const connectionStyle = getConnectionStyle(sourceType, targetType, sourceHandle, connectionState, dataType);
  const connectionLineId = `connection-line-${validatedFromX}-${validatedFromY}-${validatedToX}-${validatedToY}`;
  const gradientId = `gradient-${connectionLineId}`;
  const glowId = `glow-${connectionLineId}`;

  // Calculate smart path
  const path = calculateSmartPath(
    validatedFromX, 
    validatedFromY, 
    validatedToX, 
    validatedToY,
    fromPosition,
    toPosition,
    obstacles
  );

  const isActive = connectionState === 'active' || connectionState === 'processing';

  return (
    <g key={connectionLineId}>
      <defs>
        {/* Enhanced gradient with mid-point */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={connectionStyle.gradient.start} />
          {connectionStyle.gradient.mid && (
            <stop offset="50%" stopColor={connectionStyle.gradient.mid} />
          )}
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
            <stop offset="50%" stopColor={connectionStyle.gradient.mid || connectionStyle.gradient.start}>
              <animate attributeName="stop-color" 
                values={`${connectionStyle.gradient.mid || connectionStyle.gradient.start};${connectionStyle.gradient.start};${connectionStyle.gradient.mid || connectionStyle.gradient.start}`}
                dur="2s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor={connectionStyle.gradient.end}>
              <animate attributeName="stop-color" 
                values={`${connectionStyle.gradient.end};${connectionStyle.gradient.start};${connectionStyle.gradient.end}`}
                dur="2s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
        )}

        {/* Enhanced glow filter */}
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Premium arrow marker */}
        <marker
          id={`arrow-${connectionLineId}`}
          viewBox="0 0 12 12"
          refX="11"
          refY="6"
          markerWidth="8"
          markerHeight="8"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path 
            d="M2,2 L2,10 L10,6 z" 
            fill={connectionStyle.stroke}
            style={{
              filter: `drop-shadow(0 0 4px ${connectionStyle.stroke})`
            }}
          />
        </marker>
      </defs>

      {/* Background glow for premium effect */}
      {connectionStyle.glow && (
        <>
          {/* Outer glow layer */}
          <path
            fill="none"
            stroke={connectionStyle.stroke}
            strokeWidth={connectionStyle.strokeWidth + 12}
            d={path}
            opacity="0.15"
            filter={`url(#${glowId})`}
            className={connectionStyle.pulse ? 'animate-pulse' : ''}
          />
          {/* Middle glow layer */}
          <path
            fill="none"
            stroke={connectionStyle.stroke}
            strokeWidth={connectionStyle.strokeWidth + 8}
            d={path}
            opacity="0.25"
            filter={`url(#${glowId})`}
            className={connectionStyle.pulse ? 'animate-pulse' : ''}
          />
          {/* Inner glow layer */}
          <path
            fill="none"
            stroke={connectionStyle.stroke}
            strokeWidth={connectionStyle.strokeWidth + 4}
            d={path}
            opacity="0.35"
            className={connectionStyle.pulse ? 'animate-pulse' : ''}
          />
        </>
      )}

      {/* Main connection path */}
      <path
        id={`${connectionLineId}-base`}
        fill="none"
        stroke={isActive ? `url(#${gradientId}-animated)` : `url(#${gradientId})`}
        strokeWidth={connectionStyle.strokeWidth}
        d={path}
        style={{
          ...connectionLineStyle,
          filter: connectionStyle.glow ? `drop-shadow(0 0 8px ${connectionStyle.stroke})` : 'none'
        }}
        strokeDasharray={connectionStyle.dashArray}
        markerEnd={`url(#arrow-${connectionLineId})`}
        className={`transition-all duration-300 ${
          connectionStyle.pulse ? 'animate-pulse' : ''
        }`}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Enhanced flowing particles */}
      {showParticles && connectionStyle.particles && isActive && (
        <>
          <FlowingParticle 
            path={path} 
            duration={2000} 
            delay={0} 
            color={connectionStyle.particleColor}
            size={4}
            isActive={true}
          />
          <FlowingParticle 
            path={path} 
            duration={2000} 
            delay={400} 
            color={connectionStyle.particleColor}
            size={3}
            isActive={true}
          />
          <FlowingParticle 
            path={path} 
            duration={2000} 
            delay={800} 
            color={connectionStyle.particleColor}
            size={4}
            isActive={true}
          />
          <FlowingParticle 
            path={path} 
            duration={2000} 
            delay={1200} 
            color={connectionStyle.particleColor}
            size={2}
            isActive={true}
          />
          <FlowingParticle 
            path={path} 
            duration={2000} 
            delay={1600} 
            color={connectionStyle.particleColor}
            size={3}
            isActive={true}
          />
        </>
      )}

      {/* Enhanced connection label */}
      {showLabel && label && (
        <ConnectionLabel 
          path={path} 
          label={label} 
          isActive={isActive}
          dataType={connectionState}
        />
      )}

      {/* Enhanced start point indicator */}
      <g>
        <circle 
          cx={validatedFromX} 
          cy={validatedFromY} 
          r={6}
          fill={connectionStyle.stroke}
          opacity="0.3"
          style={{ filter: 'blur(2px)' }}
        />
        <circle 
          cx={validatedFromX} 
          cy={validatedFromY} 
          r={isActive ? 5 : 4}
          fill={connectionStyle.stroke}
          style={{
            filter: `drop-shadow(0 0 6px ${connectionStyle.stroke})`
          }}
          className={isActive ? 'animate-pulse' : ''}
        />
        <circle 
          cx={validatedFromX} 
          cy={validatedFromY} 
          r={2}
          fill="white"
          opacity="0.8"
        />
      </g>

      {/* Enhanced end point indicator */}
      <g>
        <circle 
          cx={validatedToX} 
          cy={validatedToY} 
          r={6}
          fill={connectionStyle.gradient.end}
          opacity="0.3"
          style={{ filter: 'blur(2px)' }}
        />
        <circle 
          cx={validatedToX} 
          cy={validatedToY} 
          r={isActive ? 5 : 4}
          fill={connectionStyle.gradient.end}
          style={{
            filter: `drop-shadow(0 0 6px ${connectionStyle.gradient.end})`
          }}
          className={isActive ? 'animate-pulse' : ''}
        />
        <circle 
          cx={validatedToX} 
          cy={validatedToY} 
          r={2}
          fill="white"
          opacity="0.8"
        />
      </g>
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
