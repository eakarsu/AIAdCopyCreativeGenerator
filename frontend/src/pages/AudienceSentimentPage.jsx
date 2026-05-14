import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiZap, FiLoader, FiUsers, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import { aiAPI } from '../services/api';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';

/**
 * Page for the new POST /api/ai/audience-sentiment endpoint.
 * Predicts emotional resonance, persona reactions, objections, trust signals,
 * and conversion likelihood for a piece of ad copy + target audience + platform.
 */
export default function AudienceSentimentPage() {
  const navigate = useNavigate();
  const [copyText, setCopyText] = useState('');
  const [audience, setAudience] = useState('');
  const [platform, setPlatform] = useState('general');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    if (!copyText.trim()) {
      return toast.error('Copy text is required');
    }
    setLoading(true);
    setResult(null);
    try {
      const { data } = await aiAPI.audienceSentiment(copyText, audience, platform);
      setResult(data);
      toast.success('Audience sentiment analysis complete');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const ai = result?.response || result;
  const sentiment = ai?.overall_sentiment;
  const engagement = ai?.predicted_engagement_score;
  const conversion = ai?.predicted_conversion_likelihood;

  const sentimentColor = (s) => {
    if (!s) return '#888';
    if (s.includes('Very Positive')) return '#16a34a';
    if (s.includes('Positive')) return '#22c55e';
    if (s.includes('Neutral')) return '#eab308';
    if (s.includes('Very Negative')) return '#b91c1c';
    if (s.includes('Negative')) return '#ef4444';
    return '#888';
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}><FiArrowLeft /> Back</button>
        <div className="page-title">
          <div className="feature-icon-sm" style={{ background: '#8b5cf6' }}><FiUsers size={18} color="#fff" /></div>
          <h1>Audience Sentiment Predictor</h1>
        </div>
      </header>

      <p style={{ color: 'var(--text-muted, #888)', marginBottom: 16 }}>
        Predict how a target audience will emotionally respond to your ad copy: resonance, objections,
        trust signals, conversion likelihood — before you spend a dollar.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Ad Copy *</label>
          <textarea
            value={copyText}
            onChange={e => setCopyText(e.target.value)}
            placeholder="Paste the ad copy you want to test..."
            rows={10}
            maxLength={5000}
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border, #ddd)' }}
          />
        </div>
        <div>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Target Audience</label>
          <textarea
            value={audience}
            onChange={e => setAudience(e.target.value)}
            placeholder="e.g., 28-45 year-old urban professionals, mid-career, sustainability-minded, $80-120K HHI..."
            rows={6}
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border, #ddd)' }}
          />
          <label style={{ fontWeight: 600, display: 'block', margin: '12px 0 8px' }}>Platform</label>
          <select
            value={platform}
            onChange={e => setPlatform(e.target.value)}
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border, #ddd)' }}
          >
            <option value="general">General</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="google">Google</option>
            <option value="linkedin">LinkedIn</option>
            <option value="tiktok">TikTok</option>
            <option value="x">X / Twitter</option>
          </select>
        </div>
      </div>

      <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading}>
        {loading ? <><FiLoader className="spin" /> Analyzing...</> : <><FiZap /> Predict Sentiment</>}
      </button>

      {ai && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            {sentiment && (
              <div style={{ padding: 16, borderRadius: 12, border: `2px solid ${sentimentColor(sentiment)}`, background: `${sentimentColor(sentiment)}15` }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted, #888)' }}>Overall Sentiment</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: sentimentColor(sentiment) }}>{sentiment}</div>
              </div>
            )}
            {typeof engagement === 'number' && (
              <div style={{ padding: 16, borderRadius: 12, border: '2px solid #3b82f6', background: 'rgba(59,130,246,0.1)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted, #888)' }}>Predicted Engagement</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{engagement}</div>
              </div>
            )}
            {typeof conversion === 'number' && (
              <div style={{ padding: 16, borderRadius: 12, border: '2px solid #f97316', background: 'rgba(249,115,22,0.1)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted, #888)' }}>Conversion Likelihood</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#f97316' }}>{conversion}</div>
              </div>
            )}
          </div>
          {sentiment && (sentiment.includes('Positive') ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#22c55e' }}>
              <FiCheckCircle /> Likely to resonate with this audience
            </div>
          ) : sentiment.includes('Negative') ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#ef4444' }}>
              <FiAlertTriangle /> Audience may push back — review objections below
            </div>
          ) : null)}
          <AIOutput data={ai} />
        </div>
      )}
    </div>
  );
}
