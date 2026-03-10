/**
 * YEDAN Graph RAG v1.0 — Knowledge Graph Engine
 *
 * MAGMA-inspired multi-layer knowledge graph on D1 + FTS5
 * Provides structured knowledge retrieval for all Fleet Workers
 *
 * Endpoints:
 *   POST /ingest   — Write entities + relationships (from fleet events)
 *   POST /query    — Search knowledge graph (FTS5 + graph traversal)
 *   GET  /entity/:id — Entity details + 2-hop neighbors
 *   GET  /stats    — Graph statistics
 *   GET  /health   — Health check
 */

const ENTITY_TYPES = [
  'worker', 'agent', 'service', 'database', 'kv_namespace',
  'product', 'cron_job', 'api_key', 'security_issue', 'platform',
  'file', 'process', 'event', 'intel'
];

const RELATION_TYPES = [
  'depends_on', 'monitors', 'calls', 'authenticates_with', 'runs_on',
  'stores_in', 'deployed_to', 'manages', 'uses_model', 'binds_to',
  'processes', 'generates', 'protects', 'routes_to', 'triggered_by',
  'created_from', 'related_to'
];

const LAYERS = ['semantic', 'temporal', 'causal', 'entity'];

export default {
  async scheduled(event, env, ctx) {
    // Auto-consolidate every 6 hours: rebuild communities + clean old events
    ctx.waitUntil((async () => {
      try {
        // Run consolidation logic inline
        const { results: topEntities } = await env.ARMY_DB.prepare(`
          SELECT e.id, e.type, e.name, e.summary,
            (SELECT COUNT(*) FROM kg_relationships WHERE source = e.id OR target = e.id) as connections
          FROM kg_entities e ORDER BY connections DESC LIMIT 20
        `).all();

        const typeGroups = {};
        for (const e of (topEntities || [])) {
          if (!typeGroups[e.type]) typeGroups[e.type] = [];
          typeGroups[e.type].push(e);
        }

        for (const [type, members] of Object.entries(typeGroups)) {
          if (members.length < 2) continue;
          const communityId = `community-${type}-auto`;
          const memberIds = members.map(m => m.id).join(',');
          const summary = `${type} cluster (${members.length}): ${members.map(m => m.name).join(', ').slice(0, 200)}`;
          await env.ARMY_DB.prepare(`
            INSERT OR REPLACE INTO kg_communities (id, level, entity_ids, summary, rank) VALUES (?, 0, ?, ?, ?)
          `).bind(communityId, memberIds, summary, members.length).run();
        }

        // Clean events older than 7 days
        await env.ARMY_DB.prepare(`DELETE FROM kg_entities WHERE type = 'event' AND updated_at < datetime('now', '-7 days')`).run();
      } catch {}
    })());
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    // Auth for mutating endpoints
    const PROTECTED = ['/ingest', '/query', '/bulk-ingest', '/consolidate', '/feedback', '/evolve'];
    if (PROTECTED.includes(url.pathname)) {
      const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
      if (!env.FLEET_AUTH_TOKEN || token !== env.FLEET_AUTH_TOKEN)
        return json({ error: 'Unauthorized' }, 401);
    }

    switch (url.pathname) {
      case '/health':
        return json({ status: 'operational', role: 'graph-rag', version: '2.0.0' });
      case '/stats':
        return await getStats(env);
      case '/ingest':
        if (request.method === 'POST') return await handleIngest(request, env);
        return json({ error: 'POST required' }, 405);
      case '/bulk-ingest':
        if (request.method === 'POST') return await handleBulkIngest(request, env);
        return json({ error: 'POST required' }, 405);
      case '/query':
        if (request.method === 'POST') return await handleQuery(request, env);
        return json({ error: 'POST required' }, 405);
      case '/consolidate':
        if (request.method === 'POST') return await handleConsolidate(request, env);
        return json({ error: 'POST required' }, 405);
      case '/feedback':
        if (request.method === 'POST') return await handleFeedback(request, env);
        return json({ error: 'POST required' }, 405);
      case '/evolve':
        if (request.method === 'POST') return await handleEvolve(request, env);
        return json({ error: 'POST required' }, 405);
      case '/lessons':
        return await getLessons(env);
      case '/recent':
        return await getRecentActivity(env);
      case '/ping':
        return json({ pong: true, brain: 'graph-rag', ts: Date.now() });
      default:
        // /entity/:id pattern
        if (url.pathname.startsWith('/entity/')) {
          const entityId = decodeURIComponent(url.pathname.slice(8));
          return await getEntity(entityId, env);
        }
        return json({ error: 'Not found' }, 404);
    }
  }
};

