import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiZap, FiLoader, FiSearch } from 'react-icons/fi';
import { aiAPI } from '../services/api';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';

export default function CompetitorSentimentPage() {
  const navigate = useNavigate();
  const [competitors, setCompetitors] = useState('');
  const [ourPosition, setOurPosition] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    if (!competitors.trim() || !ourPosition.trim()) return toast.error('Fill in both fields');
    setLoading(true);
    setResult(null);
    try {
      const { data } = await aiAPI.competitorSentiment(competitors, ourPosition);
      setResult(data.response);
      toast.success('Analysis complete');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}><FiArrowLeft /> Back</button>
        <div className="page-title">
          <div className="feature-icon-sm" style={{ background: '#ec4899' }}><FiSearch size={18} color="#fff" /></div>
          <h1>Competitor Sentiment Analysis</h1>
        </div>
      </header>

      <div className="form-group">
        <label>Competitors (names, URLs, or sample copy)</label>
        <textarea value={competitors} onChange={e => setCompetitors(e.target.value)} rows={6}
          placeholder="e.g. HubSpot - 'AI tools for marketers'; Salesforce - 'Customer 360'..." />
      </div>
      <div className="form-group">
        <label>Our Brand Position</label>
        <textarea value={ourPosition} onChange={e => setOurPosition(e.target.value)} rows={4}
          placeholder="What is your unique value prop and target customer?" />
      </div>

      <button className="btn btn-primary" onClick={run} disabled={loading}>
        {loading ? <><FiLoader className="spin" /> Analyzing...</> : <><FiZap /> Analyze Competitors</>}
      </button>

      {result && <div style={{ marginTop: 24 }}><AIOutput data={result} /></div>}
    </div>
  );
}
