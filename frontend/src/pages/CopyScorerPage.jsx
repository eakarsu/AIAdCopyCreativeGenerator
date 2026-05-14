import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiZap, FiLoader } from 'react-icons/fi';
import { aiAPI } from '../services/api';
import toast from 'react-hot-toast';

function ScoreBar({ label, score, color }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
        <span style={{ fontWeight: 700, fontSize: 16, color }}>{score}/100</span>
      </div>
      <div style={{ background: '#e5e7eb', borderRadius: 999, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, background: color, height: '100%', borderRadius: 999, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

function getColor(score) {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  return '#ef4444';
}

const PLATFORMS = ['general', 'Google Ads', 'Facebook/Meta', 'LinkedIn', 'Instagram', 'Twitter/X', 'TikTok', 'Email'];

export default function CopyScorerPage() {
  const navigate = useNavigate();
  const [copyText, setCopyText] = useState('');
  const [platform, setPlatform] = useState('general');
  const [loading, setLoading] = useState(false);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [score, setScore] = useState(null);
  const [compliance, setCompliance] = useState(null);

  const handleScore = async () => {
    if (!copyText.trim()) return toast.error('Paste copy to score');
    setLoading(true);
    setScore(null);
    try {
      const { data } = await aiAPI.scoreCopy(copyText);
      setScore(data.score);
      toast.success('Copy scored!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Scoring failed');
    } finally { setLoading(false); }
  };

  const handleCompliance = async () => {
    if (!copyText.trim()) return toast.error('Paste copy to check');
    setComplianceLoading(true);
    setCompliance(null);
    try {
      const { data } = await aiAPI.complianceCheck(copyText, platform);
      setCompliance(data.compliance);
      toast.success('Compliance check complete');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Compliance check failed');
    } finally { setComplianceLoading(false); }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}><FiArrowLeft /> Back</button>
        <div className="page-title">
          <div className="feature-icon-sm" style={{ background: '#f43f5e' }}><FiZap size={18} color="#fff" /></div>
          <h1>AI Copy Scorer & Compliance Checker</h1>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <div className="form-group">
            <label>Copy to Analyze</label>
            <textarea value={copyText} onChange={e => setCopyText(e.target.value)} rows={10}
              placeholder="Paste your ad copy, headline, email subject, or any marketing text here..." />
            <div style={{ fontSize: 12, color: 'var(--text-muted, #888)', marginTop: 4 }}>
              {copyText.length} characters · {copyText.trim().split(/\s+/).filter(Boolean).length} words
            </div>
          </div>
          <div className="form-group">
            <label>Platform (for compliance check)</label>
            <select value={platform} onChange={e => setPlatform(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border, #ddd)' }}>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" onClick={handleScore} disabled={loading} style={{ flex: 1 }}>
              {loading ? <><FiLoader className="spin" /> Scoring...</> : <><FiZap /> Score Copy</>}
            </button>
            <button className="btn btn-secondary" onClick={handleCompliance} disabled={complianceLoading} style={{ flex: 1 }}>
              {complianceLoading ? <><FiLoader className="spin" /> Checking...</> : 'Check Compliance'}
            </button>
          </div>
        </div>

        <div>
          {score && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16 }}>Copy Scores</h3>
              <div style={{ padding: 20, borderRadius: 12, background: 'var(--card-bg, #f9fafb)', border: '1px solid var(--border, #e5e7eb)' }}>
                {score.overall_score !== undefined && (
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted, #888)' }}>Overall Score</div>
                    <div style={{ fontSize: 56, fontWeight: 700, color: getColor(score.overall_score) }}>{score.overall_score}</div>
                  </div>
                )}
                {score.clarity_score !== undefined && <ScoreBar label="Clarity" score={score.clarity_score} color={getColor(score.clarity_score)} />}
                {score.emotional_appeal_score !== undefined && <ScoreBar label="Emotional Appeal" score={score.emotional_appeal_score} color={getColor(score.emotional_appeal_score)} />}
                {score.cta_strength_score !== undefined && <ScoreBar label="CTA Strength" score={score.cta_strength_score} color={getColor(score.cta_strength_score)} />}
                {score.reading_level && <p style={{ fontSize: 13, marginBottom: 8 }}><b>Reading Level:</b> {score.reading_level}</p>}
                {score.feedback?.overall && <p style={{ fontSize: 13 }}>{score.feedback.overall}</p>}
                {score.improvement_suggestions?.length > 0 && (
                  <div>
                    <b style={{ fontSize: 13 }}>Improvements:</b>
                    <ul style={{ fontSize: 13, paddingLeft: 20, marginTop: 4 }}>
                      {score.improvement_suggestions.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {score.power_words_found?.length > 0 && (
                  <p style={{ fontSize: 13 }}><b>Power words:</b> {score.power_words_found.join(', ')}</p>
                )}
              </div>
            </div>
          )}

          {compliance && (
            <div>
              <h3 style={{ marginBottom: 16 }}>Compliance Check — {platform}</h3>
              <div style={{
                padding: 20, borderRadius: 12, border: `2px solid ${compliance.overall_compliant ? '#22c55e' : '#ef4444'}`,
                background: compliance.overall_compliant ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: compliance.overall_compliant ? '#22c55e' : '#ef4444' }}>
                    {compliance.overall_compliant ? 'Compliant' : 'Issues Found'}
                  </span>
                  <span style={{ fontSize: 24, fontWeight: 700, color: getColor(compliance.compliance_score || 0) }}>
                    {compliance.compliance_score}/100
                  </span>
                </div>
                {compliance.violations?.map((v, i) => (
                  <div key={i} style={{ marginBottom: 8, padding: 10, borderRadius: 6, background: v.severity === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)', fontSize: 13 }}>
                    <b>{v.rule}:</b> {v.excerpt} <br />
                    <span style={{ color: '#22c55e' }}>Fix: {v.fix}</span>
                  </div>
                ))}
                {compliance.recommendations?.map((r, i) => (
                  <p key={i} style={{ fontSize: 13, color: 'var(--text-muted, #888)' }}>{r}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
