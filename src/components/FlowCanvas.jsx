import React, { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  ConnectionLineType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import AgentNode from './AgentCard';
import TaskNode from './TaskNode';
import ToolNode from './ToolNode';
import { recommendTemplates } from '../utils/recommendTemplates';

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

  // Use useMemo to prevent recreation of nodeTypes on each render
  const nodeTypes = useMemo(() => ({
    agent: AgentNode,
    agentNode: AgentNode,
    task: TaskNode,
    taskNode: TaskNode,
    tool: ToolNode,
    toolNode: ToolNode
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

  return (
    <div className="h-full relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(event, node) => {
          // Only trigger node click if the target is not a button or inside a button
          if (!event.target.closest('button') && 
              !event.target.classList.contains('edit-button') && 
              !event.target.classList.contains('delete-button')) {
            onNodeClick(event, node);
          }
        }}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#555' }
        }}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        fitView
        onInit={(instance) => {
          // Store the instance on the wrapper ref
          reactFlowWrapper.current.reactFlowInstance = instance;
        }}
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

      {/* Template Gallery - moved to top */}
      {showTemplateGallery && (
        <div className="absolute top-2 left-2 right-2 bg-white rounded shadow-md z-10 p-2 max-h-[300px] overflow-y-auto">
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

      {/* Template Recommendations - moved to bottom right */}
      {recommendations.length > 0 && (
        <div className="absolute bottom-16 right-2 bg-white rounded shadow-md z-10 p-2 max-w-[300px]">
          <h3 className="font-semibold text-sm mb-2">Recommended Templates</h3>
          <div className="flex flex-col gap-2">
            {recommendations.map((template, idx) => (
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowCanvas;
