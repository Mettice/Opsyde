/**
 * Find all nodes and edges connected to a starting node
 */
export const findConnectedComponents = (startNodeId, nodes, edges) => {
  // Set to track visited nodes
  const visited = new Set();
  
  // Function to traverse the graph
  const traverse = (nodeId) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    // Find all edges where this node is the source
    const outgoingEdges = edges.filter(edge => edge.source === nodeId);
    
    // For each outgoing edge, traverse to the target node
    outgoingEdges.forEach(edge => {
      traverse(edge.target);
    });
  };
  
  // Start traversal from the given node
  traverse(startNodeId);
  
  // Get all nodes and edges in the connected component
  const connectedNodes = nodes.filter(node => visited.has(node.id));
  const connectedEdges = edges.filter(edge => 
    visited.has(edge.source) && visited.has(edge.target)
  );
  
  return {
    nodes: connectedNodes,
    edges: connectedEdges
  };
};

/**
 * Find all nodes connected to a starting node
 */
export const findConnectedNodes = (startNodeId, nodes, edges) => {
  const { nodes: connectedNodes } = findConnectedComponents(startNodeId, nodes, edges);
  return connectedNodes;
};

/**
 * Find all edges connected to a starting node
 */
export const findConnectedEdges = (startNodeId, nodes, edges) => {
  const { edges: connectedEdges } = findConnectedComponents(startNodeId, nodes, edges);
  return connectedEdges;
};

/**
 * Get a safe position for a new node that doesn't overlap with existing nodes
 */
export const getSafeNodePosition = (nodes, startX = 100, startY = 100, gridSize = 200) => {
  if (!nodes || nodes.length === 0) {
    return { x: startX, y: startY };
  }
  
  // Find the rightmost node
  const rightmostNode = nodes.reduce((max, node) => 
    node.position.x > max.position.x ? node : max, nodes[0]);
  
  // Position the new node to the right of the rightmost node
  return {
    x: rightmostNode.position.x + gridSize,
    y: rightmostNode.position.y
  };
};

// Flow utilities for cloning, copying, pasting, and template management

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique node ID
 */
export const generateNodeId = () => {
  return `node-${uuidv4()}`;
};

/**
 * Generate a unique flow ID
 */
export const generateFlowId = () => {
  return `flow-${uuidv4()}`;
};

/**
 * Generate a unique edge ID
 */
export const generateEdgeId = () => {
  return `edge-${Date.now()}-${Math.random().toString(36).substring(2)}`;
};

/**
 * Deep clone an object, handling circular references and React components
 */
export const deepClone = (obj, seen = new WeakMap()) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle circular references
  if (seen.has(obj)) {
    return seen.get(obj);
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  // Handle Arrays
  if (Array.isArray(obj)) {
    const clonedArray = [];
    seen.set(obj, clonedArray);
    obj.forEach((item, index) => {
      clonedArray[index] = deepClone(item, seen);
    });
    return clonedArray;
  }

  // Handle React components and functions
  if (typeof obj === 'function' || obj.$$typeof) {
    return obj; // Don't clone functions or React components
  }

  // Handle regular objects
  const clonedObj = {};
  seen.set(obj, clonedObj);
  
  Object.keys(obj).forEach(key => {
    // Skip React-specific properties
    if (key.startsWith('_') || key === '$$typeof' || key === 'ref') {
      return;
    }
    clonedObj[key] = deepClone(obj[key], seen);
  });

  return clonedObj;
};

/**
 * Clone a single node with new ID and offset position
 */
export const cloneNode = (originalNode, offsetX = 40, offsetY = 40) => {
  const newId = generateNodeId();
  
  // Deep clone the node data
  const clonedData = deepClone(originalNode.data);
  
  // Update the label to indicate it's a copy
  if (clonedData.label) {
    clonedData.label = clonedData.label.includes('(Copy)') 
      ? clonedData.label 
      : `${clonedData.label} (Copy)`;
  }
  
  // Update nodeId in data
  clonedData.nodeId = newId;
  
  return {
    ...deepClone(originalNode),
    id: newId,
    position: {
      x: originalNode.position.x + offsetX,
      y: originalNode.position.y + offsetY
    },
    data: clonedData,
    selected: false // Ensure the clone isn't selected
  };
};

/**
 * Clone multiple nodes with proper ID mapping
 */
export const cloneNodes = (nodes, offsetX = 40, offsetY = 40) => {
  const idMapping = new Map();
  const clonedNodes = [];
  
  // First pass: create new nodes and build ID mapping
  nodes.forEach(node => {
    const newId = generateNodeId();
    idMapping.set(node.id, newId);
    
    const clonedNode = cloneNode(node, offsetX, offsetY);
    clonedNode.id = newId;
    clonedNode.data.nodeId = newId;
    
    clonedNodes.push(clonedNode);
  });
  
  return { clonedNodes, idMapping };
};

