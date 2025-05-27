// components/execution-panel/utils/statsCalculator.js

/**
 * Utility functions for calculating execution statistics
 */

/**
 * Calculate basic node statistics
 */
export const calculateBasicStats = (logs) => {
    const stats = {
      total: 0,
      success: 0,
      error: 0,
      warning: 0,
      running: 0
    };
  
    if (!logs || !Array.isArray(logs)) return stats;
  
    logs.forEach(log => {
      stats.total++;
      
      const status = log?.status || (log?.metadata?.has_error ? 'error' : 'completed');
      
      switch (status) {
        case 'completed':
        case 'success':
          stats.success++;
          break;
        case 'error':
        case 'failed':
          stats.error++;
          break;
        case 'warning':
          stats.warning++;
          break;
        case 'running':
        case 'started':
          stats.running++;
          break;
      }
    });
  
    return stats;
  };
  
  /**
   * Calculate execution time statistics
   */
  export const calculateTimeStats = (logs) => {
    const timeStats = {
      totalTime: 0,
      averageTime: 0,
      minTime: Infinity,
      maxTime: 0,
      hasTimeData: false
    };
  
    if (!logs || !Array.isArray(logs)) return timeStats;
  
    const executionTimes = logs
      .map(log => log?.execution_time || log?.metadata?.execution_time)
      .filter(time => typeof time === 'number' && time > 0);
  
    if (executionTimes.length === 0) return timeStats;
  
    timeStats.hasTimeData = true;
    timeStats.totalTime = executionTimes.reduce((sum, time) => sum + time, 0);
    timeStats.averageTime = timeStats.totalTime / executionTimes.length;
    timeStats.minTime = Math.min(...executionTimes);
    timeStats.maxTime = Math.max(...executionTimes);
  
    return timeStats;
  };
  
  /**
   * Calculate node type distribution
   */
  export const calculateNodeTypeDistribution = (logs) => {
    const distribution = {};
    
    if (!logs || !Array.isArray(logs)) return distribution;
  
    logs.forEach(log => {
      const nodeType = log?.node_type || log?.nodeType || log?.type || 'unknown';
      distribution[nodeType] = (distribution[nodeType] || 0) + 1;
    });
  
    return distribution;
  };
  
  /**
   * Calculate workflow timeline
   */
  export const calculateWorkflowTimeline = (logs) => {
    if (!logs || !Array.isArray(logs)) return [];
  
    const timeline = logs
      .map((log, index) => {
        const timestamp = log?.timestamp || log?.metadata?.timestamp;
        if (!timestamp) return null;
  
        return {
          id: log?.id || index,
          timestamp: new Date(timestamp),
          nodeId: log?.node_id || log?.nodeId || `node-${index}`,
          nodeType: log?.node_type || log?.nodeType || 'unknown',
          status: log?.status || 'unknown',
          executionTime: log?.execution_time || log?.metadata?.execution_time || 0
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.timestamp - b.timestamp);
  
    return timeline;
  };
  
  /**
   * Calculate performance metrics
   */
  export const calculatePerformanceMetrics = (logs, timeline = null) => {
    const metrics = {
      throughput: 0,
      efficiency: 0,
      bottlenecks: [],
      trends: {
        improving: false,
        degrading: false,
        stable: true
      }
    };
  
    if (!logs || !Array.isArray(logs) || logs.length === 0) return metrics;
  
    const timelineData = timeline || calculateWorkflowTimeline(logs);
    
    if (timelineData.length < 2) return metrics;
  
    // Calculate throughput (nodes per second)
    const startTime = timelineData[0].timestamp;
    const endTime = timelineData[timelineData.length - 1].timestamp;
    const durationSeconds = (endTime - startTime) / 1000;
    
    if (durationSeconds > 0) {
      metrics.throughput = logs.length / durationSeconds;
      
      // Calculate efficiency (successful nodes per second)
      const successfulNodes = logs.filter(log => {
        const status = log?.status || (log?.metadata?.has_error ? 'error' : 'completed');
        return status === 'completed' || status === 'success';
      }).length;
      
      metrics.efficiency = successfulNodes / durationSeconds;
    }
  
    // Identify bottlenecks (slow nodes)
    const executionTimes = logs
      .map((log, index) => ({
        index,
        nodeId: log?.node_id || log?.nodeId || `node-${index}`,
        nodeType: log?.node_type || log?.nodeType || 'unknown',
        executionTime: log?.execution_time || log?.metadata?.execution_time || 0
      }))
      .filter(item => item.executionTime > 0)
      .sort((a, b) => b.executionTime - a.executionTime);
  
    // Top 3 slowest nodes are considered bottlenecks
    metrics.bottlenecks = executionTimes.slice(0, 3);
  
    // Analyze trends (simplified - would need more sophisticated analysis in production)
    if (executionTimes.length >= 5) {
      const firstHalf = executionTimes.slice(-Math.floor(executionTimes.length / 2));
      const secondHalf = executionTimes.slice(0, Math.floor(executionTimes.length / 2));
      
      const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.executionTime, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.executionTime, 0) / secondHalf.length;
      
      const improvementThreshold = 0.1; // 10% improvement/degradation threshold
      
      if (firstHalfAvg < secondHalfAvg * (1 - improvementThreshold)) {
        metrics.trends.improving = true;
        metrics.trends.stable = false;
      } else if (firstHalfAvg > secondHalfAvg * (1 + improvementThreshold)) {
        metrics.trends.degrading = true;
        metrics.trends.stable = false;
      }
    }
  
    return metrics;
  };
  
  /**
   * Calculate error analysis
   */
  export const calculateErrorAnalysis = (logs) => {
    const analysis = {
      totalErrors: 0,
      errorsByType: {},
      errorsByNode: {},
      commonErrors: [],
      errorRate: 0
    };
  
    if (!logs || !Array.isArray(logs)) return analysis;
  
    const errors = logs.filter(log => {
      const status = log?.status || (log?.metadata?.has_error ? 'error' : 'completed');
      return status === 'error' || status === 'failed' || log?.error;
    });
  
    analysis.totalErrors = errors.length;
    analysis.errorRate = logs.length > 0 ? (errors.length / logs.length) * 100 : 0;
  
    // Group errors by node type
    errors.forEach(log => {
      const nodeType = log?.node_type || log?.nodeType || 'unknown';
      const nodeId = log?.node_id || log?.nodeId || 'unknown';
      
      analysis.errorsByType[nodeType] = (analysis.errorsByType[nodeType] || 0) + 1;
      analysis.errorsByNode[nodeId] = (analysis.errorsByNode[nodeId] || 0) + 1;
    });
  
    // Find common error patterns (simplified)
    const errorMessages = errors
      .map(log => log?.error || log?.message || 'Unknown error')
      .filter(Boolean);
  
    const errorCounts = {};
    errorMessages.forEach(message => {
      // Simple pattern matching - look for first few words
      const pattern = message.split(' ').slice(0, 3).join(' ');
      errorCounts[pattern] = (errorCounts[pattern] || 0) + 1;
    });
  
    analysis.commonErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([pattern, count]) => ({ pattern, count }));
  
    return analysis;
  };
  
  /**
   * Generate comprehensive statistics summary
   */
  export const generateStatsSummary = (logs, nodes = []) => {
    if (!logs || !Array.isArray(logs)) {
      return {
        basic: calculateBasicStats([]),
        time: calculateTimeStats([]),
        nodeTypes: {},
        timeline: [],
        performance: calculatePerformanceMetrics([]),
        errors: calculateErrorAnalysis([]),
        summary: {
          totalNodes: 0,
          successRate: 0,
          errorRate: 0,
          hasData: false
        }
      };
    }
  
    const basic = calculateBasicStats(logs);
    const time = calculateTimeStats(logs);
    const nodeTypes = calculateNodeTypeDistribution(logs);
    const timeline = calculateWorkflowTimeline(logs);
    const performance = calculatePerformanceMetrics(logs, timeline);
    const errors = calculateErrorAnalysis(logs);
  
    const summary = {
      totalNodes: basic.total,
      successRate: basic.total > 0 ? Math.round((basic.success / basic.total) * 100) : 0,
      errorRate: basic.total > 0 ? Math.round((basic.error / basic.total) * 100) : 0,
      hasData: basic.total > 0,
      executionTime: time.totalTime,
      averageNodeTime: time.averageTime,
      throughput: performance.throughput,
      efficiency: performance.efficiency
    };
  
    return {
      basic,
      time,
      nodeTypes,
      timeline,
      performance,
      errors,
      summary
    };
  };
  
  /**
   * Compare two statistics summaries
   */
  export const compareStats = (currentStats, previousStats) => {
    if (!previousStats || !currentStats) {
      return {
        hasComparison: false,
        changes: {}
      };
    }
  
    const changes = {
      totalNodes: {
        current: currentStats.summary.totalNodes,
        previous: previousStats.summary.totalNodes,
        change: currentStats.summary.totalNodes - previousStats.summary.totalNodes,
        percentChange: previousStats.summary.totalNodes > 0 
          ? ((currentStats.summary.totalNodes - previousStats.summary.totalNodes) / previousStats.summary.totalNodes) * 100
          : 0
      },
      successRate: {
        current: currentStats.summary.successRate,
        previous: previousStats.summary.successRate,
        change: currentStats.summary.successRate - previousStats.summary.successRate,
        percentChange: previousStats.summary.successRate > 0
          ? ((currentStats.summary.successRate - previousStats.summary.successRate) / previousStats.summary.successRate) * 100
          : 0
      },
      errorRate: {
        current: currentStats.summary.errorRate,
        previous: previousStats.summary.errorRate,
        change: currentStats.summary.errorRate - previousStats.summary.errorRate,
        percentChange: previousStats.summary.errorRate > 0
          ? ((currentStats.summary.errorRate - previousStats.summary.errorRate) / previousStats.summary.errorRate) * 100
          : 0
      }
    };
  
    return {
      hasComparison: true,
      changes,
      improving: changes.successRate.change > 0 && changes.errorRate.change <= 0,
      degrading: changes.successRate.change < 0 || changes.errorRate.change > 0
    };
  };