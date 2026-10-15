/**
 * LOTES DE ÓRDENES (un correo con varios pacientes + Excel, a veces en varias partes)
 * ------------------------------------------------------------
 * Caso típico: "30-09-2026_DIEGO_LA CALERA_PARTE 1 DE 3", "… PARTE 2 DE 3", "… PARTE 3 DE 3".
 * Las imágenes de todos los pacientes vienen mezcladas entre las partes y el Excel en una de ellas.
 *
 * - La bandeja (orders.js) une las partes en una sola fila "Lote" y avisa si falta alguna.
 * - Al abrir el lote: se lee el Excel (pacientes, edad, exámenes, piezas, "Genera informe")
 *   y cada imagen se asigna a su paciente por el nombre del archivo
 *   ("Laura Bustamante Cepeda _Rx BWB_1.jpg" -> Laura Loreto Bustamante Cepeda).
 *   Lo que no calza queda en "Sin asignar" para asignarlo a mano.
 * - Por paciente: "Abrir" baja SOLO sus imágenes al tablero, escribe sus datos al inicio
 *   del dictado y selecciona la plantilla del remitente.
 * - Word o Gmail con un paciente del lote activo: el informe se guarda en el lote
 *   (el botón Gmail NO responde el correo). Al final, "Enviar informes" manda UN correo
 *   nuevo con todos los Word adjuntos.
 * - El avance (informes hechos) queda guardado en el navegador (IndexedDB).
 */
