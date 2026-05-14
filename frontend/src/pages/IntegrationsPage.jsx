import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiActivity, FiUploadCloud, FiBarChart2, FiSearch } from 'react-icons/fi';
import { aiAPI } from '../services/api';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';

// Apply pass 5: surfaces creds-gated integrations (Meta Ad Library, competitor monitor,
// industry benchmark, ad platform upload). Each call returns 503 + missing env name when
// the corresponding key is unset; we render that inline.

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('library');

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}><FiArrowLeft /> Back</button>
        <div className="page-title">
          <h1>Integrations</h1>
          <p>Competitor research, benchmarks and ad-platform delivery (creds-gated)</p>
        </div>
      </header>

      <div className="tabs" style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <button className={`btn ${tab === 'library' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('library')}><FiSearch /> Ad Library</button>
        <button className={`btn ${tab === 'monitor' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('monitor')}><FiActivity /> Monitor</button>
        <button className={`btn ${tab === 'benchmark' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('benchmark')}><FiBarChart2 /> Industry Benchmark</button>
        <button className={`btn ${tab === 'upload' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('upload')}><FiUploadCloud /> Platform Upload</button>
      </div>

      {tab === 'library' && <AdLibraryPanel />}
      {tab === 'monitor' && <MonitorPanel />}
      {tab === 'benchmark' && <BenchmarkPanel />}
      {tab === 'upload' && <UploadPanel />}
    </div>
  );
}

function show503(err, fallback) {
  if (err.response?.status === 503) {
    const missing = err.response?.data?.missing;
    toast.error(missing ? `Missing env: ${missing}` : 'Service not configured');
  } else {
    toast.error(err.response?.data?.error || fallback);
  }
}

function AdLibraryPanel() {
  const [terms, setTerms] = useState('');
  const [country, setCountry] = useState('US');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const run = async () => {
    if (!terms.trim()) return toast.error('Search terms required');
    setLoading(true);
    setResult(null);
    try {
      const { data } = await aiAPI.competitorAdLibrary(terms, country, 'ALL');
      setResult(data);
      toast.success(`Got ${data.results?.length || 0} ads`);
    } catch (err) { show503(err, 'Ad library query failed'); }
    finally { setLoading(false); }
  };
  return (
    <div className="card">
      <p style={{ opacity: 0.7, fontSize: 13 }}>Requires META_AD_LIBRARY_TOKEN env var.</p>
      <input className="input" placeholder="Brand or terms (e.g. 'nike running')" value={terms} onChange={(e) => setTerms(e.target.value)} />
      <input className="input" placeholder="Country code (US)" value={country} onChange={(e) => setCountry(e.target.value)} />
      <button className="btn btn-primary" onClick={run} disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
      {result && <AIOutput result={result} />}
    </div>
  );
}

function MonitorPanel() {
  const [brand, setBrand] = useState('');
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const run = async () => {
    if (!brand.trim()) return toast.error('Brand name required');
    setLoading(true);
    setResult(null);
    try {
      const { data } = await aiAPI.competitorMonitor(brand, Number(hours) || 24);
      setResult(data);
      toast.success('Monitor registered');
    } catch (err) { show503(err, 'Failed to register'); }
    finally { setLoading(false); }
  };
  return (
    <div className="card">
      <p style={{ opacity: 0.7, fontSize: 13 }}>Persists monitor intent. Worker not bundled (NEEDS-CREDS: META_AD_LIBRARY_TOKEN).</p>
      <input className="input" placeholder="Brand to monitor" value={brand} onChange={(e) => setBrand(e.target.value)} />
      <input className="input" type="number" placeholder="Frequency hours" value={hours} onChange={(e) => setHours(e.target.value)} />
      <button className="btn btn-primary" onClick={run} disabled={loading}>{loading ? 'Saving...' : 'Register Monitor'}</button>
      {result && <AIOutput result={result} />}
    </div>
  );
}

function BenchmarkPanel() {
  const [industry, setIndustry] = useState('');
  const [copy, setCopy] = useState('');
  const [metric, setMetric] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const run = async () => {
    if (!industry.trim() || !copy.trim()) return toast.error('industry and copy required');
    setLoading(true); setResult(null);
    try {
      const { data } = await aiAPI.industryBenchmark(industry, copy, metric);
      setResult(data);
    } catch (err) { show503(err, 'Benchmark failed'); }
    finally { setLoading(false); }
  };
  return (
    <div className="card">
      <p style={{ opacity: 0.7, fontSize: 13 }}>Uses AI estimate by default. Set INDUSTRY_BENCHMARK_API_KEY to blend external data.</p>
      <input className="input" placeholder="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
      <textarea className="input" rows={4} placeholder="Copy to benchmark" value={copy} onChange={(e) => setCopy(e.target.value)} />
      <input className="input" placeholder="Metric focus (optional)" value={metric} onChange={(e) => setMetric(e.target.value)} />
      <button className="btn btn-primary" onClick={run} disabled={loading}>{loading ? 'Calculating...' : 'Benchmark'}</button>
      {result && <AIOutput result={result} />}
    </div>
  );
}

function UploadPanel() {
  const [platform, setPlatform] = useState('meta');
  const [payload, setPayload] = useState('{\n  "name": "My Campaign"\n}');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const run = async () => {
    let parsed;
    try { parsed = JSON.parse(payload); } catch { return toast.error('Invalid JSON'); }
    setLoading(true); setResult(null);
    try {
      const { data } = await aiAPI.adPlatformUpload(platform, parsed);
      setResult(data);
      toast.success('Queued');
    } catch (err) { show503(err, 'Upload failed'); }
    finally { setLoading(false); }
  };
  return (
    <div className="card">
      <p style={{ opacity: 0.7, fontSize: 13 }}>Queues an upload. Real platform delivery requires creds (META_ADS_*, GOOGLE_ADS_*).</p>
      <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
        <option value="meta">Meta</option>
        <option value="google">Google</option>
      </select>
      <textarea className="input" rows={6} value={payload} onChange={(e) => setPayload(e.target.value)} />
      <button className="btn btn-primary" onClick={run} disabled={loading}>{loading ? 'Queuing...' : 'Queue Upload'}</button>
      {result && <AIOutput result={result} />}
    </div>
  );
}
