const { getStore } = require("@netlify/blobs");

const STORE_NAME = "ec-calendar";
const KEY = "events";

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const store = getStore(STORE_NAME);

  // GET — return all events
  if (event.httpMethod === "GET") {
    try {
      const data = await store.get(KEY, { type: "json" });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data || [])
      };
    } catch (e) {
      return { statusCode: 200, headers, body: JSON.stringify([]) };
    }
  }

  // POST — save all events
  if (event.httpMethod === "POST") {
    try {
      const events = JSON.parse(event.body);
      await store.set(KEY, JSON.stringify(events));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, headers, body: "Method not allowed" };
};
