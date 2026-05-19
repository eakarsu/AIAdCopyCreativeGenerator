const express = require('express');
const pool = require('../db');
const router = express.Router();

// ---------------------------------------------------------------------------
// Schema bootstrap for new custom features (idempotent).
// ---------------------------------------------------------------------------
let _schemaReady = null;
function ensureSchema() {
  if (_schemaReady) return _schemaReady;
  _schemaReady = pool
    .query(
      `CREATE TABLE IF NOT EXISTS brand_voice_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        brand_name VARCHAR(255) NOT NULL,
        tone VARCHAR(50) NOT NULL DEFAULT 'professional',
        reading_level VARCHAR(50) DEFAULT 'general',
        avoid_words TEXT,
        must_include_phrases TEXT,
        sample_voice_paragraph TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`
    )
    .catch((e) => {
      console.error('brand_voice_profiles schema init failed:', e.message);
    });
  return _schemaReady;
}
ensureSchema();

// Deterministic pseudo-random for stable demo data
function seededRand(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// GET /api/custom-views/variants
// Synthesizes a gallery of ad variants for the bespoke "Variant Gallery" view.
router.get('/variants', (req, res) => {
  const count = Math.min(parseInt(req.query.count || '8', 10), 24);
  const headlines = [
    'Write Better Ads in Minutes',
    'Stop Staring at a Blank Page',
    'The AI Behind Top-Performing Ads',
    'Your Competitors Are Already Using AI',
    'Launch Campaigns 10x Faster',
    'Turn Briefs Into Conversions',
    'Ad Copy That Actually Sells',
    'From Idea to Live Ad in 60s',
    'The Smartest Way to A/B Test',
    'High-Converting Copy on Demand',
    'Scale Your Ads Without Scaling Headcount',
    'Premium Copy, AI-Generated',
  ];
  const bodies = [
    'AI-powered ad copy that converts. Trusted by 10,000+ marketers across SaaS, e-commerce, and DTC brands.',
    'Generate platform-perfect ad variants in seconds. Optimize for CTR, conversions, and brand voice automatically.',
    'Stop guessing. Start scaling. Our model is trained on millions of high-performing ad campaigns.',
    'Drop in your brief, get back conversion-tested headline + body + CTA combinations ready for Meta and Google.',
    'Built for performance marketers who refuse to settle for "good enough" copy.',
    'Turn your campaign objective into a fully-formed creative concept, complete with image direction.',
  ];
  const ctas = ['Start Free Trial', 'Get Started', 'See Demo', 'Try It Free', 'Generate Ads', 'Boost ROI', 'Claim Offer'];
  const tones = ['Bold', 'Friendly', 'Authoritative', 'Playful', 'Urgent', 'Inspirational'];
  const platforms = ['Meta', 'Google', 'LinkedIn', 'TikTok', 'X'];

  const variants = [];
  for (let i = 0; i < count; i++) {
    const seedBase = i + 17;
    const ctr = +(1.2 + seededRand(seedBase) * 6.4).toFixed(2);
    const impressions = Math.floor(8000 + seededRand(seedBase * 3) * 42000);
    const clicks = Math.floor(impressions * (ctr / 100));
    variants.push({
      id: `v_${i + 1}`,
      label: `Variant ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}`,
      headline: headlines[i % headlines.length],
      body: bodies[i % bodies.length],
      cta: ctas[i % ctas.length],
      tone: tones[i % tones.length],
      platform: platforms[i % platforms.length],
      ctr,
      impressions,
      clicks,
      character_counts: {
        headline: headlines[i % headlines.length].length,
        body: bodies[i % bodies.length].length,
        cta: ctas[i % ctas.length].length,
      },
    });
  }

  res.json({
    generated_at: new Date().toISOString(),
    count: variants.length,
    variants,
  });
});

// GET /api/custom-views/funnel
// Returns funnel-stage metrics for variant A vs variant B with lift %.
router.get('/funnel', (req, res) => {
  const a = {
    label: 'Variant A',
    headline: 'Write Better Ads in Minutes, Not Hours',
    cta: 'Start Free Trial',
    impressions: 48200,
    clicks: 1735,
    conversions: 142,
  };
  const b = {
    label: 'Variant B',
    headline: 'Your Competitors Are Already Using AI',
    cta: 'See It in Action',
    impressions: 47800,
    clicks: 2103,
    conversions: 198,
  };

  const ctrA = a.clicks / a.impressions;
  const ctrB = b.clicks / b.impressions;
  const cvrA = a.conversions / a.clicks;
  const cvrB = b.conversions / b.clicks;
  const cvrOverallA = a.conversions / a.impressions;
  const cvrOverallB = b.conversions / b.impressions;

  const lift = (after, before) => before === 0 ? 0 : +(((after - before) / before) * 100).toFixed(2);

  const stages = [
    {
      stage: 'Impressions',
      A: a.impressions,
      B: b.impressions,
      lift_pct: lift(b.impressions, a.impressions),
    },
    {
      stage: 'Clicks',
      A: a.clicks,
      B: b.clicks,
      lift_pct: lift(b.clicks, a.clicks),
    },
    {
      stage: 'Conversions',
      A: a.conversions,
      B: b.conversions,
      lift_pct: lift(b.conversions, a.conversions),
    },
  ];

  res.json({
    generated_at: new Date().toISOString(),
    variant_a: a,
    variant_b: b,
    stages,
    summary: {
      ctr_a_pct: +(ctrA * 100).toFixed(2),
      ctr_b_pct: +(ctrB * 100).toFixed(2),
      ctr_lift_pct: lift(ctrB, ctrA),
      cvr_a_pct: +(cvrA * 100).toFixed(2),
      cvr_b_pct: +(cvrB * 100).toFixed(2),
      cvr_lift_pct: lift(cvrB, cvrA),
      overall_conv_rate_a_pct: +(cvrOverallA * 100).toFixed(3),
      overall_conv_rate_b_pct: +(cvrOverallB * 100).toFixed(3),
      winner: b.conversions > a.conversions ? 'B' : 'A',
      confidence: 'directional',
    },
  });
});

// ---------------------------------------------------------------------------
// Google Ads CSV Export
// GET /api/custom-views/google-ads.csv?campaign_id=N
// Returns Google Ads bulk-upload compatible CSV (RSA ad rows).
// ---------------------------------------------------------------------------
function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function buildCsvRow(fields) {
  return fields.map(csvEscape).join(',');
}

router.get('/google-ads.csv', async (req, res) => {
  const campaignIdRaw = req.query.campaign_id;
  const campaignId = parseInt(campaignIdRaw, 10);
  let campaignName = `Campaign ${Number.isFinite(campaignId) ? campaignId : 'Default'}`;
  let adGroupName = 'Ad Group 1';

  // Best-effort lookup of campaign name; falls back to synthetic when DB
  // unavailable or campaign not found. Keeps the endpoint demo-friendly.
  if (Number.isFinite(campaignId)) {
    try {
      const result = await pool.query(
        'SELECT name, objective FROM campaigns WHERE id = $1 LIMIT 1',
        [campaignId]
      );
      if (result.rows[0]) {
        campaignName = result.rows[0].name || campaignName;
        if (result.rows[0].objective) {
          adGroupName = `${result.rows[0].objective.slice(0, 40)} - AG1`;
        }
      }
    } catch (e) {
      // Swallow; csv still emits deterministic synthetic rows.
    }
  }

  const headlinesPool = [
    'AI-Powered Ad Copy in Minutes',
    'Boost CTR by 38% with Smart Copy',
    'Generate Hundreds of Variants Fast',
    'Stop Writer\'s Block. Start Selling.',
    'Conversion-Tested Headlines on Demand',
    'Outperform Your Competitor\'s Ads',
    'Launch Campaigns 10x Faster Today',
    'High-Converting Copy, Zero Guesswork',
    'AI That Writes Like Your Best Copywriter',
  ];
  const descriptionsPool = [
    'Generate platform-perfect ad variants in seconds. Optimize for CTR and ROAS.',
    'Trusted by 10,000+ marketers. Try the AI behind top-performing campaigns.',
    'Drop in your brief and get headline + body + CTA combinations ready to ship.',
    'Built for performance marketers who refuse to settle for "good enough" copy.',
  ];
  const ctaPaths = [
    ['free-trial', 'ai-copy'],
    ['ad-generator', 'demo'],
    ['plans', 'starter'],
    ['platform', 'creative'],
  ];

  const rows = [];
  // Google Ads bulk Editor RSA-style column header
  rows.push(
    buildCsvRow([
      'Campaign',
      'Ad Group',
      'Headline 1',
      'Headline 2',
      'Headline 3',
      'Description 1',
      'Description 2',
      'Final URL',
      'Path 1',
      'Path 2',
    ])
  );

  const seed = Number.isFinite(campaignId) ? campaignId : 1;
  for (let i = 0; i < 5; i++) {
    const h1 = headlinesPool[(seed + i) % headlinesPool.length];
    const h2 = headlinesPool[(seed + i * 2 + 1) % headlinesPool.length];
    const h3 = headlinesPool[(seed + i * 3 + 2) % headlinesPool.length];
    const d1 = descriptionsPool[(seed + i) % descriptionsPool.length];
    const d2 = descriptionsPool[(seed + i + 1) % descriptionsPool.length];
    const [p1, p2] = ctaPaths[(seed + i) % ctaPaths.length];
    rows.push(
      buildCsvRow([
        campaignName,
        adGroupName,
        h1,
        h2,
        h3,
        d1,
        d2,
        'https://example.com/ai-ad-generator',
        p1,
        p2,
      ])
    );
  }

  const csv = rows.join('\r\n') + '\r\n';
  const safeName = String(campaignName).replace(/[^a-z0-9_-]+/gi, '_').slice(0, 60) || 'campaign';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="google_ads_${safeName}.csv"`
  );
  res.status(200).send(csv);
});

// ---------------------------------------------------------------------------
// Brand Voice Profile CRUD
// GET  /api/custom-views/brand-voice          -> list
// POST /api/custom-views/brand-voice          -> create
// PUT  /api/custom-views/brand-voice?id=N     -> update (id can also be in body)
// ---------------------------------------------------------------------------
const ALLOWED_TONES = ['professional', 'casual', 'witty', 'luxury'];

function sanitizeProfileInput(body) {
  const b = body || {};
  const tone = ALLOWED_TONES.includes(b.tone) ? b.tone : 'professional';
  return {
    brand_name: String(b.brand_name || '').slice(0, 255).trim(),
    tone,
    reading_level: String(b.reading_level || 'general').slice(0, 50).trim() || 'general',
    avoid_words: Array.isArray(b.avoid_words)
      ? b.avoid_words.join(',').slice(0, 2000)
      : String(b.avoid_words || '').slice(0, 2000),
    must_include_phrases: Array.isArray(b.must_include_phrases)
      ? b.must_include_phrases.join(',').slice(0, 2000)
      : String(b.must_include_phrases || '').slice(0, 2000),
    sample_voice_paragraph: String(b.sample_voice_paragraph || '').slice(0, 4000),
  };
}

router.get('/brand-voice', async (req, res) => {
  try {
    await ensureSchema();
    const result = await pool.query(
      `SELECT id, brand_name, tone, reading_level, avoid_words,
              must_include_phrases, sample_voice_paragraph, created_at, updated_at
         FROM brand_voice_profiles
        ORDER BY updated_at DESC
        LIMIT 100`
    );
    res.json({
      generated_at: new Date().toISOString(),
      count: result.rows.length,
      profiles: result.rows,
    });
  } catch (err) {
    console.error('brand-voice GET error:', err.message);
    res.status(500).json({ error: 'Failed to load brand voice profiles' });
  }
});

router.post('/brand-voice', async (req, res) => {
  try {
    await ensureSchema();
    const data = sanitizeProfileInput(req.body);
    if (!data.brand_name) {
      return res.status(400).json({ error: 'brand_name is required' });
    }
    const result = await pool.query(
      `INSERT INTO brand_voice_profiles
        (brand_name, tone, reading_level, avoid_words, must_include_phrases, sample_voice_paragraph)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, brand_name, tone, reading_level, avoid_words,
                 must_include_phrases, sample_voice_paragraph, created_at, updated_at`,
      [
        data.brand_name,
        data.tone,
        data.reading_level,
        data.avoid_words,
        data.must_include_phrases,
        data.sample_voice_paragraph,
      ]
    );
    res.status(201).json({ profile: result.rows[0] });
  } catch (err) {
    console.error('brand-voice POST error:', err.message);
    res.status(500).json({ error: 'Failed to create brand voice profile' });
  }
});

router.put('/brand-voice', async (req, res) => {
  try {
    await ensureSchema();
    const id = parseInt(req.query.id || (req.body && req.body.id), 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'id is required (query or body)' });
    }
    const data = sanitizeProfileInput(req.body);
    if (!data.brand_name) {
      return res.status(400).json({ error: 'brand_name is required' });
    }
    const result = await pool.query(
      `UPDATE brand_voice_profiles
          SET brand_name = $1,
              tone = $2,
              reading_level = $3,
              avoid_words = $4,
              must_include_phrases = $5,
              sample_voice_paragraph = $6,
              updated_at = NOW()
        WHERE id = $7
        RETURNING id, brand_name, tone, reading_level, avoid_words,
                  must_include_phrases, sample_voice_paragraph, created_at, updated_at`,
      [
        data.brand_name,
        data.tone,
        data.reading_level,
        data.avoid_words,
        data.must_include_phrases,
        data.sample_voice_paragraph,
        id,
      ]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Brand voice profile not found' });
    }
    res.json({ profile: result.rows[0] });
  } catch (err) {
    console.error('brand-voice PUT error:', err.message);
    res.status(500).json({ error: 'Failed to update brand voice profile' });
  }
});

module.exports = router;
