/**
 * xai-proxy v1.0 — OpenAI-compatible proxy for xAI Grok API
 *
 * Forwards /v1/chat/completions to api.x.ai/v1
 * Rate limiting + credit tracking via KV.
 * Streaming passthrough supported.
 *
 * Models: grok-4-1-fast (default), grok-4-1, grok-3-mini-fast
 */

const XAI_URL = 'https://api.x.ai/v1';

const MODEL_LIMITS = {
  'grok-4-1-fast': 300,
  'grok-4-1': 100,
  'grok-3-mini-fast': 500,
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
  const key = `xai-rate:${model}:${today}`;
  const val = await kv.get(key);
  return val ? parseInt(val, 10) : 0;
}

async function incrRateCount(kv, model) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `xai-rate:${model}:${today}`;
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
        service: 'xai-proxy',
        version: env.VERSION || '1.0.0',
        models: VALID_MODELS,
        endpoint: '/v1/chat/completions'
      });
    }

    // List models (OpenAI-compat)
    if (path === '/v1/models') {
      const auth = request.headers.get('Authorization')?.replace('Bearer ', '');
      if (!auth || auth !== env.AUTH_TOKEN) return jsonResp({ error: 'Unauthorized' }, 401);
      return jsonResp({
        object: 'list',
        data: VALID_MODELS.map(m => ({
          id: m, object: 'model', owned_by: 'xai',
          daily_limit: MODEL_LIMITS[m]
        }))
      });
    }

    // Rate stats
    if (path === '/v1/rate-stats') {
      const auth = request.headers.get('Authorization')?.replace('Bearer ', '');
      if (!auth || auth !== env.AUTH_TOKEN) return jsonResp({ error: 'Unauthorized' }, 401);
      const stats = {};
      for (const model of VALID_MODELS) {
        const used = await getRateCount(env.KV, model);
        stats[model] = { used, limit: MODEL_LIMITS[model], remaining: MODEL_LIMITS[model] - used };
      }
      return jsonResp({ ok: true, stats });
    }

    // Auth check for main endpoints
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authToken || authToken !== env.AUTH_TOKEN) {
      return jsonResp({ error: 'Unauthorized' }, 401);
    }

    // Chat completions
    if (path === '/v1/chat/completions' && request.method === 'POST') {
      const body = await request.json().catch(() => null);
      if (!body || !body.messages) {
        return jsonResp({ error: 'Missing messages' }, 400);
      }

      const model = body.model || env.DEFAULT_MODEL || 'grok-4-1-fast';
      if (!VALID_MODELS.includes(model)) {
        return jsonResp({ error: `Invalid model: ${model}. Available: ${VALID_MODELS.join(', ')}` }, 400);
      }

      // Rate limit check
      const used = await getRateCount(env.KV, model);
      const limit = MODEL_LIMITS[model] || 300;
      if (used >= limit) {
        return jsonResp({
          error: `Rate limit exceeded for ${model}: ${used}/${limit} today`,
          suggestion: 'Try grok-3-mini-fast (500/day)'
        }, 429);
      }

      // Forward to xAI — support streaming passthrough
      const isStream = body.stream === true;
      try {
        const resp = await fetch(`${XAI_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.XAI_API_KEY}`
          },
          body: JSON.stringify({
            model,
            messages: body.messages,
            max_tokens: body.max_tokens || 1024,
            temperature: body.temperature ?? 0.7,
            top_p: body.top_p,
            stream: isStream,
            tools: body.tools,
            tool_choice: body.tool_choice,
          })
        });

        if (!resp.ok) {
          const errText = await resp.text().catch(() => '');
          return jsonResp({ error: `xAI error: ${errText || resp.status}`, status: resp.status }, resp.status);
        }

        // Track usage
        await incrRateCount(env.KV, model);

        // Streaming: passthrough the SSE stream
        if (isStream) {
          return new Response(resp.body, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Access-Control-Allow-Origin': '*',
            }
          });
        }

        const json = await resp.json();
        return jsonResp(json);
      } catch (e) {
        return jsonResp({ error: `Proxy error: ${e.message}` }, 502);
      }
    }

    return jsonResp({ error: 'Not found', endpoints: ['/v1/chat/completions', '/v1/models', '/v1/rate-stats', '/health'] }, 404);
  }
};
