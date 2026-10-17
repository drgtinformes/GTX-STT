/**
 * CARPETA DE INFORMES POR PLANTILLA (centro)
 * ------------------------------------------------------------
 * Cada plantilla puede tener asignada una carpeta del computador. Con carpeta asignada:
 *  - El botón Word guarda el informe DIRECTO en esa carpeta (sin pasar por Descargas).
 *  - Si ya existe un archivo con ese nombre, pregunta si reemplazarlo o guardarlo como "(2)".
 *  - Al aplicar una corrección en "Revisar tanda", el Word corregido SOBRESCRIBE el mismo
 *    archivo, con el mismo nombre: no quedan duplicados.
 * Sin carpeta asignada (o en un navegador sin soporte, p. ej. Firefox), todo sigue como antes:
 * el Word se descarga.
 *
 * Usa la File System Access API de Chrome/Edge. Los permisos los da el Dr. al elegir la carpeta;
 * Chrome puede volver a pedir "Permitir" al abrir la app otro día (un clic, al presionar Word).
 */
(function () {
    'use strict';

    const soportado = typeof window.showDirectoryPicker === 'function' && window.isSecureContext;
    const toast = (msg, kind, ms) => { if (window.GTXToast) window.GTXToast(msg, kind, ms); else console.log(msg); };
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const limpiarNombre = (n) => String(n || 'Informe').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim() || 'Informe';

    // ---------- IndexedDB (los "handles" de carpeta se pueden guardar ahí) ----------
    let dbp = null;
    function db() {
        if (!dbp) {
            dbp = new Promise((res, rej) => {
                const r = indexedDB.open('gtx-carpetas', 1);
                r.onupgradeneeded = () => r.result.createObjectStore('carpetas', { keyPath: 'templateId' });
                r.onsuccess = () => res(r.result);
                r.onerror = () => rej(r.error);
            });
        }
        return dbp;
    }
    const cache = new Map();   // templateId -> { templateId, handle, nombre }
    async function cargar() {
        const d = await db();
        const all = await new Promise((res, rej) => {
            const q = d.transaction('carpetas').objectStore('carpetas').getAll();
            q.onsuccess = () => res(q.result || []);
            q.onerror = () => rej(q.error);
        });
        cache.clear();
        all.forEach(x => cache.set(x.templateId, x));
    }
    async function guardarAsignacion(rec) {
        const d = await db();
        await new Promise((res, rej) => {
            const tx = d.transaction('carpetas', 'readwrite');
            tx.objectStore('carpetas').put(rec);
            tx.oncomplete = res; tx.onerror = () => rej(tx.error);
        });
        cache.set(rec.templateId, rec);
    }
    async function quitarAsignacion(templateId) {
        const d = await db();
        await new Promise((res, rej) => {
            const tx = d.transaction('carpetas', 'readwrite');
            tx.objectStore('carpetas').delete(templateId);
            tx.oncomplete = res; tx.onerror = () => rej(tx.error);
        });
        cache.delete(templateId);
    }

    const asignada = (templateId) => cache.get(templateId) || null;

    /** true si hay permiso de escritura. Con pedir=true lo solicita (requiere un clic reciente). */
    async function permiso(handle, pedir) {
        const opts = { mode: 'readwrite' };
        try {
            if ((await handle.queryPermission(opts)) === 'granted') return true;
            if (pedir && (await handle.requestPermission(opts)) === 'granted') return true;
        } catch (e) { /* sin gesto de usuario o handle inválido */ }
        return false;
    }

    // Solicitud de permiso lanzada al presionar Word (fase de captura); guardarNuevo la espera
    let solicitudEnCurso = null;

    async function existe(dir, nombre) {
        try { await dir.getFileHandle(nombre); return true; } catch (e) { return false; }
    }
    async function escribir(dir, nombre, blob) {
        const fh = await dir.getFileHandle(nombre, { create: true });
        const w = await fh.createWritable();
        await w.write(blob);
        await w.close();
    }

    function descargar(blob, nombre) {
        if (typeof window.saveAs === 'function') window.saveAs(blob, nombre);
        return { modo: 'descarga', nombre };
    }

    /**
     * Guarda un Word nuevo (botón Word). Devuelve { modo: 'carpeta'|'descarga', nombre, carpeta? }.
     * Si el archivo ya existe en la carpeta, pregunta: Aceptar = reemplazar, Cancelar = "(2)".
     */
    async function guardarNuevo(blob, fileNameBase, templateId) {
        const base = limpiarNombre(fileNameBase);
        let nombre = base + '.docx';
        const a = soportado && asignada(templateId);
        if (!a) return descargar(blob, nombre);
        try {
            if (solicitudEnCurso) { await solicitudEnCurso; solicitudEnCurso = null; }
            if (!(await permiso(a.handle, true))) {
                toast(`Sin permiso para la carpeta "${a.nombre}": el Word se descargó. Al presionar Word, acepta "Permitir".`, 'warn', 8000);
                return descargar(blob, nombre);
            }
            if (await existe(a.handle, nombre)) {
                const reemplazar = confirm(`Ya existe "${nombre}" en la carpeta "${a.nombre}".\n\nAceptar = reemplazarlo\nCancelar = guardar una copia aparte`);
                if (!reemplazar) {
                    let k = 2;
                    while (await existe(a.handle, `${base} (${k}).docx`)) k++;
                    nombre = `${base} (${k}).docx`;
                }
            }
            await escribir(a.handle, nombre, blob);
            return { modo: 'carpeta', nombre, carpeta: a.nombre };
        } catch (e) {
            console.error('Carpeta de informes:', e);
            toast('No se pudo guardar en la carpeta (' + (e.message || e) + '): el Word se descargó.', 'warn', 8000);
            return descargar(blob, nombre);
        }
    }

    /** Sobrescribe un Word ya guardado en la carpeta (corrección de la tanda). Si no se puede, lo descarga. */
    async function sobrescribir(blob, nombre, templateId) {
        const a = soportado && asignada(templateId);
        if (!a) return descargar(blob, nombre);
        try {
            if (!(await permiso(a.handle, true))) return descargar(blob, nombre);
            await escribir(a.handle, nombre, blob);
            return { modo: 'carpeta', nombre, carpeta: a.nombre };
        } catch (e) {
            console.error('Carpeta de informes:', e);
            return descargar(blob, nombre);
        }
    }

    async function elegir(templateId) {
        if (!soportado) { alert('Este navegador no permite guardar en carpetas. Usa Chrome o Edge.'); return null; }
        try {
            const handle = await window.showDirectoryPicker({ id: ('gtx-' + templateId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32), mode: 'readwrite' });
            const rec = { templateId, handle, nombre: handle.name, ts: Date.now() };
            await guardarAsignacion(rec);
            toast(`Los informes de esta plantilla se guardarán en "${handle.name}".`, 'ok', 5000);
            render();
            return rec;
        } catch (e) {
            if (e && e.name !== 'AbortError') alert('No se pudo usar esa carpeta: ' + (e.message || e));
            return null;
        }
    }

    // ---------- UI: botón junto al selector de plantilla ----------
    let btn = null;
    const sel = () => document.getElementById('template-select');
    function render() {
        if (!btn) return;
        const s = sel();
        const a = s && asignada(s.value);
        btn.innerHTML = `<i data-lucide="${a ? 'folder-check' : 'folder-plus'}"></i><span>${a ? esc(a.nombre) : 'Elegir carpeta'}</span>`;
        btn.title = a
            ? `Los Word de esta plantilla se guardan en "${a.nombre}". Clic para cambiar o quitar.`
            : 'Elegir la carpeta donde se guardan los Word de esta plantilla (si no, se descargan)';
        btn.classList.toggle('con-carpeta', !!a);
        if (window.lucide) window.lucide.createIcons({ root: btn });
    }
    async function onBtn() {
        const s = sel();
        if (!s || !s.value) return;
        const a = asignada(s.value);
        const nombrePlantilla = s.options[s.selectedIndex] ? s.options[s.selectedIndex].text : s.value;
        if (a) {
            const r = prompt(`Plantilla "${nombrePlantilla}": los Word se guardan en "${a.nombre}".\n\nEscribe 1 para elegir otra carpeta, o 2 para quitarla (volver a descargar).`, '1');
            if (r === '2') { await quitarAsignacion(s.value); toast('Carpeta quitada: los Word de esta plantilla se descargarán.', 'info', 4000); render(); }
            else if (r === '1') await elegir(s.value);
            return;
        }
        await elegir(s.value);
    }

    function css() {
        const st = document.createElement('style');
        st.textContent = `
#carpeta-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 12px;border-radius:8px;background:rgba(255,255,255,.05);border:1px solid var(--glass-border);color:var(--text-secondary);font:500 .85rem 'Outfit',sans-serif;cursor:pointer;max-width:220px}
#carpeta-btn span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#carpeta-btn svg{width:17px;height:17px;flex:0 0 auto}
#carpeta-btn.con-carpeta{color:#86efac;border-color:rgba(16,185,129,.5)}
#carpeta-btn:hover{background:rgba(255,255,255,.1)}`;
        document.head.appendChild(st);
    }

    function init() {
        if (!soportado) return;   // Firefox / Safari: sin botón, todo como antes
        css();
        btn = document.createElement('button');
        btn.id = 'carpeta-btn';
        btn.type = 'button';
        const ref = document.getElementById('manage-templates-btn');
        if (ref && ref.parentNode) ref.parentNode.insertBefore(btn, ref.nextSibling);
        btn.addEventListener('click', onBtn);
        const s = sel();
        if (s) s.addEventListener('change', render);
        // Pedir el permiso apenas se presiona Word (el clic cuenta como gesto; después, tras la
        // revisión del informe, ya no serviría para que Chrome muestre "Permitir").
        const w = document.getElementById('generate-word-btn');
        if (w) w.addEventListener('click', () => {
            const a = s && asignada(s.value);
            if (a) solicitudEnCurso = permiso(a.handle, true);
        }, true);
        cargar().then(render).catch(e => console.warn('Carpetas:', e));
        // El selector de plantillas se llena después: refrescar cuando cambie su contenido
        if (s) new MutationObserver(render).observe(s, { childList: true });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

    window.GTXCarpetas = { soportado, asignada, guardarNuevo, sobrescribir, elegir, _limpiarNombre: limpiarNombre };
})();