/**
 * Clone edges with updated node IDs
 */
export const cloneEdges = (edges, idMapping) => {
  return edges
    .filter(edge => idMapping.has(edge.source) && idMapping.has(edge.target))
    .map(edge => {
      const newEdgeId = generateEdgeId();
      console.log(`Cloning edge ${edge.id} -> ${newEdgeId}`);
      return {
        ...deepClone(edge),
        id: newEdgeId,
        source: idMapping.get(edge.source),
        target: idMapping.get(edge.target)
      };
    });
};

/**
 * Clone an entire flow with all nodes and edges
 */
export const cloneFlow = (flow, newName = null) => {
  const newFlowId = generateFlowId();
  const { clonedNodes, idMapping } = cloneNodes(flow.nodes || []);
  const clonedEdges = cloneEdges(flow.edges || [], idMapping);
  
  return {
    ...deepClone(flow),
    id: newFlowId,
    name: newName || `${flow.name || 'Untitled'} (Copy)`,
    nodes: clonedNodes,
    edges: clonedEdges,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

/**
 * Duplicate an entire flow (nodes and edges) with new IDs and offset positions
 * @param {Array} nodes - Array of nodes to duplicate
 * @param {Array} edges - Array of edges to duplicate
 * @param {number} offsetX - X offset for duplicated nodes (default: 300)
 * @param {number} offsetY - Y offset for duplicated nodes (default: 50)
 * @returns {Object} Object containing duplicated nodes and edges
 */
export const duplicateFlow = (nodes, edges, offsetX = 300, offsetY = 50) => {
  // Add null safety checks
  const safeNodes = Array.isArray(nodes) ? nodes.filter(node => node && node.id) : [];
  const safeEdges = Array.isArray(edges) ? edges.filter(edge => edge && edge.id && edge.source && edge.target) : [];

  if (safeNodes.length === 0) {
    console.warn('No valid nodes to duplicate');
    return { nodes: [], edges: [] };
  }

  const idMapping = new Map();
  
  // Generate new IDs for all nodes
  safeNodes.forEach(node => {
    if (node && node.id) {
      idMapping.set(node.id, generateNodeId());
    }
  });

  // Duplicate nodes with new IDs and offset positions
  const duplicatedNodes = safeNodes.map(node => {
    if (!node || !node.id) {
      console.warn('Skipping invalid node during duplication');
      return null;
    }

    const newId = idMapping.get(node.id);
    const clonedData = deepClone(node.data || {});
    
    // Add a suffix to indicate it's a duplicate
    if (clonedData.label) {
      clonedData.label = clonedData.label.includes('(Copy)') 
        ? clonedData.label 
        : `${clonedData.label} (Copy)`;
    }
    if (clonedData.name) {
      clonedData.name = clonedData.name.includes('(Copy)') 
        ? clonedData.name 
        : `${clonedData.name} (Copy)`;
    }
    
    // Update nodeId in data
    clonedData.nodeId = newId;

    return {
      ...deepClone(node),
      id: newId,
      position: {
        x: (node.position?.x || 0) + offsetX,
        y: (node.position?.y || 0) + offsetY
      },
      data: clonedData,
      selected: false // Ensure duplicates aren't selected
    };
  }).filter(Boolean); // Remove any null values

  // Duplicate edges with new IDs
  const duplicatedEdges = safeEdges.map(edge => {
    if (!edge || !edge.id || !edge.source || !edge.target) {
      console.warn('Skipping invalid edge during duplication');
      return null;
    }

    const newEdgeId = generateEdgeId();
    console.log(`Duplicating edge ${edge.id} -> ${newEdgeId}`);
    return {
      ...deepClone(edge),
      id: newEdgeId, // Generate new edge ID
      source: idMapping.get(edge.source),
      target: idMapping.get(edge.target)
    };
  }).filter(edge => edge && edge.source && edge.target); // Filter out edges with missing nodes

  return {
    nodes: duplicatedNodes,
    edges: duplicatedEdges
  };
};

/**
 * Copy nodes to clipboard with improved error handling
 */
export const copyNodesToClipboard = async (nodes, edges = []) => {
  const clipboardData = {
    type: 'flow-nodes',
    version: '1.0',
    timestamp: new Date().toISOString(),
    nodes: nodes.map(node => deepClone(node)),
    edges: edges.map(edge => deepClone(edge))
  };
  
  const clipboardText = JSON.stringify(clipboardData);
  
  try {
    // Try clipboard API first (requires HTTPS or localhost)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(clipboardText);
      console.log('✅ Successfully copied to clipboard using Clipboard API');
      
      // Also save to localStorage as backup
      if (typeof Storage !== 'undefined') {
        localStorage.setItem('flow-clipboard', clipboardText);
      }
      return true;
    }
  } catch (clipboardError) {
    console.warn('📋 Clipboard API failed, trying fallback:', clipboardError.message);
  }
  
  try {
    // Fallback: Use localStorage
    if (typeof Storage !== 'undefined') {
      localStorage.setItem('flow-clipboard', clipboardText);
      console.log('✅ Successfully saved to localStorage fallback');
      return true;
    }
  } catch (storageError) {
    console.error('💾 LocalStorage fallback failed:', storageError.message);
  }
  
  try {
    // Final fallback: Use deprecated execCommand (for older browsers)
    const textArea = document.createElement('textarea');
    textArea.value = clipboardText;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      console.log('✅ Successfully copied using execCommand fallback');
      return true;
    }
  } catch (execError) {
    console.error('📝 execCommand fallback failed:', execError.message);
  }
  
  console.error('❌ All clipboard methods failed');
  return false;
};

