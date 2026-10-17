/**
 * REVISOR CON IA (Claude Haiku 5.5)
 * ------------------------------------------------------------
 * Complementa al revisor por reglas (revisor.js) con lo que las reglas no detectan bien:
 * concordancia de género/número, contenido no dictado, omisiones, contradicciones,
 * lateralidad y palabras mal transcritas. NUNCA cambia el texto por sí solo.
 *
 * - Se lanza en segundo plano apenas termina el formateo con IA (prefetch), así el
 *   resultado suele estar listo al presionar Word / Gmail.
 * - "No es error" guarda una excepción que se envía en las siguientes revisiones.
 * - Lleva el costo del mes según el uso real que informa la API.
 */
(function () {
    'use strict';
    const MODEL = 'claude-haiku-5-5';
    // USD por millón de tokens, Claude Haiku 5.5 (prompts < 100k tokens), oct-2026
    const PRICE = { input: 0.10, output: 0.50, cacheWrite1h: 0.20, cacheRead: 0.01 };
    const CFG_KEY = 'gtx_revisor_ia_cfg';            // { enabled, alcance: 'todos' | 'cbct_atm' }
    const EXC_KEY = 'gtx_revisor_ia_excepciones';    // [{ tipo, cita, mensaje, ts }]
    const COST_KEY = 'gtx_revisor_ia_costo';         // { mes: 'AAAA-MM', usd, n }

    const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch (e) { return d; } };
    const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* noop */ } };
    const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const PROMPT_FIJO = `Eres un revisor de calidad de informes radiológicos odontológicos y maxilofaciales escritos en español de Chile por un radiólogo maxilofacial (radiografía panorámica, bite-wing, periapical, telerradiografía, CBCT y ATM). Tu tarea es detectar ERRORES REALES en el INFORME FINAL. No reescribes el informe: solo reportas observaciones puntuales.

QUÉ REVISAR (usa estos valores en "tipo"):
1. "concordancia": errores de género o número gramatical. Ej.: "Cavidad articular conservado", "Mucosas basales engrosado", "Cámara y conductos permeable", "Periápices normal".
2. "no_dictado": hallazgos, dientes, diagnósticos, mediciones o recomendaciones que aparecen en el informe y NO están en el dictado original. Solo si se entrega el dictado. NO cuentan: reformulaciones, orden distinto, encabezados y frases estándar de la plantilla ("En base a las imágenes obtenidas…", "Sin antecedentes entregados"), la fecha, ni la corrección de términos mal dictados.
3. "omision": hallazgos o dientes dictados que no quedaron en el informe. Solo si se entrega el dictado.
4. "contradiccion": afirmaciones incompatibles dentro del informe (p. ej. la impresión diagnóstica dice "acentuado en ATM izquierda" pero los hallazgos más severos son de la derecha; un mismo diente descrito de dos formas incompatibles).
5. "lateralidad": derecho/izquierdo incompatible con la numeración FDI (cuadrantes 1, 4, 5 y 8 = lado derecho del paciente; 2, 3, 6 y 7 = lado izquierdo) o con la sección donde está escrito.
6. "transcripcion": palabras inexistentes o términos mal transcritos por el dictado por voz que sobrevivieron (p. ej. "perogéneo" por "heterogéneo", "traveculado" por "trabeculado").
7. "otro": nomenclatura FDI dudosa, estadios de Nolla mal agrupados, términos que no corresponden al tipo de estudio.

NO MARQUES NADA DE ESTO (son criterios del radiólogo y son CORRECTOS):
- Cierres regionales: solo se describen estructuras patológicas o solicitadas. No exigir mencionar estructuras sanas no solicitadas (p. ej. el seno maxilar contralateral sano).
- En periapicales, el lenguaje tentativo para caries proximales incipientes ("se sugiere investigar caries distal incipiente") es correcto.
- En panorámica + bite-wing, los hallazgos bite-wing van integrados en MAXILAR/MANDÍBULA; no exigir encabezados BITE-WING separados.
- Si el periápice se informa normal, no corresponde sugerir evaluar vitalidad pulpar.
- Declarar cálculo dentario marginal no obliga a declarar el estado óseo marginal.
- Si las ausencias se informan diente por diente, no exigir el rótulo "Desdentado parcial".
- "Incluido" es correcto cuando la formación radicular está completa, aunque el paciente esté en edad de erupción.
- En la impresión diagnóstica de ATM no se mencionan los espacios articulares cuando la alteración es leve.
- "Tratado endodónticamente" junto a "No se observan conductos permeables" NO es contradictorio.
- Una lesión osteolítica pararradicular extensa con periápice normal NO es contradicción.
- El bloque técnico "Panorex y cortes paraxiales" es correcto también en CBCT de ATM.
- En periapical no se exige declarar perforación pulpar.
- Un tercer molar distoinclinado puede proyectar su corona sobre las raíces del diente vecino.
- En dentición en desarrollo, no mencionar un diente significa que terminó su formación radicular; no exigir simetría de inventario entre arcos.
- Si los senos maxilares se informan en la sección de telerradiografía, no se repiten en MAXILAR.
- La reabsorción ósea marginal puede declararse en un arco y no en el otro; no es omisión.
- Estilo, puntuación menor, mayúsculas, sinónimos o redacción alternativa: NO son errores.
(Sí es error real: "Birradiculado" junto a una raíz accesoria descrita después.)

REGLAS:
- Si no estás seguro de que algo es un error, NO lo reportes. Es preferible omitir a marcar de más.
- "cita" debe ser un fragmento copiado EXACTAMENTE del informe (máximo 120 caracteres), para ubicarlo.
- "reemplazo": el texto corregido que reemplazaría a "cita" (solo si la corrección es obvia y local, p. ej. concordancia o transcripción); si no aplica, cadena vacía.
- "gravedad": "alta" si cambia el sentido clínico (no dictado, omisión, contradicción, lateralidad); "media" en los demás casos.

FORMATO: responde SOLO con JSON válido, sin texto adicional:
{"observaciones":[{"tipo":"concordancia","gravedad":"media","cita":"…","mensaje":"explicación breve en español","reemplazo":"…"}]}
Si no hay errores: {"observaciones":[]}`;

    // ---------- configuración / costo / excepciones ----------
    const cfg = () => ({ enabled: true, alcance: 'todos', ...read(CFG_KEY, {}) });
    const setCfg = (c) => write(CFG_KEY, { ...cfg(), ...c });
    const excepciones = () => read(EXC_KEY, []);

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
        renderCfg();
        return usd;
    }

    function agregarExcepcion(o) {
        const list = excepciones();
        if (!list.some(e => e.tipo === o.tipo && norm(e.cita) === norm(o.cita))) {
            list.push({ tipo: o.tipo, cita: String(o.cita || '').slice(0, 160), mensaje: String(o.mensaje || '').slice(0, 200), ts: Date.now() });
            write(EXC_KEY, list.slice(-80));
        }
        renderCfg();
    }

    // ---------- cuándo revisar ----------
    function enabledFor(text) {
        const c = cfg();
        if (!c.enabled || !String(text || '').trim()) return false;
        let key = null;
        try { key = localStorage.getItem('anthropic_api_key'); } catch (e) { /* noop */ }
        if (!key) return false;
        if (c.alcance === 'cbct_atm') return /cbct|cone\s*beam|tomograf|\batm\b|articulaci[oó]n temporomandibular/i.test(text);
        return true;
    }

    let lastDictado = null, lastInforme = null;
    function dictadoPara(text) {
        if (!lastDictado) return null;
        // Si el texto actual ya no es una edición del informe formateado, el dictado no aplica
        if (lastInforme && typeof _pareceEdicion === 'function' && !_pareceEdicion(lastInforme, text)) return null;
        return lastDictado;
    }

    const cache = new Map();   // hash(texto) -> Promise<{observaciones, usd}>
    const listos = new Set();
    function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; }

    /** Llamar al terminar el formateo con IA: guarda el dictado y lanza la revisión en segundo plano. */
    function prefetch(dictado) {
        lastDictado = dictado || null;
        setTimeout(() => {
            const ta = document.getElementById('transcription');
            const t = ta ? ta.value.trim() : '';
            lastInforme = t;
            if (enabledFor(t)) obtener(t, 0).catch(() => { /* se reintenta al generar */ });
        }, 500);
    }

    function obtener(text, timeoutMs) {
        text = String(text || '').trim();
        const k = hash(text);
        if (!cache.has(k)) {
            const p = llamar(text, dictadoPara(text))
                .then(r => { listos.add(k); return r; })
                .catch(e => { cache.delete(k); throw e; });
            cache.set(k, p);
            if (cache.size > 30) cache.delete(cache.keys().next().value);
        }
        const p = cache.get(k);
        if (!timeoutMs) return p;
        return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('tiempo de espera agotado')), timeoutMs))]);
    }
    const listo = (text) => listos.has(hash(String(text || '').trim()));

    function extraerJSON(t) {
        const s = String(t || '');
        const i = s.indexOf('{'), j = s.lastIndexOf('}');
        if (i < 0 || j <= i) throw new Error('respuesta sin JSON');
        return JSON.parse(s.slice(i, j + 1));
    }

    async function llamar(informe, dictado) {
        const apiKey = localStorage.getItem('anthropic_api_key');
        if (!apiKey) throw new Error('falta la clave de Anthropic');
        const exc = excepciones();
        let user = '';
        if (exc.length) {
            user += 'OBSERVACIONES QUE EL RADIÓLOGO YA INDICÓ QUE NO SON ERRORES (no las repitas, ni otras equivalentes):\n'
                + exc.slice(-40).map(e => `- [${e.tipo}] ${e.mensaje} (texto: "${e.cita}")`).join('\n') + '\n\n';
        }
        user += dictado
            ? `DICTADO ORIGINAL:\n"""\n${dictado}\n"""\n\n`
            : 'DICTADO ORIGINAL: no disponible (NO revises "no_dictado" ni "omision").\n\n';
        user += `INFORME FINAL A REVISAR:\n"""\n${informe}\n"""`;

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
                max_tokens: 1500,
                system: [{ type: 'text', text: PROMPT_FIJO, cache_control: { type: 'ephemeral', ttl: '1h' } }],
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
        const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
        let obs = [];
        try { obs = (extraerJSON(text).observaciones) || []; } catch (e) { console.warn('Revisor IA: respuesta no interpretable', text); obs = []; }
        const exc2 = excepciones();
        const normInforme = norm(informe);
        obs = obs.filter(o => o && o.mensaje)
            .map(o => ({
                tipo: String(o.tipo || 'otro'),
                gravedad: o.gravedad === 'alta' ? 'alta' : 'media',
                cita: String(o.cita || '').trim(),
                mensaje: String(o.mensaje).trim(),
                reemplazo: String(o.reemplazo || '').trim(),
            }))
            // descarta lo ya marcado como "no es error"
            .filter(o => !exc2.some(e => e.tipo === o.tipo && norm(e.cita) === norm(o.cita)))
            // sin dictado no se aceptan observaciones de contenido no dictado / omisión
            .filter(o => dictado || (o.tipo !== 'no_dictado' && o.tipo !== 'omision'))
            // la cita debe existir en el informe (si no, se muestra igual pero sin "Aplicar")
            .map(o => (o.cita && normInforme.includes(norm(o.cita))) ? o : { ...o, reemplazo: '' });
        return { observaciones: obs, usd, conDictado: !!dictado };
    }

    // ---------- Configuración (modal ⚙) ----------
    let sec = null;
    function renderCfg() {
        if (!sec) return;
        const c = cfg();
        sec.querySelector('[data-ria="on"]').checked = c.enabled;
        sec.querySelector('[data-ria="alcance"]').value = c.alcance;
        const cost = read(COST_KEY, null);
        const mismo = cost && cost.mes === mesActual();
        sec.querySelector('.ria-costo').textContent = mismo
            ? `Este mes: ${cost.n} revisión(es) · US$ ${cost.usd.toFixed(cost.usd < 1 ? 4 : 2)}`
            : 'Este mes: sin revisiones aún.';
        const n = excepciones().length;
        sec.querySelector('.ria-exc').textContent = `${n} excepción(es) "No es error"`;
        sec.querySelector('[data-ria="clear"]').hidden = n === 0;
        let key = null;
        try { key = localStorage.getItem('anthropic_api_key'); } catch (e) { /* noop */ }
        sec.querySelector('.ria-warn').hidden = !!key;
    }
    function buildUI() {
        const modal = document.getElementById('config-modal');
        if (!modal) return;
        sec = document.createElement('div');
        sec.className = 'backup-section ria-section';
        sec.innerHTML = `
            <h3>Revisor con IA (Claude Haiku 5.5)</h3>
            <p class="small-text">Antes de generar el Word o enviar por Gmail revisa concordancia, contenido no dictado, omisiones, contradicciones, lateralidad y palabras mal transcritas. Nunca cambia el texto por sí solo.</p>
            <p class="small-text ria-warn" style="color:#fbbf24">Necesita tu clave de Anthropic (arriba, en esta misma ventana).</p>
            <div class="row">
                <label><input type="checkbox" data-ria="on"> Activado</label>
                <label>Revisar: <select data-ria="alcance" style="margin-left:6px;padding:4px 8px;background:rgba(15,23,42,.6);color:var(--text-primary);border:1px solid var(--glass-border);border-radius:6px">
                    <option value="todos">Todos los informes</option>
                    <option value="cbct_atm">Solo CBCT y ATM</option>
                </select></label>
            </div>
            <div class="row">
                <span class="small-text ria-costo"></span>
                <span class="small-text ria-exc"></span>
                <button type="button" class="btn secondary-btn" data-ria="clear" style="padding:4px 10px;font-size:.78rem">Borrar excepciones</button>
            </div>`;
        const body = modal.querySelector('.modal-body');
        const backup = body.querySelector('.backup-section');
        body.insertBefore(sec, backup || null);
        sec.addEventListener('change', (e) => {
            if (e.target.dataset.ria === 'on') setCfg({ enabled: e.target.checked });
            if (e.target.dataset.ria === 'alcance') setCfg({ alcance: e.target.value });
        });
        sec.addEventListener('click', (e) => {
            if (e.target.closest('[data-ria="clear"]') && confirm('¿Borrar todas las excepciones "No es error"? El revisor podría volver a marcarlas.')) {
                write(EXC_KEY, []);
                renderCfg();
            }
        });
        const cfgBtn = document.getElementById('config-btn');
        if (cfgBtn) cfgBtn.addEventListener('click', renderCfg);
        renderCfg();
    }

    window.GTXRevisorIA = { prefetch, obtener, listo, enabledFor, agregarExcepcion, excepciones, MODEL, PRICE, _prompt: PROMPT_FIJO };
    buildUI();
})();
