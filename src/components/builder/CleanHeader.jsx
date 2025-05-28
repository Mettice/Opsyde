import React, { useState } from 'react';
import { 
  PlayIcon, 
  DocumentArrowDownIcon, 
  FolderOpenIcon,
  Cog6ToothIcon,
  ShareIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { 
  BookmarkIcon,
  EyeIcon
} from '@heroicons/react/24/solid';

const CleanHeader = ({ 
  projectName = "Untitled Workflow",
  onProjectNameChange,
  onSave,
  onLoad,
  onRun,
  onPreview,
  onExport,
  onImport,
  onDuplicate,
  isExecuting = false,
  className = ""
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(projectName);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleNameEdit = () => {
    setIsEditingName(true);
    setTempName(projectName);
  };

  const handleNameSave = () => {
    setIsEditingName(false);
    if (onProjectNameChange) {
      onProjectNameChange(tempName);
    }
  };

  const handleNameCancel = () => {
    setIsEditingName(false);
    setTempName(projectName);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      handleNameCancel();
    }
  };

  return (
    <header className={`bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between ${className}`}>
      {/* Left: Logo and Project Name */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="font-semibold text-gray-900">Nodai</span>
        </div>
        
        <div className="h-6 w-px bg-gray-300"></div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Project:</span>
          {isEditingName ? (
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleKeyPress}
              className="text-sm font-medium text-gray-900 bg-transparent border-b border-blue-500 focus:outline-none min-w-[200px]"
              autoFocus
            />
          ) : (
            <button
              onClick={handleNameEdit}
              className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
            >
              {projectName}
            </button>
          )}
        </div>
      </div>

      {/* Center: Main Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors"
        >
          <BookmarkIcon className="h-4 w-4" />
          Save
        </button>

        <button
          onClick={onLoad}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors"
        >
          <FolderOpenIcon className="h-4 w-4" />
          Load
        </button>
      </div>

      {/* Right: Secondary Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPreview}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Preview"
        >
          <EyeIcon className="h-5 w-5" />
        </button>

        <button
          onClick={onExport}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Export"
        >
          <ShareIcon className="h-5 w-5" />
        </button>

        {/* More Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="More options"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </button>

          {showMoreMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowMoreMenu(false)}
              ></div>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <button
                  onClick={() => {
                    onImport && onImport();
                    setShowMoreMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Import CrewAI
                </button>
                <button
                  onClick={() => {
                    onDuplicate && onDuplicate();
                    setShowMoreMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Duplicate
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Settings
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default CleanHeader; 