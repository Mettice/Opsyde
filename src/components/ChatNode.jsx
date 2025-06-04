import React, { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'github-markdown-css/github-markdown.css';
import clsx from 'clsx';

// Base styles
const baseStyles = {
  container: "bg-white p-3 rounded-lg shadow-md w-64 min-h-[200px] chat-node",
  header: "text-lg font-bold text-pink-700 mb-1",
  description: "text-xs text-gray-600 mb-2",
  messagesContainer: "chat-messages space-y-2 max-h-60 overflow-y-auto",
  inputContainer: "flex items-center",
  input: "flex-1 border border-gray-300 rounded-l px-2 py-1 text-sm",
  sendButton: "bg-pink-500 hover:bg-pink-600 text-white text-sm px-3 py-1 rounded-r",
  modelInfo: "text-xs text-gray-600 mt-2",
  actionButtons: "flex mt-3 space-x-2"
};

// Memoized Message component
const Message = memo(({ message }) => {
  return (
    <div className={`chat-message ${message.role} markdown-body`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({node, inline, className, children, ...props}) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {message.text}
      </ReactMarkdown>
    </div>
  );
});

Message.propTypes = {
  message: PropTypes.shape({
    text: PropTypes.string.isRequired,
    role: PropTypes.string.isRequired
  }).isRequired
};

Message.displayName = 'Message';

const ChatNode = memo(({ 
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
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle, processing, success, error, waiting
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [cost, setCost] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Safe data access
  const safeData = {
    label: data?.label || 'Chat Node',
    description: data?.description || 'Interactive AI chat interface',
    model: data?.model || 'gpt-4',
    temperature: data?.temperature || 0.7,
    nodeId: data?.nodeId || '',
    nodeType: data?.nodeType || 'chatbot'
  };
  
  // Simulate execution progress and metrics
  useEffect(() => {
    if (data.executionState) {
      setStatus(data.executionState.status || 'idle');
      setExecutionProgress(data.executionState.progress || 0);
      setExecutionTime(data.executionState.time || 0);
      setCost(data.executionState.cost || 0);
      setIsStreaming(data.executionState.status === 'processing');
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
          icon: '💬',
          color: 'text-pink-500',
          bgColor: 'bg-pink-500/10',
          borderColor: 'border-pink-300/30',
          textColor: 'text-pink-700',
          gradient: 'from-pink-400 to-pink-600',
          glowColor: 'shadow-pink-300/40',
          pulse: ''
        };
    }
  };

  // Chat configuration
  const getChatConfig = () => {
    return {
      name: 'AI Chat',
      colors: {
        primary: 'from-pink-600 to-purple-600',
        secondary: 'bg-pink-50/80',
        accent: 'bg-pink-500',
        text: 'text-pink-700',
        border: 'border-pink-200/40'
      }
    };
  };

  const statusConfig = getStatusConfig();
  const chatConfig = getChatConfig();
  
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
        nodeType: data.nodeType || 'chatbot'
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
        nodeType: data.nodeType || 'chatbot'
      } 
    }));
  }, [data?.nodeId, data?.nodeType]);

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    
    try {
      const res = await fetch("/chat", {
        method: "POST",
        body: JSON.stringify({
          message: input,
          chat_id: data.nodeId,
          history: messages.map(m => m.text)
        }),
        headers: { "Content-Type": "application/json" }
      });
    
      const { reply } = await res.json();
      setMessages(prev => [...prev, 
        { text: input, from: "user" }, 
        { text: reply, from: "bot" }
      ]);
      setInput("");
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, 
        { text: input, from: "user" }, 
        { text: "Error: Could not get a response", from: "bot" }
      ]);
      setInput("");
    }
  }, [input, data.nodeId, messages]);

  // Load messages from data
  useEffect(() => {
    if (data.messages) {
      setMessages(data.messages);
    }
  }, [data.messages]);

  // Helper functions
  const getDisplayName = () => {
    return safeData.label || 'AI Chat';
  };

  const getChatDescription = () => {
    return safeData.description;
  };

  if (!data) {
    return (
      <div className="w-72 h-32 bg-gray-100 rounded-2xl flex items-center justify-center">
        <span className="text-gray-500">No chat data</span>
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
          `border-pink-400/60 shadow-pink-400/30 scale-[1.01]` : 
          `${statusConfig.borderColor} hover:border-pink-400/40`
        }
        ${isCompact ? 'w-64 scale-90' : 'w-72'}
        ${isDimmed ? 'opacity-50 scale-95' : ''}
        ${isHighlighted ? 'ring-4 ring-pink-400/50 ring-opacity-75 scale-105' : ''}
        ${enhancementMode === 'focus' && !isHighlighted ? 'blur-sm opacity-60' : ''}
        ${statusConfig.pulse}
        overflow-hidden
        min-h-[400px]
      `}
    >
      {/* Floating Glass Orbs Background */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-pink-200/30 to-purple-300/20 rounded-full blur-xl animate-float" />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-tr from-purple-200/20 to-pink-300/30 rounded-full blur-2xl animate-float-delayed" />
        <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-gradient-to-br from-pink-300/20 to-purple-200/25 rounded-full blur-lg animate-float-slow" />
      </div>

      {/* Animated Gradient Background */}
      <div className={`
        absolute inset-0 rounded-2xl opacity-30
        bg-gradient-to-br from-pink-100/50 via-purple-50/30 to-pink-100/40
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
          bg-gradient-to-r ${chatConfig.colors.primary}
          hover:scale-125 transition-all duration-300
          hover:shadow-pink-300/60
        `}
        style={{ top: -10 }}
        isConnectable={isConnectable}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        className={`
          w-5 h-5 rounded-full shadow-xl border-3 border-white/60 backdrop-blur-sm
          bg-gradient-to-r ${chatConfig.colors.primary}
          hover:scale-125 transition-all duration-300
          hover:shadow-pink-300/60
        `}
        style={{ bottom: -10 }}
        isConnectable={isConnectable}
      />
      
      {/* Main Content with Glass Effect */}
      <div className="relative z-10 p-5 h-full flex flex-col">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`
              relative w-14 h-14 rounded-2xl ${chatConfig.colors.secondary} 
              ${chatConfig.colors.border} border-2
              flex items-center justify-center text-2xl
              shadow-lg backdrop-blur-sm
              group-hover:scale-110 transition-transform duration-300
              overflow-hidden
            `}>
              {/* Icon background glow */}
              <div className={`absolute inset-0 ${chatConfig.colors.accent} opacity-10 rounded-2xl`} />
              <span className="relative z-10">💬</span>
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
              title="Edit Chat"
            >
              <span className="text-lg">✏️</span>
            </button>
            <button
              onClick={handleDeleteClick}
              className="w-10 h-10 rounded-xl bg-white/70 hover:bg-red-100/80 backdrop-blur-sm 
                        flex items-center justify-center transition-all duration-300 
                        hover:scale-110 shadow-lg border border-white/40 hover:shadow-xl"
              title="Delete Chat"
            >
              <span className="text-lg">🗑️</span>
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-3 mb-4">
          {/* Primary: Chat Name */}
          <h3 className={`
            font-bold text-xl leading-tight
            bg-gradient-to-r ${chatConfig.colors.primary} bg-clip-text text-transparent
            group-hover:scale-105 transition-transform duration-300
          `}>
            {getDisplayName()}
          </h3>
          
          {/* Secondary: Description */}
          <p className="text-sm text-gray-700 leading-relaxed opacity-90 font-medium">
            {getChatDescription()}
          </p>
        </div>

        {/* Chat Messages Container */}
        <div className="flex-1 min-h-[150px] bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 p-3 mb-3">
          <div className="h-full overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-pink-300 scrollbar-track-pink-100">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Start a conversation...
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`
                    p-2 rounded-lg max-w-[80%] text-sm
                    ${msg.from === 'user' 
                      ? 'bg-pink-500/20 ml-auto text-pink-800 border border-pink-300/30' 
                      : 'bg-purple-500/20 mr-auto text-purple-800 border border-purple-300/30'
                    }
                  `}
                >
                  {msg.text}
                </div>
              ))
            )}
            {isStreaming && (
              <div className="bg-purple-500/20 mr-auto p-2 rounded-lg text-sm text-purple-800 border border-purple-300/30">
                <div className="flex items-center gap-1">
                  <span>💭</span>
                  <span className="animate-pulse">AI is thinking...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 bg-white/60 backdrop-blur-sm border border-white/40 rounded-lg px-3 py-2 text-sm
                     placeholder-gray-500 text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-400/50
                     transition-all duration-200"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${input.trim() && !isStreaming
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:shadow-lg hover:scale-105'
                : 'bg-gray-300/60 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <span className="text-lg">📤</span>
          </button>
        </div>

        {/* Footer: Chat Type Badge + Performance */}
        <div className="flex items-center justify-between pt-3 border-t border-white/30 mt-3">
          <div className={`
            px-4 py-2 rounded-full ${chatConfig.colors.secondary}
            ${chatConfig.colors.text} text-sm font-bold
            shadow-lg backdrop-blur-sm border border-white/40
            hover:scale-105 transition-transform duration-300
          `}>
            {chatConfig.name}
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
              <span className="text-pink-400 text-lg">💬</span>
              <div className="font-bold text-pink-300">Chat Details</div>
            </div>
            
            <div className="text-sm leading-relaxed opacity-90">
              {getChatDescription()}
            </div>
            
            {/* Configuration Info */}
            <div>
              <div className="font-semibold text-blue-300 pt-2 flex items-center gap-2">
                <span>⚙️</span>Configuration
              </div>
              <div className="text-sm opacity-80 mt-1 space-y-1">
                <div>Model: {safeData.model}</div>
                <div>Temperature: {safeData.temperature}</div>
                <div>Messages: {messages.length}</div>
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

ChatNode.propTypes = {
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

ChatNode.displayName = 'ChatNode';

export default ChatNode; 