import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

const DelayNode = React.memo(({ 
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
  const [status, setStatus] = useState('idle'); // idle, processing, success, error, waiting
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [cost, setCost] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Safe data access
  const safeData = {
    label: data?.label || 'Delay Node',
    description: data?.description || 'Waits for a specified duration before continuing',
    duration: data?.duration || '5s',
    delayType: data?.delayType || 'fixed',
    nodeId: data?.nodeId || '',
    nodeType: data?.nodeType || 'delay'
  };
  
  // Simulate execution progress and metrics
  useEffect(() => {
    if (data.executionState) {
      setStatus(data.executionState.status || 'idle');
      setExecutionProgress(data.executionState.progress || 0);
      setExecutionTime(data.executionState.time || 0);
      setRemainingTime(data.executionState.remainingTime || 0);
      setCost(data.executionState.cost || 0);
    }
  }, [data.executionState]);

  // Get status configuration with glassmorphism styling
  const getStatusConfig = () => {
    switch (status) {
      case 'processing':
        return {
          icon: '⏳',
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
          icon: '⏱️',
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
          icon: '⏱️',
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-300/30',
          textColor: 'text-amber-700',
          gradient: 'from-amber-400 to-amber-600',
          glowColor: 'shadow-amber-300/40',
          pulse: ''
        };
    }
  };

  // Delay configuration
  const getDelayConfig = () => {
    return {
      name: 'Timer',
      colors: {
        primary: 'from-amber-600 to-orange-600',
        secondary: 'bg-amber-50/80',
        accent: 'bg-amber-500',
        text: 'text-amber-700',
        border: 'border-amber-200/40'
      }
    };
  };

  const statusConfig = getStatusConfig();
  const delayConfig = getDelayConfig();
  
  // Mouse event handlers
  const handleMouseEnter = () => setShowTooltip(true);
  const handleMouseLeave = () => setShowTooltip(false);

  // Memoized handlers
  const handleEditClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    document.dispatchEvent(new CustomEvent('node-edit', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'delay'
      } 
    }));
  }, [data?.nodeId, data?.nodeType]);

  const handleDeleteClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    document.dispatchEvent(new CustomEvent('node-delete', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'delay'
      } 
    }));
  }, [data?.nodeId, data?.nodeType]);

  // Parse duration for display
  const parseDuration = (duration) => {
    if (!duration) return '5s';
    
    // Convert various formats to readable format
    if (typeof duration === 'number') {
      if (duration < 60) return `${duration}s`;
      if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
      return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
    }
    
    return duration;
  };

  // Helper functions
  const getDisplayName = () => {
    return safeData.label || 'Timer';
  };

  const getDelayDescription = () => {
    return safeData.description;
  };

  if (!data) {
    return (
      <div className="w-72 h-32 bg-gray-100 rounded-2xl flex items-center justify-center">
        <span className="text-gray-500">No delay data</span>
      </div>
    );
  }

  return (
    <div 
      onMouseEnter={() => {
        handleMouseEnter();
        onHover && onHover(data);
      }}
      onMouseLeave={() => {
        handleMouseLeave();
        onUnhover && onUnhover();
      }}
      className={`
        node-container group relative
        w-72 bg-white/40 backdrop-blur-xl border-2 rounded-2xl
        shadow-2xl ${statusConfig.glowColor}
        transition-all duration-500 ease-out
        hover:shadow-3xl hover:scale-[1.02] hover:-translate-y-2
        ${selected ? 
          `border-amber-400/60 shadow-amber-400/30 scale-[1.01]` : 
          `${statusConfig.borderColor} hover:border-amber-400/40`
        }
        ${isCompact ? 'w-64 scale-90' : 'w-72'}
        ${isDimmed ? 'opacity-50 scale-95' : ''}
        ${isHighlighted ? 'ring-4 ring-amber-400/50 ring-opacity-75 scale-105' : ''}
        ${enhancementMode === 'focus' && !isHighlighted ? 'blur-sm opacity-60' : ''}
        ${statusConfig.pulse}
        overflow-hidden
      `}
    >
      {/* Floating Glass Orbs Background */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-amber-200/30 to-orange-300/20 rounded-full blur-xl animate-float" />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-tr from-orange-200/20 to-amber-300/30 rounded-full blur-2xl animate-float-delayed" />
        <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-gradient-to-br from-amber-300/20 to-orange-200/25 rounded-full blur-lg animate-float-slow" />
      </div>

      {/* Animated Gradient Background */}
      <div className={`
        absolute inset-0 rounded-2xl opacity-30
        bg-gradient-to-br from-amber-100/50 via-orange-50/30 to-amber-100/40
        group-hover:opacity-50 transition-opacity duration-700
      `} />

      {/* Status Indicator Dot */}
      <div className={`
        absolute top-3 right-3 w-4 h-4 rounded-full ${statusConfig.color.replace('text-', 'bg-')}
        ${statusConfig.pulse} shadow-lg backdrop-blur-sm border-2 border-white/40
        z-20
      `} />

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className={`
          w-5 h-5 rounded-full shadow-xl border-3 border-white/60 backdrop-blur-sm
          bg-gradient-to-r ${delayConfig.colors.primary}
          hover:scale-125 transition-all duration-300
          hover:shadow-amber-300/60
        `}
        style={{ top: -10 }}
        isConnectable={isConnectable}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        className={`
          w-5 h-5 rounded-full shadow-xl border-3 border-white/60 backdrop-blur-sm
          bg-gradient-to-r ${delayConfig.colors.primary}
          hover:scale-125 transition-all duration-300
          hover:shadow-amber-300/60
        `}
        style={{ bottom: -10 }}
        isConnectable={isConnectable}
      />
      
      {/* Main Content with Glass Effect */}
      <div className="relative z-10 p-5">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`
              relative w-14 h-14 rounded-2xl ${delayConfig.colors.secondary} 
              ${delayConfig.colors.border} border-2
              flex items-center justify-center text-2xl
              shadow-lg backdrop-blur-sm
              group-hover:scale-110 transition-transform duration-300
              overflow-hidden
              ${status === 'processing' ? 'animate-spin-slow' : ''}
            `}>
              {/* Icon background glow */}
              <div className={`absolute inset-0 ${delayConfig.colors.accent} opacity-10 rounded-2xl`} />
              
              {/* Beautiful rotating clock animation */}
              {status === 'processing' ? (
                <div className="relative z-10">
                  <div className="w-8 h-8 relative">
                    {/* Clock face */}
                    <div className="absolute inset-0 border-2 border-amber-600 rounded-full bg-white/80" />
                    {/* Hour hand */}
                    <div className="absolute top-1/2 left-1/2 w-0.5 h-2 bg-amber-700 origin-bottom transform -translate-x-1/2 -translate-y-full animate-spin-slow" />
                    {/* Minute hand */}
                    <div className="absolute top-1/2 left-1/2 w-0.5 h-3 bg-amber-600 origin-bottom transform -translate-x-1/2 -translate-y-full animate-spin" />
                    {/* Center dot */}
                    <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-amber-800 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                </div>
              ) : (
                <span className="relative z-10">⏱️</span>
              )}
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
              title="Edit Delay"
            >
              <span className="text-lg">✏️</span>
            </button>
            <button
              onClick={handleDeleteClick}
              className="w-10 h-10 rounded-xl bg-white/70 hover:bg-red-100/80 backdrop-blur-sm 
                        flex items-center justify-center transition-all duration-300 
                        hover:scale-110 shadow-lg border border-white/40 hover:shadow-xl"
              title="Delete Delay"
            >
              <span className="text-lg">🗑️</span>
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-3 mb-4">
          {/* Primary: Delay Name */}
          <h3 className={`
            font-bold text-xl leading-tight
            bg-gradient-to-r ${delayConfig.colors.primary} bg-clip-text text-transparent
            group-hover:scale-105 transition-transform duration-300
          `}>
            {getDisplayName()}
          </h3>
          
          {/* Secondary: Description */}
          <p className="text-sm text-gray-700 leading-relaxed opacity-90 font-medium">
            {getDelayDescription()}
          </p>
        </div>

        {/* Delay Display - Beautiful countdown */}
        <div className="mb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 p-4">
            <div className="text-center">
              {/* Duration Display */}
              <div className={`
                text-3xl font-bold mb-2
                bg-gradient-to-r ${delayConfig.colors.primary} bg-clip-text text-transparent
                ${status === 'processing' ? 'animate-pulse' : ''}
              `}>
                {parseDuration(safeData.duration)}
              </div>
              
              {/* Remaining Time */}
              {status === 'processing' && remainingTime > 0 && (
                <div className="text-sm text-amber-600 font-medium">
                  {remainingTime.toFixed(1)}s remaining
                </div>
              )}
              
              {/* Progress Bar for Processing */}
              {status === 'processing' && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200/50 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                    <div 
                      className={`h-full bg-gradient-to-r ${delayConfig.colors.primary} rounded-full transition-all duration-500 ease-out`}
                      style={{ width: `${executionProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer: Delay Type Badge + Performance */}
        <div className="flex items-center justify-between pt-3 border-t border-white/30">
          <div className={`
            px-4 py-2 rounded-full ${delayConfig.colors.secondary}
            ${delayConfig.colors.text} text-sm font-bold
            shadow-lg backdrop-blur-sm border border-white/40
            hover:scale-105 transition-transform duration-300
          `}>
            {delayConfig.name}
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
              <span className="text-amber-400 text-lg">⏱️</span>
              <div className="font-bold text-amber-300">Delay Details</div>
            </div>
            
            <div className="text-sm leading-relaxed opacity-90">
              {getDelayDescription()}
            </div>
            
            {/* Configuration Info */}
            <div>
              <div className="font-semibold text-blue-300 pt-2 flex items-center gap-2">
                <span>⚙️</span>Configuration
              </div>
              <div className="text-sm opacity-80 mt-1 space-y-1">
                <div>Duration: {parseDuration(safeData.duration)}</div>
                <div>Type: {safeData.delayType}</div>
                {remainingTime > 0 && (
                  <div>Remaining: {remainingTime.toFixed(1)}s</div>
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
  );
});

DelayNode.propTypes = {
  data: PropTypes.object.isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
  isCompact: PropTypes.bool,
  isDimmed: PropTypes.bool,
  isHighlighted: PropTypes.bool,
  enhancementMode: PropTypes.string,
  onHover: PropTypes.func,
  onUnhover: PropTypes.func,
};

DelayNode.displayName = 'DelayNode';

export default DelayNode; 