import React, { useState } from 'react';
import GraphMetricsPanel from './GraphMetricsPanel';

export default function FloatingMetricsPanel({ nodes, edges }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('metrics');
  
  return (
    <div className="fixed bottom-4 right-4 z-40">
      {isExpanded ? (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ width: '320px' }}>
          {/* Tabs */}
          <div className="flex border-b">
            <button 
              className={`flex-1 py-2 px-4 text-sm font-medium ${activeTab === 'metrics' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:text-gray-800'}`}
              onClick={() => setActiveTab('metrics')}
            >
              Metrics
            </button>
            <button 
              className={`flex-1 py-2 px-4 text-sm font-medium ${activeTab === 'rules' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:text-gray-800'}`}
              onClick={() => setActiveTab('rules')}
            >
              Rules
            </button>
            <button 
              className={`flex-1 py-2 px-4 text-sm font-medium ${activeTab === 'debug' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:text-gray-800'}`}
              onClick={() => setActiveTab('debug')}
            >
              Debug
            </button>
            <button 
              onClick={() => setIsExpanded(false)}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="max-h-96 overflow-auto">
            {activeTab === 'metrics' && <GraphMetricsPanel nodes={nodes} edges={edges} />}
            {activeTab === 'rules' && (
              <div className="p-4">
                <h3 className="font-medium text-gray-800 mb-2">Connection Rules</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Agent → Task: Valid</li>
                  <li>• Tool → Agent: Valid</li>
                  <li>• Task → Task: Valid</li>
                  <li>• Trigger → Any: Valid</li>
                  <li>• Agent → Agent: Invalid</li>
                </ul>
              </div>
            )}
            {activeTab === 'debug' && (
              <div className="p-4">
                <h3 className="font-medium text-gray-800 mb-2">Debug Console</h3>
                <div className="bg-gray-100 p-2 rounded text-xs font-mono h-40 overflow-y-auto">
                  <div>Nodes loaded: {nodes.length}</div>
                  <div>Edges loaded: {edges.length}</div>
                  <button 
                    onClick={() => console.log({nodes, edges})}
                    className="mt-2 bg-gray-200 px-2 py-1 rounded text-xs"
                  >
                    Log to Console
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsExpanded(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg flex items-center justify-center"
          title="Show metrics and tools"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      )}
    </div>
  );
} 