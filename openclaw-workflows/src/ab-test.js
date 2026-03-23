// ============================================================
// ABTestWorkflow — Cross-Brain A/B Testing Pipeline
// Steps: Dispatch → Compare → Score → Learn
// ============================================================

import { WorkflowEntrypoint } from 'cloudflare:workers';

export class ABTestWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const task = event.payload.task || 'test task';
    const brains = event.payload.brains || ['rendan', 'golem'];

    // Step 1: Dispatch same task to multiple brains (via KV-stored metrics)
    const results = await step.do('dispatch-to-brains', async () => {
      const brainResults = {};
      for (const brain of brains) {
        const startTime = Date.now();
        try {
          // Use fleet-gateway dispatch to route to appropriate brain
          const resp = await this.env.FLEET_GATEWAY.fetch(
            new Request('http://internal/v1/dispatch', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.env.FLEET_GATEWAY_TOKEN || ''}`,
              },
              body: JSON.stringify({
                worker: brain === 'rendan' ? 'orchestrator' : 'cloud-executor',
                payload: { action: task, source: 'ab-test-workflow', brain },
              }),
            })
          );
          const data = await resp.json();
          brainResults[brain] = {
            ok: resp.ok,
            latency_ms: Date.now() - startTime,
            result: data,
          };
        } catch (e) {
          brainResults[brain] = { ok: false, latency_ms: Date.now() - startTime, error: e.message };
        }
      }
      return brainResults;
    });

    // Step 2: AI-powered comparison
    const comparison = await step.do('compare-results', async () => {
      const result = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [
          { role: 'system', content: 'Compare A/B test results from multiple AI brains. Evaluate quality, speed, and correctness. Return JSON: {"winner": "brain_name", "scores": {"brain1": 0-100, "brain2": 0-100}, "reasoning": "...", "confidence": 0.0-1.0}' },
          { role: 'user', content: `Task: ${task}\nResults:\n${JSON.stringify(results, null, 2)}` },
        ],
        max_tokens: 512,
      });
      try { return JSON.parse(result.response); } catch { return { winner: brains[0], scores: {}, reasoning: result.response, confidence: 0.5 }; }
    });

    // Step 3: Record to AGI Brain DO for learning
    await step.do('record-learning', async () => {
      try {
        const doId = this.env.AGI_BRAIN?.idFromName?.('singleton');
        if (doId) {
          const stub = this.env.AGI_BRAIN.get(doId);
          await stub.fetch(new Request('http://internal/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              task_type: 'ab-test',
              brain: comparison.winner,
              success: true,
              latency_ms: results[comparison.winner]?.latency_ms || 0,
            }),
          }));
        }
      } catch { /* DO may not be available from workflow */ }

      // Also save to D1
      await this.env.DB.prepare(
        `INSERT OR REPLACE INTO entities (id, name, entity_type, summary, source, trust_level, updated_at)
         VALUES (?, ?, 'ab_test', ?, 'ab-test-workflow', 2, datetime('now'))`
      ).bind(
        `ab-${Date.now()}`,
        `A/B Test: ${task.substring(0, 60)}`,
        JSON.stringify({ winner: comparison.winner, confidence: comparison.confidence, brains, scores: comparison.scores }).substring(0, 2000)
      ).run();

      return { recorded: true, winner: comparison.winner };
    });

    return { task, brains, results, comparison, status: 'completed' };
  }
}
