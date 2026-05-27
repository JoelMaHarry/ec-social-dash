import { getStore } from '@netlify/blobs';

// ──────────────────────────────────────────────────────────────────────────
// EC Dashboard — ingestion store (Phase 1)
// One Netlify Function, five collections, persisted in Netlify Blobs.
// The dashboard reads and writes ONLY through this endpoint:
//   /.netlify/functions/scan-store
//
// Collections: monitored_accounts | discovered_posts | published_posts
//              analytics_metrics | engagement_history
//
// GET    ?type=health                         → confirms Blobs is configured
// GET    ?type=<collection>[&filters]         → returns the collection
// POST   { type, record }  | { type, records }→ append / upsert (by id)
// PATCH  { type, id, fields }                 → merge fields into one record
//
// Storage model (Phase 1): one JSON array per collection, last-write-wins.
// Low write volume, so this is intentionally simple. analytics_metrics and
// engagement_history are the Phase 2 candidates to move to Supabase.
// ──────────────────────────────────────────────────────────────────────────

const COLLECTIONS = new Set([
  'monitored_accounts',
  'discovered_posts',
  'published_posts',
  'analytics_metrics',
  'engagement_history',
]);

const ID_PREFIX = {
  discovered_posts: 'post',
  published_posts: 'pub',
  analytics_metrics: 'metric',
  engagement_history: 'eng',
  monitored_accounts: 'acct',
};

function store() {
  // Strong consistency so a captured candidate is readable immediately after save.
  return getStore({ name: 'ec-dashboard', consistency: 'strong' });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

async function readColl(key) {
  const data = await store().get(key, { type: 'json' });
  return Array.isArray(data) ? data : [];
}

async function writeColl(key, arr) {
  await store().setJSON(key, arr);
}

function makeId(type) {
  const p = ID_PREFIX[type] || 'rec';
  return p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default async (req) => {
  try {
    const url = new URL(req.url);
    const method = req.method.toUpperCase();
    const type = url.searchParams.get('type');

    // Health check — writes then reads a probe key to prove Blobs is live.
    if (type === 'health') {
      const s = store();
      await s.setJSON('__health', { at: new Date().toISOString() });
      const back = await s.get('__health', { type: 'json' });
      return json({ ok: true, blobs: back ? 'ok' : 'unconfirmed', collections: [...COLLECTIONS] });
    }

    if (method === 'GET') {
      if (!COLLECTIONS.has(type)) return json({ error: 'unknown type' }, 400);
      let rows = await readColl(type);

      if (type === 'discovered_posts') {
        const date = url.searchParams.get('date');
        if (date) rows = rows.filter(r => (r.capturedAt || '').slice(0, 10) === date);
      }
      if (type === 'engagement_history') {
        const subjectId = url.searchParams.get('subjectId');
        if (subjectId) rows = rows.filter(r => r.subjectId === subjectId);
      }
      if (type === 'analytics_metrics') {
        const from = url.searchParams.get('from');
        const to = url.searchParams.get('to');
        if (from) rows = rows.filter(r => (r.periodEnd || '') >= from);
        if (to) rows = rows.filter(r => (r.periodStart || '') <= to);
      }
      return json({ type, count: rows.length, records: rows });
    }

    if (method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const t = body.type;
      if (!COLLECTIONS.has(t)) return json({ error: 'unknown type' }, 400);

      const incoming = Array.isArray(body.records)
        ? body.records
        : (body.record ? [body.record] : []);
      if (!incoming.length) return json({ error: 'no record(s) provided' }, 400);

      const now = new Date().toISOString();
      const added = incoming.map(r => ({
        ...r,
        id: r.id || makeId(t),
        capturedAt: r.capturedAt || now,
        _storedAt: now,
      }));

      const rows = await readColl(t);
      const byId = new Map(rows.map(r => [r.id, r]));
      added.forEach(r => byId.set(r.id, { ...byId.get(r.id), ...r }));
      const next = [...byId.values()];
      await writeColl(t, next);
      return json({ type: t, added: added.length, total: next.length, records: added });
    }

    if (method === 'PATCH') {
      const body = await req.json().catch(() => ({}));
      const t = body.type;
      if (!COLLECTIONS.has(t)) return json({ error: 'unknown type' }, 400);
      if (!body.id) return json({ error: 'id required' }, 400);

      const rows = await readColl(t);
      const i = rows.findIndex(r => r.id === body.id);
      if (i === -1) return json({ error: 'not found' }, 404);
      rows[i] = { ...rows[i], ...(body.fields || {}), _updatedAt: new Date().toISOString() };
      await writeColl(t, rows);
      return json({ type: t, record: rows[i] });
    }

    if (method === 'DELETE') {
      // Phase 1 keeps a record; mark status "dropped" via PATCH instead of hard delete.
      return json({ error: 'delete disabled; PATCH status to "dropped" instead' }, 405);
    }

    return json({ error: 'method not allowed' }, 405);
  } catch (e) {
    return json({ error: 'scan-store failure', detail: String((e && e.message) || e) }, 500);
  }
};
