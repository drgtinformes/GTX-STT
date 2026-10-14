/**
 * REVISOR CLÍNICO (antes de generar Word / PDF / enviar por Gmail)
 * ------------------------------------------------------------
 * Reglas deterministas y conservadoras (pocas falsas alarmas). Si encuentra algo,
 * muestra la lista y deja elegir "Corregir" o "Continuar igual". Nunca cambia el texto.
 *
 * Reglas:
 *  - Nomenclatura FDI inexistente (p. ej. 1.9, 5.7).
 *  - Diente en la sección del arco equivocado (3.x/4.x bajo MAXILAR, 1.x/2.x bajo MANDÍBULA).
 *  - Mismo diente informado dos veces en la misma sección.
 *  - Concordancia raíces ↔ conductos/periápices:
 *      · "Birradiculado" + raíz accesoria/tercera raíz.
 *      · "Unirradicular" + periápices/raíces en plural.
 *      · Molar (x.6, x.7) con "conducto" y "periápice" ambos en singular sin mencionar raíz única/fusionada.
 *      · Incisivo/canino (x.1–x.3) con "periápices" en plural sin mencionar dos raíces.
 *  - Diente "Ausente" descrito con cámara, conductos, periápice, restauración o caries.
 *  - Restos de dictado/IA: <end>, undefined, [marcadores], **, ##, palabras repetidas ("de de").
 *  - Primera línea que no parece el nombre del paciente.
 * Criterios del Dr. que NO se marcan (a propósito): ausencia de cierres regionales de
 * estructuras sanas, rótulo "Desdentado parcial", espacios articulares leves, etc.
 */
