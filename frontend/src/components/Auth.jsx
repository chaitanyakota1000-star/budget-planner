import React, { useState, useEffect } from 'react';
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
  
  // Verification states
  const [needsVerify, setNeedsVerify] = useState(false);
  const [verifyUserId, setVerifyUserId] = useState('');
  const [otpCode, setOtpCode] = useState('');

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
      const response = await apiClient.post(`http://localhost:5000${endpoint}`, isLogin ? {
        username: username.trim(),
        password
      } : {
        username: username.trim(),
        password,
        email: email.trim()
      });

      const data = await response.json();
      if (response.ok) {
        if (data.needsVerification) {
          setNeedsVerify(true);
          setVerifyUserId(data.id || data.userId);
          setSuccess('Account created! A 6-digit OTP verification code has been sent to your email.');
        } else {
          onLoginSuccess(data.id || data.userId, data.username);
        }
      } else {
        if (response.status === 403 && data.needsVerification) {
          setNeedsVerify(true);
          setVerifyUserId(data.userId);
          setError(data.error || 'Account email is not verified.');
          setSuccess('A new 6-digit OTP verification code has been sent to your email.');
        } else {
          setError(data.error || 'Authentication failed. Please try again.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to connect to authentication server');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError('Please enter a valid 6-digit OTP verification code');
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.post(`http://localhost:5000/api/auth/verify`, {
        userId: verifyUserId,
        code: otpCode.trim()
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess('Email verified successfully! Logging you in...');
        setTimeout(() => {
          onLoginSuccess(data.userId || data.id, data.username);
        }, 1000);
      } else {
        setError(data.error || 'Verification failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to connect to authentication server during verification');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await apiClient.post(`http://localhost:5000/api/auth/resend`, {
        userId: verifyUserId
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message || 'Verification OTP code resent successfully!');
      } else {
        setError(data.error || 'Failed to resend code. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to connect to authentication server for resending');
    } finally {
      setLoading(false);
    }
  };

  if (needsVerify) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', padding: '1rem', position: 'fixed', top: 0, left: 0, zIndex: 9999, background: 'var(--bg-primary)', backgroundImage: 'radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(6, 182, 212, 0.12) 0px, transparent 50%)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(99, 102, 241, 0.2)', position: 'relative' }}>
          
          {/* Connection status badge */}
          <div 
            onClick={() => {
              const newMode = apiClient.getMode() === 'backend' ? 'offline' : 'backend';
              apiClient.setMode(newMode);
              window.location.reload();
            }}
            title="Click to toggle connection mode (Backend vs Demo Mode)"
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: apiClient.getMode() === 'backend' ? 'rgba(76, 175, 80, 0.12)' : 'rgba(255, 152, 0, 0.12)',
              color: apiClient.getMode() === 'backend' ? '#81c784' : '#ffb74d',
              border: apiClient.getMode() === 'backend' ? '1px solid rgba(76, 175, 80, 0.2)' : '1px solid rgba(255, 152, 0, 0.2)',
              fontSize: '0.7rem',
              padding: '4px 10px',
              borderRadius: '20px',
              fontWeight: 600,
              cursor: 'pointer',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'background 0.2s'
            }}
          >
            <span style={{ fontSize: '0.55rem' }}>{apiClient.getMode() === 'backend' ? '🟢' : '⚡'}</span>
            {apiClient.getMode() === 'backend' ? 'CONNECTED' : 'OFFLINE MODE'}
          </div>

          {/* Branding header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', textAlign: 'center' }}>
            <div className="logo-icon" style={{ width: '48px', height: '48px', borderRadius: '12px', marginBottom: '0.75rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18c3-1 5-9 10-9s4 4 7 4 3-4 3-8" /><path d="M2 13c3-1 5-9 10-9s4 4 7 4" style={{ opacity: 0.4 }} /><polyline points="17 5 22 5 22 10" /></svg>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>Verify Your Email</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              We sent a 6-digit OTP verification code to your registered email address.
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

          <form onSubmit={handleVerifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="verify-otp">6-Digit OTP Code</label>
              <input 
                type="text" 
                id="verify-otp" 
                className="form-control" 
                placeholder="e.g. 123456" 
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading}
                required 
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px', fontWeight: 'bold' }}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify & Log In'}
            </button>
          </form>

          <div style={{ marginTop: '2.0rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <button 
              type="button" 
              style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer', outline: 'none' }}
              onClick={handleResendOtp}
              disabled={loading}
            >
              Resend Code
            </button>
            <button 
              type="button" 
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer', outline: 'none' }}
              onClick={() => { setNeedsVerify(false); setError(''); setSuccess(''); }}
              disabled={loading}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', padding: '1rem', position: 'fixed', top: 0, left: 0, zIndex: 9999, background: 'var(--bg-primary)', backgroundImage: 'radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(6, 182, 212, 0.12) 0px, transparent 50%)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(99, 102, 241, 0.2)', position: 'relative' }}>
        
        {/* Connection status badge */}
        <div 
          onClick={() => {
            const newMode = apiClient.getMode() === 'backend' ? 'offline' : 'backend';
            apiClient.setMode(newMode);
            window.location.reload();
          }}
          title="Click to toggle connection mode (Backend vs Demo Mode)"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: apiClient.getMode() === 'backend' ? 'rgba(76, 175, 80, 0.12)' : 'rgba(255, 152, 0, 0.12)',
            color: apiClient.getMode() === 'backend' ? '#81c784' : '#ffb74d',
            border: apiClient.getMode() === 'backend' ? '1px solid rgba(76, 175, 80, 0.2)' : '1px solid rgba(255, 152, 0, 0.2)',
            fontSize: '0.7rem',
            padding: '4px 10px',
            borderRadius: '20px',
            fontWeight: 600,
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'background 0.2s'
          }}
        >
          <span style={{ fontSize: '0.55rem' }}>{apiClient.getMode() === 'backend' ? '🟢' : '⚡'}</span>
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
