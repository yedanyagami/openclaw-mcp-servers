/**
 * github-models-proxy v1.0 — OpenAI-compatible proxy for GitHub Models
 *
 * Forwards /v1/chat/completions to models.inference.ai.azure.com
 * using GitHub PAT for auth. Makes GitHub Models accessible to all fleet workers.
 *
 * Working models (tested 2026-03-20):
 *   gpt-4o (50 req/day), gpt-4o-mini (150 req/day),
 *   DeepSeek-R1, Llama-3.3-70B-Instruct, Phi-4, Phi-4-multimodal-instruct
 *
 * Rate limits tracked per model in KV to avoid hitting GitHub daily caps.
 */

const GITHUB_MODELS_URL = 'https://models.inference.ai.azure.com';

const MODEL_LIMITS = {
  'gpt-4o': 50,
  'gpt-4o-mini': 150,
  'DeepSeek-R1': 500,
  'Llama-3.3-70B-Instruct': 500,
  'Phi-4': 500,
  'Phi-4-multimodal-instruct': 500,
};

const VALID_MODELS = Object.keys(MODEL_LIMITS);

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

async function getRateCount(kv, model) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `gh-rate:${model}:${today}`;
  const val = await kv.get(key);
  return val ? parseInt(val, 10) : 0;
}

async function incrRateCount(kv, model) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `gh-rate:${model}:${today}`;
  const val = await kv.get(key);
  const count = val ? parseInt(val, 10) + 1 : 1;
  await kv.put(key, String(count), { expirationTtl: 86400 });
  return count;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // Health
    if (path === '/health' || path === '/') {
      return jsonResp({
        service: 'github-models-proxy',
        version: env.VERSION || '1.0.0',
        models: VALID_MODELS,
        endpoint: '/v1/chat/completions'
      });
    }

    // Auth check — all endpoints below require authentication
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authToken || authToken !== env.AUTH_TOKEN) {
      return jsonResp({ error: 'Unauthorized' }, 401);
    }

    // List models (OpenAI-compat)
    if (path === '/v1/models') {
      return jsonResp({
        object: 'list',
        data: VALID_MODELS.map(m => ({
          id: m, object: 'model', owned_by: 'github',
          daily_limit: MODEL_LIMITS[m]
        }))
      });
    }

    // Rate stats
    if (path === '/v1/rate-stats') {
      const stats = {};
      for (const model of VALID_MODELS) {
        const used = await getRateCount(env.KV, model);
        stats[model] = { used, limit: MODEL_LIMITS[model], remaining: MODEL_LIMITS[model] - used };
      }
      return jsonResp({ ok: true, stats });
    }

    // Chat completions — the main endpoint
    if (path === '/v1/chat/completions' && request.method === 'POST') {
      const body = await request.json().catch(() => null);
      if (!body || !body.messages) {
        return jsonResp({ error: 'Missing messages' }, 400);
      }

      const model = body.model || env.DEFAULT_MODEL || 'gpt-4o-mini';
      if (!VALID_MODELS.includes(model)) {
        return jsonResp({ error: `Invalid model: ${model}. Available: ${VALID_MODELS.join(', ')}` }, 400);
      }

      // Rate limit check
      const used = await getRateCount(env.KV, model);
      const limit = MODEL_LIMITS[model] || 500;
      if (used >= limit) {
        return jsonResp({
          error: `Rate limit exceeded for ${model}: ${used}/${limit} today`,
          suggestion: model === 'gpt-4o' ? 'Try gpt-4o-mini (150/day) or Llama-3.3-70B-Instruct (500/day)' : 'Try another model'
        }, 429);
      }

      // Forward to GitHub Models
      try {
        const resp = await fetch(`${GITHUB_MODELS_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.GITHUB_TOKEN}`
          },
          body: JSON.stringify({
            model,
            messages: body.messages,
            max_tokens: body.max_tokens || 1024,
            temperature: body.temperature ?? 0.7,
            top_p: body.top_p,
            stream: false
          })
        });

        const json = await resp.json();

        if (!resp.ok) {
          return jsonResp({ error: `GitHub Models error: ${json.error?.message || resp.status}`, status: resp.status }, resp.status);
        }

        // Track usage
        await incrRateCount(env.KV, model);

        return jsonResp(json);
      } catch (e) {
        return jsonResp({ error: `Proxy error: ${e.message}` }, 502);
      }
    }

    return jsonResp({ error: 'Not found', endpoints: ['/v1/chat/completions', '/v1/models', '/v1/rate-stats', '/health'] }, 404);
  }
};
