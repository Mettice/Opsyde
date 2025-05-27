// components/execution-panel/hooks/useLogProcessing.js
import { useMemo, useCallback } from 'react';
import { safeStringify } from '../../rich-content/utils/safeStringify';

/**
 * Custom hook for processing and parsing execution logs
 */
export const useLogProcessing = (logs, structuredLogs, nodes = []) => {
  
  // Helper functions for log type detection
  const getLogType = useCallback((line) => {
    if (!line || typeof line !== 'string') return 'info';
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('error') || lowerLine.includes('failed')) return 'error';
    if (lowerLine.includes('warning') || lowerLine.includes('warn')) return 'warning';
    if (lowerLine.includes('executing') || lowerLine.includes('started')) return 'executing';
    if (lowerLine.includes('completed') || lowerLine.includes('success')) return 'completed';
    if (lowerLine.includes('agent')) return 'agent';
    if (lowerLine.includes('task')) return 'task';
    if (lowerLine.includes('tool')) return 'tool';
    return 'info';
  }, []);

  const getLogEmoji = useCallback((line) => {
    if (!line || typeof line !== 'string') return '📄';
    const type = getLogType(line);
    
    const emojiMap = {
      'error': '❌',
      'warning': '⚠️',
      'executing': '⚙️',
      'completed': '✅',
      'agent': '🧠',
      'task': '📋',
      'tool': '🔧',
      'info': '💬'
    };
    
    return emojiMap[type] || '📄';
  }, [getLogType]);

  // Enhanced text log parser with better error handling
  const parseTextLogs = useCallback((logText) => {
    if (!logText) return [];
    
    try {
      // Handle array of logs
      if (Array.isArray(logText)) {
        return logText.map((line, idx) => {
          if (typeof line !== 'string') {
            return {
              type: 'info',
              emoji: '📄',
              text: safeStringify(line),
              id: `${idx}-obj`,
              timestamp: new Date().toISOString()
            };
          }

          const isIndented = line.startsWith('   ↳') || line.startsWith('  ');
          return {
            type: isIndented ? 'detail' : getLogType(line),
            emoji: isIndented ? '' : getLogEmoji(line),
            text: line,
            id: `${idx}-line`,
            timestamp: new Date().toISOString()
          };
        });
      }
      
      // Handle object logs
      if (typeof logText === 'object') {
        return [{
          type: 'info',
          emoji: '📄',
          text: safeStringify(logText),
          id: 0,
          timestamp: new Date().toISOString()
        }];
      }
      
      // Handle string logs
      if (typeof logText === 'string') {
        const lines = logText.split('\n').filter(Boolean);
        return lines.map((line, idx) => ({
          type: getLogType(line),
          emoji: getLogEmoji(line),
          text: line,
          id: idx,
          timestamp: new Date().toISOString()
        }));
      }
      
      // Fallback for other types
      return [{
        type: 'info',
        emoji: '📄',
        text: String(logText),
        id: 0,
        timestamp: new Date().toISOString()
      }];
    } catch (error) {
      console.error('Error parsing text logs:', error);
      return [{
        type: 'error',
        emoji: '❌',
        text: `Error parsing logs: ${error.message}`,
        id: 0,
        timestamp: new Date().toISOString()
      }];
    }
  }, [getLogType, getLogEmoji]);

  // Enhanced node name extraction with proper error handling
  const extractNodeName = useCallback((log) => {
    try {
      // Try multiple sources for node name
      const possibleNames = [
        log?.node_name,
        log?.nodeName,
        log?.node_label,
        log?.nodeLabel,
        log?.label,
        log?.metadata?.node_name,
        log?.metadata?.nodeName,
        log?.data?.label,
        log?.name,
        log?.title
      ];
      
      for (const name of possibleNames) {
        if (name && typeof name === 'string' && name.trim()) {
          return name.trim();
        }
      }
      
      // Try to find node by ID if nodes array is provided
      const nodeId = log?.node_id || log?.nodeId || log?.metadata?.node_id;
      if (nodeId && nodes && Array.isArray(nodes)) {
        const foundNode = nodes.find(n => n?.id === nodeId);
        if (foundNode?.data?.label) {
          return foundNode.data.label;
        }
        if (foundNode?.label) {
          return foundNode.label;
        }
      }
      
      // Fallback based on node type and ID
      const nodeType = log?.node_type || log?.nodeType || log?.type || 'Node';
      const displayNodeId = nodeId || log?.id || 'unknown';
      
      return `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} ${displayNodeId}`;
    } catch (error) {
      console.warn('Error extracting node name:', error);
      return 'Unknown Node';
    }
  }, [nodes]);

  // Enhanced node ID extraction
  const extractNodeId = useCallback((log) => {
    try {
      return log?.node_id || log?.nodeId || log?.metadata?.node_id || log?.id || 'unknown';
    } catch (error) {
      console.warn('Error extracting node ID:', error);
      return 'unknown';
    }
  }, []);

  // Enhanced result formatting with error handling
  const formatResult = useCallback((result) => {
    try {
      if (!result && result !== 0 && result !== false) return null;
      
      // Handle string results directly
      if (typeof result === 'string') {
        return result;
      }
      
      // Handle primitive types
      if (typeof result === 'number' || typeof result === 'boolean') {
        return String(result);
      }
      
      // Handle arrays
      if (Array.isArray(result)) {
        if (result.length === 0) return 'Empty array';
        if (result.length === 1 && typeof result[0] === 'string') {
          return result[0];
        }
        return `Array with ${result.length} items`;
      }
      
      // Handle objects - look for common patterns
      if (typeof result === 'object' && result !== null) {
        // Check for direct output/result properties
        const outputKeys = ['output', 'result', 'content', 'text', 'message', 'data'];
        for (const key of outputKeys) {
          if (result[key] && typeof result[key] === 'string') {
            return result[key];
          }
        }
        
        // Check for task-specific patterns
        if (result.task_name && result.result) {
          return `Task "${result.task_name}": ${typeof result.result === 'string' ? result.result : 'Completed'}`;
        }
        
        if (result.input_type && result.value !== undefined) {
          return `${result.label || result.input_type}: ${typeof result.value === 'string' ? result.value : String(result.value)}`;
        }
        
        // Try to extract meaningful content from the object
        const keys = Object.keys(result);
        if (keys.length === 1) {
          const value = result[keys[0]];
          if (typeof value === 'string') {
            return value;
          }
        }
        
        // Look for any string values in the object
        for (const key of keys) {
          if (typeof result[key] === 'string' && result[key].length > 0) {
            return result[key];
          }
        }
        
        // Fallback to object description
        return `Object with ${keys.length} properties`;
      }
      
      return String(result);
    } catch (error) {
      console.error('Error formatting result:', error);
      return 'Error formatting result';
    }
  }, []);

  // Parse text logs and prepare display logs
  const parsedTextLogs = useMemo(() => parseTextLogs(logs), [logs, parseTextLogs]);

  // Process structured logs for better display
  const processedStructuredLogs = useMemo(() => {
    if (!structuredLogs || !Array.isArray(structuredLogs)) return [];
    
    return structuredLogs.map((log, index) => {
      try {
        return {
          ...log,
          id: log.id || `structured-${index}`,
          nodeName: extractNodeName(log),
          nodeId: extractNodeId(log),
          formattedResult: formatResult(log.result),
          timestamp: log.timestamp || log.metadata?.timestamp || new Date().toISOString(),
          status: log.status || (log.metadata?.has_error ? 'error' : 'completed')
        };
      } catch (error) {
        console.error('Error processing structured log:', error);
        return {
          ...log,
          id: `error-${index}`,
          nodeName: 'Error Processing Log',
          nodeId: 'unknown',
          formattedResult: 'Error processing log entry',
          timestamp: new Date().toISOString(),
          status: 'error'
        };
      }
    });
  }, [structuredLogs, extractNodeName, extractNodeId, formatResult]);

  // Enhanced log styling
  const getLogStyle = useCallback((text) => {
    if (!text) return { bg: 'bg-gray-50', border: 'border-gray-200', emoji: '📄', textColor: 'text-gray-600' };
    
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('executing') || lowerText.includes('started')) {
      return {
        bg: 'bg-blue-50/80',
        border: 'border-blue-200',
        emoji: '⚡',
        textColor: 'text-blue-700'
      };
    } else if (lowerText.includes('completed') || lowerText.includes('success')) {
      return {
        bg: 'bg-green-50/80',
        border: 'border-green-200',
        emoji: '✅',
        textColor: 'text-green-700'
      };
    } else if (lowerText.includes('error') || lowerText.includes('failed')) {
      return {
        bg: 'bg-red-50/80',
        border: 'border-red-200',
        emoji: '❌',
        textColor: 'text-red-700'
      };
    } else if (lowerText.includes('agent')) {
      return {
        bg: 'bg-purple-50/80',
        border: 'border-purple-200',
        emoji: '🤖',
        textColor: 'text-purple-700'
      };
    }
    
    return {
      bg: 'bg-gray-50/80',
      border: 'border-gray-200',
      emoji: '📄',
      textColor: 'text-gray-600'
    };
  }, []);

  // Enhanced card styling with error handling
  const getCardStyle = useCallback((status, type) => {
    try {
      const baseStyle = "relative overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1";
      
      switch (status) {
        case 'started':
          return `${baseStyle} bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 shadow-blue-100/50`;
        case 'completed':
          return `${baseStyle} bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 shadow-green-100/50`;
        case 'error':
          return `${baseStyle} bg-gradient-to-br from-red-50 to-rose-100 border-red-200 shadow-red-100/50`;
        case 'warning':
          return `${baseStyle} bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-200 shadow-yellow-100/50`;
        default:
          return `${baseStyle} bg-gradient-to-br from-gray-50 to-slate-100 border-gray-200 shadow-gray-100/50`;
      }
    } catch (error) {
      console.error('Error getting card style:', error);
      return "p-4 bg-white border border-gray-200 rounded-lg";
    }
  }, []);

  // Status icon helper
  const getStatusIcon = useCallback((status) => {
    const iconMap = {
      'started': '🚀',
      'completed': '✅',
      'error': '❌',
      'warning': '⚠️',
      'running': '⏳'
    };
    return iconMap[status] || '📦';
  }, []);

  return {
    // Processed data
    parsedTextLogs,
    processedStructuredLogs,
    
    // Helper functions
    extractNodeName,
    extractNodeId,
    formatResult,
    getLogStyle,
    getCardStyle,
    getStatusIcon,
    getLogType,
    getLogEmoji,
    
    // Utilities
    parseTextLogs
  };
};