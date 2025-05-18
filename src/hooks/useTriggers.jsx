import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

export const useTriggers = ({ customPollingInterval, addNotification }) => {
  const [executedTriggers, setExecutedTriggers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Function to fetch executed triggers
  const fetchExecutedTriggers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const triggers = await apiClient.fetchExecutedTriggers();
      
      // Sort triggers by execution time, most recent first
      const sortedTriggers = [...triggers].sort((a, b) => {
        return new Date(b.executed_at || b.timestamp) - new Date(a.executed_at || a.timestamp);
      });
      
      setExecutedTriggers(sortedTriggers);
    } catch (error) {
      console.error('Error fetching executed triggers:', error);
      setError(error.message || 'Failed to fetch executed triggers');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Initial fetch and polling
  useEffect(() => {
    // Fetch triggers immediately on mount
    fetchExecutedTriggers();
    
    // Set up polling
    const interval = setInterval(() => {
      fetchExecutedTriggers();
    }, customPollingInterval || 5000); // Default to 5 seconds if not specified
    
    // Clean up on unmount
    return () => clearInterval(interval);
  }, [fetchExecutedTriggers, customPollingInterval]);
  
  // Function to manually refresh triggers
  const refreshTriggers = useCallback(async () => {
    await fetchExecutedTriggers();
    addNotification?.({
      message: 'Trigger history refreshed',
      type: 'info'
    });
  }, [fetchExecutedTriggers, addNotification]);
  
  return {
    executedTriggers,
    loading,
    error,
    refreshTriggers
  };
}; 