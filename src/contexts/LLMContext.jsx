import React, { createContext, useContext, useState, useEffect } from 'react';
import { APIClient } from '../api/client';

const LLMContext = createContext();

// Export the context for direct use
export { LLMContext };

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
  const apiClient = APIClient.getInstance();

  // Fetch current status on component mount
  useEffect(() => {
    fetchStatus();
  }, []);

  // Expose LLM context to window for API client access
  useEffect(() => {
    updateGlobalContext();
  }, [llmModeEnabled, smartMappingEnabled, status]);

  const updateGlobalContext = () => {
    window.LLM_CONTEXT = {
      llmModeEnabled,
      smartMappingEnabled,
      status
    };
    
    // Also expose user API keys for BYOK support
    // In a real implementation, these would come from your BYOK system
    // For now, they can be empty and will be populated by your BYOK implementation
    window.USER_API_KEYS = {
      // These would be loaded from your user settings/BYOK system
      // For now, they can be empty and will be populated by your BYOK implementation
    };
  };

  const fetchStatus = async () => {
    try {
      console.log('🔄 Fetching LLM mode status...');
      const status = await apiClient.getLLMModeStatus();
      console.log('✅ LLM status received:', status);
      
      setLlmModeEnabled(status.llm_mode_enabled);
      setSmartMappingEnabled(status.smart_mapping_enabled);
      setStatus('connected');
    } catch (error) {
      console.error('❌ Error fetching LLM mode status:', error);
      setStatus('error');
      // Set default values on error
      setLlmModeEnabled(false);
      setSmartMappingEnabled(true);
    }
  };

  const toggleLLMMode = async (enabled) => {
    try {
      console.log(`🤖 Toggling LLM mode: ${enabled}, Smart mapping: ${smartMappingEnabled}`);
      const result = await apiClient.toggleLLMMode(enabled, smartMappingEnabled);
      console.log('✅ LLM mode toggle result:', result);
      
      setLlmModeEnabled(result.llm_mode_enabled);
      setSmartMappingEnabled(result.smart_mapping_enabled);
      
      // Update global context
      updateGlobalContext();
    } catch (error) {
      console.error('❌ Error toggling LLM mode:', error);
      // Revert the state on error
      setLlmModeEnabled(!enabled);
    }
  };

  const toggleSmartMapping = async (enabled) => {
    try {
      console.log(`🧠 Toggling Smart mapping: ${enabled}, LLM mode: ${llmModeEnabled}`);
      const result = await apiClient.toggleLLMMode(llmModeEnabled, enabled);
      console.log('✅ Smart mapping toggle result:', result);
      
      setLlmModeEnabled(result.llm_mode_enabled);
      setSmartMappingEnabled(result.smart_mapping_enabled);
      
      // Update global context
      updateGlobalContext();
    } catch (error) {
      console.error('❌ Error toggling smart mapping:', error);
      // Revert the state on error
      setSmartMappingEnabled(!enabled);
    }
  };

  const testLLMMode = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiClient.testLLMMode();
      return data;
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