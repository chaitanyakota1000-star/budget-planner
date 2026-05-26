import React, { useState, useEffect } from 'react';

// TRANSACTION MODAL (Add / Edit)
export function TransactionModal({ isOpen, onClose, onSave, transaction, categories }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [type, setType] = useState('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description);
      setAmount(transaction.amount);
      setCategory(transaction.category);
      setType(transaction.type);
      setDate(transaction.date);
    } else {
      setDescription('');
      setAmount('');
      setCategory('Food');
      setType('expense');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [transaction, isOpen]);

  // Adjust default category when type changes
  useEffect(() => {
    if (!transaction) {
      if (type === 'income') {
        setCategory('Salary');
      } else {
        setCategory('Food');
      }
    }
  }, [type, transaction]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description || !amount || !category || !type || !date) {
      alert('Please fill out all fields');
      return;
    }
    onSave({
      id: transaction?.id,
      description,
      amount: parseFloat(amount),
      category,
      type,
      date
    });
    onClose();
  };

  const expenseCategoriesList = Array.from(new Set([
    ...(categories || []),
    'Food', 'Rent', 'Entertainment', 'Utilities', 'Travel', 'Shopping', 'Healthcare', 'Miscellaneous'
  ]));

  const currentCategories = type === 'income' 
    ? ['Salary', 'Freelance', 'Investment', 'Other']
    : expenseCategoriesList;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <h3 className="modal-title">{transaction ? 'Edit Transaction' : 'Add Transaction'}</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Type</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="type" 
                  value="expense" 
                  checked={type === 'expense'} 
                  onChange={() => setType('expense')}
                  style={{ accentColor: 'var(--color-expense)' }}
                />
                Expense
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="type" 
                  value="income" 
                  checked={type === 'income'} 
                  onChange={() => setType('income')}
                  style={{ accentColor: 'var(--color-income)' }}
                />
                Income
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tx-desc">Description</label>
            <input 
              type="text" 
              id="tx-desc"
              className="form-control" 
              placeholder="e.g. Weekly Groceries" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tx-amount">Amount (₹)</label>
            <input 
              type="number" 
              id="tx-amount"
              step="0.01" 
              min="0.01"
              className="form-control" 
              placeholder="0.00" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tx-cat">Category</label>
            <select 
              id="tx-cat"
              className="form-control" 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {currentCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tx-date">Date</label>
            <input 
              type="date" 
              id="tx-date"
              className="form-control" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{transaction ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// BUDGET LIMIT MODAL
export function BudgetModal({ isOpen, onClose, onSave, budgetCategory }) {
  const [limit, setLimit] = useState('');

  useEffect(() => {
    if (budgetCategory) {
      setLimit(budgetCategory.limit || '');
    } else {
      setLimit('');
    }
  }, [budgetCategory, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!limit || parseFloat(limit) <= 0) {
      alert('Please enter a valid budget limit');
      return;
    }
    onSave({
      category: budgetCategory.category,
      limit: parseFloat(limit)
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <h3 className="modal-title">Set Budget for {budgetCategory?.category}</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="budget-lim">Monthly Limit (₹)</label>
            <input 
              type="number" 
              id="budget-lim"
              step="1" 
              min="1"
              className="form-control" 
              placeholder="e.g. 500" 
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              required
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Limit</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// SAVINGS GOAL MODAL (Create / Deposit)
export function SavingsModal({ isOpen, onClose, onSave, goal, mode }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [depositAmount, setDepositAmount] = useState('');

  useEffect(() => {
    if (goal) {
      setName(goal.name || '');
      setTarget(goal.target || '');
      setCurrent(goal.current || '');
    } else {
      setName('');
      setTarget('');
      setCurrent('0');
    }
    setDepositAmount('');
  }, [goal, isOpen, mode]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === 'deposit') {
      if (!depositAmount || parseFloat(depositAmount) <= 0) {
        alert('Please enter a valid deposit amount');
        return;
      }
      onSave({
        id: goal.id,
        depositAmount: parseFloat(depositAmount)
      });
    } else {
      if (!name || !target || parseFloat(target) <= 0) {
        alert('Please enter a valid name and target amount');
        return;
      }
      onSave({
        id: goal?.id,
        name,
        target: parseFloat(target),
        current: parseFloat(current || 0)
      });
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <h3 className="modal-title">
          {mode === 'deposit' ? `Add Savings to "${goal?.name}"` : goal ? 'Edit Savings Goal' : 'Create Savings Goal'}
        </h3>
        
        <form onSubmit={handleSubmit}>
          {mode === 'deposit' ? (
            <div className="form-group">
              <label className="form-label" htmlFor="save-deposit">Deposit Amount (₹)</label>
              <input 
                type="number" 
                id="save-deposit"
                step="0.01" 
                min="0.01"
                className="form-control" 
                placeholder="0.00" 
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                required
                autoFocus
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Current balance: ₹{goal?.current} / Target: ₹{goal?.target}
              </p>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="save-name">Goal Name</label>
                <input 
                  type="text" 
                  id="save-name"
                  className="form-control" 
                  placeholder="e.g. Emergency Fund" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="save-target">Target Amount (₹)</label>
                <input 
                  type="number" 
                  id="save-target"
                  step="1" 
                  min="1"
                  className="form-control" 
                  placeholder="e.g. 5000" 
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  required
                />
              </div>

              {!goal && (
                <div className="form-group">
                  <label className="form-label" htmlFor="save-current">Initial Savings (₹)</label>
                  <input 
                    type="number" 
                    id="save-current"
                    step="1" 
                    min="0"
                    className="form-control" 
                    placeholder="0" 
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {mode === 'deposit' ? 'Deposit' : goal ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ONBOARDING SETUP WIZARD MODAL
export function OnboardingModal({ isOpen, onClose, onSave, profile }) {
  const [step, setStep] = useState(1);
  const [currentBalance, setCurrentBalance] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [targetSavings, setTargetSavings] = useState('');

  const [newCatName, setNewCatName] = useState('');

  // Categories list - stateful to support custom additions
  const [categories, setCategories] = useState([
    { name: 'Food', defaultLimit: '5000', icon: '🍔' },
    { name: 'Rent', defaultLimit: '15000', icon: '🏠' },
    { name: 'Entertainment', defaultLimit: '3000', icon: '🎬' },
    { name: 'Utilities', defaultLimit: '2500', icon: '🔌' },
    { name: 'Travel', defaultLimit: '2000', icon: '✈️' },
    { name: 'Shopping', defaultLimit: '4000', icon: '🛍️' },
    { name: 'Healthcare', defaultLimit: '1500', icon: '🏥' },
    { name: 'Miscellaneous', defaultLimit: '1000', icon: '📦' }
  ]);

  const [checkedCats, setCheckedCats] = useState({
    Food: true,
    Rent: true,
    Entertainment: true,
    Utilities: true,
    Travel: false,
    Shopping: false,
    Healthcare: false,
    Miscellaneous: false
  });

  const [catLimits, setCatLimits] = useState({
    Food: '5000',
    Rent: '15000',
    Entertainment: '3000',
    Utilities: '2500',
    Travel: '2000',
    Shopping: '4000',
    Healthcare: '1500',
    Miscellaneous: '1000'
  });

  const [catSpent, setCatSpent] = useState({
    Food: '',
    Rent: '',
    Entertainment: '',
    Utilities: '',
    Travel: '',
    Shopping: '',
    Healthcare: '',
    Miscellaneous: ''
  });

  useEffect(() => {
    if (profile && profile.initialized) {
      setCurrentBalance(profile.currentBalance || '');
      setMonthlyIncome(profile.monthlyIncome || '');
      setTargetSavings(profile.targetSavings || '');
    } else {
      setCurrentBalance('');
      setMonthlyIncome('');
      setTargetSavings('');
      setCategories([
        { name: 'Food', defaultLimit: '5000', icon: '🍔' },
        { name: 'Rent', defaultLimit: '15000', icon: '🏠' },
        { name: 'Entertainment', defaultLimit: '3000', icon: '🎬' },
        { name: 'Utilities', defaultLimit: '2500', icon: '🔌' },
        { name: 'Travel', defaultLimit: '2000', icon: '✈️' },
        { name: 'Shopping', defaultLimit: '4000', icon: '🛍️' },
        { name: 'Healthcare', defaultLimit: '1500', icon: '🏥' },
        { name: 'Miscellaneous', defaultLimit: '1000', icon: '📦' }
      ]);
      setCatSpent({
        Food: '',
        Rent: '',
        Entertainment: '',
        Utilities: '',
        Travel: '',
        Shopping: '',
        Healthcare: '',
        Miscellaneous: ''
      });
      setStep(1);
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleCheckboxChange = (name) => {
    setCheckedCats(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleLimitChange = (name, value) => {
    setCatLimits(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSpentChange = (name, value) => {
    setCatSpent(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddCustomCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    
    // Check if it already exists
    if (categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('This category already exists!');
      return;
    }
    
    const newCat = {
      name: trimmed,
      defaultLimit: '1000',
      icon: '🏷️'
    };
    
    setCategories(prev => [...prev, newCat]);
    
    // Automatically check it
    setCheckedCats(prev => ({
      ...prev,
      [trimmed]: true
    }));
    
    // Set default limit and spent
    setCatLimits(prev => ({
      ...prev,
      [trimmed]: '1000'
    }));
    
    setCatSpent(prev => ({
      ...prev,
      [trimmed]: ''
    }));
    
    setNewCatName('');
  };

  const liveExpenses = Object.keys(checkedCats).reduce((sum, cat) => {
    return checkedCats[cat] ? sum + parseFloat(catLimits[cat] || 0) : sum;
  }, 0);

  const isFirstTime = !profile || !profile.initialized;

  // Pie Chart calculations for Step 3 Preview
  const incomeVal = parseFloat(monthlyIncome) || 0;
  const savingsVal = parseFloat(targetSavings) || 0;
  const totalPlanned = liveExpenses + savingsVal;
  
  let expensePct = 0;
  let savingsPct = 0;
  let bufferPct = 0;
  let isOverdraft = false;

  if (incomeVal > 0) {
    if (totalPlanned > incomeVal) {
      isOverdraft = true;
      expensePct = (liveExpenses / totalPlanned) * 100;
      savingsPct = (savingsVal / totalPlanned) * 100;
      bufferPct = 0;
    } else {
      expensePct = (liveExpenses / incomeVal) * 100;
      savingsPct = (savingsVal / incomeVal) * 100;
      bufferPct = 100 - expensePct - savingsPct;
    }
  }

  const radius = 25;
  const circumference = 2 * Math.PI * radius; // ~157.08
  
  const slices = [];
  let cumulative = 0;

  if (expensePct > 0) {
    slices.push({ percent: expensePct, color: 'var(--color-expense)', start: cumulative });
    cumulative += expensePct;
  }
  if (savingsPct > 0) {
    slices.push({ percent: savingsPct, color: 'var(--color-secondary)', start: cumulative });
    cumulative += savingsPct;
  }
  if (bufferPct > 0) {
    slices.push({ percent: bufferPct, color: 'var(--color-income)', start: cumulative });
    cumulative += bufferPct;
  }

  const handleNext = () => {
    if (step === 1) {
      if (currentBalance === '' || monthlyIncome === '' || parseFloat(monthlyIncome) <= 0) {
        alert('Please enter a starting balance and a valid monthly income');
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (targetSavings === '' || parseFloat(targetSavings) < 0) {
      alert('Please enter a valid savings target');
      return;
    }

    // Build budgets array of selected categories including spent values
    const finalBudgets = Object.keys(checkedCats)
      .filter(cat => checkedCats[cat])
      .map(cat => ({
        category: cat,
        limit: parseFloat(catLimits[cat] || 0),
        spent: parseFloat(catSpent[cat] || 0)
      }));

    onSave({
      currentBalance: parseFloat(currentBalance),
      monthlyIncome: parseFloat(monthlyIncome),
      targetSavings: parseFloat(targetSavings),
      budgets: finalBudgets
    });
    
    onClose();
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)' }} onClick={isFirstTime ? undefined : onClose}>
      <div className="modal-content glass-panel" style={{ maxWidth: '540px', border: '1px solid rgba(99, 102, 241, 0.3)' }} onClick={(e) => e.stopPropagation()}>
        {!isFirstTime && (
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        )}

        {/* Header with Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 className="modal-title" style={{ margin: 0, background: 'linear-gradient(135deg, #fff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {isFirstTime ? "Configure Setup" : "Edit Target Allocations"}
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: '600', padding: '0.2rem 0.6rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px' }}>
            Step {step} of 3
          </span>
        </div>

        {/* STEP 1: BALANCE & INCOME */}
        {step === 1 && (
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Set your starting balance and monthly income to begin tracking cash flows.
            </p>
            <div className="form-group">
              <label className="form-label" htmlFor="ob-balance">Current Account Balance (₹)</label>
              <input 
                type="number" 
                id="ob-balance"
                step="1" 
                min="0"
                placeholder="e.g. 50000"
                className="form-control" 
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="ob-income">Expected Monthly Income (₹)</label>
              <input 
                type="number" 
                id="ob-income"
                step="1" 
                min="1"
                placeholder="e.g. 60000"
                className="form-control" 
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                required
              />
            </div>

            <div className="form-actions" style={{ marginTop: '2rem' }}>
              {!isFirstTime && (
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              )}
              <button type="button" className="btn btn-primary" onClick={handleNext} style={{ width: isFirstTime ? '100%' : 'auto' }}>
                Next: Spending Limits
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CATEGORY SPENDING RANGE LIMITS */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Check the categories you spend on and set their monthly limit caps.
            </p>

            <div style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {categories.map((cat) => (
                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', flex: 1 }}>
                    <input 
                      type="checkbox"
                      checked={checkedCats[cat.name] || false}
                      onChange={() => handleCheckboxChange(cat.name)}
                      style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px' }}
                    />
                    <span>{cat.icon}</span>
                    <span style={{ fontWeight: '500' }}>{cat.name}</span>
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cap:</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>₹</span>
                      <input 
                        type="number"
                        disabled={!checkedCats[cat.name]}
                        value={catLimits[cat.name] || ''}
                        onChange={(e) => handleLimitChange(cat.name, e.target.value)}
                        placeholder={cat.defaultLimit}
                        style={{ width: '70px', padding: '0.35rem', fontSize: '0.8rem', height: '30px' }}
                        className="form-control"
                        min="0"
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Spent:</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>₹</span>
                      <input 
                        type="number"
                        disabled={!checkedCats[cat.name]}
                        value={catSpent[cat.name] || ''}
                        onChange={(e) => handleSpentChange(cat.name, e.target.value)}
                        placeholder="0"
                        style={{ width: '70px', padding: '0.35rem', fontSize: '0.8rem', height: '30px' }}
                        className="form-control"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Category Adder */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', padding: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '8px' }}>
              <input 
                type="text" 
                placeholder="Add custom category (e.g. Petrol)" 
                className="form-control" 
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                style={{ flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
              />
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleAddCustomCategory}
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
              >
                + Add Custom
              </button>
            </div>

            {/* Dynamic Total Tracker */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', background: 'var(--color-income-glow)', borderRadius: '8px', border: '1px dashed var(--color-income)', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Total Estimated Expenses:</span>
              <strong style={{ color: 'var(--color-income)', fontSize: '1.1rem' }}>{formatCurrency(liveExpenses)}</strong>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={handlePrev}>Back</button>
              <button type="button" className="btn btn-primary" onClick={handleNext}>
                Next: Savings Target
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SAVINGS TARGET & ALLOCATION PIE PREVIEW */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Define how much you need to save each month (key point) and view the allocation analysis.
            </p>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="ob-savings" style={{ fontWeight: '600' }}>
                Monthly Savings Target (₹) <span style={{ color: 'var(--color-secondary)' }}>*Key Target</span>
              </label>
              <input 
                type="number" 
                id="ob-savings"
                step="1" 
                min="0"
                placeholder="e.g. 10000"
                className="form-control" 
                value={targetSavings}
                onChange={(e) => setTargetSavings(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Calculations & SVG Pie Preview */}
            <div style={{ display: 'flex', gap: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              
              {/* Dynamic Mini Pie Chart */}
              <div style={{ display: 'flex', justifyContent: 'center', flex: '1 1 120px' }}>
                <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden' }}>
                  {slices.map((slice, idx) => {
                    const strokeOffset = circumference - (circumference * slice.percent) / 100;
                    const rotateAngle = (slice.start / 100) * 360;
                    return (
                      <circle
                        key={idx}
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        stroke={slice.color}
                        strokeWidth="50"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeOffset}
                        transform={`rotate(${rotateAngle} 50 50)`}
                      />
                    );
                  })}
                </svg>
              </div>

              {/* Breakdown Ledger */}
              <div style={{ flex: '1.5 1 200px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span className="legend-dot" style={{ backgroundColor: 'var(--color-expense)', width: '6px', height: '6px' }}></span>
                    Expenses Limit:
                  </span>
                  <strong>{formatCurrency(liveExpenses)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span className="legend-dot" style={{ backgroundColor: 'var(--color-secondary)', width: '6px', height: '6px' }}></span>
                    Savings Target:
                  </span>
                  <strong>{formatCurrency(savingsVal)}</strong>
                </div>

                {incomeVal - liveExpenses - savingsVal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span className="legend-dot" style={{ backgroundColor: 'var(--color-income)', width: '6px', height: '6px' }}></span>
                      Planned Buffer:
                    </span>
                    <strong style={{ color: 'var(--color-income)' }}>{formatCurrency(incomeVal - liveExpenses - savingsVal)}</strong>
                  </div>
                )}

                {isOverdraft && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-expense)', fontWeight: '600', marginTop: '0.25rem' }}>
                    ⚠️ Deficit: {formatCurrency(totalPlanned - incomeVal)}
                  </div>
                )}
              </div>
            </div>

            {/* Health assessment message */}
            {incomeVal > 0 && (
              <div style={{ marginBottom: '1.5rem', fontSize: '0.8rem', padding: '0.65rem 0.85rem', borderRadius: '8px', background: isOverdraft ? 'var(--color-expense-glow)' : (savingsVal/incomeVal >= 0.2 ? 'var(--color-income-glow)' : 'var(--color-warning-glow)'), borderLeft: `3px solid ${isOverdraft ? 'var(--color-expense)' : (savingsVal/incomeVal >= 0.2 ? 'var(--color-income)' : 'var(--color-warning)')}` }}>
                {isOverdraft 
                  ? 'Overdraft Risk: Combined limits exceed monthly income!'
                  : (savingsVal/incomeVal >= 0.2 
                      ? `Balanced: Savings target is ${(savingsVal/incomeVal*100).toFixed(0)}% of income (meets the 20% rule).`
                      : `Attention: Savings rate is ${(savingsVal/incomeVal*100).toFixed(0)}% (aim for at least 20%).`
                    )
                }
              </div>
            )}

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={handlePrev}>Back</button>
              <button type="button" className="btn btn-primary" onClick={handleSubmit}>
                {isFirstTime ? 'Finish & Start' : 'Save Adjustments'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// PLAN MODAL (For Future Plans)
export function PlanModal({ isOpen, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [timeframeMonths, setTimeframeMonths] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setTargetAmount('');
      setTimeframeMonths('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !targetAmount || !timeframeMonths) {
      alert('Please fill out all fields');
      return;
    }
    onSave({
      title,
      targetAmount: parseFloat(targetAmount),
      timeframeMonths: parseInt(timeframeMonths)
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <h3 className="modal-title">Create Future Purchase Plan</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="plan-title">Purchase Goal</label>
            <input 
              type="text" 
              id="plan-title"
              className="form-control" 
              placeholder="e.g. Electric Scooter, Trip to Ladakh" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="plan-cost">Estimated Cost (₹)</label>
            <input 
              type="number" 
              id="plan-cost"
              className="form-control" 
              placeholder="e.g. 120000" 
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="plan-time">Target Timeframe (Months)</label>
            <input 
              type="number" 
              id="plan-time"
              min="1"
              className="form-control" 
              placeholder="e.g. 12" 
              value={timeframeMonths}
              onChange={(e) => setTimeframeMonths(e.target.value)}
              required
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Plan</button>
          </div>
        </form>
      </div>
    </div>
  );
}
