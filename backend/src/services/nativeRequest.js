const { AsyncLocalStorage } = require('node:async_hooks');
const requests = new AsyncLocalStorage();
const cancelled = () => Object.assign(new Error('Request cancelled. No late result was saved.'), { name: 'AbortError', status: 499 });
function assertActive() {
  const request = requests.getStore();
  if (request?.signal.aborted || request?.finished) throw cancelled();
}
function requestSignal() { return requests.getStore()?.signal; }
function beforeCommit(check) {
  const request = requests.getStore();
  if (request) request.checks.push(check);
}
async function rollback(request) {
  if (request.opening) await request.opening.catch(() => {});
  if (!request.client) return;
  const client = request.client; request.client = null;
  try { await client.query('ROLLBACK'); } finally { client.release(); }
}
function installNativeRequest(router, {timeoutMs=110000} = {}) {
  router.use((req, res, next) => {
    const controller = new AbortController();
    const request = { signal: controller.signal, client: null, opening: null, checks: [], finished: false };
    const timer = setTimeout(() => { request.timedOut=true; controller.abort(); rollback(request).catch(() => {}); }, timeoutMs);
    const abort = () => { controller.abort(); rollback(request).catch(() => {}); };
    req.once('aborted', abort);
    res.once('close', () => { clearTimeout(timer); if (!res.writableEnded) abort(); });
    res.once('finish', () => { clearTimeout(timer); req.removeListener('aborted', abort); });
    if (req.aborted || res.destroyed) controller.abort();
    const send = res.json.bind(res);
    res.json = function (body) {
      if (request.responding) return res;
      request.responding = true;
      requests.run(request, async () => {
        try {
          if(res.statusCode>=400){request.failedResponse=true;controller.abort();}
          if (res.statusCode >= 400 || request.signal.aborted) {
            await rollback(request);
          } else if (request.client) {
            assertActive();
            for (const check of request.checks) { await check(request.client); assertActive(); }
            await request.client.query('COMMIT');
            const client = request.client; request.client = null; client.release();
          }
          request.finished = true;
          if ((!request.signal.aborted || request.timedOut || request.failedResponse) && !res.destroyed) { if(request.timedOut) { res.status(504); send({error:'The provider request timed out. No late result was saved.'}); } else send(body); }
        } catch (error) {
          await rollback(request).catch(() => {});
          request.finished = true;
          if (!request.signal.aborted && !res.destroyed) {
            res.status(error.status || 500); send({ error: error.message || 'The result could not be saved.' });
          }
        }
      });
      return res;
    };
    requests.run(request, next);
  });
}
function requestPool(pool) {
  return {
    async query(sql, values) {
      const request = requests.getStore();
      if (!request) return pool.query(sql, values);
      assertActive();
      if (!request.client && !request.opening && /^\s*(?:INSERT|UPDATE|DELETE|CREATE|ALTER)\b/i.test(sql)) {
        request.opening = (async () => {
          const client = await pool.connect();
          try { assertActive(); await client.query('BEGIN'); request.client = client; }
          catch (error) { client.release(); throw error; }
        })();
      }
      if (request.opening) await request.opening;
      assertActive();
      const result = await (request.client || pool).query(sql, values);
      assertActive();
      return result;
    },
  };
}
async function readProviderJSON(response) {
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw Object.assign(new Error('OpenRouter returned HTTP ' + response.status + '. No successful result was saved.'), { status: response.status === 429 ? 429 : 502 });
  }
  let data;
  try { data = await response.json(); } catch (_) { throw Object.assign(new Error('OpenRouter returned an unreadable response.'), { status: 502 }); }
  assertActive();
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw Object.assign(new Error('OpenRouter returned an unreadable response.'), { status: 502 });
  if (data.error) throw Object.assign(new Error(data.error?.message || 'OpenRouter reported a provider error. No successful result was saved.'), { status: 502 });
  return data;
}
async function providerResponse(messages, { model, temperature = 0.7, maxTokens = 2000 } = {}) {
  assertActive();
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || !model) throw Object.assign(new Error('OpenRouter is not configured for this native feature.'), { status: 503 });
  const base = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
  if(base!=='https://openrouter.ai/api/v1')throw Object.assign(new Error('Use the native OpenRouter API endpoint.'),{status:503});
  const response = await fetch(base + '/chat/completions', {
    method: 'POST', signal: requestSignal(),
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', 'X-Title': 'AI Ad Copy Creative Generator' },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  });
  const data = await readProviderJSON(response);
  const choice = data.choices?.[0], content = choice?.message?.content;
  if (typeof content !== 'string' || !content.trim() || choice.finish_reason === 'length' || typeof data.id !== 'string' || !data.id.trim()) throw Object.assign(new Error('OpenRouter returned an empty or incomplete answer. No successful result was saved.'), { status: 502 });
  return { content, usage: data.usage || null, model: data.model || model,
    providerReceipt: typeof data.id === 'string' && data.id ? { requestId: data.id, provider: data.provider || 'openrouter', upstreamModel: data.model || model } : null };
}
module.exports = { installNativeRequest, requestPool, requestSignal, beforeCommit, assertActive, providerResponse, readProviderJSON };
