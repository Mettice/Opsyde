import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/Home';
import BuilderPage from './pages/Builder';
import './App.css';

function App() {
  return (
    <Router>
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
