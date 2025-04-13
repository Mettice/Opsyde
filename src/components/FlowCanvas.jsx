import React, { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  ConnectionLineType,
  BezierEdge,
  SmoothStepEdge,
  StraightEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import AgentNode from './AgentCard';
import TaskNode from './TaskNode';
import ToolNode from './ToolNode';
import { recommendTemplates } from '../utils/recommendTemplates';
import ConnectionLine from './ConnectionLine';
import ConnectionGuide from './ConnectionGuide';

const edgeStyles = `
  .react-flow__edge:hover .react-flow__edge-path {
    stroke-width: 3px;
    stroke: #ff6b6b;
    cursor: pointer;
  }
`;

const FlowCanvas = ({ 
  nodes, 
  edges, 
  onNodesChange, 
  onEdgesChange, 
  onConnect, 
  onNodeClick,
  onConnectStart,
  onConnectEnd,
  onNodeDragStop,
  onPaneClick,
  onSelectionChange,
  onTemplateApply,
  templates
}) => {
  const reactFlowWrapper = useRef(null);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [connectionInfo, setConnectionInfo] = useState({ sourceType: null, targetType: null });
  const [isConnecting, setIsConnecting] = useState(false);
  const [showConnectionDiagram, setShowConnectionDiagram] = useState(false);
  const [showConnectionRules, setShowConnectionRules] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  // Use useMemo to prevent recreation of nodeTypes on each render
  const nodeTypes = useMemo(() => ({
    agent: AgentNode,
    agentNode: AgentNode,
    task: TaskNode,
    taskNode: TaskNode,
    tool: ToolNode,
    toolNode: ToolNode
  }), []);

  // Define edge types
  const edgeTypes = useMemo(() => ({
    default: BezierEdge,
    bezier: BezierEdge,
    smoothstep: SmoothStepEdge,
    straight: StraightEdge,
  }), []);

  // Handle applying a flow template
  const handleApplyTemplate = useCallback((template) => {
    if (!template) return;
    
    console.log("Applying template:", template);
    
    // Check if it's a flow template (has nodes and edges)
    if (template.nodes && template.edges) {
      if (onTemplateApply) {
        onTemplateApply(template);
      }
    } else if (template.type === 'task' || template.expectedOutput) {
      // It's a task template
      if (onTemplateApply) {
        onTemplateApply({
          ...template,
          type: 'task'  // Ensure type is set
        });
      }
    } else if (template.type === 'tool' || template.toolType) {
      // It's a tool template
      if (onTemplateApply) {
        onTemplateApply({
          ...template,
          type: 'tool'  // Ensure type is set
        });
      }
    } else if (template.type === 'agent' || template.role) {
      // It's an agent template
      if (onTemplateApply) {
        onTemplateApply({
          ...template,
          type: 'agent'  // Ensure type is set
        });
      }
    } else {
      // Unknown template type
      console.error("Unknown template type:", template);
    }
  }, [onTemplateApply]);

  // Handle zooming to fit all nodes
  const handleFitView = useCallback(() => {
    // We'll use the ReactFlow instance method directly from the ref
    if (reactFlowWrapper.current && reactFlowWrapper.current.reactFlowInstance) {
      reactFlowWrapper.current.reactFlowInstance.fitView({ padding: 0.2 });
    }
  }, []);

  // Add a debounce for recommendations
  const recommendationTimeoutRef = useRef(null);

  // Update the useEffect for recommendations
  useEffect(() => {
    // Clear any existing timeout
    if (recommendationTimeoutRef.current) {
      clearTimeout(recommendationTimeoutRef.current);
    }
    
    // Set a new timeout to calculate recommendations after a delay
    recommendationTimeoutRef.current = setTimeout(() => {
      const newRecommendations = recommendTemplates(nodes, edges);
      setRecommendations(newRecommendations);
    }, 500); // 500ms delay
    
    // Cleanup on unmount
    return () => {
      if (recommendationTimeoutRef.current) {
        clearTimeout(recommendationTimeoutRef.current);
      }
    };
  }, [nodes, edges]);

  // Add this function to your FlowCanvas component
  const onEdgeClick = useCallback((event, edge) => {
    // Prevent event from propagating to the canvas
    event.stopPropagation();
    
    // Ask for confirmation before deleting
    if (window.confirm('Are you sure you want to delete this connection?')) {
      // Call the onEdgesChange handler with a remove operation
      onEdgesChange([{ id: edge.id, type: 'remove' }]);
    }
  }, [onEdgesChange]);

  // Update the onConnectStart handler
  const handleConnectStart = useCallback((event, { nodeId, handleType }) => {
    const sourceNode = nodes.find(node => node.id === nodeId);
    if (sourceNode) {
      setConnectionInfo({
        sourceType: sourceNode.type,
        targetType: null
      });
      setIsConnecting(true);
    }
    if (onConnectStart) {
      onConnectStart(event, { nodeId, handleType });
    }
  }, [nodes, onConnectStart]);

  // Add an onConnectStop handler
  const handleConnectStop = useCallback((event) => {
    setConnectionInfo({ sourceType: null, targetType: null });
    setIsConnecting(false);
    if (onConnectEnd) {
      onConnectEnd(event);
    }
  }, [onConnectEnd]);

  // Replace the ConnectionHelpTooltip with this collapsible version
  const ConnectionRulesWidget = () => (
    <div className="absolute top-16 right-4 z-40">
      {showConnectionRules ? (
        <div className="bg-white p-3 rounded shadow-md text-sm max-w-xs">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Connection Rules:</h3>
            <button 
              onClick={() => setShowConnectionRules(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <ul className="list-disc pl-4 space-y-1">
            <li><span className="text-green-600 font-medium">Tools</span> → <span className="text-blue-600 font-medium">Agents</span>: Tools are resources that agents can use</li>
            <li><span className="text-blue-600 font-medium">Agents</span> → <span className="text-yellow-600 font-medium">Tasks</span>: Agents perform tasks</li>
            <li><span className="text-yellow-600 font-medium">Tasks</span> → <span className="text-yellow-600 font-medium">Tasks</span>: Tasks can depend on other tasks</li>
          </ul>
          <div className="mt-2 text-xs text-gray-600">
            <strong>Note:</strong> Always connect from source (bottom handle) to target (top handle)
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setShowConnectionRules(true)}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Connection Rules
        </button>
      )}
    </div>
  );

  // Create a collapsible recommendations widget
  const RecommendationsWidget = () => (
    <div className="absolute top-16 left-4 z-40">
      {showRecommendations ? (
        <div className="bg-white p-3 rounded shadow-md text-sm max-w-xs">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Recommended Templates:</h3>
            <button 
              onClick={() => setShowRecommendations(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {recommendations.length > 0 ? (
              recommendations.map((template, idx) => (
                <div 
                  key={idx}
                  className="border border-gray-200 rounded p-2 hover:bg-blue-50 cursor-pointer"
                  onClick={() => handleApplyTemplate(template)}
                >
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{template.icon || (template.type === 'flow' ? '📋' : '📄')}</span>
                    <div>
                      <h4 className="font-medium text-sm truncate">{template.name}</h4>
                      <p className="text-xs text-gray-600 truncate">{template.description}</p>
                      {template.type && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          template.type === 'agent' ? 'bg-blue-100 text-blue-800' : 
                          template.type === 'task' ? 'bg-yellow-100 text-yellow-800' :
                          template.type === 'tool' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {template.type.charAt(0).toUpperCase() + template.type.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center py-2">No recommendations available</div>
            )}
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setShowRecommendations(true)}
          className="bg-purple-500 text-white px-3 py-1 rounded text-sm flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Recommendations
        </button>
      )}
    </div>
  );

  // Add this component to FlowCanvas.jsx
  const ConnectionDiagram = ({ isVisible, onClose }) => {
    if (!isVisible) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl">
          <h2 className="text-xl font-bold mb-4">CrewAI Connection Flow</h2>
          
          <div className="flex items-center justify-center mb-6">
            <div className="flex flex-col items-center mx-4">
              <div className="w-24 h-16 bg-green-100 border border-green-300 rounded flex items-center justify-center">
                Tool
              </div>
              <div className="text-xs mt-1">Provides capabilities</div>
            </div>
            
            <div className="text-2xl mx-2">→</div>
            
            <div className="flex flex-col items-center mx-4">
              <div className="w-24 h-16 bg-blue-100 border border-blue-300 rounded flex items-center justify-center">
                Agent
              </div>
              <div className="text-xs mt-1">Performs work</div>
            </div>
            
            <div className="text-2xl mx-2">→</div>
            
            <div className="flex flex-col items-center mx-4">
              <div className="w-24 h-16 bg-yellow-100 border border-yellow-300 rounded flex items-center justify-center">
                Task
              </div>
              <div className="text-xs mt-1">Defines work</div>
            </div>
          </div>
          
          <p className="text-sm mb-4">
            In CrewAI, connections follow a specific flow:
          </p>
          
          <ul className="list-disc pl-6 mb-4 text-sm">
            <li><strong>Tools connect to Agents</strong>: Tools are resources that agents can use</li>
            <li><strong>Agents connect to Tasks</strong>: Agents perform specific tasks</li>
            <li><strong>Tasks can connect to other Tasks</strong>: Creating dependencies and workflows</li>
          </ul>
          
          <div className="flex justify-end">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full relative" ref={reactFlowWrapper}>
      <style>{edgeStyles}</style>
      <ConnectionGuide 
        isVisible={isConnecting} 
        sourceType={connectionInfo.sourceType} 
      />
      <ConnectionRulesWidget />
      <RecommendationsWidget />
      <ConnectionDiagram 
        isVisible={showConnectionDiagram} 
        onClose={() => setShowConnectionDiagram(false)} 
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(event, node) => {
          // Only trigger node click if the target is not a button or inside a button
          // and not an edit or delete button
          if (!event.target.closest('button') && 
              !event.target.classList.contains('edit-button') && 
              !event.target.classList.contains('delete-button')) {
            // This should only handle selection, not editing
            if (onNodeClick) {
              onNodeClick(event, node);
            }
          }
        }}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectStop}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineComponent={(props) => (
          <ConnectionLine 
            {...props} 
            sourceType={connectionInfo.sourceType}
            targetType={connectionInfo.targetType}
          />
        )}
        connectionLineType="bezier"
        defaultEdgeOptions={{
          type: 'default',
          animated: true,
          style: { stroke: '#555', strokeWidth: 2, transition: 'stroke 0.3s, stroke-width 0.3s' },
          interactionWidth: 20
        }}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        fitView
        onInit={(instance) => {
          // Store the instance on the wrapper ref
          reactFlowWrapper.current.reactFlowInstance = instance;
        }}
        onEdgeClick={onEdgeClick}
      >
        <MiniMap 
          nodeStrokeColor={(n) => {
            if (n.type === 'agent') return '#0088ff';
            if (n.type === 'task') return '#ff8800';
            if (n.type === 'tool') return '#00aa00';
            return '#eee';
          }}
          nodeColor={(n) => {
            if (n.type === 'agent') return '#bbdefb';
            if (n.type === 'task') return '#ffe0b2';
            if (n.type === 'tool') return '#c8e6c9';
            return '#fff';
          }}
        />
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
      
      {/* Move controls to the bottom center, side by side */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-white p-2 rounded shadow-md z-10 flex flex-row gap-2">
        <button 
          onClick={handleFitView}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
          title="Fit view to all nodes"
        >
          Fit View
        </button>
        <button 
          onClick={() => setShowTemplateGallery(!showTemplateGallery)}
          className="bg-purple-500 text-white px-3 py-1 rounded text-sm"
          title="Browse templates"
        >
          {showTemplateGallery ? 'Hide Templates' : 'Show Templates'}
        </button>
      </div>

      {/* Template Gallery - moved to bottom */}
      {showTemplateGallery && (
        <div className="absolute bottom-16 left-2 right-2 bg-white rounded shadow-md z-10 p-2 max-h-[300px] overflow-y-auto">
          <h3 className="font-semibold mb-2">Quick Templates</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(templates || []).map((template, idx) => (
              <div 
                key={idx}
                className="flex-shrink-0 border border-gray-200 rounded p-2 hover:bg-blue-50 cursor-pointer w-[200px]"
                onClick={() => {
                  handleApplyTemplate(template);
                  setShowTemplateGallery(false);
                }}
              >
                <div className="flex items-center mb-1">
                  <img 
                    src={template.thumbnail || '/img/default-flow.png'} 
                    alt={template.name}
                    className="w-6 h-6 mr-2 rounded"
                    onError={(e) => {e.target.src = '/img/default-flow.png'}}
                  />
                  <h4 className="font-medium text-sm truncate">{template.name}</h4>
                </div>
                <p className="text-xs text-gray-600 truncate">{template.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {debugMode && (
        <div className="absolute bottom-20 left-4 bg-white p-2 rounded shadow-md z-40 text-xs max-w-xs">
          <h3 className="font-bold mb-1">Debug Info:</h3>
          <div>
            <div>Nodes: {nodes.length}</div>
            <div>Edges: {edges.length}</div>
            <div>Connecting: {isConnecting ? 'Yes' : 'No'}</div>
            <div>Source Type: {connectionInfo.sourceType || 'None'}</div>
            <div>Target Type: {connectionInfo.targetType || 'None'}</div>
          </div>
          <button 
            onClick={() => console.log({nodes, edges})}
            className="mt-1 bg-gray-200 px-2 py-1 rounded"
          >
            Log Data
          </button>
        </div>
      )}

      <button 
        onClick={() => setDebugMode(!debugMode)}
        className="absolute bottom-4 left-4 bg-gray-500 text-white px-2 py-1 rounded text-xs"
      >
        {debugMode ? 'Hide Debug' : 'Debug'}
      </button>
    </div>
  );
};

export default FlowCanvas;
