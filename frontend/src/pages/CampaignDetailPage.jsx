import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiBriefcase, FiX } from 'react-icons/fi';
import { campaignAPI } from '../services/api';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';

export default function CampaignDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState(null);

  useEffect(() => {
    campaignAPI.get(id)
      .then(({ data }) => setCampaign(data.data))
      .catch(() => { toast.error('Failed to load campaign'); navigate('/campaigns'); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-container"><p>Loading...</p></div>;
  if (!campaign) return null;

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/campaigns')}><FiArrowLeft /> Campaigns</button>
        <div className="page-title">
          <div className="feature-icon-sm" style={{ background: '#6366f1' }}><FiBriefcase size={18} color="#fff" /></div>
          <div>
            <h1>{campaign.name}</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted, #888)', margin: 0 }}>
              {campaign.status} {campaign.budget ? `· ${campaign.budget}` : ''} {campaign.objective ? `· ${campaign.objective}` : ''}
            </p>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        <div>
          <h2 style={{ marginBottom: 12 }}>Generated Content ({campaign.content?.length || 0} items)</h2>
          {(!campaign.content || campaign.content.length === 0) ? (
            <p style={{ color: 'var(--text-muted, #888)' }}>No content yet. Generate content and link it to this campaign.</p>
          ) : (
            <div className="items-table">
              <table>
                <thead><tr><th>Feature</th><th>Prompt</th><th>Date</th></tr></thead>
                <tbody>
                  {campaign.content.map(item => (
                    <tr key={item.id} onClick={() => setSelectedContent(item)} className="clickable-row">
                      <td><span className="badge">{item.feature_type}</span></td>
                      <td style={{ maxWidth: 300, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.prompt}</td>
                      <td className="td-date">{new Date(item.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {campaign.ab_tests && campaign.ab_tests.length > 0 && (
            <>
              <h2 style={{ marginTop: 24, marginBottom: 12 }}>A/B Tests ({campaign.ab_tests.length})</h2>
              <div className="items-table">
                <table>
                  <thead><tr><th>Test ID</th><th>Hypothesis</th><th>Winner</th><th>Date</th></tr></thead>
                  <tbody>
                    {campaign.ab_tests.map(test => (
                      <tr key={test.id} className="clickable-row" onClick={() => navigate('/ab-tests')}>
                        <td>#{test.id}</td>
                        <td style={{ maxWidth: 300, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{test.hypothesis || '—'}</td>
                        <td>{test.winner ? <span className="badge" style={{ background: '#22c55e', color: '#fff' }}>Variant {test.winner.toUpperCase()}</span> : '—'}</td>
                        <td className="td-date">{new Date(test.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div>
          <div style={{ background: 'var(--card-bg, #f9fafb)', borderRadius: 12, padding: 20, border: '1px solid var(--border, #e5e7eb)' }}>
            <h3>Campaign Info</h3>
            <dl style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              {[
                ['Status', campaign.status],
                ['Objective', campaign.objective || '—'],
                ['Budget', campaign.budget || '—'],
                ['Start', campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : '—'],
                ['End', campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : '—'],
                ['Created', new Date(campaign.created_at).toLocaleDateString()],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt style={{ color: 'var(--text-muted, #888)', fontSize: 13 }}>{k}</dt>
                  <dd style={{ fontWeight: 500, fontSize: 13 }}>{v}</dd>
                </div>
              ))}
            </dl>
            {campaign.description && (
              <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-muted, #888)' }}>{campaign.description}</div>
            )}
          </div>
        </div>
      </div>

      {selectedContent && (
        <div className="modal-overlay" onClick={() => setSelectedContent(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h2>{selectedContent.feature_type} — #{selectedContent.id}</h2>
              <button className="btn-icon" onClick={() => setSelectedContent(null)}><FiX /></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 12, color: 'var(--text-muted, #888)', fontSize: 13 }}>{selectedContent.prompt}</p>
              <AIOutput data={selectedContent.result} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
