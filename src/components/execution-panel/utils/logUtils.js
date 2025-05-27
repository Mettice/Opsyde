// components/execution-panel/utils/logUtils.js
import { safeStringify } from '../../rich-content/utils/safeStringify';

/**
 * Log processing utilities
 */

/**
 * Sanitize log data for display
 */
export const sanitizeLogData = (data) => {
  if (!data) return null;
  
  try {
    // Handle circular references and React components
    return JSON.parse(safeStringify(data));
  } catch (error) {
    console.warn('Error sanitizing log data:', error);
    return data;
  }
};

/**
 * Extract meaningful text from log entry
 */
export const extractLogText = (log) => {
  if (!log) return 'Empty log entry';
  
  // If it's already a string, return it
  if (typeof log === 'string') {
    return log.trim();
  }
  
  // Try to extract meaningful text from object
  if (typeof log === 'object' && log !== null) {
    // Check common text fields
    const textFields = ['message', 'text', 'description', 'content', 'output'];
    for (const field of textFields) {
      if (log[field] && typeof log[field] === 'string' && log[field].trim()) {
        return log[field].trim();
      }
    }
    
    // Check for error messages
    if (log.error) {
      if (typeof log.error === 'string') {
        return `Error: ${log.error}`;
      }
      if (log.error.message) {
        return `Error: ${log.error.message}`;
      }
    }
    
    // Fallback to stringified version
    return safeStringify(log);
  }
  
  // Fallback for other types
  return String(log);
};

/**
 * Determine log severity level
 */
export const getLogSeverity = (log) => {
  if (!log) return 'info';
  
  const text = extractLogText(log).toLowerCase();
  const status = log?.status?.toLowerCase();
  const level = log?.level?.toLowerCase();
  
  // Check explicit level first
  if (level) {
    if (['critical', 'fatal', 'severe'].includes(level)) return 'critical';
    if (['error', 'err'].includes(level)) return 'error';
    if (['warning', 'warn'].includes(level)) return 'warning';
    if (['info', 'information'].includes(level)) return 'info';
    if (['debug', 'trace'].includes(level)) return 'debug';
  }
  
  // Check status
  if (status) {
    if (['error', 'failed', 'failure'].includes(status)) return 'error';
    if (['warning', 'warn'].includes(status)) return 'warning';
    if (['success', 'completed', 'done'].includes(status)) return 'success';
    if (['running', 'executing', 'processing'].includes(status)) return 'info';
  }
  
  // Check text content for keywords
  if (text.includes('critical') || text.includes('fatal')) return 'critical';
  if (text.includes('error') || text.includes('failed') || text.includes('exception')) return 'error';
  if (text.includes('warning') || text.includes('warn')) return 'warning';
  if (text.includes('success') || text.includes('completed') || text.includes('done')) return 'success';
  
  return 'info';
};

/**
 * Format timestamp for display
 */
export const formatTimestamp = (timestamp, options = {}) => {
  if (!timestamp) return 'Unknown time';
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid time';
    
    const {
      format = 'relative', // 'relative', 'absolute', 'time', 'date'
      locale = 'en-US'
    } = options;
    
    switch (format) {
      case 'relative':
        return formatRelativeTime(date);
      case 'absolute':
        return date.toLocaleString(locale);
      case 'time':
        return date.toLocaleTimeString(locale);
      case 'date':
        return date.toLocaleDateString(locale);
      default:
        return date.toLocaleString(locale);
    }
  } catch (error) {
    console.warn('Error formatting timestamp:', error);
    return String(timestamp);
  }
};

/**
 * Format relative time (e.g., "2 minutes ago")
 */
const formatRelativeTime = (date) => {
  const now = new Date();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 30) return 'Just now';
  if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
};

/**
 * Filter logs based on criteria
 */
