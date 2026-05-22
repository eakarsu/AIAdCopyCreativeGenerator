import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FeaturePage from './pages/FeaturePage';
import ABTestsPage from './pages/ABTestsPage';
import BrandVoiceCheckPage from './pages/BrandVoiceCheckPage';
import HistoryPage from './pages/HistoryPage';
import BenchmarkPage from './pages/BenchmarkPage';
import TranslatorPage from './pages/TranslatorPage';
import CompetitorSentimentPage from './pages/CompetitorSentimentPage';
import AudienceSentimentPage from './pages/AudienceSentimentPage';
import TemplateBuilderPage from './pages/TemplateBuilderPage';
import VisualPairingPage from './pages/VisualPairingPage';
import CampaignsPage from './pages/CampaignsPage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import BrandProfilesPage from './pages/BrandProfilesPage';
import CopyScorerPage from './pages/CopyScorerPage';
import UsagePage from './pages/UsagePage';
import SharePage from './pages/SharePage';
import PersonaGeneratorPage from './pages/PersonaGeneratorPage';
import IntegrationsPage from './pages/IntegrationsPage';
import CustomViewsPage from './pages/CustomViewsPage';
import AdComplianceMatrixPage from './pages/AdComplianceMatrixPage';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

        <Route path="/login" element={<Login />} />
        <Route path="/share/:token" element={<SharePage />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/feature/:featureKey" element={<PrivateRoute><FeaturePage /></PrivateRoute>} />
        <Route path="/ab-tests" element={<PrivateRoute><ABTestsPage /></PrivateRoute>} />
        <Route path="/brand-voice-check" element={<PrivateRoute><BrandVoiceCheckPage /></PrivateRoute>} />
        <Route path="/history" element={<PrivateRoute><HistoryPage /></PrivateRoute>} />
        <Route path="/benchmark" element={<PrivateRoute><BenchmarkPage /></PrivateRoute>} />
        <Route path="/translator" element={<PrivateRoute><TranslatorPage /></PrivateRoute>} />
        <Route path="/competitor-sentiment" element={<PrivateRoute><CompetitorSentimentPage /></PrivateRoute>} />
        <Route path="/audience-sentiment" element={<PrivateRoute><AudienceSentimentPage /></PrivateRoute>} />
        <Route path="/template-builder" element={<PrivateRoute><TemplateBuilderPage /></PrivateRoute>} />
        <Route path="/visual-pairing" element={<PrivateRoute><VisualPairingPage /></PrivateRoute>} />
        <Route path="/campaigns" element={<PrivateRoute><CampaignsPage /></PrivateRoute>} />
        <Route path="/campaigns/:id" element={<PrivateRoute><CampaignDetailPage /></PrivateRoute>} />
        <Route path="/brand-profiles" element={<PrivateRoute><BrandProfilesPage /></PrivateRoute>} />
        <Route path="/copy-scorer" element={<PrivateRoute><CopyScorerPage /></PrivateRoute>} />
        <Route path="/usage" element={<PrivateRoute><UsagePage /></PrivateRoute>} />
        <Route path="/persona-generator" element={<PrivateRoute><PersonaGeneratorPage /></PrivateRoute>} />
        <Route path="/integrations" element={<PrivateRoute><IntegrationsPage /></PrivateRoute>} />
        <Route path="/custom-views" element={<PrivateRoute><CustomViewsPage /></PrivateRoute>} />
        <Route path="/ad-compliance" element={<PrivateRoute><AdComplianceMatrixPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
