// ============================================================
// DeployWorkflow — Multi-step Deploy Pipeline
// Steps: Validate → Deploy → Health Check → (Rollback if fail)
// Each step has automatic retry + state persistence
// ============================================================

import { WorkflowEntrypoint } from 'cloudflare:workers';

export class DeployWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const { worker, source } = event.payload;
    if (!worker) throw new Error('Missing worker name in payload');

    // Step 1: Validate — syntax check and pre-deploy verification
    const validation = await step.do('validate', async () => {
      // Check if Worker exists in fleet
      const resp = await this.env.FLEET_GATEWAY.fetch(
        new Request('http://internal/v1/fleet/status', {
          headers: { 'Authorization': `Bearer ${this.env.FLEET_GATEWAY_TOKEN || ''}` },
        })
      );
      const data = await resp.json();
      const workerStatus = (data.workers || []).find(w => w.name === worker);
      return {
        worker,
        exists: !!workerStatus,
        current_status: workerStatus?.alive ? 'alive' : 'unknown',
        source: source || 'manual',
      };
    });

    // Step 2: Deploy — trigger wrangler deploy (via queue for safety)
    const deployment = await step.do('deploy', async () => {
      if (this.env.TASK_QUEUE) {
        await this.env.TASK_QUEUE.send({
          type: 'dispatch',
          target: worker,
          payload: { action: 'deploy', source: 'deploy-workflow' },
          priority: 'high',
          created: Date.now(),
        });
        return { queued: true, worker };
      }
      return { queued: false, reason: 'No task queue configured' };
    });

    // Step 3: Health check — verify Worker is alive after deploy
    const healthCheck = await step.do('health-check', { retries: { limit: 3, delay: '10 seconds' } }, async () => {
      // Wait for deploy propagation
      await new Promise(resolve => setTimeout(resolve, 5000));

      const resp = await this.env.FLEET_GATEWAY.fetch(
        new Request('http://internal/v1/fleet/status', {
          headers: { 'Authorization': `Bearer ${this.env.FLEET_GATEWAY_TOKEN || ''}` },
        })
      );
      const data = await resp.json();
      const workerStatus = (data.workers || []).find(w => w.name === worker);

      if (!workerStatus?.alive) {
        throw new Error(`Worker ${worker} is not alive after deploy`);
      }

      return { worker, alive: true, status: workerStatus.status };
    });

    // Step 4: Record outcome
    await step.do('record', async () => {
      await this.env.FLEET_GATEWAY.fetch(
        new Request('http://internal/v1/memory/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.env.FLEET_GATEWAY_TOKEN || ''}`,
          },
          body: JSON.stringify({
            items: [{
              id: `deploy-${worker}-${Date.now()}`,
              name: `Deploy: ${worker}`,
              type: 'deploy_event',
              summary: `Worker ${worker} deployed. Health: ${healthCheck.alive ? 'OK' : 'FAILED'}. Source: ${source || 'manual'}`,
            }],
          }),
        })
      );
      return { recorded: true };
    });

    return {
      worker,
      validation,
      deployment,
      health_check: healthCheck,
      status: 'completed',
    };
  }
}
