import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useStore } from 'reactflow';
import PropTypes from 'prop-types';

// Enhanced flowing particle component with trail effects
const FlowingParticle = ({ 
  path, 
  duration = 2000, 
  delay = 0, 
  color = '#3b82f6', 
  size = 4, 
  isActive = false,
  trailLength = 3,
  glowIntensity = 1
}) => {
  const [position, setPosition] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setIsVisible(false);
      return;
    }

    const startTime = Date.now() + delay;
    let animationId;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= 0) {
        setIsVisible(true);
        const progress = ((elapsed % duration) / duration);
        setPosition(progress);
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [duration, delay, isActive]);

  if (!path || !isVisible) return null;

  try {
    const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathElement.setAttribute('d', path);
    const pathLength = pathElement.getTotalLength?.() || 0;
    const point = pathElement.getPointAtLength?.(position * pathLength) || { x: 0, y: 0 };

    return (
      <g>
        {/* Particle trail */}
        {Array.from({ length: trailLength }, (_, i) => {
          const trailPosition = Math.max(0, position - (i + 1) * 0.05);
          const trailPoint = pathElement.getPointAtLength?.(trailPosition * pathLength) || { x: 0, y: 0 };
          const opacity = Math.max(0, 1 - (i + 1) * 0.3);
          const trailSize = size * (1 - (i + 1) * 0.2);
          
          return (
            <circle
              key={`trail-${i}`}
              cx={trailPoint.x}
              cy={trailPoint.y}
              r={trailSize}
              fill={color}
              opacity={opacity * 0.6}
              style={{
                filter: `drop-shadow(0 0 ${glowIntensity * 2}px ${color})`,
              }}
            />
          );
        })}
        
        {/* Main particle */}
        <circle
          cx={point.x}
          cy={point.y}
          r={size}
          fill={color}
          style={{
            filter: `drop-shadow(0 0 ${glowIntensity * 4}px ${color}) drop-shadow(0 0 ${glowIntensity * 8}px ${color})`,
            opacity: 0.9
          }}
        >
          <animate
            attributeName="r"
            values={`${size};${size * 1.2};${size}`}
            dur="0.8s"
            repeatCount="indefinite"
          />
        </circle>
        
        {/* Particle glow */}
        <circle
          cx={point.x}
          cy={point.y}
          r={size * 2}
          fill={color}
          opacity="0.3"
          style={{
            filter: `blur(${glowIntensity * 2}px)`,
          }}
        />
      </g>
    );
  } catch (error) {
    console.warn('Error rendering flowing particle:', error);
    return null;
  }
};

