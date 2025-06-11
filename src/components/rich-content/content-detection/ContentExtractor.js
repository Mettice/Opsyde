// components/rich-content/content-detection/ContentExtractor.js
import { detectContentType, isMarkdownContent, CONTENT_TYPES } from './ContentDetector';

/**
 * Deep search for text content in nested objects with enhanced path tracking
 */
const deepSearchForText = (obj, maxDepth = 4, currentDepth = 0, visited = new WeakSet()) => {
  if (currentDepth >= maxDepth || !obj || typeof obj !== 'object' || visited.has(obj)) {
    return null;
  }
  
  visited.add(obj);
  
  // PRIORITY: Check for success/output structure first
  if (obj.success !== undefined && obj.output && typeof obj.output === 'string') {
    const text = obj.output.trim();
    if (text.length > 10) {
      return text;
    }
  }
  
  // Priority text keys - order matters, 'output' is now first
  const textKeys = [
    'output', 'text_output', 'result', 'text', 'content', 'message', 
    'data', 'body', 'value', 'response', 'answer', 'summary'
  ];
  
  // Look for text content at current level
  for (const key of textKeys) {
    if (obj[key] && typeof obj[key] === 'string') {
      const text = obj[key].trim();
      if (text.length > 10) { // Lowered threshold for better detection
        return text;
      }
    }
  }
  
  // Special handling for inputs structure (inputs.agent-xxx.output)
  if (obj.inputs && typeof obj.inputs === 'object') {
    for (const inputKey of Object.keys(obj.inputs)) {
      const inputValue = obj.inputs[inputKey];
      if (inputValue && typeof inputValue === 'object') {
        for (const outputKey of textKeys) {
          if (inputValue[outputKey] && typeof inputValue[outputKey] === 'string') {
            const text = inputValue[outputKey].trim();
            if (text.length > 10) {
              return text;
            }
          }
        }
      }
    }
  }
  
  // Search in nested objects - prioritize meaningful keys
  const priorityKeys = ['result', 'output', 'data', 'value', 'response', 'content'];
  const allKeys = Object.keys(obj);
  const sortedKeys = [
    ...priorityKeys.filter(key => allKeys.includes(key)),
    ...allKeys.filter(key => !priorityKeys.includes(key))
  ];
  
  for (const key of sortedKeys) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !visited.has(obj[key])) {
      const found = deepSearchForText(obj[key], maxDepth, currentDepth + 1, visited);
      if (found) return found;
    }
  }
  
  return null;
};

/**
 * Enhanced content extraction with better error handling and structure detection
 * Now supports the standardized result format: { success, data, error, metadata }
 */
