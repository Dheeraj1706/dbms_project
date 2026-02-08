import React, { useState } from 'react';
import { authAPI } from '../services/api';
import ThemeToggle from './ThemeToggle';
import './LoginSignup.css';

function LoginSignup({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        const response = await authAPI.login(formData.email, formData.password);
        if (response.success && response.user) {
          onLogin(response.user);
        } else {
          setError(response.error || 'Login failed');
        }
      } else {
        const response = await authAPI.signup(
          formData.name,
          formData.email,
          formData.password,
          formData.role
        );
        if (response.success) {
          if (response.user) {
            onLogin(response.user);
          } else {
            setSuccess(response.message || 'Account created. Please wait for admin approval before logging in.');
          }
        } else {
          setError(response.error || 'Signup failed');
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-header-top">
            <h1>🎓 CourseHub</h1>
            <ThemeToggle />
          </div>
          <p>{isLogin ? 'Welcome back!' : 'Create your account'}</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`tab ${isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            className={`tab ${!isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input"
                required
                placeholder="Enter your name"
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input"
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input"
              required
              placeholder="Enter your password"
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input"
              >
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="administrator">Administrator</option>
                <option value="data_analyst">Data Analyst</option>
              </select>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Please wait...' : isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginSignup;
