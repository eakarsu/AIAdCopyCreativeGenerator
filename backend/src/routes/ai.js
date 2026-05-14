const express = require('express');
const Joi = require('joi');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { generateWithAI, SYSTEM_PROMPTS, parseAIJson } = require('../services/openrouter');

const router = express.Router();

// All routes already have auth applied in server.js, but declare it here too for safety
router.use(authMiddleware);

const ALLOWED_FEATURES = [
  'ad_copies', 'headlines', 'ab_tests', 'creative_briefs', 'target_audiences',
  'brand_voices', 'cta_texts', 'image_prompts', 'social_media_ads', 'email_copies',
  'landing_page_copies', 'campaign_strategies', 'competitor_analyses',
  'budget_optimizations', 'performance_predictions',
];

// Joi validation schemas
const generateSchema = Joi.object({
  feature: Joi.string().valid(...ALLOWED_FEATURES).required(),
  prompt: Joi.string().min(1).max(2000).required(),
  context: Joi.alternatives().try(Joi.string().max(1000), Joi.object()).optional(),
  campaign_id: Joi.number().integer().positive().optional(),
});

const brandVoiceSchema = Joi.object({
  copy_text: Joi.string().min(1).max(5000).required(),
  brand_guidelines: Joi.alternatives().try(Joi.string().min(1).max(3000), Joi.object()).required(),
});

const scoreSchema = Joi.object({
  copy_text: Joi.string().min(1).max(5000).required(),
  generated_content_id: Joi.number().integer().positive().optional(),
});

const shareSchema = Joi.object({
  generated_content_id: Joi.number().integer().positive().required(),
  ttl_hours: Joi.number().integer().min(1).max(168).default(24),
});

// Helper to update user monthly token usage
async function trackTokenUsage(userId, tokensUsed) {
  if (!tokensUsed) return;
  try {
    await pool.query(`
      INSERT INTO user_settings (user_id, tokens_used_this_month)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE
      SET tokens_used_this_month = user_settings.tokens_used_this_month + $2,
          updated_at = NOW()
    `, [userId, tokensUsed]);
  } catch (e) {
    console.error('Token tracking error:', e.message);
  }
}

