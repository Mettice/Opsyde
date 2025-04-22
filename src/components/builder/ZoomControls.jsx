import React from 'react';

export default function ZoomControls({ zoomIn, zoomOut, resetView, fitView }) {
  return (
    <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md z-40 flex">
      <button 
        onClick={zoomIn}
        className="p-2 hover:bg-gray-100 text-gray-700 border-r border-gray-200"
        title="Zoom in"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
      <button 
        onClick={zoomOut}
        className="p-2 hover:bg-gray-100 text-gray-700 border-r border-gray-200"
        title="Zoom out"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
        </svg>
      </button>
      <button 
        onClick={fitView}
        className="p-2 hover:bg-gray-100 text-gray-700"
        title="Fit view"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
        </svg>
      </button>
    </div>
  );
} 