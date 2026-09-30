/**
 * Cloudflare Worker — Proxy de keys temporales para Speechmatics
 * --------------------------------------------------------------
 * Igual que los de Deepgram y Soniox: el navegador pide a este Worker una
 * "temporary key" (JWT de corta duración) sin exponer nunca tu API key real,
 * que vive solo aquí como secret. El navegador abre el WebSocket de
 * Speechmatics con esa key en la URL (?jwt=...), que es la forma que exige
 * Speechmatics para conectarse desde el navegador.
 *
 * ── DESPLIEGUE (2 minutos, sin instalar nada) ─────────────────────────────
 * 1. https://dash.cloudflare.com → Workers & Pages → Create → Worker.
 * 2. Nombre (ej. "speechmatics-token"), Deploy, luego "Edit code".
 * 3. Borra el ejemplo y pega TODO este archivo. Deploy.
 * 4. Settings → Variables and Secrets → Add:
 *      - Type: Secret   Name: SPEECHMATICS_API_KEY   Value: (tu API key de Speechmatics)
 *    Guarda y vuelve a Deploy.
 * 5. Copia la URL del Worker y pégala en la app:
 *    Configuración → "URL del proxy Speechmatics".
 * ──────────────────────────────────────────────────────────────────────────
 */

// Orígenes autorizados (tu GitHub Pages + local para pruebas).
const ALLOWED_ORIGINS = [
  "https://drgtinformes.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:8000",
];

// Duración de la key temporal en segundos (Speechmatics acepta 60–86400).
// 600 s = 10 min: margen amplio para abrir la sesión. Si algún dictado muy
// largo se cortara justo a los 10 min, sube este valor.
const TTL_SECONDS = 600;

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
    if (!env.SPEECHMATICS_API_KEY) {
      return jsonResponse({ error: "Falta el secret SPEECHMATICS_API_KEY en el Worker." }, 500, headers);
    }

    try {
      const smResp = await fetch("https://mp.speechmatics.com/v1/api_keys?type=rt", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.SPEECHMATICS_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: TTL_SECONDS }),
      });

      if (!smResp.ok) {
        const detail = await smResp.text();
        return jsonResponse({ error: "Speechmatics temporary key failed", status: smResp.status, detail }, 502, headers);
      }

      const data = await smResp.json(); // { key_value: "..." }
      return jsonResponse({ jwt: data.key_value, ttl: TTL_SECONDS }, 200, headers);
    } catch (err) {
      return jsonResponse({ error: "Worker exception", detail: String(err) }, 500, headers);
    }
  },
};
