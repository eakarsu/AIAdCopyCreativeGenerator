import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiBarChart2, FiLogOut } from 'react-icons/fi';
import ABTestFunnel from '../components/ABTestFunnel';
import VariantGallery from '../components/VariantGallery';
import GoogleAdsExporter from '../components/GoogleAdsExporter';
import BrandVoiceEditor from '../components/BrandVoiceEditor';

/**
 * CustomViewsPage
 * --------------------------------------------------------------------
 * Bespoke "Campaign Analytics" page combining:
 *   1. ABTestFunnel  — recharts side-by-side comparison of variant A vs B
 *   2. VariantGallery — CSS grid of generated ad variant cards
 */
export default function CustomViewsPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="dashboard" style={{ minHeight: '100vh', background: '#020617' }}>
      <header className="dashboard-header">
        <div className="header-left">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn btn-ghost"
            style={{ marginRight: 12 }}
            data-testid="back-to-dashboard"
          >
            <FiArrowLeft /> Back
          </button>
          <div className="header-logo" style={{ background: '#ec4899' }}>
            <FiBarChart2 size={18} color="#fff" />
          </div>
          <div>
            <h1>Campaign Analytics</h1>
            <p>A/B test funnel & creative variant gallery</p>
          </div>
        </div>
        <div className="header-right">
          <span className="user-email">{user.name || user.email}</span>
          <button className="btn btn-ghost" onClick={handleLogout}>
            <FiLogOut /> Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <section data-testid="section-funnel">
          <ABTestFunnel />
        </section>

        <section data-testid="section-gallery">
          <VariantGallery />
        </section>

        <section data-testid="section-google-ads-export">
          <GoogleAdsExporter />
        </section>

        <section data-testid="section-brand-voice">
          <BrandVoiceEditor />
        </section>
      </main>
    </div>
  );
}
