// ============================================================
// EvolutionWorkflow — Multi-step AGI Evolution Pipeline
// Steps: Analyze → Plan → Execute → Learn
// Each step has automatic retry + state persistence
// If any step fails, resumes from last checkpoint
// ============================================================

import { WorkflowEntrypoint } from 'cloudflare:workers';

export class EvolutionWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const task = event.payload.task || 'general evolution cycle';

    // Step 1: Analyze — gather context from KG + memory
    const analysis = await step.do('analyze', async () => {
      const resp = await this.env.GRAPH_RAG.fetch(
        new Request('http://internal/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: task, limit: 10 }),
        })
      );
      const data = await resp.json();
      return {
        task,
        context_count: (data.results || []).length,
        context: (data.results || []).slice(0, 5).map(r => r.summary || r.name).join('\n'),
      };
    });

    // Step 2: Plan — use AI to create execution plan
    const plan = await step.do('plan', async () => {
      const result = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [
          { role: 'system', content: 'You are an AGI planner. Create a concise 3-step action plan. Return JSON: {"steps": [{"action": "...", "target": "..."}]}' },
          { role: 'user', content: `Task: ${task}\nContext: ${analysis.context || 'none'}` },
        ],
        max_tokens: 512,
      });
      try {
        return JSON.parse(result.response);
      } catch {
        return { steps: [{ action: task, target: 'cloud-executor' }] };
      }
    });

    // Step 3: Execute — dispatch plan steps via fleet-gateway
    const results = await step.do('execute', async () => {
      const execResults = [];
      for (const planStep of (plan.steps || []).slice(0, 3)) {
        try {
          const resp = await this.env.FLEET_GATEWAY.fetch(
            new Request('http://internal/v1/dispatch', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.env.FLEET_GATEWAY_TOKEN || ''}`,
              },
              body: JSON.stringify({
                worker: planStep.target || 'cloud-executor',
                payload: { action: planStep.action, source: 'evolution-workflow' },
              }),
            })
          );
          const data = await resp.json();
          execResults.push({ action: planStep.action, ok: resp.ok, result: data });
        } catch (e) {
          execResults.push({ action: planStep.action, ok: false, error: e.message });
        }
      }
      return execResults;
    });

    // Step 4: Learn — save outcomes to memory
    await step.do('learn', async () => {
      const succeeded = results.filter(r => r.ok).length;
      const saveResp = await this.env.FLEET_GATEWAY.fetch(
        new Request('http://internal/v1/memory/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.env.FLEET_GATEWAY_TOKEN || ''}`,
          },
          body: JSON.stringify({
            items: [{
              id: `evolution-${Date.now()}`,
              name: `Evolution: ${task.substring(0, 60)}`,
              type: 'evolution_cycle',
              summary: `Task: ${task}\nSteps: ${plan.steps?.length || 0}\nSucceeded: ${succeeded}/${results.length}\nResults: ${JSON.stringify(results).substring(0, 500)}`,
            }],
          }),
        })
      );
      return { saved: (await saveResp.json()).ok, succeeded, total: results.length };
    });

    return { task, analysis, plan, results, status: 'completed' };
  }
}
