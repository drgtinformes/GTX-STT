/**
 * Cloudflare Worker — Proxy de tokens temporales para Soniox
 * ----------------------------------------------------------
 * Igual que el de Deepgram, pero para Soniox: el navegador pide a este Worker
 * una "temporary API key" (caduca en segundos) sin exponer nunca tu key real,
 * que vive solo aquí como secret. El navegador abre el WebSocket de Soniox con
 * esa key temporal en el primer mensaje de configuración.
 *
 * ── DESPLIEGUE (2 minutos, sin instalar nada) ─────────────────────────────
 * 1. https://dash.cloudflare.com → Workers & Pages → Create → Worker.
 * 2. Nombre (ej. "soniox-token"), Deploy, luego "Edit code".
 * 3. Borra el ejemplo y pega TODO este archivo. Deploy.
 * 4. Settings → Variables and Secrets → Add:
 *      - Type: Secret   Name: SONIOX_API_KEY   Value: (tu API key de Soniox)
 *    Guarda y vuelve a Deploy.
 * 5. Copia la URL del Worker y pégala en la app:
 *    Configuración → "URL del proxy Soniox".
 * ──────────────────────────────────────────────────────────────────────────
 */

// Orígenes autorizados (tu GitHub Pages + local para pruebas).
const ALLOWED_ORIGINS = [
  "https://drgtinformes.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:8000",
];

// Duración de la key temporal en segundos (máx 3600).
const EXPIRES_IN_SECONDS = 60;

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

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "GET" && request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers });
    }
    if (!env.SONIOX_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Falta el secret SONIOX_API_KEY en el Worker." }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    try {
      const sxResp = await fetch("https://api.soniox.com/v1/auth/temporary-api-key", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.SONIOX_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usage_type: "transcribe_websocket",
          expires_in_seconds: EXPIRES_IN_SECONDS,
        }),
      });

      if (!sxResp.ok) {
        const detail = await sxResp.text();
        return new Response(
          JSON.stringify({ error: "Soniox temporary-api-key failed", status: sxResp.status, detail }),
          { status: 502, headers: { ...headers, "Content-Type": "application/json" } }
        );
      }

      const data = await sxResp.json(); // { api_key: "temp:...", expires_at: "..." }
      return new Response(
        JSON.stringify({ api_key: data.api_key, expires_at: data.expires_at }),
        {
          status: 200,
          headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
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
