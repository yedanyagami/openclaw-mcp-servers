// ============================================================
// OpenClaw Task Processor — Queue Consumer Worker
// Processes tasks from openclaw-task-queue with retry + logging
// Routes to Workers via Service Bindings (zero-overhead)
// ============================================================

const SERVICE_MAP = {
  'orchestrator': 'ORCHESTRATOR',
  'cloud-executor': 'CLOUD_EXECUTOR',
  'intel-ops': 'INTEL_OPS',
  'graph-rag': 'GRAPH_RAG',
  'zilliz-bridge': 'ZILLIZ_BRIDGE',
  'fleet-gateway': 'FLEET_GATEWAY',
};

async function processTask(env, message) {
  const { type, target, payload, priority, created } = message.body;
  const startTime = Date.now();

  if (type !== 'dispatch' || !target) {
    return { ok: false, error: 'Invalid task: missing type or target' };
  }

  // Route via Service Binding if available
  const bindingName = SERVICE_MAP[target];
  if (bindingName && env[bindingName]) {
    try {
      const resp = await env[bindingName].fetch(new Request('http://internal/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }));
      const data = await resp.text();
      return {
        ok: resp.ok,
        target,
        status: resp.status,
        via: 'service-binding',
        latency_ms: Date.now() - startTime,
        result: data.substring(0, 1000),
      };
    } catch (e) {
      return { ok: false, target, error: e.message, via: 'service-binding', latency_ms: Date.now() - startTime };
    }
  }

  // HTTP fallback for unbound Workers
  try {
    const url = `https://${target}.yagami8095.workers.dev/run`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });
    const data = await resp.text();
    return {
      ok: resp.ok,
      target,
      status: resp.status,
      via: 'http',
      latency_ms: Date.now() - startTime,
      result: data.substring(0, 1000),
    };
  } catch (e) {
    return { ok: false, target, error: e.message, via: 'http', latency_ms: Date.now() - startTime };
  }
}

export default {
  // Queue consumer — processes batches of tasks
  async queue(batch, env) {
    const results = [];

    for (const message of batch.messages) {
      try {
        const result = await processTask(env, message);
        results.push(result);

        // Log to D1
        try {
          await env.DB.prepare(
            `INSERT OR REPLACE INTO fleet_tasks (id, action, target, status, result, priority, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
          ).bind(
            message.id,
            message.body.type || 'dispatch',
            message.body.target || 'unknown',
            result.ok ? 'completed' : 'failed',
            JSON.stringify(result).substring(0, 5000),
            message.body.priority || 'normal',
          ).run();
        } catch (e) {
          // D1 logging is best-effort
          console.error(`[TaskProcessor] D1 log error: ${e.message}`);
        }

        if (result.ok) {
          message.ack();
        } else {
          message.retry();
        }
      } catch (e) {
        console.error(`[TaskProcessor] Error processing message ${message.id}: ${e.message}`);
        message.retry();
      }
    }

    console.log(`[TaskProcessor] Batch processed: ${results.filter(r => r.ok).length}/${results.length} succeeded`);
  },

  // Health endpoint
  async fetch(request, env) {
    return new Response(JSON.stringify({
      service: 'openclaw-task-processor',
      status: 'ok',
      queue: 'openclaw-task-queue',
      bindings: Object.keys(SERVICE_MAP),
      timestamp: new Date().toISOString(),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
