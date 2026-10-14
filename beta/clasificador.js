/**
 * CLASIFICADOR DE RADIOGRAFÍAS (Claude con visión) — prototipo beta
 * ------------------------------------------------------------
 * Para cada imagen de un set intraoral determina tipo (periapical / bite-wing / panorámica),
 * arcada, región y LADO del paciente, con confianza. Se envían todas las imágenes del set
 * en una sola consulta para que el modelo use el contexto (pares simétricos, restauraciones
 * que se repiten entre imágenes).
 *
 * Convención: se clasifica la imagen TAL COMO SE VE en el tablero (con la rotación/espejo
 * aplicados): lado derecho del paciente a la izquierda de la pantalla.
 *
 * API: window.GTXClasificador = { clasificar, coincide, puntaje, modelo, setModelo, MODELOS,
 *                                 registrarConfirmacion, estadisticas, borrarEstadisticas }
 */
(function () {
    'use strict';
    const MODELOS = {
        'claude-sonnet-5-5': { nombre: 'Sonnet 5.5 (recomendado)', input: 2, output: 10 },
        'claude-opus-5-5': { nombre: 'Opus 5.5 (más preciso, ~2× costo)', input: 4, output: 20 },
        'claude-haiku-5-5': { nombre: 'Haiku 5.5 (económico, menos preciso)', input: 0.10, output: 0.50 },
    };
    const MODEL_KEY = 'gtx_clasif_modelo';
    const LOG_KEY = 'gtx_clasif_log';       // confirmaciones del radiólogo: [{ts, modelo, pred, real, ok}]
    const COST_KEY = 'gtx_clasif_costo';    // { mes, usd, n }
    const LOTE = 20;                        // imágenes por consulta

    const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch (e) { return d; } };
    const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* noop */ } };
    const modelo = () => { const m = read(MODEL_KEY, null); return MODELOS[m] ? m : 'claude-sonnet-5-5'; };
    const setModelo = (m) => { if (MODELOS[m]) write(MODEL_KEY, m); };

    const PROMPT = `Eres un radiólogo maxilofacial experto. Recibirás varias radiografías odontológicas de UN MISMO paciente, numeradas en orden ("Imagen 1", "Imagen 2", …). Clasifica cada una.

CAMPOS POR IMAGEN:
- "tipo": "periapical" | "bitewing" | "panoramica" | "oclusal" | "otra" (fotografía, documento, cefalometría, etc.)
- "arcada": "sup" | "inf" | "ambas" (bite-wing y panorámica = "ambas")
- "region": "molares" | "premolares" | "canino" | "incisivos" | null. En bite-wing: "molares" si está centrada en molares, "premolares" si está centrada en premolares, null si abarca ambos por igual o es panorámica.
- "lado": "der" | "izq" | "centro" — lado DEL PACIENTE. "centro" solo para imágenes centradas en la línea media (incisivos).
- "dientes": dientes visibles más probables en notación FDI con punto ("1.6", "4.7"; temporales 5.x–8.x).
- "confianza": 0 a 1 sobre el LADO y la REGIÓN.
- "advertencia": texto breve si la imagen parece espejada, rotada, o hay algo que impide decidir; "" si no.
- "razon": máximo 20 palabras con los rasgos que usaste.

CONVENCIÓN DE VISUALIZACIÓN (clave para el lado):
Las imágenes se muestran como si se mirara al paciente de frente: el lado DERECHO del paciente aparece a la IZQUIERDA de la imagen.
- Sector posterior: si los molares (lo distal: coronas más anchas, terceros molares, tuberosidad o rama) quedan hacia el borde IZQUIERDO de la imagen → lado "der". Si quedan hacia el borde DERECHO → lado "izq".
- Lo mesial (premolares, canino) apunta hacia la línea media.
- Superior: coronas hacia abajo, raíces hacia arriba; se ve seno maxilar, piso de fosas nasales, tuberosidad, apófisis cigomática. Inferior: coronas hacia arriba; se ve conducto mandibular, agujero mentoniano, línea oblicua, cortical basal.
- Identificación: molares con corona ancha, 2–3 raíces y furca; premolares con corona más angosta y 1–2 raíces; canino con la raíz más larga y única; incisivos con coronas en pala. Línea media: sutura palatina media / agujero incisivo (superior), espinas mentonianas / tubérculos geni (inferior).
- Mantén coherencia: "lado" debe concordar con "dientes" (cuadrantes 1, 4, 5, 8 = der; 2, 3, 6, 7 = izq).

USA EL CONJUNTO: un set completo suele tener pares simétricos derecho/izquierdo en ambas arcadas (y bite-wings derecha e izquierda). Restauraciones, coronas, implantes o ausencias que se repiten en dos imágenes indican que muestran el mismo sector; úsalo para ubicar las dudosas y evitar asignar dos imágenes idénticas al mismo sector sin razón.

Si no puedes decidir con seguridad, baja la confianza (no adivines con confianza alta).

FORMATO: responde SOLO con JSON válido, sin texto adicional:
{"imagenes":[{"n":1,"tipo":"periapical","arcada":"sup","region":"molares","lado":"der","dientes":["1.6","1.7"],"confianza":0.9,"advertencia":"","razon":"…"}]}`;

    function extraerJSON(t) {
        const s = String(t || '');
        const i = s.indexOf('{'), j = s.lastIndexOf('}');
        if (i < 0 || j <= i) throw new Error('respuesta sin JSON');
        return JSON.parse(s.slice(i, j + 1));
    }

    function blobToB64(blob) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result).split(',')[1]);
            r.onerror = () => reject(r.error);
            r.readAsDataURL(blob);
        });
    }

    const LADOS = { 1: 'der', 4: 'der', 5: 'der', 8: 'der', 2: 'izq', 3: 'izq', 6: 'izq', 7: 'izq' };

    /** Normaliza la respuesta y baja la confianza si el lado no concuerda con los dientes FDI. */
    function normalizar(o) {
        const v = (x, ok) => ok.includes(x) ? x : null;
        const c = {
            tipo: v(o.tipo, ['periapical', 'bitewing', 'panoramica', 'oclusal', 'otra']) || 'otra',
            arcada: v(o.arcada, ['sup', 'inf', 'ambas']),
            region: v(o.region, ['molares', 'premolares', 'canino', 'incisivos']),
            lado: v(o.lado, ['der', 'izq', 'centro']),
            dientes: Array.isArray(o.dientes) ? o.dientes.map(String).slice(0, 12) : [],
            conf: Math.max(0, Math.min(1, Number(o.confianza) || 0)),
            adv: String(o.advertencia || '').trim().slice(0, 160),
            razon: String(o.razon || '').trim().slice(0, 200),
        };
        // Coherencia lado ↔ cuadrantes FDI (para sectores laterales)
        if (c.lado === 'der' || c.lado === 'izq') {
            let der = 0, izq = 0;
            for (const d of c.dientes) { const q = Number(String(d).trim()[0]); if (LADOS[q] === 'der') der++; if (LADOS[q] === 'izq') izq++; }
            const contra = c.lado === 'der' ? izq : der, pro = c.lado === 'der' ? der : izq;
            if (contra > pro) {
                c.conf = Math.min(c.conf, 0.4);
                c.adv = (c.adv ? c.adv + ' · ' : '') + 'el lado no concuerda con los dientes indicados';
            }
        }
        return c;
    }

    function registrarCosto(usage, m) {
        if (!usage) return 0;
        const p = MODELOS[m] || MODELOS['claude-sonnet-5-5'];
        const usd = ((usage.input_tokens || 0) * p.input + (usage.output_tokens || 0) * p.output) / 1e6;
        const mes = new Date().toISOString().slice(0, 7);
        let c = read(COST_KEY, null);
        if (!c || c.mes !== mes) c = { mes, usd: 0, n: 0 };
        c.usd += usd; c.n += 1;
        write(COST_KEY, c);
        return usd;
    }

    async function consultar(lote, m) {
        const apiKey = (() => { try { return localStorage.getItem('anthropic_api_key'); } catch (e) { return null; } })();
        if (!apiKey) throw new Error('falta la clave de Anthropic (⚙ Configuración)');
        const content = [];
        for (let k = 0; k < lote.length; k++) {
            content.push({ type: 'text', text: `Imagen ${k + 1}${lote[k].nombre ? ` (archivo: ${lote[k].nombre})` : ''}:` });
            content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: await blobToB64(lote[k].blob) } });
        }
        content.push({ type: 'text', text: `Clasifica las ${lote.length} imágenes. Responde solo el JSON.` });
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 120000);
        let resp;
        try {
            resp = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                signal: ctrl.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true',
                },
                body: JSON.stringify({
                    model: m,
                    max_tokens: 300 + 220 * lote.length,
                    system: PROMPT,
                    messages: [{ role: 'user', content }],
                }),
            });
        } catch (e) {
            throw new Error(e.name === 'AbortError' ? 'la consulta tardó demasiado' : (e.message || 'sin conexión'));
        } finally { clearTimeout(to); }
        if (!resp.ok) {
            let msg = 'HTTP ' + resp.status;
            try { const e = await resp.json(); msg = (e.error && e.error.message) || msg; } catch (e) { /* noop */ }
            if (/x-api-key|authentication|401/i.test(msg)) msg = 'clave de Anthropic inválida o revocada';
            else if (/credit|billing|balance/i.test(msg)) msg = 'sin saldo en la cuenta de Anthropic';
            else if (/overloaded|529|rate|429/i.test(msg)) msg = 'Anthropic está saturado, intenta en un momento';
            throw new Error(msg);
        }
        const data = await resp.json();
        const usd = registrarCosto(data.usage, m);
        const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
        let arr = [];
        try { arr = extraerJSON(text).imagenes || []; } catch (e) { console.warn('Clasificador: respuesta no interpretable', text); throw new Error('respuesta no interpretable'); }
        const out = lote.map((_, k) => {
            const o = arr.find(x => Number(x.n) === k + 1) || arr[k];
            return o ? normalizar(o) : null;
        });
        return { out, usd };
    }

    /**
     * @param {Array<{id:string, blob:Blob, nombre?:string}>} imagenes JPEG ya orientados como se ven
     * @param {(hechas:number,total:number)=>void} [onProgress]
     * @returns {Promise<{res: Map<string, object>, usd:number, modelo:string}>}
     */
    async function clasificar(imagenes, onProgress) {
        const m = modelo();
        const res = new Map();
        let usd = 0, hechas = 0;
        for (let i = 0; i < imagenes.length; i += LOTE) {
            const lote = imagenes.slice(i, i + LOTE);
            const r = await consultar(lote, m);
            usd += r.usd;
            lote.forEach((im, k) => { if (r.out[k]) res.set(im.id, { ...r.out[k], modelo: m, ts: Date.now() }); });
            hechas += lote.length;
            if (onProgress) onProgress(hechas, imagenes.length);
        }
        return { res, usd, modelo: m };
    }

    // ---------- Comparación clasificación ↔ casilla ----------
    const ADYACENTES = { molares: ['premolares'], premolares: ['molares', 'canino'], canino: ['premolares', 'incisivos'], incisivos: ['canino'] };

    /**
     * Puntaje de ubicar una imagen clasificada (c) en una casilla con etiquetas (t).
     * -Infinity = no corresponde. t = { tipo, arcada?, region?, lado? } (lado 'centro' acepta cualquiera).
     */
    function puntaje(c, t) {
        if (!c || !t || c.tipo !== t.tipo) return -Infinity;
        let s = 10;
        if (t.arcada && c.arcada && t.arcada !== 'ambas' && c.arcada !== t.arcada) return -Infinity;
        if (t.region) {
            if (c.region === t.region) s += 3;
            else if (!c.region) s += 0.5;
            else if ((ADYACENTES[t.region] || []).includes(c.region)) s += 0.5;
            else return -Infinity;
        }
        if (t.lado) {
            if (t.lado === 'centro' || c.lado === 'centro') s += 1;
            else if (c.lado === t.lado) s += 3;
            else return -Infinity;           // nunca cruzar de lado: mejor dejarla en la bandeja
        }
        return s + c.conf;
    }

    /** ¿La casilla corresponde exactamente a la clasificación? (para medir precisión) */
    function coincide(c, t) {
        if (!c || !t || c.tipo !== t.tipo) return false;
        if (t.arcada && t.arcada !== 'ambas' && c.arcada !== t.arcada) return false;
        if (t.lado && t.lado !== 'centro' && c.lado !== t.lado) return false;
        if (t.region && t.tipo === 'periapical' && c.region !== t.region) return false;
        return true;
    }

    // ---------- Medición de precisión (confirmaciones del radiólogo) ----------
    /** pares: [{ c: clasificación, t: etiquetas de la casilla donde quedó }] */
    function registrarConfirmacion(pares) {
        const log = read(LOG_KEY, []);
        let ok = 0, okLado = 0;
        for (const { c, t } of pares) {
            const bien = coincide(c, t);
            const ladoBien = !t.lado || t.lado === 'centro' || c.lado === t.lado;
            if (bien) ok++;
            if (ladoBien) okLado++;
            log.push({ ts: Date.now(), modelo: c.modelo, conf: c.conf, pred: { tipo: c.tipo, arcada: c.arcada, region: c.region, lado: c.lado }, real: t, ok: bien, okLado: ladoBien });
        }
        write(LOG_KEY, log.slice(-3000));
        return { n: pares.length, ok, okLado };
    }

    function estadisticas() {
        const log = read(LOG_KEY, []);
        const n = log.length;
        const pct = (k) => n ? Math.round(100 * k / n) : 0;
        const ok = log.filter(x => x.ok).length, okLado = log.filter(x => x.okLado).length;
        const bw = log.filter(x => x.real && x.real.tipo === 'bitewing');
        const bwOk = bw.filter(x => x.okLado).length;
        const altas = log.filter(x => x.conf >= 0.7), altasOk = altas.filter(x => x.ok).length;
        return {
            n, ok, okLado, pct: pct(ok), pctLado: pct(okLado),
            bw: { n: bw.length, ok: bwOk, pct: bw.length ? Math.round(100 * bwOk / bw.length) : 0 },
            confAlta: { n: altas.length, ok: altasOk, pct: altas.length ? Math.round(100 * altasOk / altas.length) : 0 },
            costo: read(COST_KEY, null),
        };
    }

    function borrarEstadisticas() { write(LOG_KEY, []); }

    window.GTXClasificador = { clasificar, puntaje, coincide, modelo, setModelo, MODELOS, registrarConfirmacion, estadisticas, borrarEstadisticas, _prompt: PROMPT };
})();
