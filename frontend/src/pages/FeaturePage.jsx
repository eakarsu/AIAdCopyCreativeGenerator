import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiSearch, FiTrash2, FiEdit, FiX, FiZap, FiLoader } from 'react-icons/fi';
import { featuresAPI, aiAPI } from '../services/api';
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
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '', category: '', platform: '', status: 'active' });
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await featuresAPI.list(featureKey, { search, page: pagination.page, limit: 50 });
      setItems(data.data);
      setPagination(data.pagination);
    } catch (err) {
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [featureKey, search, pagination.page]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setShowDetail(true);
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await featuresAPI.delete(featureKey, id);
      toast.success('Item deleted');
      if (showDetail && selectedItem?.id === id) setShowDetail(false);
      fetchItems();
    } catch { toast.error('Failed to delete'); }
  };

  const handleEdit = (item, e) => {
    if (e) e.stopPropagation();
    setEditItem(item);
    setFormData({
      title: item.title,
      content: typeof item.content === 'object' ? JSON.stringify(item.content, null, 2) : item.content,
      category: item.category || '',
      platform: item.platform || '',
      status: item.status || 'active',
    });
    setShowForm(true);
  };

  const handleNew = () => {
    setEditItem(null);
    setFormData({ title: '', content: '', category: '', platform: '', status: 'active' });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let content = formData.content;
      try { content = JSON.parse(content); } catch {}
      const payload = { ...formData, content };
      if (editItem) {
        await featuresAPI.update(featureKey, editItem.id, payload);
        toast.success('Item updated');
      } else {
        await featuresAPI.create(featureKey, payload);
        toast.success('Item created');
      }
      setShowForm(false);
      fetchItems();
    } catch { toast.error('Failed to save'); }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return toast.error('Enter a prompt');
    setAiLoading(true);
    setAiResult(null);
    try {
      const { data } = await aiAPI.generate(featureKey, aiPrompt);
      setAiResult(data);
      toast.success('AI content generated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAIResult = async () => {
    if (!aiResult) return;
    try {
      const content = aiResult.response;
      await featuresAPI.create(featureKey, {
        title: `AI Generated - ${new Date().toLocaleDateString()}`,
        content,
        category: 'AI Generated',
        platform: 'AI',
        status: 'draft',
      });
      toast.success('AI result saved!');
      fetchItems();
    } catch { toast.error('Failed to save AI result'); }
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
          <button className="btn btn-secondary" onClick={() => setShowAI(!showAI)}><FiZap /> AI Generate</button>
          <button className="btn btn-primary" onClick={handleNew}><FiPlus /> New Item</button>
        </div>
      </header>

      {showAI && (
        <div className="ai-panel">
          <div className="ai-panel-header">
            <h3><FiZap /> AI Content Generator</h3>
            <button className="btn-icon" onClick={() => setShowAI(false)}><FiX /></button>
          </div>
          <div className="ai-input-group">
            <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder={`Describe what you want to generate for ${feature.title}...`} rows={3} />
            <button className="btn btn-primary" onClick={handleAIGenerate} disabled={aiLoading}>
              {aiLoading ? <><FiLoader className="spin" /> Generating...</> : <><FiZap /> Generate</>}
            </button>
          </div>
          {aiResult && (
            <div className="ai-result">
              <div className="ai-result-header">
                <h4>AI Generated Result</h4>
                <button className="btn btn-sm btn-primary" onClick={handleSaveAIResult}>Save to Library</button>
              </div>
              <AIOutput data={aiResult.response} />
            </div>
          )}
        </div>
      )}

      <div className="search-bar">
        <FiSearch />
        <input type="text" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="items-table">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Platform</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="table-empty">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="table-empty">No items found. Create your first one!</td></tr>
            ) : items.map(item => (
              <tr key={item.id} onClick={() => handleRowClick(item)} className="clickable-row">
                <td className="td-title">{item.title}</td>
                <td><span className="badge">{item.category}</span></td>
                <td><span className="badge badge-outline">{item.platform}</span></td>
                <td><span className={`status-badge status-${item.status}`}>{item.status}</span></td>
                <td className="td-date">{new Date(item.created_at).toLocaleDateString()}</td>
                <td className="td-actions">
                  <button className="btn-icon" onClick={(e) => handleEdit(item, e)} title="Edit"><FiEdit /></button>
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
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Next</button>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem.title}</h2>
              <button className="btn-icon" onClick={() => setShowDetail(false)}><FiX /></button>
            </div>
            <div className="modal-body">
              <div className="detail-meta">
                <span className="badge">{selectedItem.category}</span>
                <span className="badge badge-outline">{selectedItem.platform}</span>
                <span className={`status-badge status-${selectedItem.status}`}>{selectedItem.status}</span>
                <span className="detail-date">Created: {new Date(selectedItem.created_at).toLocaleString()}</span>
              </div>
              <div className="detail-content">
                <AIOutput data={selectedItem.content} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { handleEdit(selectedItem); setShowDetail(false); }}><FiEdit /> Edit</button>
              <button className="btn btn-danger" onClick={() => handleDelete(selectedItem.id)}><FiTrash2 /> Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit Item' : 'New Item'}</h2>
              <button className="btn-icon" onClick={() => setShowForm(false)}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Title</label>
                  <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <input type="text" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Platform</label>
                    <input type="text" value={formData.platform} onChange={e => setFormData({ ...formData, platform: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Content (JSON)</label>
                  <textarea value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} rows={10} placeholder='{"key": "value"}' />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
