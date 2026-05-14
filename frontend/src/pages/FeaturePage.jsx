import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSearch, FiTrash2, FiX, FiZap, FiLoader, FiStar, FiCopy, FiShare2 } from 'react-icons/fi';
import { featuresAPI, aiAPI, campaignAPI } from '../services/api';
import { FEATURES } from './Dashboard';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';

export default function FeaturePage() {
  const { featureKey } = useParams();
  const navigate = useNavigate();
  const feature = FEATURES.find(f => f.key === featureKey);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiContext, setAiContext] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAI, setShowAI] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 20, feature_type: featureKey };
      if (search) params.search = search;
      if (filterFavorites) params.is_favorite = true;
      const { data } = await featuresAPI.history(params);
      setItems(data.data);
      setPagination(data.pagination);
    } catch (err) {
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [featureKey, search, pagination.page, filterFavorites]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    campaignAPI.list({ limit: 50 })
      .then(({ data }) => setCampaigns(data.data || []))
      .catch(() => {});
  }, []);

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Delete this item?')) return;
    try {
      await featuresAPI.deleteHistory(id);
      toast.success('Deleted');
      if (selectedItem?.id === id) setSelectedItem(null);
      fetchItems();
    } catch { toast.error('Failed to delete'); }
  };

  const handleToggleFavorite = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const { data } = await featuresAPI.toggleFavorite(id);
      toast.success(data.is_favorite ? 'Added to favorites' : 'Removed from favorites');
      fetchItems();
    } catch { toast.error('Failed to update favorite'); }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return toast.error('Enter a prompt');
    setAiLoading(true);
    setAiResult(null);
    try {
      const { data } = await aiAPI.generate(featureKey, aiPrompt, aiContext || undefined, selectedCampaign ? Number(selectedCampaign) : undefined);
      setAiResult(data);
      toast.success('AI content generated and saved!');
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyToClipboard = (text) => {
    const str = typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text);
    navigator.clipboard.writeText(str).then(() => toast.success('Copied to clipboard!'));
  };

  const handleShare = async (id) => {
    setShareLoading(true);
    try {
      const { data } = await aiAPI.createShare(id, 24);
      navigator.clipboard.writeText(data.share_url);
      toast.success('Share link copied! Expires in 24 hours.');
    } catch (err) {
      toast.error('Failed to create share link');
    } finally {
      setShareLoading(false);
    }
  };

  const getContentText = (result) => {
    if (!result) return '';
    const r = typeof result === 'string' ? (() => { try { return JSON.parse(result); } catch { return result; } })() : result;
    if (typeof r === 'string') return r;
    const parts = [];
    if (r.headline) parts.push(r.headline);
    if (r.body) parts.push(r.body);
    if (r.cta) parts.push(r.cta);
    return parts.length > 0 ? parts.join('\n\n') : JSON.stringify(r, null, 2);
  };

  if (!feature) return <div className="page-container"><p>Feature not found</p></div>;

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}><FiArrowLeft /> Back</button>
        <div className="page-title">
          <div className="feature-icon-sm" style={{ background: feature.color }}><feature.icon size={18} color="#fff" /></div>
          <h1>{feature.title}</h1>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => setShowAI(!showAI)}><FiZap /> {showAI ? 'Hide' : 'Show'} AI Generator</button>
        </div>
      </header>

      {showAI && (
        <div className="ai-panel">
          <div className="ai-panel-header">
            <h3><FiZap /> AI Content Generator — {feature.title}</h3>
            <button className="btn-icon" onClick={() => setShowAI(false)}><FiX /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Prompt</label>
              <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                placeholder={`Describe what you want to generate for ${feature.title}...`} rows={3} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Additional Context (optional)</label>
              <textarea value={aiContext} onChange={e => setAiContext(e.target.value)}
                placeholder="Product name, target market, key benefits..." rows={3} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            {campaigns.length > 0 && (
              <select value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border, #ddd)', minWidth: 200 }}>
                <option value="">No campaign</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <button className="btn btn-primary" onClick={handleAIGenerate} disabled={aiLoading}>
              {aiLoading ? <><FiLoader className="spin" /> Generating...</> : <><FiZap /> Generate</>}
            </button>
          </div>
          {aiResult && (
            <div className="ai-result">
              <div className="ai-result-header">
                <h4>Generated — auto-saved to history</h4>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm btn-outline" onClick={() => handleCopyToClipboard(getContentText(aiResult.response))}>
                    <FiCopy /> Copy
                  </button>
                  {aiResult.saved_id && (
                    <button className="btn btn-sm btn-outline" onClick={() => handleShare(aiResult.saved_id)} disabled={shareLoading}>
                      <FiShare2 /> Share
                    </button>
                  )}
                  {aiResult.tokens_used > 0 && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted, #888)', alignSelf: 'center' }}>
                      {aiResult.tokens_used} tokens
                    </span>
                  )}
                </div>
              </div>
              <AIOutput data={aiResult.response} />
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1 }}>
          <FiSearch />
          <input type="text" placeholder="Search by prompt or content..." value={search}
            onChange={e => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} />
        </div>
        <button
          className={'btn btn-sm ' + (filterFavorites ? 'btn-primary' : 'btn-outline')}
          onClick={() => { setFilterFavorites(f => !f); setPagination(p => ({ ...p, page: 1 })); }}
        >
          <FiStar /> Favorites only
        </button>
      </div>

      <div className="items-table">
        <table>
          <thead>
            <tr>
              <th>Prompt</th>
              <th>Preview</th>
              <th>Tokens</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="table-empty">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="table-empty">No results. Use the AI Generator above to create your first {feature.title}!</td></tr>
            ) : items.map(item => (
              <tr key={item.id} onClick={() => setSelectedItem(item)} className="clickable-row">
                <td className="td-title" style={{ maxWidth: 280 }}>{item.prompt}</td>
                <td style={{ maxWidth: 300, overflow: 'hidden', fontSize: 12, color: 'var(--text-muted, #888)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {getContentText(item.result).substring(0, 80)}
                </td>
                <td>{item.tokens_used || 0}</td>
                <td className="td-date">{new Date(item.created_at).toLocaleDateString()}</td>
                <td className="td-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn-icon" title={item.is_favorite ? 'Unfavorite' : 'Favorite'}
                    onClick={(e) => handleToggleFavorite(item.id, e)}
                    style={{ color: item.is_favorite ? '#eab308' : undefined }}>
                    <FiStar />
                  </button>
                  <button className="btn-icon" title="Copy content" onClick={() => handleCopyToClipboard(getContentText(item.result))}>
                    <FiCopy />
                  </button>
                  <button className="btn-icon btn-danger" onClick={(e) => handleDelete(item.id, e)} title="Delete"><FiTrash2 /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>Previous</button>
          <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
          <button disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Next</button>
        </div>
      )}

      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h2>{feature.title} — #{selectedItem.id}</h2>
              <button className="btn-icon" onClick={() => setSelectedItem(null)}><FiX /></button>
            </div>
            <div className="modal-body">
              <div className="detail-meta" style={{ marginBottom: 16 }}>
                <span className="detail-date">Created: {new Date(selectedItem.created_at).toLocaleString()}</span>
                {selectedItem.tokens_used > 0 && <span className="badge badge-outline">{selectedItem.tokens_used} tokens</span>}
                {selectedItem.is_favorite && <span className="badge" style={{ background: '#eab308', color: '#fff' }}>Favorite</span>}
              </div>
              {selectedItem.prompt && (
                <div style={{ marginBottom: 16 }}>
                  <h4>Prompt</h4>
                  <div style={{ padding: 12, background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}>{selectedItem.prompt}</div>
                </div>
              )}
              <h4>Result</h4>
              <AIOutput data={selectedItem.result} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => handleCopyToClipboard(getContentText(selectedItem.result))}>
                <FiCopy /> Copy Text
              </button>
              <button className="btn btn-outline" onClick={() => handleShare(selectedItem.id)} disabled={shareLoading}>
                <FiShare2 /> Share Link
              </button>
              <button className="btn btn-outline" onClick={() => handleToggleFavorite(selectedItem.id)}>
                <FiStar /> {selectedItem.is_favorite ? 'Unfavorite' : 'Favorite'}
              </button>
              <button className="btn btn-danger" onClick={(e) => { handleDelete(selectedItem.id, e); setSelectedItem(null); }}>
                <FiTrash2 /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
