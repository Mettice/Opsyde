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