import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Logo from '/nodai lo.png';

export default function NavHeader({ showHelp, projectName, editingProjectName, setEditingProjectName, setProjectName, isBuilderPage, toolbarProps }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  
  // Check if we're on the home page or dashboard
  const isHomePage = location.pathname === '/';
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/profile';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="bg-gray-800 text-white shadow-md z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Logo only */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <img src={Logo} alt="NodAi Logo" className="h-8 w-8 mr-2" />
              <span className="text-xl font-bold">Nodai</span>
            </Link>
            
            {/* Only show current page indicator */}
            {!isBuilderPage && (
              <div className="hidden md:block ml-6">
                {isDashboard && <span className="text-gray-300 text-sm">Dashboard</span>}
                {isHomePage && <span className="text-gray-300 text-sm">Home</span>}
              </div>
            )}
          </div>
          
          {/* Center - Project name (only on builder page) */}
          {isBuilderPage && (
            <div className="flex-1 flex justify-center">
              <div className="bg-gray-700 rounded-md px-4 py-2 flex items-center">
                <span className="text-gray-400 mr-2">Project:</span>
                {editingProjectName ? (
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onBlur={() => setEditingProjectName(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingProjectName(false)}
                    autoFocus
                    className="bg-gray-600 text-white px-2 py-1 rounded"
                  />
                ) : (
                  <span className="font-medium cursor-pointer" onClick={() => setEditingProjectName(true)}>
                    {projectName}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Builder Tools - Only shown on builder page */}
          {isBuilderPage && toolbarProps && (
            <div className="hidden lg:flex items-center space-x-2 ml-4">
              <div className="flex space-x-1">
                <button 
                  onClick={toolbarProps.onAddAgent}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs flex items-center"
                >
                  <span className="mr-1">+</span>Agent
                </button>
                <button 
                  onClick={toolbarProps.onAddTask}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs flex items-center"
                >
                  <span className="mr-1">+</span>Task
                </button>
                <button 
                  onClick={toolbarProps.onAddTool}
                  className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs flex items-center"
                >
                  <span className="mr-1">+</span>Tool
                </button>
                <button 
                  onClick={toolbarProps.onAddTrigger}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded text-xs flex items-center"
                >
                  <span className="mr-1">+</span>Trigger
                </button>
              </div>
              
              <div className="h-6 border-l border-gray-600 mx-1"></div>
              
              <div className="flex space-x-1">
                <button 
                  onClick={toolbarProps.onSaveProject}
                  className="bg-pink-500 hover:bg-pink-600 text-white px-2 py-1 rounded text-xs flex items-center"
                >
                  Save
                </button>
                <button 
                  onClick={toolbarProps.onLoadProject}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs flex items-center"
                >
                  Load
                </button>
              </div>
              
              <div className="h-6 border-l border-gray-600 mx-1"></div>
              
              <div className="flex space-x-1">
                <button 
                  onClick={toolbarProps.onUndo}
                  disabled={!toolbarProps.canUndo}
                  className={`px-2 py-1 rounded text-xs flex items-center ${toolbarProps.canUndo ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                >
                  Undo
                </button>
                <button 
                  onClick={toolbarProps.onRedo}
                  disabled={!toolbarProps.canRedo}
                  className={`px-2 py-1 rounded text-xs flex items-center ${toolbarProps.canRedo ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                >
                  Redo
                </button>
              </div>
              
              <div className="h-6 border-l border-gray-600 mx-1"></div>
              
              <div className="relative">
                <button 
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="bg-teal-500 hover:bg-teal-600 text-white px-2 py-1 rounded text-xs flex items-center"
                >
                  Export <span className="ml-1">▼</span>
                </button>
                
                {showExportDropdown && (
                  <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg py-1 z-10">
                    <button
                      onClick={() => {
                        toolbarProps.onExportYAML();
                        setShowExportDropdown(false);
                      }}
                      className="block w-full text-left px-4 py-1 text-xs text-gray-700 hover:bg-gray-100"
                    >
                      YAML
                    </button>
                    <button
                      onClick={() => {
                        toolbarProps.onExportPython();
                        setShowExportDropdown(false);
                      }}
                      className="block w-full text-left px-4 py-1 text-xs text-gray-700 hover:bg-gray-100"
                    >
                      Python
                    </button>
                    <button
                      onClick={() => {
                        toolbarProps.onExportProject();
                        setShowExportDropdown(false);
                      }}
                      className="block w-full text-left px-4 py-1 text-xs text-gray-700 hover:bg-gray-100"
                    >
                      Project
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Right side - User dropdown menu */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {user ? (
                <div className="flex items-center space-x-4">
                  <div className="relative group">
                    <button 
                      className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                      <span className="sr-only">Open user menu</span>
                      <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-white">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    </button>
                    {isMenuOpen && (
                      <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                        <div className="px-4 py-2 text-xs text-gray-500">
                          {user.email}
                        </div>
                        
                        {/* Navigation links moved to dropdown */}
                        <Link 
                          to="/builder" 
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Builder
                        </Link>
                        
                        <Link 
                          to="/dashboard" 
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Dashboard
                        </Link>
                        
                        {isBuilderPage && (
                          <button
                            onClick={() => {
                              showHelp();
                              setIsMenuOpen(false);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Help
                          </button>
                        )}
                        
                        <div className="border-t border-gray-100 my-1"></div>
                        
                        <button
                          onClick={() => {
                            handleSignOut();
                            setIsMenuOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Only show sign in/up buttons on home page
                isHomePage && (
                  <div className="flex space-x-2">
                    <Link
                      to="/login"
                      className="px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/signup"
                      className="px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      Sign Up
                    </Link>
                  </div>
                )
              )}
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded="false"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <svg
                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden" id="mobile-menu">
          {/* Navigation links in mobile menu */}
          {user && (
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link
                to="/builder"
                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-gray-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Builder
              </Link>
              <Link
                to="/dashboard"
                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-gray-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
            </div>
          )}
          
          {/* Mobile builder tools */}
          {isBuilderPage && toolbarProps && (
            <div className="px-2 pt-2 pb-3 border-t border-gray-700">
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => {
                    toolbarProps.onAddAgent();
                    setIsMenuOpen(false);
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm"
                >
                  Add Agent
                </button>
                <button 
                  onClick={() => {
                    toolbarProps.onAddTask();
                    setIsMenuOpen(false);
                  }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded text-sm"
                >
                  Add Task
                </button>
                <button 
                  onClick={() => {
                    toolbarProps.onAddTool();
                    setIsMenuOpen(false);
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm"
                >
                  Add Tool
                </button>
                <button 
                  onClick={() => {
                    toolbarProps.onAddTrigger();
                    setIsMenuOpen(false);
                  }}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded text-sm"
                >
                  Add Trigger
                </button>
              </div>
              
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button 
                  onClick={() => {
                    toolbarProps.onSaveProject();
                    setIsMenuOpen(false);
                  }}
                  className="bg-pink-500 hover:bg-pink-600 text-white px-3 py-2 rounded text-sm"
                >
                  Save Project
                </button>
                <button 
                  onClick={() => {
                    toolbarProps.onLoadProject();
                    setIsMenuOpen(false);
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm"
                >
                  Load Project
                </button>
              </div>
            </div>
          )}
          
          <div className="pt-4 pb-3 border-t border-gray-700">
            {user ? (
              <div className="px-2 space-y-1">
                <div className="px-3 py-2 text-sm text-gray-300">{user.email}</div>
                {isBuilderPage && (
                  <button
                    onClick={() => {
                      showHelp();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white hover:bg-gray-700"
                  >
                    Help
                  </button>
                )}
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white hover:bg-gray-700"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              // Only show sign in/up buttons on home page
              isHomePage && (
                <div className="px-2 space-y-1">
                  <Link
                    to="/login"
                    className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-gray-700"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-gray-700"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </nav>
  );
} 