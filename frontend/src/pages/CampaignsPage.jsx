import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiTrash2, FiX, FiBriefcase, FiLoader, FiEdit } from 'react-icons/fi';
import { campaignAPI } from '../services/api';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['draft', 'active', 'paused', 'completed', 'archived'];
const STATUS_COLORS = { draft: '#888', active: '#22c55e', paused: '#f97316', completed: '#3b82f6', archived: '#6b7280' };

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [form, setForm] = useState({ name: '', description: '', status: 'draft', objective: '', budget: '', start_date: '', end_date: '' });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await campaignAPI.list({ page: pagination.page, limit: 20 });
      setItems(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load campaigns'); }
    finally { setLoading(false); }
  }, [pagination.page]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openNew = () => {
    setEditItem(null);
    setForm({ name: '', description: '', status: 'draft', objective: '', budget: '', start_date: '', end_date: '' });
    setShowForm(true);
  };

  const openEdit = (item, e) => {
    e.stopPropagation();
    setEditItem(item);
    setForm({
      name: item.name, description: item.description || '',
      status: item.status, objective: item.objective || '',
      budget: item.budget || '', start_date: item.start_date?.split('T')[0] || '',
      end_date: item.end_date?.split('T')[0] || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setSubmitting(true);
    try {
      const payload = { ...form, start_date: form.start_date || null, end_date: form.end_date || null };
      if (editItem) {
        await campaignAPI.update(editItem.id, payload);
        toast.success('Campaign updated');
      } else {
        await campaignAPI.create(payload);
        toast.success('Campaign created');
      }
      setShowForm(false);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save campaign');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this campaign?')) return;
    try {
      await campaignAPI.delete(id);
      toast.success('Deleted');
      fetchItems();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}><FiArrowLeft /> Back</button>
        <div className="page-title">
          <div className="feature-icon-sm" style={{ background: '#6366f1' }}><FiBriefcase size={18} color="#fff" /></div>
          <h1>Campaign Workspace</h1>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openNew}><FiPlus /> New Campaign</button>
        </div>
      </header>

      <div className="items-table">
        <table>
          <thead>
            <tr><th>Name</th><th>Status</th><th>Objective</th><th>Budget</th><th>Content</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="table-empty">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="table-empty">No campaigns yet. Create your first one!</td></tr>
            ) : items.map(item => (
              <tr key={item.id} onClick={() => navigate(`/campaigns/${item.id}`)} className="clickable-row">
                <td className="td-title">{item.name}</td>
                <td><span className="badge" style={{ background: STATUS_COLORS[item.status] || '#888', color: '#fff' }}>{item.status}</span></td>
                <td style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.objective || '—'}</td>
                <td>{item.budget || '—'}</td>
                <td>{item.content_count || 0} items</td>
                <td className="td-date">{new Date(item.created_at).toLocaleDateString()}</td>
                <td className="td-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn-icon" onClick={(e) => openEdit(item, e)}><FiEdit /></button>
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

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit Campaign' : 'New Campaign'}</h2>
              <button className="btn-icon" onClick={() => setShowForm(false)}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Objective</label>
                  <input type="text" value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} placeholder="e.g. Increase signups by 30%" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Budget</label>
                    <input type="text" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="e.g. $10,000/month" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <><FiLoader className="spin" /> Saving...</> : editItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
