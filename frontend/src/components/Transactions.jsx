import React, { useState } from 'react';

export function Transactions({ transactions, onEdit, onDelete, onOpenModal }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Categories helper
  const expenseCategories = ['Food', 'Rent', 'Entertainment', 'Utilities', 'Travel', 'Shopping', 'Healthcare', 'Miscellaneous'];
  const incomeCategories = ['Salary', 'Freelance', 'Investment', 'Other'];
  const allCategories = [...incomeCategories, ...expenseCategories];

  // Filtering logic
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || tx.type === filterType;
    const matchesCategory = filterCategory === 'all' || tx.category === filterCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  // Sorting logic
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === 'date-desc') {
      return new Date(b.date) - new Date(a.date);
    } else if (sortBy === 'date-asc') {
      return new Date(a.date) - new Date(b.date);
    } else if (sortBy === 'amount-desc') {
      return b.amount - a.amount;
    } else if (sortBy === 'amount-asc') {
      return a.amount - b.amount;
    }
    return 0;
  });

  // Pagination calculation
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const getCategoryBadgeClass = (category) => {
    const lower = category.toLowerCase();
    if (['food', 'rent', 'entertainment', 'utilities', 'salary', 'freelance', 'travel', 'shopping'].includes(lower)) {
      return `badge-${lower}`;
    }
    return 'badge-default';
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterCategory('all');
    setSortBy('date-desc');
    setCurrentPage(1);
  };

  return (
    <div className="section-card glass-panel">
      <div className="section-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3>Transaction Ledger</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Record, filter, and track individual cash flow entries
          </p>
        </div>
        
        <button className="btn btn-primary" onClick={() => onOpenModal()}>
          + Add Entry
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Search</label>
            <input 
              type="text" 
              placeholder="Search description..." 
              className="filter-input" 
              style={{ width: '100%', padding: '0.6rem 0.8rem' }}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Type</label>
            <select 
              className="filter-input" 
              style={{ width: '100%', padding: '0.6rem 0.8rem' }}
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Category</label>
            <select 
              className="filter-input" 
              style={{ width: '100%', padding: '0.6rem 0.8rem' }}
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Categories</option>
              {allCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Sort By</label>
            <select 
              className="filter-input" 
              style={{ width: '100%', padding: '0.6rem 0.8rem' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date-desc">Newest Date</option>
              <option value="date-asc">Oldest Date</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Found {sortedTransactions.length} transaction{sortedTransactions.length !== 1 ? 's' : ''}
          </span>
          <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={resetFilters}>
            Reset Filters
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      {currentItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
          No transactions match your search or filter settings.
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="tx-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Type</th>
                <th>Amount</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((tx) => (
                <tr key={tx.id}>
                  <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{tx.date}</td>
                  <td style={{ fontWeight: '500' }}>{tx.description}</td>
                  <td>
                    <span className={`tx-category-badge ${getCategoryBadgeClass(tx.category)}`}>
                      {tx.category}
                    </span>
                  </td>
                  <td style={{ textTransform: 'capitalize', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {tx.type}
                  </td>
                  <td>
                    <span className={`tx-amount ${tx.type === 'income' ? 'income' : 'expense'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn-icon" title="Edit" onClick={() => onEdit(tx)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      <button className="btn-icon delete" title="Delete" onClick={() => onDelete(tx.id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', padding: '1rem 0' }}>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          >
            ◀ Previous
          </button>
          
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Page {currentPage} of {totalPages}
          </span>
          
          <button 
            className="btn btn-secondary" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          >
            Next ▶
          </button>
        </div>
      )}
    </div>
  );
}
