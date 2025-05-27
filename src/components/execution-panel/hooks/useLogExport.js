// components/execution-panel/hooks/useLogExport.js
import { useCallback } from 'react';
import { safeStringify } from '../../rich-content/utils/safeStringify';

/**
 * Custom hook for exporting execution logs in various formats
 */
export const useLogExport = (structuredLogs, parsedTextLogs, nodeStats) => {

  // Export logs as JSON
  const exportAsJson = useCallback((filename = null) => {
    try {
      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          totalLogs: structuredLogs?.length || 0,
          textLogs: parsedTextLogs?.length || 0,
          statistics: nodeStats
        },
        structuredLogs: structuredLogs || [],
        textLogs: parsedTextLogs || []
      };

      const dataStr = safeStringify(exportData, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `execution-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return { success: true, message: 'JSON export completed successfully' };
    } catch (error) {
      console.error('Error exporting JSON:', error);
      return { success: false, error: error.message };
    }
  }, [structuredLogs, parsedTextLogs, nodeStats]);

  // Export logs as plain text
  const exportAsText = useCallback((filename = null) => {
    try {
      const timestamp = new Date().toLocaleString();
      const separator = '='.repeat(60);
      
      let textData = `EXECUTION LOGS EXPORT\n${separator}\n`;
      textData += `Exported: ${timestamp}\n`;
      textData += `Total Nodes: ${nodeStats?.totalNodes || 0}\n`;
      textData += `Success Rate: ${nodeStats?.successRate || 0}%\n`;
      textData += `${separator}\n\n`;

      // Add structured logs if available
      if (structuredLogs && structuredLogs.length > 0) {
        textData += `STRUCTURED LOGS (${structuredLogs.length} entries)\n`;
        textData += `${'-'.repeat(40)}\n\n`;
        
        structuredLogs.forEach((log, index) => {
          const nodeName = log.node_name || log.nodeName || `Node ${index + 1}`;
          const status = log.status || 'unknown';
          const timestamp = log.timestamp || log.metadata?.timestamp || 'unknown';
          
          textData += `[${index + 1}] ${nodeName} (${status})\n`;
          textData += `Time: ${timestamp}\n`;
          
          if (log.result) {
            textData += `Result: ${typeof log.result === 'string' ? log.result : safeStringify(log.result)}\n`;
          }
          
          if (log.error) {
            textData += `Error: ${typeof log.error === 'string' ? log.error : safeStringify(log.error)}\n`;
          }
          
          textData += '\n';
        });
      }

      // Add text logs if available
      if (parsedTextLogs && parsedTextLogs.length > 0) {
        textData += `\nTEXT LOGS (${parsedTextLogs.length} entries)\n`;
        textData += `${'-'.repeat(40)}\n\n`;
        
        parsedTextLogs.forEach((log, index) => {
          textData += `[${log.type.toUpperCase()}] ${log.text}\n`;
        });
      }

      textData += `\n${separator}\nEnd of Export\n`;

      const dataBlob = new Blob([textData], { type: 'text/plain' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `execution-logs-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return { success: true, message: 'Text export completed successfully' };
    } catch (error) {
      console.error('Error exporting text:', error);
      return { success: false, error: error.message };
    }
  }, [structuredLogs, parsedTextLogs, nodeStats]);

  // Export statistics as JSON
  const exportStats = useCallback((filename = null) => {
    try {
      const statsData = {
        summary: nodeStats,
        execution_time: nodeStats?.executionTime 
          ? `${nodeStats.executionTime.toFixed(1)}s`
          : 'N/A',
        logs_count: {
          structured: structuredLogs?.length || 0,
          text: parsedTextLogs?.length || 0,
          total: (structuredLogs?.length || 0) + (parsedTextLogs?.length || 0)
        },
        export_timestamp: new Date().toISOString(),
        performance_metrics: {
          throughput: nodeStats?.throughput || 0,
          efficiency: nodeStats?.efficiency || 0,
          avg_execution_time: nodeStats?.avgExecutionTime || 0
        }
      };

      const dataStr = safeStringify(statsData, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `execution-stats-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return { success: true, message: 'Statistics export completed successfully' };
    } catch (error) {
      console.error('Error exporting stats:', error);
      return { success: false, error: error.message };
    }
  }, [structuredLogs, parsedTextLogs, nodeStats]);

  // Export as CSV (for structured logs)
  const exportAsCsv = useCallback((filename = null) => {
    try {
      if (!structuredLogs || structuredLogs.length === 0) {
        throw new Error('No structured logs available for CSV export');
      }

      // Define CSV headers
      const headers = [
        'Index',
        'Node ID',
        'Node Name', 
        'Node Type',
        'Status',
        'Timestamp',
        'Execution Time',
        'Result',
        'Error'
      ];

      // Create CSV content
      let csvContent = headers.join(',') + '\n';
      
      structuredLogs.forEach((log, index) => {
        const row = [
          index + 1,
          `"${log.node_id || log.nodeId || 'unknown'}"`,
          `"${log.node_name || log.nodeName || 'unknown'}"`,
          `"${log.node_type || log.nodeType || 'unknown'}"`,
          `"${log.status || 'unknown'}"`,
          `"${log.timestamp || log.metadata?.timestamp || 'unknown'}"`,
          log.execution_time || log.metadata?.execution_time || 0,
          `"${log.result ? (typeof log.result === 'string' ? log.result.replace(/"/g, '""') : safeStringify(log.result).replace(/"/g, '""')) : ''}"`,
          `"${log.error ? (typeof log.error === 'string' ? log.error.replace(/"/g, '""') : safeStringify(log.error).replace(/"/g, '""')) : ''}"`
        ];
        
        csvContent += row.join(',') + '\n';
      });

      const dataBlob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `execution-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return { success: true, message: 'CSV export completed successfully' };
    } catch (error) {
      console.error('Error exporting CSV:', error);
      return { success: false, error: error.message };
    }
  }, [structuredLogs]);

  // Export execution report (comprehensive)
  const exportReport = useCallback((filename = null) => {
    try {
      const timestamp = new Date().toLocaleString();
      const separator = '='.repeat(80);
      const subSeparator = '-'.repeat(50);
      
      let report = `EXECUTION ANALYSIS REPORT\n${separator}\n\n`;
      report += `Generated: ${timestamp}\n`;
      report += `Report Type: Comprehensive Execution Analysis\n\n`;
      
      // Executive Summary
      report += `EXECUTIVE SUMMARY\n${subSeparator}\n`;
      report += `Total Nodes Processed: ${nodeStats?.totalNodes || 0}\n`;
      report += `Success Rate: ${nodeStats?.successRate || 0}%\n`;
      report += `Total Errors: ${nodeStats?.errorCount || 0}\n`;
      report += `Total Warnings: ${nodeStats?.warningCount || 0}\n`;
      
      if (nodeStats?.executionTime) {
        report += `Total Execution Time: ${nodeStats.executionTime.toFixed(2)} seconds\n`;
      }
      
      if (nodeStats?.avgExecutionTime) {
        report += `Average Node Execution Time: ${nodeStats.avgExecutionTime.toFixed(2)} seconds\n`;
      }
      
      report += '\n';

      // Node Type Breakdown
      if (nodeStats?.nodeTypes && Object.keys(nodeStats.nodeTypes).length > 0) {
        report += `NODE TYPE BREAKDOWN\n${subSeparator}\n`;
        Object.entries(nodeStats.nodeTypes).forEach(([type, count]) => {
          const percentage = ((count / nodeStats.totalNodes) * 100).toFixed(1);
          report += `${type.charAt(0).toUpperCase() + type.slice(1)}: ${count} (${percentage}%)\n`;
        });
        report += '\n';
      }

      // Performance Analysis
      report += `PERFORMANCE ANALYSIS\n${subSeparator}\n`;
      report += `Success Rate: ${nodeStats?.successRate || 0}%\n`;
      report += `Error Rate: ${((nodeStats?.errorCount || 0) / (nodeStats?.totalNodes || 1) * 100).toFixed(1)}%\n`;
      
      if (nodeStats?.executionTime && nodeStats?.totalNodes) {
        const throughput = nodeStats.totalNodes / nodeStats.executionTime;
        report += `Throughput: ${throughput.toFixed(2)} nodes/second\n`;
      }
      
      report += '\n';

      // Recommendations
      report += `RECOMMENDATIONS\n${subSeparator}\n`;
      if (nodeStats?.errorCount > 0) {
        report += `• Review and fix ${nodeStats.errorCount} failed nodes\n`;
      }
      if (nodeStats?.warningCount > 0) {
        report += `• Address ${nodeStats.warningCount} warnings to improve reliability\n`;
      }
      if (nodeStats?.successRate < 80) {
        report += `• Success rate below 80% - consider workflow optimization\n`;
      }
      if (!nodeStats?.executionTime) {
        report += `• Enable execution time tracking for better performance analysis\n`;
      }
      
      report += `\n${separator}\nEnd of Report\n`;

      const dataBlob = new Blob([report], { type: 'text/plain' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `execution-report-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return { success: true, message: 'Report export completed successfully' };
    } catch (error) {
      console.error('Error exporting report:', error);
      return { success: false, error: error.message };
    }
  }, [nodeStats]);

  // Get export options based on available data
  const getAvailableExports = useCallback(() => {
    const options = [];
    
    // Always available
    options.push({
      id: 'json',
      name: 'JSON Export',
      description: 'Complete logs with metadata',
      icon: '📄',
      action: exportAsJson
    });
    
    options.push({
      id: 'text',
      name: 'Text Export', 
      description: 'Human-readable format',
      icon: '📝',
      action: exportAsText
    });
    
    options.push({
      id: 'stats',
      name: 'Statistics',
      description: 'Performance metrics',
      icon: '📊',
      action: exportStats
    });
    
    options.push({
      id: 'report',
      name: 'Analysis Report',
      description: 'Comprehensive analysis',
      icon: '📋',
      action: exportReport
    });

    // CSV only available with structured logs
    if (structuredLogs && structuredLogs.length > 0) {
      options.push({
        id: 'csv',
        name: 'CSV Export',
        description: 'Spreadsheet format',
        icon: '📈',
        action: exportAsCsv
      });
    }
    
    return options;
  }, [structuredLogs, exportAsJson, exportAsText, exportStats, exportReport, exportAsCsv]);

  return {
    // Export functions
    exportAsJson,
    exportAsText, 
    exportStats,
    exportAsCsv,
    exportReport,
    
    // Utility
    getAvailableExports
  };
};