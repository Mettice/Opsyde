// components/execution-panel/UnifiedExecutionPanel.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

// Import existing hooks
import { useLogProcessing } from './hooks/useLogProcessing';
import { useExecutionStats } from './hooks/useExecutionStats';
import { usePolling } from './hooks/usePolling'; // Re-enabled with fixes
import { useLogExport } from './hooks/useLogExport';

// Import modular components
import ExecutionHeader from './components/ExecutionHeader';
import LogsTab from './components/LogsTab';
import StatsTab from './components/StatsTab';
import ExportTab from './components/ExportTab';

/**
 * Modularized Unified Execution Panel
 * Main orchestrator component that manages the execution monitoring interface
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
  // State management
  const [activeTab, setActiveTab] = useState('logs');
  const [viewMode, setViewMode] = useState('structured');
  const [debugMode, setDebugMode] = useState(false);
  const [pollingActive, setPollingActive] = useState(false); // Start disabled
  const [pollingData, setPollingData] = useState(null);
  
  // Refs
  const scrollRef = useRef(null);

  // Stable fetchData function
  const fetchData = useCallback(async () => {
    if (!pollingActive) return null; // Only fetch when polling is active
    
    try {
      if (onDataRefresh && typeof onDataRefresh === 'function') {
        const newData = await onDataRefresh();
        setPollingData(newData);
        return newData;
      }
      
      // Simple default behavior
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

  // Re-enabled polling with the fixed hook
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
    pollingActive, // Only poll when explicitly enabled
    fetchData
  );

  // Determine display logs based on view mode
  const displayLogs = viewMode === 'structured' ? processedStructuredLogs : parsedTextLogs;

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, structuredLogs, isMinimized, viewMode]);

  // Debug logging - simplified
  useEffect(() => {
    if (debugMode) {
      console.log('UnifiedExecutionPanel Debug:', {
        logsLength: logs?.length || 0,
        structuredLogsLength: structuredLogs?.length || 0,
        displayLogsLength: displayLogs?.length || 0,
        viewMode,
        pollingActive,
        isPolling
      });
    }
  }, [logs, structuredLogs, displayLogs?.length, viewMode, debugMode, pollingActive, isPolling]);

  // Handle polling interval changes
  const handlePollingIntervalChange = useCallback((e) => {
    const newInterval = Number(e.target.value);
    if (onPollingIntervalChange) {
      onPollingIntervalChange(newInterval);
    }
  }, [onPollingIntervalChange]);

  // Toggle polling
  const togglePolling = useCallback(() => {
    setPollingActive(!pollingActive);
    console.log('Polling toggled to:', !pollingActive);
  }, [pollingActive]);

  // Minimized state
  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-20 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg cursor-pointer z-50 group hover:scale-110 transition-transform duration-200"
        onClick={onToggleMinimize}
        title="Expand execution panel"
      >
        <span className="text-xl">📊</span>
        {displayLogs.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-semibold">
            {displayLogs.length > 99 ? '99+' : displayLogs.length}
          </span>
        )}
        
        {/* Status indicator */}
        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white">
          <div className={`w-full h-full rounded-full ${
            pollingError ? 'bg-red-500' : 
            isPolling ? 'bg-green-500 animate-pulse' : 
            'bg-gray-500'
          }`}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-20 right-6 w-[480px] bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-0 z-50 flex flex-col h-[75vh] overflow-hidden">
      {/* Header Component */}
      <ExecutionHeader 
        debugMode={debugMode}
        setDebugMode={setDebugMode}
        onToggleMinimize={onToggleMinimize}
        onClose={onClose}
        onClearLogs={onClearLogs}
        isPollingActive={isPolling && pollingActive}
        onTogglePolling={togglePolling}
        pollingInterval={pollingInterval}
        onPollingIntervalChange={handlePollingIntervalChange}
        displayLogsLength={displayLogs.length}
        executionMode={executionMode}
        pollingError={pollingError}
        pollingStats={pollingStats}
        lastUpdated={lastUpdated}
        onManualRefresh={manualRefresh}
      />
      
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-100 bg-white/50 backdrop-blur-sm">
        {['logs', 'stats', 'export'].map((tab) => (
          <button 
            key={tab}
            className={`flex-1 py-3 px-4 text-sm font-semibold transition-all duration-200 relative ${
              activeTab === tab 
                ? 'text-blue-600 bg-white shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            <span className="relative z-10 capitalize flex items-center justify-center">
              {tab === 'logs' && <span className="mr-1">📋</span>}
              {tab === 'stats' && <span className="mr-1">📊</span>}
              {tab === 'export' && <span className="mr-1">📤</span>}
              {tab}
            </span>
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
            )}
          </button>
        ))}
      </div>
      
      {/* Content Area */}
      <div className="flex-1 overflow-hidden bg-gradient-to-b from-gray-50/50 to-white" ref={scrollRef}>
        <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {activeTab === 'logs' && (
            <LogsTab
              viewMode={viewMode}
              setViewMode={setViewMode}
              displayLogs={displayLogs}
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
            <ExportTab
              logs={logs}
              structuredLogs={processedStructuredLogs}
              parsedTextLogs={parsedTextLogs}
              nodeStats={nodeStats}
              performanceMetrics={performanceMetrics}
              timeline={timeline}
            />
          )}
        </div>
      </div>
    </div>
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