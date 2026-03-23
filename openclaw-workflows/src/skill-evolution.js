// ============================================================
// SkillEvolutionWorkflow — Analyze skills and evolve capabilities
// Steps: Inventory → Analyze → Synthesize → Deploy
// ============================================================

import { WorkflowEntrypoint } from 'cloudflare:workers';

export class SkillEvolutionWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const focus = event.payload.focus || 'all';

    // Step 1: Collect skill inventories from brains
    const inventory = await step.do('collect-inventory', async () => {
      const kvData = {};
      for (const brain of ['rendan', 'golem']) {
        try {
          const data = await this.env.KV.get(`vm-metrics-${brain}`, 'json');
          if (data?.health?.modules) {
            kvData[brain] = {
              modules: Object.keys(data.health.modules).length,
              agi_score: data.agi_score?.total || 0,
            };
          }
        } catch { /* skip */ }
      }
      return kvData;
    });

    // Step 2: AI analysis of skill gaps
    const analysis = await step.do('analyze-gaps', async () => {
      const result = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [
          { role: 'system', content: 'You are an AGI skill evolution planner. Given brain inventories, identify missing capabilities, skill gaps, and propose new skills to synthesize. Return JSON: {"gaps": [...], "proposed_skills": [{"name": "...", "description": "...", "priority": "high|medium|low"}], "evolution_score": 0-100}' },
          { role: 'user', content: `Brain inventories:\n${JSON.stringify(inventory, null, 2)}\nFocus: ${focus}` },
        ],
        max_tokens: 1024,
      });
      try { return JSON.parse(result.response); } catch { return { gaps: [], proposed_skills: [], evolution_score: 50 }; }
    });

    // Step 3: Record evolution cycle
    await step.do('record-evolution', async () => {
      await this.env.DB.prepare(
        `INSERT OR REPLACE INTO entities (id, name, entity_type, summary, source, trust_level, updated_at)
         VALUES (?, ?, 'skill_evolution', ?, 'skill-evolution-workflow', 2, datetime('now'))`
      ).bind(
        `skill-evo-${Date.now()}`,
        `Skill Evolution: ${focus}`,
        JSON.stringify({ gaps: analysis.gaps?.length || 0, proposed: analysis.proposed_skills?.length || 0, score: analysis.evolution_score }).substring(0, 2000)
      ).run();
      return { recorded: true };
    });

    return { focus, inventory, analysis, status: 'completed' };
  }
}
