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
 * Detect content type based on content analysis
 */
export const detectContentType = (content) => {
  if (!content && content !== 0 && content !== false) {
    return CONTENT_TYPES.TEXT;
  }

  // Handle strings
  if (typeof content === 'string') {
    const trimmed = content.trim();
    
    // Check for HTML first (more specific)
    if (isHtmlContent(trimmed)) {
      return CONTENT_TYPES.HTML;
    }
    
    // Check for JSON (be more strict)
    if (isJsonContent(trimmed)) {
      return CONTENT_TYPES.JSON;
    }
    
    // Check for Markdown
    if (isMarkdownContent(trimmed)) {
      return CONTENT_TYPES.MARKDOWN;
    }
    
    // Check for code
    if (isCodeContent(trimmed)) {
      return CONTENT_TYPES.CODE;
    }
    
    // Check for base64 images
    if (isBase64Image(trimmed)) {
      return CONTENT_TYPES.IMAGE;
    }
    
    // Check for URLs pointing to media
    if (isMediaUrl(trimmed)) {
      if (trimmed.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        return CONTENT_TYPES.IMAGE;
      }
      if (trimmed.match(/\.(mp4|webm|ogg|avi|mov)$/i)) {
        return CONTENT_TYPES.VIDEO;
      }
      if (trimmed.match(/\.(mp3|wav|ogg|m4a|flac)$/i)) {
        return CONTENT_TYPES.AUDIO;
      }
    }
    
    return CONTENT_TYPES.TEXT;
  }
  
  // Handle arrays - these are always JSON for display purposes
  if (Array.isArray(content)) {
    // Check if it's table-like data
    if (content.length > 0 && typeof content[0] === 'object' && content[0] !== null) {
      const firstItem = content[0];
      if (typeof firstItem === 'object' && !Array.isArray(firstItem)) {
        return CONTENT_TYPES.TABLE;
      }
    }
    return CONTENT_TYPES.JSON;
  }
  
  // Handle objects - these are always JSON for display purposes
  if (typeof content === 'object' && content !== null) {
    // Check for chart data
    if (content.labels && content.datasets) {
      return CONTENT_TYPES.CHART;
    }
    
    // Check for table data
    if (content.headers && content.rows) {
      return CONTENT_TYPES.TABLE;
    }
    
    // Check for error objects
    if (content.error || (content.message && content.stack)) {
      return CONTENT_TYPES.ERROR;
    }
    
    // Check for media objects
    if (content.type) {
      if (content.type.startsWith('image/')) return CONTENT_TYPES.IMAGE;
      if (content.type.startsWith('video/')) return CONTENT_TYPES.VIDEO;
      if (content.type.startsWith('audio/')) return CONTENT_TYPES.AUDIO;
    }
    
    return CONTENT_TYPES.JSON;
  }
  
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
    /\*.*\*/,                   // Italic
    /\[.*\]\(.*\)/,             // Links
    /^[-*+]\s+/m,               // Lists
    /^>\s+/m,                   // Blockquotes
    /`.*`/,                     // Inline code
    /^```[\s\S]*```$/m,         // Code blocks
    /^\|.*\|.*$/m,              // Tables
  ];
  
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
