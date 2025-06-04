import React, { useCallback, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Handle, Position } from 'reactflow';

const AgentCard = React.memo(({ data, selected, isConnectable, enhancementMode, isCompact, isFocused, isDimmed }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [cost, setCost] = useState(0);
  const [status, setStatus] = useState('idle');
  const [showTooltip, setShowTooltip] = useState(false);

  // Get framework ID if an object is passed, otherwise use the string value
  const frameworkId = typeof data.framework === 'object' ? data.framework.id || 'openrouter' : data.framework || 'openrouter';
  
  // Simulate execution progress and metrics
  useEffect(() => {
    if (data.executionState) {
      setStatus(data.executionState.status || 'idle');
      setExecutionProgress(data.executionState.progress || 0);
      setExecutionTime(data.executionState.time || 0);
      setCost(data.executionState.cost || 0);
      setIsProcessing(data.executionState.status === 'processing');
    }
  }, [data.executionState]);

  const handleEditClick = useCallback((e) => {
    e?.stopPropagation();
    e?.preventDefault();
    
    document.dispatchEvent(new CustomEvent('node-edit', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'agent',
        data: {
          ...data,
          framework: frameworkId
        }
      } 
    }));
  }, [data, frameworkId]);

  const handleDeleteClick = useCallback((e) => {
    e?.stopPropagation();
    e?.preventDefault();
    
    document.dispatchEvent(new CustomEvent('node-delete', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'agent'
      } 
    }));
  }, [data?.nodeId, data?.nodeType]);

  // Smart status system with beautiful visual states
  const getStatusConfig = () => {
    const configs = {
      processing: {
        icon: '⚡',
        pulse: 'animate-pulse',
        glow: 'shadow-blue-500/40',
        gradient: 'from-blue-400/20 to-purple-500/20',
        border: 'border-blue-400/60',
        dot: 'bg-gradient-to-r from-blue-400 to-blue-600',
        overlay: 'bg-gradient-to-br from-blue-500/10 to-purple-600/10'
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
        glow: 'shadow-yellow-500/40',
        gradient: 'from-yellow-400/20 to-orange-500/20',
        border: 'border-yellow-400/60',
        dot: 'bg-gradient-to-r from-yellow-400 to-orange-500',
        overlay: 'bg-gradient-to-br from-yellow-500/10 to-orange-600/10'
      },
      idle: {
        icon: '🤖',
        pulse: '',
        glow: 'shadow-indigo-300/50',
        gradient: 'from-white/90 to-indigo-50/80',
        border: 'border-indigo-200/70',
        dot: 'bg-gradient-to-r from-indigo-400 to-purple-500',
        overlay: 'bg-gradient-to-br from-indigo-500/5 to-purple-600/5'
      }
    };
    return configs[status] || configs.idle;
  };

  const statusConfig = getStatusConfig();

  // Beautiful framework display with stunning colors and glass effects
  const getFrameworkConfig = () => {
    const configs = {
      openai: { 
        emoji: '🧠', 
        name: 'OpenAI',
        colors: {
          primary: 'from-emerald-400 to-green-600',
          secondary: 'from-emerald-50/90 to-green-100/80',
          accent: 'bg-gradient-to-r from-emerald-500 to-green-600',
          text: 'text-emerald-700',
          glow: 'shadow-emerald-400/30',
          border: 'border-emerald-300/50',
          glass: 'bg-gradient-to-br from-emerald-500/10 to-green-600/10'
        }
      },
      anthropic: { 
        emoji: '🔮', 
        name: 'Claude',
        colors: {
          primary: 'from-orange-400 to-red-500',
          secondary: 'from-orange-50/90 to-red-100/80',
          accent: 'bg-gradient-to-r from-orange-500 to-red-600',
          text: 'text-orange-700',
          glow: 'shadow-orange-400/30',
          border: 'border-orange-300/50',
          glass: 'bg-gradient-to-br from-orange-500/10 to-red-600/10'
        }
      },
      openrouter: { 
        emoji: '🚀', 
        name: 'OpenRouter',
        colors: {
          primary: 'from-purple-400 to-indigo-600',
          secondary: 'from-purple-50/90 to-indigo-100/80',
          accent: 'bg-gradient-to-r from-purple-500 to-indigo-600',
          text: 'text-purple-700',
          glow: 'shadow-purple-400/30',
          border: 'border-purple-300/50',
          glass: 'bg-gradient-to-br from-purple-500/10 to-indigo-600/10'
        }
      },
      crewai: { 
        emoji: '🎯', 
        name: 'CrewAI',
        colors: {
          primary: 'from-blue-400 to-cyan-600',
          secondary: 'from-blue-50/90 to-cyan-100/80',
          accent: 'bg-gradient-to-r from-blue-500 to-cyan-600',
          text: 'text-blue-700',
          glow: 'shadow-blue-400/30',
          border: 'border-blue-300/50',
          glass: 'bg-gradient-to-br from-blue-500/10 to-cyan-600/10'
        }
      },
      perplexity: { 
        emoji: '🔍', 
        name: 'Perplexity',
        colors: {
          primary: 'from-cyan-400 to-teal-600',
          secondary: 'from-cyan-50/90 to-teal-100/80',
          accent: 'bg-gradient-to-r from-cyan-500 to-teal-600',
          text: 'text-cyan-700',
          glow: 'shadow-cyan-400/30',
          border: 'border-cyan-300/50',
          glass: 'bg-gradient-to-br from-cyan-500/10 to-teal-600/10'
        }
      },
      default: { 
        emoji: '⚡', 
        name: 'AI',
        colors: {
          primary: 'from-slate-400 to-gray-600',
          secondary: 'from-slate-50/90 to-gray-100/80',
          accent: 'bg-gradient-to-r from-slate-500 to-gray-600',
          text: 'text-slate-700',
          glow: 'shadow-slate-400/30',
          border: 'border-slate-300/50',
          glass: 'bg-gradient-to-br from-slate-500/10 to-gray-600/10'
        }
      }
    };
    return configs[frameworkId.toLowerCase()] || configs.default;
  };

  const frameworkConfig = getFrameworkConfig();

  // Ensure data is properly structured
  const safeData = {
    ...data,
    label: data.label || 'AI Agent',
    role: data.role || '',
    goal: data.goal || '',
    backstory: data.backstory || '',
    llmModel: data.llmModel || 'gpt-4',
  };

  // Smart content - only show what matters
  const getDisplayName = () => {
    return safeData.label || safeData.role || 'AI Agent';
  };

  const getDisplayRole = () => {
    if (safeData.role && safeData.role !== safeData.label) {
      return safeData.role.length > 30 ? safeData.role.substring(0, 30) + '...' : safeData.role;
    }
    return safeData.goal && safeData.goal.length > 40 ? safeData.goal.substring(0, 40) + '...' : safeData.goal;
  };

  return (
    <>
      {/* Rotating shadow/glow effect for processing state */}
      {status === 'processing' && (
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-indigo-500/20 rounded-3xl blur-xl animate-spin" 
               style={{ transform: 'scale(1.1)' }} />
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-blue-500/15 rounded-3xl blur-lg animate-spin" 
               style={{ transform: 'scale(1.05)', animationDirection: 'reverse', animationDuration: '3s' }} />
        </div>
      )}

      {/* 🔥 PREMIUM GLASSMORPHISM CARD - Our Signature Design */}
      <div 
        className={`
          relative group w-80 h-auto overflow-hidden
          backdrop-blur-xl bg-white/80 border border-white/40
          rounded-3xl shadow-2xl ${statusConfig.glow} ${frameworkConfig.colors.glow}
          transition-all duration-700 ease-out
          hover:scale-[1.03] hover:shadow-2xl hover:bg-white/90
          hover:backdrop-blur-2xl hover:-translate-y-1
          ${selected ? 'ring-2 ring-blue-400/60 ring-offset-2 ring-offset-white/50 shadow-blue-400/40' : ''}
          ${isFocused ? 'scale-105 ring-2 ring-purple-400/60 shadow-purple-400/40' : ''}
          ${isDimmed ? 'opacity-50 scale-95' : ''}
          ${statusConfig.pulse}
        `}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Beautiful Animated Background Gradients */}
        <div className={`absolute inset-0 ${frameworkConfig.colors.glass} rounded-3xl`} />
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
          {/* Header: Framework Icon + Status with premium styling */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Premium Framework Icon */}
              <div className={`
                w-14 h-14 rounded-2xl ${frameworkConfig.colors.secondary} 
                ${frameworkConfig.colors.border} border-2
                flex items-center justify-center text-2xl
                shadow-lg backdrop-blur-sm
                group-hover:scale-110 transition-transform duration-300
                relative overflow-hidden
                ${status === 'processing' ? 'animate-spin' : ''}
              `}>
                {/* Icon background glow */}
                <div className={`absolute inset-0 ${frameworkConfig.colors.accent} opacity-10 rounded-2xl`} />
                <span className="relative z-10">{frameworkConfig.emoji}</span>
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
                title="Edit Agent"
              >
                <span className="text-lg">✏️</span>
              </button>
              <button
                onClick={handleDeleteClick}
                className="w-10 h-10 rounded-xl bg-white/70 hover:bg-red-100/80 backdrop-blur-sm 
                          flex items-center justify-center transition-all duration-300 
                          hover:scale-110 shadow-lg border border-white/40 hover:shadow-xl"
                title="Delete Agent"
              >
                <span className="text-lg">🗑️</span>
              </button>
            </div>
          </div>

          {/* Smart Content Hierarchy with beautiful typography */}
          <div className="space-y-3">
            {/* Primary: Agent Name with gradient text */}
            <h3 className={`
              font-bold text-xl leading-tight
              bg-gradient-to-r ${frameworkConfig.colors.primary} bg-clip-text text-transparent
              group-hover:scale-105 transition-transform duration-300
            `}>
              {getDisplayName()}
            </h3>
            
            {/* Secondary: Role/Purpose with subtle styling */}
            {getDisplayRole() && (
              <p className="text-sm text-gray-700 leading-relaxed opacity-90 font-medium">
                {getDisplayRole()}
              </p>
            )}
          </div>

          {/* Footer: Framework Badge with premium styling */}
          <div className="flex items-center justify-between pt-3 border-t border-white/30">
            <div className={`
              px-4 py-2 rounded-full ${frameworkConfig.colors.secondary}
              ${frameworkConfig.colors.text} text-sm font-bold
              shadow-lg backdrop-blur-sm border border-white/40
              ${frameworkConfig.colors.accent} bg-clip-text text-transparent
              hover:scale-105 transition-transform duration-300
            `}>
              {frameworkConfig.name}
            </div>
            
            {/* Model info with glass effect */}
            {safeData.llmModel && (
              <div className="px-3 py-1 rounded-lg bg-white/50 backdrop-blur-sm border border-white/40 shadow-md">
                <div className="text-xs text-gray-600 font-mono font-semibold">
                  {safeData.llmModel.replace('gpt-', 'GPT-').replace('claude-', 'Claude-')}
                </div>
              </div>
            )}
          </div>

          {/* Execution progress bar with beautiful styling */}
          {status === 'processing' && executionProgress > 0 && (
            <div className="space-y-2 pt-2">
              <div className="w-full bg-white/40 backdrop-blur-sm rounded-full h-2 shadow-inner border border-white/30">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${frameworkConfig.colors.accent} shadow-lg`}
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
          position={Position.Left}
          isConnectable={isConnectable}
          className="w-4 h-4 bg-gradient-to-r from-blue-400 to-blue-600 border-2 border-white shadow-xl rounded-full"
        />
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-500 border-2 border-white shadow-xl rounded-full"
        />
      </div>

      {/* Rich Tooltip with premium glassmorphism */}
      {showTooltip && safeData.goal && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 z-50 w-80 p-5 
                       bg-gray-900/95 backdrop-blur-2xl text-white rounded-2xl shadow-2xl 
                       border border-gray-700/50 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Tooltip content with beautiful styling */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-lg">{frameworkConfig.emoji}</span>
              <div className="font-bold text-blue-300">Agent Details</div>
            </div>
            
            <div className="text-sm leading-relaxed">{safeData.goal}</div>
            
            {safeData.backstory && (
              <>
                <div className="font-semibold text-purple-300 pt-2 flex items-center gap-2">
                  <span>🎭</span>Background
                </div>
                <div className="text-sm leading-relaxed opacity-90">
                  {safeData.backstory.length > 120 ? safeData.backstory.substring(0, 120) + '...' : safeData.backstory}
                </div>
              </>
            )}
            
            <div className="flex justify-between pt-3 border-t border-gray-700 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span>🚀</span>Framework: {frameworkConfig.name}
              </span>
              <span className="flex items-center gap-1">
                <span>🧠</span>Model: {safeData.llmModel}
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

AgentCard.propTypes = {
  data: PropTypes.object.isRequired,
  selected: PropTypes.bool,
  isConnectable: PropTypes.bool,
  enhancementMode: PropTypes.string,
  isCompact: PropTypes.bool,
  isFocused: PropTypes.bool,
  isDimmed: PropTypes.bool,
};

AgentCard.displayName = 'AgentCard';

export default AgentCard;