// POST /api/ai/brand-voice-check - Score copy against brand guidelines
router.post('/brand-voice-check', async (req, res) => {
  try {
    const { error, value } = brandVoiceSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { copy_text, brand_guidelines } = value;
    const userId = req.user.id;

    const prompt = `Brand Guidelines:
${typeof brand_guidelines === 'string' ? brand_guidelines : JSON.stringify(brand_guidelines)}

Copy to evaluate:
${copy_text}

Score how well this copy matches the brand guidelines (0-100) and note specific deviations.
Respond with valid JSON only (no markdown fences): {"score": 0, "overall_assessment": "string", "deviations": [{"issue": "string", "suggestion": "string"}], "strengths": ["string"], "rewrite_suggestion": "string"}`;

    const response = await generateWithAI('brand_voices', prompt);
    const tokensUsed = response.tokensUsed || 0;

    // Persist to generated_content
    const saved = await pool.query(
      `INSERT INTO generated_content (user_id, feature_type, prompt, result, tokens_used)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
      [userId, 'brand_voice_check', copy_text.substring(0, 500), JSON.stringify(response.result), tokensUsed]
    );

    await trackTokenUsage(userId, tokensUsed);

    res.json({
      feature: 'brand_voice_check',
      response: response.result,
      raw: response.raw,
      saved_id: saved.rows[0].id,
      tokens_used: tokensUsed,
    });
  } catch (err) {
    console.error('Brand voice check error:', err);
    if (err.message.includes('OPENROUTER_API_KEY')) {
      return res.status(503).json({ error: 'AI service is not configured' });
    }
    res.status(500).json({ error: 'Failed to check brand voice', details: err.message });
  }
});

// POST /api/ai/generate
router.post('/generate', async (req, res) => {
  try {
    const { error, value } = generateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { feature, prompt, context, campaign_id } = value;
    const userId = req.user.id;

    // Optionally inject active brand profile as context
    let enrichedContext = context;
    try {
      const bp = await pool.query(
        `SELECT * FROM brand_profiles WHERE user_id = $1 AND is_active = true LIMIT 1`,
        [userId]
      );
      if (bp.rows.length > 0) {
        const profile = bp.rows[0];
        const brandCtx = `Brand: ${profile.name}. Industry: ${profile.industry || 'N/A'}. Tone: ${profile.tone_of_voice || 'N/A'}. Target: ${profile.target_persona || 'N/A'}.`;
        enrichedContext = enrichedContext ? `${enrichedContext}\n${brandCtx}` : brandCtx;
      }
    } catch (e) {
      // Non-fatal: brand profile injection is best-effort
    }

    // Validate campaign ownership if provided
    if (campaign_id) {
      const campaignCheck = await pool.query(
        `SELECT id FROM campaigns WHERE id = $1 AND user_id = $2`,
        [campaign_id, userId]
      );
      if (campaignCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Campaign not found or does not belong to you.' });
      }
    }

    const response = await generateWithAI(feature, prompt, enrichedContext);
    const tokensUsed = response.tokensUsed || 0;

    // Persist AI output to generated_content
    const saved = await pool.query(
      `INSERT INTO generated_content (user_id, feature_type, prompt, result, tokens_used, campaign_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
      [userId, feature, prompt, JSON.stringify(response.result), tokensUsed, campaign_id || null]
    );

    await trackTokenUsage(userId, tokensUsed);

    res.json({
      feature,
      prompt,
      response: response.result,
      raw: response.raw,
      saved_id: saved.rows[0].id,
      tokens_used: tokensUsed,
    });
  } catch (err) {
    console.error('AI generate error:', err);
    if (err.message.includes('OPENROUTER_API_KEY')) {
      return res.status(503).json({ error: 'AI service is not configured' });
    }
    res.status(500).json({ error: 'Failed to generate AI content', details: err.message });
  }
});

// POST /api/ai/score-copy - Smart copy scoring
router.post('/score-copy', async (req, res) => {
  try {
    const { error, value } = scoreSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { copy_text, generated_content_id } = value;
    const userId = req.user.id;

    const prompt = `Evaluate this advertising copy on the following dimensions. Be analytical and precise.

Copy to evaluate:
"""
${copy_text}
"""

Score each dimension 0-100 and provide specific feedback. Respond with valid JSON only (no markdown fences):
{
  "clarity_score": 0,
  "emotional_appeal_score": 0,
  "cta_strength_score": 0,
  "overall_score": 0,
  "compliance_flags": ["string"],
  "character_count": 0,
  "reading_level": "string",
  "feedback": {
    "clarity": "string",
    "emotional_appeal": "string",
    "cta_strength": "string",
    "overall": "string"
  },
  "improvement_suggestions": ["string"],
  "power_words_found": ["string"],
  "missing_elements": ["string"]
}`;

    const response = await generateWithAI('performance_predictions', prompt);
    const tokensUsed = response.tokensUsed || 0;
    const result = response.result;

    // Persist score
    const saved = await pool.query(
      `INSERT INTO copy_scores (user_id, generated_content_id, copy_text, clarity_score, emotional_appeal_score, cta_strength_score, overall_score, feedback)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, created_at`,
      [
        userId,
        generated_content_id || null,
        copy_text.substring(0, 2000),
        result?.clarity_score || null,
        result?.emotional_appeal_score || null,
        result?.cta_strength_score || null,
        result?.overall_score || null,
        JSON.stringify(result),
      ]
    );

    await trackTokenUsage(userId, tokensUsed);

    res.json({
      score: result,
      saved_id: saved.rows[0].id,
      tokens_used: tokensUsed,
    });
  } catch (err) {
    console.error('Copy scoring error:', err);
    res.status(500).json({ error: 'Failed to score copy', details: err.message });
  }
});

// POST /api/ai/compliance-check - Check ad compliance
router.post('/compliance-check', async (req, res) => {
  try {
    const { copy_text, platform } = req.body;
    if (!copy_text || typeof copy_text !== 'string') {
      return res.status(400).json({ error: 'copy_text is required and must be a string.' });
    }

    const userId = req.user.id;
    const targetPlatform = platform || 'general';

    const prompt = `Perform a comprehensive ad compliance check for the following copy intended for ${targetPlatform}.

Copy:
"""
${copy_text}
"""

Check for:
1. Prohibited phrases (e.g., "guaranteed", "100% safe", "FDA approved" without proof, "best in the world")
2. Excessive capitalization (more than 3 ALL CAPS words)
3. Superlatives without substantiation ("fastest", "cheapest", "#1")
4. Platform-specific violations for ${targetPlatform}
5. Sensitive categories (health claims, financial guarantees, before/after)

Respond with valid JSON only (no markdown fences):
{
  "overall_compliant": true,
  "compliance_score": 0,
  "platform": "${targetPlatform}",
  "violations": [{"rule": "string", "severity": "warning|error", "excerpt": "string", "fix": "string"}],
  "warnings": ["string"],
  "prohibited_words_found": ["string"],
  "recommendations": ["string"],
  "safe_to_publish": true
}`;

    const response = await generateWithAI('performance_predictions', prompt);
    const tokensUsed = response.tokensUsed || 0;

    await trackTokenUsage(userId, tokensUsed);

    res.json({
      compliance: response.result,
      tokens_used: tokensUsed,
    });
  } catch (err) {
    console.error('Compliance check error:', err);
    res.status(500).json({ error: 'Failed to check compliance', details: err.message });
  }
});

// POST /api/ai/share - Create shareable link for a generated content item
router.post('/share', async (req, res) => {
  try {
    const { error, value } = shareSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { generated_content_id, ttl_hours } = value;
    const userId = req.user.id;

    // Verify ownership
    const item = await pool.query(
      `SELECT id FROM generated_content WHERE id = $1 AND user_id = $2`,
      [generated_content_id, userId]
    );
    if (item.rows.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + ttl_hours * 60 * 60 * 1000);

    const saved = await pool.query(
      `INSERT INTO share_tokens (user_id, generated_content_id, token, expires_at)
       VALUES ($1, $2, $3, $4) RETURNING token, expires_at`,
      [userId, generated_content_id, token, expiresAt]
    );

    res.json({
      share_url: `${process.env.APP_URL || 'http://localhost:5173'}/share/${saved.rows[0].token}`,
      token: saved.rows[0].token,
      expires_at: saved.rows[0].expires_at,
    });
  } catch (err) {
    console.error('Share error:', err);
    res.status(500).json({ error: 'Failed to create share link', details: err.message });
  }
});

// POST /api/ai/audience-sentiment - Predict how target audience will react to ad copy
// Audit-recommended: AI audience sentiment modeling (will this resonate?)
router.post('/audience-sentiment', async (req, res) => {
  try {
    const { copy_text, audience_description, platform } = req.body;
    if (!copy_text || typeof copy_text !== 'string') {
      return res.status(400).json({ error: 'copy_text is required and must be a string.' });
    }
    if (copy_text.length > 5000) {
      return res.status(400).json({ error: 'copy_text must be under 5000 characters.' });
    }
    if (audience_description && typeof audience_description !== 'string') {
      return res.status(400).json({ error: 'audience_description must be a string.' });
    }

    const userId = req.user.id;
    const audience = audience_description || 'general consumer audience';
    const targetPlatform = platform || 'general';

    const prompt = `Predict how the following target audience will react to the ad copy below. Identify emotional resonance, persona-specific reactions, likely objections, and trust signals. Respond ONLY with valid JSON (no markdown fences):
{
  "overall_sentiment": "Very Positive|Positive|Neutral|Negative|Very Negative",
  "predicted_engagement_score": number,
  "predicted_conversion_likelihood": number,
  "emotional_resonance": {
    "primary_emotion": "string",
    "secondary_emotions": ["string"],
    "intensity_score": number
  },
  "persona_reactions": [
    {
      "persona": "string",
      "reaction": "string",
      "likely_action": "string",
      "concerns": ["string"]
    }
  ],
  "likely_objections": ["string", "string"],
  "trust_signals_present": ["string"],
  "trust_signals_missing": ["string"],
  "tonal_match_score": number,
  "cultural_red_flags": ["string"],
  "improvement_suggestions": [
    {
      "issue": "string",
      "suggestion": "string"
    }
  ],
  "overall_score": number,
  "confidence": "Low|Medium|High"
}

Target audience: ${audience}
Platform: ${targetPlatform}

Ad copy:
"""
${copy_text}
"""`;

    const response = await generateWithAI('performance_predictions', prompt);
    const tokensUsed = response.tokensUsed || 0;
    const result = response.result;

    await trackTokenUsage(userId, tokensUsed);

    res.json({
      sentiment: result,
      tokens_used: tokensUsed,
    });
  } catch (err) {
    console.error('Audience sentiment error:', err);
    if (err.message.includes('OPENROUTER_API_KEY')) {
      return res.status(503).json({ error: 'AI service is not configured' });
    }
    res.status(500).json({ error: 'Failed to predict audience sentiment', details: err.message });
  }
});

// =====================================================================
// Apply pass 5: backlog endpoints
// Required env vars (set in .env at repo root):
//   META_AD_LIBRARY_TOKEN  - for /competitor-ad-library (Meta Ad Library API)
//   GOOGLE_ADS_API_TOKEN   - for /ad-platform-upload (Google Ads / Meta auto-upload)
// PRODUCT-DECISION: industry benchmark data is sourced from the AI model when
//   no third-party benchmark provider key is configured; if INDUSTRY_BENCHMARK_API_KEY
//   is set we will instead call the external provider (placeholder integration).
// =====================================================================

// POST /api/ai/competitor-ad-library - search Meta Ad Library by brand
// NEEDS-CREDS: META_AD_LIBRARY_TOKEN
router.post('/competitor-ad-library', async (req, res) => {
  try {
    if (!process.env.META_AD_LIBRARY_TOKEN) {
      return res.status(503).json({ error: 'Service not configured', missing: 'META_AD_LIBRARY_TOKEN' });
    }
    const { search_terms, country, ad_active_status } = req.body || {};
    if (!search_terms || typeof search_terms !== 'string') {
      return res.status(400).json({ error: 'search_terms is required' });
    }
    // PRODUCT-DECISION: minimal pass-through to Meta Ad Library API; a more
    // complete implementation would page through results and persist them.
    const url = new URL('https://graph.facebook.com/v19.0/ads_archive');
    url.searchParams.set('search_terms', search_terms);
    url.searchParams.set('ad_reached_countries', country || 'US');
    url.searchParams.set('ad_active_status', ad_active_status || 'ALL');
    url.searchParams.set('access_token', process.env.META_AD_LIBRARY_TOKEN);
    url.searchParams.set('fields', 'id,ad_creative_bodies,ad_creative_link_titles,page_name,publisher_platforms');
    url.searchParams.set('limit', '25');
    const r = await fetch(url.toString());
    const body = await r.json();
    if (!r.ok) {
      return res.status(502).json({ error: 'Upstream error', details: body });
    }
    res.json({ source: 'meta_ad_library', results: body.data || [], paging: body.paging || null });
  } catch (err) {
    console.error('Competitor ad library error:', err);
    res.status(500).json({ error: 'Failed to query competitor ad library', details: err.message });
  }
});

// POST /api/ai/competitor-monitor - register a competitor brand for periodic scraping
// NEEDS-CREDS: META_AD_LIBRARY_TOKEN (used when worker runs)
// TOO-RISKY: scheduling worker would mutate ops; we only persist intent in a new table
router.post('/competitor-monitor', async (req, res) => {
  try {
    const { brand_name, frequency_hours } = req.body || {};
    if (!brand_name || typeof brand_name !== 'string') {
      return res.status(400).json({ error: 'brand_name is required' });
    }
    const userId = req.user.id;
    const freq = Math.min(168, Math.max(1, Number(frequency_hours) || 24));
    // Additive: CREATE TABLE IF NOT EXISTS so this never breaks existing schema.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS competitor_monitors (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        brand_name TEXT NOT NULL,
        frequency_hours INTEGER NOT NULL DEFAULT 24,
        last_run_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    const ins = await pool.query(
      `INSERT INTO competitor_monitors (user_id, brand_name, frequency_hours)
       VALUES ($1, $2, $3) RETURNING id, brand_name, frequency_hours, created_at`,
      [userId, brand_name, freq]
    );
    res.json({
      monitor: ins.rows[0],
      note: 'Monitor registered; an external worker (not bundled) is required to execute it.',
      requires_env: 'META_AD_LIBRARY_TOKEN',
    });
  } catch (err) {
    console.error('Competitor monitor error:', err);
    res.status(500).json({ error: 'Failed to register monitor', details: err.message });
  }
});

// POST /api/ai/industry-benchmark - blends AI estimate with external benchmark data when configured
// NEEDS-CREDS: optional INDUSTRY_BENCHMARK_API_KEY (uses AI fallback if unset)
router.post('/industry-benchmark', async (req, res) => {
  try {
    const { industry, copy_text, metric_focus } = req.body || {};
    if (!industry || !copy_text) {
      return res.status(400).json({ error: 'industry and copy_text are required' });
    }
    const userId = req.user.id;

    // PRODUCT-DECISION: if no benchmark provider key is set, fall back to an AI
    // estimate (existing behaviour) but explicitly label the source.
    let externalBenchmarks = null;
    if (process.env.INDUSTRY_BENCHMARK_API_KEY) {
      // Placeholder: real integration would call the provider here. We keep this
      // additive and avoid network calls without a real provider URL.
      externalBenchmarks = { provider: 'configured', note: 'External benchmark provider configured but client implementation pending.' };
    }

    const prompt = `Industry: ${industry}\nMetric focus: ${metric_focus || 'CTR & conversion rate'}\n\nCopy:\n${copy_text}\n\nReturn JSON: {industry_avg_ctr:"string", industry_avg_conversion:"string", your_estimated_ctr:"string", your_estimated_conversion:"string", percentile_rank:"string", source:"ai_estimate", what_top_performers_do_differently:["string"], improvement_suggestions:["string"]}.`;
    const response = await generateWithAI('performance_predictions', prompt);
    await trackTokenUsage(userId, response.tokensUsed || 0);
    res.json({
      benchmark: response.result,
      external: externalBenchmarks,
      source: externalBenchmarks ? 'mixed' : 'ai_estimate',
      tokens_used: response.tokensUsed || 0,
    });
  } catch (err) {
    console.error('Industry benchmark error:', err);
    if (err.message && err.message.includes('OPENROUTER_API_KEY')) {
      return res.status(503).json({ error: 'AI service is not configured', missing: 'OPENROUTER_API_KEY' });
    }
    res.status(500).json({ error: 'Failed to compute benchmark', details: err.message });
  }
});

// POST /api/ai/ad-platform-upload - upload campaign to Meta or Google Ads (creds gated)
// NEEDS-CREDS: META_ADS_ACCESS_TOKEN, META_ADS_AD_ACCOUNT_ID for "meta"
//              GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CUSTOMER_ID for "google"
router.post('/ad-platform-upload', async (req, res) => {
  try {
    const { platform, campaign } = req.body || {};
    if (!platform || !campaign) {
      return res.status(400).json({ error: 'platform and campaign are required' });
    }
    if (platform === 'meta') {
      const missing = [];
      if (!process.env.META_ADS_ACCESS_TOKEN) missing.push('META_ADS_ACCESS_TOKEN');
      if (!process.env.META_ADS_AD_ACCOUNT_ID) missing.push('META_ADS_AD_ACCOUNT_ID');
      if (missing.length) return res.status(503).json({ error: 'Service not configured', missing: missing.join(', ') });
    } else if (platform === 'google') {
      const missing = [];
      if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN) missing.push('GOOGLE_ADS_DEVELOPER_TOKEN');
      if (!process.env.GOOGLE_ADS_CUSTOMER_ID) missing.push('GOOGLE_ADS_CUSTOMER_ID');
      if (missing.length) return res.status(503).json({ error: 'Service not configured', missing: missing.join(', ') });
    } else {
      return res.status(400).json({ error: "platform must be 'meta' or 'google'" });
    }
    // PRODUCT-DECISION: real platform upload involves multi-step OAuth + ad-set
    // creation flow which is out of scope for this additive pass; we record an
    // upload intent so the campaign owner can audit it.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ad_platform_uploads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        platform TEXT NOT NULL,
        campaign_payload JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    const ins = await pool.query(
      `INSERT INTO ad_platform_uploads (user_id, platform, campaign_payload, status)
       VALUES ($1, $2, $3, 'queued') RETURNING id, status, created_at`,
      [req.user.id, platform, JSON.stringify(campaign)]
    );
    res.json({ upload: ins.rows[0], note: 'Upload queued; external worker required to push to platform.' });
  } catch (err) {
    console.error('Ad platform upload error:', err);
    res.status(500).json({ error: 'Failed to queue upload', details: err.message });
  }
});

