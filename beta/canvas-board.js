/**
 * GTX CANVAS — tablero de imágenes tipo PureRef
 * ------------------------------------------------------------
 * - Mover imágenes, escalarlas (esquinas o Ctrl+rueda), zoom/pan del tablero.
 * - Selección múltiple (recuadro, Shift/Ctrl+clic, Ctrl+A) y ajustes en grupo.
 * - Rotar 90°, espejar, invertir, brillo/contraste/nitidez por imagen o en grupo.
 * - Ordenar automático (panorámicas arriba, el resto en filas) y ajustar a pantalla.
 * - Arrastrar archivos, pegar con Ctrl+V o botón "Agregar".
 * - Persistencia en IndexedDB (las imágenes no caben en localStorage).
 * - Funciona igual dentro de la app (pantalla dividida) o en ventana aparte
 *   (canvas.html), sincronizado por BroadcastChannel.
 *
 * API pública: window.GTXCanvasBoard (clase), window.GTXCanvasStore, window.GTX_CANVAS_CHANNEL
 */
(function () {
    'use strict';

    // ---------- Almacenamiento (IndexedDB) ----------
    const DB_NAME = 'gtx-canvas';
    const DB_VER = 1;
    let _dbp = null;

    function openDB() {
        if (_dbp) return _dbp;
        _dbp = new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VER);
            req.onupgradeneeded = () => {
                const d = req.result;
                if (!d.objectStoreNames.contains('images')) d.createObjectStore('images');
                if (!d.objectStoreNames.contains('boards')) d.createObjectStore('boards');
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        return _dbp;
    }

    function idb(store, mode, fn) {
        return openDB().then(d => new Promise((resolve, reject) => {
            const tx = d.transaction(store, mode);
            const req = fn(tx.objectStore(store));
            tx.oncomplete = () => resolve(req ? req.result : undefined);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        }));
    }

    const Store = {
        getBoard: (id) => idb('boards', 'readonly', s => s.get(id)),
        putBoard: (id, b) => idb('boards', 'readwrite', s => s.put(b, id)),
        delBoard: (id) => idb('boards', 'readwrite', s => s.delete(id)),
        getImage: (k) => idb('images', 'readonly', s => s.get(k)),
        putImage: (k, blob) => idb('images', 'readwrite', s => s.put(blob, k)),
        delImage: (k) => idb('images', 'readwrite', s => s.delete(k)),
        allBoards: () => openDB().then(d => new Promise((resolve, reject) => {
            const out = [];
            const tx = d.transaction('boards', 'readonly');
            const req = tx.objectStore('boards').openCursor();
            req.onsuccess = () => { const c = req.result; if (c) { out.push({ id: c.key, data: c.value }); c.continue(); } };
            tx.oncomplete = () => resolve(out);
            tx.onerror = () => reject(tx.error);
        })),
        /** Borra tableros (y sus imágenes) sin uso hace más de `days` días. */
        async prune(days, keepIds = []) {
            const limit = Date.now() - days * 86400000;
            const boards = await Store.allBoards();
            const usedKeys = new Set();
            const toDelete = [];
            for (const b of boards) {
                const old = b.data && b.data.updated && b.data.updated < limit && !keepIds.includes(b.id);
                if (old) toDelete.push(b);
                else ((b.data && b.data.items) || []).forEach(it => usedKeys.add(it.key));
            }
            for (const b of toDelete) {
                for (const it of (b.data.items || [])) if (!usedKeys.has(it.key)) await Store.delImage(it.key).catch(() => {});
                await Store.delBoard(b.id).catch(() => {});
            }
            return toDelete.length;
        },
    };

    const CHANNEL_NAME = 'gtx-canvas';

    // ---------- Utilidades ----------
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const uid = () => 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const isImageFile = (f) => f && (f.type ? f.type.startsWith('image/') : /\.(jpe?g|png|gif|bmp|webp|tiff?)$/i.test(f.name || ''));

    function imageSize(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = () => reject(new Error('No se pudo leer la imagen'));
            img.src = url;
        });
    }

    // ---------- Lectura de lo que se suelta en el tablero ----------
    const IMG_NAME = /\.(jpe?g|png|gif|bmp|webp|avif)$/i;
    function readAllEntries(dir) {
        return new Promise(res => {
            const r = dir.createReader(); const out = [];
            const next = () => r.readEntries(b => { if (!b.length) return res(out); out.push(...b); next(); }, () => res(out));
            next();
        });
    }
    async function filesFromEntry(en, limit, out) {
        if (out.length >= limit) return out;
        if (en.isFile) {
            const f = await new Promise(r => en.file(r, () => r(null)));
            if (f) out.push(f);
        } else if (en.isDirectory) {
            for (const c of await readAllEntries(en)) await filesFromEntry(c, limit, out);
        }
        return out;
    }
    /** URLs de imágenes arrastradas desde una página web (text/uri-list y <img> del HTML). */
    function urlsFromDrop(uriList, html) {
        const urls = [];
        (uriList || '').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#')).forEach(u => urls.push(u));
        if (html) {
            try {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                doc.querySelectorAll('img[src]').forEach(i => urls.push(i.getAttribute('src')));
                doc.querySelectorAll('a[href]').forEach(a => { const h = a.getAttribute('href'); if (IMG_NAME.test(h.split('?')[0])) urls.push(h); });
            } catch (e) { /* noop */ }
        }
        return [...new Set(urls)].filter(u => /^(https?:|data:image\/|blob:)/i.test(u)).slice(0, 40);
    }
    const PROXY_KEY = 'gtx_image_proxy_url';
    const MIME_BY_EXT = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', avif: 'image/avif' };
    function imageProxyUrl() { try { return (localStorage.getItem(PROXY_KEY) || '').trim().replace(/\/+$/, ''); } catch (e) { return ''; } }
    const hostOf = (u) => { try { return new URL(u).hostname; } catch (e) { return ''; } };

    async function blobToImageFile(blob, name) {
        let type = blob.type;
        const ext = (name.split('.').pop() || '').toLowerCase();
        if (!/^image\//.test(type)) {
            if (!MIME_BY_EXT[ext]) throw new Error('no es imagen');
            type = MIME_BY_EXT[ext];
        }
        return new File([blob], IMG_NAME.test(name) ? name : name + '.' + (type.split('/')[1] || 'jpg').replace('jpeg', 'jpg'), { type });
    }

    /** Descarga imágenes por dirección: primero directo; si el sitio lo bloquea, a través del proxy (Worker). */
    async function fetchImageUrls(urls) {
        const files = [], failed = [];
        const proxy = imageProxyUrl();
        for (const u of urls) {
            const name = (u.startsWith('data:') ? 'imagen' : decodeURIComponent(u.split('?')[0].split('/').pop() || 'imagen')).slice(0, 80);
            const host = hostOf(u);
            try {
                const r = await fetch(u, { credentials: 'omit' });
                if (!r.ok) throw new Error('HTTP ' + r.status);
                files.push(await blobToImageFile(await r.blob(), name));
                continue;
            } catch (e) { /* bloqueado por el sitio (CORS) o no es imagen: probar con el proxy */ }
            if (proxy && /^https?:/i.test(u)) {
                try {
                    const r = await fetch(proxy + '/?url=' + encodeURIComponent(u));
                    if (!r.ok) throw new Error((await r.text().catch(() => '')) || ('HTTP ' + r.status));
                    files.push(await blobToImageFile(await r.blob(), name));
                    continue;
                } catch (e) {
                    failed.push({ name, why: `tampoco se pudo con el proxy: ${String(e.message || e).slice(0, 80)}` });
                    continue;
                }
            }
            failed.push({ name, why: `${host ? 'el sitio ' + host : 'la página de origen'} no permite copiarla; configura el "Proxy de imágenes del tablero" en ⚙ Configuración`, needsProxy: true });
        }
        return { files, failed };
    }

    const ZMIN = 0.02, ZMAX = 16;
    const GAP = 30;
    const SHARP_LEVELS = 10;

    // ---------- Plantillas de disposición (casillas) ----------
    // Coordenadas en unidades del tablero. Las imágenes se encajan "contain" (sin recortar).
    const TPL_STORE_KEY = 'gtx_canvas_templates';
    const TRAY_CELL = 320, TRAY_GAP = 24, TRAY_COLS = 2;

    function rowOf(types, labels, y0, alignBottom) {
        // types: 'L' (horizontal 320×250) o 'P' (vertical 245×335)
        const D = { L: { w: 320, h: 250 }, P: { w: 245, h: 335 } };
        const maxH = Math.max(...types.map(t => D[t].h));
        let x = 0;
        return types.map((t, i) => {
            const d = D[t];
            const s = { x, y: y0 + (alignBottom ? maxH - d.h : 0), w: d.w, h: d.h, label: labels[i] };
            x += d.w + 12;
            return s;
        });
    }

    const BUILTIN_TEMPLATES = (() => {
        const L = (x, y, label) => ({ x, y, w: 320, h: 250, label });
        const P = (x, y, label) => ({ x, y, w: 245, h: 335, label });
        const withIds = (pfx, slots) => slots.map((s, i) => ({ id: `${pfx}-${i + 1}`, ...s }));
        const reg7 = ['Molares der.', 'Premolares der.', 'Canino der.', 'Incisivos', 'Canino izq.', 'Premolares izq.', 'Molares izq.'];
        return [
            {
                id: 'fmx18', name: 'Set total (18)',
                slots: withIds('fmx18', [
                    L(0, 0, 'Sup 1'), L(0, 262, 'Sup 2'),
                    P(332, 0, 'Sup 3'), P(589, 0, 'Sup 4'), P(846, 0, 'Sup 5'), P(1103, 0, 'Sup 6'),
                    L(1360, 0, 'Sup 7'), L(1360, 262, 'Sup 8'),
                    { x: 470, y: 380, w: 320, h: 260, label: 'BW der.' },
                    { x: 890, y: 380, w: 320, h: 260, label: 'BW izq.' },
                    L(0, 560, 'Inf 1'), L(0, 822, 'Inf 2'),
                    P(332, 737, 'Inf 3'), P(589, 737, 'Inf 4'), P(846, 737, 'Inf 5'), P(1103, 737, 'Inf 6'),
                    L(1360, 560, 'Inf 7'), L(1360, 822, 'Inf 8'),
                ]),
            },
            {
                id: 'fmx14', name: 'Set total (14)',
                slots: withIds('fmx14', [
                    ...rowOf(['L', 'L', 'P', 'P', 'P', 'L', 'L'], reg7, 0, true),
                    ...rowOf(['L', 'L', 'P', 'P', 'P', 'L', 'L'], reg7, 375, false),
                ]),
            },
            {
                id: 'pano-bw2', name: 'Panorámica + 2 BW',
                slots: withIds('pano-bw2', [
                    { x: 0, y: 0, w: 1600, h: 800, label: 'Panorámica' },
                    { x: 380, y: 840, w: 400, h: 320, label: 'BW der.' },
                    { x: 820, y: 840, w: 400, h: 320, label: 'BW izq.' },
                ]),
            },
            {
                id: 'bw4', name: 'Bite-wings (4)',
                slots: withIds('bw4', ['Molares der.', 'Premolares der.', 'Premolares izq.', 'Molares izq.']
                    .map((label, i) => ({ x: i * 412, y: 0, w: 400, h: 320, label }))),
            },
            {
                id: 'cmp2', name: 'Comparación (2)',
                slots: withIds('cmp2', [
                    { x: 0, y: 0, w: 800, h: 640, label: 'Imagen 1' },
                    { x: 830, y: 0, w: 800, h: 640, label: 'Imagen 2' },
                ]),
            },
        ];
    })();

    const TemplateStore = {
        custom() {
            try { const v = JSON.parse(localStorage.getItem(TPL_STORE_KEY) || '[]'); return Array.isArray(v) ? v : []; }
            catch (e) { return []; }
        },
        saveCustom(list) { try { localStorage.setItem(TPL_STORE_KEY, JSON.stringify(list)); } catch (e) { /* noop */ } },
        all() { return [...BUILTIN_TEMPLATES, ...TemplateStore.custom()]; },
        get(id) { return TemplateStore.all().find(t => t.id === id) || null; },
    };

    const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

    const HELP = [
        ['Rueda', 'Zoom del tablero'],
        ['Botón central, botón derecho o Espacio + arrastrar', 'Mover el tablero'],
        ['Arrastrar sobre el fondo', 'Seleccionar varias imágenes (recuadro)'],
        ['Shift / Ctrl + clic', 'Agregar o quitar una imagen de la selección'],
        ['Ctrl+A', 'Seleccionar todas'],
        ['Arrastrar imagen', 'Mover (todas las seleccionadas)'],
        ['Esquinas o Ctrl + rueda sobre la imagen', 'Agrandar / achicar (también en grupo)'],
        ['Doble clic', 'Enfocar imagen (otra vez o Esc para volver)'],
        ['R / Shift+R', 'Rotar derecha / izquierda'],
        ['H', 'Espejar'],
        ['I', 'Invertir'],
        ['F', 'Ajustar todo a pantalla'],
        ['A', 'Ordenar automático'],
        ['Supr', 'Quitar las seleccionadas'],
        ['Ctrl+Z', 'Deshacer la última eliminación'],
        ['Ctrl+V', 'Pegar imagen (con el tablero activo)'],
        ['Plantilla: arrastrar a una casilla', 'Ubica la imagen en esa casilla'],
        ['Plantilla: arrastrar sobre otra imagen', 'Intercambia las dos imágenes'],
        ['A con plantilla', 'Re-encaja y llena las casillas vacías'],
    ];

    /** Filtros SVG de nitidez (convolución "unsharp") reutilizables por CSS: url(#cb-sharp-N) */
    function ensureSharpenDefs(doc) {
        if (doc.getElementById('cb-sharp-defs')) return;
        const NS = 'http://www.w3.org/2000/svg';
        const svg = doc.createElementNS(NS, 'svg');
        svg.setAttribute('id', 'cb-sharp-defs');
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.setAttribute('aria-hidden', 'true');
        svg.style.position = 'absolute';
        let defs = '';
        for (let n = 1; n <= SHARP_LEVELS; n++) {
            const k = (n * 0.12).toFixed(3);
            const c = (1 + 4 * n * 0.12).toFixed(3);
            defs += `<filter id="cb-sharp-${n}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
                `<feConvolveMatrix order="3" preserveAlpha="true" edgeMode="duplicate" kernelMatrix="0 -${k} 0 -${k} ${c} -${k} 0 -${k} 0"/></filter>`;
        }
        svg.innerHTML = `<defs>${defs}</defs>`;
        (doc.body || doc.documentElement).appendChild(svg);
    }

    // ---------- Tablero ----------
    class Board {
        /**
         * @param {HTMLElement} container
         * @param {{boardId?:string, onPopout?:Function, onClose?:Function, popoutLabel?:string, closeLabel?:string}} opts
         */
        constructor(container, opts = {}) {
            this.container = container;
            this.opts = opts;
            this.boardId = opts.boardId || 'default';
            this.items = [];
            this.view = { x: 0, y: 0, z: 1 };
            this.urls = new Map();       // key -> objectURL
            this.els = new Map();        // id  -> element
            this.sel = new Set();        // ids seleccionados
            this.primary = null;         // última imagen clicada (referencia para los controles)
            this.focusPrev = null;       // vista previa al doble clic
            this.spaceDown = false;
            this.drag = null;
            this._undo = null;           // última eliminación (Ctrl+Z)
            this._saveT = null;
            this._destroyed = false;
            this.template = null;        // plantilla activa {id, name, slots:[{id,x,y,w,h,label}]}
            this.slotEls = new Map();    // slotId -> element
            ensureSharpenDefs(container.ownerDocument || document);
            this._build();
            this._bind();
        }

        /** Compatibilidad: id de la imagen principal seleccionada (o null). */
        get selected() { const it = this._sel(); return it ? it.id : null; }

        // ----- construcción del DOM -----
        _build() {
            const o = this.opts;
            const root = document.createElement('div');
            root.className = 'cb-root';
            root.innerHTML = `
                <div class="cb-toolbar">
                    <button class="cb-btn" data-act="add" title="Agregar imágenes desde archivos"><i data-lucide="image-plus"></i><span>Agregar</span></button>
                    <button class="cb-btn" data-act="arrange" title="Ordenar automático (A)"><i data-lucide="layout-grid"></i><span>Ordenar</span></button>
                    <button class="cb-btn" data-act="tpl" title="Plantillas de disposición (casillas para ordenar las imágenes)"><i data-lucide="layout-template"></i><span class="cb-tpl-label">Plantilla</span></button>
                    <button class="cb-btn" data-act="fit" title="Ajustar todo a pantalla (F)"><i data-lucide="maximize"></i><span>Ajustar</span></button>
                    <span class="cb-zoom" title="Zoom del tablero">100%</span>
                    <span class="cb-title" title=""></span>
                    <span class="cb-spacer"></span>
                    <button class="cb-btn cb-btn-danger" data-act="clear" title="Quitar todas las imágenes del tablero"><i data-lucide="trash-2"></i><span>Limpiar</span></button>
                    <button class="cb-btn cb-icon-only" data-act="help" title="Atajos"><i data-lucide="circle-help"></i></button>
                    ${o.onPopout ? `<button class="cb-btn" data-act="popout" title="${o.popoutTitle || 'Abrir el tablero en otra ventana (segundo monitor)'}"><i data-lucide="${o.popoutIcon || 'square-arrow-out-up-right'}"></i><span>${o.popoutLabel || 'Desacoplar'}</span></button>` : ''}
                    ${o.onClose ? `<button class="cb-btn cb-icon-only" data-act="close" title="${o.closeTitle || 'Cerrar tablero'}"><i data-lucide="x"></i></button>` : ''}
                </div>
                <div class="cb-viewport" tabindex="0">
                    <div class="cb-world"></div>
                    <div class="cb-empty">
                        <i data-lucide="images"></i>
                        <p>Arrastra imágenes aquí, pégalas con <b>Ctrl+V</b><br>o usa <b>Agregar</b></p>
                    </div>
                    <div class="cb-drop-hint">Suelta para agregar</div>
                    <div class="cb-marquee"></div>
                    <div class="cb-itembar">
                        <span class="cb-count"></span>
                        <button data-iact="rotl" title="Rotar a la izquierda (Shift+R)"><i data-lucide="rotate-ccw"></i></button>
                        <button data-iact="rotr" title="Rotar a la derecha (R)"><i data-lucide="rotate-cw"></i></button>
                        <button data-iact="flip" title="Espejar (H)"><i data-lucide="flip-horizontal-2"></i></button>
                        <button data-iact="inv" title="Invertir (I)"><i data-lucide="contrast"></i></button>
                        <button data-iact="adj" title="Brillo, contraste y nitidez"><i data-lucide="sun"></i></button>
                        <span class="cb-sep"></span>
                        <button data-iact="back" title="Enviar atrás (dejar debajo de las demás)"><i data-lucide="send-to-back"></i></button>
                        <button data-iact="focus" title="Enfocar (doble clic)"><i data-lucide="scan-search"></i></button>
                        <button data-iact="reset" title="Restablecer rotación y ajustes"><i data-lucide="undo-2"></i></button>
                        <button data-iact="del" class="cb-del" title="Quitar del tablero (Supr)"><i data-lucide="trash-2"></i></button>
                    </div>
                    <div class="cb-adjust">
                        <div class="cb-adjust-head"></div>
                        <label>Brillo <input type="range" min="40" max="220" step="1" data-adj="br"><output></output></label>
                        <label>Contraste <input type="range" min="40" max="300" step="1" data-adj="ct"><output></output></label>
                        <label>Nitidez <input type="range" min="0" max="100" step="10" data-adj="sh"><output></output></label>
                    </div>
                    <div class="cb-notice"><span></span><button type="button" data-undo>Deshacer</button></div>
                    <div class="cb-help">
                        ${HELP.map(([k, v]) => `<div><kbd>${k}</kbd><span>${v}</span></div>`).join('')}
                    </div>
                </div>
                <div class="cb-tpl-menu"></div>
                <input type="file" accept="image/*" multiple hidden class="cb-file">
            `;
            this.container.appendChild(root);
            this.root = root;
            this.vp = root.querySelector('.cb-viewport');
            this.world = root.querySelector('.cb-world');
            this.tplMenu = root.querySelector('.cb-tpl-menu');
            this.tplBtn = root.querySelector('[data-act="tpl"]');
            this.slotLayer = document.createElement('div');
            this.slotLayer.className = 'cb-slots';
            this.world.appendChild(this.slotLayer);
            this.slotHl = document.createElement('div');
            this.slotHl.className = 'cb-slot-hl';
            this.slotHl.innerHTML = '<span>⇄ Intercambiar</span>';
            this.world.appendChild(this.slotHl);
            this.selbox = document.createElement('div');
            this.selbox.className = 'cb-selbox';
            this.selbox.innerHTML = ['nw', 'ne', 'sw', 'se'].map(c => `<div class="cb-h" data-h="${c}"></div>`).join('');
            this.world.appendChild(this.selbox);
            this.emptyEl = root.querySelector('.cb-empty');
            this.marquee = root.querySelector('.cb-marquee');
            this.itembar = root.querySelector('.cb-itembar');
            this.countEl = root.querySelector('.cb-count');
            this.adjust = root.querySelector('.cb-adjust');
            this.noticeEl = root.querySelector('.cb-notice');
            this.helpEl = root.querySelector('.cb-help');
            this.zoomEl = root.querySelector('.cb-zoom');
            this.titleEl = root.querySelector('.cb-title');
            this.title = '';
            this.fileInput = root.querySelector('.cb-file');
            if (window.lucide) window.lucide.createIcons({ root });
        }

        _bind() {
            const vp = this.vp;
            this._h = {
                pointerdown: (e) => this._onDown(e),
                pointermove: (e) => this._onMove(e),
                pointerup: (e) => this._onUp(e),
                pointercancel: (e) => this._onUp(e),
                wheel: (e) => this._onWheel(e),
                dblclick: (e) => this._onDbl(e),
                keydown: (e) => this._onKey(e),
                keyup: (e) => { if (e.code === 'Space') { this.spaceDown = false; vp.classList.remove('cb-grab'); } },
                dragover: (e) => {
                    if (!this._hasDroppable(e)) return;
                    e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; vp.classList.add('cb-dragging');
                    if (this.template) this._hoverSlot(this._slotAt(this._toWorld(e.clientX, e.clientY)));
                },
                dragleave: (e) => { if (e.target === vp) { vp.classList.remove('cb-dragging'); this._hoverSlot(null); } },
                drop: (e) => this._onDrop(e),
                paste: (e) => this._onPaste(e),
                resize: () => this._renderAll(),
                docdown: (e) => {
                    if (!this.tplMenu.classList.contains('show')) return;
                    if (this.tplMenu.contains(e.target) || this.tplBtn.contains(e.target)) return;
                    this.tplMenu.classList.remove('show');
                },
            };
            document.addEventListener('pointerdown', this._h.docdown, true);
            this.tplMenu.addEventListener('click', (e) => this._onTplMenu(e));
            vp.addEventListener('pointerdown', this._h.pointerdown);
            vp.addEventListener('pointermove', this._h.pointermove);
            vp.addEventListener('pointerup', this._h.pointerup);
            vp.addEventListener('pointercancel', this._h.pointercancel);
            vp.addEventListener('wheel', this._h.wheel, { passive: false });
            vp.addEventListener('dblclick', this._h.dblclick);
            vp.addEventListener('keydown', this._h.keydown);
            vp.addEventListener('keyup', this._h.keyup);
            vp.addEventListener('dragover', this._h.dragover);
            vp.addEventListener('dragleave', this._h.dragleave);
            vp.addEventListener('drop', this._h.drop);
            document.addEventListener('paste', this._h.paste);
            this._ro = new ResizeObserver(() => this._renderAll());
            this._ro.observe(vp);

            // Evitar el "autoscroll" del botón central y el menú contextual (botón derecho = mover)
            vp.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
            vp.addEventListener('contextmenu', (e) => e.preventDefault());

            this.root.querySelector('.cb-toolbar').addEventListener('click', (e) => {
                const b = e.target.closest('[data-act]');
                if (!b) return;
                const act = b.dataset.act;
                if (act === 'add') this.fileInput.click();
                else if (act === 'arrange') this.arrange();
                else if (act === 'tpl') this._toggleTplMenu();
                else if (act === 'fit') this.fit();
                else if (act === 'clear') this.clear();
                else if (act === 'help') this.helpEl.classList.toggle('show');
                else if (act === 'popout' && this.opts.onPopout) this.opts.onPopout();
                else if (act === 'close' && this.opts.onClose) this.opts.onClose();
            });
            this.fileInput.addEventListener('change', () => {
                const files = [...this.fileInput.files];
                this.fileInput.value = '';
                this.addFiles(files);
            });
            this.itembar.addEventListener('pointerdown', (e) => e.stopPropagation());
            this.itembar.addEventListener('click', (e) => {
                const b = e.target.closest('[data-iact]');
                if (b) this._itemAction(b.dataset.iact);
            });
            this.adjust.addEventListener('pointerdown', (e) => e.stopPropagation());
            this.adjust.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
            this.adjust.addEventListener('input', (e) => {
                const inp = e.target.closest('[data-adj]');
                const list = this._selItems();
                if (!list.length || !inp) return;
                const v = Number(inp.value) / 100;
                for (const it of list) { it[inp.dataset.adj] = v; this._renderItem(it); }
                inp.nextElementSibling.textContent = inp.value + '%';
                this._placeItembar();
                this._save();
            });
            this.noticeEl.addEventListener('pointerdown', (e) => e.stopPropagation());
            this.noticeEl.addEventListener('click', (e) => { if (e.target.closest('[data-undo]')) this.undo(); });
            this.helpEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.helpEl.classList.remove('show'); });
        }

        destroy() {
            this._destroyed = true;
            this._finalizeUndo();
            this._flushSave();
            const vp = this.vp;
            for (const [ev, fn] of Object.entries(this._h)) {
                if (ev === 'paste') document.removeEventListener('paste', fn);
                else if (ev === 'docdown') document.removeEventListener('pointerdown', fn, true);
                else if (ev !== 'resize') vp.removeEventListener(ev, fn);
            }
            if (this._ro) this._ro.disconnect();
            for (const url of this.urls.values()) URL.revokeObjectURL(url);
            this.urls.clear();
            this.root.remove();
        }

        setTitle(t) {
            this.title = t || '';
            this.titleEl.textContent = this.title;
            this.titleEl.title = this.title;
        }

        // ----- carga / guardado -----
        async load(boardId, title) {
            this._finalizeUndo();
            if (this._saveT) await this._flushSave();   // guardar el tablero anterior antes de cambiar
            if (boardId) this.boardId = boardId;
            for (const url of this.urls.values()) URL.revokeObjectURL(url);
            this.urls.clear();
            this.view = { x: 0, y: 0, z: 1 };
            this.focusPrev = null;
            let data = null;
            try { data = await Store.getBoard(this.boardId); } catch (e) { console.error('Canvas: no se pudo leer el tablero', e); }
            for (const el of this.els.values()) el.remove();
            this.els.clear();
            this.items = [];
            this.sel.clear();
            this.primary = null;
            if (data && Array.isArray(data.items)) {
                for (const it of data.items) {
                    try {
                        const blob = await Store.getImage(it.key);
                        if (!blob) continue;
                        if (!this.urls.has(it.key)) this.urls.set(it.key, URL.createObjectURL(blob));
                        this.items.push(it);
                    } catch (e) { console.warn('Canvas: imagen no disponible', it.key, e); }
                }
                if (data.view) this.view = data.view;
            }
            this.template = (data && data.template && Array.isArray(data.template.slots)) ? data.template : null;
            if (this.template) {
                const ids = new Set(this.template.slots.map(s => s.id));
                const used = new Set();
                for (const it of this.items) {
                    if (!it.slot) continue;
                    if (!ids.has(it.slot) || used.has(it.slot)) delete it.slot; else used.add(it.slot);
                }
            } else this.items.forEach(it => { delete it.slot; });
            this._renderSlots();
            this.setTitle(title !== undefined ? title : ((data && data.title) || ''));
            this.items.forEach(it => this._ensureEl(it));
            this._renderAll();
            if ((this.items.length || this.template) && !(data && data.view)) this.fit();
        }

        _save() {
            clearTimeout(this._saveT);
            this._saveT = setTimeout(() => this._flushSave(), 250);
        }

        _flushSave() {
            clearTimeout(this._saveT);
            this._saveT = null;
            const data = { items: this.items.map(it => ({ ...it })), view: { ...this.view }, title: this.title || '', template: this.template || null, updated: Date.now() };
            return Store.putBoard(this.boardId, data).catch(e => console.error('Canvas: no se pudo guardar', e));
        }

        // ----- agregar imágenes -----
        _hasFiles(e) {
            return e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
        }
        _hasDroppable(e) {
            const t = [...((e.dataTransfer && e.dataTransfer.types) || [])].map(x => String(x).toLowerCase());
            return t.includes('files') || t.includes('text/uri-list') || t.includes('text/html') || t.includes('downloadurl');
        }

        async _onDrop(e) {
            if (!this._hasDroppable(e)) return;
            e.preventDefault();
            this.vp.classList.remove('cb-dragging');
            this._hoverSlot(null);
            const dt = e.dataTransfer;
            const at = this._toWorld(e.clientX, e.clientY);
            // Todo lo del DataTransfer se lee AHORA (deja de estar disponible después del evento)
            const files = [], dirs = [];
            for (const item of [...(dt.items || [])]) {
                if (item.kind !== 'file') continue;
                const en = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
                if (en && en.isDirectory) dirs.push(en);
                else { const f = item.getAsFile(); if (f) files.push(f); }
            }
            if (!files.length && !dirs.length && dt.files) files.push(...dt.files);
            const uriList = dt.getData('text/uri-list'), html = dt.getData('text/html');
            let dlUrl = '';
            try { dlUrl = dt.getData('DownloadURL'); } catch (e) { /* noop */ }
            // Carpetas completas
            for (const d of dirs) await filesFromEntry(d, 300, files);
            // Desde una página web: vienen direcciones, no archivos
            let failed = [];
            if (!files.length) {
                const extra = dlUrl ? [dlUrl.replace(/^[^:]+:[^:]*:/, '')] : [];
                const r = await fetchImageUrls([...new Set([...extra, ...urlsFromDrop(uriList, html)])].slice(0, 40));
                files.push(...r.files);
                failed = r.failed;
            }
            this._ingest(files, at, failed);
        }

        /** Agrega lo que sea imagen y avisa qué no se pudo agregar y por qué. */
        async _ingest(files, at, failed = []) {
            const skipped = [...failed];
            const cand = [];
            for (const f of files) {
                if (/\.(tiff?|dcm|dicom)$/i.test(f.name || '') || /tiff|dicom/i.test(f.type || '')) skipped.push({ name: f.name, why: 'formato TIFF/DICOM no compatible con el navegador' });
                else if (isImageFile(f) || IMG_NAME.test(f.name || '')) cand.push(f);
                else skipped.push({ name: f.name || 'archivo', why: 'no es una imagen' });
            }
            const added = cand.length ? await this.addFiles(cand, at) : [];
            skipped.push(...(this._lastFailed || []).map(name => ({ name, why: 'no se pudo leer la imagen' })));
            if (skipped.length) {
                const names = skipped.slice(0, 4).map(x => x.name).join(', ') + (skipped.length > 4 ? '…' : '');
                const whys = [...new Set(skipped.map(x => x.why))].join('; ');
                this._notice(`${added.length ? (added.length === 1 ? 'Se agregó 1. ' : `Se agregaron ${added.length}. `) : ''}${skipped.length > 1 ? 'No se pudieron' : 'No se pudo'} agregar ${skipped.length}: ${names} (${whys})`, false, 10000);
            } else if (added.length > 1) {
                this._notice(`Se agregaron ${added.length} imágenes`, false, 3000);
            }
            return added;
        }

        _onPaste(e) {
            // Solo si el tablero está activo (foco dentro) o si nada editable tiene el foco y el mouse está encima
            const ae = document.activeElement;
            const focusedInside = this.root.contains(ae);
            const nothingFocused = !ae || ae === document.body;
            if (!focusedInside && !(nothingFocused && this.vp.matches(':hover'))) return;
            const cd = e.clipboardData;
            let files = cd && cd.files && cd.files.length ? [...cd.files]
                : [...(cd ? cd.items : [])].filter(i => i.kind === 'file').map(i => i.getAsFile()).filter(Boolean);
            if (!files.length) return;
            e.preventDefault();
            this._ingest(files);
        }

        /**
         * Agrega imágenes (File o Blob). Si el tablero estaba vacío, ordena y ajusta.
         * @param {Array<Blob|File>} files
         * @param {{x:number,y:number}} [at] punto del mundo donde soltar
         */
        async addFiles(files, at) {
            files = (files || []).filter(f => f && (isImageFile(f) || IMG_NAME.test(f.name || '') || (f instanceof Blob && !f.type)));
            this._lastFailed = [];
            if (!files.length) return [];
            const wasEmpty = this.items.length === 0;
            const r = this.vp.getBoundingClientRect();
            const center = at || this._toWorld(r.left + r.width / 2, r.top + r.height / 2);
            const visibleW = (r.width || 800) / this.view.z;
            const added = [];
            let i = 0;
            for (const f of files) {
                const key = uid();
                const url = URL.createObjectURL(f);
                let dim;
                try { dim = await imageSize(url); } catch (e) { URL.revokeObjectURL(url); this._lastFailed.push(f.name || 'imagen'); continue; }
                try { await Store.putImage(key, f); } catch (e) { console.error('Canvas: no se pudo guardar la imagen', e); }
                this.urls.set(key, url);
                const maxSide = Math.max(dim.w, dim.h);
                const s = Math.min(1, (visibleW * 0.5) / maxSide);
                const it = {
                    id: uid(), key, name: f.name || '', w: dim.w, h: dim.h,
                    x: center.x - (dim.w * s) / 2 + i * 40 / this.view.z,
                    y: center.y - (dim.h * s) / 2 + i * 40 / this.view.z,
                    s, rot: 0, flip: false, inv: false, br: 1, ct: 1, sh: 0,
                    z: this._topZ() + 1,
                };
                this.items.push(it);
                this._ensureEl(it);
                added.push(it);
                i++;
            }
            if (this.template && added.length) {
                this._placeNewInTemplate(added, at, wasEmpty);
                this._renderAll();
                if (wasEmpty) this.fit(); else this.select(added[added.length - 1].id);
            }
            else if (wasEmpty && this.items.length) { this.arrange(); }
            else { this._renderAll(); if (added.length) this.select(added[added.length - 1].id); }
            this._save();
            return added;
        }

        // ----- plantillas (casillas) -----
        _slotById(id) { return this.template ? this.template.slots.find(s => s.id === id) || null : null; }
        _slotAt(w) { return this.template ? this.template.slots.find(s => inRect(w, s)) || null : null; }
        _occupant(slotId, exceptId) { return this.items.find(it => it.slot === slotId && it.id !== exceptId) || null; }

        /** Escala y centra la imagen dentro del rectángulo, sin recortar. */
        _fitInto(it, r) {
            const rot = (it.rot % 180) !== 0;
            const nw = rot ? it.h : it.w, nh = rot ? it.w : it.h;
            it.s = Math.min(r.w / nw, r.h / nh);
            it.x = r.x + (r.w - nw * it.s) / 2;
            it.y = r.y + (r.h - nh * it.s) / 2;
        }
        _fitToSlot(it, sl) { this._fitInto(it, sl); it.slot = sl.id; }

        _tplBounds() {
            if (!this.template || !this.template.slots.length) return null;
            let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            for (const s of this.template.slots) { x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x + s.w); y1 = Math.max(y1, s.y + s.h); }
            return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
        }

        /** Deja imágenes sin casilla en la "bandeja" (columna a la derecha de la plantilla), en celdas libres. */
        _trayPlace(list) {
            const tb = this._tplBounds();
            if (!tb || !list.length) return;
            const x0 = tb.x + tb.w + 90, y0 = tb.y;
            const pending = new Set(list);
            const overlaps = (o, c) => { const d = this._dims(o); return o.x < c.x + c.w && o.x + d.dw > c.x && o.y < c.y + c.h && o.y + d.dh > c.y; };
            let idx = 0;
            for (const it of list) {
                let cell = null;
                while (idx < 600) {
                    const c = { x: x0 + (idx % TRAY_COLS) * (TRAY_CELL + TRAY_GAP), y: y0 + Math.floor(idx / TRAY_COLS) * (TRAY_CELL + TRAY_GAP), w: TRAY_CELL, h: TRAY_CELL };
                    idx++;
                    if (!this.items.some(o => !pending.has(o) && overlaps(o, c))) { cell = c; break; }
                }
                if (!cell) break;
                delete it.slot;
                this._fitInto(it, cell);
                pending.delete(it);
            }
        }

        /** Llena las casillas vacías (en orden) con las imágenes dadas; las que sobran van a la bandeja. */
        _fillTemplate(order) {
            const free = this.template.slots.filter(sl => !this._occupant(sl.id));
            const left = [];
            for (const it of order) {
                if (it.slot) continue;
                const sl = free.shift();
                if (sl) this._fitToSlot(it, sl); else left.push(it);
            }
            this._trayPlace(left);
        }

        /** Imágenes recién agregadas con una plantilla activa. */
        _placeNewInTemplate(added, at, wasEmpty) {
            const start = at ? this._slotAt(at) : null;
            if (at && !start && !wasEmpty) return;   // soltadas fuera de las casillas: quedan donde se soltaron
            const queue = added.slice();
            if (start) {
                const occ = this._occupant(start.id);
                this._fitToSlot(queue.shift(), start);
                if (occ) this._trayPlace([occ]);
            }
            const slots = this.template.slots;
            const i0 = start ? slots.indexOf(start) + 1 : 0;
            const free = slots.slice(i0).concat(slots.slice(0, i0)).filter(sl => !this._occupant(sl.id));
            const left = [];
            for (const it of queue) { const sl = free.shift(); if (sl) this._fitToSlot(it, sl); else left.push(it); }
            this._trayPlace(left);
        }

        /** Aplica una plantilla (o null para quitarla). Las imágenes se reparten en las casillas en el orden en que llegaron. */
        applyTemplate(tpl) {
            this.template = tpl ? JSON.parse(JSON.stringify({ id: tpl.id, name: tpl.name, slots: tpl.slots })) : null;
            this.items.forEach(it => { delete it.slot; });
            this._renderSlots();
            if (this.template) this._fillTemplate(this.items.slice());
            this.focusPrev = null;
            this._renderAll();
            this.fit();
            this._save();
        }

        _renderSlots() {
            this.slotLayer.innerHTML = '';
            this.slotEls.clear();
            for (const s of (this.template ? this.template.slots : [])) {
                const el = document.createElement('div');
                el.className = 'cb-slot';
                el.style.left = s.x + 'px'; el.style.top = s.y + 'px';
                el.style.width = s.w + 'px'; el.style.height = s.h + 'px';
                el.innerHTML = `<span class="cb-slot-label">${esc(s.label || '')}</span>`;
                this.slotLayer.appendChild(el);
                this.slotEls.set(s.id, el);
            }
            const lbl = this.root.querySelector('.cb-tpl-label');
            if (lbl) lbl.textContent = this.template ? this.template.name : 'Plantilla';
            this.tplBtn.classList.toggle('on', !!this.template);
            this.root.querySelector('[data-act="arrange"]').title = this.template
                ? 'Re-encajar en la plantilla y llenar casillas vacías (A)' : 'Ordenar automático (A)';
        }

        _updateSlotFill() {
            for (const [id, el] of this.slotEls) el.classList.toggle('filled', !!this._occupant(id));
        }

        /** Resalta la casilla de destino durante un arrastre (naranja = intercambio). */
        _hoverSlot(sl, dragged) {
            const hl = this.slotHl.style;
            if (!sl) { hl.display = 'none'; return; }
            const occ = this._occupant(sl.id, dragged ? dragged.id : undefined);
            hl.display = 'block';
            hl.left = sl.x + 'px'; hl.top = sl.y + 'px'; hl.width = sl.w + 'px'; hl.height = sl.h + 'px';
            this.slotHl.classList.toggle('swap', !!(occ && dragged));
        }

        /** Al soltar una imagen arrastrada: encajar en la casilla o intercambiar con la que ya estaba. */
        _dropOnSlot(d, e) {
            const w = this._toWorld(e.clientX, e.clientY);
            if (d.starts.length === 1) {
                const s = d.starts[0], it = s.it;
                const target = this._slotAt(w);
                const prev = s.slot ? this._slotById(s.slot) : null;
                if (!target) { delete it.slot; }
                else {
                    const occ = this._occupant(target.id, it.id);
                    this._fitToSlot(it, target);
                    if (occ) {
                        if (prev && prev.id !== target.id) this._fitToSlot(occ, prev);
                        else { delete occ.slot; this._fitInto(occ, { x: s.x, y: s.y, w: s.dw, h: s.dh }); }
                        this._renderItem(occ);
                    }
                }
                this._renderItem(it);
            } else {
                // Grupo: la imagen que salió de su casilla queda libre
                for (const s of d.starts) {
                    const it = s.it;
                    if (!it.slot) continue;
                    const sl = this._slotById(it.slot), dd = this._dims(it);
                    if (!sl || !inRect({ x: it.x + dd.dw / 2, y: it.y + dd.dh / 2 }, sl)) delete it.slot;
                }
            }
            this._updateSlotFill();
            this._placeItembar();
        }

        // ----- menú de plantillas -----
        _toggleTplMenu() {
            const m = this.tplMenu;
            if (m.classList.contains('show')) { m.classList.remove('show'); return; }
            const cur = this.template && this.template.id;
            const row = (t, custom) => `<button type="button" class="cb-tpl-item${t.id === cur ? ' on' : ''}" data-tpl="${esc(t.id)}">` +
                `<span class="cb-tpl-check">${t.id === cur ? '✓' : ''}</span><span class="cb-tpl-name">${esc(t.name)}</span>` +
                `<span class="cb-tpl-n">${t.slots.length}</span>` +
                (custom ? `<span class="cb-tpl-del" data-tpl-del="${esc(t.id)}" title="Eliminar esta plantilla">×</span>` : '') + `</button>`;
            const custom = TemplateStore.custom();
            m.innerHTML =
                `<div class="cb-tpl-head">Plantillas</div>${BUILTIN_TEMPLATES.map(t => row(t, false)).join('')}` +
                (custom.length ? `<div class="cb-tpl-head">Mis plantillas</div>${custom.map(t => row(t, true)).join('')}` : '') +
                `<div class="cb-tpl-sep"></div>` +
                `<button type="button" class="cb-tpl-item" data-tpl-act="save"${this.items.length ? '' : ' disabled'}><span class="cb-tpl-check">+</span><span class="cb-tpl-name">Guardar disposición actual como plantilla…</span></button>` +
                `<button type="button" class="cb-tpl-item" data-tpl-act="none"${cur ? '' : ' disabled'}><span class="cb-tpl-check"></span><span class="cb-tpl-name">Quitar plantilla</span></button>`;
            const rr = this.root.getBoundingClientRect(), br = this.tplBtn.getBoundingClientRect();
            m.classList.add('show');
            m.style.left = Math.max(6, Math.min(br.left - rr.left, rr.width - m.offsetWidth - 6)) + 'px';
            m.style.top = (br.bottom - rr.top + 4) + 'px';
        }

        _onTplMenu(e) {
            const del = e.target.closest('[data-tpl-del]');
            if (del) {
                e.stopPropagation();
                const id = del.dataset.tplDel;
                const t = TemplateStore.custom().find(x => x.id === id);
                if (t && window.confirm(`¿Eliminar la plantilla "${t.name}"?`)) {
                    TemplateStore.saveCustom(TemplateStore.custom().filter(x => x.id !== id));
                    this.tplMenu.classList.remove('show');
                    this._toggleTplMenu();
                }
                return;
            }
            const b = e.target.closest('button');
            if (!b || b.disabled) return;
            this.tplMenu.classList.remove('show');
            if (b.dataset.tpl) {
                if (this.template && this.template.id === b.dataset.tpl) return;   // ya activa: no re-repartir
                const t = TemplateStore.get(b.dataset.tpl);
                if (t) this.applyTemplate(t);
            } else if (b.dataset.tplAct === 'none') {
                this.applyTemplate(null);
            } else if (b.dataset.tplAct === 'save') {
                this.saveLayoutAsTemplate();
            }
            this.vp.focus({ preventScroll: true });
        }

        /** Crea una plantilla con la posición y tamaño actuales de cada imagen. */
        saveLayoutAsTemplate() {
            if (!this.items.length) return;
            const custom = TemplateStore.custom();
            const name = (window.prompt('Nombre de la nueva plantilla:', `Mi plantilla ${custom.length + 1}`) || '').trim();
            if (!name) return;
            const order = [...this.items].sort((a, b) => (Math.round(a.y / 60) - Math.round(b.y / 60)) || (a.x - b.x));
            const b = this._bounds(order);
            const id = 'c' + Date.now().toString(36);
            const slots = order.map((it, i) => {
                const d = this._dims(it);
                return { id: `${id}-${i + 1}`, x: Math.round(it.x - b.x), y: Math.round(it.y - b.y), w: Math.round(d.dw), h: Math.round(d.dh), label: String(i + 1) };
            });
            const tpl = { id, name: name.slice(0, 60), slots };
            TemplateStore.saveCustom([...custom, tpl]);
            // Activar la nueva plantilla dejando cada imagen en su casilla
            this.template = JSON.parse(JSON.stringify(tpl));
            order.forEach((it, i) => this._fitToSlot(it, this.template.slots[i]));
            // Las casillas quedaron en el origen: llevar las imágenes junto con ellas
            this._renderSlots();
            this._renderAll();
            this.fit();
            this._save();
            this._notice(`Plantilla "${tpl.name}" guardada (${slots.length} casillas)`, false, 4000);
        }

        // ----- geometría -----
        _dims(it) {
            const rotated = (it.rot % 180) !== 0;
            return { dw: (rotated ? it.h : it.w) * it.s, dh: (rotated ? it.w : it.h) * it.s };
        }
        _toWorld(cx, cy) {
            const r = this.vp.getBoundingClientRect();
            return { x: (cx - r.left - this.view.x) / this.view.z, y: (cy - r.top - this.view.y) / this.view.z };
        }
        _topZ() { return this.items.reduce((m, it) => Math.max(m, it.z || 0), 0); }
        _selItems() { return this.items.filter(it => this.sel.has(it.id)); }
        _sel() {
            if (!this.sel.size) return null;
            return this.items.find(it => it.id === this.primary && this.sel.has(it.id)) || this._selItems()[0] || null;
        }
        _bounds(list) {
            const rects = (list || this.items).map(it => { const d = this._dims(it); return { x: it.x, y: it.y, w: d.dw, h: d.dh }; });
            if (!list && this.template) rects.push(...this.template.slots);   // "Ajustar" incluye la plantilla
            if (!rects.length) return null;
            let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            for (const r of rects) {
                x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y);
                x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h);
            }
            return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
        }
        _hit(it, w) {
            const d = this._dims(it);
            return w.x >= it.x && w.x <= it.x + d.dw && w.y >= it.y && w.y <= it.y + d.dh;
        }

        // ----- render -----
        _ensureEl(it) {
            let el = this.els.get(it.id);
            if (el) return el;
            el = document.createElement('div');
            el.className = 'cb-item';
            el.dataset.id = it.id;
            el.innerHTML = `<img draggable="false" alt="">`;
            el.querySelector('img').src = this.urls.get(it.key) || '';
            this.world.appendChild(el);
            this.els.set(it.id, el);
            return el;
        }

        _renderItem(it) {
            const el = this._ensureEl(it);
            const { dw, dh } = this._dims(it);
            el.style.left = it.x + 'px';
            el.style.top = it.y + 'px';
            el.style.width = dw + 'px';
            el.style.height = dh + 'px';
            el.style.zIndex = it.z || 0;
            el.classList.toggle('selected', this.sel.has(it.id));
            const img = el.firstElementChild;
            img.style.width = it.w * it.s + 'px';
            img.style.height = it.h * it.s + 'px';
            img.style.transform = `translate(-50%, -50%) rotate(${it.rot}deg) scaleX(${it.flip ? -1 : 1})`;
            const f = [];
            const sharp = Math.round((it.sh || 0) * SHARP_LEVELS);
            if (sharp > 0) f.push(`url(#cb-sharp-${Math.min(SHARP_LEVELS, sharp)})`);
            if (it.inv) f.push('invert(1)');
            if ((it.br ?? 1) !== 1) f.push(`brightness(${it.br})`);
            if ((it.ct ?? 1) !== 1) f.push(`contrast(${it.ct})`);
            img.style.filter = f.join(' ');
        }

        _placeSelbox() {
            // Las esquinas para redimensionar se muestran solo con UNA imagen seleccionada
            const list = this._selItems();
            if (list.length !== 1) { this.selbox.style.display = 'none'; return; }
            const it = list[0];
            const { dw, dh } = this._dims(it);
            const sb = this.selbox.style;
            sb.display = 'block';
            sb.left = it.x + 'px'; sb.top = it.y + 'px';
            sb.width = dw + 'px'; sb.height = dh + 'px';
        }

        _renderView() {
            const { x, y, z } = this.view;
            this.world.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
            this.world.style.setProperty('--z', z);
            this.zoomEl.textContent = Math.round(z * 100) + '%';
            this._placeItembar();
        }

        _renderAll() {
            if (this._destroyed) return;
            this.items.forEach(it => this._renderItem(it));
            this.emptyEl.style.display = (this.items.length || this.template) ? 'none' : '';
            this._updateSlotFill();
            this._renderView();
        }

        _placeItembar() {
            this._placeSelbox();
            const list = this._selItems();
            if (!list.length) {
                this.itembar.classList.remove('show');
                this.adjust.classList.remove('show');
                return;
            }
            const b = this._bounds(list);
            const vpW = this.vp.clientWidth, vpH = this.vp.clientHeight;
            this.countEl.textContent = list.length > 1 ? `${list.length} imágenes` : '';
            this.countEl.style.display = list.length > 1 ? '' : 'none';
            this.itembar.classList.add('show');
            const bw = this.itembar.offsetWidth || 330, bh = this.itembar.offsetHeight || 36;
            let left = b.x * this.view.z + this.view.x + (b.w * this.view.z) / 2 - bw / 2;
            let top = b.y * this.view.z + this.view.y - bh - 10;
            left = clamp(left, 6, Math.max(6, vpW - bw - 6));
            top = clamp(top, 6, Math.max(6, vpH - bh - 6));
            this.itembar.style.left = left + 'px';
            this.itembar.style.top = top + 'px';
            if (this.adjust.classList.contains('show')) {
                const ah = this.adjust.offsetHeight || 120;
                this.adjust.style.left = left + 'px';
                this.adjust.style.top = (top + bh + 6 + ah > vpH - 6 ? Math.max(6, top - ah - 6) : top + bh + 6) + 'px';
            }
            const all = (fn) => list.every(fn);
            this.itembar.querySelector('[data-iact="inv"]').classList.toggle('on', all(it => !!it.inv));
            this.itembar.querySelector('[data-iact="flip"]').classList.toggle('on', all(it => !!it.flip));
            this.itembar.querySelector('[data-iact="adj"]').classList.toggle('on', list.some(it => (it.br ?? 1) !== 1 || (it.ct ?? 1) !== 1 || (it.sh || 0) > 0));
        }

        // ----- selección -----
        /** Selecciona una sola imagen (o ninguna con null). */
        select(id) { this.setSelection(id ? [id] : [], id); }

        /** Reemplaza la selección por la lista de ids. */
        setSelection(ids, primary) {
            const before = [...this.sel].sort().join(',');
            this.sel = new Set(ids.filter(id => this.items.some(it => it.id === id)));
            this.primary = primary && this.sel.has(primary) ? primary : ([...this.sel].pop() || null);
            const after = [...this.sel].sort().join(',');
            if (before !== after) this.adjust.classList.remove('show');
            else if (this.adjust.classList.contains('show')) this._syncAdjust();
            this.items.forEach(it => this._renderItem(it));
            this._placeItembar();
        }

        selectAll() { this.setSelection(this.items.map(it => it.id), this.primary); }

        _itemAction(act) {
            const list = this._selItems();
            if (!list.length) return;
            const allOn = (k) => list.every(it => !!it[k]);
            if (act === 'rotr' || act === 'rotl') list.forEach(it => this._rotate(it, act === 'rotr' ? 90 : -90));
            else if (act === 'flip') { const v = !allOn('flip'); list.forEach(it => { it.flip = v; }); }
            else if (act === 'inv') { const v = !allOn('inv'); list.forEach(it => { it.inv = v; }); }
            else if (act === 'adj') { this._toggleAdjust(); return; }
            else if (act === 'back') {
                const minZ = this.items.reduce((m, o) => Math.min(m, o.z || 0), Infinity);
                [...list].sort((a, b) => (a.z || 0) - (b.z || 0)).forEach((it, i) => { it.z = minZ - list.length + i; });
            }
            else if (act === 'focus') { this.focusItems(list); return; }
            else if (act === 'reset') { list.forEach(it => { this._rotate(it, -it.rot); it.flip = false; it.inv = false; it.br = 1; it.ct = 1; it.sh = 0; }); this._syncAdjust(); }
            else if (act === 'del') { this.removeMany(list.map(it => it.id)); return; }
            list.forEach(it => this._renderItem(it));
            this._placeItembar();
            this._save();
        }

        _rotate(it, deg) {
            // Rota en torno al centro de la imagen
            const before = this._dims(it);
            const cx = it.x + before.dw / 2, cy = it.y + before.dh / 2;
            it.rot = ((it.rot + deg) % 360 + 360) % 360;
            const after = this._dims(it);
            it.x = cx - after.dw / 2;
            it.y = cy - after.dh / 2;
            // En una casilla: volver a encajar con la nueva orientación
            const sl = it.slot ? this._slotById(it.slot) : null;
            if (sl) this._fitInto(it, sl);
        }

        _toggleAdjust() {
            const show = !this.adjust.classList.contains('show');
            this.adjust.classList.toggle('show', show);
            if (show) this._syncAdjust();
            this._placeItembar();
        }

        _syncAdjust() {
            const ref = this._sel();
            if (!ref) return;
            const n = this.sel.size;
            this.adjust.querySelector('.cb-adjust-head').textContent = n > 1 ? `Ajustes para ${n} imágenes` : '';
            this.adjust.querySelectorAll('[data-adj]').forEach(inp => {
                const k = inp.dataset.adj;
                const def = k === 'sh' ? 0 : 1;
                const v = Math.round((ref[k] ?? def) * 100);
                inp.value = v;
                inp.nextElementSibling.textContent = v + '%';
            });
        }

        // ----- quitar / deshacer -----
        remove(id) { this.removeMany([id]); }

        removeMany(ids) {
            const set = new Set(ids);
            const removed = this.items.filter(it => set.has(it.id));
            if (!removed.length) return;
            this._finalizeUndo();
            this.items = this.items.filter(it => !set.has(it.id));
            for (const it of removed) {
                const el = this.els.get(it.id);
                if (el) el.remove();
                this.els.delete(it.id);
            }
            // Las imágenes se borran definitivamente al confirmar (otra eliminación, cambio de tablero o cierre)
            const orphanKeys = [...new Set(removed.map(it => it.key))].filter(k => !this.items.some(o => o.key === k));
            this._undo = { items: removed, keys: orphanKeys };
            this.setSelection([]);
            this._renderAll();
            this._save();
            this._notice(`${removed.length === 1 ? '1 imagen quitada' : removed.length + ' imágenes quitadas'}`);
        }

        undo() {
            const u = this._undo;
            if (!u) return false;
            this._undo = null;
            for (const it of u.items) {
                if (it.slot && (this._occupant(it.slot) || !this._slotById(it.slot))) delete it.slot;
                this.items.push(it); this._ensureEl(it);
            }
            this.setSelection(u.items.map(it => it.id));
            this._renderAll();
            this._save();
            this._hideNotice();
            this.vp.focus({ preventScroll: true });   // el aviso se oculta: devolver el teclado al tablero
            return true;
        }

        _finalizeUndo() {
            const u = this._undo;
            if (!u) return;
            this._undo = null;
            for (const k of u.keys) {
                if (this.items.some(o => o.key === k)) continue;
                const url = this.urls.get(k);
                if (url) URL.revokeObjectURL(url);
                this.urls.delete(k);
                Store.delImage(k).catch(() => {});
            }
            this._hideNotice();
        }

        _notice(text, withUndo = true, ms = 8000) {
            this.noticeEl.querySelector('span').textContent = text;
            this.noticeEl.querySelector('[data-undo]').style.display = withUndo ? '' : 'none';
            this.noticeEl.classList.add('show');
            clearTimeout(this._noticeT);
            this._noticeT = setTimeout(() => this._hideNotice(), ms);
        }
        _hideNotice() { clearTimeout(this._noticeT); this.noticeEl.classList.remove('show'); }

        async clear(skipConfirm) {
            if (!this.items.length) return;
            if (!skipConfirm && !window.confirm('¿Quitar todas las imágenes del tablero?')) return;
            this._finalizeUndo();
            const keys = [...new Set(this.items.map(it => it.key))];
            [...this.items].forEach(it => { const el = this.els.get(it.id); if (el) el.remove(); });
            this.items = [];
            this.els.clear();
            this.sel.clear();
            this.primary = null;
            for (const k of keys) {
                const url = this.urls.get(k);
                if (url) URL.revokeObjectURL(url);
                this.urls.delete(k);
                Store.delImage(k).catch(() => {});
            }
            this.view = { x: 0, y: 0, z: 1 };
            this._renderAll();
            if (this.template) this.fit();   // la plantilla se mantiene para el siguiente set
            await this._flushSave();
        }

        // ----- vista -----
        setView(x, y, z) {
            this.view = { x, y, z: clamp(z, ZMIN, ZMAX) };
            this._renderView();
            this._save();
        }

        zoomAt(cx, cy, factor) {
            const r = this.vp.getBoundingClientRect();
            const px = cx - r.left, py = cy - r.top;
            const z = clamp(this.view.z * factor, ZMIN, ZMAX);
            const k = z / this.view.z;
            this.setView(px - (px - this.view.x) * k, py - (py - this.view.y) * k, z);
        }

        fitRect(b, margin = 0.94) {
            const vw = this.vp.clientWidth, vh = this.vp.clientHeight;
            if (!b || !vw || !vh) return;
            const z = clamp(Math.min(vw / b.w, vh / b.h) * margin, ZMIN, ZMAX);
            this.setView(vw / 2 - (b.x + b.w / 2) * z, vh / 2 - (b.y + b.h / 2) * z, z);
        }

        fit() {
            this.focusPrev = null;
            const b = this._bounds();
            if (b) this.fitRect(b);
        }

        focusItem(it) { this.focusItems([it]); }

        focusItems(list) {
            const key = list.map(it => it.id).sort().join(',');
            if (this.focusPrev && this.focusPrev.id === key) { this.unfocus(); return; }
            this.focusPrev = { id: key, view: { ...this.view } };
            this.fitRect(this._bounds(list), 0.98);
        }

        unfocus() {
            if (!this.focusPrev) return false;
            const v = this.focusPrev.view;
            this.focusPrev = null;
            this.setView(v.x, v.y, v.z);
            return true;
        }

        /**
         * Ordenar automático: imágenes anchas (panorámicas/telerradiografías horizontales)
         * a lo ancho arriba; el resto (periapicales, bite-wings, fotos) en filas de igual alto.
         */
        arrange() {
            if (!this.items.length) return;
            if (this.template) {
                // Con plantilla: re-encajar cada imagen en su casilla y llenar las vacías con las sueltas
                for (const it of this.items) {
                    const sl = it.slot ? this._slotById(it.slot) : null;
                    if (sl) this._fitInto(it, sl); else delete it.slot;
                }
                const loose = this.items.filter(it => !it.slot).sort((a, b) => (a.y - b.y) || (a.x - b.x));
                this._fillTemplate(loose);
                this._renderAll();
                this.fit();
                this._save();
                return;
            }
            const W = 1600, H = 520;
            const order = [...this.items].sort((a, b) => (a.y - b.y) || (a.x - b.x));
            const aspect = (it) => { const r = (it.rot % 180) ? it.h / it.w : it.w / it.h; return r; };
            const wide = order.filter(it => aspect(it) >= 1.6);
            const rest = order.filter(it => aspect(it) < 1.6);
            let y = 0;
            for (const it of wide) {
                const nat = (it.rot % 180) ? it.h : it.w;
                it.s = W / nat;
                it.x = 0; it.y = y;
                y += this._dims(it).dh + GAP;
            }
            // filas
            const rows = [];
            let row = [], rowW = 0;
            for (const it of rest) {
                const natH = (it.rot % 180) ? it.w : it.h;
                it.s = H / natH;
                const { dw } = this._dims(it);
                if (row.length && rowW + dw > W) { rows.push({ row, rowW }); row = []; rowW = 0; }
                row.push(it); rowW += dw + (row.length > 1 ? GAP : 0);
            }
            if (row.length) rows.push({ row, rowW });
            for (const r of rows) {
                // si la fila sobrepasa el ancho (p. ej. una sola imagen muy ancha) se escala para caber
                const k = r.rowW > W ? W / r.rowW : 1;
                let x = (W - r.rowW * k) / 2;
                for (const it of r.row) {
                    it.s *= k;
                    it.x = x; it.y = y;
                    x += this._dims(it).dw + GAP * k;
                }
                y += H * k + GAP;
            }
            this._renderAll();
            this.fit();
            this._save();
        }

        // ----- interacción con puntero -----
        _onDown(e) {
            this.vp.focus({ preventScroll: true });
            this.helpEl.classList.remove('show');
            const handle = e.target.closest('.cb-h');
            const pan = e.button === 1 || e.button === 2 || (e.button === 0 && this.spaceDown);
            const w = this._toWorld(e.clientX, e.clientY);
            const itemEl = e.target.closest('.cb-item');
            const it = itemEl ? this.items.find(o => o.id === itemEl.dataset.id) : null;
            const additive = e.shiftKey || e.ctrlKey || e.metaKey;

            if (!pan && e.button === 0 && handle && this.sel.size === 1) {
                const t = this._sel();
                const { dw, dh } = this._dims(t);
                const c = handle.dataset.h;
                const ax = c.includes('w') ? t.x + dw : t.x;
                const ay = c.includes('n') ? t.y + dh : t.y;
                this.drag = { mode: 'resize', it: t, c, ax, ay, dw0: dw, dh0: dh, s0: t.s };
            } else if (!pan && e.button === 0 && it) {
                if (additive) {
                    // Shift/Ctrl + clic: agregar o quitar de la selección
                    const ids = new Set(this.sel);
                    if (ids.has(it.id)) ids.delete(it.id); else ids.add(it.id);
                    this.setSelection([...ids], it.id);
                    if (!this.sel.has(it.id)) { e.preventDefault(); return; }
                } else if (!this.sel.has(it.id)) {
                    this.select(it.id);
                } else {
                    this.primary = it.id;
                }
                if (this.sel.size === 1 && (it.z || 0) < this._topZ()) { it.z = this._topZ() + 1; this._renderItem(it); this._save(); }
                const group = this._selItems();
                this.drag = { mode: 'move', sx: w.x, sy: w.y, starts: group.map(g => { const dd = this._dims(g); return { it: g, x: g.x, y: g.y, dw: dd.dw, dh: dd.dh, slot: g.slot || null }; }), moved: false };
            } else if (pan) {
                this.drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, vx: this.view.x, vy: this.view.y, moved: false };
                this.vp.classList.add('cb-panning');
            } else if (e.button === 0) {
                // Recuadro de selección sobre el fondo
                const r = this.vp.getBoundingClientRect();
                this.drag = { mode: 'marquee', x0: e.clientX - r.left, y0: e.clientY - r.top, base: additive ? new Set(this.sel) : new Set(), moved: false, additive };
            } else {
                return;
            }
            e.preventDefault();
            try { this.vp.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
        }

        _onMove(e) {
            const d = this.drag;
            if (!d) return;
            if (d.mode === 'pan') {
                const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
                if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
                this.view.x = d.vx + dx;
                this.view.y = d.vy + dy;
                this._renderView();
            } else if (d.mode === 'move') {
                const w = this._toWorld(e.clientX, e.clientY);
                const dx = w.x - d.sx, dy = w.y - d.sy;
                for (const s of d.starts) { s.it.x = s.x + dx; s.it.y = s.y + dy; this._renderItem(s.it); }
                d.moved = true;
                if (this.template && d.starts.length === 1) this._hoverSlot(this._slotAt(w), d.starts[0].it);
                this._placeItembar();
            } else if (d.mode === 'resize') {
                const w = this._toWorld(e.clientX, e.clientY);
                const minPx = 24 / this.view.z;
                let k = Math.max(Math.abs(w.x - d.ax) / d.dw0, Math.abs(w.y - d.ay) / d.dh0);
                k = Math.max(k, minPx / Math.min(d.dw0, d.dh0));
                d.it.s = d.s0 * k;
                const { dw, dh } = this._dims(d.it);
                d.it.x = d.c.includes('w') ? d.ax - dw : d.ax;
                d.it.y = d.c.includes('n') ? d.ay - dh : d.ay;
                this._renderItem(d.it);
                this._placeItembar();
            } else if (d.mode === 'marquee') {
                const r = this.vp.getBoundingClientRect();
                const x1 = e.clientX - r.left, y1 = e.clientY - r.top;
                if (!d.moved && Math.abs(x1 - d.x0) + Math.abs(y1 - d.y0) < 4) return;
                d.moved = true;
                const L = Math.min(d.x0, x1), T = Math.min(d.y0, y1), W = Math.abs(x1 - d.x0), H = Math.abs(y1 - d.y0);
                const m = this.marquee.style;
                m.display = 'block'; m.left = L + 'px'; m.top = T + 'px'; m.width = W + 'px'; m.height = H + 'px';
                // rectángulo en coordenadas del mundo; se seleccionan las imágenes que toca
                const z = this.view.z;
                const wx0 = (L - this.view.x) / z, wy0 = (T - this.view.y) / z, wx1 = (L + W - this.view.x) / z, wy1 = (T + H - this.view.y) / z;
                const ids = new Set(d.base);
                for (const it of this.items) {
                    const dd = this._dims(it);
                    if (it.x < wx1 && it.x + dd.dw > wx0 && it.y < wy1 && it.y + dd.dh > wy0) ids.add(it.id);
                }
                this.setSelection([...ids]);
            }
        }

        _onUp(e) {
            const d = this.drag;
            if (!d) return;
            this.drag = null;
            this.vp.classList.remove('cb-panning');
            this.marquee.style.display = 'none';
            try { this.vp.releasePointerCapture(e.pointerId); } catch (_) { /* noop */ }
            this._hoverSlot(null);
            if (d.mode === 'move' && d.moved && this.template) this._dropOnSlot(d, e);
            if (d.mode === 'marquee' && !d.moved && !d.additive) this.setSelection([]);
            if (d.moved || d.mode === 'resize' || d.mode === 'pan') this._save();
        }

        _onWheel(e) {
            e.preventDefault();
            let dy = e.deltaY;
            if (e.deltaMode === 1) dy *= 33;
            else if (e.deltaMode === 2) dy *= 400;
            const factor = Math.exp(-dy * 0.0015);
            const list = this._selItems();
            const w = this._toWorld(e.clientX, e.clientY);
            const overSel = list.some(it => this._hit(it, w));
            if (e.ctrlKey && overSel) {
                // Escalar la(s) imagen(es) seleccionada(s) en torno al cursor
                const minS = (it) => (24 / this.view.z) / Math.min(it.w, it.h);
                let f = factor;
                for (const it of list) f = Math.max(f, minS(it) / it.s);
                for (const it of list) {
                    it.s *= f;
                    it.x = w.x + (it.x - w.x) * f;
                    it.y = w.y + (it.y - w.y) * f;
                    this._renderItem(it);
                }
                this._placeItembar();
                this._save();
            } else {
                this.zoomAt(e.clientX, e.clientY, factor);
            }
        }

        /** Imagen visible (la de más arriba) bajo un punto de pantalla. */
        _itemAt(cx, cy) {
            const w = this._toWorld(cx, cy);
            let best = null;
            for (const it of this.items) {
                if (this._hit(it, w) && (!best || (it.z || 0) >= (best.z || 0))) best = it;
            }
            return best;
        }

        _onDbl(e) {
            // Con pointer capture el target del dblclick es el viewport: se ubica la imagen por coordenadas
            if (e.target.closest('.cb-itembar, .cb-adjust, .cb-help, .cb-notice')) return;
            const it = this._itemAt(e.clientX, e.clientY);
            if (it) {
                this.focusItem(it);
            } else if (!this.unfocus()) {
                this.fit();
            }
        }

        _onKey(e) {
            if (e.target.closest('input, textarea, select')) return;
            if (e.key === 'F2' || e.key === 'F3') return; // dictado: lo maneja la app
            if (e.code === 'Space') {
                if (!this.spaceDown) { this.spaceDown = true; this.vp.classList.add('cb-grab'); }
                e.preventDefault();
                return;
            }
            const k = e.key.toLowerCase();
            if ((e.ctrlKey || e.metaKey) && !e.altKey) {
                if (k === 'a') { this.selectAll(); e.preventDefault(); }
                else if (k === 'z') { if (this.undo()) e.preventDefault(); }
                return;
            }
            if (e.altKey) return;
            const has = this.sel.size > 0;
            let handled = true;
            if (k === 'f') this.fit();
            else if (k === 'a') this.arrange();
            else if (k === 'escape') { if (!this.unfocus()) this.setSelection([]); this.helpEl.classList.remove('show'); }
            else if (has && k === 'r') this._itemAction(e.shiftKey ? 'rotl' : 'rotr');
            else if (has && k === 'h') this._itemAction('flip');
            else if (has && k === 'i') this._itemAction('inv');
            else if (has && (k === 'delete' || k === 'backspace')) this._itemAction('del');
            else handled = false;
            if (handled) e.preventDefault();
        }
    }

    window.GTXCanvasBoard = Board;
    window.GTXCanvasStore = Store;
    window.GTXCanvasTemplates = TemplateStore;
    window.GTX_CANVAS_CHANNEL = CHANNEL_NAME;
})();