(function () {
    'use strict';

    const SENT_KEY = 'gtx_lotes_enviados';      // { claveLote: timestamp }
    const DEST_KEY = 'gtx_lotes_destino';       // { remitente: destinatario }
    const ACTIVE_KEY = 'gtx_lote_activo';       // { key, pid }
    const SENDER_TPL_KEY = 'gtx_sender_templates';
    const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    const IMG_EXT = /\.(jpe?g|png|gif|bmp|webp|avif)$/i;
    const SHEET_EXT = /\.(xlsx|xls|csv)$/i;
    const STOP = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'van', 'von']);

    const safeGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* noop */ } };
    const safeDel = (k) => { try { localStorage.removeItem(k); } catch (e) { /* noop */ } };
    const readJSON = (k, d) => { try { return JSON.parse(safeGet(k) || 'null') || d; } catch (e) { return d; } };
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const toast = (msg, kind, ms) => { if (window.GTXToast) window.GTXToast(msg, kind, ms); else console.log(msg); };

    // =====================================================================
    // Nombres
    // =====================================================================
    const toks = (s) => norm(s).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP.has(w));
    const idDe = (nombre) => toks(nombre).join('-');
    const titulo = (t) => String(t || '').trim().toLowerCase()
        .replace(/(^|[\s'´’-])(\p{L})/gu, (m, a, c) => a + c.toUpperCase())
        .replace(/\s(De|Del|La|Las|Los|Y)(?=\s)/g, (m, w) => ' ' + w.toLowerCase());

    /** "Laura Bustamante Cepeda _Rx BWB_1.jpg" -> "Laura Bustamante Cepeda" */
    function nombreDeArchivo(fn) {
        let b = String(fn || '').replace(/\.[a-z0-9]{2,5}$/i, '');
        const i = b.indexOf('_');
        if (i > 0) b = b.slice(0, i);
        const j = b.search(/\s(rx|radiograf)/i);
        if (j > 0) b = b.slice(0, j);
        return b.replace(/\s+/g, ' ').trim();
    }
    /** La foto de la orden viene con el nombre completo y sin "_Rx…". */
    const esOrden = (fn) => {
        const b = String(fn || '').replace(/\.[a-z0-9]{2,5}$/i, '');
        return !b.includes('_') && !/\brx\b/i.test(b);
    };

    /** Paciente cuyo nombre contiene las palabras del archivo (tolera 1 palabra distinta). null si es ambiguo. */
    function mejorPaciente(fn, lista) {
        const ft = toks(nombreDeArchivo(fn));
        if (ft.length < 2) return null;
        let best = null, bestScore = -Infinity, empate = false;
        for (const p of lista) {
            const pt = new Set(toks(p.nombre));
            const ok = ft.filter(t => pt.has(t)).length;
            const miss = ft.length - ok;
            if (ok < 2 || miss > 1 || ok <= miss) continue;
            const score = ok * 2 - miss * 3 - Math.abs(pt.size - ft.length) * 0.1;
            if (score > bestScore + 1e-9) { best = p; bestScore = score; empate = false; }
            else if (Math.abs(score - bestScore) < 1e-9) empate = true;
        }
        return empate ? null : best;
    }

    // =====================================================================
    // Asunto / detección de lotes (usado por orders.js)
    // =====================================================================
    const PART_RE = /[\s_\-–]*parte\s*(\d+)\s*(?:de|\/)\s*(\d+)\s*$/i;
    function infoAsunto(subject) {
        let s = String(subject || '').replace(/^\s*((re|rv|fw|fwd|reenviar|reenviado|enc)\s*:\s*)+/i, '').trim();
        const m = PART_RE.exec(s);
        if (m) s = s.slice(0, m.index).trim();
        return { base: s, parte: m ? +m[1] : 0, total: m ? +m[2] : 0 };
    }
    const clave = (fromEmail, base) => String(fromEmail || '').toLowerCase() + '|' + norm(base).replace(/\s+/g, ' ').trim();
    /** ¿Este correo es (parte de) un lote? Sí si el asunto dice "PARTE n DE m" o trae un Excel. */
    function esLote(subject, filenames) {
        const ia = infoAsunto(subject);
        const hasSheet = (filenames || []).some(f => SHEET_EXT.test(f || ''));
        return (ia.total > 1 || hasSheet) ? { ...ia, hasSheet } : null;
    }
    const enviados = () => readJSON(SENT_KEY, {});
    const enviado = (key) => !!enviados()[key];

    // =====================================================================
    // Excel
    // =====================================================================
    let xlsxPromise = null;
    function cargarXLSX() {
        if (window.XLSX) return Promise.resolve();
        if (!xlsxPromise) {
            xlsxPromise = new Promise((res, rej) => {
                const s = document.createElement('script');
                s.src = XLSX_URL;
                s.onload = res;
                s.onerror = () => { xlsxPromise = null; rej(new Error('no se pudo cargar el lector de Excel')); };
                document.head.appendChild(s);
            });
        }
        return xlsxPromise;
    }

    const limpiarObs = (o) => String(o || '')
        .replace(/sin placa impresa\.?/ig, '')
        .replace(/se env[ií]a formato digital de manera inmediata\.?/ig, '')
        .replace(/^[\s/.,;-]+|[\s/.,;-]+$/g, '')
        .trim();

    /** Lee el Excel del centro. Devuelve { fecha, pacientes:[{ n, nombre, fechaNac, edad, examenes:[…], informar }] } */
    function leerExcel(buf, XL) {
        XL = XL || window.XLSX;
        const wb = XL.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XL.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
            .map(r => r.map(c => String(c == null ? '' : c).replace(/\s+/g, ' ').trim()));

        let fecha = '';
        for (const r of rows.slice(0, 15)) {
            const i = r.findIndex(c => /^fecha:?$/i.test(c));
            if (i >= 0) { fecha = r.slice(i + 1).find(Boolean) || ''; break; }
        }
        const hi = rows.findIndex(r => r.some(c => /nombre/i.test(c) && /paciente/i.test(c)) || r.some(c => /^nombre$/i.test(c)));
        if (hi < 0) throw new Error('no encontré la columna "Nombre Paciente"');
        const prev = rows[hi - 1] || [];
        const width = Math.max(rows[hi].length, prev.length);
        const H = [];
        for (let j = 0; j < width; j++) H.push(((rows[hi][j] || '') + ' ' + (prev[j] || '')).toLowerCase().trim());
        const col = (re) => H.findIndex(h => re.test(h));
        const c = {
            n: H.findIndex(h => /^(n[°ºo.]?|nro\.?|num(ero)?\.?|#)$/.test(h.replace(/\s+/g, ''))),
            nombre: col(/nombre/),
            nac: col(/nac/),
            edad: col(/edad/),
            tipo: col(/tipo/),
            cant: col(/cantidad|cant\./),
            piezas: col(/pieza|diente/),
            obs: col(/observ/),
            inf: col(/genera/),
        };
        const get = (r, k) => (c[k] >= 0 ? (r[c[k]] || '') : '');

        const pacientes = [];
        const porId = new Map();
        for (const r of rows.slice(hi + 1)) {
            const nombre = get(r, 'nombre');
            if (!nombre || /nombre/i.test(nombre) || toks(nombre).length < 2) continue;
            const id = idDe(nombre);
            let p = porId.get(id);
            if (!p) {
                p = { n: get(r, 'n'), nombre: titulo(nombre), fechaNac: get(r, 'nac'), edad: get(r, 'edad'), examenes: [], informar: false };
                porId.set(id, p);
                pacientes.push(p);
            }
            const inf = get(r, 'inf');
            const ex = { tipo: get(r, 'tipo'), cantidad: get(r, 'cant'), piezas: get(r, 'piezas'), obs: limpiarObs(get(r, 'obs')), informar: !/^no\b/i.test(inf) };
            if (ex.tipo || ex.piezas) p.examenes.push(ex);
            if (ex.informar) p.informar = true;
            if (!p.edad) p.edad = get(r, 'edad');
        }
        pacientes.forEach(p => { if (!p.examenes.length) p.informar = true; });
        return { fecha, pacientes };
    }

    // =====================================================================
    // Agrupar archivos por paciente
    // =====================================================================
    function nuevoPaciente(base, enExcel) {
        return {
            id: idDe(base.nombre), n: base.n || '', nombre: base.nombre, fechaNac: base.fechaNac || '', edad: base.edad || '',
            examenes: base.examenes || [], enExcel, archivos: [],
            estado: base.informar === false ? 'no' : 'pendiente', informe: null,
        };
    }

    /** files: [{ filename, tipo:'img'|'pdf', … }] */
    function agrupar(baseExcel, files) {
        const pacientes = (baseExcel || []).map(p => nuevoPaciente(p, true));
        const resto = [];
        for (const f of files) {
            const p = mejorPaciente(f.filename, pacientes);
            if (p) p.archivos.push(f); else resto.push(f);
        }
        // Fotos de orden / PDF con nombre completo que no están en el Excel -> paciente extra
        const sueltos = [];
        for (const f of resto) {
            if (esOrden(f.filename) && toks(nombreDeArchivo(f.filename)).length >= 2) {
                const nombre = titulo(nombreDeArchivo(f.filename));
                let p = mejorPaciente(f.filename, pacientes.filter(x => !x.enExcel)) ||
                    pacientes.find(x => x.id === idDe(nombre));
                if (!p) { p = nuevoPaciente({ nombre }, false); pacientes.push(p); }
                p.archivos.push(f);
            } else sueltos.push(f);
        }
        let sinAsignar = [];
        for (const f of sueltos) {
            const p = mejorPaciente(f.filename, pacientes);
            if (p) p.archivos.push(f); else sinAsignar.push(f);
        }
        // Sin Excel: lo que quede se agrupa por el nombre del propio archivo
        if (!(baseExcel || []).length && sinAsignar.length) {
            const quedan = [];
            for (const f of sinAsignar) {
                const nombre = titulo(nombreDeArchivo(f.filename));
                if (toks(nombre).length < 2) { quedan.push(f); continue; }
                let p = mejorPaciente(f.filename, pacientes);
                if (!p) { p = nuevoPaciente({ nombre }, false); pacientes.push(p); }
                p.archivos.push(f);
            }
            sinAsignar = quedan;
        }
        // Orden de la lista: N° del Excel y luego los extra
        const num = (p) => { const x = parseInt(p.n, 10); return isNaN(x) ? 9999 : x; };
        pacientes.sort((a, b) => (a.enExcel === b.enExcel ? 0 : a.enExcel ? -1 : 1) || num(a) - num(b));
        return { pacientes, sinAsignar };
    }

    // =====================================================================
    // Texto con los datos del paciente (va al inicio del dictado)
    // =====================================================================
    const unir = (xs) => xs.length <= 1 ? (xs[0] || '') : xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1];
    function descExamen(e) {
        const t = norm(e.tipo);
        const piezas = (String(e.piezas || '').match(/\d\s*\.\s*\d/g) || []).map(x => x.replace(/\s/g, ''));
        const conPiezas = (s) => s + (piezas.length ? (piezas.length > 1 ? ' dientes ' : ' diente ') + unir(piezas) : '');
        if (/pan/.test(t)) return 'Radiografía panorámica';
        if (/periap/.test(t)) return conPiezas('Radiografía periapical');
        if (/bwb|bilat/.test(t)) return 'Radiografía bite-wing bilateral';
        if (/\bbw|bite/.test(t)) return conPiezas('Radiografía bite-wing');
        if (/tele|t\.?\s*lat|lateral/.test(t)) return 'Telerradiografía lateral';
        if (/cbct|cone|tomog/.test(t)) return conPiezas('CBCT');
        if (/atm/.test(t)) return 'Estudio de ATM';
        return conPiezas(e.tipo || '');
    }
    function estudios(p) {
        return [...new Set((p.examenes || []).filter(e => e.informar !== false).map(descExamen).filter(Boolean))];
    }
    function textoDatos(p) {
        const partes = [`Paciente: ${p.nombre}.`];
        if (p.edad) partes.push(`Edad: ${p.edad}.`);
        const est = estudios(p);
        if (est.length) partes.push(`Tipo de estudio: ${unir(est)}.`);
        return partes.join(' ') + '\n';
    }

    // =====================================================================
    // Almacenamiento (IndexedDB)
    // =====================================================================
    let dbp = null;
    function db() {
        if (!dbp) {
            dbp = new Promise((res, rej) => {
                const r = indexedDB.open('gtx-lotes', 1);
                r.onupgradeneeded = () => r.result.createObjectStore('lotes', { keyPath: 'key' });
                r.onsuccess = () => res(r.result);
                r.onerror = () => rej(r.error);
            });
        }
        return dbp;
    }
    async function dbGet(key) {
        const d = await db();
        return new Promise((res, rej) => {
            const q = d.transaction('lotes').objectStore('lotes').get(key);
            q.onsuccess = () => res(q.result || null);
            q.onerror = () => rej(q.error);
        });
    }
    async function dbPut(rec) {
        const d = await db();
        return new Promise((res, rej) => {
            const tx = d.transaction('lotes', 'readwrite');
            tx.objectStore('lotes').put(rec);
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
        });
    }

    // =====================================================================
    // Gmail
    // =====================================================================
    async function asegurarGmail() {
        if (typeof gapi === 'undefined' || !gapi.client || !gapi.client.gmail) {
            throw new Error('Google todavía no termina de cargar. Espera unos segundos y vuelve a intentar.');
        }
        await authenticateGmail();
    }
    function walk(part, out) {
        if (!part) return out;
        if (part.parts) part.parts.forEach(p => walk(p, out));
        if (part.body && part.body.attachmentId && part.filename) out.push(part);
        return out;
    }
    const b64urlToBytes = (data) => {
        const bin = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
    };
    async function bajar(a) {
        const get = (attId) => gapi.client.gmail.users.messages.attachments.get({ userId: 'me', messageId: a.msgId, id: attId });
        let r;
        try { r = await get(a.attId); }
        catch (e) {
            // Gmail puede cambiar el id del adjunto: se vuelve a leer el mensaje
            const m = (await gapi.client.gmail.users.messages.get({ userId: 'me', id: a.msgId })).result;
            const p = walk(m.payload, []).find(x => x.filename === a.filename);
            if (!p) throw e;
            a.attId = p.body.attachmentId;
            r = await get(a.attId);
        }
        return b64urlToBytes(r.result.data);
    }
    function mimeDe(a) {
        if (a.mime && a.mime !== 'application/octet-stream') return a.mime;
        const ext = (a.filename.split('.').pop() || '').toLowerCase();
        return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', avif: 'image/avif', pdf: 'application/pdf' }[ext] || 'application/octet-stream';
    }
    async function bajarImagenes(lista) {
        const files = new Array(lista.length);
        let i = 0;
        const worker = async () => {
            while (i < lista.length) {
                const k = i++;
                try { files[k] = new File([await bajar(lista[k])], lista[k].filename, { type: mimeDe(lista[k]) }); }
                catch (e) { console.error('No se pudo bajar', lista[k].filename, e); }
            }
        };
        await Promise.all([worker(), worker(), worker()]);
        return files.filter(Boolean);
    }

    // =====================================================================
    // Construir el lote desde los correos
    // =====================================================================
    async function construir(o, previo) {
        await asegurarGmail();
        const archivos = [];
        const vistos = new Set();
        for (const id of o.threadIds) {
            const t = (await gapi.client.gmail.users.threads.get({ userId: 'me', id })).result;
            for (const m of (t.messages || [])) {
                for (const p of walk(m.payload, [])) {
                    const fn = p.filename;
                    const size = (p.body && p.body.size) || 0;
                    const sig = fn.toLowerCase() + '|' + size;      // la misma imagen repetida en dos partes
                    if (vistos.has(sig)) continue;
                    vistos.add(sig);
                    let tipo = null;
                    if (IMG_EXT.test(fn) || /^image\//i.test(p.mimeType || '')) tipo = (size && size < 6000) ? null : 'img';
                    else if (SHEET_EXT.test(fn)) tipo = 'sheet';
                    else if (/\.pdf$/i.test(fn)) tipo = 'pdf';
                    if (!tipo) continue;
                    archivos.push({ threadId: id, msgId: m.id, attId: p.body.attachmentId, filename: fn, size, mime: p.mimeType || '', tipo });
                }
            }
        }
        let excel = null, errorExcel = '';
        const hojas = archivos.filter(a => a.tipo === 'sheet');
        for (const h of hojas) {
            try {
                await cargarXLSX();
                excel = leerExcel((await bajar(h)).buffer);
                if (excel.pacientes.length) break;
            } catch (e) { console.warn('Excel', h.filename, e); errorExcel = e.message || String(e); }
        }
        const { pacientes, sinAsignar } = agrupar(excel ? excel.pacientes : [], archivos.filter(a => a.tipo === 'img' || a.tipo === 'pdf'));
        if (previo) {
            // Conservar los informes ya hechos y las asignaciones manuales
            for (const p of pacientes) {
                const q = (previo.pacientes || []).find(x => x.id === p.id);
                if (q && q.informe) { p.informe = q.informe; p.estado = 'informado'; }
            }
            for (const q of (previo.pacientes || [])) {
                for (const f of (q.archivos || []).filter(f => f.manual)) {
                    const i = sinAsignar.findIndex(s => s.filename === f.filename);
                    const p = pacientes.find(x => x.id === q.id);
                    if (i >= 0 && p) p.archivos.push(...sinAsignar.splice(i, 1).map(s => ({ ...s, manual: true })));
                }
            }
        }
        return {
            key: o.loteKey, asunto: o.subject, fromEmail: o.fromEmail, fromName: o.fromName,
            threadIds: o.threadIds.slice(), total: o.total || 1, partes: o.partes || [], faltan: o.faltan || [],
            fecha: excel ? excel.fecha : '', conExcel: !!excel, errorExcel: excel ? '' : errorExcel,
            pacientes, sinAsignar, creado: Date.now(), enviado: previo ? previo.enviado || null : null,
        };
    }

    // =====================================================================
    // Estado activo
    // =====================================================================
    let actual = null;      // registro del lote abierto
    let activo = readJSON(ACTIVE_KEY, null);   // { key, pid }
    const pacienteActivo = () => (actual && activo && actual.key === activo.key) ? actual.pacientes.find(p => p.id === activo.pid) || null : null;
    function setActivo(a) {
        activo = a;
        if (a) safeSet(ACTIVE_KEY, JSON.stringify(a)); else safeDel(ACTIVE_KEY);
        renderChip();
    }

    async function abrir(o) {
        try {
            let rec = await dbGet(o.loteKey);
            const mismas = rec && rec.threadIds.length === o.threadIds.length && o.threadIds.every(id => rec.threadIds.includes(id));
            if (!rec || !mismas) {
                toast(rec ? 'Llegaron partes nuevas: releyendo el lote…' : 'Leyendo el lote (Excel e imágenes)…', 'info', 3500);
                rec = await construir(o, rec);
                await dbPut(rec);
            }
            actual = rec;
            mostrarLista();
            if (rec.errorExcel) toast('No se pudo leer el Excel (' + rec.errorExcel + '); los pacientes se armaron con los nombres de los archivos.', 'warn', 9000);
        } catch (e) {
            console.error('Lote:', e);
            toast('No se pudo abrir el lote: ' + (e.message || e.details || e), 'error', 8000);
        }
    }

    function plantillaRemitente() {
        const tpl = readJSON(SENDER_TPL_KEY, {})[actual && actual.fromEmail];
        const sel = document.getElementById('template-select');
        if (!tpl || !sel || ![...sel.options].some(x => x.value === tpl)) return false;
        if (sel.value !== tpl) { sel.value = tpl; sel.dispatchEvent(new Event('change', { bubbles: true })); }
        return true;
    }

    async function abrirPaciente(pid) {
        if (!actual) return;
        const p = actual.pacientes.find(x => x.id === pid);
        if (!p) return;
        if (window.GTXOrders && window.GTXOrders.clearActive) window.GTXOrders.clearActive();
        setActivo({ key: actual.key, pid });
        cerrarLista();
        plantillaRemitente();

        const ta = document.getElementById('transcription');
        if (ta && !ta.value.trim()) {
            ta.value = textoDatos(p);
            ta.dispatchEvent(new Event('input', { bubbles: true }));
            ta.focus();
            ta.setSelectionRange(ta.value.length, ta.value.length);
        } else if (ta) {
            toast('El cuadro de texto ya tiene contenido: usa "Insertar datos" si quieres agregar los del paciente.', 'warn', 6000);
        }

        const imgs = p.archivos.filter(a => a.tipo === 'img');
        if (window.GTXWorkstation && imgs.length) {
            try {
                const n = await window.GTXWorkstation.openBoard('lote:' + actual.key + ':' + p.id, p.nombre + ' — ' + actual.asunto, () => {
                    toast(`Bajando ${imgs.length} imagen(es) de ${p.nombre}…`, 'info', 2500);
                    return bajarImagenes(imgs);
                });
                if (n) toast(`${n} imagen(es) en el tablero`, 'ok', 2500);
            } catch (e) {
                console.error(e);
                toast('No se pudieron bajar las imágenes: ' + (e.message || e), 'error', 7000);
            }
        } else if (!imgs.length) {
            toast(`${p.nombre}: no hay imágenes en las partes recibidas` + (actual.faltan.length ? ' (puede venir en la parte que falta).' : '.'), 'warn', 7000);
        }
        if (p.archivos.some(a => a.tipo === 'pdf')) toast('Este paciente tiene un PDF adjunto: ábrelo desde la lista del lote.', 'info', 6000);
    }

    function siguiente() {
        if (!actual) return;
        const lista = actual.pacientes;
        const i = Math.max(0, lista.findIndex(p => activo && p.id === activo.pid));
        for (let k = 1; k <= lista.length; k++) {
            const p = lista[(i + k) % lista.length];
            if (p.estado === 'pendiente') return abrirPaciente(p.id);
        }
        toast('No quedan pacientes pendientes en el lote. Puedes enviar los informes.', 'ok', 5000);
        mostrarLista();
    }

    /** Llamar desde Word/Gmail con un paciente del lote activo. true si quedó guardado. */
    async function guardarInforme(docData) {
        const p = pacienteActivo();
        if (!p || !docData || !docData.blob) return false;
        const enInforme = new Set(toks(docData.patientName));
        const coincide = toks(p.nombre).filter(t => enInforme.has(t)).length >= 2;
        if (!coincide && !confirm(`El informe es de "${docData.patientName}", pero el paciente activo del lote es "${p.nombre}".\n\n¿Guardarlo igual como informe de ${p.nombre}?`)) {
            toast('No se guardó en el lote.', 'warn');
            return false;
        }
        const nombreArchivo = String(docData.fileNameBase || p.nombre).replace(/[\\/:*?"<>|]/g, '').trim() + '.docx';
        p.informe = { filename: nombreArchivo, blob: docData.blob, ts: Date.now() };
        p.estado = 'informado';
        // Recordar la plantilla usada con este remitente (como hace la bandeja)
        const sel = document.getElementById('template-select');
        if (sel && sel.value && actual.fromEmail) {
            const map = readJSON(SENDER_TPL_KEY, {});
            map[actual.fromEmail] = sel.value;
            safeSet(SENDER_TPL_KEY, JSON.stringify(map));
        }
        await dbPut(actual);
        renderChip();
        const pend = actual.pacientes.filter(x => x.estado === 'pendiente').length;
        toast(pend ? `Informe de ${p.nombre} guardado en el lote · quedan ${pend}. Usa "Siguiente".` : 'Último informe guardado. Ya puedes enviar el lote.', 'ok', 6000);
        return true;
    }

    /**
     * Reemplaza el Word guardado de un paciente de un lote (lo usa la revisión de tanda al
     * aplicar una corrección). Devuelve 'ok', 'enviado' (el lote ya salió) o 'no-encontrado'.
     */
    async function reemplazarInforme(key, pid, docData) {
        const rec = (actual && actual.key === key) ? actual : await dbGet(key);
        const p = rec && rec.pacientes.find(x => x.id === pid);
        if (!p || !p.informe) return 'no-encontrado';
        p.informe = { filename: p.informe.filename, blob: docData.blob, ts: Date.now() };
        await dbPut(rec);
        if (actual && actual.key === key) actual = rec;
        return rec.enviado ? 'enviado' : 'ok';
    }

    // =====================================================================
    // Envío: correo NUEVO con todos los Word
    // =====================================================================
    const b64utf8 = (s) => btoa(unescape(encodeURIComponent(s)));
    const encWord = (s) => /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64utf8(s)}?=`;
    const wrap76 = (s) => s.replace(/.{1,76}/g, '$&\r\n');
    async function blobB64(blob) {
        const ab = typeof blob.arrayBuffer === 'function' ? await blob.arrayBuffer()
            : await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsArrayBuffer(blob); });
        const buf = new Uint8Array(ab);
        let bin = '';
        for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
        return btoa(bin);
    }
    async function armarCorreo(to, asunto, cuerpo, informes) {
        const bnd = 'gtx-lote-' + Date.now().toString(36);
        const out = [
            `To: ${to}`,
            `Subject: ${encWord(asunto)}`,
            'MIME-Version: 1.0',
            `Content-Type: multipart/mixed; boundary="${bnd}"`,
            '',
            `--${bnd}`,
            'Content-Type: text/plain; charset="UTF-8"',
            'Content-Transfer-Encoding: base64',
            '',
            wrap76(b64utf8(cuerpo || '')),
        ];
        const usados = new Set();
        for (const inf of informes) {
            let fn = inf.filename;
            for (let k = 2; usados.has(fn.toLowerCase()); k++) fn = inf.filename.replace(/\.docx$/i, ` (${k}).docx`);
            usados.add(fn.toLowerCase());
            out.push(
                `--${bnd}`,
                `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document; name="${encWord(fn)}"`,
                `Content-Disposition: attachment; filename="${encWord(fn)}"`,
                'Content-Transfer-Encoding: base64',
                '',
                wrap76(await blobB64(inf.blob)),
            );
        }
        out.push(`--${bnd}--`, '');
        return out.join('\r\n');
    }

    async function enviar() {
        if (!actual || !modal) return;
        const to = modal.querySelector('[data-le="to"]').value.trim();
        const asunto = modal.querySelector('[data-le="asunto"]').value.trim();
        const cuerpo = modal.querySelector('[data-le="cuerpo"]').value;
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to.split(',')[0].trim())) { toast('Escribe el correo de destino.', 'warn'); return; }
        const listos = actual.pacientes.filter(p => p.informe && p.estado === 'informado');
        if (!listos.length) { toast('Todavía no hay informes guardados en el lote.', 'warn'); return; }
        const pend = actual.pacientes.filter(p => p.estado === 'pendiente');
        if (pend.length && !confirm(`Faltan ${pend.length} paciente(s) por informar:\n${pend.map(p => '• ' + p.nombre).join('\n')}\n\n¿Enviar igual los ${listos.length} informe(s) listos?`)) return;
        // Revisión de tanda: avisar si hay informes de este lote que todavía no se revisaron
        if (window.GTXTanda) {
            try {
                const sinRevisar = await window.GTXTanda.pendientesDeLote(actual.key);
                if (sinRevisar.length && !confirm(`Hay ${sinRevisar.length} informe(s) de este lote sin pasar por "Revisar tanda":\n${sinRevisar.map(n => '• ' + n).join('\n')}\n\n¿Enviar igual?`)) return;
            } catch (e) { /* noop */ }
        }
        if (actual.enviado && !confirm(`Este lote ya se envió el ${new Date(actual.enviado.ts).toLocaleString('es-CL')} a ${actual.enviado.to}. ¿Enviarlo otra vez?`)) return;
        if (!confirm(`Se enviará un correo NUEVO a:\n${to}\n\nAsunto: ${asunto}\nAdjuntos: ${listos.length} informe(s) Word\n\n¿Enviar?`)) return;

        const btn = modal.querySelector('[data-lm="enviar"]');
        const txt = btn.textContent;
        btn.disabled = true; btn.textContent = 'Enviando…';
        try {
            await asegurarGmail();
            const raw = await armarCorreo(to, asunto, cuerpo, listos.map(p => p.informe));
            const tok = gapi.client.getToken();
            const resp = await fetch('https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=media', {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + (tok && tok.access_token), 'Content-Type': 'message/rfc822' },
                body: raw,
            });
            if (resp.status === 401 || resp.status === 403) {
                safeDel('gmail_access_token');
                throw new Error('la sesión de Gmail expiró o no tiene permisos. Vuelve a presionar "Enviar" e inicia sesión con drgtinformes@gmail.com');
            }
            if (!resp.ok) {
                let m = 'HTTP ' + resp.status;
                try { const j = await resp.json(); m = (j.error && j.error.message) || m; } catch (e) { /* noop */ }
                throw new Error(m);
            }
            actual.enviado = { ts: Date.now(), to, n: listos.length };
            await dbPut(actual);
            const s = enviados(); s[actual.key] = Date.now(); safeSet(SENT_KEY, JSON.stringify(s));
            const d = readJSON(DEST_KEY, {}); d[actual.fromEmail] = to; safeSet(DEST_KEY, JSON.stringify(d));
            if (activo && activo.key === actual.key) setActivo(null);
            toast(`Lote enviado: ${listos.length} informe(s) a ${to}.`, 'ok', 7000);
            cerrarLista();
            if (window.GTXOrders && window.GTXOrders.refresh) window.GTXOrders.refresh(false);
        } catch (e) {
            console.error('Envío del lote:', e);
            alert('No se pudo enviar el lote: ' + (e.message || e));
        } finally {
            btn.disabled = false; btn.textContent = txt;
        }
    }

    // =====================================================================
    // UI
    // =====================================================================
    let modal = null, chipEl = null;

    function css() {
        const st = document.createElement('style');
        st.textContent = `
#lote-chip{display:flex;align-items:center;gap:8px;padding:8px 10px 8px 12px;margin-bottom:14px;border-radius:12px;background:rgba(168,85,247,.10);border:1px solid rgba(168,85,247,.45);flex-wrap:wrap}
#lote-chip[hidden]{display:none}
#lote-chip>svg{width:18px;height:18px;color:#d8b4fe;flex:0 0 auto}
#lote-chip .chip-text{flex:1;min-width:180px}
#lote-chip .chip-title{font-weight:600;font-size:.92rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#lote-chip .chip-sub{font-size:.76rem;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#lote-chip button{display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.06);border:1px solid var(--glass-border);color:var(--text-primary);border-radius:8px;padding:5px 9px;font:500 .78rem 'Outfit',sans-serif;cursor:pointer;white-space:nowrap}
#lote-chip button:hover{background:rgba(255,255,255,.12)}
#lote-chip button svg{width:15px;height:15px}
#lote-chip .done{color:#86efac;font-size:.78rem;white-space:nowrap}
.lote-modal-content{max-width:860px}
.lote-row.informado{opacity:.62}
.lote-row.no{opacity:.45}
.lote-row.is-active{border-color:rgba(168,85,247,.75)}
.lote-n{display:inline-block;min-width:26px;color:var(--text-secondary);font-weight:500}
.lote-estado{font-size:.74rem;white-space:nowrap}
.lote-estado.pendiente{color:#fbbf24}.lote-estado.informado{color:#86efac}.lote-estado.no{color:var(--text-secondary)}
.lote-extra{color:#fbbf24}
.lote-side-btns{display:flex;gap:6px}
.lote-side-btns .btn{padding:6px 14px;font-size:.82rem}
.lote-warn{margin:0 0 10px;padding:8px 12px;border-radius:10px;background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.45);font-size:.84rem}
.lote-warn:empty{display:none}
.lote-sueltos{margin-top:12px;font-size:.84rem}
.lote-sueltos h3,.lote-envio h3{font-size:.92rem;margin-bottom:6px}
.lote-suelto{display:flex;gap:8px;align-items:center;padding:4px 0;border-top:1px solid rgba(255,255,255,.06)}
.lote-suelto span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lote-suelto select,.lote-envio input,.lote-envio textarea{padding:6px 8px;background:rgba(15,23,42,.6);color:var(--text-primary);border:1px solid var(--glass-border);border-radius:8px;font:inherit;font-size:.84rem}
.lote-envio{margin-top:16px;padding-top:12px;border-top:1px solid var(--glass-border)}
.lote-envio .grid{display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:center;font-size:.84rem;color:var(--text-secondary)}
.lote-envio textarea{min-height:44px;resize:vertical}
.lote-envio .acciones{display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:10px;font-size:.8rem;color:var(--text-secondary)}
.lote-mini{background:transparent;border:1px solid var(--glass-border);color:var(--text-primary);border-radius:7px;padding:3px 8px;font:500 .74rem 'Outfit',sans-serif;cursor:pointer}
.lote-mini:hover{background:rgba(255,255,255,.1)}`;
        document.head.appendChild(st);
    }

    function buildUI() {
        css();
        modal = document.createElement('div');
        modal.id = 'lote-modal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content glass-panel orders-modal-content lote-modal-content">
                <div class="modal-header">
                    <h2 class="lote-title">Lote</h2>
                    <div style="display:flex;gap:8px;align-items:center">
                        <button class="btn secondary-btn" data-lm="releer" title="Volver a leer los correos y el Excel (conserva los informes hechos)"><i data-lucide="refresh-cw"></i> Releer</button>
                        <button class="icon-btn" data-lm="cerrar"><i data-lucide="x"></i></button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="orders-status lote-status"></div>
                    <div class="lote-warn"></div>
                    <div class="orders-list lote-list"></div>
                    <div class="lote-sueltos"></div>
                    <div class="lote-envio">
                        <h3>Enviar informes</h3>
                        <div class="grid">
                            <label>Para</label><input type="text" data-le="to" placeholder="correo@centro.cl">
                            <label>Asunto</label><input type="text" data-le="asunto">
                            <label>Mensaje</label><textarea data-le="cuerpo" placeholder="(opcional)"></textarea>
                        </div>
                        <div class="acciones">
                            <span class="lote-envio-info"></span>
                            <button class="btn primary-btn" data-lm="enviar">Enviar informes</button>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', onModalClick);
        modal.addEventListener('change', onModalChange);

        chipEl = document.createElement('div');
        chipEl.id = 'lote-chip';
        chipEl.hidden = true;
        const panel = document.querySelector('main.glass-panel');
        if (panel) panel.insertBefore(chipEl, panel.firstChild);
        chipEl.addEventListener('click', onChipClick);
    }

    function cerrarLista() { if (modal) modal.classList.add('hidden'); }

    function mostrarLista() {
        if (!modal || !actual) return;
        const L = actual;
        const pac = L.pacientes;
        const nInf = pac.filter(p => p.estado === 'informado').length;
        const nPend = pac.filter(p => p.estado === 'pendiente').length;
        modal.querySelector('.lote-title').textContent = 'Lote · ' + L.asunto;
        modal.querySelector('.lote-status').textContent =
            `${L.fromName || L.fromEmail}` + (L.total > 1 ? ` · ${L.partes.length} de ${L.total} partes` : '') +
            ` · ${pac.length} paciente(s) · ${nInf} informado(s) · ${nPend} pendiente(s)` + (L.fecha ? ` · fecha ${L.fecha}` : '') +
            (L.conExcel ? '' : ' · sin Excel');
        const warns = [];
        if (L.faltan && L.faltan.length) warns.push(`Falta(n) la(s) parte(s) ${L.faltan.join(', ')} de ${L.total}. Algunos pacientes pueden no tener imágenes todavía; cuando llegue, ábrelo de nuevo desde Órdenes.`);
        if (L.enviado) warns.push(`Ya enviado el ${new Date(L.enviado.ts).toLocaleString('es-CL')} a ${esc(L.enviado.to)} (${L.enviado.n} informe(s)).`);
        modal.querySelector('.lote-warn').innerHTML = warns.map(esc).join('<br>');

        modal.querySelector('.lote-list').innerHTML = pac.map(p => {
            const imgs = p.archivos.filter(a => a.tipo === 'img').length;
            const pdfs = p.archivos.filter(a => a.tipo === 'pdf');
            const est = estudios(p);
            const obs = [...new Set(p.examenes.map(e => e.obs).filter(Boolean))].join(' · ');
            const estado = p.estado === 'informado' ? 'Informado ✓' : p.estado === 'no' ? 'No requiere informe' : 'Pendiente';
            return `
            <div class="order-row lote-row ${p.estado} ${activo && activo.pid === p.id && activo.key === L.key ? 'is-active' : ''}">
                <div class="order-main">
                    <div class="order-top">
                        <span class="order-patient"><span class="lote-n">${esc(p.n)}</span>${esc(p.nombre)}</span>
                        <span class="order-date">${esc(p.edad)}</span>
                    </div>
                    <div class="order-from">${esc(est.join(' · ') || '(sin exámenes en el Excel)')}</div>
                    <div class="order-snippet">${imgs} imagen(es)${pdfs.length ? ` · ${pdfs.length} PDF` : ''}${obs ? ' · ' + esc(obs) : ''}${p.enExcel ? '' : ' · <span class="lote-extra">no está en el Excel</span>'}</div>
                </div>
                <div class="order-side">
                    <span class="lote-estado ${p.estado}">${estado}</span>
                    <div class="lote-side-btns">
                        ${pdfs.map((a, i) => `<button class="lote-mini" data-pdf="${esc(p.id)}" data-i="${i}" title="${esc(a.filename)}">PDF${pdfs.length > 1 ? ' ' + (i + 1) : ''}</button>`).join('')}
                        ${p.estado === 'no' ? `<button class="lote-mini" data-incluir="${esc(p.id)}">Informar igual</button>` : ''}
                        <button class="btn ${p.estado === 'pendiente' ? 'primary-btn' : 'secondary-btn'}" data-lp="${esc(p.id)}">${p.estado === 'informado' ? 'Reabrir' : 'Abrir'}</button>
                    </div>
                </div>
            </div>`;
        }).join('') || '<div class="orders-empty">No encontré pacientes en este lote.</div>';

        const sueltos = L.sinAsignar || [];
        const opciones = pac.map(p => `<option value="${esc(p.id)}">${esc(p.nombre)}</option>`).join('');
        modal.querySelector('.lote-sueltos').innerHTML = sueltos.length ? `
            <h3>Sin asignar (${sueltos.length})</h3>
            <p class="small-text">Archivos cuyo nombre no calza con ningún paciente del Excel.</p>
            ${sueltos.map((f, i) => `
                <div class="lote-suelto">
                    <span title="${esc(f.filename)}">${f.tipo === 'pdf' ? '📄' : '🖼'} ${esc(f.filename)}</span>
                    <select data-asignar="${i}">
                        <option value="">Asignar a…</option>
                        ${opciones}
                        <option value="__nuevo">+ Nuevo paciente: ${esc(titulo(nombreDeArchivo(f.filename)))}</option>
                    </select>
                </div>`).join('')}` : '';

        const dest = readJSON(DEST_KEY, {})[L.fromEmail] || L.fromEmail || '';
        const toEl = modal.querySelector('[data-le="to"]');
        const asEl = modal.querySelector('[data-le="asunto"]');
        if (modal.dataset.key !== L.key) {
            toEl.value = dest;
            asEl.value = 'Informes ' + L.asunto;
            modal.querySelector('[data-le="cuerpo"]').value = '';
            modal.dataset.key = L.key;
        }
        modal.querySelector('.lote-envio-info').textContent = `${nInf} informe(s) listo(s)` + (nPend ? ` · ${nPend} pendiente(s)` : '');
        modal.querySelector('[data-lm="enviar"]').textContent = `Enviar ${nInf} informe(s)`;
        modal.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons({ root: modal });
    }

    async function onModalClick(e) {
        if (e.target === modal) { cerrarLista(); return; }
        const lm = e.target.closest('[data-lm]');
        if (lm) {
            const a = lm.dataset.lm;
            if (a === 'cerrar') cerrarLista();
            else if (a === 'enviar') enviar();
            else if (a === 'releer' && actual) {
                try {
                    toast('Releyendo correos y Excel…', 'info', 3000);
                    const o = { loteKey: actual.key, subject: actual.asunto, fromEmail: actual.fromEmail, fromName: actual.fromName, threadIds: actual.threadIds, total: actual.total, partes: actual.partes, faltan: actual.faltan };
                    actual = await construir(o, actual);
                    await dbPut(actual);
                    mostrarLista();
                } catch (err) { toast('No se pudo releer: ' + (err.message || err), 'error', 7000); }
            }
            return;
        }
        const lp = e.target.closest('[data-lp]');
        if (lp) { abrirPaciente(lp.dataset.lp); return; }
        const inc = e.target.closest('[data-incluir]');
        if (inc && actual) {
            const p = actual.pacientes.find(x => x.id === inc.dataset.incluir);
            if (p) { p.estado = 'pendiente'; await dbPut(actual); mostrarLista(); }
            return;
        }
        const pdf = e.target.closest('[data-pdf]');
        if (pdf && actual) {
            const p = actual.pacientes.find(x => x.id === pdf.dataset.pdf);
            const a = p && p.archivos.filter(x => x.tipo === 'pdf')[Number(pdf.dataset.i)];
            if (!a) return;
            const w = window.open('', '_blank');
            try {
                await asegurarGmail();
                const url = URL.createObjectURL(new Blob([await bajar(a)], { type: 'application/pdf' }));
                if (w) w.location.href = url; else window.open(url, '_blank');
            } catch (err) { if (w) w.close(); toast('No se pudo abrir el PDF: ' + (err.message || err), 'error'); }
        }
    }

    async function onModalChange(e) {
        const s = e.target.closest('[data-asignar]');
        if (!s || !actual || !s.value) return;
        const i = Number(s.dataset.asignar);
        const f = actual.sinAsignar[i];
        if (!f) return;
        let p;
        if (s.value === '__nuevo') {
            const nombre = titulo(nombreDeArchivo(f.filename));
            p = actual.pacientes.find(x => x.id === idDe(nombre)) || nuevoPaciente({ nombre }, false);
            if (!actual.pacientes.includes(p)) actual.pacientes.push(p);
        } else p = actual.pacientes.find(x => x.id === s.value);
        if (!p) return;
        actual.sinAsignar.splice(i, 1);
        p.archivos.push({ ...f, manual: true });
        // si el tablero de ese paciente ya existía, se agrega la imagen
        if (f.tipo === 'img' && activo && activo.pid === p.id && window.GTXWorkstation && window.GTXWorkstation.boardId === 'lote:' + actual.key + ':' + p.id) {
            bajarImagenes([f]).then(fs => window.GTXWorkstation.addImages(fs)).catch(() => {});
        }
        await dbPut(actual);
        mostrarLista();
    }

    function renderChip() {
        if (!chipEl) return;
        const p = pacienteActivo();
        if (!p) { chipEl.hidden = true; chipEl.innerHTML = ''; return; }
        const pac = actual.pacientes;
        const idx = pac.indexOf(p) + 1;
        const nInf = pac.filter(x => x.estado === 'informado').length;
        const porInformar = pac.filter(x => x.estado !== 'no').length;
        chipEl.hidden = false;
        chipEl.innerHTML = `
            <i data-lucide="layers"></i>
            <div class="chip-text">
                <div class="chip-title">${idx}/${pac.length} · ${esc(p.nombre)}${p.edad ? ' · ' + esc(p.edad) : ''}</div>
                <div class="chip-sub">${esc(estudios(p).join(' · ') || 'Sin exámenes en el Excel')} — Lote ${esc(actual.asunto)}</div>
            </div>
            ${p.estado === 'informado' ? '<span class="done">Informado ✓</span>' : ''}
            <button data-lc="datos" title="Escribir nombre, edad y estudio al inicio del dictado">Insertar datos</button>
            <button data-lc="tablero" title="Ver las imágenes de este paciente"><i data-lucide="layout-panel-left"></i></button>
            <button data-lc="lista" title="Lista del lote"><i data-lucide="list"></i> ${nInf}/${porInformar}</button>
            <button data-lc="sig" title="Siguiente paciente pendiente">Siguiente <i data-lucide="chevron-right"></i></button>
            <button data-lc="cerrar" title="Salir del lote (Word y Gmail vuelven a funcionar como siempre)"><i data-lucide="x"></i></button>`;
        if (window.lucide) window.lucide.createIcons({ root: chipEl });
    }

    function onChipClick(e) {
        const b = e.target.closest('[data-lc]');
        if (!b) return;
        const p = pacienteActivo();
        const a = b.dataset.lc;
        if (a === 'cerrar') {
            setActivo(null);
            if (window.GTXWorkstation && window.GTXWorkstation.mode !== 'off') window.GTXWorkstation.openBoard('default', '');
        } else if (a === 'lista') mostrarLista();
        else if (a === 'sig') siguiente();
        else if (a === 'tablero' && p) {
            const imgs = p.archivos.filter(x => x.tipo === 'img');
            if (window.GTXWorkstation) window.GTXWorkstation.openBoard('lote:' + actual.key + ':' + p.id, p.nombre + ' — ' + actual.asunto, () => bajarImagenes(imgs));
        } else if (a === 'datos' && p) {
            const ta = document.getElementById('transcription');
            if (!ta) return;
            if (ta.value.includes(p.nombre)) { toast('Los datos del paciente ya están en el texto.', 'info'); return; }
            ta.value = textoDatos(p) + ta.value;
            ta.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // ---------- Inicio ----------
    buildUI();
    if (activo) {
        dbGet(activo.key).then(rec => {
            if (rec && rec.pacientes.some(p => p.id === activo.pid)) { actual = rec; renderChip(); }
            else setActivo(null);
        }).catch(() => setActivo(null));
    }

    window.GTXLotes = {
        esLote, infoAsunto, clave, enviado, abrir, guardarInforme, reemplazarInforme, mostrarLista, siguiente,
        get activo() { return pacienteActivo() ? { key: activo.key, pid: activo.pid, nombre: pacienteActivo().nombre } : null; },
        salir: () => setActivo(null),
        // para pruebas
        _agrupar: agrupar, _leerExcel: leerExcel, _textoDatos: textoDatos, _nombreDeArchivo: nombreDeArchivo, _armarCorreo: armarCorreo,
    };
})();
