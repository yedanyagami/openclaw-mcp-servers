// ============================================================
// ResearchWorkflow — Deep Research Pipeline
// Steps: Query → Search → Synthesize → Store
// ============================================================

import { WorkflowEntrypoint } from 'cloudflare:workers';

export class ResearchWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const topic = event.payload.topic || 'general research';

    // Step 1: Query existing knowledge
    const existing = await step.do('query-knowledge', async () => {
      try {
        const resp = await this.env.GRAPH_RAG.fetch(
          new Request('http://internal/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: topic, limit: 10 }),
          })
        );
        const data = await resp.json();
        return { count: (data.results || []).length, context: (data.results || []).slice(0, 5).map(r => r.summary || r.name).join('\n') };
      } catch (e) {
        return { count: 0, context: '', error: e.message };
      }
    });

    // Step 2: AI-powered deep analysis
    const analysis = await step.do('analyze', async () => {
      const result = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [
          { role: 'system', content: 'You are a research analyst. Analyze the topic thoroughly. Identify gaps, connections, and actionable insights. Return JSON: {"findings": [...], "gaps": [...], "recommendations": [...]}' },
          { role: 'user', content: `Topic: ${topic}\nExisting knowledge (${existing.count} items):\n${existing.context || 'No prior knowledge'}` },
        ],
        max_tokens: 1024,
      });
      try { return JSON.parse(result.response); } catch { return { findings: [result.response], gaps: [], recommendations: [] }; }
    });

    // Step 3: Store research results
    await step.do('store-results', async () => {
      await this.env.FLEET_GATEWAY.fetch(
        new Request('http://internal/v1/memory/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.env.FLEET_GATEWAY_TOKEN || ''}` },
          body: JSON.stringify({
            items: [{
              id: `research-${Date.now()}`,
              name: `Research: ${topic.substring(0, 60)}`,
              type: 'research',
              summary: JSON.stringify(analysis).substring(0, 2000),
            }],
          }),
        })
      );
      return { stored: true };
    });

    return { topic, existing_knowledge: existing.count, analysis, status: 'completed' };
  }
}
