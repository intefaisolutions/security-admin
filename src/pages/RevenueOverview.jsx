import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import RevenueChart from '../components/RevenueChart';
import { getRevenueStats, getRevenueTransactions, updateRevenueGoal } from '../api/admin';
import LoadingSpinner from '../components/LoadingSpinner';

const RevenueOverview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Table state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Goal state
  const [goalInput, setGoalInput] = useState('');
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false);
  const [currentGoal, setCurrentGoal] = useState(50000);

  const fetchRevenueData = async () => {
    setIsLoading(true);
    try {
      const [statsData, txData] = await Promise.all([
        getRevenueStats(),
        getRevenueTransactions({ page, limit: 10, search, status: statusFilter })
      ]);
      setStats(statsData);
      setTransactions(txData.transactions);
      setTotalPages(txData.pages);
      
      // We also need current goal, which is in dashboard stats, or we can just fetch it. 
      // Actually, since we didn't add a specific endpoint to GET goal alone, we can just use the dashboard endpoint or default to 50000.
      const { getDashboardStats } = await import('../api/admin');
      const dashData = await getDashboardStats();
      if (dashData && dashData.revenueGoal) {
        setCurrentGoal(dashData.revenueGoal);
        setGoalInput(dashData.revenueGoal.toString());
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch revenue data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchRevenueData();
    }
  }, [user, page, statusFilter]);

  // Debounced search
  useEffect(() => {
    if (user?.role !== 'super_admin') return;
    const timer = setTimeout(() => {
      setPage(1);
      fetchRevenueData();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleUpdateGoal = async (e) => {
    e.preventDefault();
    if (!goalInput || isNaN(goalInput)) return;
    
    setIsUpdatingGoal(true);
    try {
      const res = await updateRevenueGoal(parseFloat(goalInput));
      setCurrentGoal(res.revenueGoal);
      alert('Revenue goal updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update revenue goal.');
    } finally {
      setIsUpdatingGoal(false);
    }
  };

  if (user?.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Revenue Overview</h1>
          <p className="page-description">Detailed financial reports and transaction history.</p>
        </div>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      {isLoading && !stats ? (
        <div className="card-box flex-center p-8">
          <LoadingSpinner text="Loading revenue data..." />
        </div>
      ) : (
        <>
          {/* Summary Stat Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div className="card-box" style={{ padding: '20px' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Total Revenue (This Month)</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>₹{stats?.currentPeriodRevenue || 0}</div>
              <div style={{ 
                marginTop: '8px', 
                color: (stats?.percentageChange || 0) >= 0 ? '#10b981' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {(stats?.percentageChange || 0) >= 0 ? '↑' : '↓'} {Math.abs(stats?.percentageChange || 0)}% vs last month
              </div>
            </div>
            
            <div className="card-box" style={{ padding: '20px' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Revenue Goal</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>₹{currentGoal}</div>
              
              <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden', marginTop: '12px' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${Math.min(((stats?.currentPeriodRevenue || 0) / (currentGoal || 1)) * 100, 100)}%`,
                  background: 'var(--primary-color)' 
                }}></div>
              </div>
              <div style={{ marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                {Math.round(((stats?.currentPeriodRevenue || 0) / (currentGoal || 1)) * 100)}% achieved
              </div>
            </div>
            
            <div className="card-box" style={{ padding: '20px' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Update Goal</div>
              <form onSubmit={handleUpdateGoal} style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="number" 
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="form-control"
                  style={{ flex: 1 }}
                  placeholder="Enter new goal"
                />
                <button type="submit" className="btn btn-primary" disabled={isUpdatingGoal}>
                  {isUpdatingGoal ? 'Saving...' : 'Update'}
                </button>
              </form>
            </div>
          </div>
          
          {/* Expanded Chart */}
          <div style={{ height: '400px', marginBottom: '24px' }}>
            <RevenueChart transactions={stats?.allTransactions || []} compact={false} />
          </div>
          
          {/* Paginated Transactions Table */}
          <div className="card-box">
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Transaction History</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text"
                  placeholder="Search by ID or Admin Name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-control"
                  style={{ maxWidth: '250px' }}
                />
                <select 
                  className="form-control" 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
            
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Admin Name</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length > 0 ? transactions.map(tx => (
                    <tr key={tx.id}>
                      <td>{tx.id}</td>
                      <td>{tx.user?.name || 'Unknown'}</td>
                      <td>{new Date(tx.createdAt).toLocaleString()}</td>
                      <td>₹{tx.amount}</td>
                      <td>
                        <span className={`badge badge-${
                          tx.status === 'completed' ? 'success' : 
                          tx.status === 'pending' ? 'warning' : 'danger'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="text-center p-4">No transactions found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)' }}>
                <button 
                  className="btn btn-secondary"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </button>
                <span style={{ color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
                <button 
                  className="btn btn-secondary"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RevenueOverview;
