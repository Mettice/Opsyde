// components/execution-panel/components/ExportTab.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { safeStringify } from '../../rich-content/utils/safeStringify';

const ExportTab = ({
  logs,
  structuredLogs,
  parsedTextLogs,
  nodeStats,
  performanceMetrics,
  timeline
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState({});

  // Export configurations
  const exportOptions = [
    {
      id: 'logs-json',
      title: 'Execution Logs (JSON)',
      description: 'Structured data with full metadata',
      icon: '📄',
      color: 'bg-blue-600 hover:bg-blue-700',
      format: 'json'
    },
    {
      id: 'logs-txt',
      title: 'Execution Logs (Text)',
      description: 'Human-readable format for sharing',
      icon: '📝',
      color: 'bg-gray-600 hover:bg-gray-700',
      format: 'txt'
    },
    {
      id: 'stats-json',
      title: 'Statistics Report (JSON)',
      description: 'Performance metrics and summary data',
      icon: '📊',
      color: 'bg-green-600 hover:bg-green-700',
      format: 'json'
    },
    {
      id: 'timeline-csv',
      title: 'Timeline Data (CSV)',
      description: 'Execution timeline for analysis',
      icon: '📈',
      color: 'bg-purple-600 hover:bg-purple-700',
      format: 'csv'
    },
    {
      id: 'full-report',
      title: 'Complete Report (JSON)',
      description: 'All data combined in one file',
      icon: '📋',
      color: 'bg-indigo-600 hover:bg-indigo-700',
      format: 'json'
    },
    {
      id: 'summary-md',
      title: 'Executive Summary (Markdown)',
      description: 'High-level overview for stakeholders',
      icon: '📖',
      color: 'bg-orange-600 hover:bg-orange-700',
      format: 'md'
    }
  ];

  // Generate export data based on type
  const generateExportData = (exportType) => {
    const timestamp = new Date().toISOString();
    const dateStr = new Date().toISOString().split('T')[0];

    switch (exportType) {
      case 'logs-json':
        return {
          filename: `execution-logs-${dateStr}.json`,
          data: safeStringify({
            metadata: {
              exportType: 'execution-logs',
              exportedAt: timestamp,
              totalLogs: structuredLogs?.length || 0
            },
            structuredLogs: structuredLogs || [],
            summary: {
              totalNodes: nodeStats.totalNodes,
              successCount: nodeStats.successCount,
              errorCount: nodeStats.errorCount,
              executionTime: nodeStats.executionTime
            }
          }, 2),
          mimeType: 'application/json'
        };

      case 'logs-txt':
        const textLogs = parsedTextLogs || [];
        return {
          filename: `execution-logs-${dateStr}.txt`,
          data: [
            `Execution Logs Export`,
            `Generated: ${new Date(timestamp).toLocaleString()}`,
            `Total Entries: ${textLogs.length}`,
            `${'='.repeat(50)}`,
            '',
            ...textLogs.map(log => `[${log.type?.toUpperCase() || 'INFO'}] ${log.text || 'No message'}`),
            '',
            `${'='.repeat(50)}`,
            `Export completed at ${new Date().toLocaleString()}`
          ].join('\n'),
          mimeType: 'text/plain'
        };

      case 'stats-json':
        return {
          filename: `execution-stats-${dateStr}.json`,
          data: safeStringify({
            metadata: {
              exportType: 'execution-statistics',
              exportedAt: timestamp,
              analysisScope: 'full-execution'
            },
            summary: nodeStats,
            performance: performanceMetrics,
            timeline: timeline?.length || 0,
            derivedMetrics: {
              successRate: nodeStats.successRate,
              errorRate: nodeStats.totalNodes > 0 ? Math.round((nodeStats.errorCount / nodeStats.totalNodes) * 100) : 0,
              completionRate: nodeStats.totalNodes > 0 ? Math.round(((nodeStats.successCount + nodeStats.errorCount) / nodeStats.totalNodes) * 100) : 0
            }
          }, 2),
          mimeType: 'application/json'
        };

      case 'timeline-csv':
        if (!timeline || timeline.length === 0) {
          return {
            filename: `execution-timeline-${dateStr}.csv`,
            data: 'timestamp,nodeId,status,executionTime,nodeType\nNo timeline data available',
            mimeType: 'text/csv'
          };
        }
        
        const csvHeaders = 'timestamp,nodeId,status,executionTime,nodeType';
        const csvRows = timeline.map(item => 
          `"${item.timestamp.toISOString()}","${item.nodeId}","${item.status}",${item.executionTime || 0},"${item.nodeType}"`
        );
        
        return {
          filename: `execution-timeline-${dateStr}.csv`,
          data: [csvHeaders, ...csvRows].join('\n'),
          mimeType: 'text/csv'
        };

      case 'full-report':
        return {
          filename: `complete-execution-report-${dateStr}.json`,
          data: safeStringify({
            metadata: {
              exportType: 'complete-execution-report',
              exportedAt: timestamp,
              version: '1.0',
              generator: 'Workflow Automation System'
            },
            execution: {
              logs: {
                structured: structuredLogs || [],
                text: parsedTextLogs || []
              },
              statistics: nodeStats,
              performance: performanceMetrics,
              timeline: timeline || []
            }
          }, 2),
          mimeType: 'application/json'
        };

      case 'summary-md':
        return {
          filename: `execution-summary-${dateStr}.md`,
          data: [
            `# Execution Summary`,
            ``,
            `**Generated:** ${new Date(timestamp).toLocaleString()}`,
            ``,
            `## Overview`,
            `- Total Nodes: ${nodeStats.totalNodes}`,
            `- Successful: ${nodeStats.successCount}`,
            `- Failed: ${nodeStats.errorCount}`,
            `- Success Rate: ${nodeStats.successRate}%`,
            ``,
            `## Performance`,
            `- Execution Time: ${nodeStats.executionTime || 'N/A'}`,
            `- Average Response Time: ${performanceMetrics?.avgResponseTime || 'N/A'}ms`,
            ``,
            `## Node Types`,
            ...Object.entries(nodeStats.nodeTypes || {}).map(([type, count]) => `- ${type}: ${count}`),
            ``,
            `---`,
            `*Report generated by Workflow Automation System*`
          ].join('\n'),
          mimeType: 'text/markdown'
        };

      default:
        throw new Error(`Unknown export type: ${exportType}`);
    }
  };

  // Handle export action
  const handleExport = async (exportOption) => {
    setIsExporting(true);
    setExportStatus({ [exportOption.id]: 'exporting' });

    try {
      const exportData = generateExportData(exportOption.id);
      
      // Create and download file
      const blob = new Blob([exportData.data], { type: exportData.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exportData.filename;
      link.click();
      URL.revokeObjectURL(url);

      setExportStatus({ [exportOption.id]: 'success' });
      setTimeout(() => setExportStatus({}), 3000);

    } catch (error) {
      console.error('Export error:', error);
      setExportStatus({ [exportOption.id]: 'error' });
      setTimeout(() => setExportStatus({}), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exportOptions.map((option) => (
          <div
            key={option.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{option.icon}</span>
                <div>
                  <h3 className="font-medium text-gray-900">{option.title}</h3>
                  <p className="text-sm text-gray-500">{option.description}</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => handleExport(option)}
              disabled={isExporting}
              className={`w-full ${option.color} text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {exportStatus[option.id] === 'exporting' ? 'Exporting...' :
               exportStatus[option.id] === 'success' ? 'Downloaded!' :
               exportStatus[option.id] === 'error' ? 'Error - Retry' :
               'Download'}
            </button>
          </div>
        ))}
      </div>

      {/* Export Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2 flex items-center">
          <span className="mr-2">💡</span>
          Export Tips
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• JSON formats preserve all metadata and structure</li>
          <li>• Text formats are human-readable and great for sharing</li>
          <li>• CSV format is ideal for data analysis in spreadsheets</li>
          <li>• Markdown summaries are perfect for reports and documentation</li>
        </ul>
      </div>
    </div>
  );
};

ExportTab.propTypes = {
  logs: PropTypes.array,
  structuredLogs: PropTypes.array,
  parsedTextLogs: PropTypes.array,
  nodeStats: PropTypes.object,
  performanceMetrics: PropTypes.object,
  timeline: PropTypes.array
};

export default ExportTab;