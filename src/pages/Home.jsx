import React from 'react';
import { Link } from 'react-router-dom';
import DemoSlideshow from '../components/DemoSlideshow';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">CrewBuilder</h1>
          <Link 
            to="/builder"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Open Builder
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Build AI Agent Workflows Without Code
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
            Create, configure, and connect AI agents visually. Export to Python or YAML for use with CrewAI.
          </p>
          <div className="mt-8">
            <Link
              to="/builder"
              className="px-8 py-3 bg-blue-600 text-white rounded-md text-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Start Building
            </Link>
          </div>
        </div>

        <DemoSlideshow />
        
        <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Visual Workflow Design</h3>
            <p className="text-gray-600">
              Drag and drop agents, tasks, and tools to create complex AI workflows without writing code.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-green-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Code Export</h3>
            <p className="text-gray-600">
              Export your workflow as Python or YAML code ready to use with the CrewAI framework.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-purple-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Tool Templates</h3>
            <p className="text-gray-600">
              Choose from pre-built tool templates or create custom tools to extend agent capabilities.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
