// utils/getSafeNodePosition.js

/**
 * Calculates a safe position for a new node that doesn't overlap with existing nodes
 * @param {Array} nodes - The existing nodes in the flow
 * @param {number} nodeWidth - The width of the new node (default: 200)
 * @param {number} nodeHeight - The height of the new node (default: 150)
 * @param {number} padding - Padding between nodes (default: 50)
 * @returns {Object} - Safe position {x, y} for the new node
 */
export const getSafeNodePosition = (
    nodes, 
    nodeWidth = 200, 
    nodeHeight = 150, 
    padding = 50
  ) => {
    if (!nodes || nodes.length === 0) {
      // If no nodes exist, place it in the center of the viewport
      return { x: 300, y: 200 };
    }
  
    // Find the occupied areas
    const occupiedAreas = nodes.map(node => {
      return {
        x1: node.position.x - padding,
        y1: node.position.y - padding,
        x2: node.position.x + nodeWidth + padding,
        y2: node.position.y + nodeHeight + padding,
      };
    });
  
    // Find the rightmost node
    const rightmostNode = nodes.reduce(
      (max, node) => (node.position.x > max.position.x ? node : max),
      nodes[0]
    );
  
    // Try to place to the right of the rightmost node
    const rightPosition = {
      x: rightmostNode.position.x + nodeWidth + padding,
      y: rightmostNode.position.y,
    };
  
    // Check if this position overlaps with any existing node
    const hasOverlap = (pos) => {
      return occupiedAreas.some(area => {
        return !(
          pos.x + nodeWidth < area.x1 ||
          pos.x > area.x2 ||
          pos.y + nodeHeight < area.y1 ||
          pos.y > area.y2
        );
      });
    };
  
    // If the right position is clear, use it
    if (!hasOverlap(rightPosition)) {
      return rightPosition;
    }
  
    // Find the bottommost node
    const bottommostNode = nodes.reduce(
      (max, node) => (node.position.y > max.position.y ? node : max),
      nodes[0]
    );
  
    // Try to place below the bottommost node
    const bottomPosition = {
      x: nodes[0].position.x,
      y: bottommostNode.position.y + nodeHeight + padding,
    };
  
    // If the bottom position is clear, use it
    if (!hasOverlap(bottomPosition)) {
      return bottomPosition;
    }
  
    // If both positions have overlap, find a random position that works
    // We'll try a grid-based approach
    const gridSize = nodeWidth + padding;
    const maxAttempts = 20;
  
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Start from a position relative to the existing nodes and add some random offset
      const baseX = nodes[0].position.x + (attempt % 4) * gridSize;
      const baseY = nodes[0].position.y + Math.floor(attempt / 4) * gridSize;
      
      // Add some randomness to avoid a perfectly aligned grid
      const randomOffset = 30;
      const randomPosition = {
        x: baseX + Math.random() * randomOffset,
        y: baseY + Math.random() * randomOffset,
      };
  
      if (!hasOverlap(randomPosition)) {
        return randomPosition;
      }
    }
  
    // If all else fails, return a position with a greater offset
    // This ensures we always have a position, even if it's not perfect
    return {
      x: rightmostNode.position.x + nodeWidth + padding * 2 + Math.random() * 100,
      y: bottommostNode.position.y + nodeHeight + padding * 2 + Math.random() * 100,
    };
  };