import React, { useState } from 'react';

export default function OutputConfigPanel({ outputConfig, setOutputConfig }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' or 'help'

  const handleToggle = (key) => {
    setOutputConfig(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleInput = (key, value) => {
    setOutputConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className={`transition-all duration-300 ${isCollapsed 
      ? 'fixed top-24 right-6 w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full shadow-lg flex items-center justify-center cursor-pointer z-50 hover:scale-110' 
      : 'fixed top-24 right-6 w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-0 z-50 overflow-hidden'}`}
      onClick={isCollapsed ? () => setIsCollapsed(false) : undefined}
    >
      {isCollapsed ? (
        <div className="relative">
          <span className="text-white text-xl">⚙️</span>
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
            {Object.values(outputConfig).filter(Boolean).length}
          </div>
        </div>
      ) : (
        <>
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-3 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">⚙️ Output Settings</h2>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(true);
              }}
              className="text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          <div className="flex border-b">
            <button 
              className={`flex-1 py-2 text-sm font-medium ${activeTab === 'settings' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-medium ${activeTab === 'help' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('help')}
            >
              Help
            </button>
          </div>

          {activeTab === 'settings' ? (
            <div className="p-4">
              <p className="text-xs text-gray-500 mb-3">
                Configure where to automatically send your workflow results after execution.
              </p>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <label className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium">📧 Email</span>
                      <p className="text-xs text-gray-500">Send results to your inbox</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={outputConfig.emailEnabled || false} 
                        onChange={() => handleToggle("emailEnabled")}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </label>
                  {outputConfig.emailEnabled && (
                    <input
                      type="email"
                      placeholder="Email address"
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={outputConfig.email || ""}
                      onChange={(e) => handleInput("email", e.target.value)}
                    />
                  )}
                </div>
                
                <div className="bg-purple-50 p-3 rounded-lg">
                  <label className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium">💬 Discord</span>
                      <p className="text-xs text-gray-500">Post to Discord channel</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={outputConfig.discordEnabled || false} 
                        onChange={() => handleToggle("discordEnabled")}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </label>
                  {outputConfig.discordEnabled && (
                    <input
                      type="text"
                      placeholder="Discord webhook URL"
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={outputConfig.discordWebhook || ""}
                      onChange={(e) => handleInput("discordWebhook", e.target.value)}
                    />
                  )}
                </div>
                
                <div className="bg-green-50 p-3 rounded-lg">
                  <label className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium">📊 Google Sheets</span>
                      <p className="text-xs text-gray-500">Log results to spreadsheet</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={outputConfig.sheetsEnabled || false} 
                        onChange={() => handleToggle("sheetsEnabled")}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </label>
                  {outputConfig.sheetsEnabled && (
                    <input
                      type="text"
                      placeholder="Sheet ID"
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={outputConfig.sheetId || ""}
                      onChange={(e) => handleInput("sheetId", e.target.value)}
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <h3 className="font-medium mb-2">About Output Settings</h3>
              <p className="text-sm text-gray-600 mb-3">
                This panel lets you configure automatic output destinations for your workflow results.
              </p>
              
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium">📧 Email</h4>
                  <p className="text-gray-600">Enter your email address to receive workflow results directly to your inbox.</p>
                </div>
                
                <div>
                  <h4 className="font-medium">💬 Discord</h4>
                  <p className="text-gray-600">Create a webhook in your Discord server settings and paste the URL here to post results to a channel.</p>
                </div>
                
                <div>
                  <h4 className="font-medium">📊 Google Sheets</h4>
                  <p className="text-gray-600">Enter a Google Sheet ID to log results. The Sheet ID is the long string in the URL between /d/ and /edit.</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
