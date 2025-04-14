import React from 'react';
import { Link } from 'react-router-dom';
import DemoSlideshow from '../components/DemoSlideshow';
import Logo from '/opsydelogo2.png';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
      {/* Header with improved styling */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={Logo} alt="Opsyde Logo" className="h-10 w-10 transition-transform hover:scale-110" />
            <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Opsyde</h1>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="text-gray-600 hover:text-blue-600 font-medium">Features</a>
            <a href="#demo" className="text-gray-600 hover:text-blue-600 font-medium">Demo</a>
            <a href="#memora" className="text-gray-600 hover:text-blue-600 font-medium">Memora</a>
            <Link 
              to="/builder"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
            >
              Open Builder
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with animation and improved styling */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-50"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative">
          <div className="text-center mb-16 animate-fadeIn">
            <h2 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl leading-tight">
              Build AI Agent Workflows <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Visually</span>
            </h2>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600 leading-relaxed">
              Connect, configure, and deploy autonomous AI agents without writing code. 
              Export to Python or YAML for seamless integration with CrewAI.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link
                to="/builder"
                className="px-8 py-4 bg-blue-600 text-white rounded-md text-lg font-semibold hover:bg-blue-700 transition-all transform hover:-translate-y-1 hover:shadow-lg"
              >
                Start Building
              </Link>
              <a 
                href="#demo" 
                className="px-8 py-4 bg-white text-blue-600 border border-blue-200 rounded-md text-lg font-semibold hover:bg-blue-50 transition-all transform hover:-translate-y-1 hover:shadow-md"
              >
                Watch Demo
              </a>
            </div>
          </div>
          
          {/* Stats section */}
          <div className="grid grid-cols-3 gap-8 max-w-4xl mx-auto mt-16 mb-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">100+</div>
              <div className="text-gray-600 mt-2">Tool Templates</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-indigo-600">10x</div>
              <div className="text-gray-600 mt-2">Faster Development</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600">0</div>
              <div className="text-gray-600 mt-2">Lines of Code Needed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features with improved cards */}
      <div id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 bg-white">
        <h2 className="text-3xl font-bold text-center mb-16 text-gray-900">
          <span className="border-b-4 border-blue-500 pb-2">Powerful Features</span>
        </h2>
        
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-gradient-to-br from-white to-blue-50 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 border border-blue-100">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-blue-600">Visual Workflow Design</h3>
            <p className="text-gray-600 leading-relaxed">
              Drag and drop agents, tools, and tasks to instantly design agent workflows without any code. Connect components visually to create powerful AI systems.
            </p>
          </div>

          <div className="bg-gradient-to-br from-white to-green-50 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 border border-green-100">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-green-600">Code Export</h3>
            <p className="text-gray-600 leading-relaxed">
              Export your entire workflow to ready-to-run Python or YAML files for seamless CrewAI integration. No manual coding required to implement your designs.
            </p>
          </div>

          <div className="bg-gradient-to-br from-white to-purple-50 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 border border-purple-100">
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-purple-600">Template Library</h3>
            <p className="text-gray-600 leading-relaxed">
              Use prebuilt templates for agents, tasks, tools, and full flows to accelerate your workflow setup. Start with proven patterns and customize to your needs.
            </p>
          </div>

          <div className="bg-gradient-to-br from-white to-indigo-50 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 border border-indigo-100">
            <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-indigo-600">Real-time Preview</h3>
            <p className="text-gray-600 leading-relaxed">
              Preview your agent workflows in real-time before deployment. Visualize the execution flow and identify potential issues early in the design process.
            </p>
          </div>

          <div className="bg-gradient-to-br from-white to-yellow-50 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 border border-yellow-100">
            <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-yellow-600">Free Plan</h3>
            <p className="text-gray-600 leading-relaxed">
              Get started completely free. Build and export workflows, use public templates, and manage basic memory with no cost. Upgrade only when you need more.
            </p>
          </div>

          <div className="bg-gradient-to-br from-white to-red-50 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 border border-red-100">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-red-600">Enterprise Features</h3>
            <p className="text-gray-600 leading-relaxed">
              Unlock enterprise-grade capabilities: team workspaces, project versioning, agent memory sync, API runtime integration and more.
            </p>
            <a href="mailto:contact@opsyde.com" className="inline-block mt-4 text-blue-600 font-medium hover:text-blue-800 transition-colors">Contact Us →</a>
          </div>
        </div>
      </div>

      {/* Demo Section with better framing */}
      <div id="demo" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-900">
            <span className="border-b-4 border-blue-500 pb-2">See It In Action</span>
          </h2>
          <p className="text-center text-xl text-gray-600 max-w-3xl mx-auto mb-12">
            Watch how easy it is to build complex AI agent workflows in minutes instead of hours
          </p>
          
          <div className="rounded-xl overflow-hidden shadow-2xl border-4 border-white">
            <DemoSlideshow />
          </div>
          
          <div className="mt-12 text-center">
            <Link
              to="/builder"
              className="px-8 py-4 bg-blue-600 text-white rounded-md text-lg font-semibold hover:bg-blue-700 transition-all transform hover:-translate-y-1 hover:shadow-lg"
            >
              Try It Yourself
            </Link>
          </div>
        </div>
      </div>

      {/* Memora Section with improved styling */}
      <div id="memora" className="py-24 bg-gradient-to-br from-blue-900 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <h2 className="text-4xl font-bold mb-6">Introducing Memora 📚</h2>
              <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                Memora is our plug-and-play AI memory manager — organize, retrieve, and optimize your agent's memory with timeline views, tagging, pruning, and context switching.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <svg className="h-6 w-6 text-blue-300 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Persistent memory across agent sessions</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-6 w-6 text-blue-300 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Intelligent memory pruning and summarization</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-6 w-6 text-blue-300 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Visual timeline of agent interactions</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-6 w-6 text-blue-300 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Seamless integration with CrewAI</span>
                </li>
              </ul>
              <a
                href="https://forms.gle/your-memora-waitlist-form"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-white text-blue-900 px-8 py-4 rounded-md text-lg font-medium transition-all transform hover:-translate-y-1 hover:shadow-lg"
              >
                Join Memora Waitlist
              </a>
            </div>
            <div className="md:w-1/2 mt-8 md:mt-0">
              <div className="bg-white p-2 rounded-xl shadow-2xl transform rotate-2">
                <img 
                  src="/memora-preview.png" 
                  alt="Memora Preview" 
                  className="rounded-lg"
                  onError={(e) => {e.target.src = 'https://placehold.co/600x400/e2e8f0/475569?text=Memora+Preview'}}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-6 md:mb-0">
              <img src={Logo} alt="Opsyde Logo" className="h-10 w-10" />
              <h1 className="text-2xl font-extrabold">Opsyde</h1>
            </div>
            <div className="flex flex-wrap gap-8 justify-center">
              <a href="#" className="hover:text-blue-400 transition-colors">About</a>
              <a href="#" className="hover:text-blue-400 transition-colors">Blog</a>
              <a href="#" className="hover:text-blue-400 transition-colors">Pricing</a>
              <a href="#" className="hover:text-blue-400 transition-colors">Documentation</a>
              <a href="mailto:contact@opsyde.com" className="hover:text-blue-400 transition-colors">Contact</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>© {new Date().getFullYear()} Opsyde. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
