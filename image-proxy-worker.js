/**
 * Cloudflare Worker — Proxy de imágenes para el Tablero de GTX-STT
 * ------------------------------------------------------------------
 * Cuando arrastras imágenes desde otro programa o página que entrega
 * DIRECCIONES web (no archivos), el navegador no puede descargarlas por
 * seguridad (CORS). Este Worker las descarga y se las entrega a la app.
 * (PureRef lo hace directo porque es un programa instalado, no una página.)
 *
 * - Solo atiende pedidos que vengan de tu app (drgtinformes.github.io).
 * - Solo devuelve imágenes (máx. 40 MB) y nunca direcciones internas.
 * - No guarda nada: pasa la imagen y listo. No necesita claves ni secrets.
 *
 * ── DESPLIEGUE (2 minutos, sin instalar nada) ─────────────────────────────
 * 1. https://dash.cloudflare.com → Workers & Pages → Create → Worker.
 * 2. Nombre (ej. "gtx-imagenes"), Deploy, luego "Edit code".
 * 3. Borra el ejemplo y pega TODO este archivo. Deploy.
 * 4. Copia la URL del Worker (ej. https://gtx-imagenes.tuusuario.workers.dev)
 *    y pégala en la app: Configuración → "Proxy de imágenes del tablero".
 * ──────────────────────────────────────────────────────────────────────────
 */

// Orígenes autorizados (tu GitHub Pages + local para pruebas).
const ALLOWED_ORIGINS = [
  "https://drgtinformes.github.io",
  "http://localhost:9080",
  "http://localhost:8000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
];

const MAX_BYTES = 40 * 1024 * 1024;

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

// Evita que el Worker se use para leer direcciones internas/privadas.
function isPrivateHost(host) {
  const h = String(host || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (!h || h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")) return true;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  return false;
}

function text(msg, status, headers) {
  return new Response(msg, { status, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } });
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "GET") return text("Method Not Allowed", 405, headers);
    if (!ALLOWED_ORIGINS.includes(origin)) return text("Origen no autorizado", 403, headers);

    const target = new URL(request.url).searchParams.get("url") || "";
    let u;
    try { u = new URL(target); } catch (_) { return text("Falta una URL válida (?url=...)", 400, headers); }
    if (!/^https?:$/.test(u.protocol)) return text("Solo se aceptan direcciones http/https", 400, headers);
    if (isPrivateHost(u.hostname)) return text("Dirección no permitida", 400, headers);

    let resp;
    try {
      resp = await fetch(u.toString(), {
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (GTX-STT image proxy)", "Accept": "image/*,*/*;q=0.8" },
      });
    } catch (e) {
      return text("No se pudo conectar con el sitio de origen", 502, headers);
    }
    if (!resp.ok) return text(`El sitio de origen respondió ${resp.status}`, 502, headers);

    const len = Number(resp.headers.get("Content-Length") || 0);
    if (len > MAX_BYTES) return text("Imagen demasiado grande", 413, headers);

    const ct = (resp.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
    if (!ct.startsWith("image/") && ct !== "application/octet-stream" && ct !== "binary/octet-stream") {
      return text(`El sitio no devolvió una imagen (${ct || "sin tipo"})`, 415, headers);
    }

    return new Response(resp.body, {
      status: 200,
      headers: { ...headers, "Content-Type": ct.startsWith("image/") ? ct : "application/octet-stream", "Cache-Control": "no-store" },
    });
  },
};
