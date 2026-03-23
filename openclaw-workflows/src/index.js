// ============================================================
// OpenClaw Workflows — Router
// Exposes EvolutionWorkflow + DeployWorkflow via HTTP
// ============================================================

export { EvolutionWorkflow } from './evolution.js';
export { DeployWorkflow } from './deploy.js';
export { ResearchWorkflow } from './research.js';
export { SecurityAuditWorkflow } from './security-audit.js';
export { SkillEvolutionWorkflow } from './skill-evolution.js';
export { ABTestWorkflow } from './ab-test.js';

const WORKFLOW_MAP = {
  evolution: 'EVOLUTION',
  deploy: 'DEPLOY',
  research: 'RESEARCH',
  'security-audit': 'SECURITY_AUDIT',
  'skill-evolution': 'SKILL_EVOLUTION',
  'ab-test': 'AB_TEST',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Health
    if (path === '/health' || path === '/') {
      return Response.json({
        service: 'openclaw-workflows',
        status: 'ok',
        workflows: Object.keys(WORKFLOW_MAP),
        timestamp: new Date().toISOString(),
      });
    }

    // Trigger Evolution Workflow
    if (path === '/v1/evolve' && request.method === 'POST') {
      const body = await request.json();
      const instance = await env.EVOLUTION.create({ params: { task: body.task || 'autonomous evolution cycle' } });
      return Response.json({ ok: true, workflow: 'evolution', instance_id: instance.id, status: await instance.status() });
    }

    // Trigger Deploy Workflow
    if (path === '/v1/deploy' && request.method === 'POST') {
      const body = await request.json();
      if (!body.worker) return Response.json({ error: 'Missing worker name' }, { status: 400 });
      const instance = await env.DEPLOY.create({ params: { worker: body.worker, source: body.source || 'api' } });
      return Response.json({ ok: true, workflow: 'deploy', instance_id: instance.id, status: await instance.status() });
    }

    // Trigger Research Workflow
    if (path === '/v1/research' && request.method === 'POST') {
      const body = await request.json();
      const instance = await env.RESEARCH.create({ params: { topic: body.topic || 'general research' } });
      return Response.json({ ok: true, workflow: 'research', instance_id: instance.id, status: await instance.status() });
    }

    // Trigger Security Audit Workflow
    if (path === '/v1/security-audit' && request.method === 'POST') {
      const body = await request.json();
      const instance = await env.SECURITY_AUDIT.create({ params: { target: body.target || 'fleet', scope: body.scope || 'full' } });
      return Response.json({ ok: true, workflow: 'security-audit', instance_id: instance.id, status: await instance.status() });
    }

    // Trigger Skill Evolution Workflow
    if (path === '/v1/skill-evolution' && request.method === 'POST') {
      const body = await request.json();
      const instance = await env.SKILL_EVOLUTION.create({ params: { focus: body.focus || 'all' } });
      return Response.json({ ok: true, workflow: 'skill-evolution', instance_id: instance.id, status: await instance.status() });
    }

    // Trigger A/B Test Workflow
    if (path === '/v1/ab-test' && request.method === 'POST') {
      const body = await request.json();
      const instance = await env.AB_TEST.create({ params: { task: body.task || 'test', brains: body.brains || ['rendan', 'golem'] } });
      return Response.json({ ok: true, workflow: 'ab-test', instance_id: instance.id, status: await instance.status() });
    }

    // Check workflow status (generic)
    if (path === '/v1/status' && request.method === 'GET') {
      const id = url.searchParams.get('id');
      const type = url.searchParams.get('type') || 'evolution';
      if (!id) return Response.json({ error: 'Missing workflow instance id' }, { status: 400 });

      const bindingName = WORKFLOW_MAP[type];
      if (!bindingName || !env[bindingName]) return Response.json({ error: `Unknown workflow type: ${type}` }, { status: 400 });

      const instance = await env[bindingName].get(id);
      return Response.json({ id, type, status: await instance.status() });
    }

    return Response.json({
      error: 'Not found',
      routes: ['/v1/evolve', '/v1/deploy', '/v1/research', '/v1/security-audit', '/v1/skill-evolution', '/v1/ab-test', '/v1/status'],
    }, { status: 404 });
  },
};
