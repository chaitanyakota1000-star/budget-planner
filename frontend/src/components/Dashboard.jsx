import React from 'react';

export function Dashboard({ summaryData, budgets, onOpenTransactionModal, onOpenBudgetModal }) {
  if (!summaryData) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard data...</div>;

  const { totals, monthly, trends, profile } = summaryData;

  // Formatting helper
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  // -------------------------------------------------------------
  // CALCULATING SVG DOUGHNUT CHART FOR EXPENSES
  // -------------------------------------------------------------
  const expenseCategories = Object.entries(monthly.categories || {}).filter(([_, val]) => val > 0);
  const totalMonthlyExpense = expenseCategories.reduce((sum, [_, val]) => sum + val, 0);

  // Category Color Map
  const categoryColors = {
    Food: '#f59e0b',          // Amber
    Rent: '#6366f1',          // Indigo
    Entertainment: '#ec4899', // Pink
    Utilities: '#06b6d4',     // Cyan
    Travel: '#a855f7',        // Purple
    Shopping: '#f43f5e',      // Rose
    Healthcare: '#10b981',    // Emerald
    Miscellaneous: '#64748b'  // Slate
  };

  let cumulativePercent = 0;
  const doughnutSlices = expenseCategories.map(([category, value]) => {
    const percent = totalMonthlyExpense > 0 ? (value / totalMonthlyExpense) * 100 : 0;
    const slice = {
      category,
      value,
      percent,
      color: categoryColors[category] || '#64748b',
      startPercent: cumulativePercent
    };
    cumulativePercent += percent;
    return slice;
  });

  const radius = 50;
  const circumference = 2 * Math.PI * radius; // ~314.16

  // -------------------------------------------------------------
  // CALCULATING SVG BAR CHART FOR TRENDS (Last 6 Months)
  // -------------------------------------------------------------
  const maxTrendVal = Math.max(
    ...trends.map(t => Math.max(t.income, t.expense)),
    1000 // default min height scale
  );

  const chartHeight = 160;
  const chartWidth = 500;
  const barWidth = 24;
  const paddingX = 40;
  const spacingX = (chartWidth - paddingX * 2) / 5; // spacing between month clusters

  // Check budgets progress and create alert list
  const budgetAlerts = [];
  const categoryBudgets = budgets || [];

  categoryBudgets.forEach(b => {
    const spent = monthly.categories[b.category] || 0;
    const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
    
    if (pct >= 100) {
      budgetAlerts.push({
        category: b.category,
        limit: b.limit,
        spent,
        pct,
        type: 'exceeded',
        message: `Oops! You have exceeded your budget for ${b.category} (₹${spent.toFixed(0)} spent of ₹${b.limit} limit)`
      });
    } else if (pct >= 85) {
      budgetAlerts.push({
        category: b.category,
        limit: b.limit,
        spent,
        pct,
        type: 'warning',
        message: `Watch out! You've used ${pct.toFixed(0)}% of your ${b.category} budget (₹${spent.toFixed(0)} spent of ₹${b.limit} limit)`
      });
    }
  });

  // -------------------------------------------------------------
  // CALCULATING TARGET ALLOCATION PIE CHART
  // -------------------------------------------------------------
  const targetIncome = profile?.monthlyIncome || 0;
  const targetExpenses = profile?.monthlyExpenses || 0;
  const targetSavings = profile?.targetSavings || 0;
  
  const isAllocationConfigured = profile?.initialized;
  
  let expenseAllocPct = 0;
  let savingsAllocPct = 0;
  let bufferAllocPct = 0;
  let isOverdraft = false;

  if (targetIncome > 0) {
    const totalPlanned = targetExpenses + targetSavings;
    if (totalPlanned > targetIncome) {
      isOverdraft = true;
      expenseAllocPct = (targetExpenses / totalPlanned) * 100;
      savingsAllocPct = (targetSavings / totalPlanned) * 100;
      bufferAllocPct = 0;
    } else {
      expenseAllocPct = (targetExpenses / targetIncome) * 100;
      savingsAllocPct = (targetSavings / targetIncome) * 100;
      bufferAllocPct = 100 - expenseAllocPct - savingsAllocPct;
    }
  }

  const pieRadius = 25;
  const pieCircumference = 2 * Math.PI * pieRadius; // ~157.08
  
  const allocationSlices = [];
  let pieCumulativePercent = 0;

  if (expenseAllocPct > 0) {
    allocationSlices.push({
      label: 'Expenses Limit',
      value: targetExpenses,
      percent: expenseAllocPct,
      color: 'var(--color-expense)',
      startPercent: pieCumulativePercent
    });
    pieCumulativePercent += expenseAllocPct;
  }

  if (savingsAllocPct > 0) {
    allocationSlices.push({
      label: 'Savings Target',
      value: targetSavings,
      percent: savingsAllocPct,
      color: 'var(--color-secondary)',
      startPercent: pieCumulativePercent
    });
    pieCumulativePercent += savingsAllocPct;
  }

  if (bufferAllocPct > 0) {
    allocationSlices.push({
      label: 'Unallocated Buffer',
      value: targetIncome - targetExpenses - targetSavings,
      percent: bufferAllocPct,
      color: 'var(--color-income)',
      startPercent: pieCumulativePercent
    });
    pieCumulativePercent += bufferAllocPct;
  }

  let adviceMessage = '';
  let adviceClass = '';
  if (isAllocationConfigured) {
    const actualSavingsRate = targetIncome > 0 ? (targetSavings / targetIncome) * 100 : 0;
    if (isOverdraft) {
      adviceMessage = 'Warning: Your monthly targets exceed your expected income! You will run a monthly deficit of ' + formatCurrency(targetExpenses + targetSavings - targetIncome) + '. Review your expense ceilings or decrease your savings goal.';
      adviceClass = 'budget-alert exceeded';
    } else if (actualSavingsRate >= 20) {
      adviceMessage = 'Excellent setup! You are saving ' + actualSavingsRate.toFixed(0) + '% of your monthly income (Rule of thumb: save at least 20%). Your plan is balanced and optimized for growth.';
      adviceClass = 'budget-alert';
    } else {
      adviceMessage = 'Attention: Your savings target is ' + actualSavingsRate.toFixed(0) + '% of your income, which is below the recommended 20% savings rule. Consider pruning your monthly expenses cap to build a stronger financial safety net.';
      adviceClass = 'budget-alert warning';
    }
  }

  return (
    <div>
      {/* Budget Warnings Panel */}
      {budgetAlerts.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          {budgetAlerts.map((alert, idx) => (
            <div key={idx} className={`budget-alert ${alert.type}`}>
              <span className="budget-alert-icon">
                {alert.type === 'exceeded' ? '⚠️' : '🔔'}
              </span>
              <div style={{ flex: 1 }}>{alert.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="summary-grid">
        {/* Net Balance Card */}
        <div className="stat-card glass-panel">
          <div className="stat-info">
            <span className="stat-label">Net Balance</span>
            <span className="stat-value">{formatCurrency(totals.netBalance)}</span>
            <span className={`stat-change ${totals.netBalance >= 0 ? 'positive' : 'negative'}`}>
              {totals.netBalance >= 0 ? '↗' : '↘'} All-time net
            </span>
          </div>
          <div className="stat-icon-wrapper icon-balance">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
        </div>

        {/* Monthly Income Card */}
        <div className="stat-card glass-panel">
          <div className="stat-info">
            <span className="stat-label">Monthly Income</span>
            <span className="stat-value" style={{ color: 'var(--color-income)' }}>
              {formatCurrency(monthly.income)}
            </span>
            <span className="stat-change positive">↗ This month</span>
          </div>
          <div className="stat-icon-wrapper icon-income">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
          </div>
        </div>

        {/* Monthly Expenses Card */}
        <div className="stat-card glass-panel">
          <div className="stat-info">
            <span className="stat-label">Monthly Expenses</span>
            <span className="stat-value" style={{ color: 'var(--color-expense)' }}>
              {formatCurrency(monthly.expenses)}
            </span>
            <span className="stat-change negative">↘ This month</span>
          </div>
          <div className="stat-icon-wrapper icon-expense">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
          </div>
        </div>

        {/* Savings Rate Card */}
        <div className="stat-card glass-panel">
          <div className="stat-info">
            <span className="stat-label">Savings Rate</span>
            <span className="stat-value" style={{ color: 'var(--color-secondary)' }}>
              {totals.savingsRate.toFixed(1)}%
            </span>
            <span className="stat-change positive">
              {totals.savingsRate > 20 ? '🔥 Great saving!' : '⚡ Aim for 20%+'}
            </span>
          </div>
          <div className="stat-icon-wrapper icon-savings">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
          </div>
        </div>
      </div>

      {/* Target Allocation Plan Section */}
      {isAllocationConfigured && (
        <div className="section-card glass-panel" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'stretch', marginBottom: '2.5rem' }}>
          
          {/* Target Allocation Pie Chart */}
          <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem 0' }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Target Allocation Plan</h4>
            <div style={{ position: 'relative', width: '130px', height: '130px' }}>
              <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '130px', height: '130px', borderRadius: '50%', overflow: 'hidden' }}>
                {allocationSlices.map((slice, idx) => {
                  const strokeOffset = pieCircumference - (pieCircumference * slice.percent) / 100;
                  const rotateAngle = (slice.startPercent / 100) * 360;
                  return (
                    <circle
                      key={idx}
                      cx="50"
                      cy="50"
                      r={pieRadius}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth="50"
                      strokeDasharray={pieCircumference}
                      strokeDashoffset={strokeOffset}
                      transform={`rotate(${rotateAngle} 50 50)`}
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    >
                      <title>{`${slice.label}: ${formatCurrency(slice.value)} (${slice.percent.toFixed(1)}%)`}</title>
                    </circle>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Allocation Recommendations Ledger */}
          <div style={{ flex: '2 1 300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.5rem' }}>Optimal Money Allocation</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Evaluated cash flow targets against financial safety benchmarks:
            </p>
            
            {/* Advice box */}
            <div className={adviceClass} style={{ margin: '0 0 1.25rem 0', padding: '0.75rem 1rem' }}>
              <span className="budget-alert-icon" style={{ fontSize: '1rem' }}>
                {isOverdraft ? '❌' : adviceClass.includes('warning') ? '⚠️' : '✅'}
              </span>
              <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>{adviceMessage}</div>
            </div>

            {/* Target Breakdown Lists */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {allocationSlices.map((slice, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <span className="legend-dot" style={{ backgroundColor: slice.color, width: '8px', height: '8px' }}></span>
                  <div style={{ fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{slice.label}:</span>{' '}
                    <strong style={{ color: '#fff' }}>{formatCurrency(slice.value)}</strong>{' '}
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({slice.percent.toFixed(0)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Main Charts Dashboard Row */}
      <div className="dashboard-grid">
        
        {/* Trend Bar Chart */}
        <div className="chart-card glass-panel">
          <div className="chart-title">
            <div>
              <h3>Cash Flow Trends</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Income vs Expenses (Last 6 Months)</p>
            </div>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => onOpenTransactionModal()}>
              + New Transaction
            </button>
          </div>

          <div style={{ height: '220px', width: '100%', marginTop: '1rem' }}>
            <svg viewBox={`0 0 ${chartWidth} 200`} className="bar-chart-svg">
              {/* Grid Lines */}
              <line x1={paddingX} y1={20} x2={chartWidth - paddingX} y2={20} stroke="rgba(255,255,255,0.05)" />
              <line x1={paddingX} y1={90} x2={chartWidth - paddingX} y2={90} stroke="rgba(255,255,255,0.05)" />
              <line x1={paddingX} y1={160} x2={chartWidth - paddingX} y2={160} stroke="rgba(255,255,255,0.1)" />

              {/* Bars */}
              {trends.map((t, idx) => {
                const xCluster = paddingX + idx * spacingX;
                
                // Heights scaled to chart container (max 140px)
                const incHeight = (t.income / maxTrendVal) * 140;
                const expHeight = (t.expense / maxTrendVal) * 140;
                
                const incY = 160 - incHeight;
                const expY = 160 - expHeight;

                return (
                  <g key={idx}>
                    {/* Income Bar (Emerald) */}
                    <rect
                      x={xCluster + 8}
                      y={incY}
                      width={barWidth}
                      height={Math.max(incHeight, 2)}
                      rx="3"
                      fill="url(#income-grad)"
                      className="bar-rect"
                    >
                      <title>{`Income: ${formatCurrency(t.income)}`}</title>
                    </rect>

                    {/* Expense Bar (Rose) */}
                    <rect
                      x={xCluster + barWidth + 14}
                      y={expY}
                      width={barWidth}
                      height={Math.max(expHeight, 2)}
                      rx="3"
                      fill="url(#expense-grad)"
                      className="bar-rect"
                    >
                      <title>{`Expense: ${formatCurrency(t.expense)}`}</title>
                    </rect>

                    {/* X-Axis labels */}
                    <text
                      x={xCluster + barWidth + 11}
                      y={180}
                      fill="var(--text-secondary)"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {t.month}
                    </text>
                  </g>
                );
              })}

              {/* Gradients */}
              <defs>
                <linearGradient id="income-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="expense-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#e11d48" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Expense Category Breakdown Doughnut Chart */}
        <div className="chart-card glass-panel">
          <div className="chart-title">
            <h3>Monthly Breakdown</h3>
          </div>

          {totalMonthlyExpense === 0 ? (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              No expenses recorded for this month.
            </div>
          ) : (
            <div className="doughnut-container">
              <div className="doughnut-svg-wrapper">
                <svg viewBox="0 0 150 150" className="doughnut-svg">
                  {doughnutSlices.map((slice, idx) => {
                    const strokeOffset = circumference - (circumference * slice.percent) / 100;
                    const rotateAngle = (slice.startPercent / 100) * 360;
                    
                    return (
                      <circle
                        key={idx}
                        cx="75"
                        cy="75"
                        r={radius}
                        className="doughnut-slice"
                        stroke={slice.color}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeOffset}
                        transform={`rotate(${rotateAngle - 90} 75 75)`}
                      >
                        <title>{`${slice.category}: ${formatCurrency(slice.value)} (${slice.percent.toFixed(1)}%)`}</title>
                      </circle>
                    );
                  })}
                </svg>
                <div className="doughnut-center-text">
                  <div className="doughnut-center-val" style={{ fontSize: '1rem' }}>
                    {formatCurrency(totalMonthlyExpense)}
                  </div>
                  <div className="doughnut-center-lbl">Total Spent</div>
                </div>
              </div>

              <div className="chart-legend">
                {doughnutSlices.map((slice, idx) => (
                  <div className="legend-item" key={idx}>
                    <span className="legend-color-label">
                      <span className="legend-dot" style={{ backgroundColor: slice.color }}></span>
                      <span style={{ color: 'var(--text-secondary)' }}>{slice.category}</span>
                    </span>
                    <span style={{ fontWeight: '500' }}>{slice.percent.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Budget Category Progress Cards */}
      <div className="section-card glass-panel">
        <div className="section-header">
          <div>
            <h3>Monthly Budget Caps</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Allocated limits vs actual spending for the current month
            </p>
          </div>
          <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => onOpenBudgetModal()}>
            Manage Limits
          </button>
        </div>

        <div className="budget-items">
          {categoryBudgets.map((b, idx) => {
            const spent = monthly.categories[b.category] || 0;
            const percentage = b.limit > 0 ? (spent / b.limit) * 100 : 0;
            
            // Progress bar color based on percentage
            let barColor = 'var(--color-primary)';
            if (percentage >= 100) {
              barColor = 'var(--color-expense)';
            } else if (percentage >= 85) {
              barColor = 'var(--color-warning)';
            } else {
              barColor = 'var(--color-income)';
            }

            return (
              <div className="budget-item" key={idx}>
                <div className="budget-item-header">
                  <span className="budget-item-name" style={{ fontWeight: '600' }}>{b.category}</span>
                  <span className="budget-item-spent">
                    <span style={{ fontWeight: '600', color: spent > b.limit ? 'var(--color-expense)' : 'inherit' }}>
                      {formatCurrency(spent)}
                    </span>
                    {' '}/ {formatCurrency(b.limit)}
                    <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                      ({percentage.toFixed(0)}%)
                    </span>
                  </span>
                </div>
                <div className="progress-bar-bg">
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      width: `${Math.min(percentage, 100)}%`, 
                      backgroundColor: barColor 
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
