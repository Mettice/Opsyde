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
      
      const response = await apiClient.fetchExecutedTriggers();
      
      // Handle different response formats
      let triggers = [];
      if (response && typeof response === 'object') {
        // Check if response has data.triggers structure
        if (response.data && Array.isArray(response.data.triggers)) {
          triggers = response.data.triggers;
        }
        // Check if response is directly an array
        else if (Array.isArray(response)) {
          triggers = response;
        }
        // Check if response has triggers property
        else if (response.triggers && Array.isArray(response.triggers)) {
          triggers = response.triggers;
        }
        // Check if response.data is directly an array
        else if (response.data && Array.isArray(response.data)) {
          triggers = response.data;
        }
      }
      
      // Sort triggers by execution time, most recent first
      const sortedTriggers = [...triggers].sort((a, b) => {
        const dateA = new Date(b.executed_at || b.last_executed || b.timestamp || 0);
        const dateB = new Date(a.executed_at || a.last_executed || a.timestamp || 0);
        return dateA - dateB;
      });
      
      setExecutedTriggers(sortedTriggers);
      
      // Log success for debugging
      console.log(`Successfully fetched ${triggers.length} executed triggers`);
      
    } catch (error) {
      console.error('Error fetching executed triggers:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to fetch executed triggers';
      if (error.message) {
        if (error.message.includes('EMPTY_RESPONSE')) {
          errorMessage = 'Server returned empty response. Please check backend logs.';
        } else if (error.message.includes('PARSE_ERROR')) {
          errorMessage = 'Invalid response format from server.';
        } else if (error.message.includes('404')) {
          errorMessage = 'Trigger endpoint not found. Please check backend configuration.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      
      // Show notification if available
      if (addNotification) {
        addNotification({
          message: errorMessage,
          type: 'error',
          duration: 5000
        });
      }
    } finally {
      setLoading(false);
    }
  }, [addNotification]);
  
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