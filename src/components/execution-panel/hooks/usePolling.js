// components/execution-panel/hooks/usePolling.js - SIMPLIFIED VERSION
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Simplified polling hook that avoids infinite loops
 */
export const usePolling = (
  pollingInterval = 10000,
  onPollingIntervalChange,
  isActive = true,
  fetchData = null
) => {
  // Basic state
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pollingError, setPollingError] = useState(null);
  const [pollingStats, setPollingStats] = useState({
    totalPolls: 0,
    successfulPolls: 0,
    failedPolls: 0,
    avgResponseTime: 0
  });
  
  // Refs to avoid dependencies
  const intervalRef = useRef(null);
  const fetchDataRef = useRef(fetchData);
  const isActiveRef = useRef(isActive);
  const pollingIntervalRef = useRef(pollingInterval);

  // Update refs when props change
  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    pollingIntervalRef.current = pollingInterval;
  }, [pollingInterval]);

  // Simple start polling
  const startPolling = useCallback(() => {
    if (intervalRef.current || !fetchDataRef.current) {
      return;
    }

    console.log('Starting polling...');
    setIsPolling(true);
    setPollingError(null);

    const poll = async () => {
      try {
        if (!fetchDataRef.current) return;
        
        const startTime = Date.now();
        await fetchDataRef.current();
        const responseTime = Date.now() - startTime;
        
        // Update stats
        setPollingStats(prev => ({
          ...prev,
          totalPolls: prev.totalPolls + 1,
          successfulPolls: prev.successfulPolls + 1,
          avgResponseTime: Math.round((prev.avgResponseTime + responseTime) / 2)
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

    // Start polling
    poll(); // Initial call
    intervalRef.current = setInterval(poll, pollingIntervalRef.current);
  }, []);

  // Simple stop polling
  const stopPolling = useCallback(() => {
    console.log('Stopping polling...');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Manual refresh
  const manualRefresh = useCallback(async () => {
    if (!fetchDataRef.current) return;

    try {
      console.log('Manual refresh...');
      const startTime = Date.now();
      await fetchDataRef.current();
      const responseTime = Date.now() - startTime;
      
      setPollingStats(prev => ({
        ...prev,
        totalPolls: prev.totalPolls + 1,
        successfulPolls: prev.successfulPolls + 1,
        avgResponseTime: Math.round((prev.avgResponseTime + responseTime) / 2)
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
  }, []);

  // Simple effect to start/stop based on isActive
  useEffect(() => {
    if (isActive) {
      startPolling();
    } else {
      stopPolling();
    }

    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, [isActive, startPolling, stopPolling]);

  // Effect to restart when interval changes
  useEffect(() => {
    if (isPolling) {
      stopPolling();
      setTimeout(() => {
        if (isActiveRef.current) {
          startPolling();
        }
      }, 100);
    }
  }, [pollingInterval, isPolling, startPolling, stopPolling]);

  return {
    isPolling,
    lastUpdated,
    pollingError,
    pollingStats,
    startPolling,
    stopPolling,
    manualRefresh
  };
};