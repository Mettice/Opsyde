import React from 'react';

export default function StatsCard({ title, value, icon, color }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 flex items-center">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div className="ml-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
    </div>
  );
} 