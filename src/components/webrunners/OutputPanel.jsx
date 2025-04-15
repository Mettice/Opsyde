import React, { useState } from 'react';

export default function OutputPanel({ logs, onExport, isMinimized, onToggleMinimize }) {
  const [emailConfig, setEmailConfig] = useState({ to: '', showForm: false });
  const [discordConfig, setDiscordConfig] = useState({ webhook: '', showForm: false });
  const [sheetsConfig, setSheetsConfig] = useState({ sheetName: 'Opsyde Logs', showForm: false });
  
  if (isMinimized) {
    return (
      <div 
        className="fixed top-20 right-6 bg-green-600 text-white p-3 rounded-full shadow-lg cursor-pointer z-50"
        onClick={onToggleMinimize}
        title="Expand export options"
      >
        <span className="text-xl">📤</span>
      </div>
    );
  }

  const handleEmailExport = () => {
    if (emailConfig.showForm) {
      if (emailConfig.to && emailConfig.to.includes('@')) {
        onExport('email', { to: emailConfig.to });
        setEmailConfig({ ...emailConfig, showForm: false });
      }
    } else {
      setEmailConfig({ ...emailConfig, showForm: true });
    }
  };

  const handleDiscordExport = () => {
    if (discordConfig.showForm) {
      if (discordConfig.webhook && discordConfig.webhook.startsWith('https://discord.com/api/webhooks/')) {
        onExport('discord', { webhook_url: discordConfig.webhook });
        setDiscordConfig({ ...discordConfig, showForm: false });
      }
    } else {
      setDiscordConfig({ ...discordConfig, showForm: true });
    }
  };

  const handleSheetsExport = () => {
    if (sheetsConfig.showForm) {
      if (sheetsConfig.sheetName) {
        onExport('sheets', { sheet_name: sheetsConfig.sheetName });
        setSheetsConfig({ ...sheetsConfig, showForm: false });
      }
    } else {
      setSheetsConfig({ ...sheetsConfig, showForm: true });
    }
  };

  return (
    <div className="fixed top-6 right-6 w-[350px] bg-white border shadow-lg rounded-lg p-4 z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold">📤 Export Options</h3>
        <div className="flex gap-2">
          <button 
            onClick={onToggleMinimize}
            className="text-gray-500 hover:text-gray-700"
            title="Minimize panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-3">
        <button
          onClick={() => onExport('yaml')}
          className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded hover:bg-yellow-200 transition flex items-center"
        >
          <span className="mr-2">📄</span> Export YAML
        </button>
        
        <button
          onClick={() => onExport('json')}
          className="bg-gray-100 text-gray-800 px-4 py-2 rounded hover:bg-gray-200 transition flex items-center"
        >
          <span className="mr-2">🧾</span> Export JSON
        </button>
        
        <div className="border-t my-2"></div>
        
        <div>
          <button
            onClick={handleEmailExport}
            className="w-full bg-blue-100 text-blue-800 px-4 py-2 rounded hover:bg-blue-200 transition flex items-center justify-between"
          >
            <span className="flex items-center">
              <span className="mr-2">📧</span> Send to Email
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${emailConfig.showForm ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          
          {emailConfig.showForm && (
            <div className="mt-2 p-3 bg-blue-50 rounded">
              <input
                type="email"
                placeholder="Enter email address"
                value={emailConfig.to}
                onChange={(e) => setEmailConfig({ ...emailConfig, to: e.target.value })}
                className="w-full px-3 py-2 border rounded mb-2"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => setEmailConfig({ ...emailConfig, showForm: false })}
                  className="px-3 py-1 bg-gray-200 rounded mr-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmailExport}
                  disabled={!emailConfig.to || !emailConfig.to.includes('@')}
                  className={`px-3 py-1 rounded ${!emailConfig.to || !emailConfig.to.includes('@') ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white'}`}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div>
          <button
            onClick={handleSheetsExport}
            className="w-full bg-green-100 text-green-800 px-4 py-2 rounded hover:bg-green-200 transition flex items-center justify-between"
          >
            <span className="flex items-center">
              <span className="mr-2">📊</span> Export to Sheets
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${sheetsConfig.showForm ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          
          {sheetsConfig.showForm && (
            <div className="mt-2 p-3 bg-green-50 rounded">
              <input
                type="text"
                placeholder="Sheet name"
                value={sheetsConfig.sheetName}
                onChange={(e) => setSheetsConfig({ ...sheetsConfig, sheetName: e.target.value })}
                className="w-full px-3 py-2 border rounded mb-2"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => setSheetsConfig({ ...sheetsConfig, showForm: false })}
                  className="px-3 py-1 bg-gray-200 rounded mr-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSheetsExport}
                  disabled={!sheetsConfig.sheetName}
                  className={`px-3 py-1 rounded ${!sheetsConfig.sheetName ? 'bg-gray-300 text-gray-500' : 'bg-green-600 text-white'}`}
                >
                  Export
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div>
          <button
            onClick={handleDiscordExport}
            className="w-full bg-purple-100 text-purple-800 px-4 py-2 rounded hover:bg-purple-200 transition flex items-center justify-between"
          >
            <span className="flex items-center">
              <span className="mr-2">💬</span> Post to Discord
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${discordConfig.showForm ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          
          {discordConfig.showForm && (
            <div className="mt-2 p-3 bg-purple-50 rounded">
              <input
                type="text"
                placeholder="Discord webhook URL"
                value={discordConfig.webhook}
                onChange={(e) => setDiscordConfig({ ...discordConfig, webhook: e.target.value })}
                className="w-full px-3 py-2 border rounded mb-2"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => setDiscordConfig({ ...discordConfig, showForm: false })}
                  className="px-3 py-1 bg-gray-200 rounded mr-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDiscordExport}
                  disabled={!discordConfig.webhook || !discordConfig.webhook.startsWith('https://discord.com/api/webhooks/')}
                  className={`px-3 py-1 rounded ${!discordConfig.webhook || !discordConfig.webhook.startsWith('https://discord.com/api/webhooks/') ? 'bg-gray-300 text-gray-500' : 'bg-purple-600 text-white'}`}
                >
                  Post
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}