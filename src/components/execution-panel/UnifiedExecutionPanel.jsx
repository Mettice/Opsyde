// components/execution-panel/UnifiedExecutionPanel.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

// Import existing hooks
import { useLogProcessing } from './hooks/useLogProcessing';
import { useExecutionStats } from './hooks/useExecutionStats';
import { usePolling } from './hooks/usePolling';
import { useLogExport } from './hooks/useLogExport';

// Import existing modular components
import LogsTab from './components/LogsTab';
import StatsTab from './components/StatsTab';
import ExportTab from './components/ExportTab';

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
  onDataRefresh = null
}) {
  // Enhanced state management for expandable dock
  const [dockMode, setDockMode] = useState('compact'); // 'compact', 'expanded', 'fullscreen'
  const [activeTab, setActiveTab] = useState('results');
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
                {processedResults.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                      <span className="text-2xl opacity-50">📊</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-600 mb-2">Ready to execute</h3>
                    <p className="text-gray-500 text-sm">Run your workflow to see results</p>
                  </div>
                ) : (
                  processedResults.slice(0, 3).map((result) => (
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
                
                {processedResults.length > 3 && (
                  <button
                    onClick={() => setDockMode('expanded')}
                    className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-medium transition-colors"
                  >
                    View all {processedResults.length} results →
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
                  {processedResults.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-3xl flex items-center justify-center">
                        <span className="text-3xl opacity-50">📊</span>
                      </div>
                      <h3 className="text-xl font-medium text-gray-600 mb-2">No results yet</h3>
                      <p className="text-gray-500">Execute your workflow to see detailed results</p>
                    </div>
                  ) : (
                    processedResults.map((result) => (
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
                      {processedResults.map((result) => (
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
  onDataRefresh: PropTypes.func
};