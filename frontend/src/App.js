import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import LoginSignup from './components/LoginSignup';
import StudentDashboard from './components/StudentDashboard';
import InstructorDashboard from './components/InstructorDashboard';
import AdminDashboard from './components/AdminDashboard';
import AnalystDashboard from './components/AnalystDashboard';
import './App.css';
import './components/Themes.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in (from localStorage)
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <ThemeProvider>
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            user ? <Navigate to="/dashboard" replace /> : 
            <LoginSignup onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            user ? (
              user.role === 'student' ? <StudentDashboard user={user} onLogout={handleLogout} /> :
              user.role === 'instructor' ? <InstructorDashboard user={user} onLogout={handleLogout} /> :
              user.role === 'administrator' ? <AdminDashboard user={user} onLogout={handleLogout} /> :
              user.role === 'data_analyst' ? <AnalystDashboard user={user} onLogout={handleLogout} /> :
              <Navigate to="/login" replace />
            ) : <Navigate to="/login" replace />
          } 
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
    </ThemeProvider>
  );
}

export default App;
