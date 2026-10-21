/**
 * BANDEJA DE ÓRDENES PENDIENTES (Gmail)
 * ------------------------------------------------------------
 * - Lista los correos recientes con adjuntos que todavía no respondes.
 * - "Abrir" una orden: baja sus imágenes al tablero (uno por orden), deja la orden
 *   activa (el botón Gmail responde directo a ESE hilo, sin buscar por nombre) y
 *   selecciona la plantilla que usaste la última vez con ese remitente.
 * - Al enviar, recuerda remitente → plantilla y saca la orden de pendientes.
 *
 * Depende de gmail-integration.js (authenticateGmail, loadGmailToken, gapi) y
 * de workstation.js (GTXWorkstation.openBoard).
 */
(function () {
    'use strict';

    const QUERY_KEY = 'gtx_orders_query';
    const ACTIVE_KEY = 'gtx_active_order';
    const SENDER_TPL_KEY = 'gtx_sender_templates';
    const SENDERS_KEY = 'gtx_orders_senders';   // { newDefault: bool, list: { email: { name, show } } }
    const DEFAULT_QUERY = 'in:inbox -from:me has:attachment newer_than:7d -category:promotions -category:social';
    const IMG_EXT = /\.(jpe?g|png|gif|bmp|webp|avif)$/i;
    const UNSUPPORTED_EXT = /\.(tiff?|dcm|dicom)$/i;

    const safeGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* noop */ } };
    const safeDel = (k) => { try { localStorage.removeItem(k); } catch (e) { /* noop */ } };
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    let myEmail = '';
    let orders = [];          // última lista
    let active = null;        // { threadId, subject, from, fromEmail, patient }
    try { active = JSON.parse(safeGet(ACTIVE_KEY) || 'null'); } catch (e) { active = null; }

    // ---------- Utilidades Gmail ----------
    const hdr = (msg, name) => {
        const h = ((msg.payload && msg.payload.headers) || []).find(x => x.name.toLowerCase() === name.toLowerCase());
        return h ? h.value : '';
    };
    const emailOf = (from) => { const m = /<([^>]+)>/.exec(from || ''); return (m ? m[1] : (from || '')).trim().toLowerCase(); };
    const nameOf = (from) => {
        const m = /^\s*"?([^"<]+?)"?\s*</.exec(from || '');
        return (m ? m[1] : emailOf(from)).trim();
    };

    function walkParts(part, out) {
        if (!part) return out;
        if (part.parts && part.parts.length) part.parts.forEach(p => walkParts(p, out));
        // Adjuntos con nombre, o imágenes sin nombre (frecuente en correos reenviados)
        if (part.body && part.body.attachmentId && (part.filename || /^image\//i.test(part.mimeType || ''))) out.push(part);
        return out;
    }

    function isInlineDecoration(part) {
        // Solo se descartan logos/íconos de firma: muy pequeños, o PNG/GIF chicos incrustados.
        // Las radiografías (JPG) de 20–60 KB, aunque vengan incrustadas al reenviar, SÍ se bajan.
        const size = (part.body && part.body.size) || 0;
        const headers = part.headers || [];
        const cid = headers.some(h => h.name.toLowerCase() === 'content-id');
        const inline = headers.some(h => h.name.toLowerCase() === 'content-disposition' && /inline/i.test(h.value));
        const pngGif = /image\/(png|gif)/i.test(part.mimeType || '') || /\.(png|gif)$/i.test(part.filename || '');
        if (size && size < 6000) return true;
        if ((cid || inline) && pngGif && size < 25000) return true;
        return false;
    }

    function classifyAttachments(messages) {
        const images = [], unsupported = [], others = [], skipped = [];
        const seen = new Set();
        for (const msg of messages) {
            if (myEmail && emailOf(hdr(msg, 'From')) === myEmail) continue; // adjuntos míos (informes) no
            for (const p of walkParts(msg.payload, [])) {
                const fname = p.filename || '';
                // El mismo archivo repetido en varios mensajes del hilo (reenvíos) se baja una vez
                const sig = fname.toLowerCase() + '|' + ((p.body && p.body.size) || 0);
                if (fname && seen.has(sig)) continue;
                seen.add(sig);
                const isImg = (p.mimeType || '').startsWith('image/') || IMG_EXT.test(fname);
                if (UNSUPPORTED_EXT.test(fname) || /tiff|dicom/i.test(p.mimeType || '')) unsupported.push({ msg, part: p });
                else if (isImg && isInlineDecoration(p)) skipped.push({ msg, part: p });
                else if (isImg) images.push({ msg, part: p });
                else others.push({ msg, part: p });
            }
        }
        return { images, unsupported, others, skipped };
    }

    const _decoder = document.createElement('textarea');
    function cleanSnippet(s) {
        _decoder.innerHTML = s;
        return _decoder.value
            .replace(/-{3,}\s*(forwarded message|mensaje reenviado)\s*-{3,}/ig, '')
            .replace(/^\s*(de|from):\s*[^<]*<[^>]*>\s*/i, '')
            .trim();
    }

    /** Intenta sacar el nombre del paciente desde el asunto. */
    const titleCase = (t) => t.toLowerCase()
        .replace(/(^|[\s'´’-])(\p{L})/gu, (m, a, c) => a + c.toUpperCase())
        .replace(/\s(De|Del|La|Las|Los|Y)(?=\s)/g, (m, w) => ' ' + w.toLowerCase());

    function guessPatient(subject) {
        const base = String(subject || '').replace(/^\s*((re|rv|fw|fwd|reenviar|reenviado|enc)\s*:\s*)+/i, '');
        // 1º: el asunto viene por segmentos separados por guiones: "CENTRO - NOMBRE APELLIDOS - RX…"
        const segs = base.split(/\s*[-–—|]\s*/).map(x => x.trim()).filter(Boolean);
        const NOISE = /\b(rx|cbct|tac|pano|panor|btw|bite|total|periapical|tele|cefal|atm|dr|dra|orden|informe|examen|estudio|urgente|control)\b/i;
        const nameLike = segs.filter(seg => {
            if (/\d/.test(seg) || NOISE.test(seg) || /[.:]/.test(seg)) return false;
            const w = seg.split(/\s+/).filter(Boolean);
            return w.length >= 2 && w.length <= 6 && w.every(x => /^[\p{L}'´’]+$/u.test(x));
        });
        if (nameLike.length) {
            nameLike.sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length);
            return titleCase(nameLike[0]);
        }
        let s = base;
        s = s.replace(/\b\d{1,2}\.?\d{3}\.?\d{3}\s*-\s*[\dkK]\b/g, ' ');
        const STOP = /\b(orden(es)?|solicitud(es)?|ex[aá]men(es)?|estudios?|informes?|pacientes?|pcte|pac|sr|sra|srta|dra?|doctor[a]?|cbct|cone|beam|rx|radiograf[ií]as?|panor[aá]mic[ao]s?|panorex|periapical(es)?|bite|wing|bitewings?|teler+adiograf[ií]as?|cefalom[eé]tric[ao]s?|atm|tac|scanner|im[aá]gen(es)?|adjunt[oa]s?|urgente|para|de|del|la|las|los|el|y|con|por|favor|pdf|jpg|nuev[oa]|control|maxilar|mand[ií]bula|ap|lat|derivaci[oó]n|consulta|env[ií]o|pieza|piezas|diente|dientes)\b/gi;
        s = s.replace(/\d+/g, ' ').replace(STOP, ' ').replace(/[^\p{L}\s'-]/gu, ' ').replace(/\s+/g, ' ').trim();
        const words = s.split(' ').filter(w => w.length >= 2);
        if (words.length < 2 || words.length > 5) return '';
        return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }

    function relTime(ms) {
        const d = new Date(ms), now = new Date();
        const sameDay = d.toDateString() === now.toDateString();
        const hhmm = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        if (sameDay) return 'Hoy ' + hhmm;
        const y = new Date(now); y.setDate(now.getDate() - 1);
        if (d.toDateString() === y.toDateString()) return 'Ayer ' + hhmm;
        return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }) + ' ' + hhmm;
    }

    async function ensureAuth(interactive) {
        if (typeof gapi === 'undefined' || !gapi.client || !gapi.client.gmail) {
            throw new Error('Google todavía no termina de cargar. Espera unos segundos y vuelve a intentar.');
        }
        if (!interactive && !loadGmailToken()) return false;
        await authenticateGmail();
        if (!myEmail) {
            try {
                const p = await gapi.client.gmail.users.getProfile({ userId: 'me' });
                myEmail = (p.result.emailAddress || '').toLowerCase();
            } catch (err) {
                if (typeof _handleGmailApiError === 'function') _handleGmailApiError(err);
                throw err;
            }
        }
        if (typeof lastGmailSearchInfo !== 'undefined') lastGmailSearchInfo.account = myEmail;
        return true;
    }

    // ---------- Cargar órdenes ----------
    async function fetchOrders() {
        const q = safeGet(QUERY_KEY) || DEFAULT_QUERY;
        let resp;
        try {
            resp = await gapi.client.gmail.users.threads.list({ userId: 'me', q, maxResults: 40 });
        } catch (err) {
            if (typeof _handleGmailApiError === 'function') _handleGmailApiError(err);
            throw err;
        }
        const ids = (resp.result.threads || []).map(t => t.id);
        const out = [];
        // de a 6 en paralelo
        for (let i = 0; i < ids.length; i += 6) {
            const chunk = await Promise.all(ids.slice(i, i + 6).map(id =>
                gapi.client.gmail.users.threads.get({ userId: 'me', id }).then(r => r.result).catch(() => null)));
            for (const t of chunk) {
                if (!t || !t.messages || !t.messages.length) continue;
                const msgs = t.messages;
                const last = msgs[msgs.length - 1];
                const incoming = msgs.filter(m => emailOf(hdr(m, 'From')) !== myEmail);
                if (!incoming.length) continue;
                const lastIn = incoming[incoming.length - 1];
                const answered = emailOf(hdr(last, 'From')) === myEmail;
                const att = classifyAttachments(msgs);
                const subject = hdr(lastIn, 'Subject') || '(sin asunto)';
                out.push({
                    threadId: t.id,
                    subject,
                    from: hdr(lastIn, 'From'),
                    fromEmail: emailOf(hdr(lastIn, 'From')),
                    fromName: nameOf(hdr(lastIn, 'From')),
                    date: Number(lastIn.internalDate) || Date.now(),
                    snippet: cleanSnippet(lastIn.snippet || ''),
                    patient: guessPatient(subject),
                    nImages: att.images.length,
                    nUnsupported: att.unsupported.length,
                    attDetail: [
                        ...att.images.map(x => '✓ ' + (x.part.filename || 'imagen sin nombre') + ' (' + Math.round(((x.part.body && x.part.body.size) || 0) / 1024) + ' KB)'),
                        ...att.skipped.map(x => '✗ ' + (x.part.filename || 'imagen sin nombre') + ' (' + Math.round(((x.part.body && x.part.body.size) || 0) / 1024) + ' KB, parece logo)'),
                        ...att.unsupported.map(x => '⚠ ' + x.part.filename + ' (formato no compatible)'),
                        ...att.others.map(x => '· ' + x.part.filename),
                    ].join('\n'),
                    answered,
                    // ¿Parte de un lote? (varios pacientes + Excel, o "PARTE n DE m")
                    _lote: window.GTXLotes ? window.GTXLotes.esLote(subject, att.others.map(x => x.part.filename)) : null,
                });
            }
        }
        const merged = agruparLotes(out);
        merged.sort((a, b) => b.date - a.date);
        return merged;
    }

    /** Une en una sola fila las partes de un mismo lote (mismo remitente y asunto sin "_PARTE n DE m"). */
    function agruparLotes(list) {
        const L = window.GTXLotes;
        if (!L) return list;
        const lotes = new Map();
        const res = [];
        for (const o of list) {
            if (!o._lote) { res.push(o); continue; }
            const key = L.clave(o.fromEmail, o._lote.base);
            let b = lotes.get(key);
            if (!b) {
                b = {
                    batch: true, loteKey: key, threadId: 'lote:' + key, threadIds: [], partesSet: new Set(), total: 1,
                    subject: o._lote.base, from: o.from, fromEmail: o.fromEmail, fromName: o.fromName,
                    date: o.date, snippet: '', patient: '', nImages: 0, nUnsupported: 0, attDetail: '', hasSheet: false, answered: false,
                };
                lotes.set(key, b);
                res.push(b);
            }
            b.threadIds.push(o.threadId);
            if (o._lote.parte) b.partesSet.add(o._lote.parte);
            b.total = Math.max(b.total, o._lote.total || 1);
            b.date = Math.max(b.date, o.date);
            b.nImages += o.nImages;
            b.nUnsupported += o.nUnsupported;
            b.hasSheet = b.hasSheet || o._lote.hasSheet;
        }
        for (const b of lotes.values()) {
            b.partes = [...b.partesSet].sort((x, y) => x - y);
            delete b.partesSet;
            b.faltan = [];
            if (b.total > 1) for (let i = 1; i <= b.total; i++) if (!b.partes.includes(i)) b.faltan.push(i);
            b.answered = L.enviado(b.loteKey);
            b.snippet = (b.total > 1 ? `Partes recibidas: ${b.partes.length} de ${b.total}` : '1 correo')
                + (b.faltan.length ? ` · FALTA la parte ${b.faltan.join(', ')}` : '')
                + (b.hasSheet ? ' · con Excel' : ' · sin Excel');
            b.attDetail = `${b.nImages} imágenes en ${b.threadIds.length} correo(s)`;
        }
        return res;
    }

    async function downloadImages(threadId) {
        const t = (await gapi.client.gmail.users.threads.get({ userId: 'me', id: threadId })).result;
        const att = classifyAttachments(t.messages || []);
        const files = [];
        for (const { msg, part } of att.images) {
            try {
                const r = await gapi.client.gmail.users.messages.attachments.get({ userId: 'me', messageId: msg.id, id: part.body.attachmentId });
                const b64 = r.result.data.replace(/-/g, '+').replace(/_/g, '/');
                const bin = atob(b64);
                const bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                let type = part.mimeType && part.mimeType.startsWith('image/') ? part.mimeType : '';
                if (!type) {
                    const ext = ((part.filename || '').split('.').pop() || '').toLowerCase();
                    type = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', avif: 'image/avif' }[ext] || 'image/jpeg';
                }
                const name = part.filename || `imagen-${files.length + 1}.${(type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')}`;
                files.push(new File([bytes], name, { type }));
            } catch (e) {
                console.error('No se pudo bajar el adjunto', part.filename, e);
            }
        }
        if (att.unsupported.length) {
            toast(`${att.unsupported.length} adjunto(s) en formato no compatible con el navegador (TIFF/DICOM): ${att.unsupported.map(x => x.part.filename).join(', ')}`, 'warn', 8000);
        }
        return files;
    }

    // ---------- Remitentes visibles ----------
    function loadSenders() {
        try {
            const v = JSON.parse(safeGet(SENDERS_KEY) || 'null');
            if (v && v.list) return { newDefault: v.newDefault !== false, list: v.list };
        } catch (e) { /* noop */ }
        return { newDefault: true, list: {} };
    }
    function saveSenders(v) { safeSet(SENDERS_KEY, JSON.stringify(v)); }
    /** Agrega a la lista los remitentes nuevos (visibles u ocultos según la preferencia). */
    function registerSenders(list) {
        const v = loadSenders();
        let changed = false;
        for (const o of list) {
            if (!o.fromEmail) continue;
            const e = v.list[o.fromEmail];
            if (!e) { v.list[o.fromEmail] = { name: o.fromName, show: v.newDefault }; changed = true; }
            else if (o.fromName && e.name !== o.fromName) { e.name = o.fromName; changed = true; }
        }
        if (changed) saveSenders(v);
    }
    function isShown(o) {
        const v = loadSenders();
        const e = v.list[o.fromEmail];
        return e ? e.show !== false : v.newDefault;
    }
    function setSenderShown(email, show) {
        const v = loadSenders();
        if (!v.list[email]) v.list[email] = { name: email, show };
        v.list[email].show = show;
        saveSenders(v);
    }
    const visibleOrders = () => orders.filter(isShown);

    // ---------- Orden activa ----------
    function setActive(o) {
        active = o ? { threadId: o.threadId, subject: o.subject, from: o.from, fromEmail: o.fromEmail, fromName: o.fromName, patient: o.patient } : null;
        if (active) safeSet(ACTIVE_KEY, JSON.stringify(active)); else safeDel(ACTIVE_KEY);
        renderChip();
    }

    // ---------- Etiqueta de la orden (Dr(a). y fecha leídos con visión) ----------
    // Algunas órdenes traen un timbre con nombre / RUN / FN / Rx / Dr(a). / fecha. Al abrir la orden se lee
    // en segundo plano (etiqueta.js) y el Dr(a). y la fecha se anteponen al dictado, como el nombre del paciente.
    const ETQ_KEY = 'gtx_etiquetas';   // { threadId: { doctor, fecha } } (últimas 40 órdenes)
    let etiquetas = {};
    try { etiquetas = JSON.parse(safeGet(ETQ_KEY) || '{}') || {}; } catch (e) { etiquetas = {}; }
    const sinEtiqueta = new Set();     // órdenes ya leídas sin etiqueta (solo esta sesión)
    const leyendoEtq = new Set();

    function guardarEtiqueta(threadId, e) {
        etiquetas[threadId] = { doctor: e.doctor || '', fecha: e.fecha || '' };
        const ks = Object.keys(etiquetas);
        if (ks.length > 40) ks.slice(0, ks.length - 40).forEach(k => delete etiquetas[k]);
        safeSet(ETQ_KEY, JSON.stringify(etiquetas));
    }

    /** Antepone "Dr(a). X. Fecha: D de mes del AAAA." al dictado (después de "Paciente: …" si está). forzar=true ignora lo ya dictado. */
    function insertarEtiqueta(threadId, forzar) {
        const e = etiquetas[threadId];
        const ta = document.getElementById('transcription');
        if (!e || !ta) return false;
        const v = ta.value;
        const partes = [];
        if (e.doctor && !v.includes(e.doctor) && (forzar || !/\b(dr\(a\)|dra?|doctora?)\b/i.test(v))) partes.push(`Dr(a). ${e.doctor}.`);
        if (e.fecha && !v.includes(e.fecha) && (forzar || !/\bfecha\b/i.test(v))) partes.push(`Fecha: ${e.fecha}.`);
        if (!partes.length) return false;
        const pref = active && active.patient ? `Paciente: ${active.patient}. ` : '';
        const idx = pref && v.startsWith(pref) ? pref.length : 0;
        ta.value = v.slice(0, idx) + partes.join(' ') + ' ' + v.slice(idx);
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
    }

    async function leerEtiquetaOrden(threadId, files) {
        if (!window.GTXEtiqueta || !files || !files.length) return;
        if (leyendoEtq.has(threadId)) return;
        try {
            if (!etiquetas[threadId]) {
                if (sinEtiqueta.has(threadId)) return;
                leyendoEtq.add(threadId);
                const e = await window.GTXEtiqueta.leer(files);
                if (!e) { sinEtiqueta.add(threadId); return; }
                guardarEtiqueta(threadId, e);
                if (active && active.threadId === threadId) {
                    renderChip();
                    toast(`Etiqueta leída: ${[e.doctor ? 'Dr(a). ' + e.doctor : '', e.fecha].filter(Boolean).join(' · ')}`, 'ok', 5000);
                }
            }
            if (active && active.threadId === threadId) insertarEtiqueta(threadId, false);
        } catch (err) {
            console.warn('Etiqueta de la orden:', err);
            if (!/falta la clave/i.test(String(err && err.message))) toast('No se pudo leer la etiqueta de la orden: ' + (err.message || err), 'warn', 6000);
        } finally { leyendoEtq.delete(threadId); }
    }

    /** Baja las imágenes de la orden y, en segundo plano, lee su etiqueta. */
    async function bajarImagenes(threadId) {
        const files = await downloadImages(threadId);
        leerEtiquetaOrden(threadId, files);
        return files;
    }

    function senderTemplates() {
        try { return JSON.parse(safeGet(SENDER_TPL_KEY) || '{}') || {}; } catch (e) { return {}; }
    }

    function applySenderTemplate(fromEmail) {
        const tplId = senderTemplates()[fromEmail];
        const sel = document.getElementById('template-select');
        if (!tplId || !sel) return false;
        if (![...sel.options].some(o => o.value === tplId)) return false;
        if (sel.value !== tplId) {
            sel.value = tplId;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return true;
    }

    async function openOrder(o) {
        if (o.batch) {
            closeModal();
            if (window.GTXLotes) window.GTXLotes.abrir(o);
            return;
        }
        if (window.GTXLotes && window.GTXLotes.activo) window.GTXLotes.salir();
        setActive(o);
        const usedTpl = applySenderTemplate(o.fromEmail);
        closeModal();
        const label = (o.patient || o.subject) + ' — ' + o.fromName;
        if (window.GTXWorkstation) {
            toast('Abriendo orden y bajando imágenes…', 'info', 2500);
            try {
                const n = await window.GTXWorkstation.openBoard('order:' + o.threadId, label, () => bajarImagenes(o.threadId));
                if (n) toast(`${n} imagen(es) cargadas en el tablero${usedTpl ? ' · plantilla del remitente seleccionada' : ''}`, 'ok');
                else if (usedTpl) toast('Plantilla del remitente seleccionada', 'ok');
            } catch (e) {
                console.error(e);
                toast('No se pudieron bajar las imágenes: ' + (e.message || e), 'error', 7000);
            }
        }
    }

    /** Hilo completo de la orden activa (para responder). null si no hay orden activa. */
    async function getActiveThread() {
        if (!active) return null;
        await ensureAuth(true);
        try {
            const r = await gapi.client.gmail.users.threads.get({ userId: 'me', id: active.threadId });
            return r.result;
        } catch (err) {
            if (typeof _handleGmailApiError === 'function') _handleGmailApiError(err);
            throw err;
        }
    }

    /** Llamar después de enviar el informe por Gmail. */
    function onSent(thread, templateId) {
        try {
            const msgs = (thread && thread.messages) || [];
            const incoming = msgs.filter(m => emailOf(hdr(m, 'From')) !== myEmail);
            const sender = incoming.length ? emailOf(hdr(incoming[incoming.length - 1], 'From')) : (active && active.fromEmail);
            if (sender && templateId) {
                const map = senderTemplates();
                map[sender] = templateId;
                safeSet(SENDER_TPL_KEY, JSON.stringify(map));
            }
        } catch (e) { console.warn(e); }
        if (active && thread && thread.id === active.threadId) {
            orders = orders.map(o => o.threadId === active.threadId ? { ...o, answered: true } : o);
            setActive(null);
            updateBadge();
        }
    }

    // ---------- UI ----------
    let modal, listEl, statusEl, showAnsweredEl, queryEl, chipEl, badgeEl, btnEl, sendersEl;

    function buildUI() {
        // Botón en el encabezado
        const configBtn = document.getElementById('config-btn');
        btnEl = document.createElement('button');
        btnEl.id = 'orders-btn';
        btnEl.className = 'icon-btn gtx-pill-btn';
        btnEl.title = 'Órdenes pendientes (correos sin responder)';
        btnEl.innerHTML = '<i data-lucide="inbox"></i><span>Órdenes</span><b class="orders-badge" hidden>0</b>';
        configBtn.parentNode.insertBefore(btnEl, document.getElementById('canvas-btn') || configBtn);
        badgeEl = btnEl.querySelector('.orders-badge');
        btnEl.addEventListener('click', () => openModal());

        // Modal
        modal = document.createElement('div');
        modal.id = 'orders-modal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content glass-panel orders-modal-content">
                <div class="modal-header">
                    <h2>Órdenes pendientes</h2>
                    <div style="display:flex;gap:8px;align-items:center">
                        <button class="btn secondary-btn orders-refresh" title="Actualizar"><i data-lucide="refresh-cw"></i> Actualizar</button>
                        <button class="icon-btn orders-close"><i data-lucide="x"></i></button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="orders-status"></div>
                    <div class="orders-list"></div>
                    <div class="orders-footer">
                        <label class="orders-check"><input type="checkbox" class="orders-show-answered"> Mostrar también las ya respondidas</label>
                        <details class="orders-senders">
                            <summary>Remitentes <span class="senders-count"></span></summary>
                            <p class="small-text">Marca los remitentes cuyos correos son órdenes para informar. Los desmarcados no aparecen en la lista ni en el contador.</p>
                            <div class="senders-list"></div>
                            <div class="senders-actions">
                                <label class="orders-check"><input type="checkbox" class="senders-new"> Mostrar automáticamente remitentes nuevos</label>
                                <span style="flex:1"></span>
                                <button class="btn secondary-btn" data-senders="all">Marcar todos</button>
                                <button class="btn secondary-btn" data-senders="none">Desmarcar todos</button>
                            </div>
                        </details>
                        <details class="orders-advanced">
                            <summary>Búsqueda avanzada</summary>
                            <p class="small-text">Filtro de Gmail usado para listar las órdenes:</p>
                            <div style="display:flex;gap:8px">
                                <input type="text" class="orders-query" style="flex:1">
                                <button class="btn secondary-btn orders-query-reset" title="Volver al filtro por defecto">Restablecer</button>
                            </div>
                        </details>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);
        listEl = modal.querySelector('.orders-list');
        statusEl = modal.querySelector('.orders-status');
        showAnsweredEl = modal.querySelector('.orders-show-answered');
        queryEl = modal.querySelector('.orders-query');
        sendersEl = modal.querySelector('.orders-senders');
        const afterSendersChange = () => { renderStatus(); renderList(); renderSenders(); updateBadge(); };
        sendersEl.addEventListener('change', (e) => {
            const cb = e.target.closest('[data-sender]');
            if (cb) { setSenderShown(cb.dataset.sender, cb.checked); afterSendersChange(); return; }
            if (e.target.classList.contains('senders-new')) {
                const v = loadSenders(); v.newDefault = e.target.checked; saveSenders(v); renderSenders();
            }
        });
        sendersEl.addEventListener('click', (e) => {
            const b = e.target.closest('[data-senders]');
            if (!b) return;
            e.preventDefault();
            const v = loadSenders();
            Object.values(v.list).forEach(x => { x.show = b.dataset.senders === 'all'; });
            saveSenders(v);
            afterSendersChange();
        });
        queryEl.value = safeGet(QUERY_KEY) || DEFAULT_QUERY;
        modal.querySelector('.orders-close').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        modal.querySelector('.orders-refresh').addEventListener('click', () => refresh(true));
        showAnsweredEl.addEventListener('change', renderList);
        queryEl.addEventListener('change', () => { safeSet(QUERY_KEY, queryEl.value.trim() || DEFAULT_QUERY); refresh(true); });
        modal.querySelector('.orders-query-reset').addEventListener('click', () => { queryEl.value = DEFAULT_QUERY; safeDel(QUERY_KEY); refresh(true); });
        listEl.addEventListener('click', (e) => {
            const h = e.target.closest('[data-hide]');
            if (h) {
                const email = h.dataset.hide;
                const o = orders.find(x => x.fromEmail === email);
                setSenderShown(email, false);
                renderStatus(); renderList(); renderSenders(); updateBadge();
                toast(`Ocultos los correos de ${o ? o.fromName : email}. Puedes volver a mostrarlos en "Remitentes".`, 'info', 6000);
                return;
            }
            const b = e.target.closest('[data-open]');
            if (!b) return;
            const o = orders.find(x => x.threadId === b.dataset.open);
            if (o) openOrder(o);
        });

        // Chip de orden activa (sobre el área de dictado)
        chipEl = document.createElement('div');
        chipEl.id = 'active-order-chip';
        chipEl.hidden = true;
        const panel = document.querySelector('main.glass-panel');
        panel.insertBefore(chipEl, panel.firstChild);
        chipEl.addEventListener('click', (e) => {
            const act = e.target.closest('[data-chip]');
            if (!act) return;
            if (act.dataset.chip === 'close') {
                setActive(null);
                if (window.GTXWorkstation && window.GTXWorkstation.mode !== 'off') window.GTXWorkstation.openBoard('default', '');
            } else if (act.dataset.chip === 'name' && active && active.patient) {
                const ta = document.getElementById('transcription');
                if (ta && !ta.value.includes(active.patient)) {
                    ta.value = `Paciente: ${active.patient}. ` + ta.value;
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                }
            } else if (act.dataset.chip === 'board' && active && window.GTXWorkstation) {
                window.GTXWorkstation.openBoard('order:' + active.threadId, (active.patient || active.subject) + ' — ' + active.fromName, () => bajarImagenes(active.threadId));
            } else if (act.dataset.chip === 'etq' && active) {
                if (!insertarEtiqueta(active.threadId, true)) toast('El Dr(a). y la fecha ya están en el dictado.', 'info', 3000);
            }
        });
        renderChip();
        if (window.lucide) window.lucide.createIcons();
    }

    function renderChip() {
        if (!chipEl) return;
        if (!active) { chipEl.hidden = true; chipEl.innerHTML = ''; return; }
        chipEl.hidden = false;
        chipEl.innerHTML = `
            <i data-lucide="mail-open"></i>
            <div class="chip-text">
                <div class="chip-title">${esc(active.patient || active.subject)}</div>
                <div class="chip-sub">${esc(active.fromName)} · ${esc(active.subject)}</div>
            </div>
            ${active.patient ? '<button data-chip="name" title="Escribir el nombre del paciente al inicio del dictado">Insertar nombre</button>' : ''}
            ${etiquetas[active.threadId] && (etiquetas[active.threadId].doctor || etiquetas[active.threadId].fecha) ? '<button data-chip="etq" title="Escribir al inicio del dictado el Dr(a). y la fecha leídos de la etiqueta de la orden">Insertar Dr(a). y fecha</button>' : ''}
            <button data-chip="board" title="Ver las imágenes de esta orden en el tablero"><i data-lucide="layout-panel-left"></i></button>
            <button data-chip="close" title="Cerrar esta orden (el botón Gmail volverá a buscar por nombre)"><i data-lucide="x"></i></button>`;
        if (window.lucide) window.lucide.createIcons({ root: chipEl });
    }

    function renderList() {
        const show = showAnsweredEl.checked;
        const list = visibleOrders().filter(o => show || !o.answered);
        if (!list.length) {
            listEl.innerHTML = `<div class="orders-empty">${orders.length ? 'No hay órdenes pendientes de los remitentes seleccionados 🎉' : 'Sin correos que coincidan con el filtro.'}</div>`;
            return;
        }
        listEl.innerHTML = list.map(o => o.batch ? `
            <div class="order-row lote ${o.answered ? 'answered' : ''}" style="border-color:rgba(168,85,247,.45)">
                <div class="order-main">
                    <div class="order-top">
                        <span class="order-patient">📦 Lote · ${esc(o.subject)}</span>
                        <span class="order-date">${esc(relTime(o.date))}</span>
                        <button class="order-hide" data-hide="${esc(o.fromEmail)}" title="No mostrar más correos de ${esc(o.fromName)} (${esc(o.fromEmail)})"><i data-lucide="eye-off"></i></button>
                    </div>
                    <div class="order-from">${esc(o.fromName)} · varios pacientes</div>
                    <div class="order-snippet" ${o.faltan && o.faltan.length ? 'style="color:#fbbf24"' : ''}>${esc(o.snippet)}</div>
                </div>
                <div class="order-side">
                    <span class="order-imgs" title="${esc(o.attDetail)}">${o.nImages} img</span>
                    ${o.answered ? '<span class="order-done">Enviado</span>' : ''}
                    <button class="btn primary-btn" data-open="${esc(o.threadId)}">Abrir lote</button>
                </div>
            </div>` : `
            <div class="order-row ${o.answered ? 'answered' : ''} ${active && active.threadId === o.threadId ? 'is-active' : ''}">
                <div class="order-main">
                    <div class="order-top">
                        <span class="order-patient">${esc(o.patient || o.subject)}</span>
                        <span class="order-date">${esc(relTime(o.date))}</span>
                        <button class="order-hide" data-hide="${esc(o.fromEmail)}" title="No mostrar más correos de ${esc(o.fromName)} (${esc(o.fromEmail)})"><i data-lucide="eye-off"></i></button>
                    </div>
                    <div class="order-from">${esc(o.fromName)}${o.patient ? ' · ' + esc(o.subject) : ''}</div>
                    <div class="order-snippet">${esc(o.snippet)}</div>
                </div>
                <div class="order-side">
                    <span class="order-imgs" title="${esc(o.attDetail || 'Imágenes adjuntas')}">${o.nImages} img${o.nUnsupported ? ` <em title="Formato no compatible">+${o.nUnsupported}</em>` : ''}</span>
                    ${o.answered ? '<span class="order-done">Respondida</span>' : ''}
                    <button class="btn primary-btn" data-open="${esc(o.threadId)}">Abrir</button>
                </div>
            </div>`).join('');
        if (window.lucide) window.lucide.createIcons({ root: listEl });
    }

    function renderStatus() {
        if (!statusEl) return;
        const n = visibleOrders().filter(o => !o.answered).length;
        const hidden = orders.filter(o => !o.answered && !isShown(o)).length;
        statusEl.textContent = `${n} pendiente(s) · cuenta ${myEmail}` + (hidden ? ` · ${hidden} oculta(s) por remitente` : '');
    }

    function renderSenders() {
        if (!sendersEl) return;
        const v = loadSenders();
        const counts = {};
        orders.forEach(o => { counts[o.fromEmail] = (counts[o.fromEmail] || 0) + 1; });
        const emails = Object.keys(v.list).sort((a, b) => (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b));
        sendersEl.querySelector('.senders-count').textContent = `${emails.filter(e => v.list[e].show !== false).length} de ${emails.length} visibles`;
        sendersEl.querySelector('.senders-new').checked = v.newDefault;
        sendersEl.querySelector('.senders-list').innerHTML = emails.length ? emails.map(e => `
            <label class="sender-row">
                <input type="checkbox" data-sender="${esc(e)}" ${v.list[e].show !== false ? 'checked' : ''}>
                <span class="sender-name">${esc(v.list[e].name || e)}</span>
                <span class="sender-email">${esc(e)}</span>
                <span class="sender-n">${counts[e] ? counts[e] + ' correo(s)' : ''}</span>
            </label>`).join('') : '<p class="small-text">Aún no hay remitentes. Presiona Actualizar.</p>';
    }

    function updateBadge() {
        if (!badgeEl) return;
        const n = visibleOrders().filter(o => !o.answered).length;
        badgeEl.textContent = n;
        badgeEl.hidden = n === 0;
    }

    let loading = false;
    async function refresh(interactive) {
        if (loading) return;
        loading = true;
        if (statusEl) statusEl.textContent = 'Buscando órdenes…';
        try {
            const ok = await ensureAuth(interactive);
            if (!ok) { if (statusEl) statusEl.textContent = 'Inicia sesión en Gmail para ver las órdenes.'; return; }
            orders = await fetchOrders();
            registerSenders(orders);
            renderStatus();
            renderList();
            renderSenders();
            updateBadge();
        } catch (e) {
            console.error('Órdenes:', e);
            if (statusEl) statusEl.textContent = 'Error: ' + (e.message || e.details || 'no se pudo leer Gmail');
        } finally {
            loading = false;
        }
    }

    function openModal() {
        modal.classList.remove('hidden');
        renderList();
        refresh(true);
    }
    function closeModal() { modal.classList.add('hidden'); }

    // ---------- Avisos no bloqueantes ----------
    let toastBox = null;
    function toast(msg, kind = 'info', ms = 4000) {
        if (!toastBox) {
            toastBox = document.createElement('div');
            toastBox.id = 'gtx-toasts';
            document.body.appendChild(toastBox);
        }
        const t = document.createElement('div');
        t.className = 'gtx-toast ' + kind;
        t.textContent = msg;
        toastBox.appendChild(t);
        setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms);
    }
    window.GTXToast = toast;

    // ---------- Inicio ----------
    buildUI();
    // Contador en segundo plano, solo si ya hay sesión de Gmail (nunca abre ventanas de login)
    function backgroundRefresh() { if (loadGmailToken && loadGmailToken()) refresh(false); }
    document.addEventListener('gmailReady', () => setTimeout(backgroundRefresh, 1500));
    setInterval(backgroundRefresh, 5 * 60 * 1000);

    window.GTXOrders = {
        get active() { return active; },
        getActiveThread,
        onSent,
        clearActive: () => setActive(null),
        refresh,
        openOrder,
        _guessPatient: guessPatient,
        _senders: loadSenders,
        _classify: classifyAttachments,
    };
})();
