import React, { createContext, useContext, useState } from 'react';

// Create context
const BuilderUIContext = createContext(null);

// Hook to use the BuilderUI context
export const useBuilderUI = () => {
  const context = useContext(BuilderUIContext);
  if (!context) {
    throw new Error('useBuilderUI must be used within a BuilderUIProvider');
  }
  return context;
};

// BuilderUI Provider component
export const BuilderUIProvider = ({ children }) => {
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showToolTemplates, setShowToolTemplates] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showWebhookFlowModal, setShowWebhookFlowModal] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  
  // Panel states
  const [showRunnerPanel, setShowRunnerPanel] = useState(false);
  const [showTriggerHistory, setShowTriggerHistory] = useState(false);
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);
  const [showConnectionGuide, setShowConnectionGuide] = useState(false);
  const [showConnectionRules, setShowConnectionRules] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // Minimized states
  const [minimizeRunnerPanel, setMinimizeRunnerPanel] = useState(false);
  const [minimizeExecutionPanel, setMinimizeExecutionPanel] = useState(false);
  
  // Settings
  const [executionMode, setExecutionMode] = useState('development');
  const [customPollingInterval, setCustomPollingInterval] = useState(5000);
  
  // Webhook flow data
  const [incomingFlow, setIncomingFlow] = useState(null);
  
  // Toggle functions
  const toggleEditModal = (value) => setShowEditModal(value !== undefined ? value : !showEditModal);
  const toggleHelpPanel = (value) => setShowHelpPanel(value !== undefined ? value : !showHelpPanel);
  const togglePreview = (value) => setShowPreview(value !== undefined ? value : !showPreview);
  const toggleToolTemplates = (value) => setShowToolTemplates(value !== undefined ? value : !showToolTemplates);
  const toggleTemplateModal = (value) => setShowTemplateModal(value !== undefined ? value : !showTemplateModal);
  const toggleWebhookFlowModal = (value) => setShowWebhookFlowModal(value !== undefined ? value : !showWebhookFlowModal);
  const toggleTemplateGallery = (value) => setShowTemplateGallery(value !== undefined ? value : !showTemplateGallery);
  const toggleRunnerPanel = (value) => setShowRunnerPanel(value !== undefined ? value : !showRunnerPanel);
  const toggleTriggerHistory = (value) => setShowTriggerHistory(value !== undefined ? value : !showTriggerHistory);
  const toggleExecutionPanel = (forceState) => {
    if (typeof forceState === 'boolean') {
      setShowExecutionPanel(forceState);
      
      // If we're showing the panel, make sure it's not minimized
      if (forceState === true) {
        setMinimizeExecutionPanel(false);
      }
    } else {
      setShowExecutionPanel(!showExecutionPanel);
    }
  };
  const toggleMinimizeRunnerPanel = () => setMinimizeRunnerPanel(!minimizeRunnerPanel);
  const toggleMinimizeExecutionPanel = () => setMinimizeExecutionPanel(!minimizeExecutionPanel);
  const toggleExecutionMode = () => setExecutionMode(executionMode === 'development' ? 'production' : 'development');
  
  // Close functions
  const closeEditModal = () => setShowEditModal(false);
  const closeHelpPanel = () => setShowHelpPanel(false);
  const closePreview = () => setShowPreview(false);
  const closeToolTemplates = () => setShowToolTemplates(false);
  const closeTemplateModal = () => setShowTemplateModal(false);
  const closeWebhookFlowModal = () => setShowWebhookFlowModal(false);
  
  // Context value
  const value = {
    // Modal states
    showEditModal, toggleEditModal, closeEditModal,
    showHelpPanel, toggleHelpPanel, closeHelpPanel,
    showPreview, togglePreview, closePreview,
    showToolTemplates, toggleToolTemplates, closeToolTemplates,
    showTemplateModal, toggleTemplateModal, closeTemplateModal,
    showWebhookFlowModal, toggleWebhookFlowModal, closeWebhookFlowModal,
    showTemplateGallery, toggleTemplateGallery,
    
    // Panel states
    showRunnerPanel, toggleRunnerPanel,
    showTriggerHistory, toggleTriggerHistory,
    showExecutionPanel, toggleExecutionPanel,
    showConnectionGuide, setShowConnectionGuide,
    showConnectionRules, setShowConnectionRules,
    showDebugPanel, setShowDebugPanel,
    
    // Minimized states
    minimizeRunnerPanel, toggleMinimizeRunnerPanel,
    minimizeExecutionPanel, toggleMinimizeExecutionPanel,
    
    // Settings
    executionMode, toggleExecutionMode,
    customPollingInterval, setCustomPollingInterval,
    
    // Webhook flow data
    incomingFlow, setIncomingFlow
  };

  return (
    <BuilderUIContext.Provider value={value}>
      {children}
    </BuilderUIContext.Provider>
  );
}; 