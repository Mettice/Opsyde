import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';
import registry from '../data/tool_registry.json';

const TaskNode = React.memo(({ 
  data, 
  isConnectable, 
  selected,
  // Visual enhancement props
  enhancementMode = 'default',
  isCompact = false,
  isFocused = false,
  isDimmed = false,
  onHover,
  onUnhover
}) => {
  const [showDependencies, setShowDependencies] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, processing, success, error, waiting
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [cost, setCost] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});
  
  const framework = data.framework || 'crewai';
  const frameworkConfig = registry.frameworks[framework]?.config || {};

  // Safe data access to prevent errors
  const safeData = {
    label: data.label || '',
    description: data.description || '',
    expectedOutput: data.expectedOutput || '',
    agentId: data.agentId || '',
    async: data.async || false,
    priority: data.priority || 'medium',
    context: data.context || [],
    tools: data.tools || [],
    nodeId: data.nodeId || data.id || '',
    input_schema: data.input_schema || {},
    output_schema: data.output_schema || {}
  };

  // Schema validation
  const validateAgainstSchema = useCallback((value, schema) => {
    const errors = {};
    
    if (!schema) return errors;

    // Check required fields
    Object.entries(schema).forEach(([key, fieldSchema]) => {
      if (!fieldSchema.optional && !value[key]) {
        errors[key] = `Field ${key} is required`;
      }
    });

    // Type validation
    Object.entries(schema).forEach(([key, fieldSchema]) => {
      if (value[key] !== undefined) {
        const valueType = typeof value[key];
        if (fieldSchema.type === 'any') return;
        
        if (fieldSchema.type === 'object' && valueType !== 'object') {
          errors[key] = `Field ${key} must be an object`;
        } else if (fieldSchema.type === 'string' && valueType !== 'string') {
          errors[key] = `Field ${key} must be a string`;
        } else if (fieldSchema.type === 'number' && valueType !== 'number') {
          errors[key] = `Field ${key} must be a number`;
        }
      }
    });

    return errors;
  }, []);

  // Validate input against schema
  useEffect(() => {
    if (safeData.input_schema && data.inputs) {
      const errors = validateAgainstSchema(data.inputs, safeData.input_schema);
      setValidationErrors(errors);
    }
  }, [data.inputs, safeData.input_schema, validateAgainstSchema]);

  // Simulate execution progress and metrics
  useEffect(() => {
    if (data.executionState) {
      setStatus(data.executionState.status || 'idle');
      setExecutionProgress(data.executionState.progress || 0);
      setExecutionTime(data.executionState.time || 0);
      setCost(data.executionState.cost || 0);
    }
  }, [data.executionState]);

  // Beautiful task-specific colors and status system
  const getStatusConfig = () => {
    const configs = {
      processing: {
        icon: '⚡',
        pulse: 'animate-pulse',
        glow: 'shadow-amber-500/40',
        gradient: 'from-amber-400/20 to-yellow-500/20',
        border: 'border-amber-400/60',
        dot: 'bg-gradient-to-r from-amber-400 to-yellow-600',
        overlay: 'bg-gradient-to-br from-amber-500/10 to-yellow-600/10'
      },
      success: {
        icon: '✅',
        pulse: '',
        glow: 'shadow-green-500/40',
        gradient: 'from-green-400/20 to-emerald-500/20',
        border: 'border-green-400/60',
        dot: 'bg-gradient-to-r from-green-400 to-emerald-500',
        overlay: 'bg-gradient-to-br from-green-500/10 to-emerald-600/10'
      },
      error: {
        icon: '⚠️',
        pulse: 'animate-bounce',
        glow: 'shadow-red-500/40',
        gradient: 'from-red-400/20 to-pink-500/20',
        border: 'border-red-400/60',
        dot: 'bg-gradient-to-r from-red-400 to-pink-500',
        overlay: 'bg-gradient-to-br from-red-500/10 to-pink-600/10'
      },
      waiting: {
        icon: '⏳',
        pulse: 'animate-pulse',
        glow: 'shadow-orange-500/40',
        gradient: 'from-orange-400/20 to-amber-500/20',
        border: 'border-orange-400/60',
        dot: 'bg-gradient-to-r from-orange-400 to-amber-500',
        overlay: 'bg-gradient-to-br from-orange-500/10 to-amber-600/10'
      },
      idle: {
        icon: '📋',
        pulse: '',
        glow: 'shadow-amber-300/50',
        gradient: 'from-white/90 to-amber-50/80',
        border: 'border-amber-200/70',
        dot: 'bg-gradient-to-r from-amber-400 to-yellow-500',
        overlay: 'bg-gradient-to-br from-amber-500/5 to-yellow-600/5'
      }
    };
    return configs[status] || configs.idle;
  };

  const statusConfig = getStatusConfig();

  // Beautiful task priority specific colors
  const getPriorityConfig = () => {
    const priority = data.priority?.toLowerCase() || 'medium';
    const configs = {
      high: {
        name: 'High Priority',
        colors: {
          primary: 'from-red-400 to-pink-600',
          secondary: 'from-red-50/90 to-pink-100/80',
          accent: 'bg-gradient-to-r from-red-500 to-pink-600',
          text: 'text-red-700',
          glow: 'shadow-red-400/30',
          border: 'border-red-300/50',
          glass: 'bg-gradient-to-br from-red-500/10 to-pink-600/10'
        }
      },
      medium: {
        name: 'Medium Priority',
        colors: {
          primary: 'from-amber-400 to-orange-600',
          secondary: 'from-amber-50/90 to-orange-100/80',
          accent: 'bg-gradient-to-r from-amber-500 to-orange-600',
          text: 'text-amber-700',
          glow: 'shadow-amber-400/30',
          border: 'border-amber-300/50',
          glass: 'bg-gradient-to-br from-amber-500/10 to-orange-600/10'
        }
      },
      low: {
        name: 'Low Priority',
        colors: {
          primary: 'from-green-400 to-emerald-600',
          secondary: 'from-green-50/90 to-emerald-100/80',
          accent: 'bg-gradient-to-r from-green-500 to-emerald-600',
          text: 'text-green-700',
          glow: 'shadow-green-400/30',
          border: 'border-green-300/50',
          glass: 'bg-gradient-to-br from-green-500/10 to-emerald-600/10'
        }
      }
    };
    return configs[priority] || configs.medium;
  };

  const priorityConfig = getPriorityConfig();

  const getDisplayName = () => {
    return safeData.label || safeData.description || `Task ${data.nodeId || ''}`;
  };

  const getTaskType = () => {
    if (safeData.async) return 'Async Task';
    if (safeData.context && safeData.context.length > 0) return 'Context Task';
    if (safeData.tools && safeData.tools.length > 0) return 'Tool Task';
    return 'Standard Task';
  };

  // Function to get truncated expected output (first line only)
  const getTruncatedOutput = () => {
    if (!safeData.expectedOutput) return 'No expected output defined';
    
    const firstLine = safeData.expectedOutput.split('\n')[0];
    if (firstLine.length > 40) {
      return firstLine.substring(0, 37) + '...';
    }
    return firstLine;
  };

  const handleEditClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const editEvent = new CustomEvent('node-edit', {
      detail: {
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'task',
        data
      }
    });
    document.dispatchEvent(editEvent);
  }, [data]);

  const handleDeleteClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const event = new CustomEvent('node-delete', { 
      detail: { 
        nodeId: data.id || data.nodeId,
        nodeType: data.nodeType || 'task'
      } 
    });
    document.dispatchEvent(event);
  }, [data]);

  const handleMouseEnter = useCallback(() => {
    setShowTooltip(true);
    if (onHover) onHover();
  }, [onHover]);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
    if (onUnhover) onUnhover();
  }, [onUnhover]);

  // Compact node sizing to match InputNode
  const getNodeSize = () => {
    if (isCompact) {
      return { width: '240px', height: 'auto' };
    }
    return { width: '320px', height: 'auto' }; // Removed fixed height
  };

  const getEnhancementStyles = () => {
    const base = 'transition-all duration-300';
    switch (enhancementMode) {
      case 'glow':
        return `${base} shadow-2xl shadow-blue-500/30`;
      case 'pulse':
        return `${base} animate-pulse`;
      case 'bounce':
        return `${base} animate-bounce`;
      default:
        return base;
    }
  };

  const formatDependencyLabel = (dependency) => {
    return dependency.includes('-') ? dependency.split('-').pop() : dependency;
  };

  return (
    <>
      {/* COMPACT TASK CARD - Matching InputNode Size */}
      <div 
        className={`
          relative group cursor-pointer
          bg-gradient-to-br from-white/90 to-gray-50/80 backdrop-blur-xl
          border-2 ${statusConfig.border} rounded-3xl
          shadow-xl ${statusConfig.glow}
          transition-all duration-500 ease-out
          hover:shadow-2xl hover:scale-105 hover:-translate-y-2
          ${selected ? 'ring-4 ring-blue-400/50 scale-105' : ''}
          ${isDimmed ? 'opacity-50 scale-95' : ''}
          ${isFocused ? 'ring-4 ring-purple-400/50 shadow-purple-400/30' : ''}
          ${status === 'processing' ? 'animate-spin' : ''}
        `}
        style={{ 
          width: getNodeSize().width, 
          height: getNodeSize().height
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Beautiful Animated Background Gradients */}
        <div className={`absolute inset-0 ${priorityConfig.colors.glass} rounded-3xl`} />
        <div className={`absolute inset-0 ${statusConfig.overlay} rounded-3xl`} />
        
        {/* Floating Glass Orbs for Premium Effect */}
        <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-sm opacity-60" />
        <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-gradient-to-tr from-white/30 to-transparent rounded-full blur-sm opacity-40" />
        
        {/* Status indicator dot with beautiful gradient */}
        <div className="absolute top-4 right-4 z-10">
          <div className={`w-4 h-4 rounded-full ${statusConfig.dot} ${statusConfig.pulse} shadow-lg border border-white/50`} />
        </div>

        {/* COMPACT Main content */}
        <div className="relative p-4 space-y-3">
          {/* Compact Header: Task Icon + Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Smaller Task Icon */}
              <div className={`
                w-12 h-12 rounded-xl ${priorityConfig.colors.secondary} 
                ${priorityConfig.colors.border} border-2
                flex items-center justify-center text-xl
                shadow-lg backdrop-blur-sm
                group-hover:scale-110 transition-transform duration-300
                relative overflow-hidden
                ${status === 'processing' ? 'animate-spin' : ''}
              `}>
                <div className={`absolute inset-0 ${priorityConfig.colors.accent} opacity-10 rounded-xl`} />
                <span className="relative z-10">{statusConfig.icon}</span>
              </div>
            </div>
            
            {/* Compact Action buttons */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-500">
              <button
                onClick={handleEditClick}
                className="w-8 h-8 rounded-lg bg-white/70 hover:bg-white/90 backdrop-blur-sm 
                          flex items-center justify-center transition-all duration-300 
                          hover:scale-110 shadow-lg border border-white/40 hover:shadow-xl"
                title="Edit Task"
              >
                <span className="text-sm">✏️</span>
              </button>
              <button
                onClick={handleDeleteClick}
                className="w-8 h-8 rounded-lg bg-white/70 hover:bg-red-100/80 backdrop-blur-sm 
                          flex items-center justify-center transition-all duration-300 
                          hover:scale-110 shadow-lg border border-white/40 hover:shadow-xl"
                title="Delete Task"
              >
                <span className="text-sm">🗑️</span>
              </button>
            </div>
          </div>

          {/* Compact Content */}
          <div className="space-y-2">
            {/* Task Name - Smaller */}
            <h3 className={`
              font-bold text-lg leading-tight
              bg-gradient-to-r ${priorityConfig.colors.primary} bg-clip-text text-transparent
              group-hover:scale-105 transition-transform duration-300
            `}>
              {getDisplayName()}
            </h3>
            
            {/* Task Type - Smaller */}
            <p className="text-xs text-gray-700 leading-relaxed opacity-90 font-medium">
              {getTaskType()}
            </p>

            {/* Compact Expected Output - Only show if present */}
            {safeData.expectedOutput && (
              <div className="text-xs text-gray-600 bg-white/40 backdrop-blur-sm rounded-lg p-2 border border-white/30">
                <span className="font-medium text-gray-700">Output: </span>
                <span className="opacity-80">{getTruncatedOutput()}</span>
              </div>
            )}
          </div>

          {/* Compact Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-white/30">
            <div className={`
              px-3 py-1 rounded-full ${priorityConfig.colors.secondary}
              ${priorityConfig.colors.text} text-xs font-bold
              shadow-lg backdrop-blur-sm border border-white/40
              hover:scale-105 transition-transform duration-300
            `}>
              {priorityConfig.name}
            </div>
            
            {/* Agent Assignment - Compact */}
            {safeData.agentId && (
              <div className="px-2 py-1 rounded-lg bg-white/50 backdrop-blur-sm border border-white/40 shadow-md">
                <div className="text-xs text-gray-600 font-medium">
                  Agent: {safeData.agentId.substring(0, 8)}...
                </div>
              </div>
            )}
          </div>

          {/* Compact Execution progress bar */}
          {status === 'processing' && executionProgress > 0 && (
            <div className="space-y-1 pt-1">
              <div className="w-full bg-white/40 backdrop-blur-sm rounded-full h-1.5 shadow-inner border border-white/30">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-500 ${priorityConfig.colors.accent} shadow-lg`}
                  style={{ width: `${executionProgress}%` }}
                />
              </div>
              <div className="text-xs text-gray-600 text-center font-medium bg-white/40 backdrop-blur-sm rounded-lg py-1 px-2">
                {executionProgress}% • {executionTime}s
              </div>
            </div>
          )}
        </div>

        {/* Connection handles with beautiful styling */}
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
          className="w-4 h-4 bg-gradient-to-r from-blue-400 to-blue-600 border-2 border-white shadow-xl rounded-full"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={isConnectable}
          className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-500 border-2 border-white shadow-xl rounded-full"
        />

        {/* Rotating shadow/glow effect for processing state */}
        {status === 'processing' && (
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 rounded-3xl blur-xl animate-spin" 
                 style={{ transform: 'scale(1.1)' }} />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-purple-500/15 rounded-3xl blur-lg animate-spin" 
                 style={{ transform: 'scale(1.05)', animationDirection: 'reverse', animationDuration: '3s' }} />
          </div>
        )}
      </div>

      {/* Rich Tooltip with premium glassmorphism - DETAILED INFO ON HOVER */}
      {showTooltip && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 z-50 w-80 p-5 
                       bg-gray-900/95 backdrop-blur-2xl text-white rounded-2xl shadow-2xl 
                       border border-gray-700/50 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Tooltip content with beautiful styling */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-lg">📋</span>
              <div className="font-bold text-amber-300">Task Details</div>
            </div>
            
            {/* Full Expected Output in tooltip */}
            {safeData.expectedOutput && (
              <div>
                <div className="font-semibold text-blue-300 pt-2 flex items-center gap-2">
                  <span>🎯</span>Expected Output
                </div>
                <div className="text-sm leading-relaxed opacity-90 max-h-32 overflow-y-auto">
                  {safeData.expectedOutput}
                </div>
              </div>
            )}

            {/* Description */}
            {safeData.description && (
              <div>
                <div className="font-semibold text-green-300 pt-2 flex items-center gap-2">
                  <span>📝</span>Description
                </div>
                <div className="text-sm leading-relaxed opacity-90">
                  {safeData.description}
                </div>
              </div>
            )}

            {/* Agent Assignment */}
            {safeData.agentId && (
              <div>
                <div className="font-semibold text-purple-300 pt-2 flex items-center gap-2">
                  <span>🤖</span>Assigned Agent
                </div>
                <div className="text-sm leading-relaxed opacity-90">
                  {safeData.agentId}
                </div>
              </div>
            )}

            {/* Task Properties */}
            <div>
              <div className="font-semibold text-cyan-300 pt-2 flex items-center gap-2">
                <span>⚙️</span>Properties
              </div>
              <div className="text-sm leading-relaxed opacity-90 space-y-1">
                <div>Type: {getTaskType()}</div>
                <div>Priority: {priorityConfig.name}</div>
                <div>Async: {safeData.async ? 'Yes' : 'No'}</div>
                {safeData.tools && safeData.tools.length > 0 && (
                  <div>Tools: {safeData.tools.length}</div>
                )}
              </div>
            </div>

            {/* Validation Errors */}
            {Object.keys(validationErrors).length > 0 && (
              <div className="mt-2">
                <div className="font-semibold text-red-300">Validation Errors:</div>
                <ul className="list-disc pl-6">
                  {Object.entries(validationErrors).map(([key, error]) => (
                    <li key={key}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});

TaskNode.displayName = 'TaskNode';

TaskNode.propTypes = {
  data: PropTypes.shape({
    label: PropTypes.string,
    description: PropTypes.string,
    expectedOutput: PropTypes.string,
    agentId: PropTypes.string,
    async: PropTypes.bool,
    priority: PropTypes.string,
    context: PropTypes.array,
    tools: PropTypes.array,
    nodeId: PropTypes.string,
    framework: PropTypes.string,
    input_schema: PropTypes.object,
    output_schema: PropTypes.object,
    inputs: PropTypes.object,
    executionState: PropTypes.shape({
      status: PropTypes.string,
      progress: PropTypes.number,
      time: PropTypes.number,
      cost: PropTypes.number
    })
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
  enhancementMode: PropTypes.oneOf(['default', 'glow', 'pulse', 'bounce']),
  isCompact: PropTypes.bool,
  isFocused: PropTypes.bool,
  isDimmed: PropTypes.bool,
  onHover: PropTypes.func,
  onUnhover: PropTypes.func
};

export default TaskNode;