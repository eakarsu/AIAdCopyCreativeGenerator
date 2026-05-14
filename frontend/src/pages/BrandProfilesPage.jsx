import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiTrash2, FiX, FiShield, FiLoader, FiCheckCircle } from 'react-icons/fi';
import { brandProfileAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function BrandProfilesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', industry: '', tone_of_voice: '', target_persona: '', competitor_names: '', brand_guidelines: '', is_active: false });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await brandProfileAPI.list();
      setItems(data.data);
    } catch { toast.error('Failed to load brand profiles'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openNew = () => {
    setEditItem(null);
    setForm({ name: '', industry: '', tone_of_voice: '', target_persona: '', competitor_names: '', brand_guidelines: '', is_active: false });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name, industry: item.industry || '', tone_of_voice: item.tone_of_voice || '', target_persona: item.target_persona || '', competitor_names: item.competitor_names || '', brand_guidelines: item.brand_guidelines || '', is_active: item.is_active });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editItem) {
        await brandProfileAPI.update(editItem.id, form);
        toast.success('Brand profile updated');
      } else {
        await brandProfileAPI.create(form);
        toast.success('Brand profile created');
      }
      setShowForm(false);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally { setSubmitting(false); }
  };

  const handleActivate = async (id) => {
    try {
      await brandProfileAPI.activate(id);
      toast.success('Brand profile set as active — will be injected into all AI generations');
      fetchItems();
    } catch { toast.error('Failed to activate'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this brand profile?')) return;
    try {
      await brandProfileAPI.delete(id);
      toast.success('Deleted');
      fetchItems();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}><FiArrowLeft /> Back</button>
        <div className="page-title">
          <div className="feature-icon-sm" style={{ background: '#22c55e' }}><FiShield size={18} color="#fff" /></div>
          <div>
            <h1>Brand Profiles</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted, #888)', margin: 0 }}>Active profile is auto-injected into every AI generation</p>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openNew}><FiPlus /> New Profile</button>
        </div>
      </header>

      {loading ? <p>Loading...</p> : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted, #888)' }}>
          <FiShield size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
          <p>No brand profiles yet. Create one to auto-inject your brand context into AI generations.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {items.map(item => (
            <div key={item.id} style={{
              border: item.is_active ? '2px solid #22c55e' : '1px solid var(--border, #e5e7eb)',
              borderRadius: 12, padding: 20,
              background: item.is_active ? 'rgba(34,197,94,0.05)' : 'var(--card-bg, #fff)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h3 style={{ margin: 0 }}>{item.name}</h3>
                    {item.is_active && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#22c55e', fontSize: 12, fontWeight: 600 }}>
                        <FiCheckCircle size={14} /> Active
                      </span>
                    )}
                  </div>
                  {item.industry && <p style={{ fontSize: 13, color: 'var(--text-muted, #888)', margin: 0 }}>Industry: {item.industry}</p>}
                  {item.tone_of_voice && <p style={{ fontSize: 13, marginTop: 4 }}>Tone: {item.tone_of_voice.substring(0, 100)}{item.tone_of_voice.length > 100 ? '...' : ''}</p>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!item.is_active && (
                    <button className="btn btn-sm btn-outline" onClick={() => handleActivate(item.id)}>
                      Set Active
                    </button>
                  )}
                  <button className="btn btn-sm btn-outline" onClick={() => openEdit(item)}>Edit</button>
                  <button className="btn-icon btn-danger" onClick={() => handleDelete(item.id)}><FiTrash2 /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit Brand Profile' : 'New Brand Profile'}</h2>
              <button className="btn-icon" onClick={() => setShowForm(false)}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Brand Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Acme Corp" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Industry</label>
                    <input type="text" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="e.g. SaaS, E-commerce, Healthcare" />
                  </div>
                  <div className="form-group">
                    <label>Competitors</label>
                    <input type="text" value={form.competitor_names} onChange={e => setForm({ ...form, competitor_names: e.target.value })} placeholder="e.g. HubSpot, Salesforce" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Tone of Voice</label>
                  <textarea value={form.tone_of_voice} onChange={e => setForm({ ...form, tone_of_voice: e.target.value })} rows={2} placeholder="e.g. Professional yet friendly. Clear and direct. Always use 'we'. Avoid jargon." />
                </div>
                <div className="form-group">
                  <label>Target Persona</label>
                  <textarea value={form.target_persona} onChange={e => setForm({ ...form, target_persona: e.target.value })} rows={2} placeholder="e.g. Marketing managers at mid-market SaaS companies, 28-45, managing $50K+ monthly ad budgets" />
                </div>
                <div className="form-group">
                  <label>Full Brand Guidelines</label>
                  <textarea value={form.brand_guidelines} onChange={e => setForm({ ...form, brand_guidelines: e.target.value })} rows={5} placeholder="Comprehensive brand guidelines, dos and don'ts, vocabulary..." />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                  <label htmlFor="is_active" style={{ margin: 0 }}>Set as active profile (auto-injects into AI generations)</label>
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
