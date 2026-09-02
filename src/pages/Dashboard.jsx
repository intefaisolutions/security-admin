import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RevenueChart from '../components/RevenueChart';
import {
  getDashboardStats,
  getSocieties,
  getAdmins,
  getResidents,
  getGuards,
  getServices,
  getFamilyMembers,
} from '../api/admin';
import LoadingSpinner from '../components/LoadingSpinner';
import { getErrorMessage } from '../utils/getErrorMessage';

const Dashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isPasswordChanged = location.state?.passwordChanged;

  const [stats, setStats] = useState({
    societiesCount: 0,
    adminsCount: 0,
    residentsCount: 0,
    familyCount: 0,
    guardsCount: 0,
    servicesCount: 0,
    revenueGoal: 0,
    recentTransactions: [],
  });
  
  const [revenueStats, setRevenueStats] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Safely extract numerical count from various possible backend response keys
  const extractCount = (obj, keys) => {
    if (!obj || typeof obj !== 'object') return undefined;
    for (const keyPath of keys) {
      const val = keyPath.split('.').reduce((acc, k) => acc?.[k], obj);
      if (typeof val === 'number' && !isNaN(val)) return val;
      if (Array.isArray(val)) return val.length;
    }
    return undefined;
  };

  const fetchDashboardMetrics = async () => {
    setIsLoading(true);
    setError(null);

    let socCount = 0;
    let admCount = 0;
    let resCount = 0;
    let famCount = 0;
    let grdCount = 0;
    let srvCount = 0;

    try {
      // 1. Try primary backend dashboard statistics endpoint
      const dashData = await getDashboardStats();

      if (dashData) {
        socCount = extractCount(dashData, ['societiesCount', 'totalSocieties', 'societies', 'stats.totalSocieties', 'counts.societies']) ?? 0;
        admCount = extractCount(dashData, ['adminsCount', 'totalAdmins', 'admins', 'stats.totalAdmins', 'counts.admins']) ?? 0;
        resCount = extractCount(dashData, ['residentsCount', 'totalResidents', 'residents', 'stats.totalResidents', 'counts.residents']) ?? 0;
        famCount = extractCount(dashData, ['familyCount', 'totalFamilyMembers', 'familyMembersCount', 'familyMembers', 'stats.totalFamilyMembers']) ?? 0;
        grdCount = extractCount(dashData, ['guardsCount', 'totalGuards', 'guards', 'stats.totalGuards', 'counts.guards']) ?? 0;
        srvCount = extractCount(dashData, ['servicesCount', 'totalServices', 'services', 'stats.totalServices', 'counts.services']) ?? 0;
        
        if (dashData.revenueGoal !== undefined) {
          setStats(prev => ({ ...prev, revenueGoal: dashData.revenueGoal, recentTransactions: dashData.recentTransactions || [] }));
        }
      }
    } catch (err) {
      console.warn('Dashboard stats endpoint failed, falling back to direct collection counts:', err);
    }

    // 2. Fallback: Fetch direct collection lists concurrently
    try {
      const results = await Promise.allSettled([
        getSocieties(),
        getAdmins(),
        getResidents(),
        getGuards(),
        getServices(),
        getFamilyMembers(),
      ]);

      if (results[0].status === 'fulfilled' && Array.isArray(results[0].value)) {
        socCount = Math.max(socCount, results[0].value.length);
      }
      if (results[1].status === 'fulfilled' && Array.isArray(results[1].value)) {
        admCount = Math.max(admCount, results[1].value.length);
      }
      if (results[2].status === 'fulfilled' && Array.isArray(results[2].value)) {
        resCount = Math.max(resCount, results[2].value.length);
      }
      if (results[3].status === 'fulfilled' && Array.isArray(results[3].value)) {
        grdCount = Math.max(grdCount, results[3].value.length);
      }
      if (results[4].status === 'fulfilled' && Array.isArray(results[4].value)) {
        srvCount = Math.max(srvCount, results[4].value.length);
      }
      if (results[5].status === 'fulfilled' && Array.isArray(results[5].value)) {
        famCount = Math.max(famCount, results[5].value.length);
      }
    } catch (fallbackErr) {
      console.error('Fallback list count error:', fallbackErr);
    }

    setStats(prev => ({
      ...prev,
      societiesCount: socCount,
      adminsCount: admCount,
      residentsCount: resCount,
      familyCount: famCount,
      guardsCount: grdCount,
      servicesCount: srvCount,
    }));
    
    // Also fetch revenue stats for the chart if super_admin
    if (user?.role === 'super_admin') {
      try {
        const { getRevenueStats } = await import('../api/admin');
        const revData = await getRevenueStats();
        setRevenueStats(revData);
      } catch (err) {
        console.warn('Failed to fetch revenue stats for chart', err);
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  return (
    <div className="page-container">
      {user?.role === 'super_admin' && (
        <div className="card-box" style={{ padding: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--text-main)' }}>Welcome back, {user?.name || 'Super Admin'}! 👋</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Here's an overview of your platform's performance today.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link to="/admins" className="btn btn-secondary">Manage Admins</Link>
            <Link to="/revenue-overview" className="btn btn-primary">View Reports</Link>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Statistics</h1>
          <p className="page-description">Real-time metrics and system overview across all registered societies</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchDashboardMetrics} disabled={isLoading} title="Refresh Metrics">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isLoading ? 'spinner-spin' : ''}
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.2L2.5 16" />
          </svg>
        </button>
      </div>

      {isPasswordChanged && (
        <div className="alert alert-warning mb-4" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10b981', color: '#6ee7b7' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>Password changed successfully. Your account is now fully active!</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger mb-4">
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="card-box flex-center p-8">
          <LoadingSpinner text="Loading system metrics..." />
        </div>
      ) : (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon-wrapper icon-blue">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
              </div>
              <span className="stat-badge">Societies</span>
            </div>
            <div className="stat-value">{stats.societiesCount}</div>
            <div className="stat-label">Total Societies</div>
            <div className="stat-card-footer">
              <Link to="/societies" className="stat-link">
                <span>View Societies</span> &rarr;
              </Link>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon-wrapper icon-emerald">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </div>
              <span className="stat-badge">Admins</span>
            </div>
            <div className="stat-value">{stats.adminsCount}</div>
            <div className="stat-label">Total Admins</div>
            <div className="stat-card-footer">
              <Link to="/admins" className="stat-link">
                <span>Manage Admins</span> &rarr;
              </Link>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon-wrapper icon-blue">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </div>
              <span className="stat-badge">Residents</span>
            </div>
            <div className="stat-value">{stats.residentsCount}</div>
            <div className="stat-label">Residents</div>
            <div className="stat-card-footer">
              <Link to="/residents" className="stat-link">
                <span>Manage Residents</span> &rarr;
              </Link>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon-wrapper icon-purple">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
              </div>
              <span className="stat-badge">Family</span>
            </div>
            <div className="stat-value">{stats.familyCount}</div>
            <div className="stat-label">Family Members</div>
            <div className="stat-card-footer">
              <Link to="/family-members" className="stat-link">
                <span>View Family Members</span> &rarr;
              </Link>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon-wrapper icon-emerald">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="stat-badge">Security</span>
            </div>
            <div className="stat-value">{stats.guardsCount}</div>
            <div className="stat-label">Guards</div>
            <div className="stat-card-footer">
              <Link to="/guards" className="stat-link">
                <span>Manage Guards</span> &rarr;
              </Link>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon-wrapper icon-purple">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <span className="stat-badge">Services</span>
            </div>
            <div className="stat-value">{stats.servicesCount}</div>
            <div className="stat-label">Service Providers</div>
            <div className="stat-card-footer">
              <Link to="/services" className="stat-link">
                <span>Manage Services</span> &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {!isLoading && user?.role === 'super_admin' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', marginTop: '24px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Revenue Trends */}
            <div style={{ height: '350px' }}>
              <RevenueChart transactions={revenueStats?.allTransactions || []} compact={true} />
            </div>
            
            {/* Recent Payments */}
            <div className="card-box" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'var(--text-main)' }}>Recent Payments</h3>
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
                    {stats.recentTransactions?.length > 0 ? stats.recentTransactions.map(tx => (
                      <tr key={tx.id}>
                        <td>{tx.id.substring(0, 8)}...</td>
                        <td>{tx.user?.name || 'Unknown'}</td>
                        <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
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
                      <tr><td colSpan="5" className="text-center">No recent payments</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Revenue Goal Progress */}
            <div className="card-box" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'var(--text-main)' }}>Revenue Goal</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Current Period</span>
                <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>₹{revenueStats?.currentPeriodRevenue || 0}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${Math.min(((revenueStats?.currentPeriodRevenue || 0) / (stats.revenueGoal || 1)) * 100, 100)}%`,
                  background: 'var(--primary-color)' 
                }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>0</span>
                <span style={{ color: 'var(--text-muted)' }}>Target: ₹{stats.revenueGoal}</span>
              </div>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
};

export default Dashboard;
