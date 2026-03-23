// ============================================================
// SecurityAuditWorkflow — OWASP-based Security Scan Pipeline
// Steps: Scan → Analyze → Report → Alert
// ============================================================

import { WorkflowEntrypoint } from 'cloudflare:workers';

export class SecurityAuditWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const target = event.payload.target || 'fleet';
    const scope = event.payload.scope || 'full';

    // Step 1: Scan fleet endpoints
    const scanResults = await step.do('scan-endpoints', async () => {
      const endpoints = [
        'fleet-gateway', 'yedan-orchestrator', 'yedan-cloud-executor',
        'yedan-intel-ops', 'yedan-health-commander', 'yedan-graph-rag',
        'openclaw-do', 'openclaw-workflows', 'openclaw-task-processor',
      ];

      const results = [];
      for (const ep of endpoints) {
        try {
          const resp = await fetch(`https://${ep}.yagami8095.workers.dev/health`, {
            signal: AbortSignal.timeout(5000),
          });
          const headers = {};
          for (const [k, v] of resp.headers.entries()) headers[k] = v;

          results.push({
            worker: ep,
            status: resp.status,
            has_cors: !!headers['access-control-allow-origin'],
            has_csp: !!headers['content-security-policy'],
            server: headers['server'] || 'cloudflare',
          });
        } catch (e) {
          results.push({ worker: ep, status: 0, error: e.message });
        }
      }
      return results;
    });

    // Step 2: AI-powered security analysis
    const analysis = await step.do('analyze-security', async () => {
      const result = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [
          { role: 'system', content: 'You are an OWASP security auditor for AI agent systems. Analyze these scan results against OWASP Agentic AI Top 10 (ASI01-ASI10). Return JSON: {"risk_level": "low|medium|high|critical", "findings": [{"id": "ASI0X", "title": "...", "status": "pass|fail|warn", "detail": "..."}], "recommendations": [...]}' },
          { role: 'user', content: `Scan results for ${target}:\n${JSON.stringify(scanResults, null, 2)}` },
        ],
        max_tokens: 1024,
      });
      try { return JSON.parse(result.response); } catch { return { risk_level: 'unknown', findings: [{ detail: result.response }], recommendations: [] }; }
    });

    // Step 3: Store audit report
    await step.do('store-report', async () => {
      await this.env.DB.prepare(
        `INSERT OR REPLACE INTO entities (id, name, entity_type, summary, source, trust_level, updated_at)
         VALUES (?, ?, 'security_audit', ?, 'security-audit-workflow', 3, datetime('now'))`
      ).bind(
        `audit-${Date.now()}`,
        `Security Audit: ${target}`,
        JSON.stringify({ risk: analysis.risk_level, findings: analysis.findings?.length || 0, scanned: scanResults.length }).substring(0, 2000)
      ).run();
      return { stored: true };
    });

    return { target, scanned: scanResults.length, risk_level: analysis.risk_level, findings: analysis.findings, recommendations: analysis.recommendations, status: 'completed' };
  }
}
