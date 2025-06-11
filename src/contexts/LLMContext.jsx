import React, { createContext, useContext, useState, useEffect } from 'react';

const LLMContext = createContext();

export const useLLMMode = () => {
  const context = useContext(LLMContext);
  if (!context) {
    throw new Error('useLLMMode must be used within an LLMProvider');
  }
  return context;
};

export const LLMProvider = ({ children }) => {
  const [llmModeEnabled, setLlmModeEnabled] = useState(false);
  const [smartMappingEnabled, setSmartMappingEnabled] = useState(true);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch current status on component mount
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/llm-mode/status');
      if (response.ok) {
        const data = await response.json();
        setLlmModeEnabled(data.llm_mode_enabled);
        setSmartMappingEnabled(data.smart_mapping_enabled);
        setStatus(data);
        setError(null);
      } else {
        throw new Error('Failed to fetch LLM mode status');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching LLM mode status:', err);
    }
  };

  const toggleLLMMode = async (enabled) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/llm-mode/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled,
          smart_mapping_enabled: smartMappingEnabled
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLlmModeEnabled(data.llm_mode_enabled);
        setSmartMappingEnabled(data.smart_mapping_enabled);
        
        // Refresh status
        await fetchStatus();
      } else {
        throw new Error('Failed to toggle LLM mode');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error toggling LLM mode:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSmartMapping = async (enabled) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/llm-mode/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: llmModeEnabled,
          smart_mapping_enabled: enabled
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLlmModeEnabled(data.llm_mode_enabled);
        setSmartMappingEnabled(data.smart_mapping_enabled);
        
        // Refresh status
        await fetchStatus();
      } else {
        throw new Error('Failed to toggle smart mapping');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error toggling smart mapping:', err);
    } finally {
      setLoading(false);
    }
  };

  const testLLMMode = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/llm-mode/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        throw new Error('Failed to test LLM mode');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error testing LLM mode:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get node configuration with LLM mode
  const getNodeConfigWithLLMMode = (nodeData) => {
    return {
      ...nodeData,
      llm_mode_enabled: llmModeEnabled,
      smart_mapping_enabled: smartMappingEnabled
    };
  };

  const value = {
    llmModeEnabled,
    smartMappingEnabled,
    status,
    loading,
    error,
    toggleLLMMode,
    toggleSmartMapping,
    testLLMMode,
    fetchStatus,
    getNodeConfigWithLLMMode
  };

  return (
    <LLMContext.Provider value={value}>
      {children}
    </LLMContext.Provider>
  );
};

export default LLMProvider; 