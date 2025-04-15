import React from 'react';

export default function RunCrewButton({ onClick, isRunning, hasErrors, nodeCount }) {
  // Disable button if there are no nodes or if there are errors
  const isDisabled = isRunning || hasErrors || nodeCount === 0;
  
  // Determine button text based on state
  const buttonText = isRunning 
    ? "Running..." 
    : hasErrors 
      ? "Fix Errors to Run" 
      : nodeCount === 0 
        ? "Add Nodes to Run" 
        : "▶️ Run Crew";
  
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`fixed bottom-6 right-6 px-6 py-3 text-white rounded-full shadow-lg transition ${
        isRunning 
          ? "bg-blue-500 animate-pulse" 
          : hasErrors 
            ? "bg-red-600 hover:bg-red-700" 
            : nodeCount === 0 
              ? "bg-gray-500" 
              : "bg-blue-600 hover:bg-blue-700"
      }`}
      title={
        hasErrors 
          ? "There are errors in your workflow that need to be fixed" 
          : nodeCount === 0 
            ? "Add nodes to your workflow before running" 
            : "Execute your workflow"
      }
    >
      {buttonText}
    </button>
  );
}
