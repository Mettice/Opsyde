// components/execution-panel/hooks/usePolling.js
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for managing polling functionality and real-time updates
 */
export const usePolling = (
  pollingInterval = 10000,
  onPollingIntervalChange,
  isActive = true,
  fetchData = null
) => {
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pollingError, setPollingError] = useState(null);
  const [pollingStats, setPollingStats] = useState({
    totalPolls: 0,
    successfulPolls: 0,
    failedPolls: 0,
    avgResponseTime: 0
  });
  
  const pollingRef = useRef(null);
  const lastPollTime = useRef(null);
  const responseTimeHistory = useRef([]);

  // Handle polling interval changes
  const handlePollingIntervalChange = useCallback((newInterval) => {
    if (onPollingIntervalChange) {
      onPollingIntervalChange(newInterval);
    }
  }, [onPollingIntervalChange]);

  // Start polling
  const startPolling = useCallback(() => {
    if (pollingRef.current || !fetchData) return;

    setIsPolling(true);
    setPollingError(null);

    const poll = async () => {
      try {
        const startTime = Date.now();
        lastPollTime.current = startTime;
        
        // Execute the fetch function
        await fetchData();
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // Update response time history
        responseTimeHistory.current.push(responseTime);
        if (responseTimeHistory.current.length > 10) {
          responseTimeHistory.current.shift(); // Keep only last 10 response times
        }
        
        // Calculate average response time
        const avgResponseTime = responseTimeHistory.current.reduce((a, b) => a + b, 0) / 
                               responseTimeHistory.current.length;
        
        // Update stats
        setPollingStats(prev => ({
          ...prev,
          totalPolls: prev.totalPolls + 1,
          successfulPolls: prev.successfulPolls + 1,
          avgResponseTime: Math.round(avgResponseTime)
        }));
        
        setLastUpdated(new Date());
        setPollingError(null);
        
      } catch (error) {
        console.error('Polling error:', error);
        setPollingError(error.message);
        
        setPollingStats(prev => ({
          ...prev,
          totalPolls: prev.totalPolls + 1,
          failedPolls: prev.failedPolls + 1
        }));
      }
    };

    // Initial poll
    poll();
    
    // Set up interval
    pollingRef.current = setInterval(poll, pollingInterval);
  }, [fetchData, pollingInterval]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Restart polling with new interval
  const restartPolling = useCallback(() => {
    stopPolling();
    if (isActive) {
      setTimeout(startPolling, 100); // Small delay to ensure cleanup
    }
  }, [stopPolling, startPolling, isActive]);

  // Manual refresh
  const manualRefresh = useCallback(async () => {
    if (!fetchData) return;

    try {
      const startTime = Date.now();
      await fetchData();
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Update response time history
      responseTimeHistory.current.push(responseTime);
      if (responseTimeHistory.current.length > 10) {
        responseTimeHistory.current.shift();
      }
      
      // Calculate average response time
      const avgResponseTime = responseTimeHistory.current.reduce((a, b) => a + b, 0) / 
                             responseTimeHistory.current.length;
      
      // Update stats
      setPollingStats(prev => ({
        ...prev,
        totalPolls: prev.totalPolls + 1,
        successfulPolls: prev.successfulPolls + 1,
        avgResponseTime: Math.round(avgResponseTime)
      }));
      
      setLastUpdated(new Date());
      setPollingError(null);
      
    } catch (error) {
      console.error('Manual refresh error:', error);
      setPollingError(error.message);
      
      setPollingStats(prev => ({
        ...prev,
        totalPolls: prev.totalPolls + 1,
        failedPolls: prev.failedPolls + 1
      }));
    }
  }, [fetchData]);

  // Effect to handle polling state changes
  useEffect(() => {
    if (isActive && !isPolling) {
      startPolling();
    } else if (!isActive && isPolling) {
      stopPolling();
    }
    
    return () => {
      stopPolling();
    };
  }, [isActive, startPolling, stopPolling, isPolling]);

  // Effect to restart polling when interval changes
  useEffect(() => {
    if (isPolling) {
      restartPolling();
    }
  }, [pollingInterval, restartPolling]);

  return {
    isPolling,
    lastUpdated,
    pollingError,
    pollingStats,
    startPolling,
    stopPolling,
    restartPolling,
    manualRefresh,
    handlePollingIntervalChange
  };
};