/**
 * GMAIL INTEGRATION LOGIC
 * This file handles authentication and interaction with the Gmail API.
 */

const GMAIL_CONFIG = {
    // Las claves ahora se cargan desde secrets.js (archivo no subido a GitHub)
    CLIENT_ID: typeof GMAIL_SECRETS !== 'undefined' ? GMAIL_SECRETS.CLIENT_ID : '',
    API_KEY: typeof GMAIL_SECRETS !== 'undefined' ? GMAIL_SECRETS.API_KEY : '',
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
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GMAIL_CONFIG.CLIENT_ID,
        scope: GMAIL_CONFIG.SCOPES,
        callback: '', // defined later
    });
    gsisInited = true;
    checkBeforeStart();
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

        // 2. Si no hay, pedir uno nuevo
        tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) {
                reject(resp);
                return;
            }
            saveGmailToken(resp);
            console.log("Auth success and token saved");
            resolve(resp);
        };

        if (gapi.client.getToken() === null) {
            // Force account selection to allow user to choose drgtinformes@gmail.com
            tokenClient.requestAccessToken({prompt: 'select_account'}); 
        } else {
            tokenClient.requestAccessToken({prompt: 'select_account'});
        }
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

/**
 * Search for the most recent thread involving the patient's name.
 */
async function findPatientThread(patientName) {
    try {
        if (!patientName || patientName.length < 3) return null;

        // Función para quitar tildes y normalizar texto
        const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const cleanName = normalize(patientName);

        // Construir una query que busque tanto con tildes como sin ellas
        const queryBase = `("${patientName}" OR "${cleanName}") -from:me newer_than:1d`;

        // Intento 1: Buscar en el ASUNTO
        let query = `subject:${queryBase}`;
        console.log("Buscando Intento 1:", query);
        let response = await gapi.client.gmail.users.threads.list({
            'userId': 'me',
            'q': query,
            'maxResults': 1
        });

        // Intento 2: Buscar en todo el hilo (con adjuntos)
        if (!response.result.threads || response.result.threads.length === 0) {
            query = `${queryBase} has:attachment`;
            console.log("Buscando Intento 2:", query);
            response = await gapi.client.gmail.users.threads.list({
                'userId': 'me',
                'q': query,
                'maxResults': 1
            });
        }

        const threads = response.result.threads;
        if (!threads || threads.length === 0) {
            console.warn("No se encontraron hilos para:", patientName);
            return null;
        }

        const threadDetails = await gapi.client.gmail.users.threads.get({
            'userId': 'me',
            'id': threads[0].id
        });

        return threadDetails.result;
    } catch (err) {
        console.error("Error finding thread:", err);
        return null;
    }
}

/**
 * Create and send a reply to a thread with an attachment.
 */
async function sendReplyWithAttachment(thread, blob, filename) {
    try {
        const lastMessage = thread.messages[thread.messages.length - 1];
        const subject = lastMessage.payload.headers.find(h => h.name === 'Subject').value;
        const to = lastMessage.payload.headers.find(h => h.name === 'From').value;
        const messageId = lastMessage.payload.headers.find(h => h.name === 'Message-ID').value;
        const references = lastMessage.payload.headers.find(h => h.name === 'References')?.value || '';

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
