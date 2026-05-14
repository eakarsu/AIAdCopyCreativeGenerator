const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const pool = require('./db');
const { initDb } = require('./db');

async function seed() {
  console.log('Starting database seed...');

  await initDb();

  // Create demo user
  const email = 'admin@adcopy.ai';
  const password = 'admin123';
  const salt = await bcrypt.genSalt(12);
  const hashed = await bcrypt.hash(password, salt);

  const userRes = await pool.query(`
    INSERT INTO users (email, password, name)
    VALUES ($1, $2, $3)
    ON CONFLICT (email) DO UPDATE SET password = $2, name = $3
    RETURNING id, email
  `, [email, hashed, 'Demo Admin']);

  const userId = userRes.rows[0].id;
  console.log(`Demo user: ${email} / ${password} (id=${userId})`);

  // Initialize user settings
  await pool.query(`
    INSERT INTO user_settings (user_id, monthly_token_limit)
    VALUES ($1, 200000)
    ON CONFLICT (user_id) DO UPDATE SET monthly_token_limit = 200000
  `, [userId]);

  // Create a demo brand profile
  await pool.query(`
    INSERT INTO brand_profiles (user_id, name, industry, tone_of_voice, target_persona, competitor_names, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT DO NOTHING
  `, [
    userId,
    'AdCopy AI Demo Brand',
    'SaaS / Marketing Technology',
    'Professional yet approachable. Use clear, concise language. Avoid jargon. Be data-driven and inspiring.',
    'Marketing managers at B2B SaaS companies, 28-45, managing $50K+ monthly ad budgets',
    'Jasper, Copy.ai, Writesonic',
    true,
  ]);

  // Create a demo campaign
  const campaignRes = await pool.query(`
    INSERT INTO campaigns (user_id, name, description, status, objective, budget)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT DO NOTHING
    RETURNING id
  `, [
    userId,
    'Q2 2026 Growth Campaign',
    'Drive user acquisition for premium tier via targeted ad copy',
    'active',
    'Increase premium signups by 30%',
    '$15,000/month',
  ]);

  if (campaignRes.rows.length > 0) {
    const campaignId = campaignRes.rows[0].id;

    // Create sample generated content
    const sampleContent = [
      {
        feature_type: 'ad_copies',
        prompt: 'Create an ad for AI-powered marketing copy tool targeting CMOs',
        result: {
          headline: 'Write Better Ads in Minutes, Not Hours',
          body: 'AI Ad Copy Generator creates conversion-optimized content across every channel. Trusted by 10,000+ marketers.',
          cta: 'Start Free Trial',
          tone: 'Professional & authoritative',
          target_demographic: 'CMOs and marketing directors at mid-market companies',
          character_counts: { headline: 38, body: 118, cta: 16 },
        },
      },
      {
        feature_type: 'headlines',
        prompt: 'Headlines for SaaS marketing tool launch',
        result: {
          headlines: [
            { text: 'The AI That Writes Your Best Ads', character_count: 33, style: 'Bold claim', emotional_trigger: 'Aspiration' },
            { text: 'Stop Staring at a Blank Page', character_count: 28, style: 'Pain point', emotional_trigger: 'Frustration relief' },
            { text: 'Your Competitors Are Already Using AI', character_count: 37, style: 'FOMO', emotional_trigger: 'Competitive anxiety' },
          ],
          recommended_primary: 'The AI That Writes Your Best Ads',
          word_count_avg: 6,
        },
      },
    ];

    for (const item of sampleContent) {
      await pool.query(`
        INSERT INTO generated_content (user_id, feature_type, prompt, result, tokens_used, campaign_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, item.feature_type, item.prompt, JSON.stringify(item.result), 450, campaignId]);
    }

    console.log(`Created sample campaign and content`);
  }

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
