import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiFileText, FiType, FiGitBranch, FiClipboard, FiUsers, FiMic, FiMousePointer,
  FiImage, FiShare2, FiMail, FiLayout, FiMap, FiSearch, FiDollarSign, FiTrendingUp,
  FiLogOut, FiAward, FiClock, FiBarChart2, FiGlobe, FiBriefcase, FiShield, FiStar,
  FiZap, FiActivity,
} from 'react-icons/fi';
import { featuresAPI, aiAPI } from '../services/api';

const FEATURES = [
  { key: 'ad_copies', title: 'Ad Copy Generator', description: 'Create compelling ad copy for any platform', icon: FiFileText, color: '#6366f1' },
  { key: 'headlines', title: 'Headline Generator', description: 'Craft attention-grabbing headlines', icon: FiType, color: '#8b5cf6' },
  { key: 'ab_tests', title: 'A/B Test Variations', description: 'Design effective split test experiments', icon: FiGitBranch, color: '#ec4899' },
  { key: 'creative_briefs', title: 'Creative Briefs', description: 'Generate comprehensive creative briefs', icon: FiClipboard, color: '#f43f5e' },
  { key: 'target_audiences', title: 'Target Audiences', description: 'Build detailed audience personas', icon: FiUsers, color: '#f97316' },
  { key: 'brand_voices', title: 'Brand Voice', description: 'Define and articulate brand voice guidelines', icon: FiMic, color: '#eab308' },
  { key: 'cta_texts', title: 'CTA Generator', description: 'Create high-converting calls-to-action', icon: FiMousePointer, color: '#22c55e' },
  { key: 'image_prompts', title: 'Image Prompts', description: 'Generate AI image prompts for ad visuals', icon: FiImage, color: '#14b8a6' },
  { key: 'social_media_ads', title: 'Social Media Ads', description: 'Platform-specific social ad content', icon: FiShare2, color: '#06b6d4' },
  { key: 'email_copies', title: 'Email Marketing', description: 'High-converting email campaigns', icon: FiMail, color: '#3b82f6' },
  { key: 'landing_page_copies', title: 'Landing Pages', description: 'Conversion-optimized page copy', icon: FiLayout, color: '#6366f1' },
  { key: 'campaign_strategies', title: 'Campaign Strategy', description: 'Comprehensive campaign planning', icon: FiMap, color: '#8b5cf6' },
  { key: 'competitor_analyses', title: 'Competitor Analysis', description: 'Evaluate competitor ad strategies', icon: FiSearch, color: '#ec4899' },
  { key: 'budget_optimizations', title: 'Budget Optimizer', description: 'Optimize ad spend for maximum ROI', icon: FiDollarSign, color: '#f97316' },
  { key: 'performance_predictions', title: 'Performance Predictor', description: 'Forecast campaign performance', icon: FiTrendingUp, color: '#22c55e' },
];

