import React, { useState } from 'react';
import { useReactFlow } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';

const FloatingIntegrationHub = ({ onAddNode, reactFlowInstance }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Quick integration options
  const quickIntegrations = [
    { id: 'agent', label: '🤖 Agent', type: 'agent' },
    { id: 'task', label: '📋 Task', type: 'task' },
    { id: 'tool', label: '🛠️ Tool', type: 'tool' },
    { id: 'chat', label: '💬 Chat', type: 'chat' },
    { id: 'logic', label: '⚡ Logic', type: 'logic' },
    { id: 'delay', label: '⏱️ Delay', type: 'delay' }
  ];

  const handleAddIntegration = (integration) => {
    // Get the center of the viewport
    const { x, y } = reactFlowInstance.getViewport();
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Create new node data
    const nodeData = {
      id: `${integration.type}-${Date.now()}`,
      type: integration.type,
      position: { x: centerX, y: centerY },
      data: { 
        label: integration.label,
        type: integration.type
      }
    };

    // Add the node
    onAddNode(nodeData);
    
    // Collapse the hub
    setIsExpanded(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-64"
          >
            <div className="space-y-2">
              {quickIntegrations.map((integration) => (
                <button
                  key={integration.id}
                  onClick={() => handleAddIntegration(integration)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm text-gray-700"
                >
                  <span>{integration.label}</span>
                </button>
              ))}
              <div className="border-t border-gray-200 my-2"></div>
              <button
                onClick={() => {
                  // Trigger the full integration selector
                  window.dispatchEvent(new CustomEvent('openIntegrationSelector', {
                    detail: { position: { x: 300, y: 300 } }
                  }));
                }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm text-blue-600"
              >
                🌟 Browse All Integrations
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow"
      >
        <div className="relative">
          <span className="text-xl">🔧</span>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
            >
              Quick Integrations
            </motion.div>
          )}
        </div>
      </motion.button>
    </div>
  );
};

export default FloatingIntegrationHub;
