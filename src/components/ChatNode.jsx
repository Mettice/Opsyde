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
    <div className={containerStyle} onClick={(e) => e.stopPropagation()}>
      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable}
        {...handleStyle.target}
        id={`${data.id}-target`}
        title="Connect from: Agent, Task, Tool"
      >
        <div className="absolute -top-5 text-xs text-gray-500 whitespace-nowrap">← Input</div>
      </Handle>
      
      <div className={baseStyles.header}>{data.label}</div>
      
      {data.description && (
        <div className={baseStyles.description}>{data.description}</div>
      )}
      
      <div className={baseStyles.messagesContainer}>
        {messages.map((msg, idx) => (
          <Message key={idx} message={msg} />
        ))}
        {isStreaming && <Message message={{ text: currentMessage, from: "bot" }} />}
      </div>
      
      <div className={baseStyles.inputContainer}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage()}
          className={baseStyles.input}
          placeholder="Type your message..."
        />
        <button
          onClick={sendMessage}
          className={baseStyles.sendButton}
        >
          Send
        </button>
      </div>
      
      {data.llmModel && (
        <div className={baseStyles.modelInfo}>
          <span className="font-medium">Model:</span> {data.llmModel}
          {data.temperature && (
            <span className="ml-2">
              <span className="font-medium">Temp:</span> {data.temperature}
            </span>
          )}
        </div>
      )}
      
      <div className={baseStyles.actionButtons}>
        <button 
          onClick={handleEditClick}
          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
        >
          Edit
        </button>
        <button 
          onClick={handleDeleteClick}
          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
        >
          Delete
        </button>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable}
        {...handleStyle.source}
        id={`${data.id}-source`}
        title="Connect to: Task, Tool"
      >
        <div className="absolute -bottom-5 text-xs text-gray-500 whitespace-nowrap">→ Output</div>
      </Handle>
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
    description: PropTypes.string
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool
};

ChatNode.displayName = 'ChatNode';

export default ChatNode; 