export const extractDisplayContent = (content) => {
  try {
    // Handle null/undefined
    if (!content && content !== 0 && content !== false) {
      return { type: CONTENT_TYPES.TEXT, content: 'No content available' };
    }
    
    // 🚀 NEW: Handle standardized result format first
    if (typeof content === 'object' && content !== null && content.hasOwnProperty('success')) {
      // This is our new standardized format: { success, data, error, metadata }
      const { success, data, error, metadata } = content;
      
      if (!success) {
        // Handle error cases with proper error display
        return {
          type: CONTENT_TYPES.ERROR,
          content: {
            error: error || 'Node execution failed',
            metadata: metadata || {},
            originalContent: content
          }
        };
      }
      
      // Success case - extract from data field
      if (data !== undefined && data !== null) {
        // Recursively extract from the data field
        const extractedData = extractDisplayContent(data);
        
        // Enhance with metadata if available
        if (extractedData && metadata) {
          extractedData.metadata = {
            ...extractedData.metadata,
            ...metadata,
            standardized: true
          };
        }
        
        return extractedData;
      }
      
      // Fallback if no data but success=true
      return {
        type: CONTENT_TYPES.TEXT,
        content: 'Operation completed successfully',
        metadata: { ...metadata, standardized: true }
      };
    }
    
    // Handle simple strings - prioritize these
    if (typeof content === 'string') {
      const trimmed = content.trim();
      if (!trimmed) return { type: CONTENT_TYPES.TEXT, content: 'Empty content' };
      
      // Detect content type for strings
      const contentType = detectContentType(trimmed);
      return { type: contentType, content: trimmed };
    }
    
    // Handle primitives
    if (typeof content === 'number' || typeof content === 'boolean') {
      return { type: CONTENT_TYPES.TEXT, content: String(content) };
    }
    
    // Handle arrays
    if (Array.isArray(content)) {
      // If it's an array of strings, join them
      if (content.every(item => typeof item === 'string')) {
        const joined = content.join('\n');
        const contentType = detectContentType(joined);
        return { type: contentType, content: joined };
      }
      
      // Check if it's table-like data
      if (content.length > 0 && typeof content[0] === 'object' && content[0] !== null) {
        return { type: CONTENT_TYPES.TABLE, content: content };
      }
      
      // Otherwise return as JSON
      return { type: CONTENT_TYPES.JSON, content: content };
    }
    
    // Handle objects - enhanced logic
    if (typeof content === 'object' && content !== null) {
      // Check if it has a specific type property
      if (content.type && Object.values(CONTENT_TYPES).includes(content.type)) {
        return { type: content.type, content };
      }
      
      // 🔧 Enhanced: Handle legacy result objects with better priority
      const resultKeys = ['result', 'output', 'data'];
      for (const key of resultKeys) {
        if (content[key] !== undefined && content[key] !== null) {
          const extractedContent = content[key];
          
          // Handle string content
          if (typeof extractedContent === 'string') {
            const trimmed = extractedContent.trim();
            if (trimmed) {
              const contentType = detectContentType(trimmed);
              return { 
                type: contentType, 
                content: trimmed,
                metadata: { source_field: key, legacy_format: true }
              };
            }
          }
          
          // Handle primitives
          if (typeof extractedContent === 'number' || typeof extractedContent === 'boolean') {
            return { 
              type: CONTENT_TYPES.TEXT, 
              content: String(extractedContent),
              metadata: { source_field: key, legacy_format: true }
            };
          }
          
          // Handle nested objects/arrays
          if (typeof extractedContent === 'object') {
            const nestedResult = extractDisplayContent(extractedContent);
            if (nestedResult.type !== CONTENT_TYPES.JSON || 
                (nestedResult.content && typeof nestedResult.content === 'string')) {
              // Enhance with source metadata
              nestedResult.metadata = {
                ...nestedResult.metadata,
                source_field: key,
                legacy_format: true
              };
              return nestedResult;
            }
          }
        }
      }
      
      // Enhanced meaningful content extraction with better priority
      const meaningfulContentKeys = [
        'text_output', 'response', 'text', 'message', 'body', 'value', 'answer', 'summary', 'content'
      ];
      
      for (const key of meaningfulContentKeys) {
        if (content[key] !== undefined && content[key] !== null) {
          const extractedContent = content[key];
          
          // Handle string content
          if (typeof extractedContent === 'string') {
            const trimmed = extractedContent.trim();
            if (trimmed) {
              const contentType = detectContentType(trimmed);
              return { 
                type: contentType, 
                content: trimmed,
                metadata: { source_field: key }
              };
            }
          }
          
          // Handle primitives
          if (typeof extractedContent === 'number' || typeof extractedContent === 'boolean') {
            return { 
              type: CONTENT_TYPES.TEXT, 
              content: String(extractedContent),
              metadata: { source_field: key }
            };
          }
          
          // Handle nested objects/arrays
          if (typeof extractedContent === 'object') {
            // Try to extract from nested structure
            const nestedResult = extractDisplayContent(extractedContent);
            if (nestedResult.type !== CONTENT_TYPES.JSON || 
                (nestedResult.content && typeof nestedResult.content === 'string')) {
              nestedResult.metadata = {
                ...nestedResult.metadata,
                source_field: key
              };
              return nestedResult;
            }
          }
        }
      }
      
      // Check for specific structured content types
      if (content.labels && content.datasets) {
        return { type: CONTENT_TYPES.CHART, content };
      }
      
      if (content.headers && content.rows) {
        return { type: CONTENT_TYPES.TABLE, content };
      }
      
      if (content.error || (content.message && content.stack)) {
        return { type: CONTENT_TYPES.ERROR, content };
      }
      
      // Enhanced deep search for text content
      const deepText = deepSearchForText(content);
      if (deepText && deepText.length > 20) {
        const contentType = detectContentType(deepText);
        return { 
          type: contentType, 
          content: deepText,
          metadata: { source: 'deep_search' }
        };
      }
      
      // Create intelligent object summary
      const keys = Object.keys(content);
      const meaningfulKeys = keys.filter(key => 
        !key.startsWith('_') && 
        !key.startsWith('$$') && 
        !['ref', 'key', 'timestamp', 'node_id', 'metadata', 'id'].includes(key)
      );
      
      if (meaningfulKeys.length === 0) {
        return { type: CONTENT_TYPES.TEXT, content: 'Empty object' };
      }
      
      // Single meaningful key - extract its value
      if (meaningfulKeys.length === 1) {
        const key = meaningfulKeys[0];
        const value = content[key];
        
        if (typeof value === 'string' && value.trim()) {
          const contentType = detectContentType(value);
          return { 
            type: contentType, 
            content: value,
            metadata: { single_key: key }
          };
        }
        
        if (typeof value === 'object' && value !== null) {
          const extracted = extractDisplayContent(value);
          extracted.metadata = {
            ...extracted.metadata,
            single_key: key
          };
          return extracted;
        }
        
        return { 
          type: CONTENT_TYPES.TEXT, 
          content: `${key}: ${String(value)}`,
          metadata: { single_key: key }
        };
      }
      
      // Multiple keys - create formatted summary for simple objects
      if (meaningfulKeys.length <= 5 && meaningfulKeys.every(key => {
        const value = content[key];
        return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
      })) {
        const summary = meaningfulKeys.map(key => `**${key}**: ${content[key]}`).join('\n\n');
        return { 
          type: CONTENT_TYPES.MARKDOWN, 
          content: summary,
          metadata: { summary_type: 'simple_object', key_count: meaningfulKeys.length }
        };
      }
      
      // For complex objects, return as JSON with metadata about complexity
      return { 
        type: CONTENT_TYPES.JSON, 
        content: content,
        metadata: { 
          object_complexity: 'complex',
          key_count: meaningfulKeys.length,
          total_keys: keys.length
        }
      };
    }
    
    return { type: CONTENT_TYPES.TEXT, content: String(content) };
  } catch (error) {
    console.error('Error in extractDisplayContent:', error);
    return { 
      type: CONTENT_TYPES.ERROR, 
      content: {
        error: `Error processing content: ${error.message}`,
        originalContent: content,
        stack: error.stack
      }
    };
  }
};

