import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiZap, FiLoader, FiGlobe } from 'react-icons/fi';
import { aiAPI } from '../services/api';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';

const LANGUAGES = [
  'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Japanese',
  'Korean', 'Chinese (Simplified)', 'Arabic', 'Hindi', 'Russian', 'Dutch'
];

export default function TranslatorPage() {
  const navigate = useNavigate();
  const [copyText, setCopyText] = useState('');
  const [tone, setTone] = useState('');
  const [selected, setSelected] = useState(['Spanish', 'French', 'German']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const toggleLang = (lang) => {
    setSelected(s => s.includes(lang) ? s.filter(l => l !== lang) : [...s, lang]);
  };

  const run = async () => {
    if (!copyText.trim()) return toast.error('Paste source copy first');
    if (selected.length === 0) return toast.error('Pick at least one language');
    setLoading(true);
    setResult(null);
    try {
      const { data } = await aiAPI.translate(copyText, selected, tone);
      setResult(data.response);
      toast.success(`Translated to ${selected.length} language${selected.length > 1 ? 's' : ''}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Translation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}><FiArrowLeft /> Back</button>
        <div className="page-title">
          <div className="feature-icon-sm" style={{ background: '#3b82f6' }}><FiGlobe size={18} color="#fff" /></div>
          <h1>Multi-Language Campaign Translator</h1>
        </div>
      </header>

      <div className="form-group">
        <label>Source Copy (English)</label>
        <textarea value={copyText} onChange={e => setCopyText(e.target.value)} rows={6}
          placeholder="Paste the source ad copy in English..." />
      </div>
      <div className="form-group">
        <label>Brand Tone (optional)</label>
        <input type="text" value={tone} onChange={e => setTone(e.target.value)}
          placeholder="e.g. Playful & casual, Professional, Bold & confident" />
      </div>

      <div className="form-group">
        <label>Target Languages ({selected.length} selected)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {LANGUAGES.map(lang => (
            <button key={lang} type="button" onClick={() => toggleLang(lang)}
              className={`btn btn-sm ${selected.includes(lang) ? 'btn-primary' : 'btn-outline'}`}
              style={{ borderRadius: 999 }}>
              {lang}
            </button>
          ))}
        </div>
      </div>

      <button className="btn btn-primary" onClick={run} disabled={loading}>
        {loading ? <><FiLoader className="spin" /> Translating...</> : <><FiZap /> Translate Campaign</>}
      </button>

      {result && <div style={{ marginTop: 24 }}><AIOutput data={result} /></div>}
    </div>
  );
}