const ADVANCED_TOOLS = [
  { path: '/custom-views', title: 'Campaign Analytics', description: 'A/B test funnel & creative variant gallery', icon: FiBarChart2, color: '#ec4899' },
  { path: '/ab-tests', title: 'A/B Testing Framework', description: 'Generate variant pairs, track winners', icon: FiAward, color: '#ec4899' },
  { path: '/brand-voice-check', title: 'Brand Voice Checker', description: 'Score copy against brand guidelines', icon: FiMic, color: '#eab308' },
  { path: '/benchmark', title: 'Performance Benchmarking', description: 'Compare copy vs industry benchmarks', icon: FiBarChart2, color: '#06b6d4' },
  { path: '/translator', title: 'Multi-Language Translator', description: 'Adapt campaigns to 12+ languages', icon: FiGlobe, color: '#3b82f6' },
  { path: '/competitor-sentiment', title: 'Competitor Sentiment', description: 'Analyze positioning & differentiation', icon: FiSearch, color: '#ec4899' },
  { path: '/audience-sentiment', title: 'Audience Sentiment Predictor', description: 'Will this copy resonate with the target audience?', icon: FiUsers, color: '#8b5cf6' },
  { path: '/template-builder', title: 'Copy Template Builder', description: 'Parameterized templates with slots', icon: FiLayout, color: '#8b5cf6' },
  { path: '/visual-pairing', title: 'Visual + Copy Pairing', description: 'Matching ad copy + image prompts', icon: FiImage, color: '#14b8a6' },
  { path: '/copy-scorer', title: 'AI Copy Scorer', description: 'Score copy on clarity, emotion & CTA strength', icon: FiZap, color: '#f43f5e' },
  { path: '/campaigns', title: 'Campaign Workspace', description: 'Organize content by campaigns', icon: FiBriefcase, color: '#6366f1' },
  { path: '/brand-profiles', title: 'Brand Profiles', description: 'Save brand context for AI auto-injection', icon: FiShield, color: '#22c55e' },
  { path: '/history', title: 'Generation History', description: 'View, favorite and reuse past outputs', icon: FiClock, color: '#8b5cf6' },
  { path: '/usage', title: 'Usage & Analytics', description: 'Track tokens and generation stats', icon: FiActivity, color: '#06b6d4' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [stats, setStats] = useState({ total: 0, byFeature: {}, generated_today: 0, total_favorites: 0 });
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    featuresAPI.stats()
      .then(({ data }) => setStats({
        total: data.total || 0,
        byFeature: data.stats || {},
        generated_today: data.generated_today || 0,
        total_favorites: data.total_favorites || 0,
      }))
      .catch(() => {});

    aiAPI.usage()
      .then(({ data }) => setUsage(data))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="header-logo">AI</div>
          <div>
            <h1>Ad Copy & Creative Generator</h1>
            <p>AI-powered advertising content platform</p>
          </div>
        </div>
        <div className="header-right">
          <span className="user-email">{user.name || user.email}</span>
          <button className="btn btn-ghost" onClick={handleLogout}><FiLogOut /> Logout</button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>{stats.total}</h3>
            <p>Total Generations</p>
          </div>
          <div className="stat-card">
            <h3>{stats.generated_today}</h3>
            <p>Generated Today</p>
          </div>
          <div className="stat-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {stats.total_favorites}
              <FiStar size={16} style={{ color: '#eab308' }} />
            </h3>
            <p>Favorites</p>
          </div>
          <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/usage')}>
            <h3>{usage ? `${usage.usage_percent}%` : '—'}</h3>
            <p>Monthly Usage {usage?.alert && <span style={{ color: '#ef4444', fontSize: 11 }}>(limit near!)</span>}</p>
          </div>
        </div>

        {usage?.alert && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
            borderRadius: 8, padding: '12px 16px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <FiActivity color="#ef4444" />
            <span style={{ color: '#ef4444', fontSize: 14 }}>
              You have used {usage.usage_percent}% of your monthly token quota ({usage.tokens_used.toLocaleString()} / {usage.monthly_limit.toLocaleString()}).
              <button onClick={() => navigate('/usage')} style={{ marginLeft: 8, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>View details</button>
            </span>
          </div>
        )}

        <h2 className="section-title">Advanced AI Tools</h2>
        <div className="features-grid">
          {ADVANCED_TOOLS.map((t) => (
            <div key={t.path} className="feature-card" onClick={() => navigate(t.path)} style={{ '--accent': t.color }}>
              <div className="feature-icon" style={{ background: t.color }}>
                <t.icon size={24} color="#fff" />
              </div>
              <h3>{t.title}</h3>
              <p>{t.description}</p>
              <span className="feature-arrow">&rarr;</span>
            </div>
          ))}
        </div>

        <h2 className="section-title" style={{ marginTop: 32 }}>Generation Features</h2>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.key} className="feature-card" onClick={() => navigate(`/feature/${f.key}`)} style={{ '--accent': f.color }}>
              <div className="feature-icon" style={{ background: f.color }}>
                <f.icon size={24} color="#fff" />
              </div>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
              {stats.byFeature[f.key] > 0 && (
                <span style={{ position: 'absolute', top: 12, right: 12, background: f.color, color: '#fff', padding: '2px 8px', borderRadius: 999, fontSize: 11 }}>
                  {stats.byFeature[f.key]}
                </span>
              )}
              <span className="feature-arrow">&rarr;</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export { FEATURES };
