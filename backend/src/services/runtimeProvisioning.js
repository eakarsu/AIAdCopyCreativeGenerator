'use strict';
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
function credentials(env, runtime = false) {
  const email = String(runtime ? env.PROVISION_ADMIN_EMAIL || env.ADMIN_EMAIL || '' : env.SEED_ADMIN_EMAIL || env.ADMIN_EMAIL || env.PROVISION_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(runtime ? env.PROVISION_ADMIN_PASSWORD || env.ADMIN_PASSWORD || '' : env.SEED_ADMIN_PASSWORD || env.ADMIN_PASSWORD || env.PROVISION_ADMIN_PASSWORD || '');
  if (!email || password.length < 12) throw new Error('Configured administrator credentials are required (password at least 12 characters).');
  return { email, password };
}
function runtimePasswordMatches(password, stored) {
  const [kind, salt, hash] = String(stored || '').split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex'), actual = crypto.scryptSync(password, salt, 32);
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}
async function provisionNativeAccount(pool, env = process.env) {
  const pair = credentials(env);
  const verify = async row => {
    if (!row || !await bcrypt.compare(pair.password, row.password)) throw new Error('Configured credentials do not match the saved native account. Startup did not change its password or authority.');
    return { id: row.id, created: false };
  };
  const existing = await pool.query('SELECT id,password FROM users WHERE lower(email)=$1', [pair.email]);
  if (existing.rows[0]) return verify(existing.rows[0]);
  const hash = await bcrypt.hash(pair.password, 12);
  const added = await pool.query("INSERT INTO users(email,password,name,role) VALUES($1,$2,$3,'admin') ON CONFLICT(email) DO NOTHING RETURNING id", [pair.email, hash, env.SEED_ADMIN_NAME || 'Runtime Administrator']);
  if (!added.rows[0]) return verify((await pool.query('SELECT id,password FROM users WHERE lower(email)=$1', [pair.email])).rows[0]);
  await pool.query('INSERT INTO user_settings(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING', [added.rows[0].id]);
  return { id: added.rows[0].id, created: true };
}
async function provisionRuntimeAccount(pool, env = process.env) {
  const pair = credentials(env, true), client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("CREATE TABLE IF NOT EXISTS runtime_app_users(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,display_name TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'user',active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()); CREATE TABLE IF NOT EXISTS runtime_app_sessions(token_hash TEXT PRIMARY KEY,user_id UUID NOT NULL REFERENCES runtime_app_users(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()); CREATE TABLE IF NOT EXISTS runtime_ai_interactions(id BIGSERIAL PRIMARY KEY,user_id UUID NOT NULL REFERENCES runtime_app_users(id),feature TEXT NOT NULL,input JSONB NOT NULL,output JSONB NOT NULL,model TEXT NOT NULL,provider_receipt JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()); ALTER TABLE runtime_ai_interactions ADD COLUMN IF NOT EXISTS provider_receipt JSONB NOT NULL DEFAULT '{}'::jsonb; CREATE INDEX IF NOT EXISTS runtime_ai_interactions_user_idx ON runtime_ai_interactions(user_id,created_at DESC)");
    let row = (await client.query('SELECT id,password_hash,active FROM runtime_app_users WHERE lower(email)=$1', [pair.email])).rows[0];
    let created = false;
    if (!row) {
      const salt = crypto.randomBytes(16).toString('hex'), hash = 'scrypt$' + salt + '$' + crypto.scryptSync(pair.password, salt, 32).toString('hex');
      row = (await client.query("INSERT INTO runtime_app_users(email,password_hash,display_name,role,active) VALUES($1,$2,'Runtime Administrator','admin',TRUE) ON CONFLICT(email) DO NOTHING RETURNING id,password_hash,active", [pair.email, hash])).rows[0];
      created = Boolean(row);
      if (!row) row = (await client.query('SELECT id,password_hash,active FROM runtime_app_users WHERE lower(email)=$1', [pair.email])).rows[0];
    }
    if (!row?.active || !runtimePasswordMatches(pair.password, row.password_hash)) throw new Error('Configured runtime credentials do not match an active saved account. Startup did not change its password, role or active state.');
    await client.query('COMMIT');
    return { id: row.id, created };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
module.exports = { credentials, runtimePasswordMatches, provisionNativeAccount, provisionRuntimeAccount };
