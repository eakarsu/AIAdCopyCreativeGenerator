import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiActivity, FiAlertTriangle } from 'react-icons/fi';
import { aiAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function UsagePage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    aiAPI.usage()
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Failed to load usage data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-container"><p>Loading usage data...</p></div>;

  const usageColor = data?.usage_percent >= 80 ? '#ef4444' : data?.usage_percent >= 50 ? '#eab308' : '#22c55e';

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}><FiArrowLeft /> Back</button>
        <div className="page-title">
          <div className="feature-icon-sm" style={{ background: '#06b6d4' }}><FiActivity size={18} color="#fff" /></div>
          <h1>Usage & Analytics</h1>
        </div>
      </header>

      {data?.alert && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '12px 16px', marginBottom: 24, display: 'flex', gap: 8, alignItems: 'center' }}>
          <FiAlertTriangle color="#ef4444" />
          <span style={{ color: '#ef4444' }}>You have used {data.usage_percent}% of your monthly quota. Quota resets on {data.quota_reset_date ? new Date(data.quota_reset_date).toLocaleDateString() : 'next month'}.</span>
        </div>
      )}

      <div className="dashboard-stats" style={{ marginBottom: 32 }}>
        <div className="stat-card">
          <h3>{data?.tokens_used?.toLocaleString() || 0}</h3>
          <p>Tokens Used This Month</p>
        </div>
        <div className="stat-card">
          <h3>{data?.tokens_remaining?.toLocaleString() || 0}</h3>
          <p>Tokens Remaining</p>
        </div>
        <div className="stat-card">
          <h3 style={{ color: usageColor }}>{data?.usage_percent || 0}%</h3>
          <p>Monthly Usage</p>
        </div>
        <div className="stat-card">
          <h3>{data?.monthly_limit?.toLocaleString() || 0}</h3>
          <p>Monthly Limit</p>
        </div>
      </div>

      {data && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ background: '#e5e7eb', borderRadius: 999, height: 12, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ width: `${Math.min(100, data.usage_percent)}%`, background: usageColor, height: '100%', borderRadius: 999, transition: 'width 0.5s ease' }} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted, #888)', textAlign: 'right' }}>
            {data.tokens_used?.toLocaleString()} / {data.monthly_limit?.toLocaleString()} tokens
          </p>
        </div>
      )}

      {data?.by_feature && data.by_feature.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2>Usage by Feature</h2>
          <div className="items-table">
            <table>
              <thead><tr><th>Feature</th><th>Generations</th><th>Tokens Used</th></tr></thead>
              <tbody>
                {data.by_feature.map(row => (
                  <tr key={row.feature_type}>
                    <td><span className="badge">{row.feature_type}</span></td>
                    <td>{parseInt(row.count).toLocaleString()}</td>
                    <td>{parseInt(row.tokens).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data?.daily_usage && data.daily_usage.length > 0 && (
        <div>
          <h2>Daily Activity (Last 30 Days)</h2>
          <div className="items-table">
            <table>
              <thead><tr><th>Date</th><th>Generations</th><th>Tokens</th></tr></thead>
              <tbody>
                {data.daily_usage.map(row => (
                  <tr key={row.date}>
                    <td>{new Date(row.date).toLocaleDateString()}</td>
                    <td>{parseInt(row.generations)}</td>
                    <td>{parseInt(row.tokens).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
