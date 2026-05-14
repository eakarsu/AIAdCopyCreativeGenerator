import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FiShare2 } from 'react-icons/fi';
import { shareAPI } from '../services/api';
import AIOutput from '../components/AIOutput';

export default function SharePage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    shareAPI.view(token)
      .then(({ data }) => setData(data))
      .catch(err => setError(err.response?.data?.error || 'Share link not found or has expired'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p>Loading shared content...</p>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <FiShare2 size={48} style={{ opacity: 0.3 }} />
      <h2>Share Link Unavailable</h2>
      <p style={{ color: 'var(--text-muted, #888)' }}>{error}</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, color: 'var(--text-muted, #888)' }}>
        <div style={{ width: 32, height: 32, borderRadius: 6, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>AI</span>
        </div>
        <span>Ad Copy & Creative Generator</span>
        <span style={{ marginLeft: 'auto', fontSize: 12 }}>Shared by {data.content.author_name || 'a user'} · Expires {new Date(data.expires_at).toLocaleDateString()}</span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <span className="badge" style={{ marginRight: 8 }}>{data.content.feature_type}</span>
        <span style={{ color: 'var(--text-muted, #888)', fontSize: 13 }}>
          Created {new Date(data.content.created_at).toLocaleDateString()} · {data.view_count} view{data.view_count !== 1 ? 's' : ''}
        </span>
      </div>

      {data.content.prompt && (
        <div style={{ padding: 16, background: 'rgba(0,0,0,0.04)', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
          <b>Prompt:</b> {data.content.prompt}
        </div>
      )}

      <AIOutput data={data.content.result} />

      <div style={{ marginTop: 48, textAlign: 'center', color: 'var(--text-muted, #888)', fontSize: 13 }}>
        Generated with AI Ad Copy & Creative Generator
      </div>
    </div>
  );
}