/**
 * Classify content as system metadata vs meaningful results
 */
export const classifyContent = (content, metadata = {}) => {
  // Check metadata first
  if (metadata.isSystemLog || metadata.isMetadata) {
    return 'system';
  }
  
  // Check for execution-related metadata patterns
  if (metadata.node_id && !content) return 'system';
  if (metadata.timestamp && !content) return 'system';
  if (metadata.status && typeof content === 'string' && content.length < 50) return 'system';
  
  // Check content patterns
  if (typeof content === 'string') {
    const systemPatterns = [
      /^(executing|completed|started|finished|processing)/i,
      /node.*processed/i,
      /^error:/i,
      /^warning:/i,
      /^info:/i,
      /timestamp/i,
      /^debug:/i
    ];
    
    if (systemPatterns.some(pattern => pattern.test(content.trim()))) {
      return 'system';
    }
  }
  
  // Check for meaningful content
  const extracted = extractDisplayContent(content);
  const meaningfulTypes = [
    CONTENT_TYPES.TABLE,
    CONTENT_TYPES.CHART,
    CONTENT_TYPES.IMAGE,
    CONTENT_TYPES.CODE
  ];
  
  if (meaningfulTypes.includes(extracted.type)) {
    return 'result';
  }
  
  // For text content, check if it's substantial
  if (extracted.type === CONTENT_TYPES.TEXT || extracted.type === CONTENT_TYPES.MARKDOWN) {
    const textContent = typeof extracted.content === 'string' ? extracted.content : String(extracted.content);
    return textContent.length > 100 ? 'result' : 'system';
  }
  
  // Default to result for JSON content (likely API responses, etc.)
  if (extracted.type === CONTENT_TYPES.JSON) {
    return 'result';
  }
  
  return 'system';
};

