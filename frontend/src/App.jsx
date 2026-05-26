import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { FuturePlans } from './components/FuturePlans';
import { Auth } from './components/Auth';
import { TransactionModal, BudgetModal, SavingsModal, OnboardingModal, PlanModal } from './components/Modals';
import { apiClient } from './apiClient';

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Auth State
  const [authUserId, setAuthUserId] = useState(localStorage.getItem('userId') || null);
  const [authUsername, setAuthUsername] = useState(localStorage.getItem('username') || null);

  // App Data State
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [savings, setSavings] = useState([]);
  const [plans, setPlans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [profile, setProfile] = useState(null);

  // Modals Open State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Active items for editing
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingBudgetCategory, setEditingBudgetCategory] = useState(null);
  const [editingSavingsGoal, setEditingSavingsGoal] = useState(null);
  const [savingsMode, setSavingsMode] = useState('create'); // 'create', 'edit', 'deposit'

  // Helper headers creator
  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'X-User-Id': authUserId
    };
  };

  // Fetch all data from API
  const fetchAllData = async () => {
    if (!authUserId) return;
    try {
      const headers = getHeaders();
      const [txRes, budgetRes, savingsRes, planRes, summaryRes] = await Promise.all([
        apiClient.get(`${API_BASE}/transactions`, headers),
        apiClient.get(`${API_BASE}/budgets`, headers),
        apiClient.get(`${API_BASE}/savings`, headers),
        apiClient.get(`${API_BASE}/plans`, headers),
        apiClient.get(`${API_BASE}/summary`, headers)
      ]);

      if (txRes.ok && budgetRes.ok && savingsRes.ok && planRes.ok && summaryRes.ok) {
        const txData = await txRes.json();
        const budgetData = await budgetRes.json();
        const savingsData = await savingsRes.json();
        const planData = await planRes.json();
        const summaryData = await summaryRes.json();

        setTransactions(txData);
        setBudgets(budgetData);
        setSavings(savingsData);
        setPlans(planData);
        setSummary(summaryData);
        setProfile(summaryData.profile);
        
        if (summaryData.profile && !summaryData.profile.initialized) {
          setIsOnboardingOpen(true);
        }
      } else {
        console.error('Error response from backend API');
      }
    } catch (err) {
      console.error('Failed to connect to backend API:', err);
    }
  };

  useEffect(() => {
    const initClient = async () => {
      await apiClient.checkBackendConnection();
      if (authUserId) {
        fetchAllData();
      }
    };
    initClient();
  }, [authUserId]);

  // Auth Operations
  const handleLoginSuccess = (userId, username) => {
    localStorage.setItem('userId', userId);
    localStorage.setItem('username', username);
    setAuthUserId(userId);
    setAuthUsername(username);
    setActiveTab('dashboard');
  };

  const handleSignOut = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    setAuthUserId(null);
    setAuthUsername(null);
    setTransactions([]);
    setBudgets([]);
    setSavings([]);
    setPlans([]);
    setSummary(null);
    setProfile(null);
  };

  const handleResetProfile = async () => {
    const doubleConfirm = window.confirm(
      '🚨 DANGER: Are you sure you want to completely WIPE all your financial records (transactions, budgets, savings goals, future plans) and restart onboarding? This action CANNOT be undone.'
    );
    if (!doubleConfirm) return;

    try {
      const response = await apiClient.post(`${API_BASE}/profile/reset`, {}, getHeaders());
      if (response.ok) {
        alert('Data wiped successfully! Redirecting you to onboarding.');
        await fetchAllData();
      } else {
        alert('Failed to reset account data.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------------------------------------
  // TRANSACTION CRUD OPERATIONS
  // -------------------------------------------------------------
  const handleSaveTransaction = async (txData) => {
    try {
      let response;
      const headers = getHeaders();
      if (txData.id) {
        response = await apiClient.put(`${API_BASE}/transactions/${txData.id}`, txData, headers);
      } else {
        response = await apiClient.post(`${API_BASE}/transactions`, txData, headers);
      }

      if (response.ok) {
        await fetchAllData();
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to save transaction');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const response = await apiClient.delete(`${API_BASE}/transactions/${id}`, getHeaders());
      if (response.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditTransactionClick = (tx) => {
    setEditingTransaction(tx);
    setIsTxModalOpen(true);
  };

  const handleAddTransactionClick = () => {
    setEditingTransaction(null);
    setIsTxModalOpen(true);
  };

  // -------------------------------------------------------------
  // BUDGET CRUD OPERATIONS
  // -------------------------------------------------------------
  const handleSaveBudget = async (budgetData) => {
    try {
      const response = await apiClient.post(`${API_BASE}/budgets`, budgetData, getHeaders());
      if (response.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditBudgetClick = (catName) => {
    const existing = budgets.find(b => b.category === catName) || { category: catName, limit: 0 };
    setEditingBudgetCategory(existing);
    setIsBudgetModalOpen(true);
  };

  // -------------------------------------------------------------
  // SAVINGS GOALS CRUD OPERATIONS
  // -------------------------------------------------------------
  const handleSaveSavings = async (savingsData) => {
    try {
      let response;
      const headers = getHeaders();
      if (savingsData.id && savingsMode === 'deposit') {
        response = await apiClient.put(`${API_BASE}/savings/${savingsData.id}`, { depositAmount: savingsData.depositAmount }, headers);
      } else if (savingsData.id) {
        response = await apiClient.put(`${API_BASE}/savings/${savingsData.id}`, savingsData, headers);
      } else {
        response = await apiClient.post(`${API_BASE}/savings`, savingsData, headers);
      }

      if (response.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSavings = async (id) => {
    if (!window.confirm('Are you sure you want to delete this savings goal?')) return;
    try {
      const response = await apiClient.delete(`${API_BASE}/savings/${id}`, getHeaders());
      if (response.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSavingsClick = () => {
    setEditingSavingsGoal(null);
    setSavingsMode('create');
    setIsSavingsModalOpen(true);
  };

  const handleDepositSavingsClick = (goal) => {
    setEditingSavingsGoal(goal);
    setSavingsMode('deposit');
    setIsSavingsModalOpen(true);
  };

  const handleEditSavingsClick = (goal) => {
    setEditingSavingsGoal(goal);
    setSavingsMode('edit');
    setIsSavingsModalOpen(true);
  };

  // -------------------------------------------------------------
  // FUTURE PLANS OPERATIONS
  // -------------------------------------------------------------
  const handleSavePlan = async (planData) => {
    try {
      const response = await apiClient.post(`${API_BASE}/plans`, planData, getHeaders());
      if (response.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePlan = async (id) => {
    try {
      const response = await apiClient.delete(`${API_BASE}/plans/${id}`, getHeaders());
      if (response.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyCuts = async (updatedBudgets, totalCutsApplied) => {
    if (!profile) return;
    try {
      const profileData = {
        currentBalance: profile.currentBalance,
        monthlyIncome: profile.monthlyIncome,
        targetSavings: profile.targetSavings,
        budgets: updatedBudgets
      };
      
      const response = await apiClient.post(`${API_BASE}/profile`, profileData, getHeaders());

      if (response.ok) {
        await fetchAllData();
        alert(`Successfully optimized budgets! Reduced ₹${totalCutsApplied} from selected category thresholds to accommodate your future plan.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------------------------------------
  // PROFILE SAVE WIZARD
  // -------------------------------------------------------------
  const handleSaveProfile = async (profileData) => {
    try {
      const response = await apiClient.post(`${API_BASE}/profile`, profileData, getHeaders());
      if (response.ok) {
        await fetchAllData();
        setIsOnboardingOpen(false);
      } else {
        alert('Failed to save setup configuration');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  // If user is not authenticated, override and show Login/Signup portal
  if (!authUserId) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-container" style={{ marginBottom: '2.5rem' }}>
          <div className="logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18c3-1 5-9 10-9s4 4 7 4 3-4 3-8" /><path d="M2 13c3-1 5-9 10-9s4 4 7 4" style={{ opacity: 0.4 }} /><polyline points="17 5 22 5 22 10" /></svg>
          </div>
          <span className="logo-text">FinFlow</span>
        </div>

        <nav>
          <ul className="nav-links">
            <li>
              <button 
                className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
                Dashboard
              </button>
            </li>
            <li>
              <button 
                className={`nav-button ${activeTab === 'transactions' ? 'active' : ''}`}
                onClick={() => setActiveTab('transactions')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                Ledger
              </button>
            </li>
            <li>
              <button 
                className={`nav-button ${activeTab === 'budgets' ? 'active' : ''}`}
                onClick={() => setActiveTab('budgets')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Budgets
              </button>
            </li>
            <li>
              <button 
                className={`nav-button ${activeTab === 'savings' ? 'active' : ''}`}
                onClick={() => setActiveTab('savings')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                Savings
              </button>
            </li>
            <li>
              <button 
                className={`nav-button ${activeTab === 'plans' ? 'active' : ''}`}
                onClick={() => setActiveTab('plans')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="2" x2="12" y2="12"></line><polyline points="12 4 12 12 20 12"></polyline></svg>
                Planner
              </button>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge" style={{ justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="user-avatar" style={{ textTransform: 'uppercase', width: '32px', height: '32px', fontSize: '0.8rem' }}>
                {authUsername ? authUsername.substring(0, 2) : 'US'}
              </div>
              <div className="user-info">
                <h4 style={{ textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>{authUsername}</h4>
                <p>Starter Plan</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.2rem' }}>
              {/* Onboarding edit trigger */}
              <button 
                className="btn-icon" 
                title="Profile Allocations" 
                onClick={() => setIsOnboardingOpen(true)}
                style={{ padding: '0.3rem', color: 'var(--text-secondary)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              </button>
              {/* Logout button */}
              <button 
                className="btn-icon" 
                title="Log Out" 
                onClick={handleSignOut}
                style={{ padding: '0.3rem', color: 'var(--color-expense)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main View Area */}
      <main className="main-content">
        {/* Connection Mode Banner */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: apiClient.getMode() === 'backend' ? 'rgba(76, 175, 80, 0.08)' : 'rgba(255, 152, 0, 0.08)',
          borderBottom: apiClient.getMode() === 'backend' ? '1px solid rgba(76, 175, 80, 0.15)' : '1px solid rgba(255, 152, 0, 0.15)',
          padding: '0.6rem 1.5rem',
          fontSize: '0.85rem',
          color: apiClient.getMode() === 'backend' ? '#81c784' : '#ffb74d',
          backdropFilter: 'blur(10px)',
          margin: '-1.5rem -1.5rem 1.5rem -1.5rem',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1rem' }}>{apiClient.getMode() === 'backend' ? '🟢' : '⚡'}</span>
            <span>
              {apiClient.getMode() === 'backend' ? (
                <>Connected to <strong>Node.js Backend Server</strong>. Changes persist globally.</>
              ) : (
                <>Running in <strong>Local Storage Demo Mode</strong>. Data is kept locally in your browser.</>
              )}
            </span>
          </div>
          <button 
            onClick={() => {
              const newMode = apiClient.getMode() === 'backend' ? 'offline' : 'backend';
              apiClient.setMode(newMode);
              window.location.reload();
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              color: '#fff',
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: '500',
              transition: 'background 0.2s',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.08)'}
          >
            Switch to {apiClient.getMode() === 'backend' ? 'Demo Mode' : 'Backend Mode'}
          </button>
        </div>

        <header className="page-header">
          <div className="page-title">
            <h1>
              {activeTab === 'dashboard' && 'Financial Overview'}
              {activeTab === 'transactions' && 'Transaction Ledger'}
              {activeTab === 'budgets' && 'Monthly Budgets'}
              {activeTab === 'savings' && 'Savings Targets'}
              {activeTab === 'plans' && 'Future Planner'}
            </h1>
            <p>
              {activeTab === 'dashboard' && 'Welcome back, track your monthly progress and savings goals.'}
              {activeTab === 'transactions' && 'Review and manage your complete historical ledger.'}
              {activeTab === 'budgets' && 'Review and adjust limits for your monthly categories.'}
              {activeTab === 'savings' && 'Plan ahead by setting up savings piggybanks.'}
              {activeTab === 'plans' && 'Compare potential spending items against active savings rates.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={fetchAllData} title="Sync Data">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              Refresh
            </button>
            
            {activeTab === 'plans' ? (
              <button className="btn btn-primary" onClick={() => setIsPlanModalOpen(true)}>
                + Simulate Purchase
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleAddTransactionClick}>
                + Add Transaction
              </button>
            )}
          </div>
        </header>

        {/* --- PAGE RENDERING --- */}

        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <Dashboard 
            summaryData={summary} 
            budgets={budgets}
            onOpenTransactionModal={handleAddTransactionClick}
            onOpenBudgetModal={() => setActiveTab('budgets')}
          />
        )}

        {/* Transactions ledger View */}
        {activeTab === 'transactions' && (
          <Transactions 
            transactions={transactions} 
            onEdit={handleEditTransactionClick}
            onDelete={handleDeleteTransaction}
            onOpenModal={handleAddTransactionClick}
          />
        )}

        {/* Budgets Management Page */}
        {activeTab === 'budgets' && (
          <div>
            <div className="section-card glass-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ fontWeight: 600, margin: 0 }}>Configure Monthly Budgets</h3>
                
                {/* Reset Profile Trigger */}
                <button 
                  className="btn btn-secondary" 
                  style={{ borderColor: 'rgba(244, 63, 94, 0.3)', color: 'var(--color-expense)', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                  onClick={handleResetProfile}
                >
                  ⚠️ Reset Account & Data
                </button>
              </div>

              <div className="budgets-page-grid">
                {budgets.map((b, idx) => (
                  <div key={idx} className="budget-config-card glass-panel">
                    <div>
                      <div className="budget-config-header">
                        <span style={{ fontSize: '1.5rem' }}>
                          {b.category === 'Food' && '🍔'}
                          {b.category === 'Rent' && '🏠'}
                          {b.category === 'Entertainment' && '🎬'}
                          {b.category === 'Utilities' && '🔌'}
                          {b.category === 'Travel' && '✈️'}
                          {b.category === 'Shopping' && '🛍️'}
                          {b.category === 'Healthcare' && '🏥'}
                          {b.category === 'Miscellaneous' && '📦'}
                          {!['Food', 'Rent', 'Entertainment', 'Utilities', 'Travel', 'Shopping', 'Healthcare', 'Miscellaneous'].includes(b.category) && '🏷️'}
                        </span>
                        <div className="budget-config-cat">{b.category}</div>
                      </div>
                      <div className="budget-config-body">
                        Monthly limit cap:
                        <div className="budget-config-limit">{formatCurrency(b.limit)}</div>
                      </div>
                    </div>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem', width: '100%', fontSize: '0.8rem', marginTop: '1rem' }}
                      onClick={() => handleEditBudgetClick(b.category)}
                    >
                      Update Limit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Savings Goals Page */}
        {activeTab === 'savings' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Active Piggybanks</h3>
              <button className="btn btn-primary" onClick={handleAddSavingsClick}>
                + Create Piggybank
              </button>
            </div>

            <div className="savings-goals-grid">
              {savings.map((g) => {
                const percentage = g.target > 0 ? (g.current / g.target) * 100 : 0;
                const r = 28;
                const circ = 2 * Math.PI * r;
                const offset = circ - (circ * Math.min(percentage, 100)) / 100;

                return (
                  <div key={g.id} className="savings-card glass-panel">
                    <div className="savings-header">
                      <div>
                        <h4>{g.name}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Savings Goal</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn-icon" title="Edit Goal" onClick={() => handleEditSavingsClick(g)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button className="btn-icon delete" title="Delete Goal" onClick={() => handleDeleteSavings(g.id)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </div>

                    <div className="savings-body">
                      <div className="savings-details">
                        <div className="savings-nums">{formatCurrency(g.current)}</div>
                        <div className="savings-target-label">Target: {formatCurrency(g.target)}</div>
                      </div>

                      <div className="savings-progress-wrapper">
                        <svg className="savings-progress-ring-svg" viewBox="0 0 70 70">
                          <circle cx="35" cy="35" r={r} className="savings-progress-ring-bg" />
                          <circle 
                            cx="35" 
                            cy="35" 
                            r={r} 
                            className="savings-progress-ring-bar" 
                            strokeDasharray={circ}
                            strokeDashoffset={offset}
                          />
                        </svg>
                        <div className="savings-percentage-txt">{percentage.toFixed(0)}%</div>
                      </div>
                    </div>

                    <button 
                      className="btn btn-primary" 
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', marginTop: '1.25rem', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)', color: 'var(--color-secondary)', boxShadow: 'none' }}
                      onClick={() => handleDepositSavingsClick(g)}
                    >
                      ⚡ Add Savings
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Future Planner tab View */}
        {activeTab === 'plans' && (
          <FuturePlans 
            plans={plans}
            profile={profile}
            budgets={budgets}
            onAddPlan={() => setIsPlanModalOpen(true)}
            onDeletePlan={handleDeletePlan}
            onUpdateBudgets={handleApplyCuts}
          />
        )}
      </main>

      {/* --- ALL MODALS --- */}
      <TransactionModal 
        isOpen={isTxModalOpen}
        onClose={() => { setIsTxModalOpen(false); setEditingTransaction(null); }}
        onSave={handleSaveTransaction}
        transaction={editingTransaction}
        categories={budgets.map(b => b.category)}
      />

      <BudgetModal 
        isOpen={isBudgetModalOpen}
        onClose={() => { setIsBudgetModalOpen(false); setEditingBudgetCategory(null); }}
        onSave={handleSaveBudget}
        budgetCategory={editingBudgetCategory}
      />

      <SavingsModal 
        isOpen={isSavingsModalOpen}
        onClose={() => { setIsSavingsModalOpen(false); setEditingSavingsGoal(null); }}
        onSave={handleSaveSavings}
        goal={editingSavingsGoal}
        mode={savingsMode}
      />

      <PlanModal 
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        onSave={handleSavePlan}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSave={handleSaveProfile}
        profile={profile}
      />
    </div>
  );
}
