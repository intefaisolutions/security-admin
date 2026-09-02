import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const RevenueChart = ({ transactions, compact = false }) => {
  const [viewMode, setViewMode] = useState('Daily');

  const chartData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    const groups = {};
    
    transactions.forEach(tx => {
      const date = new Date(tx.createdAt);
      let key = '';
      
      if (viewMode === 'Daily') {
        key = date.toLocaleDateString();
      } else if (viewMode === 'Monthly') {
        key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      } else {
        key = date.getFullYear().toString();
      }
      
      if (!groups[key]) groups[key] = 0;
      groups[key] += tx.type === 'debit' ? -tx.amount : tx.amount;
    });
    
    return Object.keys(groups).map(key => ({
      name: key,
      amount: groups[key]
    })).slice(compact ? -7 : undefined); // if compact, show only last 7
  }, [transactions, viewMode, compact]);

  return (
    <div className={`card-box ${compact ? 'compact-chart' : 'detailed-chart'}`} style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, fontSize: compact ? '1.1rem' : '1.3rem', color: 'var(--text-main)' }}>Revenue Trends</h3>
        <div style={{ display: 'flex', gap: '5px' }}>
          {['Daily', 'Monthly', 'Yearly'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '4px 8px',
                fontSize: '0.8rem',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                background: viewMode === mode ? 'var(--primary-color)' : 'transparent',
                color: viewMode === mode ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ flex: 1, minHeight: compact ? 200 : 350, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            {!compact && <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />}
            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              itemStyle={{ color: 'var(--primary-color)' }}
              formatter={(value) => [`₹${value}`, 'Revenue']}
            />
            <Line type="monotone" dataKey="amount" stroke="var(--primary-color)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary-color)' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueChart;
