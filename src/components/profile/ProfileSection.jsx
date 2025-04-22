import React from 'react';

export default function ProfileSection({ profile, email, onEditClick }) {
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <div className="flex items-center">
          <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden">
            {profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="User avatar" 
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/80?text=User';
                }}
              />
            ) : (
              <span className="text-2xl font-bold text-indigo-600">
                {profile.full_name?.charAt(0) || email?.charAt(0).toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-bold text-gray-900">
              {profile.full_name || 'User'}
            </h2>
            <p className="text-sm text-gray-500">{email}</p>
          </div>
        </div>
        <button
          onClick={onEditClick}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Edit Profile
        </button>
      </div>
      
      {profile.bio && (
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <p className="text-sm text-gray-600">{profile.bio}</p>
        </div>
      )}
    </div>
  );
} 