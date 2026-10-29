/**
 * REVISIÓN DE TANDA (Claude Opus 5.5 + perfil de redacción del Dr.)
 * ------------------------------------------------------------
 * Reemplaza el paso de "pasar el lote por Claude" al terminar los informes:
 *
 * - Cada informe que sale de la app (Word, PDF, Gmail o guardado en un lote) queda registrado
 *   aquí con su texto, plantilla y estado: "pendiente" o "revisado" (IndexedDB, 21 días).
 * - El botón "Revisar tanda (n)" manda SOLO los pendientes a Claude Opus con la skill de
 *   redacción completa (tanda-perfil.js) y el orden de chequeo de auditoría. Los informes ya
 *   revisados del mismo día van como CONTEXTO (no se revisan de nuevo, pero permiten detectar
 *   discordancias entre informes: derivante, mismo paciente, criterio dispar en la tanda).
 * - Si un informe ya revisado se vuelve a generar con otro texto, vuelve a "pendiente".
 * - Observaciones por informe: "Corrección" (local e inequívoca → botón Aplicar) o "Pregunta"
 *   (requiere juicio clínico / volver a la imagen). Ignorar · No es error (aprende la excepción,
 *   compartida con el revisor por informe) · Editar informe a mano.
 * - Al corregir: se regenera el Word (con negrita en rótulos). Si era de un lote no enviado,
 *   se reemplaza en el lote; si fue Word/PDF se descarga de nuevo; si se envió por Gmail,
 *   se ofrece reenviarlo en el mismo hilo.
 * Nunca cambia un texto sin que el Dr. lo apruebe.
 */
