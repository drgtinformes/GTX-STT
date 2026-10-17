/**
 * RESPALDO DE CONFIGURACIÓN
 * Exporta / importa en un solo archivo .json todo lo que la app guarda en el navegador:
 * diccionario, macros, plantillas subidas, historial, contador, ajustes y (opcional)
 * claves de API. No incluye las imágenes del tablero ni la sesión de Gmail.
 */
(function () {
    'use strict';
    const EXCLUDE = new Set([
        'gmail_access_token', 'gemini_models_cache', 'gtx_ws_mode', 'gtx_ws_board',
        'gtx_active_order', 'custom_dict_versions',
    ]);
    const isKey = (k) => /_api_key$/.test(k);

    function allKeys() {
        const set = new Set();
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k) continue;
            set.add(k.startsWith('beta__') ? k.slice(6) : k);   // en la beta: valor efectivo
        }
        return [...set].filter(k => !EXCLUDE.has(k)).sort();
    }

    function exportBackup(includeKeys) {
        const data = {};
        for (const k of allKeys()) {
            if (isKey(k) && !includeKeys) continue;
            const v = localStorage.getItem(k);
            if (v !== null) data[k] = v;
        }
        const payload = { app: 'GTX-STT', tipo: 'respaldo', version: 1, creado: new Date().toISOString(), incluyeClaves: !!includeKeys, data };
        const blob = new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' });
        const a = document.createElement('a');
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        a.href = URL.createObjectURL(blob);
        a.download = `GTX-STT-respaldo-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        try { localStorage.setItem('gtx_last_backup', String(Date.now())); } catch (e) { /* noop */ }
        renderLast();
        return payload;
    }

    function describe(data) {
        const parts = [];
        const count = (k) => { try { const v = JSON.parse(data[k]); return Array.isArray(v) ? v.length : Object.keys(v || {}).length; } catch (e) { return 0; } };
        if (data.custom_dict) parts.push(`diccionario (${count('custom_dict')} términos)`);
        if (data.user_macros) parts.push(`macros (${count('user_macros')})`);
        if (data.user_templates) parts.push(`plantillas subidas (${count('user_templates')})`);
        if (data.dictationHistory) parts.push(`historial (${count('dictationHistory')} informes)`);
        const nKeys = Object.keys(data).filter(isKey).length;
        if (nKeys) parts.push(`${nKeys} clave(s) de API`);
        const rest = Object.keys(data).length - parts.length;
        if (rest > 0) parts.push('ajustes');
        return parts.join(', ');
    }

    async function importBackup(file) {
        let payload;
        try { payload = JSON.parse(await file.text()); } catch (e) { alert('El archivo no es un respaldo válido.'); return false; }
        if (!payload || payload.app !== 'GTX-STT' || !payload.data) { alert('El archivo no es un respaldo de GTX-STT.'); return false; }
        const fecha = new Date(payload.creado).toLocaleString('es-CL');
        if (!confirm(`Respaldo del ${fecha}:\n${describe(payload.data)}\n\nSe reemplazará la configuración actual con la del respaldo y la página se recargará.\n(El diccionario actual queda guardado en "Versiones anteriores".) ¿Continuar?`)) return false;
        // Guardar el diccionario actual como versión antes de reemplazarlo
        try {
            const cur = localStorage.getItem('custom_dict');
            if (cur && payload.data.custom_dict && cur !== payload.data.custom_dict) {
                const vers = JSON.parse(localStorage.getItem('custom_dict_versions') || '[]') || [];
                let n = 0; try { n = Object.keys(JSON.parse(cur)).length; } catch (e) { /* noop */ }
                vers.unshift({ ts: Date.now(), motivo: 'importación de respaldo', n, dict: cur });
                localStorage.setItem('custom_dict_versions', JSON.stringify(vers.slice(0, 20)));
            }
        } catch (e) { /* noop */ }
        let ok = 0, fail = 0;
        for (const [k, v] of Object.entries(payload.data)) {
            if (EXCLUDE.has(k) || typeof v !== 'string') continue;
            try { localStorage.setItem(k, v); ok++; } catch (e) { fail++; }
        }
        if (fail) alert(`Se restauraron ${ok} elementos; ${fail} no cupieron en el almacenamiento del navegador.`);
        location.reload();
        return true;
    }

    // ---------- UI en el modal de Configuración ----------
    let lastEl;
    function renderLast() {
        if (!lastEl) return;
        const ts = Number(localStorage.getItem('gtx_last_backup') || 0);
        lastEl.textContent = ts ? 'Último respaldo: ' + new Date(ts).toLocaleString('es-CL') : 'Aún no has descargado un respaldo.';
    }

    function buildUI() {
        const modal = document.getElementById('config-modal');
        if (!modal) return;
        const body = modal.querySelector('.modal-body');
        const sec = document.createElement('div');
        sec.className = 'backup-section';
        sec.innerHTML = `
            <h3>Respaldo de configuración</h3>
            <p class="small-text">Descarga en un archivo tu diccionario, macros, plantillas subidas, historial y ajustes, para recuperarlos si se borra el navegador o cambias de computador.</p>
            <div class="row">
                <button type="button" class="btn secondary-btn" data-bk="export"><i data-lucide="download"></i> Descargar respaldo</button>
                <button type="button" class="btn secondary-btn" data-bk="import"><i data-lucide="upload"></i> Restaurar respaldo</button>
                <label><input type="checkbox" data-bk="keys"> Incluir claves de API (guarda el archivo en un lugar seguro)</label>
                <input type="file" accept=".json,application/json" hidden data-bk="file">
            </div>
            <p class="small-text backup-last" style="margin-top:6px"></p>`;
        body.appendChild(sec);
        lastEl = sec.querySelector('.backup-last');
        const fileIn = sec.querySelector('[data-bk="file"]');
        sec.addEventListener('click', (e) => {
            const b = e.target.closest('button[data-bk]');
            if (!b) return;
            if (b.dataset.bk === 'export') exportBackup(sec.querySelector('[data-bk="keys"]').checked);
            else if (b.dataset.bk === 'import') fileIn.click();
        });
        fileIn.addEventListener('change', () => {
            const f = fileIn.files[0];
            fileIn.value = '';
            if (f) importBackup(f);
        });
        renderLast();
        if (window.lucide) window.lucide.createIcons({ root: sec });
    }

    window.GTXBackup = { exportBackup, importBackup, allKeys };
    buildUI();
})();