(function () {
    'use strict';
    const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const RE_SUP = /^\s*(maxilar|maxilar superior|arcada superior)\s*:?\s*$/i;
    const RE_INF = /^\s*(mand[ií]bula|maxilar inferior|arcada inferior)\s*:?\s*$/i;
    const RE_HEADER = /^\s*[A-ZÁÉÍÓÚÑ0-9 .,()/-]{3,}:\s*$/;           // "ATM DERECHA:", "SENOS MAXILARES:" …
    const RE_ENTRY = /^\s*(dientes?|piezas?)\s+([^:]{1,60}):\s*(.*)$/i;
    const RE_TOOTH = /\b([1-8])\.(\d)\b/g;

    function validFDI(q, t) {
        q = Number(q); t = Number(t);
        if (q >= 1 && q <= 4) return t >= 1 && t <= 8;
        if (q >= 5 && q <= 8) return t >= 1 && t <= 5;
        return false;
    }
    const isUpper = (q) => [1, 2, 5, 6].includes(Number(q));

    /**
     * @param {string} text informe completo
     * @returns {Array<{msg:string, sev:'alta'|'media', line:number, excerpt:string}>}
     */
    function analizar(text) {
        const out = [];
        const lines = String(text || '').split('\n');
        const add = (sev, msg, line) => out.push({ sev, msg, line, excerpt: (lines[line] || '').trim().slice(0, 140) });

        // Primera línea = nombre del paciente (así lo usa prepareDocument)
        const first = lines.findIndex(l => l.trim());
        if (first >= 0) {
            const l = lines[first].trim();
            if (/^(dientes?|maxilar|mand[ií]bula|ant\.|que desea|tipo de estudio|en base)/i.test(l) || /^paciente\s*\.?$/i.test(l)) {
                add('alta', 'La primera línea no parece el nombre del paciente (el Word la usa como nombre).', first);
            }
        }

        let arch = null;                 // 'sup' | 'inf' | null
        let seen = new Map();            // diente -> línea, por sección
        lines.forEach((raw, i) => {
            const line = raw.trim();
            if (!line) return;
            if (RE_SUP.test(line)) { arch = 'sup'; seen = new Map(); return; }
            if (RE_INF.test(line)) { arch = 'inf'; seen = new Map(); return; }
            if (RE_HEADER.test(line) && !RE_ENTRY.test(line)) { arch = null; seen = new Map(); return; }

            // Restos de dictado / IA
            if (/<\s*\/?\s*(end|fin)\s*>/i.test(line)) add('alta', 'Quedó una marca de dictado (<end>) en el texto.', i);
            if (/\b(undefined|null|NaN)\b/.test(line)) add('alta', 'Texto técnico suelto ("undefined"/"null").', i);
            if (/\*\*|^#{1,4}\s|\[[^\]]{1,40}\]/.test(line)) add('media', 'Formato o marcador sobrante (**, ##, [ … ]).', i);
            const rep = /(^|[\s,.;:])(\p{L}{2,})\s+\2(?=[\s,.;:]|$)/iu.exec(line);
            if (rep && !/^(no|si|sí)$/i.test(rep[2])) add('media', `Palabra repetida: "${rep[2]} ${rep[2]}".`, i);

            // FDI inválida en cualquier parte de la línea
            // (se ignoran medidas: "2.0 mm", "1.9 cm", "3.5%"…)
            for (const m of line.matchAll(RE_TOOTH)) {
                const after = line.slice(m.index + m[0].length);
                if (/^\s*(mm|cm|ml|%|°|x\b|grados|a[nñ]os|meses|hu\b)/i.test(after)) continue;
                if (!validFDI(m[1], m[2])) add('alta', `El diente ${m[1]}.${m[2]} no existe en nomenclatura FDI.`, i);
            }

            const e = RE_ENTRY.exec(line);
            if (!e) return;
            const teeth = [...e[2].matchAll(RE_TOOTH)].map(m => ({ q: m[1], t: m[2], id: `${m[1]}.${m[2]}` })).filter(x => validFDI(x.q, x.t));
            const body = e[3] || '';
            const nb = norm(body);

            // Arco equivocado
            if (arch) {
                for (const th of teeth) {
                    const up = isUpper(th.q);
                    if (arch === 'sup' && !up) add('alta', `Diente ${th.id} (inferior) está dentro de la sección MAXILAR.`, i);
                    if (arch === 'inf' && up) add('alta', `Diente ${th.id} (superior) está dentro de la sección MANDÍBULA.`, i);
                }
            }

            // Duplicado en la misma sección (solo entradas de un diente)
            if (teeth.length === 1) {
                const id = teeth[0].id;
                if (seen.has(id)) add('media', `El diente ${id} aparece dos veces en la misma sección (líneas ${seen.get(id) + 1} y ${i + 1}).`, i);
                else seen.set(id, i);
            }

            // Concordancia raíces ↔ conductos / periápices
            if (/birradicul/.test(nb) && /(raiz accesoria|tercera raiz|trirradic)/.test(nb)) {
                add('alta', `Diente ${teeth.map(t => t.id).join(', ')}: "Birradiculado" junto a una raíz accesoria/tercera raíz.`, i);
            }
            if (/(unirradicul|monorradicul)/.test(nb) && /(periapices|raices)\b/.test(nb)) {
                add('alta', `Diente ${teeth.map(t => t.id).join(', ')}: "Unirradicular" con periápices/raíces en plural.`, i);
            }
            if (teeth.length === 1) {
                const t = Number(teeth[0].t), q = Number(teeth[0].q);
                const permanent = q <= 4;
                const singleRootMention = /(unirradic|monorradic|fusionad|conic|una raiz|raiz unica|raices fusionadas)/.test(nb);
                const twoRootMention = /(dos raices|birradic|raices|bifurcad|accesori|dos conductos)/.test(nb);
                if (permanent && (t === 6 || t === 7) && /\bconducto\b/.test(nb) && !/\bconductos\b/.test(nb)
                    && /\bperiapice\b/.test(nb) && !/\bperiapices\b/.test(nb) && !singleRootMention) {
                    add('media', `Diente ${teeth[0].id} (molar): "conducto" y "periápice" en singular. Verifica la concordancia con el número de raíces.`, i);
                }
                if (t >= 1 && t <= 3 && /\bperiapices\b/.test(nb) && !twoRootMention) {
                    add('media', `Diente ${teeth[0].id} (unirradicular habitual): "periápices" en plural. Verifica la concordancia.`, i);
                }
            }

            // Ausente + estructuras del diente
            if (/^ausente\b/.test(nb.trim()) && /(camara pulpar|\bconductos?\b|\bperiapices?\b|restaurad|\bcaries\b)/.test(nb)) {
                add('alta', `Diente ${teeth.map(t => t.id).join(', ')}: informado como "Ausente" pero se describen estructuras del diente.`, i);
            }
        });

        // Quitar duplicados exactos (misma línea y mensaje)
        const seenMsg = new Set();
        return out.filter(o => { const k = o.line + '|' + o.msg; if (seenMsg.has(k)) return false; seenMsg.add(k); return true; })
            .sort((a, b) => (a.sev === b.sev ? a.line - b.line : a.sev === 'alta' ? -1 : 1));
    }

    // ---------- Modal ----------
    let modal = null;
    function ensureModal() {
        if (modal) return modal;
        modal = document.createElement('div');
        modal.id = 'revisor-modal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content glass-panel">
                <div class="modal-header"><h2>Revisión antes de generar</h2></div>
                <div class="modal-body">
                    <p class="modal-desc revisor-desc"></p>
                    <div class="revisor-list"></div>
                    <div class="revisor-actions">
                        <label><input type="checkbox" class="revisor-off"> No revisar en esta sesión</label>
                        <button class="btn secondary-btn" data-rv="fix">Corregir</button>
                        <button class="btn primary-btn" data-rv="go">Continuar igual</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);
        return modal;
    }

    function selectLine(lineIdx) {
        const ta = document.getElementById('transcription');
        if (!ta) return;
        const lines = ta.value.split('\n');
        let start = 0;
        for (let i = 0; i < lineIdx && i < lines.length; i++) start += lines[i].length + 1;
        const end = start + (lines[lineIdx] || '').length;
        ta.focus();
        ta.setSelectionRange(start, end);
        // desplazar aprox. a la línea
        const lh = parseFloat(getComputedStyle(ta).lineHeight) || 22;
        ta.scrollTop = Math.max(0, (ta.value.slice(0, start).split('\n').length - 3) * lh);
    }

    let disabledSession = false;

    const TIPO_IA = {
        concordancia: 'Concordancia', no_dictado: 'No dictado', omision: 'Omisión', contradiccion: 'Contradicción',
        lateralidad: 'Lateralidad', transcripcion: 'Transcripción', otro: 'Revisar',
    };

    /** Línea (0-based) donde aparece la cita dentro del texto, o -1. */
    function lineaDe(text, cita) {
        if (!cita) return -1;
        let i = text.indexOf(cita);
        if (i < 0) i = norm(text).indexOf(norm(cita)); // aproximado si cambian tildes/espacios
        if (i < 0) return -1;
        return text.slice(0, i).split('\n').length - 1;
    }

    /** Observaciones del revisor con IA para este texto (espera hasta 15 s). */
    async function observacionesIA(text) {
        const IA = window.GTXRevisorIA;
        if (!IA || !IA.enabledFor(text)) return { items: [], nota: '' };
        if (!IA.listo(text) && window.GTXToast) window.GTXToast('Revisando el informe con IA…', 'info', 2500);
        try {
            const r = await IA.obtener(text, 15000);
            const lines = text.split('\n');
            const items = r.observaciones.map(o => {
                const line = lineaDe(text, o.cita);
                return {
                    ia: true, o, sev: o.gravedad, line,
                    msg: `${TIPO_IA[o.tipo] || 'Revisar'}: ${o.mensaje}`,
                    excerpt: o.cita || (line >= 0 ? (lines[line] || '').trim().slice(0, 140) : ''),
                };
            });
            return { items, nota: '' };
        } catch (e) {
            console.warn('Revisor IA:', e);
            const m = String(e && e.message || '');
            let causa = m;
            if (/x-api-key|authentication|401/i.test(m)) causa = 'clave de Anthropic inválida o revocada — actualízala en ⚙ Configuración';
            else if (/credit|billing|balance/i.test(m)) causa = 'sin saldo en la cuenta de Anthropic';
            else if (/overloaded|529|rate|429/i.test(m)) causa = 'Anthropic está saturado, intenta de nuevo en un momento';
            return { items: [], nota: `La revisión con IA no respondió (${causa}); se muestran solo las reglas.` };
        }
    }

    /** Devuelve true si se puede continuar. */
    async function revisar(text) {
        if (disabledSession) return true;
        const issues = analizar(text);
        const ia = await observacionesIA(text);
        issues.push(...ia.items);
        if (!issues.length) {
            if (ia.nota && window.GTXToast) window.GTXToast(ia.nota, 'warn', 6000);
            return true;
        }
        const m = ensureModal();
        const nAlta = issues.filter(x => x.sev === 'alta').length;
        m.querySelector('.revisor-desc').textContent = `Encontré ${issues.length} punto(s) para revisar${nAlta ? ` (${nAlta} importante${nAlta > 1 ? 's' : ''})` : ''}. Haz clic en uno para ir a esa línea.` + (ia.nota ? ' ' + ia.nota : '');
        m.querySelector('.revisor-list').innerHTML = issues.map((x, k) => `
            <div class="revisor-item ${x.sev} ${x.ia ? 'ia' : ''}" data-k="${k}" style="cursor:pointer">
                ${x.ia ? '<span class="rv-tag">IA</span> ' : ''}${esc(x.msg)}
                <span class="where">${x.line >= 0 ? 'Línea ' + (x.line + 1) + ': ' : ''}${esc(x.excerpt)}</span>
                ${x.ia ? `<span class="rv-actions">
                    ${x.o.reemplazo ? `<button type="button" data-apply="${k}" title="Reemplazar por: ${esc(x.o.reemplazo)}">Aplicar: “${esc(x.o.reemplazo.slice(0, 60))}”</button>` : ''}
                    <button type="button" data-noerr="${k}" title="No volver a marcar esto">No es error</button>
                </span>` : ''}
            </div>`).join('');
        m.querySelector('.revisor-off').checked = false;
        m.classList.remove('hidden');
        return new Promise(resolve => {
            const done = (val) => {
                m.classList.add('hidden');
                m.removeEventListener('click', onClick);
                if (m.querySelector('.revisor-off').checked) disabledSession = true;
                resolve(val);
            };
            const onClick = (e) => {
                const ap = e.target.closest('[data-apply]');
                if (ap) {
                    const x = issues[Number(ap.dataset.apply)];
                    const ta = document.getElementById('transcription');
                    if (ta && x.o.cita && ta.value.includes(x.o.cita)) {
                        ta.value = ta.value.replace(x.o.cita, x.o.reemplazo);
                        ta.dispatchEvent(new Event('input', { bubbles: true }));
                        ap.closest('.revisor-item').classList.add('done');
                        ap.textContent = 'Aplicado ✓';
                        ap.disabled = true;
                    } else if (window.GTXToast) {
                        window.GTXToast('No encontré ese texto exacto; corrígelo a mano.', 'warn');
                    }
                    return;
                }
                const ne = e.target.closest('[data-noerr]');
                if (ne) {
                    const x = issues[Number(ne.dataset.noerr)];
                    if (window.GTXRevisorIA) window.GTXRevisorIA.agregarExcepcion(x.o);
                    const it = ne.closest('.revisor-item');
                    it.classList.add('done');
                    ne.textContent = 'No se volverá a marcar ✓';
                    ne.disabled = true;
                    return;
                }
                const b = e.target.closest('[data-rv]');
                if (b) { done(b.dataset.rv === 'go'); return; }
                const it = e.target.closest('.revisor-item');
                if (it) {
                    const x = issues[Number(it.dataset.k)];
                    done(false);
                    if (x.line >= 0) setTimeout(() => selectLine(x.line), 50);
                }
            };
            m.addEventListener('click', onClick);
        });
    }

    window.GTXRevisor = { analizar, revisar };
})();
