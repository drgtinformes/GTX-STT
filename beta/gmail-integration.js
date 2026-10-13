/**
 * GMAIL INTEGRATION LOGIC
 * This file handles authentication and interaction with the Gmail API.
 */

const GMAIL_CONFIG = {
    // IMPORTANTE: en GitHub Pages secrets.js NO existe (está en .gitignore), por lo
    // que las claves DEBEN estar también aquí o la app no autentica en producción.
    // Esto es seguro para una app 100% de navegador:
    //   - El CLIENT_ID de OAuth es PÚBLICO por diseño; se protege con los "Orígenes
    //     de JavaScript autorizados" en Google Cloud (solo tu dominio puede usarlo).
    //   - El API_KEY se protege restringiéndolo por "Referente HTTP" a tu dominio.
    // secrets.js sigue funcionando como override opcional para desarrollo local.
    CLIENT_ID: (typeof GMAIL_SECRETS !== 'undefined' && GMAIL_SECRETS.CLIENT_ID)
        ? GMAIL_SECRETS.CLIENT_ID
        : '635192566350-l0vm8dr68m64boj6kko03jjp7t7reaue.apps.googleusercontent.com',
    API_KEY: (typeof GMAIL_SECRETS !== 'undefined' && GMAIL_SECRETS.API_KEY)
        ? GMAIL_SECRETS.API_KEY
        : 'AIzaSyB9_0ywJNzTrPwE0EVhCjQfdq9oIiOp4co',
    DISCOVERY_DOCS: ["https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest"],
    SCOPES: "https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send"
};

let tokenClient;
let gapiInited = false;
let gsisInited = false;

/**
 * Callback after GAPI client is loaded.
 */
function gapiLoaded() {
    gapi.load('client', intializeGapiClient);
}

/**
 * Initialize the GAPI client and load the Gmail API.
 */
async function intializeGapiClient() {
    await gapi.client.init({
        apiKey: GMAIL_CONFIG.API_KEY,
        discoveryDocs: GMAIL_CONFIG.DISCOVERY_DOCS,
    });
    gapiInited = true;
    checkBeforeStart();
}

/**
 * Callback after Google Identity Services are loaded.
 */
function gisLoaded() {
    ensureTokenClient();
}

/**
 * Crea el tokenClient de Google Identity Services de forma perezosa.
 * Devuelve el cliente, o null si GIS todavía no está disponible (el script aún
 * carga o fue bloqueado por una extensión) o si falta el CLIENT_ID.
 * Llamar a esto en vez de asumir que tokenClient ya existe evita el crash
 * "Cannot set properties of undefined (setting 'callback')".
 */
function ensureTokenClient() {
    if (tokenClient) return tokenClient;
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
        return null; // GIS aún no cargó
    }
    if (!GMAIL_CONFIG.CLIENT_ID) {
        console.error("Falta el CLIENT_ID de Google. Revisa gmail-integration.js / secrets.js");
        return null;
    }
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GMAIL_CONFIG.CLIENT_ID,
        scope: GMAIL_CONFIG.SCOPES,
        callback: '', // se define en cada authenticateGmail()
    });
    gsisInited = true;
    checkBeforeStart();
    return tokenClient;
}

function checkBeforeStart() {
    if (gapiInited && gsisInited) {
        console.log("Google API & Services ready");
        document.dispatchEvent(new CustomEvent('gmailReady'));
    }
}

/**
 * Authenticate and get access token, reusing saved token if valid.
 */
function authenticateGmail() {
    return new Promise((resolve, reject) => {
        // 1. Intentar cargar token guardado
        const savedToken = loadGmailToken();
        if (savedToken) {
            gapi.client.setToken(savedToken);
            resolve(savedToken);
            return;
        }

        // 2. Asegurar que el cliente de Google esté listo (evita el crash si el
        //    script de GIS aún no cargó o fue bloqueado por una extensión).
        const tc = ensureTokenClient();
        if (!tc) {
            reject(new Error("Google aún no termina de cargar (o una extensión bloqueó accounts.google.com). Espera unos segundos y vuelve a intentar."));
            return;
        }

        // 3. Pedir un token nuevo
        tc.callback = async (resp) => {
            if (resp.error !== undefined) {
                reject(resp);
                return;
            }
            saveGmailToken(resp);
            console.log("Auth success and token saved");
            resolve(resp);
        };

        // Forzar selección de cuenta para poder elegir drgtinformes@gmail.com
        tc.requestAccessToken({prompt: 'select_account'});
    });
}

