import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/Home';
import BuilderPage from './pages/BuilderPage';
import './App.css';
import { Toaster } from 'react-hot-toast';



function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <div className="app-container" style={{ width: '100vw', height: '100vh' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/builder" element={<BuilderPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
