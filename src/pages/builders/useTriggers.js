import { useState, useEffect, useCallback } from 'react';
import { useNotifications } from '../contexts/NotificationContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export function useTriggers({ customPollingInterval }) {
  const [executedTriggers, setExecutedTriggers] = useState([]);
  const { addNotification, registerTriggerNotification } = useNotifications();
  
  // Fetch executed triggers
  const fetchExecutedTriggers = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/executed-triggers`);
      if (response.ok) {
        const data = await response.json();
        
        // Only process if we have triggers
        if (data.triggers && data.triggers.length > 0) {
          // Get only triggers executed in the last 5 minutes AND not completed
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          const recentTriggers = data.triggers.filter(trigger => {
            // Skip completed triggers entirely
            if (trigger.completed) return false;
            
            // Check if it's recent
            if (!trigger.last_executed) return false;
            const executionTime = new Date(trigger.last_executed);
            return executionTime > fiveMinutesAgo;
          });
          
          // Find truly new triggers (not previously notified)
          const newTriggers = recentTriggers.filter(trigger => {
            return registerTriggerNotification(
              trigger.id, 
              trigger.last_executed
            );
          });
          
          // Only show notifications for truly new executions
          if (newTriggers.length > 0) {
            // Show at most one notification to avoid flooding
            const latestTrigger = newTriggers[0];
            addNotification({
              message: `Trigger "${latestTrigger.label || latestTrigger.id}" executed at ${new Date(latestTrigger.last_executed).toLocaleTimeString()}`,
              type: "success"
            });
            
            if (newTriggers.length > 1) {
              addNotification({
                message: `${newTriggers.length - 1} more triggers were executed`,
                type: "info"
              });
            }
          }
          
          // Update the state with all triggers
          setExecutedTriggers(data.triggers);
        }
      }
    } catch (error) {
      console.error("Error fetching executed triggers:", error);
    }
  }, [addNotification, registerTriggerNotification]);
  
  // Clean up completed triggers
  const cleanupCompletedTriggers = useCallback(() => {
    // Filter out completed triggers that have been shown for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    setExecutedTriggers(prev => 
      prev.filter(trigger => 
        !trigger.completed || 
        !trigger.completed_at || 
        new Date(trigger.completed_at) > fiveMinutesAgo
      )
    );
  }, []);
  
  // Set up polling for trigger status
  useEffect(() => {
    // Initial fetch
    fetchExecutedTriggers();
    
    // Use the configurable polling interval
    const fetchInterval = setInterval(fetchExecutedTriggers, customPollingInterval);
    const cleanupInterval = setInterval(cleanupCompletedTriggers, 60000); // Every minute
    
    // Clean up on unmount
    return () => {
      clearInterval(fetchInterval);
      clearInterval(cleanupInterval);
    };
  }, [fetchExecutedTriggers, cleanupCompletedTriggers, customPollingInterval]);
  
  // Manual trigger function
  const triggerManually = useCallback(async (triggerId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/trigger/${triggerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true, timestamp: new Date().toISOString() })
      });
      
      if (response.ok) {
        const result = await response.json();
        addNotification({
          message: 'Trigger executed successfully',
          type: 'success'
        });
        return result;
      } else {
        throw new Error('Failed to execute trigger');
      }
    } catch (error) {
      addNotification({
        message: `Failed to execute trigger: ${error.message}`,
        type: 'error'
      });
      return null;
    }
  }, [BACKEND_URL, addNotification]);
  
  return {
    executedTriggers,
    fetchExecutedTriggers,
    triggerManually
  };
}