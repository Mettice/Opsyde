import React, { useState, useCallback, memo, useEffect, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

// Memoized result renderer component
const ResultDisplay = memo(({ result }) => {
  if (!result) return null;

  return (
    <div className="mt-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50">
      <div className="text-xs font-medium text-gray-700 mb-2">Result:</div>
      <pre className="text-xs overflow-auto max-h-32 whitespace-pre-wrap text-gray-800">
        {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
});

ResultDisplay.displayName = 'ResultDisplay';

// Tool type definitions
export const ToolType = {
  LLM: 'llm',
  API: 'api',
  WEBHOOK: 'webhook',
  CUSTOM: 'custom'
};

// Use React.memo to prevent unnecessary re-renders
const ToolNode = memo(({ 
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
  const [hideApiEndpoint, setHideApiEndpoint] = useState(true);
  const [status, setStatus] = useState('idle'); // idle, processing, success, error, waiting
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [cost, setCost] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Safe data access
  const safeData = {
    label: data?.label || 'Unnamed Tool',
    description: data?.description || '',
    toolType: data?.toolType || 'API',
    framework: data?.framework || '',
    frameworkConfig: data?.frameworkConfig || {},
    apiEndpoint: data?.apiEndpoint || '',
    expectedOutput: data?.expectedOutput || '',
    condition: data?.condition || '',
    async: data?.async || false,
    origin: data?.origin || 'default',
    result: data?.result,
    nodeId: data?.nodeId || '',
    nodeType: data?.nodeType || 'tool'
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
          icon: '🔧',
          dot: 'bg-gradient-to-r from-orange-400 to-orange-600',
          overlay: 'bg-gradient-to-br from-orange-400/10 to-amber-400/10',
          glow: 'shadow-orange-400/30',
          pulse: ''
        };
    }
  };

  const statusConfig = getStatusConfig();

  // Enhanced tool type configuration with premium colors
  const getToolTypeConfig = () => {
    const toolType = safeData.toolType.toLowerCase();
    
    switch (toolType) {
      case 'huggingface':
        return {
          name: 'HuggingFace AI',
          colors: {
            primary: 'from-orange-600 to-yellow-600',
            secondary: 'bg-gradient-to-br from-orange-50 to-yellow-100',
            accent: 'bg-gradient-to-r from-orange-400 to-yellow-500',
            text: 'text-orange-700',
            border: 'border-orange-300',
            glass: 'bg-gradient-to-br from-orange-400/5 to-yellow-400/10',
            glow: 'shadow-orange-200/60'
          }
        };
      case 'llm':
        return {
          name: 'LLM Tool',
          colors: {
            primary: 'from-purple-600 to-indigo-600',
            secondary: 'bg-gradient-to-br from-purple-50 to-indigo-100',
            accent: 'bg-gradient-to-r from-purple-400 to-indigo-500',
            text: 'text-purple-700',
            border: 'border-purple-300',
            glass: 'bg-gradient-to-br from-purple-400/5 to-indigo-400/10',
            glow: 'shadow-purple-200/60'
          }
        };
      case 'api':
      case 'universal_api':
        return {
          name: 'API Tool',
          colors: {
            primary: 'from-blue-600 to-cyan-600',
            secondary: 'bg-gradient-to-br from-blue-50 to-cyan-100',
            accent: 'bg-gradient-to-r from-blue-400 to-cyan-500',
            text: 'text-blue-700',
            border: 'border-blue-300',
            glass: 'bg-gradient-to-br from-blue-400/5 to-cyan-400/10',
            glow: 'shadow-blue-200/60'
          }
        };
      case 'webhook':
        return {
          name: 'Webhook Tool',
          colors: {
            primary: 'from-green-600 to-emerald-600',
            secondary: 'bg-gradient-to-br from-green-50 to-emerald-100',
            accent: 'bg-gradient-to-r from-green-400 to-emerald-500',
            text: 'text-green-700',
            border: 'border-green-300',
            glass: 'bg-gradient-to-br from-green-400/5 to-emerald-400/10',
            glow: 'shadow-green-200/60'
          }
        };
      case 'custom':
        return {
          name: 'Custom Tool',
          colors: {
            primary: 'from-gray-600 to-slate-600',
            secondary: 'bg-gradient-to-br from-gray-50 to-slate-100',
            accent: 'bg-gradient-to-r from-gray-400 to-slate-500',
            text: 'text-gray-700',
            border: 'border-gray-300',
            glass: 'bg-gradient-to-br from-gray-400/5 to-slate-400/10',
            glow: 'shadow-gray-200/60'
          }
        };
      default:
        return {
          name: 'Tool',
          colors: {
            primary: 'from-gray-600 to-slate-600',
            secondary: 'bg-gradient-to-br from-gray-50 to-slate-100',
            accent: 'bg-gradient-to-r from-gray-400 to-slate-500',
            text: 'text-gray-700',
            border: 'border-gray-300',
            glass: 'bg-gradient-to-br from-gray-400/5 to-slate-400/10',
            glow: 'shadow-gray-200/60'
          }
        };
    }
  };

  const toolTypeConfig = getToolTypeConfig();

  // Origin badge styles
  const originBadgeStyles = useMemo(() => ({
    make: { bg: "bg-indigo-100", text: "text-indigo-700", icon: "🧩", border: "border-indigo-200" },
    zapier: { bg: "bg-amber-100", text: "text-amber-700", icon: "⚡", border: "border-amber-200" },
    n8n: { bg: "bg-purple-100", text: "text-purple-700", icon: "🔄", border: "border-purple-200" },
    marketplace: { bg: "bg-emerald-100", text: "text-emerald-700", icon: "🛒", border: "border-emerald-200" },
    ai: { bg: "bg-blue-100", text: "text-blue-700", icon: "🤖", border: "border-blue-200" },
    default: { bg: "bg-gray-100", text: "text-gray-700", icon: "📦", border: "border-gray-200" }
  }), []);

  // Create stable event handlers with useCallback
  const handleEditClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const event = new CustomEvent('node-edit', { 
      detail: { 
        nodeId: safeData.nodeId,
        nodeType: 'tool'
      } 
    });
    document.dispatchEvent(event);
  }, [safeData.nodeId]);

  const handleDeleteClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const event = new CustomEvent('node-delete', { 
      detail: { 
        nodeId: safeData.nodeId,
        nodeType: 'tool'
      } 
    });
    document.dispatchEvent(event);
  }, [safeData.nodeId]);

  // Mouse event handlers for tooltip
  const handleMouseEnter = () => setShowTooltip(true);
  const handleMouseLeave = () => setShowTooltip(false);

  // Toggle API endpoint visibility
  const toggleApiVisibility = useCallback((e) => {
    e.stopPropagation();
    setHideApiEndpoint(prev => !prev);
  }, []);

  // Get display endpoint
  const displayEndpoint = useMemo(() => {
    return safeData.frameworkConfig?.url || safeData.apiEndpoint || '';
  }, [safeData.frameworkConfig?.url, safeData.apiEndpoint]);

  // Get tool configuration summary
  const configSummary = useMemo(() => {
    const config = safeData.frameworkConfig || {};
    const parts = [];
    
    if (config.method) parts.push(`${config.method}`);
    if (config.model) parts.push(`Model: ${config.model}`);
    if (config.temperature !== undefined) parts.push(`T: ${config.temperature}`);
    if (config.max_tokens) parts.push(`Max: ${config.max_tokens}`);
    
    return parts.join(' • ');
  }, [safeData.frameworkConfig]);

  // Get display name
  const getDisplayName = () => {
    return safeData.label || 'Unnamed Tool';
  };

  // Get tool description
  const getToolDescription = () => {
    if (safeData.toolType === 'huggingface') {
      const task = safeData.hfTask || 'AI Task';
      const model = safeData.hfModel || 'AI Model';
      return `${task.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} using ${model.split('/').pop()}`;
    }
    
    if (safeData.description) {
      return safeData.description.length > 60 
        ? safeData.description.substring(0, 60) + '...' 
        : safeData.description;
    }
    
    return 'No description available';
  };

  // Get tool icon
  const getTriggerIcon = () => {
    if (safeData.toolType === 'huggingface') {
      return '🤗';
    }
    
    switch (safeData.toolType.toLowerCase()) {
      case 'llm':
        return '🤖';
      case 'api':
      case 'universal_api':
        return '🌐';
      case 'webhook':
        return '🔗';
      case 'custom':
        return '⚙️';
      default:
        return '🔧';
    }
  };

  return (
    <>
      {/* Rotating shadow/glow effect for processing state */}
      {status === 'processing' && (
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-yellow-500/20 to-red-500/20 rounded-3xl blur-xl animate-spin" 
               style={{ transform: 'scale(1.1)' }} />
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/15 via-orange-500/15 to-yellow-500/15 rounded-3xl blur-lg animate-spin" 
               style={{ transform: 'scale(1.05)', animationDirection: 'reverse', animationDuration: '3s' }} />
        </div>
      )}

      {/* Main container with glassmorphism and enhanced styling */}
      <div 
        className={`
          relative group w-72 h-auto overflow-hidden
          backdrop-blur-xl bg-white/80 border border-white/40
          rounded-3xl shadow-2xl ${statusConfig.glow} ${toolTypeConfig.colors.glow}
          transition-all duration-700 ease-out
          hover:scale-[1.03] hover:shadow-2xl hover:bg-white/90
          hover:backdrop-blur-2xl hover:-translate-y-1
          ${selected ? 'ring-2 ring-blue-400/60 ring-offset-2 ring-offset-white/50 shadow-blue-400/40' : ''}
          ${isHighlighted ? 'scale-105 ring-2 ring-purple-400/60 shadow-purple-400/40' : ''}
          ${isDimmed ? 'opacity-50 scale-95' : ''}
          ${statusConfig.pulse}
        `}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Beautiful Animated Background Gradients */}
        <div className={`absolute inset-0 ${toolTypeConfig.colors.glass} rounded-3xl`} />
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
          {/* Header: Tool Icon + Status Icon with premium styling */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Premium Tool Type Icon */}
              <div className={`
                w-14 h-14 rounded-2xl ${toolTypeConfig.colors.secondary} 
                ${toolTypeConfig.colors.border} border-2
                flex items-center justify-center text-2xl
                shadow-lg backdrop-blur-sm
                group-hover:scale-110 transition-transform duration-300
                relative overflow-hidden
              `}>
                {/* Icon background glow */}
                <div className={`absolute inset-0 ${toolTypeConfig.colors.accent} opacity-10 rounded-2xl`} />
                <span className="relative z-10">{getTriggerIcon()}</span>
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
                title="Edit Tool"
              >
                <span className="text-lg">✏️</span>
              </button>
              <button
                onClick={handleDeleteClick}
                className="w-10 h-10 rounded-xl bg-white/70 hover:bg-red-100/80 backdrop-blur-sm 
                          flex items-center justify-center transition-all duration-300 
                          hover:scale-110 shadow-lg border border-white/40 hover:shadow-xl"
                title="Delete Tool"
              >
                <span className="text-lg">🗑️</span>
              </button>
            </div>
          </div>

          {/* Smart Content Hierarchy with beautiful typography */}
          <div className="space-y-3">
            {/* Primary: Tool Name with gradient text */}
            <h3 className={`
              font-bold text-xl leading-tight
              bg-gradient-to-r ${toolTypeConfig.colors.primary} bg-clip-text text-transparent
              group-hover:scale-105 transition-transform duration-300
            `}>
              {getDisplayName()}
            </h3>
            
            {/* Secondary: Tool Description with subtle styling */}
            <p className="text-sm text-gray-700 leading-relaxed opacity-90 font-medium">
              {getToolDescription()}
            </p>

            {/* Origin badge */}
            {safeData.origin && safeData.origin !== 'default' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Origin:</span>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${originBadgeStyles[safeData.origin]?.bg} ${originBadgeStyles[safeData.origin]?.text} ${originBadgeStyles[safeData.origin]?.border}`}>
                  <span className="mr-1">{originBadgeStyles[safeData.origin]?.icon}</span>
                  {safeData.origin}
                </div>
              </div>
            )}
          </div>

          {/* Configuration Summary */}
          {configSummary && (
            <div className="bg-white/40 backdrop-blur-sm rounded-lg p-3 border border-white/30">
              <div className="text-xs font-medium text-gray-700 mb-1">Configuration:</div>
              <div className="text-xs text-gray-600">{configSummary}</div>
            </div>
          )}

          {/* API Endpoint Toggle */}
          {displayEndpoint && (
            <div className="space-y-2">
              <button
                onClick={toggleApiVisibility}
                className="w-full bg-white/50 backdrop-blur-sm rounded-lg p-2 border border-white/30 
                          hover:bg-white/60 transition-all duration-200 text-xs font-medium text-gray-700
                          flex items-center justify-center gap-2"
              >
                {hideApiEndpoint ? '👁️ Show Endpoint' : '🔒 Hide Endpoint'}
              </button>
              {!hideApiEndpoint && (
                <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                  <div className="text-xs font-mono text-gray-800 break-all">
                    {displayEndpoint}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer: Tool Type Badge + Status */}
          <div className="flex items-center justify-between pt-3 border-t border-white/30">
            <div className={`
              px-4 py-2 rounded-full ${toolTypeConfig.colors.secondary}
              ${toolTypeConfig.colors.text} text-sm font-bold
              shadow-lg backdrop-blur-sm border border-white/40
              hover:scale-105 transition-transform duration-300
            `}>
              {toolTypeConfig.name}
            </div>
            
            {/* Async indicator with glass effect */}
            {safeData.async && (
              <div className="px-3 py-1 rounded-lg bg-purple-50/80 backdrop-blur-sm border border-purple-200/40 shadow-md">
                <div className="text-xs text-purple-600 font-medium flex items-center gap-1">
                  <span>🔄</span>Async
                </div>
              </div>
            )}
          </div>

          {/* Execution progress bar with beautiful styling */}
          {status === 'processing' && executionProgress > 0 && (
            <div className="space-y-2 pt-2">
              <div className="w-full bg-white/40 backdrop-blur-sm rounded-full h-2 shadow-inner border border-white/30">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${toolTypeConfig.colors.accent} shadow-lg`}
                  style={{ width: `${executionProgress}%` }}
                />
              </div>
              <div className="text-xs text-gray-600 text-center font-medium bg-white/40 backdrop-blur-sm rounded-lg py-1 px-2">
                {executionProgress}% • {executionTime}s • ${cost.toFixed(3)}
              </div>
            </div>
          )}

          {/* Result display */}
          {safeData.result && (
            <ResultDisplay result={safeData.result} />
          )}
        </div>

        {/* Connection handles with beautiful styling */}
        <Handle 
          type="target" 
          position={Position.Top} 
          id="tool-top"
          isConnectable={isConnectable} 
          className="w-4 h-4 bg-gradient-to-t from-pink-400 to-pink-600 border-2 border-white shadow-xl rounded-full"
        />
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="tool-bottom"
          isConnectable={isConnectable}
          className="w-4 h-4 bg-gradient-to-b from-pink-400 to-pink-600 border-2 border-white shadow-xl rounded-full"
        />
      </div>

      {/* Rich Tooltip with premium glassmorphism */}
      {showTooltip && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 z-50 w-80 p-5 
                       bg-gray-900/95 backdrop-blur-2xl text-white rounded-2xl shadow-2xl 
                       border border-gray-700/50 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Tooltip content with beautiful styling */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-orange-400 text-lg">🔧</span>
              <div className="font-bold text-orange-300">Tool Details</div>
            </div>
            
            {/* Tool Description */}
            <div className="text-sm leading-relaxed opacity-90">
              {getToolDescription()}
            </div>
            
            {/* Expected Output */}
            {safeData.expectedOutput && (
              <div>
                <div className="font-semibold text-green-300 pt-2 flex items-center gap-2">
                  <span>📤</span>Expected Output
                </div>
                <div className="text-sm leading-relaxed opacity-90">{safeData.expectedOutput}</div>
              </div>
            )}
            
            {/* Framework Info */}
            {safeData.framework && (
              <div>
                <div className="font-semibold text-blue-300 pt-2 flex items-center gap-2">
                  <span>⚙️</span>Framework
                </div>
                <div className="text-sm leading-relaxed opacity-90">{safeData.framework}</div>
              </div>
            )}
            
            <div className="flex justify-between pt-3 border-t border-gray-700 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span>🔧</span>Type: {toolTypeConfig.name}
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

ToolNode.displayName = 'ToolNode';

ToolNode.propTypes = {
  data: PropTypes.shape({
    nodeId: PropTypes.string.isRequired,
    label: PropTypes.string,
    description: PropTypes.string,
    toolType: PropTypes.string,
    framework: PropTypes.string,
    frameworkConfig: PropTypes.object,
    apiEndpoint: PropTypes.string,
    expectedOutput: PropTypes.string,
    condition: PropTypes.string,
    async: PropTypes.bool,
    origin: PropTypes.string,
    result: PropTypes.any,
    nodeType: PropTypes.string,
    onChange: PropTypes.func,
    onDelete: PropTypes.func,
    executionState: PropTypes.object
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
  isCompact: PropTypes.bool,
  isDimmed: PropTypes.bool,
  isHighlighted: PropTypes.bool,
  enhancementMode: PropTypes.string,
  onHover: PropTypes.func,
  onUnhover: PropTypes.func
};

export default ToolNode;