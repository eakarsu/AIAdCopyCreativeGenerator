import { useNavigate } from 'react-router-dom';
import { FiFileText, FiType, FiGitBranch, FiClipboard, FiUsers, FiMic, FiMousePointer, FiImage, FiShare2, FiMail, FiLayout, FiMap, FiSearch, FiDollarSign, FiTrendingUp, FiLogOut } from 'react-icons/fi';

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

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

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
          <span className="user-email">{user.email}</span>
          <button className="btn btn-ghost" onClick={handleLogout}><FiLogOut /> Logout</button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>15</h3>
            <p>AI Features</p>
          </div>
          <div className="stat-card">
            <h3>$600B+</h3>
            <p>Digital Ad Market</p>
          </div>
          <div className="stat-card">
            <h3>AI</h3>
            <p>Powered by Claude</p>
          </div>
          <div className="stat-card">
            <h3>24/7</h3>
            <p>Available</p>
          </div>
        </div>

        <h2 className="section-title">Features</h2>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.key} className="feature-card" onClick={() => navigate(`/feature/${f.key}`)} style={{ '--accent': f.color }}>
              <div className="feature-icon" style={{ background: f.color }}>
                <f.icon size={24} color="#fff" />
              </div>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
              <span className="feature-arrow">&rarr;</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export { FEATURES };
