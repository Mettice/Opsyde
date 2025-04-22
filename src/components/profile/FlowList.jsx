import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function FlowList({ flows, onDelete }) {
  const navigate = useNavigate();

  const handleLoadFlow = (flow) => {
    // Store the flow data in localStorage
    localStorage.setItem('currentFlow', JSON.stringify({
      id: flow.id,
      name: flow.name,
      nodes: flow.nodes,
      edges: flow.edges
    }));
    
    // Navigate to builder
    navigate('/builder');
  };

  if (flows.length === 0) {
    return (
      <div className="text-center py-10 bg-white shadow overflow-hidden sm:rounded-lg">
        <svg className="h-16 w-16 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No flows</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating a new flow.</p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/builder')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            New Flow
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <ul className="divide-y divide-gray-200">
        {flows.map((flow) => (
          <li key={flow.id} className="hover:bg-gray-50">
            <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-indigo-600">{flow.name}</div>
                  <div className="text-sm text-gray-500">
                    Created: {new Date(flow.created_at).toLocaleDateString()}
                    {flow.updated_at && flow.updated_at !== flow.created_at && 
                      ` • Updated: ${new Date(flow.updated_at).toLocaleDateString()}`
                    }
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleLoadFlow(flow)}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                >
                  Open
                </button>
                <button
                  onClick={() => onDelete(flow.id)}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
} 