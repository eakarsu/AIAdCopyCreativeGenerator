import { useEffect, useState } from 'react';

/**
 * GoogleAdsExporter
 * --------------------------------------------------------------------
 * Lets the user pick a campaign and download a Google Ads bulk-upload
 * CSV from /api/custom-views/google-ads.csv?campaign_id=N.
 *
 * No modifications to existing components. Self-contained.
 */
export default function GoogleAdsExporter() {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('token') || '';
    fetch('/api/campaigns?limit=50', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        if (cancelled) return;
        const list = Array.isArray(j?.data) ? j.data : [];
        setCampaigns(list);
        if (list.length > 0) setSelectedId(String(list[0].id));
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleExport = async () => {
    setStatus(null);
    setExporting(true);
    try {
      const token = localStorage.getItem('token') || '';
      const qs = selectedId ? `?campaign_id=${encodeURIComponent(selectedId)}` : '';
      const res = await fetch(`/api/custom-views/google-ads.csv${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const camp = campaigns.find((c) => String(c.id) === String(selectedId));
      const safe = (camp?.name || `campaign_${selectedId || 'default'}`)
        .replace(/[^a-z0-9_-]+/gi, '_')
        .slice(0, 60);
      a.href = url;
      a.download = `google_ads_${safe}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus({ ok: true, msg: 'CSV downloaded successfully.' });
    } catch (e) {
      setStatus({ ok: false, msg: `Export failed: ${e.message || e}` });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div data-testid="google-ads-exporter" style={containerStyle}>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18, color: '#e2e8f0' }}>Google Ads CSV Export</h3>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
          Pick a campaign and download a bulk-upload ready CSV for Google Ads Editor.
        </p>
      </div>

      {loading ? (
        <div style={loadingStyle} data-testid="gae-loading">Loading campaigns…</div>
      ) : error ? (
        <div style={errorStyle} data-testid="gae-error">Failed to load campaigns: {error}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
            Campaign
            <select
              data-testid="gae-campaign-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              style={selectStyle}
            >
              {campaigns.length === 0 && (
                <option value="">(no campaigns — export will use default)</option>
              )}
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.status ? `· ${c.status}` : ''}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              data-testid="gae-export-btn"
              onClick={handleExport}
              disabled={exporting}
              style={{
                ...exportButtonStyle,
                opacity: exporting ? 0.6 : 1,
                cursor: exporting ? 'not-allowed' : 'pointer',
              }}
            >
              {exporting ? 'Exporting…' : 'Export to Google Ads'}
            </button>
            {status && (
              <span
                data-testid="gae-status"
                style={{
                  fontSize: 13,
                  color: status.ok ? '#22c55e' : '#ef4444',
                }}
              >
                {status.msg}
              </span>
            )}
          </div>

          <div style={hintStyle}>
            Columns: Campaign, Ad Group, Headline 1-3, Description 1-2, Final URL, Path 1, Path 2.
          </div>
        </div>
      )}
    </div>
  );
}

const containerStyle = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 12,
  padding: 20,
  color: '#e2e8f0',
};

const selectStyle = {
  display: 'block',
  marginTop: 6,
  width: '100%',
  maxWidth: 460,
  padding: '8px 10px',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 6,
  color: '#e2e8f0',
  fontSize: 14,
};

const exportButtonStyle = {
  background: '#22c55e',
  color: '#02140a',
  border: 'none',
  padding: '10px 18px',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
};

const loadingStyle = {
  padding: 16,
  textAlign: 'center',
  color: '#94a3b8',
  background: '#1e293b',
  borderRadius: 8,
};

const errorStyle = {
  padding: 16,
  textAlign: 'center',
  color: '#ef4444',
  background: 'rgba(239,68,68,0.08)',
  borderRadius: 8,
};

const hintStyle = {
  fontSize: 11,
  color: '#64748b',
  borderTop: '1px solid #1e293b',
  paddingTop: 10,
  marginTop: 4,
};
