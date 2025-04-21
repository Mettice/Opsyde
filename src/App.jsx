import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import HomePage from './pages/Home';
import BuilderPage from './pages/BuilderPage';
import Login from './auth/Login';
import Signup from './auth/Signup';
import Profile from './pages/Profile';
import NavHeader from './components/profile/NavHeader';
import './App.css';
import { Toaster } from 'react-hot-toast';

// Protected route component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={
            <div className="app-container flex flex-col" style={{ width: '100vw', height: '100vh' }}>
              <NavHeader isBuilderPage={false} />
              <div className="flex-1 overflow-auto">
                <HomePage />
              </div>
            </div>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/profile" element={
            <ProtectedRoute>
              <div className="app-container flex flex-col" style={{ width: '100vw', height: '100vh' }}>
                <NavHeader isBuilderPage={false} />
                <div className="flex-1 overflow-auto">
                  <Profile />
                </div>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/builder" element={
            <ProtectedRoute>
              <BuilderPage />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
