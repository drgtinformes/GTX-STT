/**
 * MODO ESTACIÓN DE TRABAJO
 * Pantalla dividida: tablero de imágenes (izquierda) | dictado (derecha).
 * Estados:
 *   off     -> app normal
 *   docked  -> pantalla dividida dentro de esta pestaña
 *   popped  -> tablero en otra ventana (canvas.html), app normal aquí
 *
 * API para otras partes de la app (p. ej. la futura bandeja de órdenes):
 *   GTXWorkstation.addImages(files)   // abre el tablero si hace falta y agrega
 */
(function () {
    const MODE_KEY = 'gtx_ws_mode';
    const WIDTH_KEY = 'gtx_ws_app_width';
    const chan = ('BroadcastChannel' in window) ? new BroadcastChannel(window.GTX_CANVAS_CHANNEL || 'gtx-canvas') : null;

    let mode = 'off';
    let board = null;
    let popup = null;
    let popupAlive = false;
    let layout = null;

    const appEl = document.querySelector('.app-container');
    const btn = document.getElementById('canvas-btn');
    const safeGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* noop */ } };

    function buildLayout() {
        layout = document.createElement('div');
        layout.id = 'ws-layout';
        layout.innerHTML = `<div id="ws-canvas-pane"></div><div id="ws-divider" title="Arrastra para cambiar el ancho"></div><div id="ws-app-pane"></div>`;
        const w = parseInt(safeGet(WIDTH_KEY), 10);
        if (w) layout.style.setProperty('--ws-app-w', w + 'px');

        const divider = layout.querySelector('#ws-divider');
        divider.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            divider.classList.add('active');
            divider.setPointerCapture(e.pointerId);
            const move = (ev) => {
                const width = Math.max(380, Math.min(window.innerWidth - 300, window.innerWidth - ev.clientX));
                layout.style.setProperty('--ws-app-w', width + 'px');
            };
            const up = (ev) => {
                divider.classList.remove('active');
                divider.removeEventListener('pointermove', move);
                divider.removeEventListener('pointerup', up);
                const cur = parseInt(getComputedStyle(layout).getPropertyValue('--ws-app-w'), 10);
                if (cur) safeSet(WIDTH_KEY, String(cur));
            };
            divider.addEventListener('pointermove', move);
            divider.addEventListener('pointerup', up);
        });
        return layout;
    }

    function dock() {
        if (mode === 'docked') return;
        if (!layout) buildLayout();
        const transcription = document.getElementById('transcription');
        const scroll = transcription ? transcription.scrollTop : 0;
        appEl.parentNode.insertBefore(layout, appEl);
        layout.querySelector('#ws-app-pane').appendChild(appEl);
        document.body.classList.add('ws-docked');
        if (transcription) transcription.scrollTop = scroll;
        board = new window.GTXCanvasBoard(layout.querySelector('#ws-canvas-pane'), {
            onPopout: popOut,
            onClose: () => setMode('off'),
            closeTitle: 'Cerrar estación de trabajo',
        });
        board.load();
        mode = 'docked';
    }

    function undock() {
        if (mode !== 'docked') return;
        if (board) { board.destroy(); board = null; }
        layout.parentNode.insertBefore(appEl, layout);
        layout.remove();
        document.body.classList.remove('ws-docked');
        mode = 'off';
    }

    function popOut() {
        const w = window.open('canvas.html', 'gtx-canvas-window', 'popup,width=1400,height=900');
        if (!w) { alert('El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.'); return; }
        popup = w;
        undock();
        mode = 'popped';
        safeSet(MODE_KEY, 'popped');
        updateBtn();
    }

    function closePopup() {
        // Cierra la ventana del tablero aunque se haya perdido la referencia (p. ej. tras recargar)
        if (popup && !popup.closed) popup.close();
        if (chan) chan.postMessage({ type: 'close-popup' });
        popup = null;
        popupAlive = false;
    }

    function setMode(m) {
        if (mode === 'popped' && m !== 'popped') closePopup();
        if (m === 'docked') dock();
        else if (m === 'off') { undock(); mode = 'off'; }
        safeSet(MODE_KEY, mode);
        updateBtn();
    }

    function updateBtn() {
        if (!btn) return;
        btn.classList.toggle('active', mode !== 'off');
        btn.title = mode === 'popped' ? 'Tablero abierto en otra ventana (clic para traerlo)' :
            mode === 'docked' ? 'Cerrar estación de trabajo' : 'Estación de trabajo (tablero de imágenes)';
    }

    if (btn) {
        btn.addEventListener('click', () => {
            if (mode === 'off') setMode('docked');
            else if (mode === 'docked') setMode('off');
            else if (mode === 'popped') {
                if (popup && !popup.closed) popup.focus();
                else setMode('docked');
            }
        });
    }

    // ---- Comunicación con la ventana desacoplada ----
    if (chan) {
        chan.onmessage = (ev) => {
            const m = ev.data || {};
            if (m.type === 'popup-open' || m.type === 'pong') {
                popupAlive = true;
                if (mode === 'docked') undock();
                mode = 'popped';
                safeSet(MODE_KEY, 'popped');
                updateBtn();
            } else if (m.type === 'popup-dock') {
                popupAlive = false;
                popup = null;
                setMode('docked');
            } else if (m.type === 'hotkey') {
                if (m.key === 'F2' && typeof toggleRecording === 'function') toggleRecording();
                if (m.key === 'F3' && typeof togglePauseRealtime === 'function') togglePauseRealtime();
            } else if (m.type === 'popup-closed') {
                popupAlive = false;
                popup = null;
                if (mode === 'popped') { mode = 'off'; safeSet(MODE_KEY, 'off'); updateBtn(); }
            }
        };
    }

    /**
     * Agregar imágenes al tablero desde cualquier parte de la app.
     * @param {Array<Blob|File>} files
     */
    async function addImages(files) {
        if (!files || !files.length) return;
        if (mode === 'popped' && popupAlive && chan) {
            chan.postMessage({ type: 'add', files });
            if (popup && !popup.closed) popup.focus();
            return;
        }
        if (mode !== 'docked') setMode('docked');
        return board.addFiles(files);
    }

    window.GTXWorkstation = {
        addImages,
        get mode() { return mode; },
        get board() { return board; },
        setMode,
    };

    // ---- Restaurar el modo al recargar ----
    const saved = safeGet(MODE_KEY);
    if (saved === 'docked') setMode('docked');
    else if (saved === 'popped' && chan) {
        // ¿La ventana del tablero sigue abierta? Si responde, quedamos en "popped".
        chan.postMessage({ type: 'ping' });
        setTimeout(() => { if (!popupAlive) { safeSet(MODE_KEY, 'off'); updateBtn(); } }, 600);
    }
    updateBtn();
})();
