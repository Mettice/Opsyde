import React from 'react';

const Notification = ({ message, type, onClose, id }) => {
  // Determine background color based on notification type
  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-500 text-green-700';
      case 'error':
        return 'bg-red-100 border-red-500 text-red-700';
      case 'warning':
        return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      default:
        return 'bg-blue-100 border-blue-500 text-blue-700';
    }
  };

  return (
    <div 
      className={`fixed bottom-4 right-4 p-4 rounded border-l-4 shadow-md ${getBgColor()} max-w-md`}
      style={{ zIndex: 9999 }}
    >
      <div className="flex justify-between items-center">
        <div className="flex-grow">
          {/* Make sure message is a string */}
          {typeof message === 'string' ? message : JSON.stringify(message)}
        </div>
        <button 
          onClick={onClose} 
          className="ml-4 text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Notification; 