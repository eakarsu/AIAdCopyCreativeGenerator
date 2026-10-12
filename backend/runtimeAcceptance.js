'use strict';
const crypto = require('node:crypto');
const express = require('express');
const nativeRequest = require('./src/services/nativeRequest');
const { runtimePasswordMatches } = require('./src/services/runtimeProvisioning');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
function createRuntimeAcceptanceRouter({ pool = require('./src/db'), env = process.env, fetchImpl = global.fetch } = {}) {
  const database = nativeRequest.requestPool(pool), router = express.Router();
  const selected = String(env.RUNTIME_AI_ENDPOINT || '/api/ai/ad-creative-review').replace(/^\/api/, '');
  if (!selected.startsWith('/ai/')) throw new Error('Runtime AI endpoint must be an /api/ai path.');
  const feature = env.RUNTIME_AI_FEATURE || 'ad-creative-governance-review';
  async function actor(req, lock = false, client = database) {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!/^[a-f0-9]{64}$/.test(token)) return null;
    const row = await client.query('SELECT u.id,u.email,u.display_name,u.role FROM runtime_app_sessions s JOIN runtime_app_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW() AND u.active=TRUE' + (lock ? ' FOR SHARE OF u,s' : ''), [sha(token)]);
    return row.rows[0] || null;
  }
  nativeRequest.installNativeRequest(router);
  async function login(req, res) {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase(), password = String(req.body?.password || '');
      const user = (await database.query('SELECT id,email,password_hash,display_name,role FROM runtime_app_users WHERE lower(email)=$1 AND active=TRUE', [email])).rows[0];
      if (!user || !runtimePasswordMatches(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
      const token = crypto.randomBytes(32).toString('hex');
      nativeRequest.beforeCommit(async client => {
        const fresh = (await client.query('SELECT active,password_hash FROM runtime_app_users WHERE id=$1 FOR SHARE', [user.id])).rows[0];
        if (!fresh?.active || fresh.password_hash !== user.password_hash) throw Object.assign(new Error('Runtime account changed. Sign in again.'), { status: 401 });
      });
      await database.query("INSERT INTO runtime_app_sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '24 hours')", [sha(token), user.id]);
      res.json({ token, user: { id: user.id, email: user.email, name: user.display_name, role: user.role } });
    } catch (error) { res.status(error.status || 500).json({ error: error.message || 'Sign in failed.' }); }
  }
  async function me(req, res) {
    try { const user = await actor(req); res.status(user ? 200 : 401).json(user ? { user } : { error: 'Runtime sign in required' }); }
    catch (_) { res.status(500).json({ error: 'Runtime account could not be checked.' }); }
  }
  router.post(['/auth/login', '/runtime-auth/login'], login);
  router.get(['/auth/me', '/runtime-auth/me'], me);
  router.get('/ai/history', async (req, res) => {
    try {
      const user = await actor(req);
      if (!user) return res.status(401).json({ error: 'Runtime sign in required' });
      const rows = await database.query('SELECT id,feature,input,output,model,provider_receipt AS "providerReceipt",created_at AS "createdAt" FROM runtime_ai_interactions WHERE user_id=$1 AND feature=$2 ORDER BY created_at DESC LIMIT 50', [user.id, feature]);
      res.json({ history: rows.rows });
    } catch (_) { res.status(500).json({ error: 'Saved runtime reports could not be loaded. Retry.' }); }
  });
  router.post(selected, async (req, res) => {
    try {
      const user = await actor(req);
      if (!user) return res.status(401).json({ error: 'Runtime sign in required' });
      const prompt = String(req.body?.prompt || req.body?.question || req.body?.message || req.body?.context || '').trim();
      if (!prompt || prompt.length > 20000) return res.status(400).json({ error: 'A prompt between 1 and 20,000 characters is required.' });
      const base = String(env.OPENROUTER_BASE_URL || '').replace(/\/+$/, ''), model = String(env.OPENROUTER_MODEL || '').trim(), key = String(env.OPENROUTER_API_KEY || '').trim();
      if (base !== 'https://openrouter.ai/api/v1' || !model || !key) return res.status(503).json({ error: 'The exact OpenRouter endpoint, model and API key must be configured.' });
      nativeRequest.beforeCommit(async client => {
        const fresh = await actor(req, true, client);
        if (!fresh || fresh.id !== user.id) throw Object.assign(new Error('Runtime account or session changed. No result was saved.'), { status: 401 });
      });
      const response = await fetchImpl(base + '/chat/completions', { method: 'POST', signal: nativeRequest.requestSignal(), headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', 'X-Title': env.RUNTIME_PROJECT_NAME || 'AI Ad Copy Creative Generator' }, body: JSON.stringify({ model, messages: [{ role: 'system', content: env.RUNTIME_AI_SYSTEM_PROMPT || 'Give a practical, evidence-aware creative governance review. This is advisory; never claim publication, approval or measured performance.' }, { role: 'user', content: prompt }], max_tokens: 650 }) });
      const provider = await nativeRequest.readProviderJSON(response);
      nativeRequest.assertActive();
      if (!response.ok || provider.error) throw Object.assign(new Error('OpenRouter returned HTTP ' + response.status), { status: 502 });
      const content = provider.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim() || provider.choices[0].finish_reason === 'length' || typeof provider.id !== 'string' || !provider.id.trim()) throw Object.assign(new Error('OpenRouter returned an empty, incomplete or unreceipted answer. No result was saved.'), { status: 502 });
      const receipt = { requestId: String(provider.id), provider: String(provider.provider || 'openrouter'), upstreamModel: String(provider.model || model), created: typeof provider.created === 'number' ? provider.created : null };
      const saved = await database.query('INSERT INTO runtime_ai_interactions(user_id,feature,input,output,model,provider_receipt) VALUES($1,$2,$3::jsonb,$4::jsonb,$5,$6::jsonb) RETURNING id', [user.id, feature, JSON.stringify(req.body || {}), JSON.stringify({ content }), model, JSON.stringify(receipt)]);
      res.json({ content, model, providerReceipt: receipt, interactionId: Number(saved.rows[0].id), feature });
    } catch (error) { res.status(error.status || 500).json({ error: error.message || 'The creative review failed.' }); }
  });
  return router;
}
module.exports = createRuntimeAcceptanceRouter();
module.exports.createRuntimeAcceptanceRouter = createRuntimeAcceptanceRouter;
