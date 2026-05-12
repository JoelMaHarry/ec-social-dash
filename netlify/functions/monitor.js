import { getStore } from "@netlify/blobs";

const STORE_NAME = "ec-monitor";
const KEY = "monitor";
const MAX_BRIEFS = 7;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

async function loadState(store) {
  const state = await store.get(KEY, { type: "json" });
  return {
    lastSeenState: (state && state.lastSeenState) || {},
    briefs: (state && state.briefs) || []
  };
}

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("", { status: 200, headers: corsHeaders });
  }

  const store = getStore(STORE_NAME);

  if (req.method === "GET") {
    try {
      const state = await loadState(store);
      return new Response(JSON.stringify(state), { status: 200, headers: corsHeaders });
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
      const state = await loadState(store);

      if (body.type === "brief") {
        const brief = body.data;
        if (!brief || !brief.markdown || !brief.createdAt) {
          return new Response(
            JSON.stringify({ error: "brief.data requires markdown and createdAt" }),
            { status: 400, headers: corsHeaders }
          );
        }
        const sourceIds = Array.isArray(body.sourceIds) ? body.sourceIds : [];

        state.briefs = [brief, ...state.briefs].slice(0, MAX_BRIEFS);
        sourceIds.forEach(function(id) { state.lastSeenState[id] = brief.createdAt; });

        await store.setJSON(KEY, state);
        return new Response(
          JSON.stringify({ ok: true, briefsStored: state.briefs.length }),
          { status: 200, headers: corsHeaders }
        );
      }

      if (body.type === "lastSeen") {
        state.lastSeenState = body.data || {};
        await store.setJSON(KEY, state);
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
      }

      return new Response(
        JSON.stringify({ error: "Unknown type" }),
        { status: 400, headers: corsHeaders }
      );
    } catch (e) {
      console.error("Monitor POST error:", e);
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
};
