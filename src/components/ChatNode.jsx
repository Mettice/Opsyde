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

const ChatNode = memo(({ data, isConnectable, selected }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle, processing, success, error, waiting
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [cost, setCost] = useState(0);
  
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

  // Get status icon and color
  const getStatusDisplay = () => {
    switch (status) {
      case 'processing':
        return { icon: '⚡', color: 'text-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
      case 'success':
        return { icon: '✅', color: 'text-green-500', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
      case 'error':
        return { icon: '❌', color: 'text-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
      case 'waiting':
        return { icon: '⏳', color: 'text-yellow-500', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
      default:
        return { icon: '💬', color: 'text-pink-600', bgColor: 'bg-pink-50', borderColor: 'border-pink-200' };
    }
  };

  const statusDisplay = getStatusDisplay();

  // Memoized styles
  const containerStyle = useMemo(() => 
    clsx(
      baseStyles.container,
      selected ? 'border-2 border-pink-500' : 'border-2 border-pink-200'
    ), [selected]);

  const handleStyle = useMemo(() => ({
    target: {
      className: "w-4 h-4 bg-pink-600 hover:bg-pink-500 hover:w-5 hover:h-5 transition-all -top-2",
      style: { top: '-0.5rem' }
    },
    source: {
      className: "w-4 h-4 bg-pink-600 hover:bg-pink-500 hover:w-5 hover:h-5 transition-all -bottom-2",
      style: { bottom: '-0.5rem' }
    }
  }), []);

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

  if (!data) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded">
        Error: ChatNode requires the 'data' prop
      </div>
    );
  }

  return (
    <div 
      className={`
        relative group w-80
        bg-gradient-to-br from-white via-pink-50/30 to-pink-100/20
        backdrop-blur-sm border-2 rounded-2xl
        shadow-lg shadow-pink-100/50
        transition-all duration-300 ease-out
        hover:shadow-2xl hover:shadow-pink-200/60 hover:scale-[1.02] hover:-translate-y-1
        ${selected ? 
          'border-pink-400 shadow-pink-300/60 scale-[1.01]' : 
          `${statusDisplay.borderColor} hover:border-pink-300`
        }
        ${status === 'processing' ? 'animate-pulse' : ''}
        ${status === 'error' ? 'animate-shake' : ''}
      `}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Animated border for processing state */}
      {status === 'processing' && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 opacity-75 animate-spin-slow -z-10" 
             style={{ padding: '2px' }}>
          <div className="w-full h-full rounded-2xl bg-white"></div>
        </div>
      )}

      {/* Execution Progress Ring */}
      {(status === 'processing' || executionProgress > 0) && (
        <div className="absolute -top-2 -right-2 w-8 h-8">
          <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
            <circle
              cx="16" cy="16" r="14"
              fill="none" stroke="currentColor" strokeWidth="2"
              className="text-gray-200"
            />
            <circle
              cx="16" cy="16" r="14"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeDasharray={`${executionProgress * 0.88} 88`}
              className="text-pink-500 transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-pink-600">
              {Math.round(executionProgress)}%
            </span>
          </div>
        </div>
      )}

      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable}
        className="w-4 h-4 bg-gradient-to-r from-pink-400 to-pink-600 border-2 border-white shadow-lg hover:scale-125 transition-transform duration-200"
        style={{ top: -8 }}
        id={`${data.id}-target`}
        title="Connect from: Agent, Task, Tool"
      />
      
      {/* Header Section */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`
              w-12 h-12 rounded-xl ${statusDisplay.bgColor} 
              flex items-center justify-center text-2xl
              shadow-inner border ${statusDisplay.borderColor}
              ${status === 'processing' ? 'animate-bounce' : ''}
            `}>
              {statusDisplay.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-800 leading-tight">
                {data.label}
              </h3>
              <div className="text-xs text-gray-500 mt-1">
                Chat Interface
              </div>
            </div>
          </div>
          
          {/* Status indicator */}
          <div className={`
            px-2 py-1 rounded-full text-xs font-medium
            ${statusDisplay.color} ${statusDisplay.bgColor}
          `}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        </div>

        {data.description && (
          <div className="mb-3">
            <div className="flex items-start gap-2">
              <span className="font-medium text-gray-600 min-w-[70px]">Description:</span>
              <span className="text-gray-800 flex-1 text-sm">{data.description}</span>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {status === 'processing' && (
        <div className="px-4 pb-3">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-pink-400 to-pink-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${executionProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-gray-600">
              ⚡ {executionTime > 0 ? `${executionTime.toFixed(1)}s` : '--'}
            </span>
            <span className="flex items-center gap-1 text-gray-600">
              💰 ${cost > 0 ? cost.toFixed(3) : '0.000'}
            </span>
          </div>
          <span className="flex items-center gap-1 text-gray-600">
            💬 {messages.length} msgs
          </span>
        </div>
      </div>
      
      {/* Messages Container */}
      <div className="px-4 pb-3">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 p-3 max-h-48 overflow-y-auto">
          <div className="space-y-2">
            {messages.map((msg, idx) => (
              <Message key={idx} message={msg} />
            ))}
            {isStreaming && <Message message={{ text: currentMessage, from: "bot" }} />}
            {messages.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-4">
                No messages yet. Start a conversation!
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Input Section */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && sendMessage()}
            className="flex-1 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="Type your message..."
          />
          <button
            onClick={sendMessage}
            className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white text-sm px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
          >
            Send
          </button>
        </div>
      </div>
      
      {/* Model Information */}
      {data.llmModel && (
        <div className="px-4 pb-3">
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white/50">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-medium text-gray-600">Model:</span>
                <div className="text-gray-800 font-mono">{data.llmModel}</div>
              </div>
              {data.temperature && (
                <div>
                  <span className="font-medium text-gray-600">Temp:</span>
                  <div className="text-gray-800">{data.temperature}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <button 
            onClick={handleEditClick}
            className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
          >
            Edit
          </button>
          <button 
            onClick={handleDeleteClick}
            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
          >
            Delete
          </button>
        </div>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable}
        className="w-4 h-4 bg-gradient-to-r from-pink-600 to-pink-800 border-2 border-white shadow-lg hover:scale-125 transition-transform duration-200"
        style={{ bottom: -8 }}
        id={`${data.id}-source`}
        title="Connect to: Task, Tool"
      />

      {/* Glow effect for selected state */}
      {selected && (
        <div className="absolute inset-0 rounded-2xl bg-pink-400/20 -z-10 blur-xl" />
      )}
    </div>
  );
});

ChatNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    prompt: PropTypes.string,
    model: PropTypes.string,
    nodeId: PropTypes.string,
    nodeType: PropTypes.string,
    llmModel: PropTypes.string,
    temperature: PropTypes.number,
    messages: PropTypes.arrayOf(PropTypes.shape({
      text: PropTypes.string,
      from: PropTypes.string
    })),
    description: PropTypes.string,
    executionState: PropTypes.object
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool
};

ChatNode.displayName = 'ChatNode';

export default ChatNode; 