import { useEffect, useState } from 'react';

/**
 * VariantGallery
 * --------------------------------------------------------------------
 * Renders a responsive CSS grid of generated ad variants. Each card
 * shows the headline, body, and CTA, plus a CTR badge. Data is sourced
 * from /api/custom-views/variants.
 */
export default function VariantGallery() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/custom-views/variants?count=9', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        if (!cancelled) {
          setData(j);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div style={loadingStyle} data-testid="vg-loading">
        Loading generated variants…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div style={errorStyle} data-testid="vg-error">
        Failed to load variants: {error || 'no data'}
      </div>
    );
  }

  const variants = data.variants || [];

  return (
    <div data-testid="variant-gallery">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, color: '#e2e8f0' }}>Variant Gallery</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
            {variants.length} AI-generated ad variants  ·  CTR badge per card
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {variants.map((v) => {
          const ctrColor =
            v.ctr >= 5 ? '#22c55e' : v.ctr >= 3 ? '#eab308' : '#ef4444';
          return (
            <div
              key={v.id}
              data-testid={`variant-card-${v.id}`}
              style={{
                position: 'relative',
                background: '#1e293b',
                borderRadius: 12,
                padding: 16,
                border: '1px solid #334155',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                color: '#e2e8f0',
                minHeight: 220,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: 1 }}>
                  {v.label}  ·  {v.platform}
                </span>
                <span
                  data-testid="ctr-badge"
                  style={{
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: `${ctrColor}22`,
                    color: ctrColor,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  CTR {v.ctr}%
                </span>
              </div>

              <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>{v.headline}</div>
              <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.4, flex: 1 }}>{v.body}</div>

              <button
                type="button"
                style={{
                  alignSelf: 'flex-start',
                  background: '#6366f1',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {v.cta}
              </button>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 10,
                  color: '#64748b',
                  borderTop: '1px solid #334155',
                  paddingTop: 8,
                }}
              >
                <span>{v.impressions.toLocaleString()} impr.</span>
                <span>{v.clicks.toLocaleString()} clicks</span>
                <span>{v.tone}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const loadingStyle = {
  padding: 24,
  textAlign: 'center',
  color: '#94a3b8',
  background: '#0f172a',
  borderRadius: 12,
};

const errorStyle = {
  padding: 24,
  textAlign: 'center',
  color: '#ef4444',
  background: 'rgba(239,68,68,0.08)',
  borderRadius: 12,
};
