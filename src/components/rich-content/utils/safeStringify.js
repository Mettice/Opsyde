// components/rich-content/utils/safeStringify.js

/**
 * Safe JSON stringify function to handle circular references and React elements
 * @param {any} obj - Object to stringify
 * @param {number} indent - Indentation spaces
 * @returns {string} - Safely stringified JSON
 */
export const safeStringify = (obj, indent = 2) => {
    const seen = new WeakSet();
    
    try {
      return JSON.stringify(obj, (key, value) => {
        // Skip React-specific properties but be more selective
        if (key.startsWith('__react') || key.startsWith('__webpack')) {
          return undefined;
        }
        
        // Skip specific problematic keys but keep more data
        if (['$$typeof', '_owner', '_store', 'ref', 'key'].includes(key)) {
          return undefined;
        }
        
        // Handle DOM elements
        if (value instanceof Element || value instanceof Node) {
          return `[DOM Element: ${value.tagName || value.nodeName}]`;
        }
        
        // Be more selective with React elements - only filter actual React components
        if (value && value.$$typeof && typeof value.$$typeof === 'symbol') {
          return '[React Component]';
        }
        
        // Handle functions
        if (typeof value === 'function') {
          return `[Function: ${value.name || 'anonymous'}]`;
        }
        
        // Handle circular references
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        
        return value;
      }, indent);
    } catch (error) {
      console.warn('Error in safeStringify:', error);
      
      // Try a simpler approach if JSON.stringify fails
      if (typeof obj === 'string') {
        return obj;
      }
      
      if (typeof obj === 'object' && obj !== null) {
        try {
          return Object.prototype.toString.call(obj);
        } catch {
          return '[Object]';
        }
      }
      
      return String(obj);
    }
  };
  
  /**
   * Pretty print JSON with syntax highlighting classes
   * @param {any} obj - Object to highlight
   * @returns {string} - HTML string with highlighted syntax
   */
  export const syntaxHighlight = (obj) => {
    let json = typeof obj === 'string' ? obj : safeStringify(obj, 2);
    
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|\d+)/g,
      (match) => {
        let cls = 'text-gray-600';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'text-purple-600 font-medium'; // JSON keys
          } else {
            cls = 'text-green-600'; // JSON string values
          }
        } else if (/true|false/.test(match)) {
          cls = 'text-blue-600 font-medium'; // Booleans
        } else if (/null/.test(match)) {
          cls = 'text-red-600 font-medium'; // Null
        } else if (!isNaN(match)) {
          cls = 'text-orange-600 font-medium'; // Numbers
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  };