// GET /api/ai/usage - Get current user's token usage stats
router.get('/usage', async (req, res) => {
  try {
    const userId = req.user.id;

    const [settingsRes, dailyRes, featureRes] = await Promise.all([
      pool.query(
        `SELECT monthly_token_limit, tokens_used_this_month, quota_reset_date
         FROM user_settings WHERE user_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT DATE(created_at) as date, SUM(tokens_used) as tokens, COUNT(*) as generations
         FROM generated_content
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at) ORDER BY date DESC`,
        [userId]
      ),
      pool.query(
        `SELECT feature_type, SUM(tokens_used) as tokens, COUNT(*) as count
         FROM generated_content
         WHERE user_id = $1
         GROUP BY feature_type ORDER BY tokens DESC`,
        [userId]
      ),
    ]);

    const settings = settingsRes.rows[0] || { monthly_token_limit: 100000, tokens_used_this_month: 0 };
    const usagePercent = Math.round((settings.tokens_used_this_month / settings.monthly_token_limit) * 100);

    res.json({
      monthly_limit: settings.monthly_token_limit,
      tokens_used: settings.tokens_used_this_month,
      tokens_remaining: Math.max(0, settings.monthly_token_limit - settings.tokens_used_this_month),
      usage_percent: usagePercent,
      quota_reset_date: settings.quota_reset_date,
      alert: usagePercent >= 80,
      daily_usage: dailyRes.rows,
      by_feature: featureRes.rows,
    });
  } catch (err) {
    console.error('Usage stats error:', err);
    res.status(500).json({ error: 'Failed to fetch usage stats', details: err.message });
  }
});

module.exports = router;
