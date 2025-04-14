import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import DemoSlideshow from '../components/DemoSlideshow';
import Logo from '/opsydelogo2.png';

// Testimonials component
const TestimonialsSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const testimonials = [
    {
      id: 1,
      name: "Alex Chen",
      role: "Lead Developer, TechFuse",
      image: "/api/placeholder/64/64",
      text: "OpSyde has revolutionized how we build and deploy AI agents. What used to take days now takes hours, and the visual interface makes our entire team more productive."
    },
    {
      id: 2,
      name: "Sarah Johnson",
      role: "AI Product Manager, Innovate AI",
      image: "/api/placeholder/64/64",
      text: "The ability to visually design workflows and export to CrewAI is a game-changer. Our non-technical stakeholders can now participate in the agent design process."
    },
    {
      id: 3,
      name: "Michael Torres",
      role: "CTO, AgentStack",
      image: "/api/placeholder/64/64",
      text: "Memora's memory management capabilities solved our biggest pain point with long-running agents. The timeline view gives us insights we never had before."
    }
  ];

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className="relative overflow-hidden bg-gray-900 rounded-xl p-8 shadow-lg">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-gray-900 to-purple-900 opacity-90"></div>
      
      <div className="relative z-10">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-white">What Developers Say</h3>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center bg-gray-800 bg-opacity-50 rounded-xl p-6 shadow-lg border border-purple-500 border-opacity-30">
            <div className="mr-6">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-cyan-400 shadow-lg shadow-cyan-400/20">
                <img src={testimonials[currentIndex].image} alt={testimonials[currentIndex].name} className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-white text-lg italic mb-4">"{testimonials[currentIndex].text}"</p>
              <div className="flex items-center">
                <span className="font-semibold text-cyan-400">{testimonials[currentIndex].name}</span>
                <span className="mx-2 text-gray-400">|</span>
                <span className="text-gray-300">{testimonials[currentIndex].role}</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center mt-6 space-x-4">
            <button 
              onClick={prevSlide}
              className="p-2 rounded-full bg-gray-800 text-white hover:bg-purple-900 transition-colors shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex space-x-2">
              {testimonials.map((_, index) => (
                <button 
                  key={index} 
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full ${index === currentIndex ? 'bg-cyan-400' : 'bg-gray-600'}`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            <button 
              onClick={nextSlide}
              className="p-2 rounded-full bg-gray-800 text-white hover:bg-purple-900 transition-colors shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      {/* Header with updated styling */}
      <header className="bg-gray-900 shadow-md sticky top-0 z-10 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={Logo} alt="OpsFlow Logo" className="h-10 w-10 transition-transform hover:scale-110" />
            <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-cyan-400">OpSyde</h1>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="text-gray-300 hover:text-cyan-400 font-medium">Features</a>
            <a href="#demo" className="text-gray-300 hover:text-cyan-400 font-medium">Demo</a>
            <a href="#memora" className="text-gray-300 hover:text-cyan-400 font-medium">Memora</a>
            <a href="#testimonials" className="text-gray-300 hover:text-cyan-400 font-medium">Testimonials</a>
            <Link 
              to="/builder"
              className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-md hover:from-orange-500 hover:to-red-500 transition-colors shadow-lg hover:shadow-orange-500/20"
            >
              Open Builder
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with updated styling */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-cyan-900/20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative">
          <div className="text-center mb-16 animate-fadeIn">
            <h2 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl leading-tight">
              Build AI Agent Workflows <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">Visually</span>
            </h2>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-300 leading-relaxed">
              Connect, configure, and deploy autonomous AI agents without writing code. 
              Export to Python or YAML for seamless integration with CrewAI.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link
                to="/builder"
                className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-md text-lg font-semibold hover:from-orange-500 hover:to-red-500 transition-all transform hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-500/20"
              >
                Start Building
              </Link>
              <a 
                href="#demo" 
                className="px-8 py-4 bg-gray-800 text-cyan-400 border border-cyan-900 rounded-md text-lg font-semibold hover:bg-gray-700 transition-all transform hover:-translate-y-1 hover:shadow-md hover:shadow-cyan-600/20"
              >
                Watch Demo
              </a>
            </div>
          </div>
          
          {/* Stats section */}
          <div className="grid grid-cols-3 gap-8 max-w-4xl mx-auto mt-16 mb-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-cyan-400">100+</div>
              <div className="text-gray-300 mt-2">Tool Templates</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-500">10x</div>
              <div className="text-gray-300 mt-2">Faster Development</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-500">0</div>
              <div className="text-gray-300 mt-2">Lines of Code Needed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features with neumorphic cards */}
      <div id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 bg-gray-900">
        <h2 className="text-3xl font-bold text-center mb-16 text-white">
          <span className="border-b-4 border-purple-600 pb-2">Powerful Features</span>
        </h2>
        
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-gray-800 p-8 rounded-xl shadow-[5px_5px_15px_rgba(0,0,0,0.3),-5px_-5px_15px_rgba(68,68,68,0.2)] hover:shadow-[8px_8px_20px_rgba(0,0,0,0.4),-8px_-8px_20px_rgba(68,68,68,0.3)] transition-all transform hover:-translate-y-2 border border-purple-900/50">
            <div className="w-14 h-14 bg-purple-900/50 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-purple-600/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-purple-400">Visual Workflow Design</h3>
            <p className="text-gray-300 leading-relaxed">
              Drag and drop agents, tools, and tasks to instantly design agent workflows without any code. Connect components visually to create powerful AI systems.
            </p>
          </div>

          <div className="bg-gray-800 p-8 rounded-xl shadow-[5px_5px_15px_rgba(0,0,0,0.3),-5px_-5px_15px_rgba(68,68,68,0.2)] hover:shadow-[8px_8px_20px_rgba(0,0,0,0.4),-8px_-8px_20px_rgba(68,68,68,0.3)] transition-all transform hover:-translate-y-2 border border-cyan-900/50">
            <div className="w-14 h-14 bg-cyan-900/50 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-cyan-600/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-cyan-400">Code Export</h3>
            <p className="text-gray-300 leading-relaxed">
              Export your entire workflow to ready-to-run Python or YAML files for seamless CrewAI integration. No manual coding required to implement your designs.
            </p>
          </div>

          <div className="bg-gray-800 p-8 rounded-xl shadow-[5px_5px_15px_rgba(0,0,0,0.3),-5px_-5px_15px_rgba(68,68,68,0.2)] hover:shadow-[8px_8px_20px_rgba(0,0,0,0.4),-8px_-8px_20px_rgba(68,68,68,0.3)] transition-all transform hover:-translate-y-2 border border-orange-900/50">
            <div className="w-14 h-14 bg-orange-900/50 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-orange-600/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-orange-400">Template Library</h3>
            <p className="text-gray-300 leading-relaxed">
              Use prebuilt templates for agents, tasks, tools, and full flows to accelerate your workflow setup. Start with proven patterns and customize to your needs.
            </p>
          </div>

          <div className="bg-gray-800 p-8 rounded-xl shadow-[5px_5px_15px_rgba(0,0,0,0.3),-5px_-5px_15px_rgba(68,68,68,0.2)] hover:shadow-[8px_8px_20px_rgba(0,0,0,0.4),-8px_-8px_20px_rgba(68,68,68,0.3)] transition-all transform hover:-translate-y-2 border border-purple-900/50">
            <div className="w-14 h-14 bg-purple-900/50 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-purple-600/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-purple-400">Real-time Preview</h3>
            <p className="text-gray-300 leading-relaxed">
              Preview your agent workflows in real-time before deployment. Visualize the execution flow and identify potential issues early in the design process.
            </p>
          </div>

          <div className="bg-gray-800 p-8 rounded-xl shadow-[5px_5px_15px_rgba(0,0,0,0.3),-5px_-5px_15px_rgba(68,68,68,0.2)] hover:shadow-[8px_8px_20px_rgba(0,0,0,0.4),-8px_-8px_20px_rgba(68,68,68,0.3)] transition-all transform hover:-translate-y-2 border border-cyan-900/50">
            <div className="w-14 h-14 bg-cyan-900/50 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-cyan-600/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-cyan-400">Free Plan</h3>
            <p className="text-gray-300 leading-relaxed">
              Get started completely free. Build and export workflows, use public templates, and manage basic memory with no cost. Upgrade only when you need more.
            </p>
          </div>

          <div className="bg-gray-800 p-8 rounded-xl shadow-[5px_5px_15px_rgba(0,0,0,0.3),-5px_-5px_15px_rgba(68,68,68,0.2)] hover:shadow-[8px_8px_20px_rgba(0,0,0,0.4),-8px_-8px_20px_rgba(68,68,68,0.3)] transition-all transform hover:-translate-y-2 border border-orange-900/50">
            <div className="w-14 h-14 bg-orange-900/50 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-orange-600/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-orange-400">Enterprise Features</h3>
            <p className="text-gray-300 leading-relaxed">
              Unlock enterprise-grade capabilities: team workspaces, project versioning, agent memory sync, API runtime integration and more.
            </p>
            <a href="mailto:contact@opsyde.com" className="inline-block mt-4 text-cyan-400 font-medium hover:text-cyan-300 transition-colors">Contact Us →</a>
          </div>
        </div>
      </div>

      {/* Demo Section with better framing */}
      <div id="demo" className="py-24 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8 text-white">
            <span className="border-b-4 border-cyan-400 pb-2">See It In Action</span>
          </h2>
          <p className="text-center text-xl text-gray-300 max-w-3xl mx-auto mb-12">
            Watch how easy it is to build complex AI agent workflows in minutes instead of hours
          </p>
          
          <div className="rounded-xl overflow-hidden shadow-2xl border-4 border-gray-700">
            <DemoSlideshow />
          </div>
          
          <div className="mt-12 text-center">
            <Link
              to="/builder"
              className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-md text-lg font-semibold hover:from-orange-500 hover:to-red-500 transition-all transform hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-500/20"
            >
              Try It Yourself
            </Link>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div id="testimonials" className="py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16 text-white">
            <span className="border-b-4 border-orange-500 pb-2">Developer Testimonials</span>
          </h2>
          
          <TestimonialsSlider />
        </div>
      </div>

      {/* Memora Section with improved styling */}
      <div id="memora" className="py-24 bg-gradient-to-br from-purple-900 to-cyan-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <h2 className="text-4xl font-bold mb-6">Introducing Memora 📚</h2>
              <p className="text-xl text-cyan-100 mb-8 leading-relaxed">
                Memora is our plug-and-play AI memory manager — organize, retrieve, and optimize your agent's memory with timeline views, tagging, pruning, and context switching.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <svg className="h-6 w-6 text-orange-400 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Persistent memory across agent sessions</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-6 w-6 text-orange-400 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Intelligent memory pruning and summarization</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-6 w-6 text-orange-400 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Visual timeline of agent interactions</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-6 w-6 text-orange-400 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Seamless integration with CrewAI</span>
                </li>
              </ul>
              <a
                href="https://forms.gle/your-memora-waitlist-form"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-gradient-to-r from-orange-600 to-red-600 text-white px-8 py-4 rounded-md text-lg font-medium transition-all transform hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-500/20"
              >
                Join Memora Waitlist
              </a>
            </div>
            <div className="md:w-1/2 mt-8 md:mt-0">
              <div className="bg-gray-800 p-2 rounded-xl shadow-2xl transform rotate-2 border border-purple-500/30">
                <img 
                  src="/memora-preview.png" 
                  alt="Memora Preview" 
                  className="rounded-lg"
                  onError={(e) => {e.target.src = '/api/placeholder/600/400'}}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with social links and CrewAI attribution */}
      <footer className="bg-gray-900 text-white py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <img src={Logo} alt="OpsFlow Logo" className="h-10 w-10" />
                <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-cyan-400">OpSyde</h1>
              </div>
              <p className="text-gray-400 mb-6">
                Building the future of AI agent workflows, one visual connection at a time.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors" aria-label="Twitter">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors" aria-label="GitHub">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                </a>
              </div>
            </div>
            
            <div className="col-span-3 grid grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Product</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Features</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Pricing</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Documentation</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Company</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">About</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Blog</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Contact</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Legal</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Privacy</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Terms</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>© {new Date().getFullYear()} OpSyde. All rights reserved.</p>
            <p className="mt-2 text-sm">Built with ❤️ for the CrewAI community</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