function saveGmailToken(token) {
    const expiresAt = Date.now() + (token.expires_in * 1000) - 60000; // 1 min de margen
    localStorage.setItem('gmail_access_token', JSON.stringify({ ...token, expiresAt }));
}

function loadGmailToken() {
    const raw = localStorage.getItem('gmail_access_token');
    if (!raw) return null;
    try {
        const token = JSON.parse(raw);
        if (Date.now() < token.expiresAt) return token;
    } catch (e) { console.error(e); }
    return null;
}

// Info de la última búsqueda (cuenta, consultas probadas) para mostrar al usuario
let lastGmailSearchInfo = { account: '', name: '', queries: [] };

const _stripAccents = (str) => (str || '').normalize("NFD").replace(/[̀-ͯ]/g, "");
const _NAME_STOPWORDS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'van', 'von', 'paciente', 'sr', 'sra', 'srta']);

/**
 * Limpia la primera línea del dictado para dejar solo el nombre:
 * quita prefijos ("Paciente:", "Nombre:"), RUT, números y puntuación.
 */
function cleanPatientNameForSearch(raw) {
    let s = (raw || '').replace(/^\s*(paciente|nombre|pcte|pac)\s*[:.\-]?\s*/i, '');
    s = s.replace(/\b\d{1,2}\.?\d{3}\.?\d{3}\s*-\s*[\dkK]\b/g, ' '); // RUT
    s = s.replace(/[^\p{L}\s'-]/gu, ' ').replace(/\s+/g, ' ').trim();
    return s;
}

/** Término de búsqueda que acepta la palabra con y sin tildes. */
function _gmailTerm(word) {
    const plain = _stripAccents(word);
    return plain.toLowerCase() === word.toLowerCase() ? `"${word}"` : `("${word}" OR "${plain}")`;
}

/** Error de Gmail API -> si es 401, borra el token guardado para forzar nuevo login. */
function _handleGmailApiError(err) {
    const status = err && (err.status || (err.result && err.result.error && err.result.error.code));
    if (status === 401 || status === 403) {
        localStorage.removeItem('gmail_access_token');
        try { gapi.client.setToken(null); } catch (e) { /* noop */ }
        const e2 = new Error("La sesión de Gmail expiró o no tiene permisos. Vuelve a presionar el botón para iniciar sesión (elige drgtinformes@gmail.com).");
        e2.status = status;
        throw e2;
    }
    throw err;
}

async function _listThreadIds(query, max) {
    lastGmailSearchInfo.queries.push(query);
    console.log("Gmail búsqueda:", query);
    try {
        const resp = await gapi.client.gmail.users.threads.list({ userId: 'me', q: query, maxResults: max });
        return (resp.result.threads || []).map(t => t.id);
    } catch (err) {
        _handleGmailApiError(err);
    }
}

/**
 * Busca el hilo más reciente del paciente. Estrategia escalonada (de más estricta a más amplia):
 *  1. Nombre completo como frase en el ASUNTO (últimos 3 días).
 *  2. Todas las palabras del nombre, en cualquier orden, en cualquier parte (últimos 7 días).
 *  3. Pares de palabras del nombre (ej. "Juan Pérez" cuando el dictado dice "Juan Pérez Soto"),
 *     puntuando cada hilo por cuántas palabras del nombre contiene.
 * El usuario siempre confirma el correo antes de enviar, así que ampliar la búsqueda es seguro.
 * Lanza error si falla la API (sesión expirada, etc.); devuelve null si no hay coincidencias.
 */
async function findPatientThread(patientName) {
    const name = cleanPatientNameForSearch(patientName);
    lastGmailSearchInfo = { account: '', name, queries: [] };

    try {
        const profile = await gapi.client.gmail.users.getProfile({ userId: 'me' });
        lastGmailSearchInfo.account = profile.result.emailAddress || '';
    } catch (err) {
        _handleGmailApiError(err);
    }

    if (!name || name.length < 3) return null;

    const tokens = [...new Set(name.split(' '))]
        .filter(w => w.length >= 3 && !_NAME_STOPWORDS.has(_stripAccents(w).toLowerCase()));
    if (tokens.length === 0) return null;

    const plainName = _stripAccents(name);
    const phrase = plainName === name ? `"${name}"` : `("${name}" OR "${plainName}")`;
    const base = `-from:me`;

    // --- Intento 1: frase exacta en el asunto (comportamiento original, ventana ampliada)
    let ids = await _listThreadIds(`subject:${phrase} ${base} newer_than:3d`, 1);
    if (ids.length) return await _getFullThread(ids[0]);

    // --- Intento 2: todas las palabras, cualquier orden, asunto o cuerpo
    if (tokens.length >= 2) {
        ids = await _listThreadIds(`${tokens.map(_gmailTerm).join(' ')} ${base} newer_than:7d`, 1);
        if (ids.length) return await _getFullThread(ids[0]);
    } else {
        // Nombre de una sola palabra: solo en asunto, para no traer cualquier cosa
        ids = await _listThreadIds(`subject:${_gmailTerm(tokens[0])} ${base} newer_than:7d`, 1);
        if (ids.length) return await _getFullThread(ids[0]);
        return null;
    }

    if (tokens.length < 3) return null; // con 2 palabras el intento 3 sería igual al 2

    // --- Intento 3: pares de palabras; juntar candidatos y elegir el que más coincide
    const candidates = new Map(); // id -> orden de aparición (más reciente primero)
    for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
            const q = `${_gmailTerm(tokens[i])} ${_gmailTerm(tokens[j])} ${base} newer_than:7d`;
            const found = await _listThreadIds(q, 5);
            found.forEach(id => { if (!candidates.has(id)) candidates.set(id, candidates.size); });
            if (candidates.size >= 15) break;
        }
        if (candidates.size >= 15) break;
    }
    if (candidates.size === 0) return null;

    const normTokens = tokens.map(t => _stripAccents(t).toLowerCase());
    let best = null;
    for (const [id, order] of candidates) {
        let t;
        try {
            t = await gapi.client.gmail.users.threads.get({
                userId: 'me', id, format: 'metadata', metadataHeaders: ['Subject', 'From']
            });
        } catch (err) { _handleGmailApiError(err); }
        const text = _stripAccents((t.result.messages || []).map(m =>
            (m.snippet || '') + ' ' + (m.payload.headers || []).map(h => h.value).join(' ')
        ).join(' ')).toLowerCase();
        const score = normTokens.filter(tok => text.includes(tok)).length;
        if (!best || score > best.score || (score === best.score && order < best.order)) {
            best = { id, score, order };
        }
    }
    return best && best.score >= 2 ? await _getFullThread(best.id) : null;
}

