import React, { useState, useEffect } from 'react';
import { apiClient } from '../apiClient';

const API_BASE = 'http://localhost:5000/api';

export function Auth({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'verify'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyUserId, setVerifyUserId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Mock Mailbox State
  const [showMailbox, setShowMailbox] = useState(false);
  const [mockEmails, setMockEmails] = useState([]);

  // Fetch mock emails periodically during verification
  useEffect(() => {
    let interval;
    if (mode === 'verify') {
      const fetchEmails = async () => {
        try {
          const res = await apiClient.get(`${API_BASE}/auth/mock-emails`);
          if (res.ok) {
            const data = await res.json();
            setMockEmails(data);
          }
        } catch (e) {
          console.error('Failed to fetch mock emails', e);
        }
      };
      
      fetchEmails();
      interval = setInterval(fetchEmails, 3000);
    }
    return () => clearInterval(interval);
  }, [mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (mode === 'login') {
      if (!username.trim() || !password) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.post(`${API_BASE}/auth/login`, {
          username: username.trim(),
          password
        });

        const data = await response.json();
        if (response.ok) {
          onLoginSuccess(data.id, data.username);
        } else {
          if (data.needsVerification) {
            setVerifyUserId(data.userId);
            setMode('verify');
            setShowMailbox(true);
            setError(data.error || 'Please verify your email.');
          } else {
            setError(data.error || 'Invalid credentials');
          }
        }
      } catch (err) {
        setError('Failed to connect to authentication server');
      } finally {
        setLoading(false);
      }
    } else if (mode === 'register') {
      if (!username.trim() || !password || !email.trim()) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.post(`${API_BASE}/auth/register`, {
          username: username.trim(),
          password,
          email: email.trim()
        });

        const data = await response.json();
        if (response.ok) {
          setVerifyUserId(data.userId);
          setMode('verify');
          setShowMailbox(true);
          setSuccess('Account created! A verification code has been sent.');
        } else {
          setError(data.error || 'Registration failed');
        }
      } catch (err) {
        setError('Failed to connect to registration server');
      } finally {
        setLoading(false);
      }
    } else if (mode === 'verify') {
      if (!verificationCode.trim()) {
        setError('Please enter the 6-digit OTP code');
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.post(`${API_BASE}/auth/verify`, {
          userId: verifyUserId,
          code: verificationCode.trim()
        });

        const data = await response.json();
        if (response.ok) {
          setSuccess('Email verified! You can now log in.');
          setMode('login');
          setVerificationCode('');
          setShowMailbox(false);
        } else {
          setError(data.error || 'Invalid verification code');
        }
      } catch (err) {
        setError('Failed to verify code');
      } finally {
        setLoading(false);
      }
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
            {mode === 'login' && 'Log in to manage your budgets'}
            {mode === 'register' && 'Create an account to start saving'}
            {mode === 'verify' && 'Enter verification OTP code'}
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
          {mode !== 'verify' && (
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
          )}

          {mode === 'register' && (
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

          {mode !== 'verify' && (
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
          )}

          {mode === 'verify' && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="auth-otp">Verification OTP</label>
              <input 
                type="text" 
                id="auth-otp" 
                className="form-control" 
                placeholder="Enter 6-digit OTP" 
                maxLength="6"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                disabled={loading}
                required 
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                Enter the OTP sent to your email address to unlock your account.
              </p>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Please wait...' : (
              mode === 'login' ? 'Log In' : (mode === 'register' ? 'Sign Up' : 'Verify Code')
            )}
          </button>
        </form>

        <div style={{ marginTop: '2.0rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {mode === 'login' && (
            <div>
              Don't have an account?{' '}
              <button 
                type="button" 
                style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer', outline: 'none' }}
                onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
                disabled={loading}
              >
                Sign Up
              </button>
            </div>
          )}

          {mode === 'register' && (
            <div>
              Already have an account?{' '}
              <button 
                type="button" 
                style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer', outline: 'none' }}
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                disabled={loading}
              >
                Log In
              </button>
            </div>
          )}

          {mode === 'verify' && (
            <div>
              Back to{' '}
              <button 
                type="button" 
                style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer', outline: 'none' }}
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                disabled={loading}
              >
                Log In
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Developer Mock Mailbox drawer during verification or offline demo */}
      {showMailbox && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '360px',
          maxHeight: '400px',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 100000,
          display: 'flex',
          flexDirection: 'column',
          backdropFilter: 'blur(12px)',
          fontFamily: 'monospace',
          color: '#e2e8f0',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(99, 102, 241, 0.2)',
            padding: '8px 16px',
            borderBottom: '1px solid rgba(99, 102, 241, 0.3)'
          }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>✉️ Dev Mail Server (Local)</span>
            <button 
              onClick={() => setShowMailbox(!showMailbox)} 
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
            >
              ×
            </button>
          </div>

          {/* Mail list */}
          <div style={{ padding: '12px', overflowY: 'auto', flex: 1, fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {mockEmails.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0' }}>
                No emails sent yet. Trigger a signup or password change to inspect OTP.
              </div>
            ) : (
              mockEmails.map((mail, idx) => {
                const otpMatch = mail.body.match(/OTP Code: (\d{6})/);
                const otp = otpMatch ? otpMatch[1] : '';

                return (
                  <div key={mail.id} style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '10px'
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#cbd5e1', marginBottom: '4px' }}>To: {mail.to}</div>
                    <div style={{ color: '#94a3b8', marginBottom: '6px' }}>Sub: {mail.subject}</div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px', whiteSpace: 'pre-wrap', color: '#a7f3d0' }}>
                      {mail.body}
                    </div>
                    {otp && (
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(otp);
                          alert(`Copied OTP: ${otp}`);
                        }}
                        style={{
                          background: 'var(--color-primary)',
                          border: 'none',
                          color: '#fff',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          marginTop: '8px',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          fontWeight: 'bold'
                        }}
                      >
                        📋 Copy OTP Code ({otp})
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Button to toggle mock mailbox if closed */}
      {mode === 'verify' && !showMailbox && (
        <button
          onClick={() => setShowMailbox(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'var(--color-primary)',
            border: 'none',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: '24px',
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            zIndex: 100000
          }}
        >
          ✉️ Open Mailbox OTP Logs
        </button>
      )}
    </div>
  );
}