// Enhanced connection label with data preview
const ConnectionLabel = ({ 
  labelX, 
  labelY, 
  label, 
  isActive = false, 
  dataPreview = null,
  throughput = 0,
  dataType = 'data',
  onHover = null 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getDataTypeIcon = () => {
    switch (dataType) {
      case 'file': return '📁';
      case 'text': return '📝';
      case 'api': return '🔗';
      case 'json': return '📋';
      case 'image': return '🖼️';
      case 'processing': return '⚡';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '📊';
    }
  };

  const formatThroughput = (value) => {
    if (value < 1000) return `${value.toFixed(0)} B/s`;
    if (value < 1000000) return `${(value / 1000).toFixed(1)} KB/s`;
    return `${(value / 1000000).toFixed(1)} MB/s`;
  };

  return (
    <g>
      {/* Label background with glassmorphism effect */}
      <rect
        x={labelX - 40}
        y={labelY - 12}
        width={80}
        height={24}
        rx={12}
        fill="rgba(255, 255, 255, 0.9)"
        stroke={isActive ? '#3b82f6' : '#e5e7eb'}
        strokeWidth={isActive ? 2 : 1}
        style={{
          filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1)) drop-shadow(0 1px 3px rgba(0, 0, 0, 0.08))',
          backdropFilter: 'blur(8px)',
        }}
        onMouseEnter={() => {
          setIsHovered(true);
          onHover?.(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          onHover?.(false);
        }}
      />
      
      {/* Data type icon */}
      <text
        x={labelX - 25}
        y={labelY + 4}
        textAnchor="middle"
        className="text-sm"
        style={{ userSelect: 'none' }}
      >
        {getDataTypeIcon()}
      </text>
      
      {/* Label text */}
      <text
        x={labelX}
        y={labelY + 3}
        textAnchor="middle"
        className={`text-xs font-medium ${
          isActive ? 'fill-blue-600' : 'fill-gray-600'
        }`}
        style={{ userSelect: 'none' }}
      >
        {label || dataType}
      </text>
      
      {/* Throughput indicator */}
      {throughput > 0 && (
        <text
          x={labelX + 25}
          y={labelY + 3}
          textAnchor="middle"
          className="text-xs fill-green-600 font-mono"
          style={{ userSelect: 'none' }}
        >
          {formatThroughput(throughput)}
        </text>
      )}
      
      {/* Expanded info on hover */}
      {isHovered && dataPreview && (
        <g>
          <rect
            x={labelX - 60}
            y={labelY + 20}
            width={120}
            height={40}
            rx={8}
            fill="rgba(255, 255, 255, 0.95)"
            stroke="#e5e7eb"
            strokeWidth={1}
            style={{
              filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
            }}
          />
          <text
            x={labelX}
            y={labelY + 35}
            textAnchor="middle"
            className="text-xs fill-gray-700"
            style={{ userSelect: 'none' }}
          >
            {String(dataPreview).substring(0, 20)}...
          </text>
        </g>
      )}
      
      {/* Active pulse animation */}
      {isActive && (
        <circle
          cx={labelX}
          cy={labelY}
          r="15"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          opacity="0.6"
        >
          <animate
            attributeName="r"
            values="15;25;15"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.6;0;0.6"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      )}
    </g>
  );
};

// Enhanced connection style calculator
const getConnectionStyle = (data = {}, isActive = false, isHovered = false) => {
  const {
    state = 'idle',
    dataType = 'data',
    sourceType = '',
    targetType = '',
    sourceHandle = '',
    throughput = 0,
    errorRate = 0,
    latency = 0
  } = data;

  // Base style configuration
  const baseConfig = {
    strokeWidth: 2,
    animated: false,
    particles: false,
    particleCount: 1,
    glowIntensity: 1,
    dashArray: null,
    opacity: 1
  };

  // State-based styling
  switch (state) {
    case 'active':
    case 'processing':
      return {
        ...baseConfig,
        gradient: { start: '#3b82f6', end: '#1d4ed8' },
        strokeWidth: isHovered ? 5 : 4,
        animated: true,
        particles: true,
        particleCount: Math.min(Math.floor(throughput / 20) + 1, 5),
        glowIntensity: 2,
        opacity: 1
      };
      
    case 'success':
      return {
        ...baseConfig,
        gradient: { start: '#10b981', end: '#059669' },
        strokeWidth: isHovered ? 4 : 3,
        animated: true,
        particles: true,
        particleCount: 2,
        glowIntensity: 1.5,
        opacity: 0.9
      };
      
    case 'error':
      return {
        ...baseConfig,
        gradient: { start: '#ef4444', end: '#dc2626' },
        strokeWidth: isHovered ? 4 : 3,
        animated: true,
        particles: false,
        dashArray: '8,4',
        glowIntensity: 2,
        opacity: 1
      };
      
    case 'warning':
      return {
        ...baseConfig,
        gradient: { start: '#f59e0b', end: '#d97706' },
        strokeWidth: isHovered ? 4 : 3,
        animated: true,
        particles: true,
        particleCount: 1,
        dashArray: '12,4',
        glowIntensity: 1.5,
        opacity: 0.9
      };
  }

  // Logic node specific styling
  if (sourceType === 'logic') {
    if (sourceHandle === 'true') {
      return {
        ...baseConfig,
        gradient: { start: '#10b981', end: '#059669' },
        strokeWidth: isHovered ? 4 : 3,
        animated: isActive,
        particles: isActive,
        particleCount: 2,
        glowIntensity: 1.5
      };
    } else if (sourceHandle === 'false') {
      return {
        ...baseConfig,
        gradient: { start: '#ef4444', end: '#dc2626' },
        strokeWidth: isHovered ? 4 : 3,
        animated: isActive,
        particles: isActive,
        particleCount: 1,
        glowIntensity: 1.5
      };
    }
  }

  // Data type specific styling
  const dataTypeStyles = {
    file: { gradient: { start: '#8b5cf6', end: '#7c3aed' }, glowIntensity: 1.2 },
    text: { gradient: { start: '#06b6d4', end: '#0891b2' }, glowIntensity: 1.1 },
    api: { gradient: { start: '#f59e0b', end: '#d97706' }, glowIntensity: 1.3 },
    json: { gradient: { start: '#3b82f6', end: '#1d4ed8' }, glowIntensity: 1.2 },
    image: { gradient: { start: '#ec4899', end: '#be185d' }, glowIntensity: 1.4 }
  };

  if (dataTypeStyles[dataType]) {
    return {
      ...baseConfig,
      ...dataTypeStyles[dataType],
      strokeWidth: isHovered ? 3 : 2,
      animated: isActive,
      particles: isActive && throughput > 0,
      particleCount: Math.min(Math.floor(throughput / 50) + 1, 3)
    };
  }

  // Default idle state
  return {
    ...baseConfig,
    gradient: { start: '#9ca3af', end: '#6b7280' },
    strokeWidth: isHovered ? 3 : 2,
    opacity: isHovered ? 1 : 0.7,
    glowIntensity: isHovered ? 1.2 : 0.8
  };
};

// Main AnimatedEdge component
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
  const [labelHovered, setLabelHovered] = useState(false);

  // Get connection state from data
  const connectionState = data.state || 'idle';
  const isActive = ['active', 'processing'].includes(connectionState);
  const dataType = data.dataType || 'data';
  const throughput = data.throughput || 0;
  const label = data.label || null;
  const dataPreview = data.dataPreview || null;

  // Calculate bezier path
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.3
  });

  // Get connection styling
  const connectionStyle = useMemo(() => 
    getConnectionStyle(data, isActive || selected, isHovered || labelHovered),
    [data, isActive, selected, isHovered, labelHovered]
  );

  // Generate unique IDs for gradients and filters
  const gradientId = `gradient-${id}`;
  const filterId = `filter-${id}`;
  const markerId = `marker-${id}`;

  // Handle mouse events
  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  return (
    <>
      <defs>
        {/* Dynamic gradient */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={connectionStyle.gradient.start}>
            {connectionStyle.animated && (
              <animate
                attributeName="stop-color"
                values={`${connectionStyle.gradient.start};${connectionStyle.gradient.end};${connectionStyle.gradient.start}`}
                dur="3s"
                repeatCount="indefinite"
              />
            )}
          </stop>
          <stop offset="100%" stopColor={connectionStyle.gradient.end}>
            {connectionStyle.animated && (
              <animate
                attributeName="stop-color"
                values={`${connectionStyle.gradient.end};${connectionStyle.gradient.start};${connectionStyle.gradient.end}`}
                dur="3s"
                repeatCount="indefinite"
              />
            )}
          </stop>
        </linearGradient>

        {/* Glow filter */}
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={connectionStyle.glowIntensity * 2} result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Arrow marker */}
        <marker
          id={markerId}
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
            fill={connectionStyle.gradient.end}
            style={{
              filter: `drop-shadow(0 0 2px ${connectionStyle.gradient.end})`
            }}
          />
        </marker>
      </defs>

      {/* Background glow for active connections */}
      {(isActive || selected) && (
        <BaseEdge
          path={edgePath}
          style={{
            ...style,
            stroke: connectionStyle.gradient.start,
            strokeWidth: connectionStyle.strokeWidth + 6,
            opacity: 0.2,
            filter: `blur(${connectionStyle.glowIntensity * 3}px)`,
          }}
        />
      )}

      {/* Main connection path */}
      <BaseEdge
        path={edgePath}
        style={{
          ...style,
          stroke: `url(#${gradientId})`,
          strokeWidth: connectionStyle.strokeWidth,
          strokeDasharray: connectionStyle.dashArray,
          opacity: connectionStyle.opacity,
          filter: connectionStyle.glowIntensity > 1 ? `url(#${filterId})` : 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        markerEnd={`url(#${markerId})`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Animated stroke dash for processing state */}
      {connectionStyle.animated && connectionStyle.dashArray && (
        <BaseEdge
          path={edgePath}
          style={{
            ...style,
            stroke: connectionStyle.gradient.end,
            strokeWidth: connectionStyle.strokeWidth,
            strokeDasharray: connectionStyle.dashArray,
            opacity: 0.6,
            strokeDashoffset: 0,
          }}
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;-20;0"
            dur="2s"
            repeatCount="indefinite"
          />
        </BaseEdge>
      )}

      {/* Flowing particles */}
      {connectionStyle.particles && (
        <>
          {Array.from({ length: connectionStyle.particleCount }, (_, i) => (
            <FlowingParticle
              key={`particle-${i}`}
              path={edgePath}
              duration={2000 + i * 200}
              delay={i * 400}
              color={connectionStyle.gradient.start}
              size={4 - i * 0.5}
              isActive={isActive || selected}
              trailLength={3}
              glowIntensity={connectionStyle.glowIntensity}
            />
          ))}
        </>
      )}

      {/* Connection label */}
      {(label || throughput > 0 || isHovered) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
          >
            <ConnectionLabel
              labelX={0}
              labelY={0}
              label={label}
              isActive={isActive || selected}
              dataPreview={dataPreview}
              throughput={throughput}
              dataType={dataType}
              onHover={setLabelHovered}
            />
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Selection indicator */}
      {selected && (
        <BaseEdge
          path={edgePath}
          style={{
            stroke: '#3b82f6',
            strokeWidth: connectionStyle.strokeWidth + 2,
            opacity: 0.3,
            strokeDasharray: '8,4',
            fill: 'none',
          }}
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;12;0"
            dur="1s"
            repeatCount="indefinite"
          />
        </BaseEdge>
      )}
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

AnimatedEdge.displayName = 'AnimatedEdge';

export default AnimatedEdge; 