import React from 'react';
import PropTypes from 'prop-types';

const ExecutionHeader = ({
  onToggleMinimize,
  onClose,
  onClearLogs,
  debugMode,
  setDebugMode,
  pollingInterval,
  onPollingIntervalChange,
  isPollingActive,
  onTogglePolling,
  displayLogsLength = 0,
  executionMode = 'hybrid'
}) => {
  
  const handlePollingIntervalChange = (e) => {
    const newInterval = Number(e.target.value);
    if (onPollingIntervalChange) {
      onPollingIntervalChange(newInterval);
    }
  };

  return (
    <>
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 p-4 flex justify-between items-center rounded-t-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm"></div>
        
        <div className="relative z-10 flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/30">
            <span className="text-2xl">📊</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Flow Execution</h2>
            <p className="text-blue-100 text-sm">Real-time workflow monitoring</p>
          </div>
        </div>
        
        <div className="relative z-10 flex space-x-2">
          {/* Debug Mode Toggle */}
          <button 
            onClick={() => setDebugMode(!debugMode)}
            className={`w-8 h-8 ${debugMode ? 'bg-yellow-500/80 text-white' : 'bg-white/20 hover:bg-white/30 text-white'} rounded-lg flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/30`}
            title="Toggle debug mode"
          >
            🐛
          </button>
          
          {/* Polling Toggle */}
          <button 
            onClick={onTogglePolling}
            className={`w-8 h-8 ${isPollingActive ? 'bg-green-500/80 text-white' : 'bg-white/20 hover:bg-white/30 text-white'} rounded-lg flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/30`}
            title={isPollingActive ? 'Pause polling' : 'Resume polling'}
          >
            {isPollingActive ? '⏸️' : '▶️'}
          </button>
          
          {/* Clear Logs Button */}
          {onClearLogs && displayLogsLength > 0 && (
            <button 
              onClick={onClearLogs}
              className="w-8 h-8 bg-white/20 hover:bg-red-500/80 text-white rounded-lg flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/30"
              title="Clear all logs"
            >
              🗑️
            </button>
          )}
          
          {/* Minimize Button */}
          <button 
            onClick={onToggleMinimize}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/30"
            title="Minimize panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/30"
            title="Close panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Polling Configuration */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${isPollingActive ? 'bg-green-400' : 'bg-gray-400'}`}></div>
          <span className="text-sm font-medium text-gray-700">
            {isPollingActive ? 'Live Updates' : 'Updates Paused'}
          </span>
          {displayLogsLength > 0 && (
            <span className="text-xs text-gray-500">
              ({displayLogsLength} entries)
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">Refresh:</span>
          <select
            value={pollingInterval}
            onChange={handlePollingIntervalChange}
            disabled={!isPollingActive}
            className={`text-xs border border-gray-200 rounded-lg px-2 py-1 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              !isPollingActive ? 'bg-gray-100 text-gray-400' : 'bg-white'
            }`}
          >
            <option value={1000}>1s</option>
            <option value={2000}>2s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
          </select>
          
          {executionMode && (
            <>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs text-gray-500 capitalize">
                {executionMode} mode
              </span>
            </>
          )}
        </div>
      </div>
    </>
  );
};

ExecutionHeader.propTypes = {
  onToggleMinimize: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onClearLogs: PropTypes.func,
  debugMode: PropTypes.bool.isRequired,
  setDebugMode: PropTypes.func.isRequired,
  pollingInterval: PropTypes.number.isRequired,
  onPollingIntervalChange: PropTypes.func,
  isPollingActive: PropTypes.bool,
  onTogglePolling: PropTypes.func,
  displayLogsLength: PropTypes.number,
  executionMode: PropTypes.string
};

export default ExecutionHeader; 