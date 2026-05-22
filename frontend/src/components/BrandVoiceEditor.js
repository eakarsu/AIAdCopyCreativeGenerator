import { useEffect, useState } from 'react';

/**
 * BrandVoiceEditor
 * --------------------------------------------------------------------
 * CRUD form for brand voice profiles. Calls
 *   GET  /api/custom-views/brand-voice
 *   POST /api/custom-views/brand-voice
 *   PUT  /api/custom-views/brand-voice?id=N
 *
 * No modifications to existing components. Self-contained.
 */
const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'witty', label: 'Witty' },
  { value: 'luxury', label: 'Luxury' },
];

const READING_LEVELS = ['elementary', 'middle', 'general', 'college', 'expert'];

const EMPTY = {
  id: null,
  brand_name: '',
  tone: 'professional',
  reading_level: 'general',
  avoid_words: '',
  must_include_phrases: '',
  sample_voice_paragraph: '',
};

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
  };
}

export default function BrandVoiceEditor() {
  const [profiles, setProfiles] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  const loadProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/custom-views/brand-voice', { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setProfiles(Array.isArray(j?.profiles) ? j.profiles : []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEdit = (profile) => {
    setForm({
      id: profile.id,
      brand_name: profile.brand_name || '',
      tone: TONES.find((t) => t.value === profile.tone)?.value || 'professional',
      reading_level: profile.reading_level || 'general',
      avoid_words: profile.avoid_words || '',
      must_include_phrases: profile.must_include_phrases || '',
      sample_voice_paragraph: profile.sample_voice_paragraph || '',
    });
    setStatus(null);
  };

  const handleNew = () => {
    setForm(EMPTY);
    setStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    if (!form.brand_name.trim()) {
      setStatus({ ok: false, msg: 'Brand name is required.' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        brand_name: form.brand_name.trim(),
        tone: form.tone,
        reading_level: form.reading_level,
        avoid_words: form.avoid_words,
        must_include_phrases: form.must_include_phrases,
        sample_voice_paragraph: form.sample_voice_paragraph,
      };
      const isUpdate = Boolean(form.id);
      const url = isUpdate
        ? `/api/custom-views/brand-voice?id=${encodeURIComponent(form.id)}`
        : '/api/custom-views/brand-voice';
      const method = isUpdate ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      const j = await res.json();
      setStatus({ ok: true, msg: isUpdate ? 'Profile updated.' : 'Profile created.' });
      if (j?.profile) {
        setForm({
          id: j.profile.id,
          brand_name: j.profile.brand_name || '',
          tone: j.profile.tone || 'professional',
          reading_level: j.profile.reading_level || 'general',
          avoid_words: j.profile.avoid_words || '',
          must_include_phrases: j.profile.must_include_phrases || '',
          sample_voice_paragraph: j.profile.sample_voice_paragraph || '',
        });
      }
      await loadProfiles();
    } catch (e2) {
      setStatus({ ok: false, msg: `Save failed: ${e2.message || e2}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="brand-voice-editor" style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, color: '#e2e8f0' }}>Brand Voice Profile</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
            Define tone, reading level, avoid words and must-include phrases for your brand.
          </p>
        </div>
        <button type="button" onClick={handleNew} style={ghostButtonStyle} data-testid="bve-new-btn">
          + New Profile
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) 2fr', gap: 18 }}>
        <aside style={listStyle} data-testid="bve-profile-list">
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
            Saved Profiles ({profiles.length})
          </div>
          {loading && <div style={{ fontSize: 12, color: '#94a3b8' }}>Loading…</div>}
          {error && <div style={{ fontSize: 12, color: '#ef4444' }}>{error}</div>}
          {!loading && profiles.length === 0 && (
            <div style={{ fontSize: 12, color: '#64748b' }}>No profiles yet. Create one on the right.</div>
          )}
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleEdit(p)}
              data-testid={`bve-profile-${p.id}`}
              style={{
                ...profileItemStyle,
                background: form.id === p.id ? '#1e293b' : 'transparent',
                borderColor: form.id === p.id ? '#6366f1' : '#1e293b',
              }}
            >
              <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 13 }}>{p.brand_name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                {p.tone} · {p.reading_level}
              </div>
            </button>
          ))}
        </aside>

        <form onSubmit={handleSubmit} style={formStyle} data-testid="bve-form">
          <Field label="Brand Name *">
            <input
              type="text"
              value={form.brand_name}
              onChange={(e) => updateField('brand_name', e.target.value)}
              placeholder="Acme Corp"
              data-testid="bve-brand-name"
              style={inputStyle}
              maxLength={255}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Tone">
              <select
                value={form.tone}
                onChange={(e) => updateField('tone', e.target.value)}
                data-testid="bve-tone"
                style={inputStyle}
              >
                {TONES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Reading Level">
              <select
                value={form.reading_level}
                onChange={(e) => updateField('reading_level', e.target.value)}
                data-testid="bve-reading-level"
                style={inputStyle}
              >
                {READING_LEVELS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Avoid Words (comma-separated)">
            <input
              type="text"
              value={form.avoid_words}
              onChange={(e) => updateField('avoid_words', e.target.value)}
              placeholder="cheap, basic, ordinary"
              data-testid="bve-avoid-words"
              style={inputStyle}
            />
          </Field>

          <Field label="Must-Include Phrases (comma-separated)">
            <input
              type="text"
              value={form.must_include_phrases}
              onChange={(e) => updateField('must_include_phrases', e.target.value)}
              placeholder="award-winning, premium-grade"
              data-testid="bve-must-include"
              style={inputStyle}
            />
          </Field>

          <Field label="Sample Voice Paragraph">
            <textarea
              value={form.sample_voice_paragraph}
              onChange={(e) => updateField('sample_voice_paragraph', e.target.value)}
              placeholder="Paste 2-3 sentences in your brand's voice…"
              data-testid="bve-sample-voice"
              style={{ ...inputStyle, minHeight: 110, resize: 'vertical', fontFamily: 'inherit' }}
              maxLength={4000}
            />
          </Field>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              type="submit"
              disabled={saving}
              data-testid="bve-save-btn"
              style={{
                ...saveButtonStyle,
                opacity: saving ? 0.6 : 1,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : form.id ? 'Update Profile' : 'Create Profile'}
            </button>
            {form.id && (
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Editing profile #{form.id}</span>
            )}
            {status && (
              <span
                data-testid="bve-status"
                style={{ fontSize: 13, color: status.ok ? '#22c55e' : '#ef4444' }}
              >
                {status.msg}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 0 }}>
      <span style={{ display: 'block', marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

const containerStyle = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 12,
  padding: 20,
  color: '#e2e8f0',
};

const listStyle = {
  background: '#020617',
  border: '1px solid #1e293b',
  borderRadius: 10,
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  maxHeight: 480,
  overflowY: 'auto',
};

const profileItemStyle = {
  textAlign: 'left',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #1e293b',
  background: 'transparent',
  cursor: 'pointer',
  width: '100%',
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 6,
  color: '#e2e8f0',
  fontSize: 13,
  boxSizing: 'border-box',
};

const saveButtonStyle = {
  background: '#6366f1',
  color: '#fff',
  border: 'none',
  padding: '10px 18px',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 700,
};

const ghostButtonStyle = {
  background: 'transparent',
  color: '#94a3b8',
  border: '1px solid #334155',
  padding: '6px 12px',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};
