// components/rich-content/content-detection/ContentExtractor.js
import { detectContentType, isMarkdownContent, CONTENT_TYPES } from './ContentDetector';

/**
 * Extract the actual displayable content from nested structures
 * Prioritizes meaningful content over metadata
 */
export const extractDisplayContent = (content) => {
  try {
    // Handle null/undefined
    if (!content && content !== 0 && content !== false) {
      return { type: CONTENT_TYPES.TEXT, content: 'No content available' };
    }
    
    // Handle simple strings - prioritize these
    if (typeof content === 'string') {
      const trimmed = content.trim();
      if (!trimmed) return { type: CONTENT_TYPES.TEXT, content: 'Empty content' };
      
      // Detect content type for strings
      const contentType = detectContentType(trimmed);
      return { type: contentType, content: trimmed };
    }
    
    // Handle arrays - look for string content first
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
    
    // Handle objects - this is where we need to be thorough but efficient
    if (typeof content === 'object' && content !== null) {
      // Check if it has a specific type property
      if (content.type && Object.values(CONTENT_TYPES).includes(content.type)) {
        return { type: content.type, content };
      }
      
      // Look for common content patterns in objects - prioritize meaningful fields
      const meaningfulContentKeys = [
        'result', 'output', 'response', 'text_output', 'content', 'data', 'text', 'message', 'body'
      ];
      
      for (const key of meaningfulContentKeys) {
        if (content[key] !== undefined && content[key] !== null) {
          const extractedContent = content[key];
          
          // If it's a string with meaningful content
          if (typeof extractedContent === 'string' && extractedContent.trim()) {
            const trimmed = extractedContent.trim();
            const contentType = detectContentType(trimmed);
            return { type: contentType, content: trimmed };
          }
          
          // If it's a number or boolean, treat as text
          if (typeof extractedContent === 'number' || typeof extractedContent === 'boolean') {
            return { type: CONTENT_TYPES.TEXT, content: String(extractedContent) };
          }
          
          // For result/output fields, if it's an object with text content, extract it
          if (typeof extractedContent === 'object' && (key === 'result' || key === 'output' || key === 'response')) {
            // Look for text content within the result object
            const textKeys = ['text', 'output', 'content', 'message', 'result', 'data'];
            for (const textKey of textKeys) {
              if (extractedContent[textKey] && typeof extractedContent[textKey] === 'string') {
                const textContent = extractedContent[textKey].trim();
                if (textContent) {
                  const contentType = detectContentType(textContent);
                  return { type: contentType, content: textContent };
                }
              }
            }
            
            // If no text content found, recurse
            return extractDisplayContent(extractedContent);
          }
          
          // If it's an object or array, recurse once
          if (typeof extractedContent === 'object') {
            return extractDisplayContent(extractedContent);
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
      
      // For objects without clear content fields, create a summary
      const keys = Object.keys(content);
      
      // Filter out technical/React keys
      const meaningfulKeys = keys.filter(key => 
        !key.startsWith('_') && 
        !key.startsWith('$$') && 
        !['ref', 'key', 'timestamp', 'node_id', 'metadata'].includes(key)
      );
      
      if (meaningfulKeys.length === 0) {
        return { type: CONTENT_TYPES.TEXT, content: 'Empty object' };
      }
      
      // If there's only one meaningful key, extract its value
      if (meaningfulKeys.length === 1) {
        const key = meaningfulKeys[0];
        const value = content[key];
        
        if (typeof value === 'string' && value.trim()) {
          const contentType = detectContentType(value);
          return { type: contentType, content: value };
        }
        
        if (typeof value === 'object' && value !== null) {
          return extractDisplayContent(value);
        }
      }
      
      // Create a formatted summary for objects with multiple keys
      const summary = meaningfulKeys
        .slice(0, 5) // Limit to first 5 keys to avoid overwhelming output
        .map(key => {
          const value = content[key];
          let formattedValue;
          
          if (typeof value === 'string') {
            formattedValue = value.length > 100 ? `${value.substring(0, 100)}...` : value;
          } else if (typeof value === 'number' || typeof value === 'boolean') {
            formattedValue = String(value);
          } else if (Array.isArray(value)) {
            formattedValue = `Array with ${value.length} items`;
          } else if (typeof value === 'object' && value !== null) {
            formattedValue = `Object with ${Object.keys(value).length} properties`;
          } else {
            formattedValue = String(value);
          }
          
          return `**${key}:** ${formattedValue}`;
        })
        .join('\n');
      
      // Check if this looks like a result object with primarily text content
      const hasTextualContent = meaningfulKeys.some(key => {
        const value = content[key];
        return typeof value === 'string' && value.length > 50;
      });
      
      // If the summary is simple enough and has textual content, use markdown
      // Otherwise, use JSON for complex objects
      const isComplexObject = meaningfulKeys.length > 3 || 
                             meaningfulKeys.some(key => typeof content[key] === 'object' && content[key] !== null);
      
      if (hasTextualContent && !isComplexObject) {
        return { type: CONTENT_TYPES.MARKDOWN, content: summary };
      } else if (isComplexObject) {
        return { type: CONTENT_TYPES.JSON, content: content };
      }
      
      return { type: CONTENT_TYPES.MARKDOWN, content: summary };
    }
    
    // Handle primitives (numbers, booleans, etc.)
    return { type: CONTENT_TYPES.TEXT, content: String(content) };
    
  } catch (error) {
    console.error('Error extracting display content:', error);
    return { 
      type: CONTENT_TYPES.ERROR, 
      content: `Error processing content: ${error.message}` 
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