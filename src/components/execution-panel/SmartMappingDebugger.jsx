import React, { useState, useMemo } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const SmartMappingDebugger = ({ logs = [], structuredLogs = {} }) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectedMappingMode, setSelectedMappingMode] = useState('all');

  // Extract smart mapping information from logs
  const mappingData = useMemo(() => {
    const nodeMapping = {};
    
    // Process structured logs for mapping info
    Object.entries(structuredLogs).forEach(([nodeId, nodeData]) => {
      if (nodeData.debug_info && nodeData.debug_info[nodeId]) {
        const mappingInfo = nodeData.debug_info[nodeId];
        nodeMapping[nodeId] = {
          ...mappingInfo,
          nodeType: nodeData.node_type || 'unknown',
          success: !nodeData.error,
          executionTime: nodeData.execution_time || 0
        };
      }
    });

    // Also check direct logs for mapping events
    logs.forEach(log => {
      if (log.type === 'node_result' && log.nodeId) {
        const nodeId = log.nodeId;
        if (!nodeMapping[nodeId]) {
          nodeMapping[nodeId] = {
            nodeType: log.nodeType || 'unknown',
            success: log.status !== 'error',
            executionTime: 0
          };
        }
        
        // Look for mapping info in the log
        if (log.mapping_info) {
          nodeMapping[nodeId] = {
            ...nodeMapping[nodeId],
            ...log.mapping_info
          };
        }
      }
    });

    return nodeMapping;
  }, [logs, structuredLogs]);

  const toggleNodeExpansion = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getMappingStatusColor = (mapping) => {
    if (!mapping.mapped_inputs || mapping.mapped_inputs.length === 0) {
      return 'text-yellow-600 bg-yellow-50';
    }
    if (mapping.success) {
      return 'text-green-600 bg-green-50';
    }
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredNodes = useMemo(() => {
    const nodes = Object.entries(mappingData);
    
    switch (selectedMappingMode) {
      case 'successful':
        return nodes.filter(([_, data]) => data.success && data.mapped_inputs?.length > 0);
      case 'failed':
        return nodes.filter(([_, data]) => !data.success);
      case 'ai_assisted':
        return nodes.filter(([_, data]) => data.ai_assisted);
      default:
        return nodes;
    }
  }, [mappingData, selectedMappingMode]);

  if (Object.keys(mappingData).length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="mb-2">🧠</div>
        <div>No smart mapping data available</div>
        <div className="text-xs mt-1">Run a workflow to see intelligent input mapping</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">🧠</span>
          <h3 className="text-lg font-semibold text-gray-900">Smart Mapping Debugger</h3>
        </div>
        
        {/* Filter controls */}
        <select
          value={selectedMappingMode}
          onChange={(e) => setSelectedMappingMode(e.target.value)}
          className="text-sm border border-gray-300 rounded-md px-2 py-1"
        >
          <option value="all">All Mappings</option>
          <option value="successful">Successful Only</option>
          <option value="failed">Failed Only</option>
          <option value="ai_assisted">AI Assisted</option>
        </select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{Object.keys(mappingData).length}</div>
          <div className="text-xs text-blue-600">Total Nodes</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {Object.values(mappingData).filter(m => m.success).length}
          </div>
          <div className="text-xs text-green-600">Successful</div>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {Object.values(mappingData).filter(m => m.mapped_inputs?.length > 0).length}
          </div>
          <div className="text-xs text-yellow-600">Mapped</div>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {Object.values(mappingData).filter(m => m.ai_assisted).length}
          </div>
          <div className="text-xs text-purple-600">AI Assisted</div>
        </div>
      </div>

      {/* Node Mapping Details */}
      <div className="space-y-2">
        {filteredNodes.map(([nodeId, mapping]) => (
          <div
            key={nodeId}
            className={`border rounded-lg p-3 ${getMappingStatusColor(mapping)}`}
          >
            {/* Node Header */}
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleNodeExpansion(nodeId)}
            >
              <div className="flex items-center space-x-3">
                {expandedNodes.has(nodeId) ? (
                  <ChevronDownIcon className="w-4 h-4" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4" />
                )}
                
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm">{nodeId}</span>
                  <span className={`px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700`}>
                    {mapping.nodeType}
                  </span>
                  
                  {mapping.success ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-red-600">✗</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                {mapping.mapped_inputs && (
                  <span>{mapping.mapped_inputs.length} inputs mapped</span>
                )}
                <span className="text-gray-500">
                  {mapping.executionTime ? `${mapping.executionTime}ms` : ''}
                </span>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedNodes.has(nodeId) && (
              <div className="mt-4 pl-7 space-y-3">
                {/* Expected vs Mapped Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">📋 Expected Inputs</h4>
                    <div className="space-y-1">
                      {mapping.expected_inputs ? (
                        Object.entries(mapping.expected_inputs).map(([key, config]) => (
                          <div key={key} className="text-xs">
                            <span className="font-mono bg-gray-100 px-1 rounded">{key}</span>
                            <span className="text-gray-500 ml-2">
                              ({config.type || 'any'}) {config.description}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-gray-500">No schema available</div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">🎯 Mapped Inputs</h4>
                    <div className="space-y-1">
                      {mapping.mapped_inputs && mapping.mapped_inputs.length > 0 ? (
                        mapping.mapped_inputs.map((input, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-mono bg-green-100 px-1 rounded">{input}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-gray-500">No inputs mapped</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mapping Sources */}
                {mapping.mapping_sources && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">🔗 Input Sources</h4>
                    <div className="space-y-1">
                      {Object.entries(mapping.mapping_sources).map(([input, source]) => (
                        <div key={input} className="text-xs flex items-center space-x-2">
                          <span className="font-mono bg-blue-100 px-1 rounded">{input}</span>
                          <span className="text-gray-500">←</span>
                          <span className="text-blue-600">{source.source || source}</span>
                          {source.confidence && (
                            <span className={`${getConfidenceColor(source.confidence)}`}>
                              ({Math.round(source.confidence * 100)}%)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data Transformations */}
                {mapping.transformations && mapping.transformations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">🔄 Data Transformations</h4>
                    <div className="space-y-1">
                      {mapping.transformations.map((transform, idx) => (
                        <div key={idx} className="text-xs bg-yellow-50 p-2 rounded">
                          <span className="font-medium">{transform.field}:</span>
                          <span className="ml-2">{transform.from_type} → {transform.to_type}</span>
                          {transform.details && (
                            <div className="text-gray-600 mt-1">{transform.details}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Assistance Info */}
                {mapping.ai_assisted && (
                  <div className="bg-purple-50 p-2 rounded">
                    <h4 className="text-sm font-medium text-purple-700 mb-1">🤖 AI Assistance</h4>
                    <div className="text-xs text-purple-600">
                      AI was used to fill missing inputs or transform data types
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                {mapping.mapping_timestamp && (
                  <div className="text-xs text-gray-500">
                    Mapped at: {new Date(mapping.mapping_timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredNodes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="mb-2">🔍</div>
          <div>No mappings match the current filter</div>
        </div>
      )}
    </div>
  );
};

export default SmartMappingDebugger; 