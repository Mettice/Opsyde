
import React from 'react';

export default function ExecutionLog({ logs }) {
  return (
    <div className="fixed bottom-0 left-0 w-full max-h-60 bg-black text-white overflow-y-auto p-4 text-sm font-mono shadow-inner z-50">
      <pre>{logs}</pre>
    </div>
  );
}
