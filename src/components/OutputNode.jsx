import React, { useCallback, memo, useRef, useEffect, useState } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

// Safe accessor helper function
const safeAccess = (obj, path, defaultValue = null) => {
  if (!obj) return defaultValue;
  
  const parts = path.split('.');
  let result = obj;
  
  for (const part of parts) {
    if (result === null || result === undefined) return defaultValue;
    result = result[part];
  }
  
  return result !== undefined ? result : defaultValue;
};

const OutputNode = memo(({ 
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
  // State for hiding API endpoint/details
  const [hideApiEndpoint, setHideApiEndpoint] = useState(true);
  const [status, setStatus] = useState('idle'); // idle, processing, success, error, waiting
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [cost, setCost] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Safe data access
  const safeData = {
    label: data?.label || 'Output Node',
    outputType: data?.outputType || 'webhook',
    description: data?.description || 'Sends data to external services',
    webhookUrl: data?.webhookUrl || '',
    nodeId: data?.nodeId || '',
    nodeType: data?.nodeType || 'output'
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

  // Get status configuration with glassmorphism styling
  const getStatusConfig = () => {
    switch (status) {
      case 'processing':
        return {
          icon: '⚡',
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-300/30',
          textColor: 'text-blue-700',
          gradient: 'from-blue-400 to-blue-600',
          glowColor: 'shadow-blue-300/40',
          pulse: 'animate-pulse'
        };
      case 'success':
        return {
          icon: '✅',
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-300/30',
          textColor: 'text-emerald-700',
          gradient: 'from-emerald-400 to-emerald-600',
          glowColor: 'shadow-emerald-300/40',
          pulse: ''
        };
      case 'error':
        return {
          icon: '❌',
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-300/30',
          textColor: 'text-red-700',
          gradient: 'from-red-400 to-red-600',
          glowColor: 'shadow-red-300/40',
          pulse: ''
        };
      case 'waiting':
        return {
          icon: '⏳',
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-300/30',
          textColor: 'text-amber-700',
          gradient: 'from-amber-400 to-amber-600',
          glowColor: 'shadow-amber-300/40',
          pulse: 'animate-pulse'
        };
      default:
        return {
          icon: '📤',
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-300/30',
          textColor: 'text-emerald-700',
          gradient: 'from-emerald-400 to-emerald-600',
          glowColor: 'shadow-emerald-300/40',
          pulse: ''
        };
    }
  };

  // Get output type configuration
  const getOutputTypeConfig = () => {
    const outputType = safeData.outputType;
    const configs = {
      webhook: { name: 'Webhook', colors: { primary: 'from-emerald-600 to-teal-600', secondary: 'bg-emerald-50/80', accent: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-200/40' }},
      email: { name: 'Email', colors: { primary: 'from-blue-600 to-indigo-600', secondary: 'bg-blue-50/80', accent: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-200/40' }},
      discord: { name: 'Discord', colors: { primary: 'from-purple-600 to-violet-600', secondary: 'bg-purple-50/80', accent: 'bg-purple-500', text: 'text-purple-700', border: 'border-purple-200/40' }},
      sheets: { name: 'Sheets', colors: { primary: 'from-green-600 to-emerald-600', secondary: 'bg-green-50/80', accent: 'bg-green-500', text: 'text-green-700', border: 'border-green-200/40' }},
      smart_email: { name: 'Smart Email', colors: { primary: 'from-cyan-600 to-blue-600', secondary: 'bg-cyan-50/80', accent: 'bg-cyan-500', text: 'text-cyan-700', border: 'border-cyan-200/40' }},
      smart_api: { name: 'AI API', colors: { primary: 'from-violet-600 to-purple-600', secondary: 'bg-violet-50/80', accent: 'bg-violet-500', text: 'text-violet-700', border: 'border-violet-200/40' }}
    };
    
    return configs[outputType] || configs.webhook;
  };

  const statusConfig = getStatusConfig();
  const outputConfig = getOutputTypeConfig();
  
  // Mouse event handlers
  const handleMouseEnter = () => setShowTooltip(true);
  const handleMouseLeave = () => setShowTooltip(false);
  
  // Create stable event handlers with useCallback
  const handleEditClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const event = new CustomEvent('node-edit', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'output'
      } 
    });
    document.dispatchEvent(event);
  }, [data?.nodeId, data?.nodeType]);

  const handleDeleteClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const event = new CustomEvent('node-delete', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'output'
      } 
    });
    document.dispatchEvent(event);
  }, [data?.nodeId, data?.nodeType]);

  // Toggle API endpoint visibility
  const toggleApiVisibility = useCallback((e) => {
    e.stopPropagation();
    setHideApiEndpoint(prev => !prev);
  }, []);

  // Helper functions
  const getDisplayName = () => {
    return safeData.label || safeData.outputType || 'Output Node';
  };

  const getOutputDescription = () => {
    const types = {
      webhook: 'Sends data via HTTP webhook',
      email: 'Delivers content via email',
      discord: 'Posts messages to Discord channels',
      sheets: 'Updates Google Sheets with data',
      smart_email: 'AI-powered email composition',
      smart_api: 'Intelligent API integration'
    };
    return types[safeData.outputType] || safeData.description;
  };

  const getOutputTypeIcon = () => {
    const icons = {
      webhook: '🔗',
      email: '📧',
      discord: '💬',
      sheets: '📊',
      smart_email: '🤖📧',
      smart_api: '🤖🔗'
    };
    return icons[safeData.outputType] || '📤';
  };

  return (
    <>
      {/* Rotating shadow/glow effect for processing state */}
      {status === 'processing' && (
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-teal-500/20 rounded-3xl blur-xl animate-spin" 
               style={{ transform: 'scale(1.1)' }} />
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/15 via-emerald-500/15 to-green-500/15 rounded-3xl blur-lg animate-spin" 
               style={{ transform: 'scale(1.05)', animationDirection: 'reverse', animationDuration: '3s' }} />
        </div>
      )}

      <div 
        className={`
          relative group w-80 h-auto overflow-hidden
          backdrop-blur-xl bg-white/80 border border-white/40
          rounded-3xl shadow-2xl ${statusConfig.glowColor}
          transition-all duration-700 ease-out
          hover:scale-[1.03] hover:shadow-2xl hover:bg-white/90
          hover:backdrop-blur-2xl hover:-translate-y-1
          ${selected ? 'ring-2 ring-blue-400/60 ring-offset-2 ring-offset-white/50 shadow-blue-400/40' : ''}
          ${isDimmed ? 'opacity-50 scale-95' : ''}
          ${isHighlighted ? 'ring-2 ring-yellow-400/60 ring-offset-2 ring-offset-white/50 shadow-yellow-400/40' : ''}
          ${statusConfig.pulse}
        `}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Floating Glass Orbs Background */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-emerald-200/30 to-teal-300/20 rounded-full blur-xl animate-float" />
          <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-tr from-green-200/20 to-emerald-300/30 rounded-full blur-2xl animate-float-delayed" />
          <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-gradient-to-br from-teal-300/20 to-emerald-200/25 rounded-full blur-lg animate-float-slow" />
        </div>

        {/* Animated Gradient Background */}
        <div className={`
          absolute inset-0 rounded-2xl opacity-30
          bg-gradient-to-br from-emerald-100/50 via-teal-50/30 to-green-100/40
          group-hover:opacity-50 transition-opacity duration-700
        `} />

        {/* Status Indicator Dot */}
        <div className={`
          absolute top-3 right-3 w-4 h-4 rounded-full ${statusConfig.color.replace('text-', 'bg-')}
          ${statusConfig.pulse} shadow-lg backdrop-blur-sm border-2 border-white/40
          z-20
        `} />

        {/* Connection Handle */}
        <Handle
          type="target"
          position={Position.Top}
          className={`
            w-5 h-5 rounded-full shadow-xl border-3 border-white/60 backdrop-blur-sm
            bg-gradient-to-r ${outputConfig.colors.primary}
            hover:scale-125 transition-all duration-300
            hover:shadow-emerald-300/60
          `}
          style={{ top: -10 }}
          isConnectable={isConnectable}
        />
        
        {/* Main Content with Glass Effect */}
        <div className="relative z-10 p-5">
          {/* Header Section */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`
                relative w-14 h-14 rounded-2xl ${outputConfig.colors.secondary} 
                ${outputConfig.colors.border} border-2
                flex items-center justify-center text-2xl
                shadow-lg backdrop-blur-sm
                group-hover:scale-110 transition-transform duration-300
                overflow-hidden
                ${status === 'processing' ? 'animate-spin' : ''}
              `}>
                {/* Icon background glow */}
                <div className={`absolute inset-0 ${outputConfig.colors.accent} opacity-10 rounded-2xl`} />
                <span className="relative z-10">{getOutputTypeIcon()}</span>
              </div>
              
              {/* Status Icon */}
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
            
            {/* Action buttons */}
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500">
              <button
                onClick={handleEditClick}
                className="w-10 h-10 rounded-xl bg-white/70 hover:bg-white/90 backdrop-blur-sm 
                          flex items-center justify-center transition-all duration-300 
                          hover:scale-110 shadow-lg border border-white/40 hover:shadow-xl"
                title="Edit Output"
              >
                <span className="text-lg">✏️</span>
              </button>
              <button
                onClick={handleDeleteClick}
                className="w-10 h-10 rounded-xl bg-white/70 hover:bg-red-100/80 backdrop-blur-sm 
                          flex items-center justify-center transition-all duration-300 
                          hover:scale-110 shadow-lg border border-white/40 hover:shadow-xl"
                title="Delete Output"
              >
                <span className="text-lg">🗑️</span>
              </button>
            </div>
          </div>

          {/* Content Section */}
          <div className="space-y-3">
            {/* Primary: Output Name */}
            <h3 className={`
              font-bold text-xl leading-tight
              bg-gradient-to-r ${outputConfig.colors.primary} bg-clip-text text-transparent
              group-hover:scale-105 transition-transform duration-300
            `}>
              {getDisplayName()}
            </h3>
            
            {/* Secondary: Description */}
            <p className="text-sm text-gray-700 leading-relaxed opacity-90 font-medium">
              {getOutputDescription()}
            </p>
          </div>

          {/* Footer: Output Type Badge + Performance */}
          <div className="flex items-center justify-between pt-3 border-t border-white/30">
            <div className={`
              px-4 py-2 rounded-full ${outputConfig.colors.secondary}
              ${outputConfig.colors.text} text-sm font-bold
              shadow-lg backdrop-blur-sm border border-white/40
              hover:scale-105 transition-transform duration-300
            `}>
              {outputConfig.name}
            </div>
            
            {/* Performance metrics */}
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

        {/* Rich Tooltip */}
        {showTooltip && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 z-50 w-80 p-5 
                         bg-gray-900/95 backdrop-blur-2xl text-white rounded-2xl shadow-2xl 
                         border border-gray-700/50 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-lg">{getOutputTypeIcon()}</span>
                <div className="font-bold text-emerald-300">Output Details</div>
              </div>
              
              <div className="text-sm leading-relaxed opacity-90">
                {getOutputDescription()}
              </div>
              
              {/* Configuration Info */}
              <div>
                <div className="font-semibold text-blue-300 pt-2 flex items-center gap-2">
                  <span>⚙️</span>Configuration
                </div>
                <div className="text-sm opacity-80 mt-1 space-y-1">
                  <div>Type: {outputConfig.name}</div>
                  {safeData.webhookUrl && (
                    <div>Endpoint: {safeData.webhookUrl.substring(0, 50)}...</div>
                  )}
                </div>
              </div>
              
              {/* Performance */}
              <div>
                <div className="font-semibold text-green-300 pt-2 flex items-center gap-2">
                  <span>📊</span>Performance
                </div>
                <div className="text-sm opacity-80 mt-1 grid grid-cols-2 gap-2">
                  <div>Time: {executionTime > 0 ? `${executionTime.toFixed(1)}s` : 'Not run'}</div>
                  <div>Cost: ${cost > 0 ? cost.toFixed(3) : '0.000'}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
});

OutputNode.propTypes = {
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

OutputNode.displayName = 'OutputNode';

export default OutputNode; 