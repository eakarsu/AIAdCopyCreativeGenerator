import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiZap, FiLoader, FiUsers } from 'react-icons/fi';
import { aiAPI } from '../services/api';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';

export default function PersonaGeneratorPage() {
  const navigate = useNavigate();
  const [productOrOffer, setProductOrOffer] = useState('');
  const [market, setMarket] = useState('');
  const [count, setCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    if (!productOrOffer.trim()) return toast.error('Describe the product or offer first');
    setLoading(true);
    setResult(null);
    try {
      const { data } = await aiAPI.generatePersona(productOrOffer, market, count);
      setResult(data.response);
      toast.success(`Generated ${count} persona${count > 1 ? 's' : ''}`);
    } catch (err) {
      if (err.response?.status === 503) {
        toast.error('AI not configured. Set OPENROUTER_API_KEY in the backend environment.');
      } else {
        toast.error(err.response?.data?.error || 'Persona generation failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}><FiArrowLeft /> Back</button>
        <div className="page-title">
          <div className="feature-icon-sm" style={{ background: '#a855f7' }}><FiUsers size={18} color="#fff" /></div>
          <h1>AI Audience Persona Generator</h1>
        </div>
      </header>

      <div className="form-group">
        <label>Product / Offer</label>
        <textarea value={productOrOffer} onChange={(e) => setProductOrOffer(e.target.value)} rows={5}
          placeholder="Describe the product, service, or offer you're advertising. Include benefits, price tier, and category." />
      </div>

      <div className="form-group">
        <label>Target Market Context (optional)</label>
        <input type="text" value={market} onChange={(e) => setMarket(e.target.value)}
          placeholder="e.g. North America DTC, B2B SaaS in EU, Gen Z in APAC" />
      </div>

      <div className="form-group">
        <label>Number of personas</label>
        <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
          {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <button className="btn btn-primary" onClick={run} disabled={loading}>
        {loading ? <><FiLoader className="spin" /> Generating...</> : <><FiZap /> Generate Personas</>}
      </button>

      {result && <div style={{ marginTop: 24 }}><AIOutput data={result} /></div>}
    </div>
  );
}
