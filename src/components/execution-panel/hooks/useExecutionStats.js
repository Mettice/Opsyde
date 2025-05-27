// components/execution-panel/hooks/useExecutionStats.js
import { useMemo, useCallback } from 'react';

/**
 * Custom hook for calculating execution statistics
 */
export const useExecutionStats = (structuredLogs, parsedTextLogs, extractNodeId) => {

  // Node statistics calculation with error handling
  const calculateNodeStats = useCallback(() => {
    try {
      const stats = {
        totalNodes: 0,
        successCount: 0,
        errorCount: 0,
        warningCount: 0,
        runningCount: 0,
        nodeTypes: {},
        executionTime: null,
        avgExecutionTime: 0,
        nodeDetails: []
      };
      
      if (structuredLogs && structuredLogs.length > 0) {
        const processedNodes = new Set();
        const nodeExecutionTimes = [];
        
        structuredLogs.forEach(log => {
          try {
            const nodeId = extractNodeId ? extractNodeId(log) : log?.node_id || log?.id;
            const nodeType = log?.node_type || log?.nodeType || log?.type || 'unknown';
            const status = log?.status || (log?.metadata?.has_error ? 'error' : 'completed');
            const executionTime = log?.execution_time || log?.metadata?.execution_time;
            
            if (nodeId && nodeId !== 'unknown') {
              processedNodes.add(nodeId);
              
              // Track node details
              stats.nodeDetails.push({
                id: nodeId,
                type: nodeType,
                status: status,
                executionTime: executionTime,
                timestamp: log?.timestamp || log?.metadata?.timestamp
              });
              
              // Count node types
              if (nodeType && nodeType !== 'unknown') {
                stats.nodeTypes[nodeType] = (stats.nodeTypes[nodeType] || 0) + 1;
              }
              
              // Count statuses
              switch (status) {
                case 'error':
                  stats.errorCount++;
                  break;
                case 'warning':
                  stats.warningCount++;
                  break;
                case 'running':
                case 'started':
                  stats.runningCount++;
                  break;
                case 'completed':
                case 'success':
                  stats.successCount++;
                  break;
              }
              
              // Track execution times
              if (executionTime && typeof executionTime === 'number') {
                nodeExecutionTimes.push(executionTime);
              }
            }
          } catch (logError) {
            console.warn('Error processing log for stats:', logError);
          }
        });
        
        stats.totalNodes = processedNodes.size;
        
        // Calculate execution time statistics
        if (nodeExecutionTimes.length > 0) {
          stats.avgExecutionTime = nodeExecutionTimes.reduce((a, b) => a + b, 0) / nodeExecutionTimes.length;
        }
        
        // Calculate total execution time if we have timestamps
        if (structuredLogs.length >= 2) {
          try {
            const timestamps = structuredLogs
              .map(log => log.timestamp || log.metadata?.timestamp)
              .filter(Boolean)
              .map(ts => new Date(ts));
            
            if (timestamps.length >= 2) {
              const sortedTimestamps = timestamps.sort((a, b) => a - b);
              const startTime = sortedTimestamps[0];
              const endTime = sortedTimestamps[sortedTimestamps.length - 1];
              stats.executionTime = (endTime - startTime) / 1000; // in seconds
            }
          } catch (timeError) {
            console.warn('Error calculating execution time:', timeError);
          }
        }
      }
      
      // Fallback to text logs if no structured logs
      if (stats.totalNodes === 0 && parsedTextLogs && parsedTextLogs.length > 0) {
        let nodeExecutionCount = 0;
        let errorCount = 0;
        let warningCount = 0;
        
        parsedTextLogs.forEach(log => {
          if (!log.text || log.text.startsWith('   ')) return;
          
          if (log.text.includes('processed') || log.text.includes('completed execution')) {
            nodeExecutionCount++;
          }
          
          if (log.text.startsWith('❌') || log.type === 'error') {
            errorCount++;
          }
          
          if (log.text.startsWith('⚠️') || log.type === 'warning') {
            warningCount++;
          }
        });
        
        stats.totalNodes = nodeExecutionCount;
        stats.successCount = nodeExecutionCount - errorCount - warningCount;
        stats.errorCount = errorCount;
        stats.warningCount = warningCount;
      }
      
      // Calculate success rate
      const successRate = stats.totalNodes > 0
        ? Math.round((stats.successCount / stats.totalNodes) * 100)
        : 0;
      
      return { ...stats, successRate };
    } catch (error) {
      console.error('Error calculating node stats:', error);
      return {
        totalNodes: 0,
        successCount: 0,
        errorCount: 0,
        warningCount: 0,
        runningCount: 0,
        nodeTypes: {},
        executionTime: null,
        avgExecutionTime: 0,
        successRate: 0,
        nodeDetails: []
      };
    }
  }, [structuredLogs, parsedTextLogs, extractNodeId]);

  // Calculate performance metrics
  const calculatePerformanceMetrics = useCallback(() => {
    try {
      const metrics = {
        throughput: 0, // nodes per second
        efficiency: 0, // successful nodes / total time
        bottlenecks: [],
        recommendations: []
      };

      if (structuredLogs && structuredLogs.length > 0) {
        const nodeExecutionTimes = [];
        const failedNodes = [];
        const slowNodes = [];

        structuredLogs.forEach(log => {
          const executionTime = log?.execution_time || log?.metadata?.execution_time;
          const status = log?.status || (log?.metadata?.has_error ? 'error' : 'completed');
          const nodeId = extractNodeId ? extractNodeId(log) : log?.node_id;
          
          if (executionTime && typeof executionTime === 'number') {
            nodeExecutionTimes.push({
              time: executionTime,
              nodeId: nodeId,
              status: status
            });
            
            // Identify slow nodes (> 5 seconds)
            if (executionTime > 5) {
              slowNodes.push({
                nodeId: nodeId,
                executionTime: executionTime,
                status: status
              });
            }
          }
          
          if (status === 'error') {
            failedNodes.push({
              nodeId: nodeId,
              error: log?.error || log?.message
            });
          }
        });

        // Calculate throughput
        if (nodeExecutionTimes.length > 0) {
          const totalTime = nodeExecutionTimes.reduce((sum, node) => sum + node.time, 0);
          metrics.throughput = nodeExecutionTimes.length / (totalTime / 1000); // nodes per second
          
          const successfulNodes = nodeExecutionTimes.filter(node => node.status !== 'error').length;
          metrics.efficiency = successfulNodes / (totalTime / 1000);
        }

        // Identify bottlenecks
        if (slowNodes.length > 0) {
          metrics.bottlenecks = slowNodes
            .sort((a, b) => b.executionTime - a.executionTime)
            .slice(0, 5);
        }

        // Generate recommendations
        if (failedNodes.length > nodeExecutionTimes.length * 0.1) {
          metrics.recommendations.push('High error rate detected - review failed node configurations');
        }
        
        if (slowNodes.length > 0) {
          metrics.recommendations.push(`${slowNodes.length} slow nodes detected - consider optimization`);
        }
        
        if (metrics.throughput < 1) {
          metrics.recommendations.push('Low throughput detected - consider parallel execution');
        }
      }

      return metrics;
    } catch (error) {
      console.error('Error calculating performance metrics:', error);
      return {
        throughput: 0,
        efficiency: 0,
        bottlenecks: [],
        recommendations: []
      };
    }
  }, [structuredLogs, extractNodeId]);

  // Calculate timeline data for visualization
  const calculateTimeline = useCallback(() => {
    try {
      if (!structuredLogs || structuredLogs.length === 0) return [];

      const timeline = structuredLogs
        .map(log => ({
          timestamp: new Date(log.timestamp || log.metadata?.timestamp || Date.now()),
          nodeId: extractNodeId ? extractNodeId(log) : log?.node_id,
          status: log?.status || (log?.metadata?.has_error ? 'error' : 'completed'),
          executionTime: log?.execution_time || log?.metadata?.execution_time || 0,
          nodeType: log?.node_type || log?.nodeType || 'unknown'
        }))
        .filter(item => item.timestamp && !isNaN(item.timestamp))
        .sort((a, b) => a.timestamp - b.timestamp);

      return timeline;
    } catch (error) {
      console.error('Error calculating timeline:', error);
      return [];
    }
  }, [structuredLogs, extractNodeId]);

  // Memoized calculations
  const nodeStats = useMemo(() => calculateNodeStats(), [calculateNodeStats]);
  const performanceMetrics = useMemo(() => calculatePerformanceMetrics(), [calculatePerformanceMetrics]);
  const timeline = useMemo(() => calculateTimeline(), [calculateTimeline]);

  // Derived statistics
  const derivedStats = useMemo(() => {
    return {
      // Completion percentage
      completionRate: nodeStats.totalNodes > 0 
        ? Math.round(((nodeStats.successCount + nodeStats.errorCount) / nodeStats.totalNodes) * 100)
        : 0,
      
      // Error rate
      errorRate: nodeStats.totalNodes > 0
        ? Math.round((nodeStats.errorCount / nodeStats.totalNodes) * 100)
        : 0,
      
      // Status distribution
      statusDistribution: {
        success: nodeStats.successCount,
        error: nodeStats.errorCount,
        warning: nodeStats.warningCount,
        running: nodeStats.runningCount
      },
      
      // Most common node type
      mostCommonNodeType: Object.keys(nodeStats.nodeTypes).length > 0
        ? Object.entries(nodeStats.nodeTypes).reduce((a, b) => a[1] > b[1] ? a : b)[0]
        : 'none',
      
      // Execution summary
      executionSummary: {
        totalTime: nodeStats.executionTime,
        avgNodeTime: nodeStats.avgExecutionTime,
        throughput: performanceMetrics.throughput,
        efficiency: performanceMetrics.efficiency
      }
    };
  }, [nodeStats, performanceMetrics]);

  return {
    // Core statistics
    nodeStats,
    performanceMetrics,
    timeline,
    derivedStats,
    
    // Calculation functions (for re-calculation if needed)
    calculateNodeStats,
    calculatePerformanceMetrics,
    calculateTimeline
  };
};