import React from 'react';

export function FuturePlans({ plans, profile, budgets, onAddPlan, onDeletePlan, onUpdateBudgets }) {
  
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const handleApplyCuts = (deficit) => {
    // Reducible categories we target for cuts
    const reducibleCategories = ['Entertainment', 'Shopping', 'Travel', 'Miscellaneous', 'Food'];
    
    // Find active budgets that are in the reducible list
    const activeReducibleBudgets = budgets.filter(b => reducibleCategories.includes(b.category) && b.limit > 0);
    
    if (activeReducibleBudgets.length === 0) {
      alert("No reducible budget categories (like Entertainment, Shopping, or Food) are configured to apply cuts to.");
      return;
    }

    const totalLimitPool = activeReducibleBudgets.reduce((sum, b) => sum + b.limit, 0);
    
    // Calculate new budgets
    let totalCutsApplied = 0;
    const updatedBudgets = budgets.map(b => {
      if (reducibleCategories.includes(b.category) && b.limit > 0) {
        // Proportional cut based on limit size
        const ratio = b.limit / totalLimitPool;
        const cut = Math.min(b.limit - 100, Math.round(deficit * ratio)); // Keep at least ₹100 limit
        totalCutsApplied += cut;
        return {
          ...b,
          limit: b.limit - cut
        };
      }
      return b;
    });

    if (totalCutsApplied < 10) {
      alert("Your active category limits are already too low to apply further cuts.");
      return;
    }

    // Call callback to send to backend API
    onUpdateBudgets(updatedBudgets, totalCutsApplied);
  };

  const currentSavingsTarget = profile?.targetSavings || 0;
  
  // Sort plans by timeframe (shortest first) for sequential timeline
  const sortedPlans = [...plans].sort((a, b) => a.timeframeMonths - b.timeframeMonths);
  
  // Calculate sequential timeline milestones
  let cumulativeSavingsRequired = 0;
  const sequentialTimeline = sortedPlans.map(plan => {
    cumulativeSavingsRequired += plan.targetAmount;
    const monthsNeeded = currentSavingsTarget > 0 ? (cumulativeSavingsRequired / currentSavingsTarget) : Infinity;
    const targetMonths = plan.timeframeMonths;
    const achievedMonth = Math.ceil(monthsNeeded);
    const delayMonths = currentSavingsTarget > 0 ? achievedMonth - targetMonths : 0;
    
    return {
      ...plan,
      achievedMonth: currentSavingsTarget > 0 ? achievedMonth : 'Never',
      isDelay: currentSavingsTarget > 0 ? achievedMonth > targetMonths : true,
      delayMonths: delayMonths > 0 ? delayMonths : 0,
      cumulativeCost: cumulativeSavingsRequired
    };
  });

  // Calculate combined parallel metrics
  const totalCost = plans.reduce((sum, p) => sum + p.targetAmount, 0);
  const totalParallelMonthlyRequired = plans.reduce((sum, p) => sum + (p.targetAmount / p.timeframeMonths), 0);
  const combinedDeficit = totalParallelMonthlyRequired - currentSavingsTarget;
  const isCombinedFeasible = combinedDeficit <= 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h3>Future Purchase Planner</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Simulate future savings requirements and adjust current budgets to meet goals
          </p>
        </div>
        
        <button className="btn btn-primary" onClick={onAddPlan}>
          + Simulate Purchase
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="section-card glass-panel" style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🎯</span>
          <h4>No Simulated Purchases Defined</h4>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
            Add a future goal (e.g. buying a bike, laptop, or taking a vacation) to evaluate if your current savings rate is sufficient.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          
          {/* LEFT COLUMN: Individual Goal Cards */}
          <div style={{ flex: '1 1 55%', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Simulated Purchases ({plans.length})
            </h4>
            
            {plans.map((plan) => {
              const reqSavingsPerMonth = plan.targetAmount / plan.timeframeMonths;
              const deficit = reqSavingsPerMonth - currentSavingsTarget;
              const isFeasible = deficit <= 0;

              // Generate budget cuts suggestion detail for this specific plan
              const reducibleCategories = ['Entertainment', 'Shopping', 'Travel', 'Miscellaneous', 'Food'];
              const activeReducibleBudgets = budgets.filter(b => reducibleCategories.includes(b.category) && b.limit > 0);
              const totalLimitPool = activeReducibleBudgets.reduce((sum, b) => sum + b.limit, 0);

              const suggestedCuts = activeReducibleBudgets.map(b => {
                const ratio = b.limit / totalLimitPool;
                const cut = Math.min(b.limit - 100, Math.round(deficit * ratio));
                return {
                  category: b.category,
                  current: b.limit,
                  cut,
                  suggested: b.limit - cut
                };
              }).filter(c => c.cut > 0);

              return (
                <div key={plan.id} className="section-card glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>{plan.title}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Goal: <strong>{formatCurrency(plan.targetAmount)}</strong> in <strong>{plan.timeframeMonths} months</strong>
                      </span>
                    </div>
                    <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderColor: 'rgba(244, 63, 94, 0.2)', color: 'var(--color-expense)' }} onClick={() => onDeletePlan(plan.id)}>
                      Remove
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.25rem', flexWrap: 'wrap' }}>
                    
                    {/* Calculations breakdown Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '10px', padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Required Monthly Savings</span>
                        <strong style={{ fontSize: '1.15rem', color: 'var(--color-secondary)' }}>{formatCurrency(reqSavingsPerMonth)}/mo</strong>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Your Savings Target</span>
                        <strong style={{ fontSize: '1rem' }}>{formatCurrency(currentSavingsTarget)}/mo</strong>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Goal Feasibility</span>
                        {isFeasible ? (
                          <span style={{ color: 'var(--color-income)', fontWeight: '600', fontSize: '0.85rem' }}>
                            ✅ On Track (+{formatCurrency(Math.abs(deficit))}/mo)
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-expense)', fontWeight: '600', fontSize: '0.85rem' }}>
                            ❌ Deficit (-{formatCurrency(deficit)}/mo)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Recommendations Analysis Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', fontSize: '0.85rem' }}>
                      {isFeasible ? (
                        <div style={{ padding: '1rem', background: 'var(--color-income-glow)', borderLeft: '3px solid var(--color-income)', borderRadius: '6px' }}>
                          <h5 style={{ fontWeight: '600', color: '#fff', fontSize: '0.85rem', marginBottom: '0.2rem', margin: 0 }}>Goal Feasible</h5>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0.2rem 0 0 0' }}>
                            Your current monthly savings target is sufficient to reach this goal on time!
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div style={{ padding: '0.75rem', background: 'var(--color-expense-glow)', borderLeft: '3px solid var(--color-expense)', borderRadius: '6px', marginBottom: '0.75rem', fontSize: '0.8rem', lineHeight: '1.4' }}>
                            Save an additional <strong>{formatCurrency(deficit)}/mo</strong> to meet this target.
                          </div>

                          {suggestedCuts.length > 0 ? (
                            <div>
                              <h5 style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Suggested Cuts to Fit:</h5>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                {suggestedCuts.slice(0, 3).map((cut, idx) => (
                                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{cut.category}</span>
                                    <strong>{formatCurrency(cut.suggested)} <span style={{ color: 'var(--color-expense)', fontWeight: '400', fontSize: '0.65rem' }}>(-{formatCurrency(cut.cut)})</span></strong>
                                  </div>
                                ))}
                              </div>
                              
                              <button className="btn btn-primary" onClick={() => handleApplyCuts(deficit)} style={{ width: '100%', padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, var(--color-secondary), #0891b2)', boxShadow: 'none' }}>
                                Apply Cuts for this Goal
                              </button>
                            </div>
                          ) : (
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                              No reducible budgets available to adjust.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
          
          {/* RIGHT COLUMN: Global Timeline and Parallel/Sequential Projections */}
          <div style={{ flex: '1 1 35%', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Future Timeline Analysis
            </h4>
            
            {/* Global Plan Analysis Card */}
            <div className="section-card glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem', background: 'linear-gradient(135deg, #fff, #c7d2fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Parallel Savings Forecast
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Total Goals Value</span>
                  <strong style={{ fontSize: '1.15rem' }}>{formatCurrency(totalCost)}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Total Monthly Goal Rate</span>
                  <strong style={{ fontSize: '1.15rem', color: 'var(--color-secondary)' }}>{formatCurrency(totalParallelMonthlyRequired)}/mo</strong>
                </div>
              </div>
              
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Combined Savings Health (Parallel)</span>
                {isCombinedFeasible ? (
                  <div style={{ padding: '0.75rem', background: 'var(--color-income-glow)', borderLeft: '3px solid var(--color-income)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                    <strong>✅ Parallel savings is fully feasible!</strong> You can save for all goals simultaneously under your active monthly savings target of {formatCurrency(currentSavingsTarget)}/mo.
                  </div>
                ) : (
                  <div>
                    <div style={{ padding: '0.75rem', background: 'var(--color-expense-glow)', borderLeft: '3px solid var(--color-expense)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: '1.4', marginBottom: '1rem' }}>
                      <strong>⚠️ Combined monthly savings deficit of {formatCurrency(combinedDeficit)}/mo.</strong> Saving for all goals in parallel exceeds your monthly savings target.
                    </div>
                    
                    <button 
                      className="btn btn-primary" 
                      onClick={() => handleApplyCuts(combinedDeficit)}
                      style={{ width: '100%', padding: '0.5rem 1rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, var(--color-primary), #4338ca)', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.2)' }}
                    >
                      ⚡ Cut Budgets for All Goals (Parallel)
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Sequential Timeline Card */}
            <div className="section-card glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.04)' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: 0, marginBottom: '0.25rem' }}>
                Sequential Timeline
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 0, marginBottom: '1.5rem' }}>
                If you purchase goals one-by-one, sorting from shortest timeframe:
              </p>
              
              {currentSavingsTarget <= 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>💡</span>
                  Please set a positive monthly savings target in your onboarding settings to generate your timeline forecast.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid rgba(255,255,255,0.08)' }}>
                  
                  {sequentialTimeline.map((item, index) => {
                    const months = item.achievedMonth;
                    let timeLabel = '';
                    if (months === 'Never') {
                      timeLabel = 'Never';
                    } else if (months < 12) {
                      timeLabel = `${months}m`;
                    } else {
                      const yrs = Math.floor(months / 12);
                      const rem = months % 12;
                      timeLabel = rem > 0 ? `${yrs}y ${rem}m` : `${yrs}y`;
                    }

                    return (
                      <div key={item.id} style={{ position: 'relative', marginBottom: index === sequentialTimeline.length - 1 ? 0 : '1.5rem' }}>
                        {/* Timeline Circle Node */}
                        <div style={{
                          position: 'absolute',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          left: '-22px',
                          top: '4px',
                          background: item.isDelay ? 'var(--color-expense)' : 'var(--color-income)',
                          border: '2px solid var(--bg-primary)',
                          boxShadow: item.isDelay ? '0 0 8px var(--color-expense)' : '0 0 8px var(--color-income)'
                        }} />
                        
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h5 style={{ fontSize: '0.9rem', fontWeight: '600', margin: 0, paddingRight: '0.5rem' }}>{item.title}</h5>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              color: item.isDelay ? 'var(--color-expense)' : 'var(--color-income)',
                              padding: '0.1rem 0.4rem',
                              background: item.isDelay ? 'var(--color-expense-glow)' : 'var(--color-income-glow)',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap'
                            }}>
                              {timeLabel}
                            </span>
                          </div>
                          
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <span>Cost: {formatCurrency(item.targetAmount)}</span>
                            <span>Target: {item.timeframeMonths}m</span>
                          </div>
                          
                          {item.isDelay && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-expense)', marginTop: '0.25rem', fontWeight: '500' }}>
                              ⚠️ Delayed by {item.delayMonths} {item.delayMonths === 1 ? 'month' : 'months'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                </div>
              )}
            </div>
            
          </div>
          
        </div>
      )}
    </div>
  );
}
