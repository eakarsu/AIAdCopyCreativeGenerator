import React, { useState } from 'react';
import api from '../services/api';

export default function AdComplianceMatrixPage() {
  const [copy, setCopy] = useState('Lose 20 pounds fast with guaranteed results. Limited time only!');
  const [result, setResult] = useState(null);
  const run = async () => setResult((await api.post('/ad-compliance/check', { platform: 'meta', copy })).data);
  return (
    <div className="page">
      <h1>Ad Compliance Matrix</h1>
      <p>Check paid-social copy for platform policy risk before upload.</p>
      <textarea className="input" rows={8} value={copy} onChange={(event) => setCopy(event.target.value)} />
      <button className="btn btn-primary" onClick={run}>Check Compliance</button>
      {result && <div className="card"><h2>{result.status} · {result.score}</h2><p>{result.rewriteHint}</p>{result.findings.map((finding) => <p key={finding.id}>{finding.id}: {finding.severity}</p>)}</div>}
    </div>
  );
}
