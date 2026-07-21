const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = require('pg');

let poolConfig;

if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
  };
} else {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'ai_ad_generator',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err);
});

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS brand_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        industry VARCHAR(255),
        tone_of_voice TEXT,
        target_persona TEXT,
        competitor_names TEXT,
        brand_guidelines TEXT,
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        objective VARCHAR(255),
        budget VARCHAR(255),
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS generated_content (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        feature_type VARCHAR(100) NOT NULL,
        prompt TEXT,
        result JSONB,
        tokens_used INTEGER DEFAULT 0,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
        ab_test_id INTEGER,
        is_favorite BOOLEAN DEFAULT false,
        compliance_score INTEGER,
        brand_profile_id INTEGER REFERENCES brand_profiles(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ab_tests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
        variant_a JSONB,
        variant_b JSONB,
        winner VARCHAR(10),
        hypothesis TEXT,
        primary_metric VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS copy_scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        generated_content_id INTEGER REFERENCES generated_content(id) ON DELETE CASCADE,
        copy_text TEXT NOT NULL,
        clarity_score INTEGER,
        emotional_appeal_score INTEGER,
        cta_strength_score INTEGER,
        overall_score INTEGER,
        feedback JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS share_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        generated_content_id INTEGER REFERENCES generated_content(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        view_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        monthly_token_limit INTEGER DEFAULT 100000,
        tokens_used_this_month INTEGER DEFAULT 0,
        quota_reset_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_generated_content_user_id ON generated_content(user_id);
      CREATE INDEX IF NOT EXISTS idx_generated_content_feature_type ON generated_content(feature_type);
      CREATE INDEX IF NOT EXISTS idx_generated_content_campaign_id ON generated_content(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_generated_content_favorite ON generated_content(user_id, is_favorite);
      CREATE INDEX IF NOT EXISTS idx_ab_tests_user_id ON ab_tests(user_id);
      CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
      CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON share_tokens(token);
    `);
    console.log('Database tables initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = pool;
module.exports.initDb = initDb;
