export const getSafeNodePosition = (existingNodes, baseX = 100, baseY = 100) => {
    const padding = 100;
    const occupied = new Set(existingNodes.map(n => `${Math.floor(n.position.x)},${Math.floor(n.position.y)}`));
  
    let x = baseX;
    let y = baseY;
  
    while (occupied.has(`${x},${y}`)) {
      x += padding;
      if (x > 1000) {
        x = baseX;
        y += padding;
      }
    }
  
    return { x, y };
  };
  