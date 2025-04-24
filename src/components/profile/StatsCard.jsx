import React from 'react';

const StatsCard = ({ title, value, icon, color, onClick }) => {
  const cardClass = onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : '';
  
  return (
    <div 
      className={`${color} rounded-lg p-6 ${cardClass}`}
      onClick={onClick}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">{icon}</div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="text-lg font-semibold text-gray-900">{value}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default StatsCard; 