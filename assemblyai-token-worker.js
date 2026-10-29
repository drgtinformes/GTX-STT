/**
 * Cloudflare Worker — Proxy de tokens temporales para AssemblyAI (Streaming v3)
 * ----------------------------------------------------------------------------
 * Igual que los de Deepgram, Soniox y Speechmatics: el navegador pide a este Worker
 * un token temporal de un solo uso sin exponer nunca tu API key real, que vive solo
 * aquí como secret. El navegador abre el WebSocket de AssemblyAI con ese token en la
 * URL (?token=...), que es la forma que exige AssemblyAI para conectarse desde el
 * navegador (no se pueden mandar headers en un WebSocket).
 *
 * ── DESPLIEGUE (2 minutos, sin instalar nada) ─────────────────────────────
 * 1. https://dash.cloudflare.com → Workers & Pages → Create → Worker.
 * 2. Nombre (ej. "assemblyai-token"), Deploy, luego "Edit code".
 * 3. Borra el ejemplo y pega TODO este archivo. Deploy.
 * 4. Settings → Variables and Secrets → Add:
 *      - Type: Secret   Name: ASSEMBLYAI_API_KEY   Value: (tu API key de AssemblyAI)
 *    Guarda y vuelve a Deploy.
 * 5. Copia la URL del Worker y pégala en la app:
 *    Configuración → "URL del proxy AssemblyAI".
 * ──────────────────────────────────────────────────────────────────────────
 */

// Orígenes autorizados (tu GitHub Pages + local para pruebas).
const ALLOWED_ORIGINS = [
  "https://drgtinformes.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:8000",
];

// Ventana para USAR el token y abrir el WebSocket (1–600 s). No limita el largo del dictado.
const EXPIRES_IN_SECONDS = 60;
// Duración máxima de una sesión de dictado (60–10800 s). 1 h sobra para un informe.
const MAX_SESSION_SECONDS = 3600;

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function jsonResponse(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "GET" && request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers });
    }
    if (!env.ASSEMBLYAI_API_KEY) {
      return jsonResponse({ error: "Falta el secret ASSEMBLYAI_API_KEY en el Worker." }, 500, headers);
    }

    try {
      const url = "https://streaming.assemblyai.com/v3/token"
        + "?expires_in_seconds=" + EXPIRES_IN_SECONDS
        + "&max_session_duration_seconds=" + MAX_SESSION_SECONDS;
      const aaiResp = await fetch(url, {
        method: "GET",
        headers: { "Authorization": env.ASSEMBLYAI_API_KEY },
      });

      if (!aaiResp.ok) {
        const detail = await aaiResp.text();
        return jsonResponse({ error: "AssemblyAI token failed", status: aaiResp.status, detail }, 502, headers);
      }

      const data = await aaiResp.json(); // { token: "...", expires_in_seconds: 60 }
      return jsonResponse({ token: data.token, expires_in_seconds: data.expires_in_seconds }, 200, headers);
    } catch (err) {
      return jsonResponse({ error: "Worker exception", detail: String(err) }, 500, headers);
    }
  },
};
