// components/rich-content/content-detection/ContentDetector.js

// Content type constants
export const CONTENT_TYPES = {
  TEXT: 'text',
  MARKDOWN: 'markdown',
  JSON: 'json',
  HTML: 'html',
  CODE: 'code',
  TABLE: 'table',
  CHART: 'chart',
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  FILE: 'file',
  EMBED: 'embed',
  ERROR: 'error'
};

/**
 * Enhanced content type detection with support for standardized result format
 */
export const detectContentType = (content) => {
  // Handle null/undefined
  if (!content && content !== 0 && content !== false) {
    return CONTENT_TYPES.TEXT;
  }

  // 🚀 NEW: Handle standardized result format first
  if (typeof content === 'object' && content !== null) {
    // Detect standardized format: { success, data, error, metadata }
    if (content.hasOwnProperty('success')) {
      if (content.success === false) {
        return CONTENT_TYPES.ERROR;
      } else if (content.data !== undefined) {
        // Recursively detect the type of the data field
        return detectContentType(content.data);
      } else {
        return CONTENT_TYPES.TEXT; // Success with no data
      }
    }
    
    // Handle specific structured types first
    if (content.type && Object.values(CONTENT_TYPES).includes(content.type)) {
      return content.type;
    }
    
    // Check for error objects
    if (content.error || content.type === 'error') {
      return CONTENT_TYPES.ERROR;
    }
    
    // Check for chart data
    if (content.type === 'chart' || content.chartType || 
        (content.data && (content.labels || content.datasets))) {
      return CONTENT_TYPES.CHART;
    }
    
    // Check for table data
    if (content.headers && content.rows) {
      return CONTENT_TYPES.TABLE;
    }
    
    // Check for image data  
    if (content.type === 'image' || 
        (content.data && typeof content.data === 'string' && isBase64Image(content.data))) {
      return CONTENT_TYPES.IMAGE;
    }
    
    // Check for file data
    if (content.filename || content.file || content.type === 'file') {
      return CONTENT_TYPES.FILE;
    }
    
    // Check for label/value pairs
    if (content.label && content.value !== undefined) {
      return 'label_value_pair'; // Custom type for input/output pairs
    }
    
    // For objects, return JSON to let the renderer handle the structure
    return CONTENT_TYPES.JSON;
  }

  // Handle strings
  if (typeof content === 'string') {
    const trimmed = content.trim();
    
    if (!trimmed) {
      return CONTENT_TYPES.TEXT;
    }
    
    // Check for code
    if (isCodeContent(trimmed)) {
      return CONTENT_TYPES.CODE;
    }
    
    // Check for markdown
    if (isMarkdownContent(trimmed)) {
      return CONTENT_TYPES.MARKDOWN;
    }
    
    // Check for HTML
    if (isHtmlContent(trimmed)) {
      return CONTENT_TYPES.HTML;
    }
    
    // Check for JSON string
    if (isJsonContent(trimmed)) {
      return CONTENT_TYPES.JSON;
    }
    
    // Default to text
    return CONTENT_TYPES.TEXT;
  }

  // Handle arrays
  if (Array.isArray(content)) {
    if (content.length === 0) {
      return CONTENT_TYPES.TEXT;
    }
    
    // If all items are objects with similar structure, might be table data
    if (content.every(item => typeof item === 'object' && item !== null)) {
      return CONTENT_TYPES.TABLE;
    }
    
    // If all items are strings, treat as text list
    if (content.every(item => typeof item === 'string')) {
      return CONTENT_TYPES.TEXT;
    }
    
    // Mixed array, treat as JSON
    return CONTENT_TYPES.JSON;
  }

  // Handle primitives
  if (typeof content === 'number' || typeof content === 'boolean') {
    return CONTENT_TYPES.TEXT;
  }

  // Fallback
  return CONTENT_TYPES.TEXT;
};

/**
 * Check if content is HTML
 */
const isHtmlContent = (str) => {
  if (typeof str !== 'string') return false;
  const htmlPattern = /<[^>]+>/;
  return htmlPattern.test(str) && str.includes('<') && str.includes('>');
};

/**
 * Check if content is Markdown
 */
