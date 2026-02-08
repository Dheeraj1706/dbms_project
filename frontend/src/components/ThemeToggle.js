import React from 'react';
import { useTheme } from '../context/ThemeContext';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="theme-toggle-wrap">
      <span className="theme-label">{theme === 'bright' ? '☀️ Bright' : '🌙 Dark'}</span>
      <button
        type="button"
        className={`theme-toggle-btn ${theme}`}
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'bright' ? 'dark' : 'bright'} mode`}
      >
        <span className="theme-toggle-slider" />
      </button>
    </div>
  );
}
