import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, name) => api.post('/auth/register', { email, password, name }),
  me: () => api.get('/auth/me'),
  updateProfile: (name) => api.patch('/auth/profile', { name }),
};

export const featuresAPI = {
  // Generated content history (all stored in generated_content table)
  history: (params = {}) => api.get('/features', { params }),
  historyItem: (id) => api.get(`/features/${id}`),
  deleteHistory: (id) => api.delete(`/features/${id}`),
  toggleFavorite: (id) => api.patch(`/features/${id}/favorite`),
  stats: () => api.get('/features/stats'),
};

export const aiAPI = {
  generate: (feature, prompt, context, campaign_id) =>
    api.post('/ai/generate', { feature, prompt, context, campaign_id }),
  brandVoiceCheck: (copy_text, brand_guidelines) =>
    api.post('/ai/brand-voice-check', { copy_text, brand_guidelines }),
  audienceSentiment: (copy_text, audience_description, platform) =>
    api.post('/ai/audience-sentiment', { copy_text, audience_description, platform }),
  scoreCopy: (copy_text, generated_content_id) =>
    api.post('/ai/score-copy', { copy_text, generated_content_id }),
  complianceCheck: (copy_text, platform) =>
    api.post('/ai/compliance-check', { copy_text, platform }),
  createShare: (generated_content_id, ttl_hours = 24) =>
    api.post('/ai/share', { generated_content_id, ttl_hours }),
  usage: () => api.get('/ai/usage'),

  // Client-side AI helpers wrapping /ai/generate with structured prompts
  benchmark: (industry, copy_text, metric_focus) =>
    api.post('/ai/generate', {
      feature: 'performance_predictions',
      prompt: `Industry: ${industry}\nMetric focus: ${metric_focus || 'CTR & conversion rate'}\n\nCopy to benchmark:\n${copy_text}\n\nCompare this copy against industry benchmarks for ${industry}. Return JSON: {industry_avg_ctr:"string", industry_avg_conversion:"string", your_estimated_ctr:"string", your_estimated_conversion:"string", percentile_rank:"string", what_top_performers_do_differently:["string"], improvement_suggestions:["string"]}.`,
    }),
  translate: (copy_text, target_languages, brand_tone) =>
    api.post('/ai/generate', {
      feature: 'ad_copies',
      prompt: `Source copy:\n${copy_text}\n\nTarget languages: ${target_languages.join(', ')}\nBrand tone: ${brand_tone || 'maintain original'}\n\nTranslate the ad copy to each target language while preserving brand voice and adapting cultural references. Return JSON: {translations: [{language:"string", region:"string", headline:"string", body:"string", cta:"string", cultural_notes:"string"}]}.`,
    }),
  competitorSentiment: (competitors, our_position) =>
    api.post('/ai/generate', {
      feature: 'competitor_analyses',
      prompt: `Competitors: ${competitors}\nOur position: ${our_position}\n\nAnalyze competitor ad sentiment and positioning. Return JSON: {competitors:[{name:"string", sentiment:"string", positioning_angle:"string", weaknesses:["string"]}], differentiation_angles:["string"], recommended_messaging:["string"], threat_level:"low|medium|high"}.`,
    }),
  templateExpand: (template, slot_values) =>
    api.post('/ai/generate', {
      feature: 'ad_copies',
      prompt: `Template: ${template}\nSlot values: ${JSON.stringify(slot_values)}\n\nExpand the template by filling slots with the provided values, then generate 5 variations of each. Return JSON: {variants:[{headline:"string", body:"string", cta:"string", slot_values_used:{}, character_counts:{headline:0,body:0,cta:0}}]}.`,
    }),
  visualPairing: (brief, ad_format) =>
    api.post('/ai/generate', {
      feature: 'image_prompts',
      prompt: `Art direction brief: ${brief}\nAd format: ${ad_format}\n\nGenerate matching ad copy AND a detailed image prompt for designers. Return JSON: {copy:{headline:"string", body:"string", cta:"string", tone:"string"}, image:{detailed_prompt:"string", negative_prompt:"string", style:"string", composition:"string", color_palette:["string"], mood:"string", aspect_ratio:"string", lighting:"string"}}.`,
    }),
  generatePersona: (product_or_offer, market, n = 3) =>
    api.post('/ai/generate', {
      feature: 'target_audiences',
      prompt: `Product / offer:\n${product_or_offer}\n\nTarget market context:\n${market || 'general consumer'}\n\nGenerate ${n} distinct customer personas the brand should target. Each persona MUST follow the JSON schema in the system prompt (persona_name, age_range, demographics, psychographics, behaviors, pain_points, media_channels, buying_triggers, segment_size_estimate). Return JSON: {personas: [<schema>, ...]}.`,
    }),

  // Apply pass 5 wrappers
  competitorAdLibrary: (search_terms, country, ad_active_status) =>
    api.post('/ai/competitor-ad-library', { search_terms, country, ad_active_status }),
  competitorMonitor: (brand_name, frequency_hours = 24) =>
    api.post('/ai/competitor-monitor', { brand_name, frequency_hours }),
  industryBenchmark: (industry, copy_text, metric_focus) =>
    api.post('/ai/industry-benchmark', { industry, copy_text, metric_focus }),
  adPlatformUpload: (platform, campaign) =>
    api.post('/ai/ad-platform-upload', { platform, campaign }),
};

export const abTestAPI = {
  list: (params = {}) => api.get('/ab-tests', { params }),
  get: (id) => api.get(`/ab-tests/${id}`),
  create: (data) => api.post('/ab-tests', data),
  setWinner: (id, winner) => api.patch(`/ab-tests/${id}/winner`, { winner }),
  delete: (id) => api.delete(`/ab-tests/${id}`),
};

export const campaignAPI = {
  list: (params = {}) => api.get('/campaigns', { params }),
  get: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  delete: (id) => api.delete(`/campaigns/${id}`),
};

export const brandProfileAPI = {
  list: () => api.get('/brand-profiles'),
  create: (data) => api.post('/brand-profiles', data),
  update: (id, data) => api.put(`/brand-profiles/${id}`, data),
  activate: (id) => api.patch(`/brand-profiles/${id}/activate`),
  delete: (id) => api.delete(`/brand-profiles/${id}`),
};

export const shareAPI = {
  view: (token) => api.get(`/share/${token}`),
};

export default api;