/**
 * Paste nodes from clipboard with improved error handling
 */
export const pasteNodesFromClipboard = async (mousePosition = { x: 100, y: 100 }) => {
  let clipboardText = null;
  let dataSource = 'unknown';
  
  try {
    // Try clipboard API first
    if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        clipboardText = await navigator.clipboard.readText();
        dataSource = 'clipboard-api';
        console.log('📋 Successfully read from Clipboard API');
      } catch (clipboardError) {
        console.warn('📋 Clipboard API read failed:', clipboardError.message);
        
        // Check if it's a permission error
        if (clipboardError.name === 'NotAllowedError') {
          console.warn('🔒 Clipboard access denied. Trying localStorage fallback...');
        }
      }
    }
    
    // Fallback to localStorage if clipboard failed
    if (!clipboardText && typeof Storage !== 'undefined') {
      clipboardText = localStorage.getItem('flow-clipboard');
      if (clipboardText) {
        dataSource = 'localStorage';
        console.log('💾 Successfully read from localStorage fallback');
      }
    }
    
    if (!clipboardText) {
      console.warn('❌ No clipboard data available from any source');
      return null;
    }
    
    // Parse and validate clipboard data
    let clipboardData;
    try {
      clipboardData = JSON.parse(clipboardText);
    } catch (parseError) {
      console.error('📄 Failed to parse clipboard data:', parseError.message);
      return null;
    }
    
    // Validate clipboard data structure
    if (clipboardData.type !== 'flow-nodes') {
      console.warn('🚫 Invalid clipboard data type:', clipboardData.type);
      return null;
    }
    
    if (!clipboardData.nodes || !Array.isArray(clipboardData.nodes) || clipboardData.nodes.length === 0) {
      console.warn('📭 No valid nodes found in clipboard data');
      return null;
    }
    
    // Calculate offset from first node position
    const firstNode = clipboardData.nodes[0];
    const offsetX = mousePosition.x - (firstNode?.position?.x || 0);
    const offsetY = mousePosition.y - (firstNode?.position?.y || 0);
    
    // Clone nodes with new IDs and positions
    const { clonedNodes, idMapping } = cloneNodes(clipboardData.nodes, offsetX, offsetY);
    
    // Clone edges with updated node references
    const clonedEdges = cloneEdges(clipboardData.edges || [], idMapping);
    
    console.log(`✅ Successfully processed ${clonedNodes.length} nodes and ${clonedEdges.length} edges from ${dataSource}`);
    
    return {
      nodes: clonedNodes,
      edges: clonedEdges,
      source: dataSource
    };
    
  } catch (error) {
    console.error('❌ Paste operation failed:', error.message);
    return null;
  }
};

/**
 * Save nodes as a template
 */
export const saveAsTemplate = async (nodes, edges, templateName, description = '') => {
  const template = {
    id: `template-${uuidv4()}`,
    name: templateName,
    description,
    type: 'node-template',
    version: '1.0',
    createdAt: new Date().toISOString(),
    nodes: nodes.map(node => {
      const templateNode = deepClone(node);
      // Reset position to relative coordinates
      templateNode.position = {
        x: templateNode.position.x - Math.min(...nodes.map(n => n.position.x)),
        y: templateNode.position.y - Math.min(...nodes.map(n => n.position.y))
      };
      return templateNode;
    }),
    edges: edges.filter(edge => 
      nodes.some(node => node.id === edge.source) && 
      nodes.some(node => node.id === edge.target)
    ).map(edge => deepClone(edge)),
    metadata: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      nodeTypes: [...new Set(nodes.map(node => node.type))]
    }
  };
  
  try {
    // Save to localStorage for now (can be extended to save to backend)
    const existingTemplates = JSON.parse(localStorage.getItem('flow-templates') || '[]');
    existingTemplates.push(template);
    localStorage.setItem('flow-templates', JSON.stringify(existingTemplates));
    
    return template;
  } catch (error) {
    console.error('Failed to save template:', error);
    return null;
  }
};

