import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiZap, FiLoader, FiMic, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import { aiAPI } from '../services/api';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';

export default function BrandVoiceCheckPage() {
  const navigate = useNavigate();
  const [copyText, setCopyText] = useState('');
  const [guidelines, setGuidelines] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleCheck = async () => {
    if (!copyText.trim() || !guidelines.trim()) {
      return toast.error('Both copy and brand guidelines are required');
    }
    setLoading(true);
    setResult(null);
    try {
      const { data } = await aiAPI.brandVoiceCheck(copyText, guidelines);
      setResult(data);
      toast.success('Brand voice check complete');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Check failed');
    } finally {
      setLoading(false);
    }
  };

  const score = result?.response?.score;

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}><FiArrowLeft /> Back</button>
        <div className="page-title">
          <div className="feature-icon-sm" style={{ background: '#eab308' }}><FiMic size={18} color="#fff" /></div>
          <h1>Brand Voice Consistency Checker</h1>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Brand Guidelines</label>
          <textarea
            value={guidelines}
            onChange={e => setGuidelines(e.target.value)}
            placeholder="Tone: friendly but authoritative. Vocabulary: avoid jargon. Always use 'we' instead of 'I'..."
            rows={10}
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border, #ddd)' }}
          />
        </div>
        <div>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Copy to Evaluate</label>
          <textarea
            value={copyText}
            onChange={e => setCopyText(e.target.value)}
            placeholder="Paste the ad copy you want scored..."
            rows={10}
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border, #ddd)' }}
          />
        </div>
      </div>

      <button className="btn btn-primary" onClick={handleCheck} disabled={loading}>
        {loading ? <><FiLoader className="spin" /> Analyzing...</> : <><FiZap /> Check Brand Voice</>}
      </button>

      {result && (
        <div style={{ marginTop: 24 }}>
          {typeof score === 'number' && (
            <div style={{
              padding: 24, borderRadius: 12, marginBottom: 16,
              background: score >= 80 ? 'rgba(34,197,94,0.1)' : score >= 60 ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)',
              border: `2px solid ${score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'}`,
            }}>
              <div style={{ fontSize: 14, color: 'var(--text-muted, #888)', marginBottom: 4 }}>Brand Voice Match Score</div>
              <div style={{ fontSize: 48, fontWeight: 700, color: score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444' }}>
                {score}/100
              </div>
              {score >= 80 && <div><FiCheckCircle /> Excellent brand voice match</div>}
              {score >= 60 && score < 80 && <div><FiAlertTriangle /> Acceptable, with room for improvement</div>}
              {score < 60 && <div><FiAlertTriangle /> Significant deviations from brand voice</div>}
            </div>
          )}
          <AIOutput data={result.response} />
        </div>
      )}
    </div>
  );
}
