// components/execution-panel/UnifiedExecutionPanel.jsx
import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import PropTypes from 'prop-types';
import { Play, Square, RotateCcw, Zap, Brain, Sparkles, Activity, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { LLMContext } from '../../contexts/LLMContext';
import { apiClient } from '../../api/client';

// Import existing hooks
import { useLogProcessing } from './hooks/useLogProcessing';
import { useExecutionStats } from './hooks/useExecutionStats';
import { usePolling } from './hooks/usePolling';
import { useLogExport } from './hooks/useLogExport';

// Import existing modular components
import LogsTab from './components/LogsTab';
import StatsTab from './components/StatsTab';
import ExportTab from './components/ExportTab';
import './UnifiedExecutionPanel.css';

/**
 * Expandable Dock System - UnifiedExecutionPanel
 * Three-stage interface: Compact → Expanded → Fullscreen
 */
export default function UnifiedExecutionPanel({ 
  logs, 
  structuredLogs, 
  isMinimized, 
  onToggleMinimize, 
  onClose,
  onClearLogs,
  executionMode = 'hybrid',
  pollingInterval = 10000,
  onPollingIntervalChange,
  nodes = [],
  executionId = null,
  workflowId = null,
  onDataRefresh = null,
  edges = [],
  onExecutionUpdate
}) {
  // LLM Context
  const { llmModeEnabled, smartMappingEnabled, status: llmStatus } = useContext(LLMContext);
  
  // Execution State
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState([]);
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [executionStats, setExecutionStats] = useState({
    totalNodes: 0,
    completedNodes: 0,
    failedNodes: 0,
    executionTime: 0,
    llmProcessedNodes: 0,
    smartMappingApplied: 0
  });
  
  // UI State
  const [activeTab, setActiveTab] = useState('logs');
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  
  // Streaming State
  const [streamingConnection, setStreamingConnection] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const abortControllerRef = useRef(null);
  const executionStartTime = useRef(null);
  
  // Enhanced state management for expandable dock
  const [dockMode, setDockMode] = useState('compact'); // 'compact', 'expanded', 'fullscreen'
  const [viewMode, setViewMode] = useState('structured');
  const [debugMode, setDebugMode] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);
  const [pollingData, setPollingData] = useState(null);
  const [autoExpand, setAutoExpand] = useState(true);
  
  // Refs
  const scrollRef = useRef(null);

  // Stable fetchData function
  const fetchData = useCallback(async () => {
    if (!pollingActive) return null;
    
    try {
      if (onDataRefresh && typeof onDataRefresh === 'function') {
        const newData = await onDataRefresh();
        setPollingData(newData);
        return newData;
      }
      
      const timestamp = new Date().toISOString();
      const defaultData = { 
        timestamp, 
        status: 'polling',
        message: 'Polling active'
      };
      setPollingData(defaultData);
      return defaultData;
      
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }, [onDataRefresh, pollingActive]);

  // Custom hooks for data processing
  const {
    parsedTextLogs,
    processedStructuredLogs,
    extractNodeName,
    extractNodeId,
    formatResult,
    getLogStyle,
    getCardStyle,
    getStatusIcon
  } = useLogProcessing(logs, structuredLogs, nodes);

  const {
    nodeStats,
    performanceMetrics,
    timeline,
    derivedStats
  } = useExecutionStats(processedStructuredLogs, parsedTextLogs, extractNodeId);

  const {
    exportAsJson,
    exportAsText,
    exportStats,
    exportAsCsv,
    exportReport,
    getAvailableExports
  } = useLogExport(processedStructuredLogs, parsedTextLogs, nodeStats);

  const {
    isPolling,
    lastUpdated,
    pollingError,
    pollingStats,
    startPolling,
    stopPolling,
    manualRefresh
  } = usePolling(
    pollingInterval,
    onPollingIntervalChange,
    pollingActive,
    fetchData
  );

  // Process results for better display
  const processedResults = React.useMemo(() => {
    if (!processedStructuredLogs || !Array.isArray(processedStructuredLogs)) return [];
    
    return processedStructuredLogs
      .filter(log => log && (log.result || log.data || log.output || log.error))
      .map((log, index) => ({
        id: `result-${index}`,
        ...log,
        timestamp: log.timestamp || log.metadata?.timestamp || Date.now()
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [processedStructuredLogs]);

  // Calculate enhanced stats
  const stats = React.useMemo(() => {
    const total = processedResults.length;
    const successful = processedResults.filter(r => !r.error && r.status !== 'error').length;
    const errors = total - successful;
    const running = processedResults.filter(r => r.status === 'running' || r.status === 'processing').length;
    
    return {
      total,
      successful,
      errors,
      running,
      successRate: total > 0 ? Math.round((successful / total) * 100) : 0
    };
  }, [processedResults]);

  // Auto-expand on important results
  useEffect(() => {
    if (autoExpand && processedResults.length > 0 && dockMode === 'compact') {
      const latestResult = processedResults[0];
      if (latestResult.error || (latestResult.result && typeof latestResult.result === 'object')) {
        setDockMode('expanded');
      }
    }
  }, [processedResults, autoExpand, dockMode]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, structuredLogs, isMinimized, viewMode]);

  // Toggle dock modes
  const toggleDockMode = useCallback(() => {
    if (dockMode === 'compact') {
      setDockMode('expanded');
    } else if (dockMode === 'expanded') {
      setDockMode('fullscreen');
    } else {
      setDockMode('compact');
    }
  }, [dockMode]);

  const togglePolling = useCallback(() => {
    setPollingActive(!pollingActive);
  }, [pollingActive]);

  // Get dock dimensions and styles
  const getDockConfig = () => {
    switch (dockMode) {
      case 'compact':
        return {
          width: 'w-[600px]',
          height: 'h-[400px]',
          position: 'fixed top-20 right-6',
          title: 'Execution Status'
        };
      case 'expanded':
        return {
          width: 'w-[900px]',
          height: 'h-[600px]',
          position: 'fixed top-16 right-6',
          title: 'Rich Results Display'
        };
      case 'fullscreen':
        return {
          width: 'w-screen',
          height: 'h-screen',
          position: 'fixed inset-0',
          title: 'Detailed Analysis View'
        };
      default:
        return getDockConfig();
    }
  };

  const dockConfig = getDockConfig();

  // Enhanced execution with LLM integration
  const executeWorkflow = async () => {
    if (isExecuting) return;
    
    try {
      setIsExecuting(true);
      setExecutionResults([]);
      setCurrentNodeId(null);
      setConnectionStatus('connecting');
      executionStartTime.current = Date.now();
      
      // Reset stats
      setExecutionStats({
        totalNodes: nodes.length,
        completedNodes: 0,
        failedNodes: 0,
        executionTime: 0,
        llmProcessedNodes: 0,
        smartMappingApplied: 0
      });
      
      // Add initial log entry
      const initialLog = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: 'workflow_start',
        message: `🚀 Starting ${streamingEnabled ? 'streaming' : 'enhanced'} workflow execution`,
        level: 'info',
        metadata: {
          totalNodes: nodes.length,
          llmModeEnabled,
          smartMappingEnabled,
          streamingEnabled,
          realTimeUpdates
        }
      };
      
      setExecutionResults([initialLog]);
      
      if (streamingEnabled && realTimeUpdates) {
        await executeWithStreaming();
      } else {
        await executeWithoutStreaming();
      }
      
    } catch (error) {
      console.error('❌ Workflow execution failed:', error);
      
      const errorLog = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: 'workflow_error',
        message: `❌ Workflow execution failed: ${error.message}`,
        level: 'error',
        error: error.message
      };
      
      setExecutionResults(prev => [...prev, errorLog]);
      
    } finally {
      setIsExecuting(false);
      setCurrentNodeId(null);
      setConnectionStatus('disconnected');
      
      // Calculate final execution time
      if (executionStartTime.current) {
        const totalTime = (Date.now() - executionStartTime.current) / 1000;
        setExecutionStats(prev => ({ ...prev, executionTime: totalTime }));
      }
    }
  };
  
  // Streaming execution with real-time updates
  const executeWithStreaming = async () => {
    try {
      setConnectionStatus('connected');
      
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();
      
      // Get user keys for BYOK
      const userKeys = window.USER_API_KEYS || {};
      
      // Execute streaming workflow
      const stream = await apiClient.executeWorkflowStream(
        nodes,
        edges,
        { 
          workflow_id: workflowId,
          user_keys: userKeys,
          execution_preferences: {
            streaming_enabled: true,
            real_time_updates: realTimeUpdates,
            llm_mode_enabled: llmModeEnabled,
            smart_mapping_enabled: smartMappingEnabled
          }
        },
        (update) => handleStreamingUpdate(update)
      );
      
      setStreamingConnection(stream);
      
      // Process streaming updates
      const reader = stream.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('✅ Streaming execution completed');
            break;
          }
          
          // Process the streaming update
          handleStreamingUpdate(value);
        }
      } finally {
        reader.releaseLock();
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🛑 Streaming execution cancelled');
        
        const cancelLog = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          type: 'workflow_cancelled',
          message: '🛑 Workflow execution cancelled by user',
          level: 'warning'
        };
        
        setExecutionResults(prev => [...prev, cancelLog]);
      } else {
        throw error;
      }
    } finally {
      setConnectionStatus('disconnected');
      setStreamingConnection(null);
    }
  };
  
  // Non-streaming execution
  const executeWithoutStreaming = async () => {
    try {
      const userKeys = window.USER_API_KEYS || {};
      
      const result = await apiClient.executeWorkflowEnhanced(
        nodes,
        edges,
        {
          workflow_id: workflowId,
          user_keys: userKeys,
          execution_preferences: {
            llm_mode_enabled: llmModeEnabled,
            smart_mapping_enabled: smartMappingEnabled
          }
        }
      );
      
      // Process batch results
      if (result.results) {
        result.results.forEach(update => handleStreamingUpdate(update));
      }
      
      // Add completion log
      const completionLog = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: 'workflow_complete',
        message: `✅ Enhanced workflow execution completed`,
        level: 'success',
        metadata: result.summary
      };
      
      setExecutionResults(prev => [...prev, completionLog]);
      
    } catch (error) {
      throw error;
    }
  };
  
  // Handle streaming updates
  const handleStreamingUpdate = (update) => {
    if (!update) return;
    
    console.log('📡 Streaming update:', update);
    
    // Update current node
    if (update.node_id) {
      setCurrentNodeId(update.node_id);
    }
    
    // Update stats based on update type
    setExecutionStats(prev => {
      const newStats = { ...prev };
      
      switch (update.type) {
        case 'node_complete':
          newStats.completedNodes += 1;
          if (update.metadata?.llm_processed) {
            newStats.llmProcessedNodes += 1;
          }
          if (update.metadata?.smart_mapping_applied) {
            newStats.smartMappingApplied += 1;
          }
          break;
          
        case 'node_error':
          newStats.failedNodes += 1;
          break;
          
        case 'workflow_complete':
          if (executionStartTime.current) {
            newStats.executionTime = (Date.now() - executionStartTime.current) / 1000;
          }
          break;
      }
      
      return newStats;
    });
    
    // Create log entry
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp: update.timestamp || new Date().toISOString(),
      type: update.type || 'info',
      message: formatUpdateMessage(update),
      level: getLogLevel(update),
      nodeId: update.node_id,
      nodeType: update.node_type,
      metadata: update.metadata,
      error: update.error,
      result: update.result
    };
    
    setExecutionResults(prev => [...prev, logEntry]);
    
    // Notify parent component
    if (onExecutionUpdate) {
      onExecutionUpdate(update);
    }
  };
  
  // Format update message for display
  const formatUpdateMessage = (update) => {
    const nodeInfo = update.node_id ? `[${update.node_id}]` : '';
    const nodeType = update.node_type ? `(${update.node_type})` : '';
    
    switch (update.type) {
      case 'workflow_start':
        return `🚀 ${update.message || 'Starting workflow execution'}`;
        
      case 'node_start':
        return `▶️ ${nodeInfo} ${nodeType} Starting node execution`;
        
      case 'llm_processing':
        return `🧠 ${nodeInfo} ${nodeType} ${update.message || 'Processing with LLM'}`;
        
      case 'smart_mapping':
        return `✨ ${nodeInfo} ${nodeType} ${update.message || 'Smart mapping applied'}`;
        
      case 'node_complete':
        const execTime = update.metadata?.execution_time ? ` (${update.metadata.execution_time.toFixed(2)}s)` : '';
        return `✅ ${nodeInfo} ${nodeType} Node completed successfully${execTime}`;
        
      case 'node_error':
        return `❌ ${nodeInfo} ${nodeType} Node failed: ${update.error || 'Unknown error'}`;
        
      case 'workflow_complete':
        return `🎉 ${update.message || 'Workflow execution completed successfully'}`;
        
      case 'workflow_error':
        return `💥 ${update.message || 'Workflow execution failed'}`;
        
      default:
        return update.message || `${update.type}: ${JSON.stringify(update)}`;
    }
  };
  
  // Get log level for styling
  const getLogLevel = (update) => {
    switch (update.type) {
      case 'workflow_start':
      case 'node_start':
      case 'llm_processing':
        return 'info';
        
      case 'smart_mapping':
        return 'success';
        
      case 'node_complete':
      case 'workflow_complete':
        return 'success';
        
      case 'node_error':
      case 'workflow_error':
        return 'error';
        
      default:
        return 'info';
    }
  };
  
  // Stop execution
  const stopExecution = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (streamingConnection) {
      try {
        streamingConnection.cancel();
      } catch (error) {
        console.warn('Failed to cancel streaming connection:', error);
      }
    }
    
    setIsExecuting(false);
    setCurrentNodeId(null);
    setConnectionStatus('disconnected');
  };
  
  // Clear results
  const clearResults = () => {
    setExecutionResults([]);
    setExecutionStats({
      totalNodes: nodes.length,
      completedNodes: 0,
      failedNodes: 0,
      executionTime: 0,
      llmProcessedNodes: 0,
      smartMappingApplied: 0
    });
  };
  
  // Get execution status
  const getExecutionStatus = () => {
    if (isExecuting) {
      return {
        status: 'running',
        icon: Activity,
        color: 'text-blue-500',
        message: `Executing... (${executionStats.completedNodes}/${executionStats.totalNodes})`
      };
    }
    
    if (executionStats.failedNodes > 0) {
      return {
        status: 'error',
        icon: XCircle,
        color: 'text-red-500',
        message: `Failed (${executionStats.failedNodes} errors)`
      };
    }
    
    if (executionStats.completedNodes > 0) {
      return {
        status: 'success',
        icon: CheckCircle,
        color: 'text-green-500',
        message: `Completed (${executionStats.completedNodes} nodes)`
      };
    }
    
    return {
      status: 'idle',
      icon: Clock,
      color: 'text-gray-500',
      message: 'Ready to execute'
    };
  };
  
  const executionStatus = getExecutionStatus();
  const StatusIcon = executionStatus.icon;

  // Minimized state (unchanged)
  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-20 right-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-2xl shadow-xl cursor-pointer z-50 group hover:scale-105 transition-all duration-300"
        onClick={onToggleMinimize}
        title="Expand execution panel"
      >
        <div className="flex items-center gap-2">
        <span className="text-xl">📊</span>
          <div className="text-sm font-medium">
            <div>Execution Panel</div>
            {stats.total > 0 && (
              <div className="text-xs opacity-90">{stats.total} results</div>
            )}
          </div>
        </div>
        
        {/* Enhanced status indicators */}
        <div className="absolute -top-1 -right-1 flex gap-1">
          {stats.running > 0 && <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />}
          {stats.successful > 0 && <div className="w-3 h-3 bg-green-400 rounded-full" />}
          {stats.errors > 0 && <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse" />}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Dock Panel */}
      <div className={`
        ${dockConfig.position} ${dockConfig.width} ${dockConfig.height}
        bg-white/95 backdrop-blur-xl border border-gray-200/50 
        shadow-2xl rounded-2xl overflow-hidden z-50 flex flex-col
        transition-all duration-500 ease-out
        ${dockMode === 'fullscreen' ? 'rounded-none' : ''}
      `}>
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <div>
                <h2 className="font-bold text-lg">{dockConfig.title}</h2>
                <div className="flex items-center gap-3 text-sm opacity-90">
                  <span>Real-time monitoring</span>
                  {stats.total > 0 && (
                    <>
                      <span>•</span>
                      <span>{stats.total} results</span>
                    </>
                  )}
                  {isPolling && pollingActive && (
                    <>
                      <span>•</span>
                      <span className="animate-pulse">🔄 Live</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {dockMode !== 'fullscreen' && onClearLogs && (
                <button 
                  onClick={onClearLogs}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all"
                  title="Clear results"
                >
                  🗑️
                </button>
              )}
              
          <button 
                onClick={() => setAutoExpand(!autoExpand)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  autoExpand ? 'bg-yellow-500/80' : 'bg-white/20 hover:bg-white/30'
                }`}
                title="Toggle auto-expand"
              >
                🔄
              </button>
              
              <button 
                onClick={toggleDockMode}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all"
                title={`Switch to ${dockMode === 'compact' ? 'expanded' : dockMode === 'expanded' ? 'fullscreen' : 'compact'} mode`}
              >
                {dockMode === 'compact' ? '⛶' : dockMode === 'expanded' ? '⧉' : '⧈'}
              </button>
              
              {dockMode !== 'fullscreen' && (
                <button 
                  onClick={onToggleMinimize}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all"
                  title="Minimize"
                >
                  ➖
                </button>
              )}
              
              <button 
                onClick={onClose}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Bar - Only in Compact Mode */}
        {dockMode === 'compact' && (
          <div className="bg-gray-50 p-3 border-b border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-lg font-bold text-gray-800">{stats.total}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">{stats.successful}</div>
                <div className="text-xs text-gray-600">Success</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-600">{stats.errors}</div>
                <div className="text-xs text-gray-600">Errors</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">{stats.running}</div>
                <div className="text-xs text-gray-600">Running</div>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {dockMode === 'compact' ? (
            // Compact Mode - Focus on recent results
            <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
              <div className="space-y-3">
                {executionResults.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                      <span className="text-2xl opacity-50">📊</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-600 mb-2">Ready to execute</h3>
                    <p className="text-gray-500 text-sm">Run your workflow to see results</p>
                  </div>
                ) : (
                  executionResults.slice(0, 3).map((result) => (
                    <div key={result.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getStatusIcon(result)}</span>
                          <div>
                            <div className="font-semibold text-sm text-gray-800">
                              {extractNodeName(result) || 'Workflow Result'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(result.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        {result.error && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            Error
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-700 line-clamp-2">
                        {formatResult(result.result || result.output || result.error || 'No content')}
                      </div>
                    </div>
                  ))
                )}
                
                {executionResults.length > 3 && (
                  <button
                    onClick={() => setDockMode('expanded')}
                    className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-medium transition-colors"
                  >
                    View all {executionResults.length} results →
                  </button>
                )}
              </div>
            </div>
          ) : dockMode === 'expanded' ? (
            // Expanded Mode - Rich results display
            <div className="flex flex-col h-full">
              {/* Enhanced Stats Dashboard */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200 flex-shrink-0">
                <div className="grid grid-cols-5 gap-4 text-center">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                    <div className="text-xs text-gray-600">Total Results</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
                    <div className="text-xs text-gray-600">Successful</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                    <div className="text-xs text-gray-600">Errors</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-2xl font-bold text-blue-600">{stats.running}</div>
                    <div className="text-xs text-gray-600">Running</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-2xl font-bold text-purple-600">{stats.successRate}%</div>
                    <div className="text-xs text-gray-600">Success Rate</div>
                  </div>
                </div>
              </div>

              {/* Results Grid */}
              <div className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {executionResults.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-3xl flex items-center justify-center">
                        <span className="text-3xl opacity-50">📊</span>
                      </div>
                      <h3 className="text-xl font-medium text-gray-600 mb-2">No results yet</h3>
                      <p className="text-gray-500">Execute your workflow to see detailed results</p>
                    </div>
                  ) : (
                    executionResults.map((result) => (
                      <div key={result.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all duration-200">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                              <span className="text-xl">{getStatusIcon(result)}</span>
                            </div>
                            <div>
                              <div className="font-bold text-gray-800">
                                {extractNodeName(result) || 'Workflow Result'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(result.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {result.error ? (
                              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                Error
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                Success
            </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-xl p-4 max-h-48 overflow-y-auto">
                          <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                            {formatResult(result.result || result.output || result.error || 'No content available')}
                          </pre>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Fullscreen Mode - Complete analysis view
            <div className="flex h-full">
              {/* Sidebar with tabs */}
              <div className="w-64 bg-gray-50 border-r border-gray-200 flex-shrink-0">
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 mb-4">Analysis Views</h3>
                  <div className="space-y-2">
                    {[
                      { id: 'results', label: 'Results', icon: '📋' },
                      { id: 'logs', label: 'Logs', icon: '📝' },
                      { id: 'stats', label: 'Statistics', icon: '📊' },
                      { id: 'smart_mapping', label: 'Smart Mapping', icon: '🧠' },
                      { id: 'export', label: 'Export', icon: '📤' }
                    ].map((tab) => (
                      <button 
                        key={tab.id}
                        className={`w-full p-3 text-left rounded-lg transition-all ${
                          activeTab === tab.id 
                            ? 'bg-blue-100 text-blue-700 font-medium' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        onClick={() => setActiveTab(tab.id)}
                      >
                        <span className="mr-3">{tab.icon}</span>
                        {tab.label}
          </button>
        ))}
      </div>
                </div>
              </div>

              {/* Main content area */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'results' && (
                  <div className="h-full overflow-y-auto p-6" ref={scrollRef}>
                    <div className="max-w-4xl mx-auto space-y-6">
                      {executionResults.map((result) => (
                        <div key={result.id} className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
                                <span className="text-2xl">{getStatusIcon(result)}</span>
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-800">
                                  {extractNodeName(result) || 'Workflow Result'}
                                </h3>
                                <p className="text-gray-500 mt-1">
                                  {new Date(result.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 rounded-xl p-6">
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                              {formatResult(result.result || result.output || result.error || 'No content available')}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
          {activeTab === 'logs' && (
            <LogsTab
              viewMode={viewMode}
              setViewMode={setViewMode}
                    displayLogs={processedStructuredLogs}
              parsedTextLogs={parsedTextLogs}
              processedStructuredLogs={processedStructuredLogs}
              debugMode={debugMode}
              logs={logs}
              structuredLogs={structuredLogs}
              getLogStyle={getLogStyle}
              getCardStyle={getCardStyle}
              getStatusIcon={getStatusIcon}
              processStandardizedResult={(result) => result}
            />
          )}
          
          {activeTab === 'stats' && (
            <StatsTab
              nodeStats={nodeStats}
              performanceMetrics={performanceMetrics}
              timeline={timeline}
              derivedStats={derivedStats}
              structuredLogs={processedStructuredLogs}
            />
          )}
          
          {activeTab === 'smart_mapping' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">🧠</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Smart Mapping</h2>
                      <p className="text-gray-600">Intelligent input mapping across workflow nodes</p>
                    </div>
                  </div>
                  
                  {executionResults.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🧠</div>
                      <div className="text-lg font-medium mb-2">No Smart Mapping Data</div>
                      <div className="text-sm text-gray-500">Run a workflow to see smart mapping in action</div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-blue-600">{executionResults.length}</div>
                          <div className="text-sm text-blue-600">Total Nodes</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
                          <div className="text-sm text-green-600">Mapped Successfully</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-purple-600">95%</div>
                          <div className="text-sm text-purple-600">Avg Confidence</div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {executionResults.map((result) => (
                          <div key={result.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <span className="font-mono text-sm">{extractNodeName(result) || result.id}</span>
                                <span className={`w-3 h-3 rounded-full ${result.error ? 'bg-red-500' : 'bg-green-500'}`}></span>
                              </div>
                              <div className="text-xs text-gray-500">
                                Smart mapping: {result.error ? 'Failed' : 'Applied'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'export' && (
                  <div className="h-full overflow-y-auto p-6">
            <ExportTab
              logs={logs}
              structuredLogs={processedStructuredLogs}
              parsedTextLogs={parsedTextLogs}
              nodeStats={nodeStats}
              performanceMetrics={performanceMetrics}
              timeline={timeline}
            />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

UnifiedExecutionPanel.propTypes = {
  logs: PropTypes.any,
  structuredLogs: PropTypes.array,
  isMinimized: PropTypes.bool.isRequired,
  onToggleMinimize: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onClearLogs: PropTypes.func,
  executionMode: PropTypes.string,
  pollingInterval: PropTypes.number,
  onPollingIntervalChange: PropTypes.func,
  nodes: PropTypes.array,
  executionId: PropTypes.string,
  workflowId: PropTypes.string,
  onDataRefresh: PropTypes.func,
  edges: PropTypes.array,
  onExecutionUpdate: PropTypes.func
};