/**
 * Load templates from storage
 */
export const loadTemplates = () => {
  try {
    return JSON.parse(localStorage.getItem('flow-templates') || '[]');
  } catch (error) {
    console.error('Failed to load templates:', error);
    return [];
  }
};

/**
 * Apply a template to the current flow
 */
export const applyTemplate = (template, position = { x: 100, y: 100 }) => {
  const { clonedNodes, idMapping } = cloneNodes(
    template.nodes,
    position.x,
    position.y
  );
  
  const clonedEdges = cloneEdges(template.edges, idMapping);
  
  return {
    nodes: clonedNodes,
    edges: clonedEdges
  };
};

/**
 * Delete a template
 */
export const deleteTemplate = (templateId) => {
  try {
    const existingTemplates = JSON.parse(localStorage.getItem('flow-templates') || '[]');
    const updatedTemplates = existingTemplates.filter(template => template.id !== templateId);
    localStorage.setItem('flow-templates', JSON.stringify(updatedTemplates));
    return true;
  } catch (error) {
    console.error('Failed to delete template:', error);
    return false;
  }
};

/**
 * Get node bounds (for positioning calculations)
 */
export const getNodeBounds = (nodes) => {
  if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  
  const positions = nodes.map(node => node.position);
  return {
    minX: Math.min(...positions.map(p => p.x)),
    minY: Math.min(...positions.map(p => p.y)),
    maxX: Math.max(...positions.map(p => p.x)),
    maxY: Math.max(...positions.map(p => p.y))
  };
};

/**
 * Center nodes in viewport
 */
export const centerNodes = (nodes, viewportCenter = { x: 400, y: 300 }) => {
  const bounds = getNodeBounds(nodes);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  
  const offsetX = viewportCenter.x - centerX;
  const offsetY = viewportCenter.y - centerY;
  
  return nodes.map(node => ({
    ...node,
    position: {
      x: node.position.x + offsetX,
      y: node.position.y + offsetY
    }
  }));
};

/**
 * Validate clipboard data for pasting with improved error handling
 */
export const validateClipboardData = async () => {
  try {
    let clipboardText = null;
    
    // Try clipboard API first
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        clipboardText = await navigator.clipboard.readText();
      }
    } catch (clipboardError) {
      // Silently try fallback - don't log every permission error
    }
    
    // Fallback to localStorage
    if (!clipboardText && typeof Storage !== 'undefined') {
      clipboardText = localStorage.getItem('flow-clipboard');
    }
    
    if (!clipboardText) {
      return false;
    }
    
    try {
      const clipboardData = JSON.parse(clipboardText);
      return (
        clipboardData.type === 'flow-nodes' &&
        Array.isArray(clipboardData.nodes) &&
        clipboardData.nodes.length > 0
      );
    } catch (parseError) {
      return false;
    }
  } catch (error) {
    console.warn('Clipboard validation failed:', error.message);
    return false;
  }
};

/**
 * Export flow to JSON file
 */
export const exportFlowToFile = (flow, filename = null) => {
  const exportData = {
    ...flow,
    exportedAt: new Date().toISOString(),
    version: '1.0'
  };
  
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = filename || `${flow.name || 'flow'}-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  URL.revokeObjectURL(link.href);
};

/**
 * Import flow from JSON file
 */
export const importFlowFromFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const flowData = JSON.parse(e.target.result);
        
        // Validate the imported data
        if (!flowData.nodes || !Array.isArray(flowData.nodes)) {
          throw new Error('Invalid flow data: missing or invalid nodes');
        }
        
        // Assign new IDs to avoid conflicts
        const { clonedNodes, idMapping } = cloneNodes(flowData.nodes, 0, 0);
        const clonedEdges = cloneEdges(flowData.edges || [], idMapping);
        
        const importedFlow = {
          ...flowData,
          id: generateFlowId(),
          nodes: clonedNodes,
          edges: clonedEdges,
          importedAt: new Date().toISOString()
        };
        
        resolve(importedFlow);
      } catch (error) {
        reject(new Error(`Failed to import flow: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}; 