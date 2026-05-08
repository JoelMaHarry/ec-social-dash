import { getStore } from "@netlify/blobs";

const STORE_NAME = "ec-calendar";
const KEY = "events";

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
      const data = await store.get(KEY, { type: "json" });
      return new Response(JSON.stringify(data || []), { status: 200, headers: corsHeaders });
    } catch (e) {
      console.error("Calendar GET error:", e);
      return new Response(JSON.stringify([]), { status: 200, headers: corsHeaders });
    }
  }

  if (req.method === "POST") {
    try {
      const events = await req.json();
      await store.setJSON(KEY, events);
      return new Response(
        JSON.stringify({ ok: true, count: Array.isArray(events) ? events.length : null }),
        { status: 200, headers: corsHeaders }
      );
    } catch (e) {
      console.error("Calendar POST error:", e);
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
};
