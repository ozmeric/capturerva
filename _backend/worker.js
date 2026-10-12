/**
 * Capture RVA API proxy — Cloudflare Worker (BuildFlow pattern)
 * Hides the Apps Script URL and adds CORS for capturerva.com.
 * Set APPS_SCRIPT_URL below (or as a Worker variable named APPS_SCRIPT_URL).
 */
const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
const ALLOWED_ORIGINS = ["https://capturerva.com", "https://www.capturerva.com"];

export default {
  async fetch(request, env) {
    const target = (env && env.APPS_SCRIPT_URL) || DEFAULT_APPS_SCRIPT_URL;
    const origin = request.headers.get("Origin") || "";
    const allow = ALLOWED_ORIGINS.includes(origin) || origin.startsWith("http://localhost") ? origin : ALLOWED_ORIGINS[0];
    const cors = {
      "Access-Control-Allow-Origin": allow,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    try {
      let response;
      if (request.method === "GET") {
        const q = new URL(request.url).search;
        response = await fetch(target + q, { redirect: "follow" });
      } else if (request.method === "POST") {
        const bodyText = await request.text();
        if (bodyText.length > 20000) return json({ ok: false, error: "Request too large" }, 413, cors);
        response = await fetch(target, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: bodyText,
          redirect: "follow", // CRITICAL for Apps Script
        });
      } else {
        return json({ ok: false, error: "Method not allowed" }, 405, cors);
      }
      const text = await response.text();
      const headers = { "Content-Type": "application/json", ...cors };
      // Availability can be cached briefly at the edge
      if (request.method === "GET") headers["Cache-Control"] = "public, max-age=60";
      return new Response(text, { status: 200, headers });
    } catch (err) {
      return json({ ok: false, error: err.message }, 502, cors);
    }
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...cors } });
}
