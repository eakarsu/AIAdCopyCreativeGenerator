import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

/**
 * ABTestFunnel
 * --------------------------------------------------------------------
 * Renders a side-by-side bar chart comparing variant A vs variant B at
 * each funnel stage (impressions -> clicks -> conversions) plus the lift
 * percentage of B over A. Data is sourced from /api/custom-views/funnel.
 */
export default function ABTestFunnel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/custom-views/funnel', {
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
      <div style={loadingStyle} data-testid="abfunnel-loading">
        Loading A/B funnel analytics…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div style={errorStyle} data-testid="abfunnel-error">
        Failed to load funnel: {error || 'no data'}
      </div>
    );
  }

  const summary = data.summary || {};
  const stages = data.stages || [];

  return (
    <div data-testid="abtest-funnel" style={{ background: '#0f172a', borderRadius: 12, padding: 20, color: '#e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18 }}>A/B Test Funnel</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
            Variant A vs Variant B  ·  Impressions → Clicks → Conversions
          </p>
        </div>
        <div style={{
          padding: '6px 12px',
          borderRadius: 999,
          background: summary.winner === 'B' ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)',
          color: summary.winner === 'B' ? '#22c55e' : '#6366f1',
          fontSize: 13, fontWeight: 600,
        }}>
          Winner: Variant {summary.winner || '—'}
        </div>
      </div>

      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <BarChart data={stages} margin={{ top: 24, right: 24, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="stage" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0' }}
              cursor={{ fill: 'rgba(148,163,184,0.08)' }}
              formatter={(v, n) => [v.toLocaleString(), n]}
            />
            <Legend wrapperStyle={{ color: '#cbd5e1' }} />
            <Bar dataKey="A" name="Variant A" fill="#6366f1" radius={[6, 6, 0, 0]}>
              <LabelList dataKey="A" position="top" fill="#cbd5e1" fontSize={11} formatter={(v) => v.toLocaleString()} />
            </Bar>
            <Bar dataKey="B" name="Variant B" fill="#22c55e" radius={[6, 6, 0, 0]}>
              <LabelList dataKey="B" position="top" fill="#cbd5e1" fontSize={11} formatter={(v) => v.toLocaleString()} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 18 }}>
        {stages.map((s) => (
          <div key={s.stage} style={statBoxStyle}>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{s.stage} lift (B vs A)</div>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: s.lift_pct >= 0 ? '#22c55e' : '#ef4444',
            }}>
              {s.lift_pct >= 0 ? '+' : ''}{s.lift_pct}%
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              A: {s.A.toLocaleString()}  ·  B: {s.B.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 12 }}>
        <div style={statBoxStyle}>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>CTR lift</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            A {summary.ctr_a_pct}% → B {summary.ctr_b_pct}%
            <span style={{ marginLeft: 8, color: summary.ctr_lift_pct >= 0 ? '#22c55e' : '#ef4444' }}>
              ({summary.ctr_lift_pct >= 0 ? '+' : ''}{summary.ctr_lift_pct}%)
            </span>
          </div>
        </div>
        <div style={statBoxStyle}>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Conversion rate lift</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            A {summary.cvr_a_pct}% → B {summary.cvr_b_pct}%
            <span style={{ marginLeft: 8, color: summary.cvr_lift_pct >= 0 ? '#22c55e' : '#ef4444' }}>
              ({summary.cvr_lift_pct >= 0 ? '+' : ''}{summary.cvr_lift_pct}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const statBoxStyle = {
  background: '#1e293b',
  borderRadius: 8,
  padding: 12,
  border: '1px solid #334155',
};

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
