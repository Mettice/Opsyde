import React from 'react';

export default function ToolTemplatesHeader({ onClose }) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-bold">Add Tool</h2>
      <button 
        onClick={onClose}
        className="text-gray-500 hover:text-gray-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
} 