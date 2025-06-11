import React, { useState, useEffect } from 'react';
import { ReactFlowProvider, useReactFlow } from 'reactflow';
import FloatingIntegrationHub from './FloatingIntegrationHub';
import IntegrationSidebar from './IntegrationSidebar';
import IntegrationSelector from './IntegrationSelector';
import { useContextMenu } from '../hooks/useContextMenu';

const IntegrationDemo = () => {
  const [nodes, setNodes] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApproach, setSelectedApproach] = useState('floating');
  const [integrationSelectorPosition, setIntegrationSelectorPosition] = useState({ x: 300, y: 300 });

  // Mock function to add nodes (replace with your actual node management)
  const handleAddNode = (nodeData) => {
    console.log('Adding integration node:', nodeData);
    setNodes(prevNodes => [...prevNodes, nodeData]);
  };

  // Get ReactFlow instance (you'll have this in your actual Builder)
  const reactFlowInstance = useReactFlow();

  // Context menu hook
  const { 
    handleCanvasContextMenu, 
    ContextMenuComponent 
  } = useContextMenu({ 
    onAddNode: handleAddNode, 
    reactFlowInstance 
  });

  // Listen for context menu events to open integration selector
  useEffect(() => {
    const handleOpenIntegrationSelector = (event) => {
      console.log('🔧 Context menu requesting integration selector');
      const position = event.detail?.position || { x: 300, y: 300 };
      setIntegrationSelectorPosition(position);
      setIsModalOpen(true);
    };

    window.addEventListener('openIntegrationSelector', handleOpenIntegrationSelector);
    
    return () => {
      window.removeEventListener('openIntegrationSelector', handleOpenIntegrationSelector);
    };
  }, []);

  return (
    <div className="h-screen w-full bg-gray-50 relative">
      {/* Demo Header */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-3">🔧 Integration UI Demo</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedApproach('floating')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedApproach === 'floating'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🎈 Floating Hub
            </button>
            <button
              onClick={() => setSelectedApproach('sidebar')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedApproach === 'sidebar'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              📋 Sidebar Panel
            </button>
            <button
              onClick={() => setSelectedApproach('context')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedApproach === 'context'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🖱️ Context Menu
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              🌟 Full Modal
            </button>
          </div>
        </div>
      </div>

      {/* Demo Canvas - Right-click to test context menu */}
      <div 
        className="w-full h-full flex items-center justify-center"
        onContextMenu={selectedApproach === 'context' ? handleCanvasContextMenu : undefined}
      >
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-center">
            <span className="text-6xl mb-4 block">🎨</span>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Integration UI Showcase
            </h3>
            <p className="text-gray-600 mb-4">
              {selectedApproach === 'floating' && '✨ Floating Hub: Click the floating button in bottom-right'}
            {selectedApproach === 'sidebar' && '📋 Sidebar Panel: Click the integration button in top-left'}
            {selectedApproach === 'context' && '🖱️ Context Menu: Right-click anywhere on this canvas'}
            </p>
            
            {/* Integration Count Display */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
              <div className="text-sm text-green-800">
                <strong>{nodes.length}</strong> integration{nodes.length !== 1 ? 's' : ''} added
              </div>
              {nodes.length > 0 && (
                <div className="text-xs text-green-600 mt-1">
                  Latest: {nodes[nodes.length - 1]?.data?.label}
                </div>
              )}
            </div>

            {/* Instructions based on approach */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-xs text-blue-700">
                {selectedApproach === 'floating' && (
                  <>
                    • Click the floating 🔧 button (bottom-right)<br/>
                    • Try quick integrations or browse all<br/>
                    • Perfect for minimal UI interference
                  </>
                )}
                {selectedApproach === 'sidebar' && (
                  <>
                    • Click "Integrations" button (top-left)<br/>
                    • Browse by category or search<br/>
                    • Great for organized browsing
                  </>
                )}
                {selectedApproach === 'context' && (
                  <>
                    • Right-click anywhere on this canvas<br/>
                    • Quick access to popular integrations<br/>
                    • Click "Browse All" to see full selector<br/>
                    • Ideal for power users
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Components based on selected approach */}
      {selectedApproach === 'floating' && (
        <FloatingIntegrationHub 
          onAddNode={handleAddNode}
          reactFlowInstance={reactFlowInstance}
        />
      )}

      {selectedApproach === 'sidebar' && (
        <IntegrationSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          onAddNode={handleAddNode}
          reactFlowInstance={reactFlowInstance}
        />
      )}

      {/* Context Menu Component */}
      {selectedApproach === 'context' && <ContextMenuComponent />}

      {/* Full Integration Modal - Now responds to context menu events too */}
      <IntegrationSelector
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectIntegration={handleAddNode}
        position={integrationSelectorPosition}
      />

      {/* Demo Reset Button */}
      {nodes.length > 0 && (
        <button
          onClick={() => setNodes([])}
          className="fixed bottom-4 left-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-40"
        >
          🗑️ Clear Demo ({nodes.length})
        </button>
      )}
    </div>
  );
};

// Wrapper with ReactFlowProvider for the demo
const IntegrationDemoWithProvider = () => {
  return (
    <ReactFlowProvider>
      <IntegrationDemo />
    </ReactFlowProvider>
  );
};

export default IntegrationDemoWithProvider; 