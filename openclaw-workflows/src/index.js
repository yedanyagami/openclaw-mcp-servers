// ============================================================
// OpenClaw Workflows — Router
// Exposes EvolutionWorkflow + DeployWorkflow via HTTP
// ============================================================

export { EvolutionWorkflow } from './evolution.js';
export { DeployWorkflow } from './deploy.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Health
    if (path === '/health' || path === '/') {
      return Response.json({
        service: 'openclaw-workflows',
        status: 'ok',
        workflows: ['evolution-workflow', 'deploy-workflow'],
        timestamp: new Date().toISOString(),
      });
    }

    // Trigger Evolution Workflow
    if (path === '/v1/evolve' && request.method === 'POST') {
      const body = await request.json();
      const instance = await env.EVOLUTION.create({ params: { task: body.task || 'autonomous evolution cycle' } });
      return Response.json({
        ok: true,
        workflow: 'evolution',
        instance_id: instance.id,
        status: await instance.status(),
      });
    }

    // Trigger Deploy Workflow
    if (path === '/v1/deploy' && request.method === 'POST') {
      const body = await request.json();
      if (!body.worker) return Response.json({ error: 'Missing worker name' }, { status: 400 });
      const instance = await env.DEPLOY.create({ params: { worker: body.worker, source: body.source || 'api' } });
      return Response.json({
        ok: true,
        workflow: 'deploy',
        instance_id: instance.id,
        status: await instance.status(),
      });
    }

    // Check workflow status
    if (path === '/v1/status' && request.method === 'GET') {
      const id = url.searchParams.get('id');
      const type = url.searchParams.get('type') || 'evolution';
      if (!id) return Response.json({ error: 'Missing workflow instance id' }, { status: 400 });

      const binding = type === 'deploy' ? env.DEPLOY : env.EVOLUTION;
      const instance = await binding.get(id);
      return Response.json({
        id,
        type,
        status: await instance.status(),
      });
    }

    return Response.json({
      error: 'Not found',
      routes: ['/v1/evolve', '/v1/deploy', '/v1/status'],
    }, { status: 404 });
  },
};
