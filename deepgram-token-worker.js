/**
 * Cloudflare Worker — Proxy de tokens efímeros para Deepgram
 * ----------------------------------------------------------
 * Objetivo: NO exponer tu API key de Deepgram en el JS público de GitHub Pages.
 * El navegador pide a este Worker un token temporal (TTL corto). El Worker usa
 * tu API key REAL (guardada como secret, nunca en el cliente) para pedir ese
 * token a Deepgram (/v1/auth/grant) y se lo devuelve al navegador. El navegador
 * abre el WebSocket de Deepgram con ese token; si se filtra, caduca en segundos.
 *
 * ── DESPLIEGUE (2 minutos, sin instalar nada) ─────────────────────────────
 * 1. Entra a https://dash.cloudflare.com  →  Workers & Pages  →  Create → Worker.
 * 2. Ponle un nombre (ej. "deepgram-token"), Deploy, luego "Edit code".
 * 3. Borra el código de ejemplo y pega TODO este archivo. Deploy.
 * 4. Ve a Settings → Variables and Secrets → Add:
 *      - Type: Secret   Name: DEEPGRAM_API_KEY   Value: (tu API key de Deepgram)
 *    Guarda y vuelve a Deploy.
 * 5. Copia la URL del Worker (ej. https://deepgram-token.TUUSUARIO.workers.dev)
 *    y pégala en la app: Configuración → "URL del proxy Deepgram".
 * ──────────────────────────────────────────────────────────────────────────
 */

// Orígenes autorizados a pedir tokens (tu GitHub Pages + local para pruebas).
const ALLOWED_ORIGINS = [
  "https://drgtinformes.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:8000",
];

// Duración del token temporal en segundos (30 = por defecto de Deepgram; 60 da margen).
const TTL_SECONDS = 60;

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin);

    // Preflight CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "GET" && request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers });
    }

    if (!env.DEEPGRAM_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Falta el secret DEEPGRAM_API_KEY en el Worker." }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    try {
      // Pide a Deepgram un token efímero usando la API key real (que vive solo aquí).
      const dgResp = await fetch("https://api.deepgram.com/v1/auth/grant", {
        method: "POST",
        headers: {
          "Authorization": `Token ${env.DEEPGRAM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl_seconds: TTL_SECONDS }),
      });

      if (!dgResp.ok) {
        const detail = await dgResp.text();
        return new Response(
          JSON.stringify({ error: "Deepgram grant failed", status: dgResp.status, detail }),
          { status: 502, headers: { ...headers, "Content-Type": "application/json" } }
        );
      }

      const data = await dgResp.json(); // { access_token, expires_in }
      return new Response(
        JSON.stringify({ access_token: data.access_token, expires_in: data.expires_in }),
        {
          status: 200,
          headers: {
            ...headers,
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Worker exception", detail: String(err) }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }
  },
};
