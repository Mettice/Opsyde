import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import HomePage from './pages/Home';
import Builder from './pages/Builder';
import Login from './auth/Login';
import Signup from './auth/Signup';
import Dashboard from './pages/Dashboard';
import APIKeyManager from './components/APIKeyManager';
import WorkflowDashboard from './components/WorkflowDashboard';
import NavHeader from './components/profile/NavHeader';
import './App.css';
import { Toaster } from 'react-hot-toast';
import HelpPanel from './components/HelpPanel';

// Protected route component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
}

// Main app layout with NavHeader for non-builder pages
function AppLayout({ children }) {
  const location = useLocation();
  const isBuilderPage = location.pathname === '/builder';
  const isHomePage = location.pathname === '/';
  const [showHelp, setShowHelp] = useState(false);
  const [projectName, setProjectName] = useState("Untitled Workflow");
  const [editingProjectName, setEditingProjectName] = useState(false);
  
  // Don't render NavHeader for builder page or homepage (landing page)
  if (isBuilderPage || isHomePage) {
    return children;
  }
  
  return (
    <div className="app-container flex flex-col" style={{ width: '100vw', height: '100vh' }}>
      <NavHeader 
        showHelp={() => setShowHelp(true)} 
        projectName={projectName}
        editingProjectName={editingProjectName}
        setEditingProjectName={setEditingProjectName}
        setProjectName={setProjectName}
        isBuilderPage={false}
      />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
      
      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={
            <AppLayout>
              <HomePage />
            </AppLayout>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          } />
          <Route path="/builder" element={
            <ProtectedRoute>
              <Builder/>
            </ProtectedRoute>
          } />
          <Route path="/api-key-manager" element={
            <AppLayout>
              <APIKeyManager />
            </AppLayout>
          } />
          <Route path="/api-keys" element={
            <AppLayout>
              <APIKeyManager />
            </AppLayout>
          } />
          <Route path="/workflows" element={
            <ProtectedRoute>
              <WorkflowDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
