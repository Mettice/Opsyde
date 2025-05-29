import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { fetchFlows, deleteFlow, fetchExecutedTriggers } from '../api';
import { useNavigate, Link } from 'react-router-dom';
import { getUserProfile, updateUserProfile, initializeUserProfile } from '../services/userProfileService';
import StatsCard from '../components/profile/StatsCard';
import FlowList from '../components/profile/FlowList';
import ProfileSection from '../components/profile/ProfileSection';
import EditProfileModal from '../components/profile/EditProfileModal';
import { toast } from 'react-hot-toast';
import TriggerHistoryPanel from '../components/TriggerHistoryPanel';

export default function Dashboard() {
  const { user } = useAuth();
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: ''
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [stats, setStats] = useState({
    totalFlows: 0,
    lastActive: 'Never',
    completedFlows: 0
  });
  const [showTriggerHistory, setShowTriggerHistory] = useState(false);
  const [triggerStats, setTriggerStats] = useState({
    total: 0,
    completed: 0,
    active: 0
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    loadData();
    fetchTriggerStats();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetchFlows(user.id);
      
      if (Array.isArray(response)) {
        // Direct array response
        setFlows(response);
        setStats({
          totalFlows: response.length || 0,
          lastActive: response.length > 0 
            ? new Date(Math.max(...response.map(f => new Date(f.updated_at || f.created_at)))).toLocaleDateString() 
            : 'Never',
          completedFlows: response.filter(f => f.is_completed)?.length || 0
        });
      } else if (response && response.success) {
        // API wrapped response
        setFlows(response.data || []);
        setStats({
          totalFlows: response.data?.length || 0,
          lastActive: response.data?.length > 0 
            ? new Date(Math.max(...response.data.map(f => new Date(f.updated_at || f.created_at)))).toLocaleDateString() 
            : 'Never',
          completedFlows: response.data?.filter(f => f.is_completed)?.length || 0
        });
      } else {
        // Fall back to empty array
        setFlows([]);
        setStats({
          totalFlows: 0,
          lastActive: 'Never',
          completedFlows: 0
        });
        console.warn('Received unexpected response format from API', response);
      }
    } catch (error) {
      console.error('Error loading flows:', error);
      setError('Failed to load workflows. Please try again later.');
      setFlows([]);
      setStats({
        totalFlows: 0,
        lastActive: 'Never',
        completedFlows: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFlow = async (flowId) => {
    if (window.confirm('Are you sure you want to delete this flow?')) {
      try {
        await deleteFlow(flowId);
        setFlows(flows.filter(flow => flow.id !== flowId));
        toast.success('Flow deleted successfully');
        
        // Update stats
        setStats(prev => ({
          ...prev,
          totalFlows: prev.totalFlows - 1
        }));
      } catch (err) {
        setError('Failed to delete flow');
        toast.error('Failed to delete flow');
        console.error(err);
      }
    }
  };

  const handleProfileUpdate = async (formData) => {
    if (!user) return;
    
    try {
      const success = await updateUserProfile(user.id, formData);
      
      if (success) {
        setProfileData({
          ...profileData,
          ...formData
        });
        setShowEditModal(false);
        toast.success('Profile updated successfully');
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('An error occurred while updating your profile');
    }
  };

  const fetchTriggerStats = async () => {
    try {
      const triggers = await fetchExecutedTriggers();
      // Always ensure we handle triggers as an array, even if API returns null or undefined
      const triggersArray = Array.isArray(triggers) ? triggers : [];
      
      setTriggerStats({
        total: triggersArray.length || 0,
        completed: triggersArray.filter(t => t.status === 'completed')?.length || 0,
        active: triggersArray.filter(t => t.status === 'active')?.length || 0
      });
    } catch (error) {
      console.error('Error fetching trigger stats:', error);
      setTriggerStats({
        total: 0,
        completed: 0,
        active: 0
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {/* Profile Section */}
      <ProfileSection 
        profile={profileData}
        email={user.email}
        onEditClick={() => setShowEditModal(true)}
      />
      
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 my-8">
        <StatsCard 
          title="Total Flows" 
          value={stats.totalFlows} 
          icon={
            <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          } 
          color="bg-blue-100" 
        />
        
        <StatsCard 
          title="Last Active" 
          value={stats.lastActive} 
          icon={
            <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          } 
          color="bg-green-100" 
        />
        
        <StatsCard 
          title="Completed Flows" 
          value={stats.completedFlows} 
          icon={
            <svg className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          } 
          color="bg-purple-100" 
        />
        
        {/* New Trigger Stats Card */}
        <StatsCard 
          title="Active Triggers" 
          value={triggerStats.active}
          icon={
            <svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          } 
          color="bg-yellow-100"
          onClick={() => setShowTriggerHistory(true)}
        />
      </div>
      
      {/* Quick Access Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* API Key Manager Card */}
          <Link 
            to="/api-key-manager"
            className="block p-6 bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            <div className="flex items-center mb-3">
              <div className="p-2 bg-blue-500 rounded-lg mr-3">
                <span className="text-white text-xl">🔑</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">API Key Manager</h3>
            </div>
            <p className="text-gray-600 text-sm mb-3">
              Manage your API keys for unlimited LLM providers. Set once, use everywhere.
            </p>
            <div className="flex items-center text-blue-600 text-sm font-medium">
              <span>Manage Keys</span>
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
          
          {/* Builder Card */}
          <Link 
            to="/builder"
            className="block p-6 bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            <div className="flex items-center mb-3">
              <div className="p-2 bg-green-500 rounded-lg mr-3">
                <span className="text-white text-xl">🛠️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Workflow Builder</h3>
            </div>
            <p className="text-gray-600 text-sm mb-3">
              Create powerful AI workflows with drag-and-drop simplicity.
            </p>
            <div className="flex items-center text-green-600 text-sm font-medium">
              <span>Start Building</span>
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
          
          {/* Trigger History Card */}
          <button 
            onClick={() => setShowTriggerHistory(true)}
            className="block p-6 bg-gradient-to-br from-yellow-50 to-amber-100 border border-yellow-200 rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 text-left w-full"
          >
            <div className="flex items-center mb-3">
              <div className="p-2 bg-yellow-500 rounded-lg mr-3">
                <span className="text-white text-xl">⚡</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Trigger History</h3>
            </div>
            <p className="text-gray-600 text-sm mb-3">
              View and manage your automated workflow triggers.
            </p>
            <div className="flex items-center text-yellow-600 text-sm font-medium">
              <span>View History</span>
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>
      
      {/* Trigger History Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Recent Triggers</h2>
          <button
            onClick={() => setShowTriggerHistory(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            View Trigger History
          </button>
        </div>
      </div>
      
      {/* Flows Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Your Flows</h2>
          <button
            onClick={() => navigate('/builder')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create New Flow
          </button>
        </div>
        
        <FlowList flows={flows} onDelete={handleDeleteFlow} />
      </div>
      
      {/* Edit Profile Modal */}
      <EditProfileModal 
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        profile={profileData}
        onSave={handleProfileUpdate}
      />

      {/* Trigger History Modal */}
      <TriggerHistoryPanel 
        isVisible={showTriggerHistory}
        onClose={() => setShowTriggerHistory(false)}
      />
    </div>
  );
} 