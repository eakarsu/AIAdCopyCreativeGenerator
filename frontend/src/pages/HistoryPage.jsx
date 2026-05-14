import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiTrash2, FiX, FiClock, FiFilter, FiStar, FiCopy, FiShare2 } from 'react-icons/fi';
import { featuresAPI, aiAPI } from '../services/api';
import { FEATURES } from './Dashboard';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 20 };
      if (filter) params.feature_type = filter;
      if (favoritesOnly) params.is_favorite = true;
      const { data } = await featuresAPI.history(params);
      setItems(data.data);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [filter, pagination.page, favoritesOnly]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Delete this generation?')) return;
    try {
      await featuresAPI.deleteHistory(id);
      toast.success('Deleted');
      if (selected?.id === id) setSelected(null);
      fetch();
    } catch { toast.error('Failed to delete'); }
  };

  const handleToggleFavorite = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const { data } = await featuresAPI.toggleFavorite(id);
      toast.success(data.is_favorite ? 'Added to favorites' : 'Removed from favorites');
      fetch();
    } catch { toast.error('Failed to update favorite'); }
  };

  const handleCopy = (result) => {
    const text = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result || '');
    navigator.clipboard.writeText(text).then(() => toast.success('Copied!'));
  };

  const handleShare = async (id) => {
    setShareLoading(true);
    try {
      const { data } = await aiAPI.createShare(id, 24);
      navigator.clipboard.writeText(data.share_url);
      toast.success('Share link copied! Expires in 24 hours.');
    } catch { toast.error('Failed to create share link'); }
    finally { setShareLoading(false); }
  };

  const featureLabel = (key) => {
    const f = FEATURES.find(f => f.key === key);
    return f ? f.title : key;
  };

  const parseResult = (r) => {
    if (!r) return r;
    if (typeof r === 'string') { try { return JSON.parse(r); } catch { return r; } }
    return r;
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}><FiArrowLeft /> Back</button>
        <div className="page-title">
          <div className="feature-icon-sm" style={{ background: '#6366f1' }}><FiClock size={18} color="#fff" /></div>
          <h1>Generation History</h1>
        </div>
      </header>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <FiFilter />
        <select value={filter} onChange={e => { setFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          style={{ padding: 8, borderRadius: 6, border: '1px solid var(--border, #ddd)', minWidth: 240 }}>
          <option value="">All Features</option>
          {FEATURES.map(f => <option key={f.key} value={f.key}>{f.title}</option>)}
          <option value="brand_voice_check">Brand Voice Check</option>
        </select>
        <button
          className={'btn btn-sm ' + (favoritesOnly ? 'btn-primary' : 'btn-outline')}
          onClick={() => { setFavoritesOnly(f => !f); setPagination(p => ({ ...p, page: 1 })); }}
        >
          <FiStar /> Favorites only
        </button>
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted, #888)' }}>{pagination.total} total generations</span>
      </div>

      <div className="items-table">
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Prompt</th>
              <th>Tokens</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="table-empty">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="table-empty">No generations yet</td></tr>
            ) : items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)} className="clickable-row">
                <td><span className="badge">{featureLabel(item.feature_type)}</span></td>
                <td className="td-title" style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.prompt}
                </td>
                <td>{item.tokens_used || 0}</td>
                <td className="td-date">{new Date(item.created_at).toLocaleString()}</td>
                <td className="td-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn-icon" title={item.is_favorite ? 'Unfavorite' : 'Favorite'}
                    onClick={(e) => handleToggleFavorite(item.id, e)}
                    style={{ color: item.is_favorite ? '#eab308' : undefined }}>
                    <FiStar />
                  </button>
                  <button className="btn-icon" title="Copy" onClick={() => handleCopy(item.result)}><FiCopy /></button>
                  <button className="btn-icon btn-danger" onClick={(e) => handleDelete(item.id, e)}><FiTrash2 /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>Previous</button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Next</button>
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h2>Generation #{selected.id}</h2>
              <button className="btn-icon" onClick={() => setSelected(null)}><FiX /></button>
            </div>
            <div className="modal-body">
              <div className="detail-meta">
                <span className="badge">{featureLabel(selected.feature_type)}</span>
                <span className="detail-date">{new Date(selected.created_at).toLocaleString()}</span>
                {selected.is_favorite && <span className="badge" style={{ background: '#eab308', color: '#fff' }}>Favorite</span>}
              </div>
              <h3 style={{ marginTop: 16 }}>Prompt</h3>
              <div style={{ padding: 12, background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}>{selected.prompt}</div>
              <h3 style={{ marginTop: 16 }}>Result</h3>
              <AIOutput data={parseResult(selected.result)} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => handleCopy(selected.result)}><FiCopy /> Copy</button>
              <button className="btn btn-outline" onClick={() => handleShare(selected.id)} disabled={shareLoading}><FiShare2 /> Share</button>
              <button className="btn btn-outline" onClick={() => handleToggleFavorite(selected.id)}>
                <FiStar /> {selected.is_favorite ? 'Unfavorite' : 'Favorite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
