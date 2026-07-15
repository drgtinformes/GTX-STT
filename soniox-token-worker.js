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

// ── Transcripción asíncrona de archivos (Soniox REST) ──────────────────────
// El navegador NO puede usar la API async de Soniox: (1) las temporary keys
// solo valen para WebSocket, y (2) la API REST no habilita CORS para el
// navegador. Por eso el Worker hace todo el flujo (subir → transcribir →
// consultar) con la key real y devuelve solo el texto.
const SONIOX_BASE = "https://api.soniox.com";

function jsonResponse(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function safeParse(v) {
  if (typeof v !== "string" || !v) return null;
  try { return JSON.parse(v); } catch (_) { return null; }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function handleFileTranscription(request, env, headers) {
  const AUTH = { "Authorization": `Bearer ${env.SONIOX_API_KEY}` };

  let form;
  try { form = await request.formData(); }
  catch (_) { return jsonResponse({ error: "Cuerpo multipart inválido." }, 400, headers); }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return jsonResponse({ error: "Falta el archivo de audio (campo 'file')." }, 400, headers);
  }

  const model = (typeof form.get("model") === "string" && form.get("model")) || "stt-async-v5";
  const languageHints = safeParse(form.get("language_hints")) || ["es"];
  const context = safeParse(form.get("context"));

  const cleanup = async (fileId, trId) => {
    if (trId) { try { await fetch(`${SONIOX_BASE}/v1/transcriptions/${trId}`, { method: "DELETE", headers: AUTH }); } catch (_) {} }
    if (fileId) { try { await fetch(`${SONIOX_BASE}/v1/files/${fileId}`, { method: "DELETE", headers: AUTH }); } catch (_) {} }
  };

  try {
    // 1. Subir el archivo → file_id
    const upForm = new FormData();
    upForm.append("file", file, file.name || "audio");
    const upResp = await fetch(`${SONIOX_BASE}/v1/files`, { method: "POST", headers: AUTH, body: upForm });
    if (!upResp.ok) {
      return jsonResponse({ error: "Fallo al subir el archivo a Soniox", detail: await upResp.text() }, 502, headers);
    }
    const fileId = (await upResp.json()).id;

    // 2. Crear la transcripción (modelo async + hints + contexto del dominio)
    const config = { model, language_hints: languageHints, file_id: fileId };
    if (context) config.context = context;
    const crResp = await fetch(`${SONIOX_BASE}/v1/transcriptions`, {
      method: "POST",
      headers: { ...AUTH, "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (!crResp.ok) {
      await cleanup(fileId, null);
      return jsonResponse({ error: "Fallo al crear la transcripción", detail: await crResp.text() }, 502, headers);
    }
    const trId = (await crResp.json()).id;

    // 3. Esperar a que termine (poll; audio corto = pocos segundos)
    let status = "queued", errMsg = "";
    for (let i = 0; i < 40; i++) {
      await sleep(1500);
      const stResp = await fetch(`${SONIOX_BASE}/v1/transcriptions/${trId}`, { headers: AUTH });
      if (!stResp.ok) continue;
      const st = await stResp.json();
      status = st.status;
      if (status === "completed") break;
      if (status === "error") { errMsg = st.error_message || "Error de transcripción"; break; }
    }
    if (status !== "completed") {
      await cleanup(fileId, trId);
      return jsonResponse({ error: errMsg || "La transcripción no terminó a tiempo (audio muy largo)." }, 504, headers);
    }

    // 4. Obtener el transcript y unir los tokens
    const txResp = await fetch(`${SONIOX_BASE}/v1/transcriptions/${trId}/transcript`, { headers: AUTH });
    if (!txResp.ok) {
      await cleanup(fileId, trId);
      return jsonResponse({ error: "Fallo al obtener el transcript", detail: await txResp.text() }, 502, headers);
    }
    const txData = await txResp.json();
    const text = (txData.tokens || []).map((t) => t.text || "").join("").trim();

    // 5. Limpieza best-effort (no bloquea la respuesta si falla)
    await cleanup(fileId, trId);

    return jsonResponse({ text }, 200, headers);
  } catch (err) {
    return jsonResponse({ error: "Excepción en el Worker", detail: String(err) }, 500, headers);
  }
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

    // Modo archivo: si llega un multipart con audio, transcripción asíncrona.
    // El flujo realtime sigue igual (POST sin cuerpo → key temporal).
    const contentType = request.headers.get("Content-Type") || "";
    if (request.method === "POST" && contentType.includes("multipart/form-data")) {
      return handleFileTranscription(request, env, headers);
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