/**
 * Get a preview/summary of content for display in lists
 */
export const getContentPreview = (content, maxLength = 100) => {
  const extracted = extractDisplayContent(content);
  
  if (!extracted.content) return 'No content';
  
  let preview;
  
  switch (extracted.type) {
    case CONTENT_TYPES.TABLE:
      const tableData = Array.isArray(extracted.content) ? extracted.content : [];
      preview = `Table with ${tableData.length} rows`;
      break;
      
    case CONTENT_TYPES.CHART:
      preview = 'Chart data';
      break;
      
    case CONTENT_TYPES.IMAGE:
      preview = 'Image content';
      break;
      
    case CONTENT_TYPES.CODE:
      preview = 'Code snippet';
      break;
      
    case CONTENT_TYPES.JSON:
      preview = 'JSON data';
      break;
      
    case CONTENT_TYPES.ERROR:
      preview = 'Error information';
      break;
      
    default:
      const textContent = typeof extracted.content === 'string' 
        ? extracted.content 
        : String(extracted.content);
      preview = textContent.length > maxLength 
        ? `${textContent.substring(0, maxLength)}...`
        : textContent;
  }
  
  return preview;
};

/**
 * Extract meaningful content from various data structures
 */
export const extractContent = (data, options = {}) => {
  const { maxDepth = 5, preferText = true } = options;
  
  if (!data) return { content: '', type: 'text' };
  
  // Handle primitive types
  if (typeof data === 'string') {
    return { content: data.trim(), type: 'text' };
  }
  
  if (typeof data === 'number' || typeof data === 'boolean') {
    return { content: String(data), type: 'text' };
  }
  
  // Handle arrays
  if (Array.isArray(data)) {
    return { content: data, type: 'json' };
  }
  
  // Handle objects
  if (typeof data === 'object' && data !== null) {
    // Check for error objects first
    if (data.error || (data.message && data.stack)) {
      return { 
        content: data.error || data.message || 'Unknown error', 
        type: 'error',
        metadata: data
      };
    }
    
    // Look for meaningful content in common keys
    const meaningfulKeys = ['content', 'text', 'message', 'output', 'result', 'data', 'value', 'body'];
    
    for (const key of meaningfulKeys) {
      if (data[key] !== undefined && data[key] !== null) {
        const extracted = extractContent(data[key], { ...options, maxDepth: maxDepth - 1 });
        if (extracted.content && String(extracted.content).trim().length > 0) {
          return {
            ...extracted,
            metadata: { ...extracted.metadata, originalKey: key, parentObject: data }
          };
        }
      }
    }
    
    // Try deep search for text content if preferText is true
    if (preferText && maxDepth > 0) {
      const deepText = deepSearchForText(data, maxDepth);
      if (deepText && deepText.length > 20) {
        // Detect content type for the found text
        const contentType = detectContentType(deepText);
        return { 
          content: deepText, 
          type: contentType,
          metadata: { extractedFromDeep: true, originalObject: data }
        };
      }
    }
    
    // For objects without clear content fields, return as JSON
    // But first check if it's a simple object that could be summarized
    const keys = Object.keys(data);
    if (keys.length <= 5 && keys.every(key => 
      typeof data[key] === 'string' || 
      typeof data[key] === 'number' || 
      typeof data[key] === 'boolean'
    )) {
      // Create a readable summary for simple objects
      const summary = keys.map(key => `**${key}**: ${data[key]}`).join('\n');
      return { 
        content: summary, 
        type: 'markdown',
        metadata: { isObjectSummary: true, originalObject: data }
      };
    }
    
    // For complex objects, return as JSON
    return { 
      content: data, 
      type: 'json',
      metadata: { isComplexObject: true }
    };
  }
  
  return { content: String(data), type: 'text' };
};