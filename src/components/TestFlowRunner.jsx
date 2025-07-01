import React, { useState, useEffect } from 'react';
import { buildDynamicTestFlow, testInput, executeTestFlow, validateTestFlow } from '../utils/testFlow';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import { optimizedTemplates } from '../data/optimizedTemplates';
import EnhancedEditModal from './EditModall.jsx';
import { buildNodeFromSchema } from '../utils/dynamicNodeBuilder'; // for dynamic node creation
import { getSafeNodePosition } from '../utils/getSafeNodePosition';

const TestFlowRunner = () => {
  const [flowState, setFlowState] = useState({ nodes: [], edges: [] });
  const [executionResult, setExecutionResult] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editingNode, setEditingNode] = useState(null);

  // Load and validate dynamic flow on mount
  useEffect(() => {
    const loadAndValidate = async () => {
      setLoading(true);
      setError(null);
      try {
        const flow = await buildDynamicTestFlow();
        setFlowState(flow);
        const result = await validateTestFlow(flow);
        setValidationResult(result);
        if (!result.success) {
          setError(result.error || 'Flow has errors');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadAndValidate();
  }, []);

  const validateFlow = async () => {
    setError(null);
    setValidationResult(null);
    try {
      const result = await validateTestFlow(flowState);
      setValidationResult(result);
      if (!result.success) {
        setError(result.error || 'Flow has errors');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const runFlow = async () => {
    setIsExecuting(true);
    setError(null);
    try {
      const result = await executeTestFlow(flowState, testInput);
      setExecutionResult(result);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsExecuting(false);
    }
  };

  const addRandomNode = async () => {
    const types = ['agent', 'task', 'tool', 'input', 'output', 'logic', 'delay', 'chat', 'trigger'];
    const type = types[Math.floor(Math.random() * types.length)];
    const position = getSafeNodePosition(flowState.nodes);
    const node = await buildNodeFromSchema({
      id: `${type}-${Date.now()}`,
      type,
      x: position.x,
      y: position.y,
      overrides: { label: `Random ${type.charAt(0).toUpperCase() + type.slice(1)}` }
    });
    setFlowState(prev => ({ ...prev, nodes: [...prev.nodes, node] }));
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 bg-gray-100 border-b">
        <h1 className="text-2xl font-bold mb-4">Test Flow Runner</h1>
        <div className="flex gap-4">
          <button
            onClick={runFlow}
            disabled={isExecuting || loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isExecuting ? 'Running...' : 'Run Flow'}
          </button>
          <button
            onClick={validateFlow}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Validate Flow
          </button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Flow Visualization */}
        <div className="w-2/3 h-full border-r">
          {loading ? (
            <div className="flex items-center justify-center h-full text-lg">Loading dynamic flow...</div>
          ) : (
            <ReactFlow
              nodes={flowState.nodes}
              edges={flowState.edges}
              fitView
            >
              <Background />
              <Controls />
            </ReactFlow>
          )}
        </div>

        {/* Results Panel */}
        <div className="w-1/3 p-4 overflow-auto">
          <div className="space-y-4">
            {/* Validation Status */}
            <div className="p-4 bg-gray-50 rounded">
              <h2 className="font-bold mb-2">Validation Status</h2>
              {loading ? (
                <div>Validating...</div>
              ) : validationResult ? (
                <div className={`p-2 rounded ${validationResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
                  {validationResult.success ? '✓ Flow is valid' : '✗ Flow has errors'}
                  {validationResult.results && (
                    <pre className="mt-2 text-sm">{JSON.stringify(validationResult.results, null, 2)}</pre>
                  )}
                </div>
              ) : (
                <div>Not validated yet.</div>
              )}
            </div>

            {/* Execution Results */}
            {executionResult && (
              <div className="p-4 bg-gray-50 rounded">
                <h2 className="font-bold mb-2">Execution Results</h2>
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(executionResult, null, 2)}
                </pre>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 rounded">
                <h2 className="font-bold text-red-700 mb-2">Error</h2>
                <div className="text-red-600">{error}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <select
          value={selectedTemplate?.name || ''}
          onChange={e => {
            const template = optimizedTemplates.find(t => t.name === e.target.value);
            setSelectedTemplate(template);
          }}
        >
          <option value="">Select Optimized Template</option>
          {optimizedTemplates.map(t => (
            <option key={t.name} value={t.name}>{t.name}</option>
          ))}
        </select>
        <button
          onClick={async () => {
            if (selectedTemplate) {
              // Dynamically build nodes from schema for all nodes in the template
              const nodes = await Promise.all(
                selectedTemplate.nodes.map(node =>
                  buildNodeFromSchema({
                    id: node.id,
                    type: node.type,
                    x: node.position?.x || 100,
                    y: node.position?.y || 100,
                    overrides: node.data
                  })
                )
              );
              setFlowState(prev => ({ ...prev, nodes }));
              setFlowState(prev => ({ ...prev, edges: selectedTemplate.edges }));
            }
          }}
          disabled={!selectedTemplate}
        >
          Load Template
        </button>
      </div>

      <div>
        {flowState.nodes.map(node => (
          <div key={node.id} onClick={() => setEditingNode(node)}>
            {node.data.label}
          </div>
        ))}
      </div>
      {editingNode && (
        <EnhancedEditModal
          isOpen={!!editingNode}
          nodeData={editingNode}
          nodeType={editingNode.type}
          onSave={updatedNode => {
            setFlowState(prev => ({
              ...prev,
              nodes: prev.nodes.map(n => n.id === updatedNode.id ? updatedNode : n)
            }));
            setEditingNode(null);
          }}
          onClose={() => setEditingNode(null)}
        />
      )}

      <button onClick={addRandomNode}>Add Random Node</button>
    </div>
  );
};

export default TestFlowRunner; 