export const filterLogs = (logs, filters = {}) => {
  if (!logs || !Array.isArray(logs)) return [];
  
  const {
    severity = null,
    nodeType = null,
    status = null,
    timeRange = null,
    searchText = null,
    nodeId = null
  } = filters;
  
  return logs.filter(log => {
    // Severity filter
    if (severity && getLogSeverity(log) !== severity) {
      return false;
    }
    
    // Node type filter
    if (nodeType) {
      const logNodeType = log?.node_type || log?.nodeType || log?.type;
      if (logNodeType !== nodeType) return false;
    }
    
    // Status filter
    if (status) {
      const logStatus = log?.status || (log?.metadata?.has_error ? 'error' : 'completed');
      if (logStatus !== status) return false;
    }
    
    // Node ID filter
    if (nodeId) {
      const logNodeId = log?.node_id || log?.nodeId || log?.id;
      if (logNodeId !== nodeId) return false;
    }
    
    // Time range filter
    if (timeRange) {
      const logTimestamp = log?.timestamp || log?.metadata?.timestamp;
      if (logTimestamp) {
        const logDate = new Date(logTimestamp);
        const now = new Date();
        const timeDiff = now - logDate;
        
        switch (timeRange) {
          case 'last_hour':
            if (timeDiff > 60 * 60 * 1000) return false;
            break;
          case 'last_day':
            if (timeDiff > 24 * 60 * 60 * 1000) return false;
            break;
          case 'last_week':
            if (timeDiff > 7 * 24 * 60 * 60 * 1000) return false;
            break;
        }
      }
    }
    
    // Search text filter
    if (searchText) {
      const text = extractLogText(log).toLowerCase();
      const nodeName = (log?.node_name || log?.nodeName || '').toLowerCase();
      const nodeId = (log?.node_id || log?.nodeId || '').toLowerCase();
      
      const searchLower = searchText.toLowerCase();
      if (!text.includes(searchLower) && 
          !nodeName.includes(searchLower) && 
          !nodeId.includes(searchLower)) {
        return false;
      }
    }
    
    return true;
  });
};

/**
 * Sort logs by different criteria
 */
export const sortLogs = (logs, sortBy = 'timestamp', sortOrder = 'desc') => {
  if (!logs || !Array.isArray(logs)) return [];
  
  const sortedLogs = [...logs];
  
  sortedLogs.sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'timestamp':
        aValue = new Date(a?.timestamp || a?.metadata?.timestamp || 0);
        bValue = new Date(b?.timestamp || b?.metadata?.timestamp || 0);
        break;
      case 'severity':
        const severityOrder = { 'critical': 5, 'error': 4, 'warning': 3, 'info': 2, 'debug': 1, 'success': 0 };
        aValue = severityOrder[getLogSeverity(a)] || 0;
        bValue = severityOrder[getLogSeverity(b)] || 0;
        break;
      case 'nodeType':
        aValue = (a?.node_type || a?.nodeType || '').toLowerCase();
        bValue = (b?.node_type || b?.nodeType || '').toLowerCase();
        break;
      case 'nodeName':
        aValue = (a?.node_name || a?.nodeName || '').toLowerCase();
        bValue = (b?.node_name || b?.nodeName || '').toLowerCase();
        break;
      case 'executionTime':
        aValue = a?.execution_time || a?.metadata?.execution_time || 0;
        bValue = b?.execution_time || b?.metadata?.execution_time || 0;
        break;
      default:
        aValue = a;
        bValue = b;
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });
  
  return sortedLogs;
};

/**
 * Group logs by different criteria
 */
