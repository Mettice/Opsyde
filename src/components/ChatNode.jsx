import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'github-markdown-css/github-markdown.css';

const ChatNode = React.memo(({ data, isConnectable, selected }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  
  // Create stable event handlers with useCallback
  const handleEditClick = useCallback((e) => {
    // Ensure we have an event object
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Dispatch a custom event that Builder.jsx will listen for
    const event = new CustomEvent('node-edit', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'chatbot'
      } 
    });
    document.dispatchEvent(event);
  }, [data?.nodeId, data?.nodeType]);

  const handleDeleteClick = useCallback((e) => {
    // Ensure we have an event object
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Dispatch a custom event that Builder.jsx will listen for
    const event = new CustomEvent('node-delete', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'chatbot'
      } 
    });
    document.dispatchEvent(event);
  }, [data?.nodeId, data?.nodeType]);

  const sendMessage = async () => {
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
      setMessages([...messages, { text: input, from: "user" }, { text: reply, from: "bot" }]);
      setInput("");
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages([...messages, { text: input, from: "user" }, { text: "Error: Could not get a response", from: "bot" }]);
      setInput("");
    }
  };

  useEffect(() => {
    if (data.messages) {
      setMessages(data.messages);
    }
  }, [data.messages]);

  const renderMessage = (message) => {
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
  };

  // Handle rendering with an error message if data is missing
  if (!data) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded">
        Error: ChatNode requires the 'data' prop
      </div>
    );
  }

  return (
    <div 
      className={`bg-white border-2 ${selected ? 'border-pink-500' : 'border-pink-200'} p-3 rounded-lg shadow-md w-64 min-h-[200px] chat-node ${selected ? 'selected' : ''}`}
      data-nodeid={data.id}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      {/* Target handle at top */}
      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable}
        className="w-4 h-4 bg-pink-600 hover:bg-pink-500 hover:w-5 hover:h-5 transition-all -top-2"
        id={`${data.id}-target`}
        title="Connect from: Agent, Task, Tool"
      >
        <div className="absolute -top-5 text-xs text-gray-500 whitespace-nowrap">← Input</div>
      </Handle>
      
      <h3 className="text-lg font-bold text-pink-700 mb-1">{data.label}</h3>
      
      {data.description && (
        <div className="text-xs text-gray-600 mb-2">
          {data.description}
        </div>
      )}
      
      <div className="chat-messages space-y-2 max-h-60 overflow-y-auto">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.from === "bot" ? "assistant" : "user"}`}>
            {renderMessage(msg)}
          </div>
        ))}
        {isStreaming && (
          <div className="message assistant">
            {renderMessage({ text: currentMessage, from: "bot" })}
          </div>
        )}
      </div>
      
      <div className="flex items-center">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage()}
          className="flex-1 border border-gray-300 rounded-l px-2 py-1 text-sm"
          placeholder="Type your message..."
        />
        <button
          onClick={sendMessage}
          className="bg-pink-500 hover:bg-pink-600 text-white text-sm px-3 py-1 rounded-r"
        >
          Send
        </button>
      </div>
      
      {data.llmModel && (
        <div className="text-xs text-gray-600 mt-2">
          <span className="font-medium">Model:</span> {data.llmModel}
          {data.temperature && (
            <span className="ml-2">
              <span className="font-medium">Temp:</span> {data.temperature}
            </span>
          )}
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex mt-3 space-x-2">
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleEditClick(e);
          }}
          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
        >
          Edit
        </button>
        
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick(e);
          }}
          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
        >
          Delete
        </button>
      </div>
      
      {/* Source handle at bottom */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable}
        className="w-4 h-4 bg-pink-600 hover:bg-pink-500 hover:w-5 hover:h-5 transition-all -bottom-2"
        id={`${data.id}-source`}
        title="Connect to: Task, Tool"
      >
        <div className="absolute -bottom-5 text-xs text-gray-500 whitespace-nowrap">→ Output</div>
      </Handle>
    </div>
  );
});

// Define PropTypes for type safety and documentation
ChatNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    prompt: PropTypes.string,
    model: PropTypes.string,
    nodeId: PropTypes.string,
    nodeType: PropTypes.string,
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
};

// Add a display name for better debugging
ChatNode.displayName = 'ChatNode';

export default ChatNode; 