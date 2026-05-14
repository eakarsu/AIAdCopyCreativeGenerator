import toast from 'react-hot-toast';

function copyToClipboard(text) {
  const str = typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text);
  navigator.clipboard.writeText(str).then(() => toast.success('Copied!'));
}

export default function AIOutput({ data }) {
  if (!data) return null;

  // If data is a string but looks like JSON, try to parse it
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return <div className="ai-output">{renderValue(parsed, 0)}</div>;
    } catch {
      return (
        <div className="ai-output-text">
          <button
            onClick={() => copyToClipboard(data)}
            style={{ float: 'right', fontSize: 11, padding: '2px 8px', marginLeft: 8, cursor: 'pointer', borderRadius: 4, border: '1px solid #ddd', background: '#fff' }}
          >Copy</button>
          {data}
        </div>
      );
    }
  }

  return <div className="ai-output">{renderValue(data, 0)}</div>;
}

const COPYABLE_FIELDS = new Set(['headline', 'body', 'cta', 'subject_line', 'ad_text', 'prompt', 'text', 'hero_headline', 'hero_subheadline', 'preview_text']);

function renderValue(value, depth) {
  if (value === null || value === undefined) return <span className="ai-null">—</span>;
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
            <div className="ai-value" style={{ position: 'relative' }}>
              {COPYABLE_FIELDS.has(k) && typeof v === 'string' && (
                <button
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(v); }}
                  style={{ position: 'absolute', top: 0, right: 0, fontSize: 10, padding: '1px 6px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ddd', background: '#fff', lineHeight: '18px' }}
                >Copy</button>
              )}
              {renderValue(v, depth + 1)}
            </div>
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
