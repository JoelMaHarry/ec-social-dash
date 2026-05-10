import { getStore } from "@netlify/blobs";

const STORE_NAME = "ec-monitor";
const BRIEFS_KEY = "briefs";
const LAST_SEEN_KEY = "lastSeenState";
const MAX_BRIEFS = 7;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("", { status: 200, headers: corsHeaders });
  }

  const store = getStore(STORE_NAME);

  if (req.method === "GET") {
    try {
      const [lastSeenState, briefs] = await Promise.all([
        store.get(LAST_SEEN_KEY, { type: "json" }),
        store.get(BRIEFS_KEY, { type: "json" })
      ]);
      return new Response(
        JSON.stringify({ lastSeenState: lastSeenState || {}, briefs: briefs || [] }),
        { status: 200, headers: corsHeaders }
      );
    } catch (e) {
      console.error("Monitor GET error:", e);
      return new Response(
        JSON.stringify({ lastSeenState: {}, briefs: [] }),
        { status: 200, headers: corsHeaders }
      );
    }
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();

      if (body.type === "brief") {
        const brief = body.data;
        brief.submittedAt = new Date().toISOString();

        const existing = await store.get(BRIEFS_KEY, { type: "json" }) || [];
        const updated = [brief, ...existing].slice(0, MAX_BRIEFS);
        await store.setJSON(BRIEFS_KEY, updated);

        // Update lastSeenState for accounts that had activity
        const lastSeen = await store.get(LAST_SEEN_KEY, { type: "json" }) || {};
        [...(brief.flagged || []), ...(brief.newPosts || [])].forEach(function(p) {
          lastSeen[p.accountId] = brief.scanDate;
        });
        await store.setJSON(LAST_SEEN_KEY, lastSeen);

        return new Response(
          JSON.stringify({ ok: true, briefsStored: updated.length }),
          { status: 200, headers: corsHeaders }
        );
      }

      if (body.type === "lastSeen") {
        await store.setJSON(LAST_SEEN_KEY, body.data);
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ error: "Unknown type" }), { status: 400, headers: corsHeaders });
    } catch (e) {
      console.error("Monitor POST error:", e);
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
};