export const groupLogs = (logs, groupBy = 'nodeType') => {
  if (!logs || !Array.isArray(logs)) return {};
  
  const groups = {};
  
  logs.forEach(log => {
    let groupKey;
    
    switch (groupBy) {
      case 'nodeType':
        groupKey = log?.node_type || log?.nodeType || 'unknown';
        break;
      case 'severity':
        groupKey = getLogSeverity(log);
        break;
      case 'status':
        groupKey = log?.status || (log?.metadata?.has_error ? 'error' : 'completed');
        break;
      case 'hour':
        const timestamp = log?.timestamp || log?.metadata?.timestamp;
        if (timestamp) {
          const date = new Date(timestamp);
          groupKey = `${date.getHours()}:00`;
        } else {
          groupKey = 'unknown';
        }
        break;
      case 'day':
        const dayTimestamp = log?.timestamp || log?.metadata?.timestamp;
        if (dayTimestamp) {
          const date = new Date(dayTimestamp);
          groupKey = date.toDateString();
        } else {
          groupKey = 'unknown';
        }
        break;
      default:
        groupKey = 'all';
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(log);
  });
  
  return groups;
};

/**
 * Truncate log text for display
 */
export const truncateLogText = (text, maxLength = 100) => {
  if (!text || typeof text !== 'string') return '';
  
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Get log color scheme based on severity
 */
export const getLogColorScheme = (log) => {
  const severity = getLogSeverity(log);
  
  const colorSchemes = {
    critical: {
      bg: 'bg-red-100',
      border: 'border-red-300',
      text: 'text-red-900',
      icon: '🔥'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: '❌'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: '⚠️'
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: '✅'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: '💬'
    },
    debug: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-600',
      icon: '🔍'
    }
  };
  
  return colorSchemes[severity] || colorSchemes.info;
};

/**
 * Parse structured log entry
 */
export const parseStructuredLog = (log) => {
  if (!log) return null;
  
  try {
    return {
      id: log?.id || `log-${Date.now()}-${Math.random()}`,
      timestamp: log?.timestamp || log?.metadata?.timestamp || new Date().toISOString(),
      nodeId: log?.node_id || log?.nodeId || log?.id || 'unknown',
      nodeName: log?.node_name || log?.nodeName || log?.label || 'Unknown Node',
      nodeType: log?.node_type || log?.nodeType || log?.type || 'unknown',
      status: log?.status || (log?.metadata?.has_error ? 'error' : 'completed'),
      severity: getLogSeverity(log),
      text: extractLogText(log),
      result: log?.result || null,
      error: log?.error || null,
      executionTime: log?.execution_time || log?.metadata?.execution_time || 0,
      metadata: log?.metadata || {},
      raw: log
    };
  } catch (error) {
    console.error('Error parsing structured log:', error);
    return {
      id: `error-${Date.now()}`,
      timestamp: new Date().toISOString(),
      nodeId: 'unknown',
      nodeName: 'Parse Error',
      nodeType: 'error',
      status: 'error',
      severity: 'error',
      text: `Error parsing log: ${error.message}`,
      result: null,
      error: error.message,
      executionTime: 0,
      metadata: {},
      raw: log
    };
  }
};

/**
 * Validate log entry structure
 */
export const validateLogEntry = (log) => {
  const validation = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  if (!log) {
    validation.isValid = false;
    validation.errors.push('Log entry is null or undefined');
    return validation;
  }
  
  // Check required fields
  if (!log.timestamp && !log.metadata?.timestamp) {
    validation.warnings.push('Missing timestamp');
  }
  
  if (!log.node_id && !log.nodeId && !log.id) {
    validation.warnings.push('Missing node identifier');
  }
  
  // Check timestamp validity
  const timestamp = log.timestamp || log.metadata?.timestamp;
  if (timestamp) {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      validation.errors.push('Invalid timestamp format');
      validation.isValid = false;
    }
  }
  
  // Check execution time validity
  const executionTime = log.execution_time || log.metadata?.execution_time;
  if (executionTime !== undefined && (typeof executionTime !== 'number' || executionTime < 0)) {
    validation.warnings.push('Invalid execution time');
  }
  
  return validation;
};

/**
 * Create log entry summary
 */
export const createLogSummary = (logs) => {
  if (!logs || !Array.isArray(logs)) {
    return {
      total: 0,
      byStatus: {},
      bySeverity: {},
      byNodeType: {},
      timeRange: null,
      hasErrors: false
    };
  }
  
  const summary = {
    total: logs.length,
    byStatus: {},
    bySeverity: {},
    byNodeType: {},
    timeRange: null,
    hasErrors: false
  };
  
  const timestamps = [];
  
  logs.forEach(log => {
    // Count by status
    const status = log?.status || (log?.metadata?.has_error ? 'error' : 'completed');
    summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
    
    // Count by severity
    const severity = getLogSeverity(log);
    summary.bySeverity[severity] = (summary.bySeverity[severity] || 0) + 1;
    
    // Count by node type
    const nodeType = log?.node_type || log?.nodeType || 'unknown';
    summary.byNodeType[nodeType] = (summary.byNodeType[nodeType] || 0) + 1;
    
    // Check for errors
    if (severity === 'error' || severity === 'critical') {
      summary.hasErrors = true;
    }
    
    // Collect timestamps
    const timestamp = log?.timestamp || log?.metadata?.timestamp;
    if (timestamp) {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        timestamps.push(date);
      }
    }
  });
  
  // Calculate time range
  if (timestamps.length > 0) {
    timestamps.sort((a, b) => a - b);
    summary.timeRange = {
      start: timestamps[0],
      end: timestamps[timestamps.length - 1],
      duration: timestamps[timestamps.length - 1] - timestamps[0]
    };
  }
  
  return summary;
};