export const isMarkdownContent = (str) => {
  if (typeof str !== 'string') return false;
  
  const markdownPatterns = [
    /^#{1,6}\s+.+$/m,           // Headers
    /\*\*.*\*\*/,               // Bold
    /\*.*\*/,                   // Italic (but not bullet points)
    /\[.*\]\(.*\)/,             // Links
    /^[-*+]\s+/m,               // Lists
    /^>\s+/m,                   // Blockquotes
    /`.*`/,                     // Inline code
    /^```[\s\S]*```$/m,         // Code blocks
    /^\|.*\|.*$/m,              // Tables
    /^\d+\.\s+\*\*.*\*\*/m,     // Numbered lists with bold (like "1. **Cost Efficiency**:")
    /^\d+\.\s+.+:/m,            // Numbered lists with colons
    /\*\*[^*]+\*\*:/,           // Bold text followed by colon (like "**Cost Efficiency**:")
  ];
  
  // Check for multiple markdown indicators
  const matchCount = markdownPatterns.filter(pattern => pattern.test(str)).length;
  
  // If we have multiple markdown patterns or specific structured content, it's likely markdown
  if (matchCount >= 2) return true;
  
  // Special case: if it has numbered lists with bold text, it's probably markdown
  if (/^\d+\.\s+\*\*.*\*\*/.test(str)) return true;
  
  // Special case: if it has multiple bold sections, it's probably markdown
  const boldMatches = str.match(/\*\*.*?\*\*/g);
  if (boldMatches && boldMatches.length >= 2) return true;
  
  return markdownPatterns.some(pattern => pattern.test(str));
};

/**
 * Check if content is JSON
 */
const isJsonContent = (str) => {
  if (typeof str !== 'string') return false;
  
  const trimmed = str.trim();
  
  // Must start and end with JSON delimiters
  if (!((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
        (trimmed.startsWith('[') && trimmed.endsWith(']')))) {
    return false;
  }
  
  // Must be at least a minimal JSON object/array
  if (trimmed.length < 2) return false;
  
  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    return false;
  }
};

/**
 * Check if content is code
 */
const isCodeContent = (str) => {
  if (typeof str !== 'string') return false;
  
  const codePatterns = [
    /function\s+\w+\s*\(/,      // Function declarations
    /const\s+\w+\s*=/,          // Const declarations
    /let\s+\w+\s*=/,            // Let declarations
    /var\s+\w+\s*=/,            // Var declarations
    /import\s+.*from/,          // Import statements
    /export\s+(default\s+)?/,   // Export statements
    /class\s+\w+/,              // Class declarations
    /if\s*\([^)]*\)\s*{/,       // If statements
    /for\s*\([^)]*\)\s*{/,      // For loops
    /while\s*\([^)]*\)\s*{/,    // While loops
    /\w+\s*:\s*\w+/,            // Type annotations
    /<\w+.*>/,                  // HTML/XML tags
    /^\s*\/\//m,                // Comments
    /^\s*\/\*/m,                // Block comments
  ];
  
  return codePatterns.some(pattern => pattern.test(str));
};

/**
 * Check if content is a base64 image
 */
const isBase64Image = (str) => {
  if (typeof str !== 'string') return false;
  return str.startsWith('data:image/') && str.includes('base64,');
};

/**
 * Check if content is a media URL
 */
const isMediaUrl = (str) => {
  if (typeof str !== 'string') return false;
  try {
    new URL(str);
    return str.match(/\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|ogg|avi|mov|mp3|wav|m4a|flac)$/i);
  } catch {
    return false;
  }
};

/**
 * Determine if AI insights should be shown for the given content
 */
export const shouldShowAIInsights = (content, contentType, metadata = {}) => {
  // Don't show insights for system/metadata content
  if (metadata.isSystemLog || metadata.isMetadata) {
    return false;
  }
  
  // Don't show insights for simple text content that's too short
  if (contentType === CONTENT_TYPES.TEXT && typeof content === 'string' && content.length < 50) {
    return false;
  }
  
  // Show insights for meaningful content types
  const meaningfulTypes = [
    CONTENT_TYPES.TABLE,
    CONTENT_TYPES.CHART,
    CONTENT_TYPES.JSON,
    CONTENT_TYPES.MARKDOWN,
    CONTENT_TYPES.CODE
  ];
  
  if (meaningfulTypes.includes(contentType)) {
    return true;
  }
  
  // Show insights for substantial text content
  if (contentType === CONTENT_TYPES.TEXT && typeof content === 'string' && content.length > 100) {
    return true;
  }
  
  return false;
};
