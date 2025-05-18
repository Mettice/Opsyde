// utils/edgeTypes.js
import { BezierEdge, SmoothStepEdge, StraightEdge } from 'reactflow';

// Define edge types
export const edgeTypes = {
  default: BezierEdge,
  bezier: BezierEdge,
  smoothstep: SmoothStepEdge,
  straight: StraightEdge,
};

// Edge style helper functions
export const getEdgeStyle = (edgeType, isHighlighted = false) => {
  const baseStyle = {
    stroke: '#888',
    strokeWidth: 1.5,
    strokeDasharray: '5,5'
  };

  // For highlighted edges
  if (isHighlighted) {
    return {
      ...baseStyle,
      stroke: '#3b82f6',
      strokeWidth: 2.5,
      strokeDasharray: 'none',
      animation: 'flow 0.5s linear infinite'
    };
  }

  // Different styles based on edge type
  switch (edgeType) {
    case 'task-dependency':
      return {
        ...baseStyle,
        stroke: '#f59e0b', // Amber
        strokeDasharray: '3,3'
      };
    case 'agent-task':
      return {
        ...baseStyle,
        stroke: '#10b981', // Green
        strokeDasharray: 'none'
      };
    case 'tool-agent':
      return {
        ...baseStyle,
        stroke: '#6366f1', // Indigo
        strokeDasharray: '5,2'
      };
    case 'trigger':
      return {
        ...baseStyle,
        stroke: '#8b5cf6', // Purple
        strokeWidth: 2,
        strokeDasharray: 'none'
      };
    default:
      return baseStyle;
  }
};

export default edgeTypes;