// === INGEST: Write entities + relationships ===
async function handleIngest(request, env) {
  try {
    const body = await request.json();
    const { entities, relationships, source } = body;
    let entitiesWritten = 0, relsWritten = 0;

    // Upsert entities
    if (entities && Array.isArray(entities)) {
      for (const e of entities) {
        if (!e.id || !e.type || !e.name) continue;
        try {
          await env.ARMY_DB.prepare(`
            INSERT INTO kg_entities (id, type, name, properties, summary)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              properties = json_patch(kg_entities.properties, excluded.properties),
              summary = COALESCE(excluded.summary, kg_entities.summary),
              updated_at = datetime('now')
          `).bind(
            e.id,
            e.type,
            e.name,
            JSON.stringify(e.properties || {}),
            e.summary || null
          ).run();
          entitiesWritten++;

          // Update FTS index
          await rebuildFtsForEntity(env, e.id);
        } catch {}
      }
    }

    // Upsert relationships
    if (relationships && Array.isArray(relationships)) {
      for (const r of relationships) {
        if (!r.source || !r.target || !r.type) continue;
        try {
          await env.ARMY_DB.prepare(`
            INSERT INTO kg_relationships (source, target, type, properties, weight, layer)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(source, target, type) DO UPDATE SET
              properties = json_patch(kg_relationships.properties, excluded.properties),
              weight = excluded.weight,
              created_at = datetime('now')
          `).bind(
            r.source, r.target, r.type,
            JSON.stringify(r.properties || {}),
            r.weight || 1.0,
            r.layer || 'semantic'
          ).run();
          relsWritten++;
        } catch {}
      }
    }

    return json({ ok: true, entities_written: entitiesWritten, relationships_written: relsWritten, source: source || 'unknown' });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// === BULK INGEST: Import from brain.jsonl format ===
async function handleBulkIngest(request, env) {
  try {
    const body = await request.json();
    const { lines } = body; // Array of JSONL objects
    let entities = 0, relations = 0, errors = 0;

    const batch = [];
    for (const line of (lines || [])) {
      if (line.type === 'entity') {
        const id = line.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        batch.push(
          env.ARMY_DB.prepare(`
            INSERT OR REPLACE INTO kg_entities (id, type, name, properties, summary)
            VALUES (?, ?, ?, ?, ?)
          `).bind(id, line.entityType, line.name, JSON.stringify({ observations: line.observations || [] }), (line.observations || []).slice(0, 3).join('. '))
        );
        entities++;
      } else if (line.type === 'relation') {
        const srcId = line.from.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const tgtId = line.to.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        batch.push(
          env.ARMY_DB.prepare(`
            INSERT OR IGNORE INTO kg_relationships (source, target, type, layer)
            VALUES (?, ?, ?, 'semantic')
          `).bind(srcId, tgtId, line.relationType)
        );
        relations++;
      }
    }

    // D1 batch limit is 128
    for (let i = 0; i < batch.length; i += 100) {
      try {
        await env.ARMY_DB.batch(batch.slice(i, i + 100));
      } catch (e) { errors++; }
    }

    // Rebuild FTS
    try {
      await env.ARMY_DB.exec(`INSERT INTO kg_entities_fts(kg_entities_fts) VALUES('rebuild')`);
    } catch {}

    return json({ ok: true, entities, relations, errors, batches: Math.ceil(batch.length / 100) });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// === QUERY: FTS5 + Graph Traversal ===
async function handleQuery(request, env) {
  try {
    const body = await request.json();
    const { query, max_hops, limit, intent } = body;

    if (!query) return json({ error: 'query required' }, 400);

    const maxHops = Math.min(max_hops || 2, 3);
    const maxResults = Math.min(limit || 20, 50);

    // Phase 1: FTS5 BM25 keyword search
    const ftsQuery = query.replace(/['"]/g, '').split(/\s+/).filter(w => w.length > 2).join(' OR ');
    let seedEntities = [];
    if (ftsQuery) {
      try {
        const { results } = await env.ARMY_DB.prepare(`
          SELECT e.id, e.type, e.name, e.summary, e.properties,
                 bm25(kg_entities_fts) as relevance
          FROM kg_entities_fts fts
          JOIN kg_entities e ON e.rowid = fts.rowid
          WHERE kg_entities_fts MATCH ?
          ORDER BY relevance
          LIMIT ?
        `).bind(ftsQuery, maxResults).all();
        seedEntities = results || [];
      } catch {
        // FTS may fail on certain queries, fall back to LIKE
        const { results } = await env.ARMY_DB.prepare(`
          SELECT id, type, name, summary, properties, 0 as relevance
          FROM kg_entities
          WHERE name LIKE ? OR summary LIKE ? OR properties LIKE ?
          ORDER BY updated_at DESC LIMIT ?
        `).bind(`%${query}%`, `%${query}%`, `%${query}%`, maxResults).all();
        seedEntities = results || [];
      }
    }

    if (seedEntities.length === 0) {
      return json({ query, results: [], message: 'No matching entities found', context: '' });
    }

    // Phase 2: Graph traversal — expand N-hop neighbors
    const seedIds = seedEntities.map(e => e.id);
    let neighbors = [];
    if (maxHops > 0 && seedIds.length > 0) {
      const placeholders = seedIds.map(() => '?').join(',');
      try {
        const { results } = await env.ARMY_DB.prepare(`
          WITH RECURSIVE graph_walk(id, depth, path) AS (
            SELECT id, 0, id FROM kg_entities WHERE id IN (${placeholders})
            UNION
            SELECT
              CASE WHEN r.source = g.id THEN r.target ELSE r.source END,
              g.depth + 1,
              g.path || ',' || CASE WHEN r.source = g.id THEN r.target ELSE r.source END
            FROM graph_walk g
            JOIN kg_relationships r ON (r.source = g.id OR r.target = g.id)
            WHERE g.depth < ${maxHops}
              AND g.path NOT LIKE '%' || CASE WHEN r.source = g.id THEN r.target ELSE r.source END || '%'
          )
          SELECT DISTINCT e.id, e.type, e.name, e.summary, e.properties, gw.depth
          FROM graph_walk gw
          JOIN kg_entities e ON e.id = gw.id
          WHERE gw.depth > 0
          ORDER BY gw.depth ASC
          LIMIT ?
        `).bind(...seedIds, maxResults * 2).all();
        neighbors = results || [];
      } catch {}
    }

    // Phase 3: Get relationships between all found entities
    const allIds = [...new Set([...seedIds, ...neighbors.map(n => n.id)])];
    let relationships = [];
    if (allIds.length > 0 && allIds.length <= 100) {
      const ph = allIds.map(() => '?').join(',');
      try {
        const { results } = await env.ARMY_DB.prepare(`
          SELECT source, target, type, layer, weight
          FROM kg_relationships
          WHERE source IN (${ph}) OR target IN (${ph})
          LIMIT 200
        `).bind(...allIds, ...allIds).all();
        relationships = results || [];
      } catch {}
    }

    // Phase 4: Assemble structured context
    const context = assembleContext(seedEntities, neighbors, relationships, query);

    return json({
      query,
      intent: intent || 'general',
      seed_entities: seedEntities.length,
      neighbor_entities: neighbors.length,
      relationships: relationships.length,
      results: seedEntities,
      neighbors: neighbors.slice(0, maxResults),
      edges: relationships,
      context
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// === Assemble human-readable context from graph results ===
function assembleContext(seeds, neighbors, rels, query) {
  const lines = [`Knowledge Graph Context for: "${query}"\n`];

  // Seed entities
  lines.push('## Direct Matches');
  for (const e of seeds.slice(0, 10)) {
    const props = safeJsonParse(e.properties);
    const obs = props.observations ? props.observations.slice(0, 5).join('; ') : '';
    lines.push(`- **${e.name}** (${e.type}): ${e.summary || obs || 'No summary'}`);
  }

  // Relationships
  if (rels.length > 0) {
    lines.push('\n## Relationships');
    for (const r of rels.slice(0, 20)) {
      lines.push(`- ${r.source} --[${r.type}]--> ${r.target} (${r.layer}, weight: ${r.weight})`);
    }
  }

  // Neighbors
  if (neighbors.length > 0) {
    lines.push('\n## Related Entities');
    for (const n of neighbors.slice(0, 10)) {
      lines.push(`- ${n.name} (${n.type}, depth: ${n.depth}): ${n.summary || ''}`);
    }
  }

  return lines.join('\n');
}

// === GET /entity/:id ===
async function getEntity(entityId, env) {
  try {
    const entity = await env.ARMY_DB.prepare(
      `SELECT * FROM kg_entities WHERE id = ?`
    ).bind(entityId).first();

    if (!entity) return json({ error: 'Entity not found' }, 404);

    // Get all relationships (in + out)
    const { results: outRels } = await env.ARMY_DB.prepare(
      `SELECT r.*, e.name as target_name, e.type as target_type
       FROM kg_relationships r
       JOIN kg_entities e ON e.id = r.target
       WHERE r.source = ?`
    ).bind(entityId).all();

    const { results: inRels } = await env.ARMY_DB.prepare(
      `SELECT r.*, e.name as source_name, e.type as source_type
       FROM kg_relationships r
       JOIN kg_entities e ON e.id = r.source
       WHERE r.target = ?`
    ).bind(entityId).all();

    return json({
      entity,
      outgoing_relations: outRels || [],
      incoming_relations: inRels || [],
      total_connections: (outRels?.length || 0) + (inRels?.length || 0)
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// === GET /stats ===
async function getStats(env) {
  try {
    const entityCount = await env.ARMY_DB.prepare(`SELECT COUNT(*) as count FROM kg_entities`).first();
    const relCount = await env.ARMY_DB.prepare(`SELECT COUNT(*) as count FROM kg_relationships`).first();
    const communityCount = await env.ARMY_DB.prepare(`SELECT COUNT(*) as count FROM kg_communities`).first();

    const { results: typeBreakdown } = await env.ARMY_DB.prepare(
      `SELECT type, COUNT(*) as count FROM kg_entities GROUP BY type ORDER BY count DESC`
    ).all();

    const { results: relBreakdown } = await env.ARMY_DB.prepare(
      `SELECT type, COUNT(*) as count FROM kg_relationships GROUP BY type ORDER BY count DESC`
    ).all();

    const { results: layerBreakdown } = await env.ARMY_DB.prepare(
      `SELECT layer, COUNT(*) as count FROM kg_relationships GROUP BY layer ORDER BY count DESC`
    ).all();

    return json({
      graph: {
        entities: entityCount?.count || 0,
        relationships: relCount?.count || 0,
        communities: communityCount?.count || 0
      },
      entity_types: typeBreakdown || [],
      relationship_types: relBreakdown || [],
      relationship_layers: layerBreakdown || [],
      version: '2.0.0',
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// === CONSOLIDATE: Community detection + pattern extraction ===
async function handleConsolidate(request, env) {
  try {
    // Find clusters of highly-connected entities
    const { results: topEntities } = await env.ARMY_DB.prepare(`
      SELECT e.id, e.type, e.name, e.summary,
        (SELECT COUNT(*) FROM kg_relationships WHERE source = e.id OR target = e.id) as connections
      FROM kg_entities e
      ORDER BY connections DESC
      LIMIT 20
    `).all();

    // Group by type to form communities
    const typeGroups = {};
    for (const e of (topEntities || [])) {
      if (!typeGroups[e.type]) typeGroups[e.type] = [];
      typeGroups[e.type].push(e);
    }

    let communitiesCreated = 0;
    for (const [type, members] of Object.entries(typeGroups)) {
      if (members.length < 2) continue;
      const communityId = `community-${type}-${Date.now()}`;
      const memberNames = members.map(m => m.name).join(', ');
      const summary = `${type} cluster (${members.length} entities): ${memberNames.slice(0, 200)}`;

      const memberIds = members.map(m => m.id).join(',');
      await env.ARMY_DB.prepare(`
        INSERT OR REPLACE INTO kg_communities (id, level, entity_ids, summary, rank)
        VALUES (?, 0, ?, ?, ?)
      `).bind(communityId, memberIds, summary, members.length).run();
      communitiesCreated++;
    }

    // Clean up old events (keep last 7 days of temporal events)
    let cleaned = 0;
    try {
      const { changes } = await env.ARMY_DB.prepare(`
        DELETE FROM kg_entities WHERE type = 'event' AND updated_at < datetime('now', '-7 days')
      `).run();
      cleaned = changes || 0;
    } catch {}

    return json({ ok: true, communities_created: communitiesCreated, old_events_cleaned: cleaned, top_entities: topEntities?.length || 0 });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// === FEEDBACK: Self-evolving feedback loop ===
async function handleFeedback(request, env) {
  try {
    const { entity_id, feedback_type, outcome, score } = await request.json();
    if (!entity_id) return json({ error: 'entity_id required' }, 400);

    // Update entity with feedback
    const entity = await env.ARMY_DB.prepare(`SELECT * FROM kg_entities WHERE id = ?`).bind(entity_id).first();
    if (!entity) return json({ error: 'Entity not found' }, 404);

    const props = safeJsonParse(entity.properties);
    if (!props.feedback) props.feedback = [];
    props.feedback.push({
      type: feedback_type || 'outcome',
      outcome: outcome || 'unknown',
      score: score || 0,
      timestamp: new Date().toISOString()
    });

    // Adjust relationship weights based on feedback
    if (score && score !== 0) {
      const weightDelta = score > 0 ? 0.1 : -0.1;
      await env.ARMY_DB.prepare(`
        UPDATE kg_relationships SET weight = MAX(0.1, MIN(5.0, weight + ?))
        WHERE source = ? OR target = ?
      `).bind(weightDelta, entity_id, entity_id).run();
    }

    await env.ARMY_DB.prepare(`
      UPDATE kg_entities SET properties = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(JSON.stringify(props), entity_id).run();

    await rebuildFtsForEntity(env, entity_id);

    return json({ ok: true, entity_id, feedback_count: props.feedback.length });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// === RECENT: Activity feed with temporal weighting ===
async function getRecentActivity(env) {
  try {
    const { results: recent } = await env.ARMY_DB.prepare(`
      SELECT id, type, name, summary, updated_at,
        ROUND(1.0 / (1.0 + (julianday('now') - julianday(updated_at))), 3) as recency_score
      FROM kg_entities
      WHERE type = 'event'
      ORDER BY updated_at DESC
      LIMIT 30
    `).all();

    const { results: layerStats } = await env.ARMY_DB.prepare(`
      SELECT layer, COUNT(*) as count, AVG(weight) as avg_weight
      FROM kg_relationships
      GROUP BY layer
    `).all();

    return json({
      recent_events: recent || [],
      layer_distribution: layerStats || [],
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// === EVOLVE: Self-improving agent lesson recording ===
async function handleEvolve(request, env) {
  try {
    const { agent_id, situation, action_taken, outcome, score } = await request.json();
    if (!agent_id || !situation) return json({ error: 'agent_id and situation required' }, 400);

    // Store lesson
    await env.ARMY_DB.prepare(`
      INSERT INTO agent_lessons (agent_id, situation, action_taken, outcome, score)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      agent_id,
      situation.slice(0, 500),
      (action_taken || '').slice(0, 500),
      (outcome || '').slice(0, 500),
      score || 0
    ).run();

    // Also write as entity to knowledge graph for cross-agent learning
    const lessonId = `lesson-${agent_id}-${Date.now()}`;
    await env.ARMY_DB.prepare(`
      INSERT OR REPLACE INTO kg_entities (id, type, name, properties, summary)
      VALUES (?, 'event', ?, ?, ?)
    `).bind(
      lessonId,
      `Lesson: ${situation.slice(0, 50)}`,
      JSON.stringify({ agent_id, action_taken, outcome, score }),
      `${agent_id}: ${situation.slice(0, 100)} → ${outcome?.slice(0, 100) || 'unknown'}`
    ).run();

    // Link lesson to agent
    await env.ARMY_DB.prepare(`
      INSERT OR IGNORE INTO kg_relationships (source, target, type, layer, weight)
      VALUES (?, ?, 'generates', 'causal', ?)
    `).bind(agent_id, lessonId, Math.max(0.1, Math.min(5.0, 1.0 + (score || 0) * 0.2))).run();

    return json({ ok: true, lesson_id: lessonId, agent_id });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// === LESSONS: Retrieve agent lessons for context ===
async function getLessons(env) {
  try {
    const { results: byAgent } = await env.ARMY_DB.prepare(`
      SELECT agent_id, COUNT(*) as count, AVG(score) as avg_score,
        SUM(CASE WHEN score > 0 THEN 1 ELSE 0 END) as successes,
        SUM(CASE WHEN score < 0 THEN 1 ELSE 0 END) as failures
      FROM agent_lessons
      GROUP BY agent_id ORDER BY count DESC
    `).all();

    const { results: recent } = await env.ARMY_DB.prepare(`
      SELECT agent_id, situation, action_taken, outcome, score, created_at
      FROM agent_lessons ORDER BY created_at DESC LIMIT 20
    `).all();

    return json({ by_agent: byAgent || [], recent: recent || [] });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// === Helpers ===
async function rebuildFtsForEntity(env, entityId) {
  try {
    const entity = await env.ARMY_DB.prepare(`SELECT rowid, * FROM kg_entities WHERE id = ?`).bind(entityId).first();
    if (!entity) return;
    await env.ARMY_DB.prepare(`INSERT OR REPLACE INTO kg_entities_fts(rowid, name, type, summary, properties) VALUES (?, ?, ?, ?, ?)`)
      .bind(entity.rowid, entity.name, entity.type, entity.summary || '', entity.properties || '{}').run();
  } catch {}
}

function safeJsonParse(str) {
  try { return JSON.parse(str || '{}'); } catch { return {}; }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Cache-Control': 'no-store'
    }
  });
}