(function () {
    'use strict';

    const MODEL = 'claude-opus-5-5';
    // USD por millón de tokens, Claude Opus 5.5 (oct-2026)
    const PRICE = { input: 4, output: 20, cacheWrite1h: 8, cacheRead: 0.2 };
    const COST_KEY = 'gtx_tanda_costo';        // { mes, usd, n }
    const PERFIL_KEY = 'gtx_tanda_perfil';     // { texto, fecha } — perfil subido por el Dr. (reemplaza al incluido)
    const DIAS_GUARDAR = 21;
    const MAX_POR_LLAMADA = 12;                // informes a revisar por llamada (si hay más, se hacen varias)

    const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch (e) { return d; } };
    const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
    const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const toast = (msg, kind, ms) => { if (window.GTXToast) window.GTXToast(msg, kind, ms); else console.log(msg); };
    function hash(s) { s = String(s || ''); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; }
    function diaDe(ts) { const d = new Date(ts || Date.now()); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
    const hoy = () => diaDe();
    const VIA = { word: 'Word', pdf: 'PDF', gmail: 'Gmail', lote: 'Lote' };

    // =====================================================================
    // Almacenamiento (IndexedDB)
    // =====================================================================
    let dbp = null;
    function db() {
        if (!dbp) {
            dbp = new Promise((res, rej) => {
                const r = indexedDB.open('gtx-tanda', 1);
                r.onupgradeneeded = () => r.result.createObjectStore('informes', { keyPath: 'id' });
                r.onsuccess = () => res(r.result);
                r.onerror = () => rej(r.error);
            });
        }
        return dbp;
    }
    async function todos() {
        const d = await db();
        return new Promise((res, rej) => {
            const q = d.transaction('informes').objectStore('informes').getAll();
            q.onsuccess = () => res(q.result || []);
            q.onerror = () => rej(q.error);
        });
    }
    async function get(id) {
        const d = await db();
        return new Promise((res, rej) => {
            const q = d.transaction('informes').objectStore('informes').get(id);
            q.onsuccess = () => res(q.result || null);
            q.onerror = () => rej(q.error);
        });
    }
    async function put(rec) {
        const d = await db();
        return new Promise((res, rej) => {
            const tx = d.transaction('informes', 'readwrite');
            tx.objectStore('informes').put(rec);
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
        });
    }
    async function del(id) {
        const d = await db();
        return new Promise((res, rej) => {
            const tx = d.transaction('informes', 'readwrite');
            tx.objectStore('informes').delete(id);
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
        });
    }
    async function limpiarViejos() {
        const lim = Date.now() - DIAS_GUARDAR * 864e5;
        for (const r of await todos()) if ((r.ts || 0) < lim) await del(r.id);
    }

    // =====================================================================
    // Registro (lo llama main.js al exportar)
    // =====================================================================
    /**
     * @param docData { blob, fileNameBase, patientName, texto, templateId, templateName, estudio }
     * @param meta    { via: 'word'|'pdf'|'gmail'|'lote', threadId?, loteKey?, pid? }
     */
    async function registrar(docData, meta) {
        try {
            if (!docData || !docData.texto) return;
            meta = meta || {};
            const dia = hoy();
            const id = [dia, norm(docData.patientName), docData.templateId, norm(docData.estudio).slice(0, 80)].join('|');
            const h = hash(docData.texto);
            const prev = await get(id);
            const rec = prev || { id, dia, obs: [], estado: 'pendiente' };
            Object.assign(rec, {
                paciente: docData.patientName,
                templateId: docData.templateId,
                plantilla: docData.templateName || docData.templateId,
                estudio: docData.estudio || '',
                fileNameBase: docData.fileNameBase,
                texto: docData.texto,
                hash: h,
                via: meta.via || rec.via || 'word',
                ts: Date.now(),
            });
            if (meta.threadId) rec.threadId = meta.threadId;
            // Archivo guardado en la carpeta del centro (carpetas.js): la corrección lo sobrescribe
            if (docData.archivo) rec.archivo = docData.archivo;
            else if (meta.via === 'word') rec.archivo = null;
            if (meta.loteKey) { rec.loteKey = meta.loteKey; rec.pid = meta.pid; }
            // Texto distinto del que se revisó → vuelve a pendiente
            if (rec.estado === 'revisado' && rec.revisadoHash !== h) { rec.estado = 'pendiente'; rec.obs = []; rec.correcto = ''; }
            if (!prev) rec.estado = 'pendiente';
            rec.pendienteEntrega = false;
            await put(rec);
            actualizarBoton();
            if (modal && !modal.classList.contains('hidden')) render();
        } catch (e) {
            console.warn('Tanda: no se pudo registrar el informe', e);
        }
    }

    async function pendientes() {
        const lim = Date.now() - 7 * 864e5;
        return (await todos()).filter(r => r.estado === 'pendiente' && (r.ts || 0) >= lim);
    }
    async function pendientesDeLote(key) {
        return (await todos()).filter(r => r.loteKey === key && r.estado === 'pendiente').map(r => r.paciente);
    }

    // =====================================================================
    // Perfil y prompt
    // =====================================================================
    function perfil() {
        const sub = read(PERFIL_KEY, null);
        if (sub && sub.texto) return { texto: sub.texto, fecha: sub.fecha, subido: true };
        return { texto: window.GTX_PERFIL_REDACCION || '', fecha: window.GTX_PERFIL_FECHA || '', subido: false };
    }
    function limpiarSkill(md) {
        let t = String(md || '').replace(/\r/g, '');
        t = t.replace(/^---\n[\s\S]*?\n---\n/, '');
        t = t.split(/\n## Negrita en r[oó]tulos/)[0];
        return t.trim();
    }

    const INSTRUCCIONES = `Eres el revisor de tandas de informes imagenológicos del Dr. Diego García-Tello Núñez, radiólogo maxilofacial (Chile). Al terminar sus informes, él te pasa la tanda para que revises incongruencias y cualquier observación de contenido antes de que salgan con su firma. Aplica ESTRICTAMENTE su perfil de redacción y su orden de chequeo de auditoría, que van más abajo: ahí está qué se señala y qué NO se señala. Ante conflicto entre el perfil y una intuición general, manda el perfil.

CÓMO RECIBES LOS INFORMES
- Cada informe trae un id, el nombre de la plantilla de la app y cómo salió (Word, PDF, Gmail o Lote).
- Recibes el texto plano del informe ANTES de pasar por la plantilla: logo, firma, "Atentamente", el formato, las negritas y el nombre del archivo los pone la app. Nada de eso se revisa ni su ausencia es observación.
- Plantillas de la app → centro: "QVA" = Centro Radiológico Oral & Máxilo Facial (Dra. Alejandra Pinto A.), "OVALLE" = Radiología Dental Ovalle, "TALCA" = Schilling (Talca), "QUILLOTA 3D" / "QUILLOTA 2D" = sucursal Quillota (misma hoja que QVA; 3D = Cone Beam, 2D = estudios sin CBCT). El bloque técnico del Cone Beam (Parámetros de exposición, FOV, vóxel, Planmeca Romexis, Panorex y cortes paraxiales) es del equipo de Quillota y lo pone la app SOLO con la plantilla "QUILLOTA 3D": su ausencia en un Cone Beam de cualquier otra plantilla es correcta y NO es observación (tampoco el distanciamiento). Para otras plantillas, deduce el centro por la estructura del texto; si no queda claro, NO señales desajustes de plantilla.
- "Dr(a). Tratante" en el encabezado es el relleno de la app cuando no se dictó el derivante; señálalo solo si otro informe de la tanda trae el derivante con nombre para el mismo centro y fecha.
- Hay dos grupos: INFORMES A REVISAR y INFORMES YA REVISADOS (solo contexto). A los de contexto NO les hagas observaciones: sirven para la consistencia entre informes de la tanda y entre informes del mismo paciente. Si un informe a revisar choca con uno de contexto, la observación va en el informe a revisar y lo dices en el mensaje.

QUÉ ENTREGAS (JSON con el esquema indicado; un elemento en "informes" por cada informe A REVISAR, en el mismo orden)
- tipo "correccion": SOLO cuando la corrección es local, inequívoca y no depende de la imagen ni de su juicio clínico (p. ej. "rízalisis" → "rizálisis"; concordancia de cámara/conducto/periápice cuando el número de raíces está escrito en la misma línea; un marcador de plantilla o "xxx" olvidado cuyo valor correcto está en el mismo informe). "cita" = fragmento copiado EXACTAMENTE del informe, carácter por carácter, lo bastante largo para que aparezca UNA sola vez (máx. 200 caracteres). "reemplazo" = el texto que sustituye a la cita, conservando todo lo demás igual.
- tipo "pregunta": todo lo que requiere su juicio clínico o volver a la imagen. "mensaje" = la pregunta concreta. "cita" ubica el fragmento (cadena vacía si es una omisión sin fragmento). "reemplazo" = cadena vacía, o la redacción sugerida si él confirma (solo si es obvia).
- "categoria": 2 a 4 palabras (p. ej. "concordancia radicular", "consulta no respondida", "lateralidad", "derivante", "entre informes", "cierre regional", "plantilla").
- "mensaje": en español de Chile, registro técnico entre pares, breve y directo. Sin didactismo.
- "correcto": una línea con lo que revisaste y está correcto en ese informe (el perfil pide cerrar siempre con eso).
- "resumen": una o dos líneas sobre la tanda completa.

UMBRAL
- La revisión es SOLO de contenido. Nada ortográfico ni ortotipográfico (única excepción: rízalisis → rizálisis, como "correccion").
- Convierte la notación con la tabla del Sistema Universal chileno ANTES de afirmar cualquier incongruencia de lateralidad, cobertura o número de raíces.
- Se señala lo incongruente dentro del informe o entre informes, no lo que te parecería más completo. Ante la duda entre callar y agregar una observación "por si acaso", calla.
- Si un informe no tiene observaciones, entrega "observaciones": [] y su línea "correcto".`;

    function construirSystem() {
        const p = perfil();
        const aud = window.GTX_AUDITORIA_TANDA || '';
        return INSTRUCCIONES
            + '\n\n=============== PERFIL DE REDACCIÓN DEL DR. (skill my-writing-style) ===============\n\n' + p.texto
            + (aud ? '\n\n=============== ORDEN DE CHEQUEO Y EXCEPCIONES DE AUDITORÍA ===============\n\n' + aud : '');
    }

    // Salida estructurada (output_config.format). Opus 5.5 no admite tool_choice forzado.
    const SCHEMA = {
        type: 'object',
        properties: {
            informes: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', description: 'id del informe, tal como se entregó (R1, R2…)' },
                        observaciones: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    tipo: { type: 'string', enum: ['correccion', 'pregunta'] },
                                    categoria: { type: 'string' },
                                    cita: { type: 'string' },
                                    reemplazo: { type: 'string' },
                                    mensaje: { type: 'string' },
                                },
                                required: ['tipo', 'categoria', 'cita', 'reemplazo', 'mensaje'],
                                additionalProperties: false,
                            },
                        },
                        correcto: { type: 'string' },
                    },
                    required: ['id', 'observaciones', 'correcto'],
                    additionalProperties: false,
                },
            },
            resumen: { type: 'string' },
        },
        required: ['informes', 'resumen'],
        additionalProperties: false,
    };

    function excepcionesTexto() {
        const IA = window.GTXRevisorIA;
        const exc = IA && IA.excepciones ? IA.excepciones() : [];
        if (!exc.length) return '';
        return 'OBSERVACIONES QUE EL DR. YA INDICÓ QUE NO SON ERRORES (no las repitas, ni otras equivalentes):\n'
            + exc.slice(-60).map(e => `- [${e.tipo}] ${e.mensaje} (texto: "${e.cita}")`).join('\n') + '\n\n';
    }

    const bloque = (r, i, etiqueta) =>
        `=== ${etiqueta} · id: ${i} · plantilla: ${r.plantilla} · salió como: ${VIA[r.via] || r.via} · ${r.dia} ===\n${r.texto}\n`;

    function mesActual() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
    function registrarCosto(usage) {
        if (!usage) return 0;
        const usd = ((usage.input_tokens || 0) * PRICE.input
            + (usage.cache_creation_input_tokens || 0) * PRICE.cacheWrite1h
            + (usage.cache_read_input_tokens || 0) * PRICE.cacheRead
            + (usage.output_tokens || 0) * PRICE.output) / 1e6;
        let c = read(COST_KEY, null);
        if (!c || c.mes !== mesActual()) c = { mes: mesActual(), usd: 0, n: 0 };
        c.usd += usd; c.n += 1;
        write(COST_KEY, c);
        return usd;
    }

    async function llamar(aRevisar, contexto) {
        const apiKey = localStorage.getItem('anthropic_api_key');
        if (!apiKey) throw new Error('falta la clave de Anthropic (⚙ Configurar IA)');
        // ids cortos para el modelo (R1, R2…; C1, C2… para el contexto)
        let user = excepcionesTexto();
        user += `INFORMES A REVISAR (${aRevisar.length}):\n\n` + aRevisar.map((r, i) => bloque(r, 'R' + (i + 1), 'A REVISAR')).join('\n');
        if (contexto.length) {
            user += `\n\nINFORMES YA REVISADOS — SOLO CONTEXTO, NO REVISAR (${contexto.length}):\n\n`
                + contexto.map((r, i) => bloque(r, 'C' + (i + 1), 'CONTEXTO')).join('\n');
        }
        user += '\n\nEntrega la revisión en el JSON indicado.';

        const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
                model: MODEL,
                max_tokens: 16000,
                system: [{ type: 'text', text: construirSystem(), cache_control: { type: 'ephemeral', ttl: '1h' } }],
                output_config: { format: { type: 'json_schema', schema: SCHEMA } },
                messages: [{ role: 'user', content: user }],
            }),
        });
        if (!resp.ok) {
            let msg = 'HTTP ' + resp.status;
            try { const e = await resp.json(); msg = (e.error && e.error.message) || msg; } catch (e) { /* noop */ }
            throw new Error(msg);
        }
        const data = await resp.json();
        const usd = registrarCosto(data.usage);
        if (data.stop_reason === 'max_tokens') throw new Error('la respuesta quedó cortada (tanda demasiado larga); vuelve a intentar');
        if (data.stop_reason === 'refusal') throw new Error('el modelo no entregó la revisión (rechazo); vuelve a intentar');
        const texto = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
        let out = null;
        try { out = JSON.parse(texto); }
        catch (e) {
            const i = texto.indexOf('{'), j = texto.lastIndexOf('}');
            try { if (i >= 0 && j > i) out = JSON.parse(texto.slice(i, j + 1)); } catch (e2) { /* noop */ }
        }
        if (!out || !Array.isArray(out.informes)) {
            console.warn('Tanda: respuesta no interpretable', data);
            throw new Error('la respuesta no trajo la revisión');
        }
        return { informes: out.informes, resumen: out.resumen || '', usd };
    }

    /** Cuántas veces aparece `cita` en `texto` (exacto). */
    function ocurrencias(texto, cita) {
        if (!cita) return 0;
        let n = 0, i = 0;
        while ((i = texto.indexOf(cita, i)) >= 0) { n++; i += cita.length; }
        return n;
    }

    function normalizarObs(o, texto) {
        const ob = {
            id: Math.random().toString(36).slice(2, 10),
            tipo: String(o.tipo || '').toLowerCase() === 'correccion' ? 'correccion' : 'pregunta',
            categoria: String(o.categoria || '').trim() || 'observación',
            cita: String(o.cita || '').trim(),
            reemplazo: String(o.reemplazo == null ? '' : o.reemplazo),
            mensaje: String(o.mensaje || '').trim(),
            estado: 'abierta',     // abierta | aplicada | ignorada | no_error
        };
        // Solo se puede aplicar si la cita está una sola vez en el texto y el reemplazo es distinto
        ob.aplicable = !!ob.cita && ob.reemplazo !== '' && ob.reemplazo !== ob.cita && ocurrencias(texto, ob.cita) === 1;
        if (ob.tipo === 'correccion' && !ob.aplicable) ob.tipo = 'pregunta';
        return ob;
    }

    // =====================================================================
    // Revisión
    // =====================================================================
    let revisando = false;
    let ultimoResumen = '';

    async function revisar(opciones) {
        if (revisando) return;
        const todo = !!(opciones && opciones.todo);
        let regs = await todos();
        const lim = Date.now() - 7 * 864e5;
        regs = regs.filter(r => (r.ts || 0) >= lim);
        const aRevisar = todo
            ? regs.filter(r => r.dia === hoy() || r.estado === 'pendiente')
            : regs.filter(r => r.estado === 'pendiente');
        if (!aRevisar.length) { toast('No hay informes pendientes de revisión.', 'info'); return; }
        const dias = new Set(aRevisar.map(r => r.dia));
        const idsRev = new Set(aRevisar.map(r => r.id));
        const contexto = regs.filter(r => !idsRev.has(r.id) && dias.has(r.dia)).slice(-30);

        aRevisar.sort((a, b) => (a.ts || 0) - (b.ts || 0));
        revisando = true;
        render();
        const resumenes = [];
        let usdTotal = 0, nRev = 0;
        try {
            for (let i = 0; i < aRevisar.length; i += MAX_POR_LLAMADA) {
                const grupo = aRevisar.slice(i, i + MAX_POR_LLAMADA);
                // Lo ya revisado en esta misma pasada también sirve de contexto para el grupo siguiente
                const ctx = contexto.concat(aRevisar.slice(0, i));
                setEstado(`Revisando ${grupo.length} informe(s) con Claude Opus${aRevisar.length > MAX_POR_LLAMADA ? ` (${i + 1}–${i + grupo.length} de ${aRevisar.length})` : ''}… puede tardar uno o dos minutos.`);
                const res = await llamar(grupo, ctx);
                usdTotal += res.usd;
                if (res.resumen) resumenes.push(res.resumen);
                for (let k = 0; k < grupo.length; k++) {
                    const r = await get(grupo[k].id);
                    if (!r) continue;
                    if (r.hash !== grupo[k].hash) continue;   // cambió mientras se revisaba: queda pendiente
                    const out = res.informes.find(x => String(x.id).trim().toUpperCase() === 'R' + (k + 1)) || res.informes[k];
                    if (!out) continue;
                    r.obs = (out.observaciones || []).filter(o => o && o.mensaje).map(o => normalizarObs(o, r.texto));
                    r.correcto = String(out.correcto || '').trim();
                    r.estado = 'revisado';
                    r.revisadoHash = r.hash;
                    r.revisadoTs = Date.now();
                    await put(r);
                    nRev++;
                }
            }
            ultimoResumen = resumenes.join(' ');
            const nObs = (await todos()).filter(r => r.revisadoTs && r.revisadoTs > Date.now() - 10 * 60e3)
                .reduce((n, r) => n + r.obs.filter(o => o.estado === 'abierta').length, 0);
            toast(`Tanda revisada: ${nRev} informe(s), ${nObs} observación(es) · US$ ${usdTotal.toFixed(3)}`, nObs ? 'warn' : 'ok', 7000);
            setEstado('');
        } catch (e) {
            console.error('Revisión de tanda:', e);
            setEstado('No se pudo completar la revisión: ' + (e.message || e) + '. Los informes no revisados siguen pendientes.', true);
        } finally {
            revisando = false;
            actualizarBoton();
            render();
        }
    }

    // =====================================================================
    // Correcciones y entrega del Word corregido
    // =====================================================================
    async function regenerar(r) {
        if (typeof window.GTXConstruirDocumento !== 'function') throw new Error('la app no expone la generación del Word');
        return window.GTXConstruirDocumento(r.texto, r.templateId, { silencioso: true });
    }

    function actualizarHistorial(pacienteViejo, textoViejo, textoNuevo) {
        try {
            if (typeof dictationHistory === 'undefined' || !Array.isArray(dictationHistory)) return;
            const it = dictationHistory.find(h => h.text === textoViejo);
            if (it) { it.text = textoNuevo; localStorage.setItem('dictationHistory', JSON.stringify(dictationHistory)); }
        } catch (e) { /* noop */ }
    }

    /** Cambia el texto de un informe ya revisado (por Aplicar o edición manual) y lo deja listo para entregar. */
    async function cambiarTexto(r, nuevo) {
        const viejo = r.texto;
        r.texto = nuevo;
        r.hash = hash(nuevo);
        r.revisadoHash = r.hash;          // el cambio sale de la propia revisión: sigue revisado
        r.pendienteEntrega = true;
        // Las demás observaciones abiertas cuya cita ya no está, o ya no es única, dejan de ser aplicables
        for (const o of r.obs) {
            if (o.estado !== 'abierta') continue;
            const n = ocurrencias(nuevo, o.cita);
            if (o.aplicable && n !== 1) o.aplicable = false;
        }
        actualizarHistorial(r.paciente, viejo, nuevo);
        await put(r);
        // Lote no enviado: se reemplaza el Word en el lote de inmediato (no hay nada que descargar)
        if (r.via === 'lote' && r.loteKey && window.GTXLotes && window.GTXLotes.reemplazarInforme) {
            try {
                const doc = await regenerar(r);
                const st = await window.GTXLotes.reemplazarInforme(r.loteKey, r.pid, doc);
                if (st === 'ok') { r.pendienteEntrega = false; await put(r); toast(`Word de ${r.paciente} actualizado en el lote.`, 'ok', 3500); }
                else if (st === 'enviado') toast(`El lote de ${r.paciente} ya se envió: usa "Descargar corregido".`, 'warn', 7000);
            } catch (e) {
                console.error(e);
                toast('No se pudo regenerar el Word: ' + (e.message || e), 'error', 7000);
            }
        }
    }

    async function aplicar(r, o) {
        if (ocurrencias(r.texto, o.cita) !== 1) { toast('El fragmento ya no está (o no es único) en el informe: corrígelo con "Editar".', 'warn', 6000); o.aplicable = false; await put(r); return; }
        o.estado = 'aplicada';
        await cambiarTexto(r, r.texto.replace(o.cita, () => o.reemplazo));
    }

    async function descargar(r) {
        const doc = await regenerar(r);
        if (!doc) return;
        const C = window.GTXCarpetas;
        if (r.archivo && C && C.asignada(r.archivo.templateId)) {
            const g = await C.sobrescribir(doc.blob, r.archivo.nombre, r.archivo.templateId);
            if (g.modo === 'carpeta') toast(`Reemplazado en "${g.carpeta}": ${g.nombre}`, 'ok', 4000);
            else toast('No se pudo escribir en la carpeta: el Word corregido se descargó.', 'warn', 6000);
        } else {
            window.saveAs(doc.blob, (doc.fileNameBase || r.paciente) + '.docx');
        }
        return doc;
    }

    async function entregar(r) {
        try {
            if (r.via === 'gmail' && r.threadId) {
                if (!confirm(`El informe de ${r.paciente} ya se envió por Gmail.\n\n¿Responder en el mismo hilo con el Word corregido?\n(Cancelar = solo guardarlo)`)) {
                    await descargar(r);
                } else {
                    const doc = await regenerar(r);
                    if (typeof authenticateGmail === 'function') await authenticateGmail();
                    const thread = await _getFullThread(r.threadId);
                    await sendReplyWithAttachment(thread, doc.blob, (doc.fileNameBase || r.paciente) + '.docx');
                    toast(`Word corregido de ${r.paciente} reenviado por Gmail.`, 'ok', 5000);
                }
            } else if (r.via === 'lote' && r.loteKey && window.GTXLotes) {
                const doc = await regenerar(r);
                const st = await window.GTXLotes.reemplazarInforme(r.loteKey, r.pid, doc);
                if (st === 'ok') toast(`Word de ${r.paciente} actualizado en el lote.`, 'ok', 4000);
                else { window.saveAs(doc.blob, (doc.fileNameBase || r.paciente) + '.docx'); toast(st === 'enviado' ? 'El lote ya se había enviado: se descargó el Word corregido.' : 'No se encontró en el lote: se descargó el Word corregido.', 'warn', 7000); }
            } else {
                await descargar(r);
            }
            r.pendienteEntrega = false;
            await put(r);
            render();
        } catch (e) {
            console.error('Entrega del corregido:', e);
            alert('No se pudo entregar el Word corregido: ' + (e.message || e));
        }
    }

    // =====================================================================
    // UI
    // =====================================================================
    let modal = null, btn = null, estadoMsg = '', estadoErr = false;
    const abiertos = new Set();   // informes con el editor manual abierto

    function css() {
        const st = document.createElement('style');
        st.textContent = `
#tanda-btn span{white-space:nowrap}
#tanda-btn .tanda-n{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#f59e0b;color:#111;font:600 .72rem 'Outfit',sans-serif;margin-left:2px}
#tanda-btn .tanda-n[hidden]{display:none}
.tanda-modal-content{max-width:900px}
.tanda-top{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}
.tanda-top .info{flex:1;min-width:200px;font-size:.82rem;color:var(--text-secondary)}
.tanda-estado{margin:0 0 10px;padding:8px 12px;border-radius:10px;background:rgba(59,130,246,.10);border:1px solid rgba(59,130,246,.45);font-size:.84rem}
.tanda-estado.err{background:rgba(239,68,68,.10);border-color:rgba(239,68,68,.5)}
.tanda-estado:empty{display:none}
.tanda-resumen{margin:0 0 10px;font-size:.85rem;color:var(--text-secondary)}
.tanda-resumen:empty{display:none}
.tanda-dia{margin:14px 0 6px;font-size:.8rem;text-transform:uppercase;letter-spacing:.04em;color:var(--text-secondary)}
.tanda-inf{border:1px solid var(--glass-border);border-radius:12px;padding:10px 12px;margin-bottom:8px;background:rgba(15,23,42,.45)}
.tanda-inf.pend{border-color:rgba(245,158,11,.55)}
.tanda-head{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.tanda-head .nom{font-weight:600;flex:1;min-width:160px}
.tanda-head .meta{font-size:.76rem;color:var(--text-secondary)}
.tanda-chip{font-size:.72rem;padding:2px 8px;border-radius:999px;white-space:nowrap}
.tanda-chip.pendiente{background:rgba(245,158,11,.15);color:#fbbf24}
.tanda-chip.ok{background:rgba(16,185,129,.15);color:#86efac}
.tanda-chip.obs{background:rgba(239,68,68,.15);color:#fca5a5}
.tanda-chip.ent{background:rgba(168,85,247,.15);color:#d8b4fe}
.tanda-correcto{font-size:.8rem;color:#86efac;margin-top:6px}
.tanda-obs{margin-top:8px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04);border-left:3px solid #f59e0b}
.tanda-obs.correccion{border-left-color:#10b981}
.tanda-obs.cerrada{opacity:.5}
.tanda-obs .t{font-size:.74rem;color:var(--text-secondary);margin-bottom:3px}
.tanda-obs .m{font-size:.88rem}
.tanda-obs .c{font-size:.8rem;margin-top:4px;color:var(--text-secondary);white-space:pre-wrap}
.tanda-obs .c b{color:var(--text-primary);font-weight:500}
.tanda-obs .acc{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.tanda-mini{background:transparent;border:1px solid var(--glass-border);color:var(--text-primary);border-radius:7px;padding:3px 9px;font:500 .76rem 'Outfit',sans-serif;cursor:pointer}
.tanda-mini:hover{background:rgba(255,255,255,.1)}
.tanda-mini.pri{background:rgba(16,185,129,.18);border-color:rgba(16,185,129,.6)}
.tanda-mini.warn{background:rgba(168,85,247,.18);border-color:rgba(168,85,247,.6)}
.tanda-edit{width:100%;min-height:220px;margin-top:8px;padding:8px;background:rgba(15,23,42,.7);color:var(--text-primary);border:1px solid var(--glass-border);border-radius:8px;font:.84rem/1.45 'Outfit',sans-serif;resize:vertical}
.tanda-vacio{padding:24px;text-align:center;color:var(--text-secondary)}
.tanda-foot{margin-top:12px;padding-top:10px;border-top:1px solid var(--glass-border);font-size:.78rem;color:var(--text-secondary);display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.tanda-foot .sp{flex:1}
.tanda-del:not(:disabled):hover{border-color:rgba(239,68,68,.6);color:#fca5a5}`;
        document.head.appendChild(st);
    }

    function buildUI() {
        css();
        // Botón en la cabecera, junto al Tablero
        btn = document.createElement('button');
        btn.id = 'tanda-btn';
        btn.className = 'icon-btn gtx-pill-btn';
        btn.title = 'Revisar la tanda de informes con Claude Opus y tu perfil de redacción';
        btn.innerHTML = '<i data-lucide="list-checks"></i><span>Revisar tanda</span><span class="tanda-n" hidden>0</span>';
        const ref = document.getElementById('canvas-btn') || document.getElementById('config-btn');
        if (ref && ref.parentNode) ref.parentNode.insertBefore(btn, ref.nextSibling);
        btn.addEventListener('click', abrir);

        modal = document.createElement('div');
        modal.id = 'tanda-modal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content glass-panel tanda-modal-content">
                <div class="modal-header">
                    <h2>Revisión de tanda</h2>
                    <button class="icon-btn" data-t="cerrar"><i data-lucide="x"></i></button>
                </div>
                <div class="modal-body">
                    <div class="tanda-top">
                        <div class="info"></div>
                        <button class="btn primary-btn" data-t="revisar"><i data-lucide="sparkles"></i> <span>Revisar pendientes</span></button>
                        <button class="btn secondary-btn" data-t="todo" title="Volver a revisar todos los informes de hoy (p. ej. al cerrar la jornada)">Revisar todo hoy</button>
                        <button class="btn secondary-btn tanda-del" data-t="borrar-pend" title="Sacar de la tanda todos los informes pendientes sin revisarlos (no borra los Word ni los lotes)"><i data-lucide="trash-2"></i> <span>Eliminar pendientes</span></button>
                    </div>
                    <div class="tanda-estado"></div>
                    <div class="tanda-resumen"></div>
                    <div class="tanda-lista"></div>
                    <div class="tanda-foot">
                        <span class="perfil"></span>
                        <button class="tanda-mini" data-t="perfil-subir" title="Sube el SKILL.md actualizado de tu skill de redacción">Actualizar perfil</button>
                        <button class="tanda-mini" data-t="perfil-reset" hidden>Volver al perfil incluido</button>
                        <span class="sp"></span>
                        <span class="costo"></span>
                    </div>
                    <input type="file" accept=".md,.txt,text/markdown,text/plain" data-t="perfil-file" hidden>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', onClick);
        modal.querySelector('[data-t="perfil-file"]').addEventListener('change', onPerfilFile);
        if (window.lucide) window.lucide.createIcons({ root: btn });
        actualizarBoton();
    }

    async function actualizarBoton() {
        if (!btn) return;
        try {
            const n = (await pendientes()).length;
            const b = btn.querySelector('.tanda-n');
            b.textContent = String(n);
            b.hidden = n === 0;
        } catch (e) { /* noop */ }
    }

    function setEstado(msg, err) {
        estadoMsg = msg || ''; estadoErr = !!err;
        if (!modal) return;
        const el = modal.querySelector('.tanda-estado');
        el.textContent = estadoMsg;
        el.classList.toggle('err', estadoErr);
    }

    function abrir() {
        modal.classList.remove('hidden');
        render();
    }

    function chipDe(r) {
        if (r.estado === 'pendiente') return '<span class="tanda-chip pendiente">Pendiente</span>';
        const n = r.obs.filter(o => o.estado === 'abierta').length;
        let h = n ? `<span class="tanda-chip obs">${n} ${n > 1 ? 'observaciones' : 'observación'}</span>` : '<span class="tanda-chip ok">Revisado ✓</span>';
        if (r.pendienteEntrega) h += ' <span class="tanda-chip ent">Corregido · falta entregar</span>';
        return h;
    }

    function obsHTML(r, o) {
        const cerrada = o.estado !== 'abierta';
        const etiqueta = o.tipo === 'correccion' ? 'Corrección' : 'Pregunta';
        const est = { aplicada: ' · aplicada', ignorada: ' · ignorada', no_error: ' · no es error' }[o.estado] || '';
        let cita = '';
        if (o.cita) cita += `<div class="c">“${esc(o.cita)}”${o.reemplazo && o.reemplazo !== o.cita ? `\n→ <b>“${esc(o.reemplazo)}”</b>` : ''}</div>`;
        const acc = cerrada ? '' : `<div class="acc">
                ${o.aplicable ? `<button class="tanda-mini pri" data-t="aplicar" data-r="${esc(r.id)}" data-o="${o.id}">Aplicar</button>` : ''}
                <button class="tanda-mini" data-t="ignorar" data-r="${esc(r.id)}" data-o="${o.id}">Ignorar</button>
                <button class="tanda-mini" data-t="noerror" data-r="${esc(r.id)}" data-o="${o.id}" title="No volverá a marcarse (también en el revisor por informe)">No es error</button>
            </div>`;
        return `<div class="tanda-obs ${o.tipo}${cerrada ? ' cerrada' : ''}">
            <div class="t">${etiqueta} · ${esc(o.categoria)}${est}</div>
            <div class="m">${esc(o.mensaje)}</div>${cita}${acc}</div>`;
    }

    function infHTML(r) {
        const pend = r.estado === 'pendiente';
        const editando = abiertos.has(r.id);
        const hora = new Date(r.ts).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        return `<div class="tanda-inf${pend ? ' pend' : ''}">
            <div class="tanda-head">
                <span class="nom">${esc(r.paciente)}</span>
                <span class="meta">${esc(r.plantilla)} · ${esc(r.estudio || '')} · ${VIA[r.via] || esc(r.via)} ${hora}</span>
                ${chipDe(r)}
            </div>
            ${r.obs.map(o => obsHTML(r, o)).join('')}
            ${!pend && r.correcto ? `<div class="tanda-correcto">✓ ${esc(r.correcto)}</div>` : ''}
            ${editando ? `<textarea class="tanda-edit" data-edit="${esc(r.id)}">${esc(r.texto)}</textarea>` : ''}
            <div class="acc" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
                ${editando
                    ? `<button class="tanda-mini pri" data-t="guardar" data-r="${esc(r.id)}">Guardar cambios</button><button class="tanda-mini" data-t="cancelar" data-r="${esc(r.id)}">Cancelar</button>`
                    : `<button class="tanda-mini" data-t="editar" data-r="${esc(r.id)}">Editar informe</button>`}
                ${r.pendienteEntrega ? `<button class="tanda-mini warn" data-t="entregar" data-r="${esc(r.id)}">${r.via === 'gmail' ? 'Reenviar / guardar corregido' : r.via === 'lote' ? 'Actualizar en el lote' : (r.archivo ? 'Reemplazar en la carpeta' : 'Descargar corregido')}</button>` : `<button class="tanda-mini" data-t="descargar" data-r="${esc(r.id)}">${r.archivo ? 'Guardar Word' : 'Descargar Word'}</button>`}
                <button class="tanda-mini" data-t="quitar" data-r="${esc(r.id)}" title="Sacar este informe de la tanda (no borra nada más)">Quitar</button>
            </div>
        </div>`;
    }

    async function render() {
        if (!modal || modal.classList.contains('hidden')) return;
        // Conservar lo que se está escribiendo en los editores abiertos
        const borradores = {};
        modal.querySelectorAll('[data-edit]').forEach(t => { borradores[t.dataset.edit] = t.value; });

        const regs = (await todos()).sort((a, b) => (b.ts || 0) - (a.ts || 0));
        const lim = Date.now() - 7 * 864e5;
        const visibles = regs.filter(r => r.dia === hoy() || r.estado === 'pendiente' || r.pendienteEntrega || ((r.ts || 0) >= lim && r.obs.some(o => o.estado === 'abierta')));
        const nPend = regs.filter(r => r.estado === 'pendiente' && (r.ts || 0) >= lim).length;
        const nHoy = regs.filter(r => r.dia === hoy()).length;

        modal.querySelector('.tanda-top .info').textContent = `Hoy: ${nHoy} informe(s) · ${nPend} pendiente(s) de revisión`;
        const bRev = modal.querySelector('[data-t="revisar"]');
        bRev.disabled = revisando || nPend === 0;
        bRev.querySelector('span').textContent = revisando ? 'Revisando…' : `Revisar pendientes (${nPend})`;
        modal.querySelector('[data-t="todo"]').disabled = revisando || nHoy === 0;
        const bDel = modal.querySelector('[data-t="borrar-pend"]');
        bDel.disabled = revisando || nPend === 0;
        bDel.querySelector('span').textContent = `Eliminar pendientes (${nPend})`;
        setEstado(estadoMsg, estadoErr);
        modal.querySelector('.tanda-resumen').textContent = ultimoResumen;

        const lista = modal.querySelector('.tanda-lista');
        if (!visibles.length) {
            lista.innerHTML = '<div class="tanda-vacio">Todavía no hay informes en la tanda de hoy. Se agregan solos al generar el Word, el PDF, enviarlos por Gmail o guardarlos en un lote.</div>';
        } else {
            let html = '', dia = null;
            for (const r of visibles) {
                if (r.dia !== dia) { dia = r.dia; html += `<div class="tanda-dia">${dia === hoy() ? 'Hoy' : esc(dia)}</div>`; }
                html += infHTML(r);
            }
            lista.innerHTML = html;
            lista.querySelectorAll('[data-edit]').forEach(t => { if (borradores[t.dataset.edit] != null) t.value = borradores[t.dataset.edit]; });
        }

        const p = perfil();
        modal.querySelector('.tanda-foot .perfil').textContent = `Perfil: ${p.subido ? 'subido el ' + p.fecha : 'skill incluida (' + p.fecha + ')'}`;
        modal.querySelector('[data-t="perfil-reset"]').hidden = !p.subido;
        const c = read(COST_KEY, null);
        modal.querySelector('.tanda-foot .costo').textContent = c && c.mes === mesActual()
            ? `Este mes: ${c.n} revisión(es) · US$ ${c.usd.toFixed(2)}` : 'Este mes: sin revisiones aún';
        if (window.lucide) window.lucide.createIcons({ root: modal });
    }

    async function onClick(e) {
        const b = e.target.closest('[data-t]');
        if (!b) { if (e.target === modal) modal.classList.add('hidden'); return; }
        const t = b.dataset.t;
        if (t === 'cerrar') { modal.classList.add('hidden'); return; }
        if (t === 'revisar') return revisar();
        if (t === 'todo') {
            if (confirm('¿Volver a revisar TODOS los informes de hoy, incluidos los ya revisados?')) return revisar({ todo: true });
            return;
        }
        if (t === 'borrar-pend') {
            if (revisando) return;
            const pend = (await todos()).filter(r => r.estado === 'pendiente');
            if (!pend.length) { toast('No hay informes pendientes.', 'info'); return; }
            if (!confirm(`¿Eliminar de la tanda los ${pend.length} informe(s) pendiente(s) sin revisarlos?\n\nNo se borran los Word, los correos ni los lotes; solo dejan de aparecer aquí.`)) return;
            b.disabled = true;
            try {
                for (const r of pend) { await del(r.id); abiertos.delete(r.id); }
                setEstado('');
                toast(`${pend.length} informe(s) pendiente(s) eliminados de la tanda.`, 'ok', 3500);
            } catch (er) {
                console.error(er);
                alert('No se pudieron eliminar los pendientes: ' + (er.message || er));
            } finally { actualizarBoton(); render(); }
            return;
        }
        if (t === 'perfil-subir') { modal.querySelector('[data-t="perfil-file"]').click(); return; }
        if (t === 'perfil-reset') {
            if (confirm('¿Volver al perfil incluido en la app y descartar el que subiste?')) { try { localStorage.removeItem(PERFIL_KEY); } catch (er) { /* noop */ } render(); }
            return;
        }

        const r = b.dataset.r ? await get(b.dataset.r) : null;
        if (!r) return;
        const o = b.dataset.o ? r.obs.find(x => x.id === b.dataset.o) : null;
        b.disabled = true;
        try {
            if (t === 'aplicar' && o) await aplicar(r, o);
            else if (t === 'ignorar' && o) { o.estado = 'ignorada'; await put(r); }
            else if (t === 'noerror' && o) {
                o.estado = 'no_error'; await put(r);
                if (window.GTXRevisorIA && window.GTXRevisorIA.agregarExcepcion) window.GTXRevisorIA.agregarExcepcion({ tipo: o.categoria, cita: o.cita, mensaje: o.mensaje });
            }
            else if (t === 'editar') abiertos.add(r.id);
            else if (t === 'cancelar') abiertos.delete(r.id);
            else if (t === 'guardar') {
                const ta = modal.querySelector(`[data-edit="${CSS.escape(r.id)}"]`);
                const nuevo = ta ? ta.value.trim() : r.texto;
                abiertos.delete(r.id);
                if (nuevo && nuevo !== r.texto) await cambiarTexto(r, nuevo);
            }
            else if (t === 'entregar') await entregar(r);
            else if (t === 'descargar') await descargar(r);
            else if (t === 'quitar') {
                if (confirm(`¿Quitar el informe de ${r.paciente} de la tanda?`)) { await del(r.id); abiertos.delete(r.id); }
            }
        } catch (er) {
            console.error(er);
            alert('No se pudo completar la acción: ' + (er.message || er));
        } finally {
            actualizarBoton();
            render();
        }
    }

    function onPerfilFile(e) {
        const f = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!f) return;
        const fr = new FileReader();
        fr.onload = () => {
            const texto = limpiarSkill(fr.result);
            if (texto.length < 2000 || !/radi[oó]log/i.test(texto)) { alert('Ese archivo no parece el SKILL.md de tu perfil de redacción.'); return; }
            if (!write(PERFIL_KEY, { texto, fecha: new Date().toLocaleDateString('es-CL') })) { alert('No se pudo guardar el perfil en el navegador.'); return; }
            toast('Perfil de redacción actualizado. Se usará desde la próxima revisión.', 'ok', 5000);
            render();
        };
        fr.readAsText(f, 'utf-8');
    }

    // Cerrar con Escape
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) modal.classList.add('hidden'); });

    function init() {
        buildUI();
        limpiarViejos().then(actualizarBoton).catch(() => { /* noop */ });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

    window.GTXTanda = {
        registrar, revisar, pendientes, pendientesDeLote, abrir, MODEL, PRICE,
        // para pruebas
        _normalizarObs: normalizarObs, _construirSystem: construirSystem, _ocurrencias: ocurrencias, _limpiarSkill: limpiarSkill, _todos: todos,
    };
})();