async function _getFullThread(id) {
    try {
        const threadDetails = await gapi.client.gmail.users.threads.get({ userId: 'me', id });
        return threadDetails.result;
    } catch (err) {
        _handleGmailApiError(err);
    }
}

/**
 * Create and send a reply to a thread with an attachment.
 */
async function sendReplyWithAttachment(thread, blob, filename) {
    try {
        const hdr = (msg, name) => (msg.payload.headers.find(h => h.name.toLowerCase() === name.toLowerCase()) || {}).value || '';
        // Responder al último mensaje que NO envié yo (si ya había respondido antes,
        // el último mensaje del hilo es mío y el informe me llegaría a mí mismo).
        const me = (lastGmailSearchInfo.account || '').toLowerCase();
        const fromOthers = me ? thread.messages.filter(m => !hdr(m, 'From').toLowerCase().includes(me)) : [];
        const lastMessage = fromOthers.length ? fromOthers[fromOthers.length - 1] : thread.messages[thread.messages.length - 1];
        const rawSubject = hdr(lastMessage, 'Subject');
        const subject = /^re:/i.test(rawSubject) ? rawSubject.replace(/^re:\s*/i, '') : rawSubject;
        const to = hdr(lastMessage, 'Reply-To') || hdr(lastMessage, 'From');
        const messageId = hdr(lastMessage, 'Message-ID');
        const references = hdr(lastMessage, 'References');

        const fileBase64 = await blobToBase64(blob);

        const boundary = "-------7d823e10be32424";
        const nl = "\n";
        
        // Prepare raw email message
        const rawMessage = [
            `To: ${to}`,
            `Subject: Re: ${subject}`,
            `In-Reply-To: ${messageId}`,
            `References: ${references} ${messageId}`,
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            '',
            `--${boundary}`,
            'Content-Type: text/plain; charset="UTF-8"',
            'Content-Transfer-Encoding: 7bit',
            '',
            '', // Cuerpo del mensaje vacío según solicitud del usuario
            '',
            `--${boundary}`,
            `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document; name="${filename}"`,
            `Content-Disposition: attachment; filename="${filename}"`,
            'Content-Transfer-Encoding: base64',
            '',
            fileBase64,
            `--${boundary}--`
        ].join(nl);

        const encodedMessage = btoa(unescape(encodeURIComponent(rawMessage)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const response = await gapi.client.gmail.users.messages.send({
            'userId': 'me',
            'resource': {
                'raw': encodedMessage,
                'threadId': thread.id
            }
        });

        return response.result;
    } catch (err) {
        console.error("Error sending reply:", err);
        throw err;
    }
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
