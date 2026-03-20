// ============================================================
// OpenClaw Durable Objects — Router
// Exposes OODAAgent + AGIBrain via HTTP routing
// ============================================================

export { OODAAgent } from './ooda-agent.js';
export { AGIBrain } from './agi-brain.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Health
    if (path === '/health' || path === '/') {
      return Response.json({
        service: 'openclaw-do',
        status: 'ok',
        objects: ['OODAAgent', 'AGIBrain'],
        timestamp: new Date().toISOString(),
      });
    }

    // Route to OODAAgent DO
    if (path.startsWith('/ooda/')) {
      const id = env.OODA_AGENT.idFromName('singleton');
      const stub = env.OODA_AGENT.get(id);
      const subPath = path.replace('/ooda', '');
      return stub.fetch(new Request(`http://internal${subPath}`, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' ? request.body : undefined,
      }));
    }

    // Route to AGIBrain DO
    if (path.startsWith('/brain/')) {
      const id = env.AGI_BRAIN.idFromName('singleton');
      const stub = env.AGI_BRAIN.get(id);
      const subPath = path.replace('/brain', '');
      return stub.fetch(new Request(`http://internal${subPath}`, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' ? request.body : undefined,
      }));
    }

    return Response.json({
      error: 'Not found',
      routes: {
        ooda: ['/ooda/init', '/ooda/status', '/ooda/trigger'],
        brain: ['/brain/init', '/brain/record', '/brain/recommend', '/brain/metrics', '/brain/learn'],
      },
    }, { status: 404 });
  },
};
