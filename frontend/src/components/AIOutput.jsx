export default function AIOutput({ data }) {
  if (!data) return null;
  if (typeof data === 'string') {
    return <div className="ai-output-text">{data}</div>;
  }
  return <div className="ai-output">{renderValue(data, 0)}</div>;
}

function renderValue(value, depth) {
  if (value === null || value === undefined) return <span className="ai-null">-</span>;
  if (typeof value === 'boolean') return <span className={`ai-bool ${value ? 'true' : 'false'}`}>{value ? 'Yes' : 'No'}</span>;
  if (typeof value === 'number') return <span className="ai-number">{value.toLocaleString()}</span>;
  if (typeof value === 'string') {
    if (value.startsWith('#') && value.length <= 9 && /^#[0-9A-Fa-f]+$/.test(value)) {
      return <span className="ai-color"><span className="color-swatch" style={{ background: value }}></span>{value}</span>;
    }
    return <span className="ai-string">{value}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="ai-empty">None</span>;
    if (value.every(v => typeof v === 'string' || typeof v === 'number')) {
      return <div className="ai-tags">{value.map((v, i) => <span key={i} className="ai-tag">{v}</span>)}</div>;
    }
    if (value.every(v => typeof v === 'object' && v !== null && !Array.isArray(v))) {
      return (
        <div className="ai-array-cards">
          {value.map((item, i) => (
            <div key={i} className="ai-array-card">
              {Object.entries(item).map(([k, v]) => (
                <div key={k} className="ai-field">
                  <span className="ai-label">{formatLabel(k)}</span>
                  {renderValue(v, depth + 1)}
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }
    return <div className="ai-list">{value.map((v, i) => <div key={i} className="ai-list-item">{renderValue(v, depth + 1)}</div>)}</div>;
  }
  if (typeof value === 'object') {
    return (
      <div className={`ai-object ${depth > 0 ? 'nested' : ''}`}>
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className="ai-field">
            <span className="ai-label">{formatLabel(k)}</span>
            <div className="ai-value">{renderValue(v, depth + 1)}</div>
          </div>
        ))}
      </div>
    );
  }
  return <span>{String(value)}</span>;
}

function formatLabel(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
