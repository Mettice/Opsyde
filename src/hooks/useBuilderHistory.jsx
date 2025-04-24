// hooks/useBuilderHistory.js
import { useState, useRef, useCallback } from 'react';

export const useBuilderHistory = (initialState = { nodes: [], edges: [] }) => {
  const [history, setHistory] = useState([initialState]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const skipNextHistoryUpdate = useRef(false);
  const debounceTimeoutRef = useRef(null);

  // Add to history with debouncing
  const addToHistory = useCallback((newWorkflow) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      if (skipNextHistoryUpdate.current) {
        skipNextHistoryUpdate.current = false;
        return;
      }
      
      try {
        // Create deep copies to avoid reference issues
        const newWorkflowCopy = {
          nodes: newWorkflow.nodes.map(node => {
            // Clean up node data before storing in history
            const nodeCopy = { ...node };
            if (nodeCopy.data) {
              const cleanData = { ...nodeCopy.data };
              // Remove any functions or circular references
              Object.keys(cleanData).forEach(key => {
                if (typeof cleanData[key] === 'function' || 
                    key === 'onEdit' || 
                    key === 'onDelete' ||
                    key === 'onValueChange') {
                  delete cleanData[key];
                }
              });
              nodeCopy.data = cleanData;
            }
            return nodeCopy;
          }),
          edges: newWorkflow.edges.map(edge => ({ ...edge }))
        };
        
        const newHist = history.slice(0, historyIndex + 1);
        newHist.push(newWorkflowCopy);
        
        setHistory(newHist);
        setHistoryIndex(newHist.length - 1);
      } catch (error) {
        console.error('Error adding to history:', error);
      } finally {
        debounceTimeoutRef.current = null;
      }
    }, 300);
  }, [history, historyIndex]);

  // Undo function
  const undo = useCallback((handleNodeEdit, handleNodeDelete) => {
    if (historyIndex > 0) {
      try {
        skipNextHistoryUpdate.current = true;
        const newIndex = historyIndex - 1;
        const previousState = history[newIndex];
        
        if (!previousState) {
          console.error("Previous state not found in history");
          return { nodes: [], edges: [] };
        }
        
        // Add callbacks to nodes
        const nodesWithCallbacks = previousState.nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            onEdit: () => handleNodeEdit(node.id),
            onDelete: () => handleNodeDelete(node.id)
          }
        }));
        
        setHistoryIndex(newIndex);
        return { 
          nodes: nodesWithCallbacks, 
          edges: previousState.edges 
        };
      } catch (error) {
        console.error("Error during undo operation:", error);
        return null;
      }
    }
    return null;
  }, [history, historyIndex]);

  // Redo function
  const redo = useCallback((handleNodeEdit, handleNodeDelete) => {
    if (historyIndex < history.length - 1) {
      try {
        skipNextHistoryUpdate.current = true;
        const newIndex = historyIndex + 1;
        const nextState = history[newIndex];
        
        if (!nextState) {
          console.error("Next state not found in history");
          return { nodes: [], edges: [] };
        }
        
        // Add callbacks to nodes
        const nodesWithCallbacks = nextState.nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            onEdit: () => handleNodeEdit(node.id),
            onDelete: () => handleNodeDelete(node.id)
          }
        }));
        
        setHistoryIndex(newIndex);
        return { 
          nodes: nodesWithCallbacks, 
          edges: nextState.edges 
        };
      } catch (error) {
        console.error("Error during redo operation:", error);
        return null;
      }
    }
    return null;
  }, [history, historyIndex]);

  return {
    history,
    historyIndex,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    addToHistory,
    undo,
    redo
  };
};