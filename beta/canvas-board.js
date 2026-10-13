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

    const ZMIN = 0.02, ZMAX = 16;
    const GAP = 30;
    const SHARP_LEVELS = 10;

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
                <input type="file" accept="image/*" multiple hidden class="cb-file">
            `;
            this.container.appendChild(root);
            this.root = root;
            this.vp = root.querySelector('.cb-viewport');
            this.world = root.querySelector('.cb-world');
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
                dragover: (e) => { if (this._hasFiles(e)) { e.preventDefault(); vp.classList.add('cb-dragging'); } },
                dragleave: (e) => { if (e.target === vp) vp.classList.remove('cb-dragging'); },
                drop: (e) => this._onDrop(e),
                paste: (e) => this._onPaste(e),
                resize: () => this._renderAll(),
            };
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
            this.setTitle(title !== undefined ? title : ((data && data.title) || ''));
            this.items.forEach(it => this._ensureEl(it));
            this._renderAll();
            if (this.items.length && !(data && data.view)) this.fit();
        }

        _save() {
            clearTimeout(this._saveT);
            this._saveT = setTimeout(() => this._flushSave(), 250);
        }

        _flushSave() {
            clearTimeout(this._saveT);
            this._saveT = null;
            const data = { items: this.items.map(it => ({ ...it })), view: { ...this.view }, title: this.title || '', updated: Date.now() };
            return Store.putBoard(this.boardId, data).catch(e => console.error('Canvas: no se pudo guardar', e));
        }

        // ----- agregar imágenes -----
        _hasFiles(e) {
            return e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
        }

        _onDrop(e) {
            if (!this._hasFiles(e)) return;
            e.preventDefault();
            this.vp.classList.remove('cb-dragging');
            const files = [...e.dataTransfer.files].filter(isImageFile);
            const at = this._toWorld(e.clientX, e.clientY);
            this.addFiles(files, at);
        }

        _onPaste(e) {
            // Solo si el tablero está activo (foco dentro) o si nada editable tiene el foco y el mouse está encima
            const ae = document.activeElement;
            const focusedInside = this.root.contains(ae);
            const nothingFocused = !ae || ae === document.body;
            if (!focusedInside && !(nothingFocused && this.vp.matches(':hover'))) return;
            const files = [...(e.clipboardData ? e.clipboardData.items : [])]
                .filter(i => i.kind === 'file' && i.type.startsWith('image/'))
                .map(i => i.getAsFile())
                .filter(Boolean);
            if (!files.length) return;
            e.preventDefault();
            this.addFiles(files);
        }

        /**
         * Agrega imágenes (File o Blob). Si el tablero estaba vacío, ordena y ajusta.
         * @param {Array<Blob|File>} files
         * @param {{x:number,y:number}} [at] punto del mundo donde soltar
         */
        async addFiles(files, at) {
            files = (files || []).filter(f => f && (isImageFile(f) || (f instanceof Blob && !f.type)));
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
                try { dim = await imageSize(url); } catch (e) { URL.revokeObjectURL(url); console.warn('Canvas: archivo no es imagen válida', f.name); continue; }
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
            if (wasEmpty && this.items.length) { this.arrange(); }
            else { this._renderAll(); if (added.length) this.select(added[added.length - 1].id); }
            this._save();
            return added;
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
            list = list || this.items;
            if (!list.length) return null;
            let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            for (const it of list) {
                const { dw, dh } = this._dims(it);
                x0 = Math.min(x0, it.x); y0 = Math.min(y0, it.y);
                x1 = Math.max(x1, it.x + dw); y1 = Math.max(y1, it.y + dh);
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
            this.emptyEl.style.display = this.items.length ? 'none' : '';
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
            for (const it of u.items) { this.items.push(it); this._ensureEl(it); }
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

        _notice(text) {
            this.noticeEl.querySelector('span').textContent = text;
            this.noticeEl.classList.add('show');
            clearTimeout(this._noticeT);
            this._noticeT = setTimeout(() => this._hideNotice(), 8000);
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
                this.drag = { mode: 'move', sx: w.x, sy: w.y, starts: group.map(g => ({ it: g, x: g.x, y: g.y })), moved: false };
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
    window.GTX_CANVAS_CHANNEL = CHANNEL_NAME;
})();
