import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

// Move static styles outside component
const baseStyles = {
  container: "bg-white border-2 rounded-lg shadow-md p-4 w-64",
  selectedBorder: "border-yellow-500",
  defaultBorder: "border-yellow-200",
  header: "text-sm font-bold text-yellow-800 mb-2 flex items-center",
  description: "text-xs text-gray-600 mb-3",
  codeContainer: "bg-yellow-50 p-2 rounded border border-yellow-100 mb-3",
  codeLabel: "text-xs font-medium text-yellow-700 mb-1",
  codeBlock: "text-xs font-mono bg-yellow-100 p-1 rounded block overflow-x-auto whitespace-pre-wrap",
  buttonContainer: "flex mt-3 space-x-2",
  editButton: "text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded",
  deleteButton: "text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
};

// Define origin badge colors outside component
const originBadgeColors = {
  true: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-200"
  },
  false: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-200"
  },
  error: {
    bg: "bg-gray-100",
    text: "text-gray-800",
    border: "border-gray-200"
  }
};

const LogicNode = React.memo(({ 
  data, 
  isConnectable, 
  selected,
  // Visual enhancement props
  isCompact = false,
  isDimmed = false,
  isHighlighted = false,
  enhancementMode = 'default',
  onHover,
  onUnhover
}) => {
  const [previewResult, setPreviewResult] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, processing, success, error, waiting
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [cost, setCost] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Safe data access
  const safeData = {
    label: data?.label || 'Logic Node',
    description: data?.description || 'Evaluates a condition and routes flow',
    condition: data?.condition || 'inputs.value > 0',
    testInput: data?.testInput || '{"value": 10}',
    nodeId: data?.nodeId || '',
    nodeType: data?.nodeType || 'logic'
  };
  
  // Simulate execution progress and metrics
  useEffect(() => {
    if (data.executionState) {
      setStatus(data.executionState.status || 'idle');
      setExecutionProgress(data.executionState.progress || 0);
      setExecutionTime(data.executionState.time || 0);
      setCost(data.executionState.cost || 0);
    }
  }, [data.executionState]);

  // Enhanced status configuration with glassmorphism styling
  const getStatusConfig = () => {
    switch (status) {
      case 'processing':
        return {
          icon: '⚡',
          dot: 'bg-gradient-to-r from-blue-400 to-blue-600',
          overlay: 'bg-gradient-to-br from-blue-400/20 to-purple-400/20',
          glow: 'shadow-blue-400/40',
          pulse: 'animate-pulse'
        };
      case 'success':
        return {
          icon: '✅',
          dot: 'bg-gradient-to-r from-green-400 to-green-600',
          overlay: 'bg-gradient-to-br from-green-400/20 to-emerald-400/20',
          glow: 'shadow-green-400/40',
          pulse: ''
        };
      case 'error':
        return {
          icon: '❌',
          dot: 'bg-gradient-to-r from-red-400 to-red-600',
          overlay: 'bg-gradient-to-br from-red-400/20 to-pink-400/20',
          glow: 'shadow-red-400/40',
          pulse: 'animate-pulse'
        };
      case 'waiting':
        return {
          icon: '⏳',
          dot: 'bg-gradient-to-r from-yellow-400 to-orange-500',
          overlay: 'bg-gradient-to-br from-yellow-400/20 to-orange-400/20',
          glow: 'shadow-yellow-400/40',
          pulse: 'animate-pulse'
        };
      default:
        return {
          icon: '⚖️',
          dot: 'bg-gradient-to-r from-yellow-400 to-amber-600',
          overlay: 'bg-gradient-to-br from-yellow-400/10 to-amber-400/10',
          glow: 'shadow-yellow-400/30',
          pulse: ''
        };
    }
  };

  const statusConfig = getStatusConfig();

  // Logic node specific configuration with premium colors
  const logicConfig = {
    name: 'Logic Gate',
    colors: {
      primary: 'from-yellow-600 to-amber-600',
      secondary: 'bg-gradient-to-br from-yellow-50 to-amber-100',
      accent: 'bg-gradient-to-r from-yellow-400 to-amber-500',
      text: 'text-yellow-700',
      border: 'border-yellow-300',
      glass: 'bg-gradient-to-br from-yellow-400/5 to-amber-400/10',
      glow: 'shadow-yellow-200/60'
    }
  };

  // Create stable event handlers with useCallback
  const handleEditClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const event = new CustomEvent('node-edit', { 
      detail: { 
        nodeId: safeData.nodeId,
        nodeType: safeData.nodeType
      } 
    });
    document.dispatchEvent(event);
  }, [safeData.nodeId, safeData.nodeType]);

  const handleDeleteClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const event = new CustomEvent('node-delete', { 
      detail: { 
        nodeId: safeData.nodeId,
        nodeType: safeData.nodeType
      } 
    });
    document.dispatchEvent(event);
  }, [safeData.nodeId, safeData.nodeType]);

  // Mouse event handlers for tooltip
  const handleMouseEnter = () => setShowTooltip(true);
  const handleMouseLeave = () => setShowTooltip(false);

  // Memoize test condition function
  const testCondition = useCallback(() => {
    if (!safeData.condition) return;
    
    try {
      const testInput = safeData.testInput ? JSON.parse(safeData.testInput) : { value: 10 };
      const result = new Function('inputs', `return ${safeData.condition}`)(testInput);
      setPreviewResult({
        success: true,
        result: result,
        path: result ? 'true' : 'false'
      });
    } catch (error) {
      setPreviewResult({
        success: false,
        error: error.message
      });
    }
  }, [safeData.condition, safeData.testInput]);

  // Call testCondition when the component mounts or when condition changes
  useEffect(() => {
    testCondition();
  }, [testCondition]);

  // Get display name
  const getDisplayName = () => {
    return safeData.label || 'Logic Node';
  };

  // Get logic description
  const getLogicDescription = () => {
    return safeData.description || 'Evaluates conditions and routes workflow flow';
  };

  return (
    <>
      {/* 🔥 PREMIUM GLASSMORPHISM LOGIC CARD - Matching Design System */}
      <div 
        className={`
          relative group w-72 h-auto overflow-hidden
          backdrop-blur-xl bg-white/80 border border-white/40
          rounded-3xl shadow-2xl ${statusConfig.glow} ${logicConfig.colors.glow}
          transition-all duration-700 ease-out
          hover:scale-[1.03] hover:shadow-2xl hover:bg-white/90
          hover:backdrop-blur-2xl hover:-translate-y-1
          ${selected ? 'ring-2 ring-yellow-400/60 ring-offset-2 ring-offset-white/50 shadow-yellow-400/40' : ''}
          ${isHighlighted ? 'scale-105 ring-2 ring-purple-400/60 shadow-purple-400/40' : ''}
          ${isDimmed ? 'opacity-50 scale-95' : ''}
          ${statusConfig.pulse}
        `}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Beautiful Animated Background Gradients */}
        <div className={`absolute inset-0 ${logicConfig.colors.glass} rounded-3xl`} />
        <div className={`absolute inset-0 ${statusConfig.overlay} rounded-3xl`} />
        
        {/* Floating Glass Orbs for Premium Effect */}
        <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-sm opacity-60" />
        <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-gradient-to-tr from-white/30 to-transparent rounded-full blur-sm opacity-40" />
        
        {/* Status indicator dot with beautiful gradient */}
        <div className="absolute top-4 right-4 z-10">
          <div className={`w-4 h-4 rounded-full ${statusConfig.dot} ${statusConfig.pulse} shadow-lg border border-white/50`} />
        </div>

        {/* Main content with glassmorphism container */}
        <div className="relative p-6 space-y-4">
          {/* Header: Logic Icon + Status Icon with premium styling */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Premium Logic Type Icon */}
              <div className={`
                w-14 h-14 rounded-2xl ${logicConfig.colors.secondary} 
                ${logicConfig.colors.border} border-2
                flex items-center justify-center text-2xl
                shadow-lg backdrop-blur-sm
                group-hover:scale-110 transition-transform duration-300
                relative overflow-hidden
              `}>
                {/* Icon background glow */}
                <div className={`absolute inset-0 ${logicConfig.colors.accent} opacity-10 rounded-2xl`} />
                <span className="relative z-10">⚖️</span>
              </div>
              
              {/* Status Icon with premium effect */}
              <div className="relative">
                <div className={`
                  w-12 h-12 rounded-xl bg-white/60 backdrop-blur-sm
                  flex items-center justify-center text-xl
                  shadow-lg border border-white/40
                  ${statusConfig.pulse}
                `}>
                  {statusConfig.icon}
                </div>
              </div>
            </div>
            
            {/* Action buttons - beautiful glass effect */}
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500">
              <button
                onClick={handleEditClick}
                className="w-10 h-10 rounded-xl bg-white/70 hover:bg-white/90 backdrop-blur-sm 
                          flex items-center justify-center transition-all duration-300 
                          hover:scale-110 shadow-lg border border-white/40 hover:shadow-xl"
                title="Edit Logic"
              >
                <span className="text-lg">✏️</span>
              </button>
              <button
                onClick={handleDeleteClick}
                className="w-10 h-10 rounded-xl bg-white/70 hover:bg-red-100/80 backdrop-blur-sm 
                          flex items-center justify-center transition-all duration-300 
                          hover:scale-110 shadow-lg border border-white/40 hover:shadow-xl"
                title="Delete Logic"
              >
                <span className="text-lg">🗑️</span>
              </button>
            </div>
          </div>

          {/* Smart Content Hierarchy with beautiful typography */}
          <div className="space-y-3">
            {/* Primary: Logic Name with gradient text */}
            <h3 className={`
              font-bold text-xl leading-tight
              bg-gradient-to-r ${logicConfig.colors.primary} bg-clip-text text-transparent
              group-hover:scale-105 transition-transform duration-300
            `}>
              {getDisplayName()}
            </h3>
            
            {/* Secondary: Logic Description with subtle styling */}
            <p className="text-sm text-gray-700 leading-relaxed opacity-90 font-medium">
              {getLogicDescription()}
            </p>
          </div>

          {/* Footer: Logic Type Badge + Performance */}
          <div className="flex items-center justify-between pt-3 border-t border-white/30">
            <div className={`
              px-4 py-2 rounded-full ${logicConfig.colors.secondary}
              ${logicConfig.colors.text} text-sm font-bold
              shadow-lg backdrop-blur-sm border border-white/40
              hover:scale-105 transition-transform duration-300
            `}>
              {logicConfig.name}
            </div>
            
            {/* Performance metrics with glass effect */}
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                ⚡ {executionTime > 0 ? `${executionTime.toFixed(1)}s` : '--'}
              </span>
              <span className="flex items-center gap-1">
                💰 ${cost > 0 ? cost.toFixed(3) : '0.000'}
              </span>
            </div>
          </div>
        </div>

        {/* Connection handles with beautiful styling and labels */}
        {/* Input handle */}
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
          className="w-4 h-4 bg-gradient-to-r from-indigo-400 to-indigo-600 border-2 border-white shadow-xl rounded-full"
        />
        
        {/* True output handle */}
        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={isConnectable}
          className="w-4 h-4 bg-gradient-to-r from-indigo-400 to-indigo-600 border-2 border-white shadow-xl rounded-full"
        >
          <div className="absolute -right-14 -top-1 text-xs text-green-600 whitespace-nowrap font-medium bg-white/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-green-200/40">
            True →
          </div>
        </Handle>
        
        {/* False output handle */}
        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={isConnectable}
          className="w-4 h-4 bg-gradient-to-r from-indigo-400 to-indigo-600 border-2 border-white shadow-xl rounded-full"
        >
          <div className="absolute -right-14 -top-1 text-xs text-red-600 whitespace-nowrap font-medium bg-white/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-red-200/40">
            False →
          </div>
        </Handle>
      </div>

      {/* Rich Tooltip with premium glassmorphism */}
      {showTooltip && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 z-50 w-80 p-5 
                       bg-gray-900/95 backdrop-blur-2xl text-white rounded-2xl shadow-2xl 
                       border border-gray-700/50 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Tooltip content with beautiful styling */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-lg">⚖️</span>
              <div className="font-bold text-yellow-300">Logic Details</div>
            </div>
            
            {/* Logic Description */}
            <div className="text-sm leading-relaxed opacity-90">
              {getLogicDescription()}
            </div>
            
            {/* Condition Info */}
            <div>
              <div className="font-semibold text-blue-300 pt-2 flex items-center gap-2">
                <span>🧮</span>Condition
              </div>
              <div className="text-sm leading-relaxed opacity-90 font-mono bg-gray-800/50 p-2 rounded mt-1">
                {safeData.condition}
              </div>
            </div>
            
            {/* Preview Result */}
            {previewResult && previewResult.success && (
              <div>
                <div className="font-semibold text-green-300 pt-2 flex items-center gap-2">
                  <span>🔍</span>Preview Result
                </div>
                <div className={`text-sm leading-relaxed opacity-90 ${previewResult.result ? 'text-green-300' : 'text-red-300'}`}>
                  Evaluates to: {previewResult.result ? 'True' : 'False'}
                </div>
              </div>
            )}
            
            <div className="flex justify-between pt-3 border-t border-gray-700 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span>⚖️</span>Type: Logic Gate
              </span>
              <span className="flex items-center gap-1">
                <span>⚡</span>Status: {status}
              </span>
            </div>
          </div>
          
          {/* Tooltip arrow */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 
                         bg-gray-900 rotate-45 border-l border-t border-gray-700/50"></div>
        </div>
      )}
    </>
  );
});

LogicNode.displayName = 'LogicNode';

LogicNode.propTypes = {
  data: PropTypes.object.isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
  isCompact: PropTypes.bool,
  isDimmed: PropTypes.bool,
  isHighlighted: PropTypes.bool,
  enhancementMode: PropTypes.string,
  onHover: PropTypes.func,
  onUnhover: PropTypes.func
};

export default LogicNode;
