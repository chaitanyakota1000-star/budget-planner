import React, { useState } from 'react';
import { apiClient } from '../apiClient';

const API_BASE = 'http://localhost:5000/api';

export function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!username.trim() || !password || (!isLogin && !email.trim())) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    try {
      const response = await apiClient.post(`${API_BASE}${endpoint}`, isLogin ? {
        username: username.trim(),
        password
      } : {
        username: username.trim(),
        password,
        email: email.trim()
      });

      const data = await response.json();
      if (response.ok) {
        onLoginSuccess(data.id, data.username);
      } else {
        setError(data.error || 'Authentication failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to connect to authentication server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', padding: '1rem', position: 'fixed', top: 0, left: 0, zIndex: 9999, background: 'var(--bg-primary)', backgroundImage: 'radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(6, 182, 212, 0.12) 0px, transparent 50%)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(99, 102, 241, 0.2)', position: 'relative' }}>
        
        {/* Connection status badge */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: apiClient.getMode() === 'backend' ? 'rgba(76, 175, 80, 0.12)' : 'rgba(255, 152, 0, 0.12)',
          color: apiClient.getMode() === 'backend' ? '#81c784' : '#ffb74d',
          border: apiClient.getMode() === 'backend' ? '1px solid rgba(76, 175, 80, 0.2)' : '1px solid rgba(255, 152, 0, 0.2)',
          fontSize: '0.7rem',
          padding: '2px 8px',
          borderRadius: '20px',
          fontWeight: 600
        }}>
          {apiClient.getMode() === 'backend' ? 'CONNECTED' : 'OFFLINE MODE'}
        </div>

        {/* Branding header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', textAlign: 'center' }}>
          <div className="logo-icon" style={{ width: '48px', height: '48px', borderRadius: '12px', marginBottom: '0.75rem' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18c3-1 5-9 10-9s4 4 7 4 3-4 3-8" /><path d="M2 13c3-1 5-9 10-9s4 4 7 4" style={{ opacity: 0.4 }} /><polyline points="17 5 22 5 22 10" /></svg>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>FinFlow</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {isLogin ? 'Log in to manage your budgets' : 'Create an account to start saving'}
          </p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid var(--color-expense)', borderRadius: '6px', fontSize: '0.8rem', color: '#fca5a5', marginBottom: '1.25rem' }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(34, 197, 94, 0.1)', borderLeft: '3px solid var(--color-income)', borderRadius: '6px', fontSize: '0.8rem', color: '#86efac', marginBottom: '1.25rem' }}>
            ✅ {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="auth-username">Username</label>
            <input 
              type="text" 
              id="auth-username" 
              className="form-control" 
              placeholder="Enter username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required 
            />
          </div>

          {!isLogin && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="auth-email">Email Address</label>
              <input 
                type="email" 
                id="auth-email" 
                className="form-control" 
                placeholder="chait@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required 
              />
            </div>
          )}

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="auth-password">Password</label>
            <input 
              type="password" 
              id="auth-password" 
              className="form-control" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required 
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Please wait...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        <div style={{ marginTop: '2.0rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button" 
            style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer', outline: 'none' }}
            onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
            disabled={loading}
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </div>
      </div>
    </div>
  );
}
