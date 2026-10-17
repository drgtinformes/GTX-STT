/**
 * DICCIONARIO CON APROBACIÓN + VERSIONES
 * ------------------------------------------------------------
 * - learnCorrections (main.js) deja las correcciones aprendidas como PROPUESTAS
 *   ('custom_dict_pending'). Aquí se muestran en el modal del Diccionario para
 *   aprobarlas (pasan al diccionario) o rechazarlas (no se vuelven a proponer).
 * - Cada cambio del diccionario guarda la versión anterior (guardarDiccionario en
 *   main.js). Aquí se puede elegir una versión y restaurarla.
 * Usa las variables globales de main.js: correctionsDict, correctionsMeta,
 * guardarDiccionario, renderDict, updateSyncIndicator.
 */
(function () {
    'use strict';
    const PEND_KEY = 'custom_dict_pending';
    const REJ_KEY = 'custom_dict_rejected';
    const VERS_KEY = 'custom_dict_versions';

    const read = (k, def) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || def; } catch (e) { return def; } };
    const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.error(e); } };
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    const loadPending = () => read(PEND_KEY, {});
    const savePending = (p) => { write(PEND_KEY, p); refresh(); };
    const rejKey = (w, r) => norm(w).trim() + '→' + norm(r).trim();
    const isRejected = (w, r) => !!read(REJ_KEY, {})[rejKey(w, r)];
    const count = () => Object.keys(loadPending()).length;

    /** Fragmento del texto original alrededor de la palabra (para decidir con contexto). */
    function context(text, word) {
        const t = String(text || '');
        const i = norm(t).indexOf(norm(word));
        if (i < 0) return '';
        const a = Math.max(0, i - 45), b = Math.min(t.length, i + word.length + 45);
        return (a > 0 ? '…' : '') + t.slice(a, b).replace(/\s+/g, ' ') + (b < t.length ? '…' : '');
    }

    function approve(words) {
        const p = loadPending();
        let n = 0;
        for (const w of words) {
            if (!p[w]) continue;
            correctionsDict[w] = p[w].right;
            correctionsMeta[w] = { auto: true, date: new Date().toLocaleDateString() };
            delete p[w];
            n++;
        }
        if (!n) return;
        guardarDiccionario(n === 1 ? `aprobada: ${words[0]}` : `aprobadas ${n} correcciones`);
        try { localStorage.setItem('custom_dict_meta', JSON.stringify(correctionsMeta)); } catch (e) { /* noop */ }
        write(PEND_KEY, p);
        if (typeof renderDict === 'function') renderDict();
        refresh();
    }

    function reject(words) {
        const p = loadPending();
        const rej = read(REJ_KEY, {});
        for (const w of words) {
            if (!p[w]) continue;
            rej[rejKey(w, p[w].right)] = Date.now();
            delete p[w];
        }
        write(REJ_KEY, rej);
        write(PEND_KEY, p);
        refresh();
    }

    function restoreVersion(idx) {
        const vers = read(VERS_KEY, []);
        const v = vers[idx];
        if (!v) return;
        let dict;
        try { dict = JSON.parse(v.dict); } catch (e) { alert('Esa versión está dañada.'); return; }
        const fecha = new Date(v.ts).toLocaleString('es-CL');
        if (!confirm(`¿Restaurar el diccionario como estaba el ${fecha} (${v.n} términos)?\nLa versión actual queda guardada y también puedes volver a ella.`)) return;
        // Reemplaza el contenido manteniendo la misma referencia del objeto
        Object.keys(correctionsDict).forEach(k => delete correctionsDict[k]);
        Object.assign(correctionsDict, dict);
        guardarDiccionario('restaurada versión del ' + fecha);
        if (typeof renderDict === 'function') renderDict();
        refresh();
        if (window.GTXToast) window.GTXToast('Diccionario restaurado', 'ok');
    }

    // ---------- UI dentro del modal del Diccionario ----------
    let box, versBox;
    function buildUI() {
        const modal = document.getElementById('dict-modal');
        if (!modal) return;
        const body = modal.querySelector('.modal-body');
        box = document.createElement('div');
        box.className = 'dict-pending';
        box.hidden = true;
        const addSection = body.querySelector('.dict-add-section');
        body.insertBefore(box, addSection);
        box.addEventListener('click', (e) => {
            const b = e.target.closest('button[data-act]');
            if (!b) return;
            const w = b.dataset.w;
            if (b.dataset.act === 'ok') approve([w]);
            else if (b.dataset.act === 'no') reject([w]);
            else if (b.dataset.act === 'ok-all') approve(Object.keys(loadPending()));
            else if (b.dataset.act === 'no-all') reject(Object.keys(loadPending()));
        });

        versBox = document.createElement('div');
        versBox.className = 'dict-versions';
        body.appendChild(versBox);
        versBox.addEventListener('click', (e) => {
            if (e.target.closest('[data-restore]')) restoreVersion(Number(versBox.querySelector('select').value));
        });

        // El indicador "N correcciones por revisar" abre el diccionario
        const ind = document.getElementById('ai-sync-indicator');
        if (ind) ind.addEventListener('click', () => {
            if (!count()) return;
            if (typeof renderDict === 'function') renderDict();
            modal.classList.remove('hidden');
            refresh();
        });
        const dictBtn = document.getElementById('dict-btn');
        if (dictBtn) dictBtn.addEventListener('click', () => refresh());
    }

    function refresh() {
        if (box) {
            const p = loadPending();
            const keys = Object.keys(p);
            box.hidden = keys.length === 0;
            box.innerHTML = keys.length ? `
                <h3>Correcciones aprendidas por revisar (${keys.length})</h3>
                <p>Se aprendieron de tus ediciones. Solo se aplicarán si las apruebas.</p>
                ${keys.map(w => `
                    <div class="dict-pending-row">
                        <span class="pair"><b>${esc(w)}</b> → <i>${esc(p[w].right)}</i>${p[w].ctx ? `<span class="ctx" title="${esc(p[w].ctx)}">${esc(p[w].ctx)}</span>` : ''}</span>
                        <button class="ok" data-act="ok" data-w="${esc(w)}" title="Aprobar">✓</button>
                        <button class="no" data-act="no" data-w="${esc(w)}" title="Rechazar (no se volverá a proponer)">✕</button>
                    </div>`).join('')}
                <div class="dict-pending-actions">
                    <button class="no" data-act="no-all">Rechazar todas</button>
                    <button class="ok" data-act="ok-all">Aprobar todas</button>
                </div>` : '';
        }
        if (versBox) {
            const vers = read(VERS_KEY, []);
            versBox.innerHTML = vers.length ? `
                <span>Versiones anteriores:</span>
                <select>${vers.map((v, i) => `<option value="${i}">${esc(new Date(v.ts).toLocaleString('es-CL'))} · ${v.n} términos · antes de: ${esc(v.motivo)}</option>`).join('')}</select>
                <button data-restore>Restaurar</button>` : '';
        }
        if (typeof updateSyncIndicator === 'function') {
            const ind = document.getElementById('ai-sync-indicator');
            if (ind && (ind.classList.contains('idle') || ind.classList.contains('pending'))) updateSyncIndicator('idle');
        }
    }

    window.GTXDictReview = { loadPending, savePending, isRejected, context, count, approve, reject, refresh, restoreVersion };
    buildUI();
    refresh();
})();
