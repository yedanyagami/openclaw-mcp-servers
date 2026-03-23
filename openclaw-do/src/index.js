// ============================================================
// OpenClaw Durable Objects — Router
// Exposes OODAAgent + AGIBrain via HTTP routing
// ============================================================

export { OODAAgent } from './ooda-agent.js';
export { AGIBrain } from './agi-brain.js';
export { UnifiedCortex } from './unified-cortex.js';

function routeToDO(env, binding, request, path, prefix) {
  const id = env[binding].idFromName('singleton');
  const stub = env[binding].get(id);
  const subPath = path.replace(prefix, '');
  return stub.fetch(new Request(`http://internal${subPath || '/'}`, {
    method: request.method,
    headers: request.headers,
    body: request.method !== 'GET' ? request.body : undefined,
  }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Health
    if (path === '/health' || path === '/') {
      return Response.json({
        service: 'openclaw-do',
        status: 'ok',
        objects: ['OODAAgent', 'AGIBrain', 'UnifiedCortex'],
        timestamp: new Date().toISOString(),
      });
    }

    // Route to UnifiedCortex DO (primary brain)
    if (path.startsWith('/cortex/')) return routeToDO(env, 'UNIFIED_CORTEX', request, path, '/cortex');

    // Route to OODAAgent DO
    if (path.startsWith('/ooda/')) return routeToDO(env, 'OODA_AGENT', request, path, '/ooda');

    // Route to AGIBrain DO
    if (path.startsWith('/brain/')) return routeToDO(env, 'AGI_BRAIN', request, path, '/brain');

    return Response.json({
      error: 'Not found',
      routes: {
        cortex: ['/cortex/observe', '/cortex/orient', '/cortex/decide', '/cortex/act', '/cortex/reflect', '/cortex/state', '/cortex/dashboard'],
        ooda: ['/ooda/init', '/ooda/status', '/ooda/trigger'],
        brain: ['/brain/init', '/brain/record', '/brain/recommend', '/brain/metrics', '/brain/learn'],
      },
    }, { status: 404 });
  },
};
