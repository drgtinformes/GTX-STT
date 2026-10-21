/**
 * LECTOR DE ETIQUETA DE LA ORDEN (Claude con visión)
 * ------------------------------------------------------------
 * Algunas órdenes traen pegada una etiqueta/timbre con los datos del paciente:
 *     Nombre · RUN · FN · Rx. (estudio) · Dr(a).: (quien solicita) · fecha
 * Este módulo busca esa etiqueta entre las imágenes de la orden y devuelve el Dr(a). y la fecha
 * (más nombre, FN y Rx por si se necesitan). Si ninguna imagen trae etiqueta, devuelve null.
 *
 * Usa la clave de Anthropic de ⚙ Configuración (localStorage "anthropic_api_key").
 * Modelo económico por defecto (leer texto impreso es fácil); se puede cambiar con
 *   localStorage.setItem('gtx_etiqueta_modelo', 'claude-sonnet-5-5')
 *
 * API: window.GTXEtiqueta = { leer(files), formatearFecha(dia, mes, anio), ultima }
 */
(function () {
    'use strict';
    const MODELO_DEFECTO = 'claude-haiku-5-5';
    const MODELOS_OK = ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'];
    const MODEL_KEY = 'gtx_etiqueta_modelo';
    const POR_CONSULTA = 8;      // imágenes por consulta
    const MAX_CONSULTAS = 3;     // hasta 24 imágenes por orden; se corta apenas aparece la etiqueta
    const MAX_LADO = 1500;       // px del lado mayor (el texto del timbre es pequeño)
    const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    let ultima = null;

    const modelo = () => {
        try { const m = localStorage.getItem(MODEL_KEY); if (MODELOS_OK.includes(m)) return m; } catch (e) { /* noop */ }
        return MODELO_DEFECTO;
    };

    const PROMPT = `Recibirás las imágenes adjuntas a UNA orden de examen radiológico dental (escaneos de la orden, fotos, radiografías). Busca ENTRE ellas una ETIQUETA, TIMBRE o SELLO ADHESIVO con los datos de la orden. Suele verse así:
    Nombre completo del paciente
    RUN.: 12.345.678-9
    FN.: 01-02-1990            (fecha de nacimiento)
    Rx. <estudio solicitado>
    Dr.(a).: <nombre del profesional que solicita>
    <Mes>, <día> de <año>      (p. ej. "Octubre, 20 de 2026")

REGLAS:
- Ignora las radiografías propiamente tales. Solo importa el texto de la etiqueta.
- Transcribe EXACTAMENTE lo que se lee. NO inventes, NO completes y NO corrijas nombres. Si un campo no se lee con seguridad, déjalo vacío (o 0 en los números).
- "doctor": solo nombre y apellido(s) del profesional que solicita, SIN "Dr.", "Dra." ni "Dr(a).". Respeta tildes tal como se ven.
- "dia", "mes" (1 a 12) y "anio" (4 dígitos): la fecha propia de la etiqueta (la última línea del timbre). NO uses la fecha de nacimiento (FN) ni fechas escritas a mano en otras partes del formulario.
- "encontrada": true solo si realmente hay una etiqueta/timbre con datos de la orden en alguna imagen. "n": número de esa imagen (si no la hay, 0).
- "confianza": 0 a 1 sobre la lectura del doctor y la fecha.`;

    const SCHEMA = {
        type: 'object',
        properties: {
            encontrada: { type: 'boolean' },
            n: { type: 'integer' },
            paciente: { type: 'string' },
            run: { type: 'string' },
            fn: { type: 'string' },
            rx: { type: 'string' },
            doctor: { type: 'string' },
            dia: { type: 'integer' },
            mes: { type: 'integer' },
            anio: { type: 'integer' },
            confianza: { type: 'number' },
        },
        required: ['encontrada', 'n', 'paciente', 'run', 'fn', 'rx', 'doctor', 'dia', 'mes', 'anio', 'confianza'],
        additionalProperties: false,
    };

    function formatearFecha(dia, mes, anio) {
        dia = Number(dia); mes = Number(mes); anio = Number(anio);
        if (!(dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12 && anio >= 2000 && anio <= 2100)) return '';
        const d = new Date(anio, mes - 1, dia);
        if (d.getMonth() !== mes - 1 || d.getDate() !== dia) return '';   // p. ej. 31 de febrero
        return `${dia} de ${MESES[mes - 1]} del ${anio}`;
    }

    /** Reduce la imagen a JPEG (lado mayor MAX_LADO). null si el navegador no puede decodificarla. */
    async function reducir(file) {
        let bmp;
        try { bmp = await createImageBitmap(file); } catch (e) { return null; }
        try {
            if (bmp.width < 150 || bmp.height < 150) return null;
            const k = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
            const c = document.createElement('canvas');
            c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
            c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
            return await new Promise(res => c.toBlob(res, 'image/jpeg', 0.85));
        } finally { if (bmp.close) bmp.close(); }
    }
    const blobToB64 = (blob) => new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(',')[1]);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(blob);
    });

    function extraerJSON(t) {
        const s = String(t || '');
        const i = s.indexOf('{'), j = s.lastIndexOf('}');
        if (i < 0 || j <= i) throw new Error('respuesta sin JSON');
        return JSON.parse(s.slice(i, j + 1));
    }

    async function consultar(imgs) {
        const apiKey = (() => { try { return localStorage.getItem('anthropic_api_key'); } catch (e) { return null; } })();
        if (!apiKey) throw new Error('falta la clave de Anthropic (⚙ Configuración)');
        const content = [];
        for (let k = 0; k < imgs.length; k++) {
            content.push({ type: 'text', text: `Imagen ${k + 1}:` });
            content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: await blobToB64(imgs[k]) } });
        }
        content.push({ type: 'text', text: 'Busca la etiqueta de la orden y devuelve el JSON.' });
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 90000);
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
                    model: modelo(),
                    max_tokens: 600,
                    system: PROMPT,
                    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
                    messages: [{ role: 'user', content }],
                }),
            });
        } catch (e) {
            throw new Error(e.name === 'AbortError' ? 'la consulta tardó demasiado' : (e.message || 'sin conexión'));
        } finally { clearTimeout(to); }
        if (!resp.ok) {
            let msg = 'HTTP ' + resp.status;
            try { const e = await resp.json(); ultima = { status: resp.status, error: e }; msg = (e.error && e.error.message) || msg; } catch (e) { /* noop */ }
            if (/x-api-key|authentication|401/i.test(msg)) msg = 'clave de Anthropic inválida o revocada';
            else if (/credit|billing|balance/i.test(msg)) msg = 'sin saldo en la cuenta de Anthropic';
            else if (/overloaded|529|rate|429/i.test(msg)) msg = 'Anthropic está saturado, intenta en un momento';
            throw new Error(msg);
        }
        const data = await resp.json();
        ultima = { stop_reason: data.stop_reason, content: data.content, usage: data.usage };
        if (data.stop_reason === 'refusal') throw new Error('el modelo declinó leer las imágenes');
        const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
        try { return JSON.parse(text); } catch (e) { return extraerJSON(text); }
    }

    /**
     * @param {File[]} files imágenes de la orden
     * @returns {Promise<null | {doctor:string, fecha:string, paciente:string, fn:string, rx:string, confianza:number}>}
     *          null si ninguna imagen trae etiqueta con doctor o fecha legibles.
     */
    async function leer(files) {
        const imgs = [];
        for (const f of (files || [])) {
            const b = await reducir(f);
            if (b) imgs.push(b);
        }
        for (let i = 0, q = 0; i < imgs.length && q < MAX_CONSULTAS; i += POR_CONSULTA, q++) {
            const r = await consultar(imgs.slice(i, i + POR_CONSULTA));
            if (!r || !r.encontrada) continue;
            const doctor = String(r.doctor || '').replace(/^\s*(dr\.?\s*\(a\)\.?|dra?\.?|doctora?)\s*:?\s*/i, '').replace(/\s+/g, ' ').trim();
            const fecha = formatearFecha(r.dia, r.mes, r.anio);
            if (!doctor && !fecha) continue;
            return {
                doctor, fecha,
                paciente: String(r.paciente || '').trim(), fn: String(r.fn || '').trim(), rx: String(r.rx || '').trim(),
                confianza: Math.max(0, Math.min(1, Number(r.confianza) || 0)),
            };
        }
        return null;
    }

    window.GTXEtiqueta = { leer, formatearFecha, get ultima() { return ultima; } };
})();
