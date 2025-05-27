// components/execution-panel/components/StatsTab.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';

const StatsTab = ({
  nodeStats,
  performanceMetrics,
  timeline,
  derivedStats,
  structuredLogs
}) => {
  const [selectedMetric, setSelectedMetric] = useState('overview');

  // Format duration helper
  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '—';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
  };

  // Format number with commas
  const formatNumber = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return '—';
    return num.toLocaleString();
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'running':
      case 'started':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="stats-tab h-full flex flex-col">
      {/* Metric Selection */}
      <div className="p-4 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'overview', label: '📊 Overview', icon: '📊' },
            { key: 'performance', label: '⚡ Performance', icon: '⚡' },
            { key: 'timeline', label: '⏱️ Timeline', icon: '⏱️' },
            { key: 'details', label: '🔍 Details', icon: '🔍' }
          ].map(metric => (
            <button
              key={metric.key}
              onClick={() => setSelectedMetric(metric.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                selectedMetric === metric.key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">{metric.icon}</span>
              {metric.label.replace(/^[^\s]+ /, '')}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedMetric === 'overview' && (
          <div className="space-y-6">
            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 shadow-sm">
                <div className="text-sm text-blue-600 mb-1 font-medium">Total Nodes</div>
                <div className="text-2xl font-bold text-blue-800">
                  {formatNumber(nodeStats.totalNodes)}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200 shadow-sm">
                <div className="text-sm text-green-600 mb-1 font-medium">Success Rate</div>
                <div className="text-2xl font-bold text-green-800">
                  {nodeStats.successRate}%
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200 shadow-sm">
                <div className="text-sm text-emerald-600 mb-1 font-medium">Completed</div>
                <div className="text-2xl font-bold text-emerald-800">
                  {formatNumber(nodeStats.successCount)}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200 shadow-sm">
                <div className="text-sm text-red-600 mb-1 font-medium">Errors</div>
                <div className="text-2xl font-bold text-red-800">
                  {formatNumber(nodeStats.errorCount)}
                </div>
              </div>
            </div>

            {/* Execution Summary */}
            <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <span className="text-lg mr-2">⏱️</span>
                Execution Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white rounded-lg border border-gray-100">
                  <div className="text-sm text-gray-500 mb-1">Total Duration</div>
                  <div className="text-xl font-semibold text-purple-600">
                    {formatDuration(derivedStats.executionSummary.totalTime)}
                  </div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border border-gray-100">
                  <div className="text-sm text-gray-500 mb-1">Avg Node Time</div>
                  <div className="text-xl font-semibold text-indigo-600">
                    {formatDuration(derivedStats.executionSummary.avgNodeTime)}
                  </div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border border-gray-100">
                  <div className="text-sm text-gray-500 mb-1">Throughput</div>
                  <div className="text-xl font-semibold text-blue-600">
                    {derivedStats.executionSummary.throughput?.toFixed(2) || '—'} nodes/s
                  </div>
                </div>
              </div>
            </div>

            {/* Node Type Breakdown */}
            {Object.keys(nodeStats.nodeTypes).length > 0 && (
              <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="text-lg mr-2">📈</span>
                  Node Type Distribution
                </h3>
                <div className="space-y-3">
                  {Object.entries(nodeStats.nodeTypes)
                    .sort(([,a], [,b]) => b - a)
                    .map(([type, count]) => (
                    <div key={type} className="flex items-center bg-white p-3 rounded-lg border border-gray-100">
                      <div className="w-20 text-sm font-medium text-gray-700 capitalize">{type}</div>
                      <div className="flex-1 mx-3">
                        <div className="bg-gray-200 rounded-full h-2 relative overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${nodeStats.totalNodes > 0 ? (count / nodeStats.totalNodes) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-12 text-right text-sm font-semibold text-gray-800">{count}</div>
                      <div className="w-12 text-right text-xs text-gray-500">
                        {nodeStats.totalNodes > 0 ? Math.round((count / nodeStats.totalNodes) * 100) : 0}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedMetric === 'performance' && (
          <div className="space-y-6">
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-4">⚡ Performance Metrics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">Throughput:</span>
                    <span className="font-semibold text-blue-800">
                      {performanceMetrics.throughput?.toFixed(2) || '—'} nodes/sec
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">Efficiency:</span>
                    <span className="font-semibold text-blue-800">
                      {performanceMetrics.efficiency?.toFixed(2) || '—'} success/sec
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">Error Rate:</span>
                    <span className="font-semibold text-blue-800">
                      {derivedStats.errorRate}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                <h3 className="font-semibold text-green-800 mb-4">✅ Quality Metrics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-green-700">Success Rate:</span>
                    <span className="font-semibold text-green-800">
                      {nodeStats.successRate}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-green-700">Completion Rate:</span>
                    <span className="font-semibold text-green-800">
                      {derivedStats.completionRate}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-green-700">Most Common Type:</span>
                    <span className="font-semibold text-green-800 capitalize">
                      {derivedStats.mostCommonNodeType}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottlenecks */}
            {performanceMetrics.bottlenecks && performanceMetrics.bottlenecks.length > 0 && (
              <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl border border-orange-200">
                <h3 className="font-semibold text-orange-800 mb-4 flex items-center">
                  <span className="mr-2">🐌</span>
                  Performance Bottlenecks
                </h3>
                <div className="space-y-2">
                  {performanceMetrics.bottlenecks.map((bottleneck, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <span className="text-sm text-orange-600">#{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium text-orange-800">{bottleneck.nodeId}</div>
                          <div className="text-sm text-orange-600">{bottleneck.status}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-orange-800">
                          {formatDuration(bottleneck.executionTime)}
                        </div>
                        <div className="text-xs text-orange-600">execution time</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {performanceMetrics.recommendations && performanceMetrics.recommendations.length > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-200">
                <h3 className="font-semibold text-purple-800 mb-4 flex items-center">
                  <span className="mr-2">💡</span>
                  Performance Recommendations
                </h3>
                <ul className="space-y-2">
                  {performanceMetrics.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start space-x-2 text-purple-700">
                      <span className="text-purple-500 mt-0.5">•</span>
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {selectedMetric === 'timeline' && (
          <div className="space-y-6">
            {timeline && timeline.length > 0 ? (
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="text-lg mr-2">📅</span>
                  Execution Timeline
                </h3>
                <div className="space-y-4">
                  {timeline.map((item, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50">
                      <div className="flex-shrink-0 w-12 text-center">
                        <div className="text-xs text-gray-500">
                          {item.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(item.status).replace('text-', 'bg-')}`}></div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{item.nodeId}</div>
                        <div className="text-sm text-gray-600 capitalize">{item.nodeType} • {item.status}</div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        {formatDuration(item.executionTime)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📅</div>
                <div>No timeline data available</div>
              </div>
            )}
          </div>
        )}

        {selectedMetric === 'details' && (
          <div className="space-y-6">
            {/* Node Details */}
            {nodeStats.nodeDetails && nodeStats.nodeDetails.length > 0 && (
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="text-lg mr-2">🔍</span>
                  Node Details
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Node ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Execution Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timestamp
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {nodeStats.nodeDetails.map((node, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {node.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                            {node.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(node.status)}`}>
                              {node.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDuration(node.executionTime)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {node.timestamp ? new Date(node.timestamp).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Raw Statistics */}
            <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <span className="text-lg mr-2">📊</span>
                Raw Statistics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Execution Counts</h4>
                  <div className="space-y-1 text-gray-600">
                    <div>Total Nodes: {nodeStats.totalNodes}</div>
                    <div>Successful: {nodeStats.successCount}</div>
                    <div>Errors: {nodeStats.errorCount}</div>
                    <div>Warnings: {nodeStats.warningCount}</div>
                    <div>Running: {nodeStats.runningCount}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Timing Data</h4>
                  <div className="space-y-1 text-gray-600">
                    <div>Total Time: {formatDuration(nodeStats.executionTime)}</div>
                    <div>Average Node Time: {formatDuration(nodeStats.avgExecutionTime)}</div>
                    <div>Success Rate: {nodeStats.successRate}%</div>
                    <div>Error Rate: {derivedStats.errorRate}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

StatsTab.propTypes = {
  nodeStats: PropTypes.object.isRequired,
  performanceMetrics: PropTypes.object.isRequired,
  timeline: PropTypes.array.isRequired,
  derivedStats: PropTypes.object.isRequired,
  structuredLogs: PropTypes.array
};

export default StatsTab;