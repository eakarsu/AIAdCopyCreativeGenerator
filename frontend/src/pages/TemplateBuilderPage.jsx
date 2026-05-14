import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiZap, FiLoader, FiPlus, FiTrash2, FiLayout } from 'react-icons/fi';
import { aiAPI } from '../services/api';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';

export default function TemplateBuilderPage() {
  const navigate = useNavigate();
  const [template, setTemplate] = useState('Get {discount}% off {product} - perfect for {audience}!');
  const [slots, setSlots] = useState([
    { name: 'discount', values: '20, 30, 50' },
    { name: 'product', values: 'Premium Plan, Annual Subscription' },
    { name: 'audience', values: 'busy professionals, growing teams' },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const detectedSlots = useMemo(() => {
    const matches = template.match(/\{(\w+)\}/g) || [];
    return [...new Set(matches.map(m => m.slice(1, -1)))];
  }, [template]);

  const updateSlot = (i, field, value) => {
    setSlots(s => s.map((slot, idx) => idx === i ? { ...slot, [field]: value } : slot));
  };

  const addSlot = () => setSlots(s => [...s, { name: '', values: '' }]);
  const removeSlot = (i) => setSlots(s => s.filter((_, idx) => idx !== i));

  const run = async () => {
    if (!template.trim()) return toast.error('Template required');
    const slotMap = {};
    slots.forEach(s => {
      if (s.name) slotMap[s.name] = s.values.split(',').map(v => v.trim()).filter(Boolean);
    });
    setLoading(true);
    setResult(null);
    try {
      const { data } = await aiAPI.templateExpand(template, slotMap);
      setResult(data.response);
      toast.success('Variants generated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}><FiArrowLeft /> Back</button>
        <div className="page-title">
          <div className="feature-icon-sm" style={{ background: '#8b5cf6' }}><FiLayout size={18} color="#fff" /></div>
          <h1>Copy Template Builder</h1>
        </div>
      </header>

      <div className="form-group">
        <label>Template (use {'{slot_name}'} for variables)</label>
        <textarea value={template} onChange={e => setTemplate(e.target.value)} rows={3}
          placeholder="e.g. Get {discount}% off {product}!" />
        <p style={{ fontSize: 12, color: 'var(--text-muted, #888)', marginTop: 4 }}>
          Detected slots: {detectedSlots.length > 0 ? detectedSlots.join(', ') : 'none'}
        </p>
      </div>

      <div className="form-group">
        <label>Slots</label>
        {slots.map((slot, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input type="text" value={slot.name} onChange={e => updateSlot(i, 'name', e.target.value)}
              placeholder="slot_name" style={{ flex: 1, padding: 8 }} />
            <input type="text" value={slot.values} onChange={e => updateSlot(i, 'values', e.target.value)}
              placeholder="value1, value2, value3" style={{ flex: 3, padding: 8 }} />
            <button type="button" className="btn-icon btn-danger" onClick={() => removeSlot(i)}><FiTrash2 /></button>
          </div>
        ))}
        <button type="button" className="btn btn-outline btn-sm" onClick={addSlot}><FiPlus /> Add Slot</button>
      </div>

      <button className="btn btn-primary" onClick={run} disabled={loading}>
        {loading ? <><FiLoader className="spin" /> Expanding template...</> : <><FiZap /> Generate Variants</>}
      </button>

      {result && <div style={{ marginTop: 24 }}><AIOutput data={result} /></div>}
    </div>
  );
}
