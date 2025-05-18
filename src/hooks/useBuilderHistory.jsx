// hooks/useBuilderHistory.js
import { useState, useRef, useCallback } from 'react';

// Maximum number of history states to keep
const MAX_HISTORY_LENGTH = 100;

export const useBuilderHistory = (initialState = { nodes: [], edges: [] }) => {
  const [history, setHistory] = useState([initialState]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const skipNextHistoryUpdate = useRef(false);
  const debounceTimeoutRef = useRef(null);

  // Add to history with debouncing and bounded length
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
        
        setHistory(prevHistory => {
          // Get the active part of history (up to current index + 1)
          let newHist = prevHistory.slice(0, historyIndex + 1);
          
          // Add the new state
          newHist.push(newWorkflowCopy);
          
          // If history exceeds max length, remove oldest states while preserving initial state
          if (newHist.length > MAX_HISTORY_LENGTH) {
            // Always keep the initial state (index 0)
            const excess = newHist.length - MAX_HISTORY_LENGTH;
            // Remove excess states while preserving the initial state
            if (excess === 1) {
              // If we only need to remove one state, remove the second state (index 1)
              newHist.splice(1, 1);
            } else {
              // Remove states from the beginning (after initial state) to maintain max length
              newHist.splice(1, excess);
            }
            // Adjust history index since we removed states before it
            setHistoryIndex(prev => Math.max(0, prev - excess));
          }
          
          return newHist;
        });
        
        setHistoryIndex(prev => {
          // Calculate new index, ensuring it doesn't exceed MAX_HISTORY_LENGTH - 1
          const newIndex = Math.min(prev + 1, MAX_HISTORY_LENGTH - 1);
          return newIndex;
        });
      } catch (error) {
        console.error('Error adding to history:', error);
      } finally {
        debounceTimeoutRef.current = null;
      }
    }, 300);
  }, [historyIndex]);

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
    redo,
    maxHistoryLength: MAX_HISTORY_LENGTH
  };
};