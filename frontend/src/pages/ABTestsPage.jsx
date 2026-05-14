import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiZap, FiX, FiLoader, FiAward } from 'react-icons/fi';
import { abTestAPI } from '../services/api';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';

export default function ABTestsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [form, setForm] = useState({ campaign_id: '', product_description: '', target_audience: '' });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await abTestAPI.list({ page: pagination.page, limit: 20 });
      setItems(data.data);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load A/B tests');
    } finally {
      setLoading(false);
    }
  }, [pagination.page]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.product_description.trim()) return toast.error('Product description is required');
    setSubmitting(true);
    try {
      const payload = {
        product_description: form.product_description,
        target_audience: form.target_audience || undefined,
      };
      if (form.campaign_id) payload.campaign_id = form.campaign_id;
      const { data } = await abTestAPI.create(payload);
      toast.success('A/B test variants generated!');
      setShowForm(false);
      setForm({ campaign_id: '', product_description: '', target_audience: '' });
      setSelected(data);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create A/B test');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWinner = async (id, winner) => {
    try {
      const { data } = await abTestAPI.setWinner(id, winner);
      toast.success(`Winner set to variant ${winner.toUpperCase()}`);
      if (selected && (selected.ab_test?.id === id || selected.id === id)) {
        setSelected({ ...selected, ab_test: data.ab_test, winner: data.ab_test.winner });
      }
      fetch();
    } catch {
      toast.error('Failed to set winner');
    }
  };

  const parseVariant = (v) => {
    if (!v) return null;
    if (typeof v === 'string') {
      try { return JSON.parse(v); } catch { return { content: v }; }
    }
    return v;
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}><FiArrowLeft /> Back</button>
        <div className="page-title">
          <div className="feature-icon-sm" style={{ background: '#ec4899' }}><FiAward size={18} color="#fff" /></div>
          <h1>A/B Testing Framework</h1>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><FiPlus /> New A/B Test</button>
        </div>
      </header>

      <div className="items-table">
        <table>
          <thead>
            <tr>
              <th>Test ID</th>
              <th>Campaign</th>
              <th>Variant A</th>
              <th>Variant B</th>
              <th>Winner</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="table-empty">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="table-empty">No A/B tests yet. Create your first one!</td></tr>
            ) : items.map(item => (
              <tr key={item.id} onClick={() => setSelected({ ab_test: item })} className="clickable-row">
                <td>#{item.id}</td>
                <td>{item.campaign_id || '-'}</td>
                <td><span className="badge">Headlines</span></td>
                <td><span className="badge badge-outline">Ad Copy</span></td>
                <td>
                  {item.winner
                    ? <span className={`status-badge status-active`}>Variant {item.winner.toUpperCase()}</span>
                    : <span className="status-badge status-draft">Pending</span>}
                </td>
                <td className="td-date">{new Date(item.created_at).toLocaleDateString()}</td>
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
              <h2><FiZap /> Generate A/B Test Variants</h2>
              <button className="btn-icon" onClick={() => setShowForm(false)}><FiX /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Product Description *</label>
                  <textarea
                    value={form.product_description}
                    onChange={e => setForm({ ...form, product_description: e.target.value })}
                    placeholder="Describe the product you want to test..."
                    rows={4} required
                  />
                </div>
                <div className="form-group">
                  <label>Target Audience</label>
                  <input
                    type="text"
                    value={form.target_audience}
                    onChange={e => setForm({ ...form, target_audience: e.target.value })}
                    placeholder="e.g. Tech-savvy millennials, urban professionals"
                  />
                </div>
                <div className="form-group">
                  <label>Campaign ID (optional)</label>
                  <input
                    type="number"
                    value={form.campaign_id}
                    onChange={e => setForm({ ...form, campaign_id: e.target.value })}
                    placeholder="Link to a campaign"
                  />
                </div>
                <p style={{ color: 'var(--text-muted, #888)', fontSize: 13 }}>
                  Variant A will be generated as headline-focused; Variant B as full ad copy.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <><FiLoader className="spin" /> Generating...</> : <><FiZap /> Generate Variants</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selected && (() => {
        const test = selected.ab_test || selected;
        const variantA = selected.variant_a || parseVariant(test.variant_a);
        const variantB = selected.variant_b || parseVariant(test.variant_b);
        return (
          <div className="modal-overlay" onClick={() => setSelected(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 900 }}>
              <div className="modal-header">
                <h2>A/B Test #{test.id}</h2>
                <button className="btn-icon" onClick={() => setSelected(null)}><FiX /></button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="ab-variant" style={{
                    border: test.winner === 'a' ? '2px solid #22c55e' : '1px solid var(--border, #ddd)',
                    borderRadius: 8, padding: 16,
                  }}>
                    <h3>Variant A {test.winner === 'a' && <FiAward color="#22c55e" />}</h3>
                    <span className="badge">{variantA?.feature || 'headlines'}</span>
                    <div style={{ marginTop: 12 }}>
                      <AIOutput data={variantA?.content || variantA} />
                    </div>
                    {!test.winner && (
                      <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }}
                        onClick={() => handleWinner(test.id, 'a')}>
                        Mark as Winner
                      </button>
                    )}
                  </div>
                  <div className="ab-variant" style={{
                    border: test.winner === 'b' ? '2px solid #22c55e' : '1px solid var(--border, #ddd)',
                    borderRadius: 8, padding: 16,
                  }}>
                    <h3>Variant B {test.winner === 'b' && <FiAward color="#22c55e" />}</h3>
                    <span className="badge badge-outline">{variantB?.feature || 'ad_copies'}</span>
                    <div style={{ marginTop: 12 }}>
                      <AIOutput data={variantB?.content || variantB} />
                    </div>
                    {!test.winner && (
                      <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }}
                        onClick={() => handleWinner(test.id, 'b')}>
                        Mark as Winner
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
