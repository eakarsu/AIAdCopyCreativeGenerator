import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiZap, FiLoader, FiBarChart2 } from 'react-icons/fi';
import { aiAPI } from '../services/api';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';

export default function BenchmarkPage() {
  const navigate = useNavigate();
  const [industry, setIndustry] = useState('SaaS');
  const [copyText, setCopyText] = useState('');
  const [metricFocus, setMetricFocus] = useState('CTR & conversion rate');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    if (!copyText.trim()) return toast.error('Paste copy to benchmark');
    setLoading(true);
    setResult(null);
    try {
      const { data } = await aiAPI.benchmark(industry, copyText, metricFocus);
      setResult(data.response);
      toast.success('Benchmark complete');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Benchmark failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}><FiArrowLeft /> Back</button>
        <div className="page-title">
          <div className="feature-icon-sm" style={{ background: '#06b6d4' }}><FiBarChart2 size={18} color="#fff" /></div>
          <h1>Copy Performance Benchmarking</h1>
        </div>
      </header>

      <div className="form-group">
        <label>Industry</label>
        <input type="text" value={industry} onChange={e => setIndustry(e.target.value)}
          placeholder="e.g. SaaS, E-commerce, Finance, Healthcare" />
      </div>
      <div className="form-group">
        <label>Metric Focus</label>
        <input type="text" value={metricFocus} onChange={e => setMetricFocus(e.target.value)}
          placeholder="e.g. CTR & conversion rate, engagement, ROAS" />
      </div>
      <div className="form-group">
        <label>Copy to Benchmark</label>
        <textarea value={copyText} onChange={e => setCopyText(e.target.value)} rows={8}
          placeholder="Paste your ad copy here..." />
      </div>

      <button className="btn btn-primary" onClick={run} disabled={loading}>
        {loading ? <><FiLoader className="spin" /> Running benchmark...</> : <><FiZap /> Benchmark</>}
      </button>

      {result && <div style={{ marginTop: 24 }}><AIOutput data={result} /></div>}
    </div>
  );
}
