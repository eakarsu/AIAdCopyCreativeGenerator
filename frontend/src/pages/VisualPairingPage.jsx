import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiZap, FiLoader, FiImage } from 'react-icons/fi';
import { aiAPI } from '../services/api';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';

const FORMATS = ['Instagram Story (9:16)', 'Facebook Feed (1:1)', 'Twitter Card (1.91:1)',
  'LinkedIn Banner (1.91:1)', 'Display 728x90', 'Display 300x250', 'Pinterest Pin (2:3)'];

export default function VisualPairingPage() {
  const navigate = useNavigate();
  const [brief, setBrief] = useState('');
  const [format, setFormat] = useState(FORMATS[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    if (!brief.trim()) return toast.error('Brief is required');
    setLoading(true);
    setResult(null);
    try {
      const { data } = await aiAPI.visualPairing(brief, format);
      setResult(data.response);
      toast.success('Generated copy + image prompt');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}><FiArrowLeft /> Back</button>
        <div className="page-title">
          <div className="feature-icon-sm" style={{ background: '#14b8a6' }}><FiImage size={18} color="#fff" /></div>
          <h1>Visual + Copy Pairing Generator</h1>
        </div>
      </header>

      <div className="form-group">
        <label>Art Direction Brief</label>
        <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={6}
          placeholder="Product: high-end noise-cancelling headphones. Mood: focused, premium, modern. Audience: remote workers..." />
      </div>
      <div className="form-group">
        <label>Ad Format</label>
        <select value={format} onChange={e => setFormat(e.target.value)} style={{ padding: 8, width: '100%' }}>
          {FORMATS.map(f => <option key={f}>{f}</option>)}
        </select>
      </div>

      <button className="btn btn-primary" onClick={run} disabled={loading}>
        {loading ? <><FiLoader className="spin" /> Generating...</> : <><FiZap /> Generate Pair</>}
      </button>

      {result && <div style={{ marginTop: 24 }}><AIOutput data={result} /></div>}
    </div>
  );
}
