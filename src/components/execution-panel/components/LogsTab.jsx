// components/execution-panel/components/LogsTab.jsx
import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import LogEntry from './LogEntry';
import RichContentRenderer from '../../rich-content/RichContentRenderer';

const LogsTab = ({
  viewMode,
  setViewMode,
  displayLogs,
  parsedTextLogs,
  processedStructuredLogs,
  debugMode,
  logs,
  structuredLogs,
  getLogStyle,
  getCardStyle,
  getStatusIcon,
  processStandardizedResult
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');

  // Provide default functions if props are undefined
  const safeGetCardStyle = getCardStyle || ((log) => 'bg-white border border-gray-200 rounded-lg p-4 mb-3');
  const safeGetStatusIcon = getStatusIcon || ((status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'error': return '❌';
      case 'started': return '🔄';
      default: return '📝';
    }
  });
  const safeGetLogStyle = getLogStyle || ((log) => 'text-gray-800');

  // Filter and search logs
  const filteredLogs = useMemo(() => {
    let filtered = displayLogs;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(log => {
        const searchText = JSON.stringify(log).toLowerCase();
        return searchText.includes(searchTerm.toLowerCase());
      });
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(log => {
        const status = log.status || log.type || 'info';
        return status === filterStatus;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'timestamp':
          aValue = new Date(a.timestamp || 0);
          bValue = new Date(b.timestamp || 0);
          break;
        case 'node':
          aValue = a.nodeName || a.nodeId || '';
          bValue = b.nodeName || b.nodeId || '';
          break;
        case 'status':
          aValue = a.status || a.type || '';
          bValue = b.status || b.type || '';
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [displayLogs, searchTerm, filterStatus, sortBy, sortOrder]);

  // Get unique statuses for filter dropdown
  const availableStatuses = useMemo(() => {
    const statuses = new Set();
    displayLogs.forEach(log => {
      const status = log.status || log.type || 'info';
      statuses.add(status);
    });
    return Array.from(statuses).sort();
  }, [displayLogs]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setSortBy('timestamp');
    setSortOrder('desc');
  };

  return (
    <div className="logs-tab h-full flex flex-col">
      {/* View Mode Toggle */}
      <div className="flex justify-center p-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex-shrink-0">
        <div className="inline-flex rounded-xl shadow-sm bg-white border border-gray-200 p-1" role="group">
          <button
            type="button"
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
              viewMode === 'structured' 
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md transform scale-105' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            onClick={() => setViewMode('structured')}
          >
            <span className="flex items-center space-x-1">
              <span>📋</span>
              <span>Structured</span>
            </span>
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
              viewMode === 'text' 
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md transform scale-105' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            onClick={() => setViewMode('text')}
          >
            <span className="flex items-center space-x-1">
              <span>📝</span>
              <span>Raw Logs</span>
            </span>
          </button>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="p-4 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Search */}
          <div className="flex-1 min-w-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute left-2.5 top-2.5 text-gray-400 text-sm">
                🔍
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              {availableStatuses.map(status => (
                <option key={status} value={status} className="capitalize">
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="timestamp">Time</option>
              <option value="node">Node</option>
              <option value="status">Status</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {/* Clear Filters */}
          {(searchTerm || filterStatus !== 'all' || sortBy !== 'timestamp' || sortOrder !== 'desc') && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Filter Results Summary */}
        <div className="mt-2 text-xs text-gray-500">
          Showing {filteredLogs.length} of {displayLogs.length} log entries
          {searchTerm && <span> matching "{searchTerm}"</span>}
          {filterStatus !== 'all' && <span> with status "{filterStatus}"</span>}
        </div>
      </div>

      {/* Logs Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Debug Information */}
        {debugMode && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex-shrink-0">
            <h4 className="font-semibold text-yellow-800 mb-2">🐛 Debug Information</h4>
            <div className="text-sm text-yellow-700 space-y-1">
              <div><strong>Raw logs:</strong> {logs ? (Array.isArray(logs) ? logs.length : typeof logs) : 'null'}</div>
              <div><strong>Structured logs:</strong> {structuredLogs ? structuredLogs.length : 'null'}</div>
              <div><strong>View mode:</strong> {viewMode}</div>
              <div><strong>Display logs length:</strong> {displayLogs.length}</div>
              <div><strong>Filtered logs length:</strong> {filteredLogs.length}</div>
              <div><strong>Parsed text logs length:</strong> {parsedTextLogs.length}</div>
              {logs && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-yellow-600">Show raw logs sample</summary>
                  <div className="max-h-32 overflow-auto bg-yellow-100 p-2 rounded mt-1">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(Array.isArray(logs) ? logs.slice(0, 3) : logs, null, 2)}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          </div>
        )}
        
        {filteredLogs.length === 0 ? (
          <div className="text-center py-16 flex-shrink-0">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
              <span className="text-3xl opacity-50">
                {displayLogs.length === 0 ? '📊' : '🔍'}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {displayLogs.length === 0 ? 'No execution logs yet' : 'No matching logs found'}
            </h3>
            <p className="text-gray-500 text-sm">
              {displayLogs.length === 0 
                ? 'Run your workflow to see real-time execution logs here'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {displayLogs.length > 0 && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'structured' ? (
              // Structured logs view
              <div className="space-y-4">
                {filteredLogs.map((log, index) => (
                  <LogEntry
                    key={`structured-${log.id || index}`}
                    log={log}
                    index={index}
                    viewMode="structured"
                    getCardStyle={safeGetCardStyle}
                    getStatusIcon={safeGetStatusIcon}
                    getLogStyle={safeGetLogStyle}
                    debugMode={debugMode}
                    processStandardizedResult={processStandardizedResult}
                  />
                ))}
              </div>
            ) : (
              // Text logs view
              <div className="space-y-3">
                {filteredLogs.map((log, index) => (
                  <LogEntry
                    key={`text-${log.id || index}`}
                    log={log}
                    index={index}
                    viewMode="text"
                    getLogStyle={safeGetLogStyle}
                    getCardStyle={safeGetCardStyle}
                    getStatusIcon={safeGetStatusIcon}
                    debugMode={debugMode}
                    processStandardizedResult={processStandardizedResult}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

LogsTab.propTypes = {
  viewMode: PropTypes.string.isRequired,
  setViewMode: PropTypes.func.isRequired,
  displayLogs: PropTypes.array.isRequired,
  parsedTextLogs: PropTypes.array.isRequired,
  processedStructuredLogs: PropTypes.array.isRequired,
  debugMode: PropTypes.bool.isRequired,
  logs: PropTypes.any,
  structuredLogs: PropTypes.array,
  getLogStyle: PropTypes.func.isRequired,
  getCardStyle: PropTypes.func.isRequired,
  getStatusIcon: PropTypes.func.isRequired,
  processStandardizedResult: PropTypes.func.isRequired
};

export default LogsTab;