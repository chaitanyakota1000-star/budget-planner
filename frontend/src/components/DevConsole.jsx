import React, { useState, useEffect } from 'react';
import { apiClient } from '../apiClient';

export function DevConsole({ authUserId }) {
  const [users, setUsers] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = {
        'X-User-Id': authUserId
      };

      const [usersRes, emailsRes] = await Promise.all([
        apiClient.get('http://localhost:5000/api/admin/users', headers),
        apiClient.get('http://localhost:5000/api/auth/mock-emails')
      ]);

      if (usersRes.ok && emailsRes.ok) {
        const usersData = await usersRes.json();
        const emailsData = await emailsRes.json();
        setUsers(usersData);
        setEmails(emailsData);
      } else {
        const errData = await usersRes.json();
        setError(errData.error || 'Failed to load developer administrative dashboard data');
      }
    } catch (err) {
      console.error(err);
      setError('Connection to backend failed. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [authUserId]);

  const handleToggleVerify = async (userId) => {
    try {
      const response = await apiClient.post(`http://localhost:5000/api/admin/users/${userId}/toggle-verify`, {}, {
        'X-User-Id': authUserId
      });
      if (response.ok) {
        fetchAdminData();
      } else {
        alert('Action unauthorized or user not found');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetUser = async (userId, username) => {
    const confirmReset = window.confirm(`🚨 Are you sure you want to completely WIPE all financial data and reset onboarding for user "${username}"?`);
    if (!confirmReset) return;

    try {
      const response = await apiClient.post(`http://localhost:5000/api/admin/users/${userId}/reset`, {}, {
        'X-User-Id': authUserId
      });
      if (response.ok) {
        alert(`Financial records wiped for user "${username}"!`);
        fetchAdminData();
      } else {
        alert('Action unauthorized or user not found');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    const confirmDelete = window.confirm(`🔥 DANGER: Are you sure you want to PERMANENTLY DELETE the account and all data for user "${username}"? This cannot be undone.`);
    if (!confirmDelete) return;

    try {
      const response = await apiClient.delete(`http://localhost:5000/api/admin/users/${userId}`, {
        'X-User-Id': authUserId
      });
      if (response.ok) {
        alert(`Account deleted for user "${username}"!`);
        fetchAdminData();
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3>Beta Developer & Site Management Console</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Manage registered accounts, inspect local email OTP transmissions, and perform debugging wipes.
          </p>
        </div>
        
        <button className="btn btn-secondary" onClick={fetchAdminData} disabled={loading}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.25rem' }}><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
          {loading ? 'Refreshing...' : 'Refresh Console'}
        </button>
      </div>

      {error && (
        <div className="budget-alert exceeded" style={{ margin: 0 }}>
          <span className="budget-alert-icon">⚠️</span>
          <div>{error}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* User directory list card */}
        <div className="section-card glass-panel" style={{ padding: '1.5rem', margin: 0 }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: 0, marginBottom: '1.25rem' }}>User Accounts Registry</h4>
          
          <div className="table-wrapper">
            <table className="tx-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Verification</th>
                  <th>Setup</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textCenter: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No accounts found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} style={{ opacity: user.id === authUserId ? 0.85 : 1 }}>
                      <td style={{ fontWeight: '600' }}>
                        {user.username} {user.admin && <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', background: 'rgba(99,102,241,0.15)', padding: '0.1rem 0.35rem', borderRadius: '4px', marginLeft: '0.25rem' }}>Admin</span>}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{user.email}</td>
                      <td>
                        <span 
                          style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: '600', 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '12px', 
                            background: user.isVerified ? 'var(--color-income-glow)' : 'var(--color-expense-glow)',
                            color: user.isVerified ? 'var(--color-income)' : 'var(--color-expense)',
                            display: 'inline-block'
                          }}
                        >
                          {user.isVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td>
                        <span 
                          style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: '500', 
                            color: user.initialized ? 'var(--text-primary)' : 'var(--text-muted)'
                          }}
                        >
                          {user.initialized ? '✅ Onboarded' : '⏳ Pending'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', margin: 0 }}
                            onClick={() => handleToggleVerify(user.id)}
                            title="Toggle user email verification state"
                          >
                            Verify
                          </button>
                          
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', margin: 0, borderColor: 'rgba(245,158,11,0.2)', color: 'var(--color-warning)' }}
                            onClick={() => handleResetUser(user.id, user.username)}
                            title="Wipe financial transaction records and reset onboarding wizard"
                          >
                            Reset
                          </button>
                          
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', margin: 0, borderColor: 'rgba(244,63,94,0.2)', color: 'var(--color-expense)' }}
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            disabled={user.id === authUserId}
                            title={user.id === authUserId ? "You cannot delete your own logged-in admin account" : "Delete user profile and account permanently"}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mock Mail Server queue logs card */}
        <div className="section-card glass-panel" style={{ padding: '1.5rem', margin: 0, display: 'flex', flexDirection: 'column', maxHeight: '520px' }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: 0, marginBottom: '0.25rem' }}>Simulated Mail Server Logs</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Live stream of outgoing email OTP codes sent to users for development testing.
          </p>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.25rem' }}>
            {emails.length === 0 ? (
              <div style={{ textCenter: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '3rem 0', textAlign: 'center' }}>
                💌 No emails dispatched yet.
              </div>
            ) : (
              emails.map((mail) => (
                <div key={mail.id} style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                    <span>To: <strong>{mail.to}</strong></span>
                    <span style={{ fontSize: '0.7rem' }}>{new Date(mail.date).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ fontWeight: '600', color: 'var(--color-secondary)', marginTop: '0.15rem' }}>
                    Subject: {mail.subject}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: '1.4', background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: '4px', marginTop: '0.25rem' }}>
                    {mail.body}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
