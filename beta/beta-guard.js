/**
 * BETA GUARD — solo existe en /beta/.
 * La beta comparte dominio (y por lo tanto localStorage) con la versión oficial.
 * Para que una prueba no altere tu configuración real, el diccionario, las macros
 * y las plantillas subidas se manejan "copia al escribir":
 *   - Al leer: si la beta ya tiene su propia copia la usa; si no, lee la oficial.
 *   - Al escribir: guarda SOLO en la copia beta (prefijo "beta__").
 * También el motor de dictado elegido (la beta tiene motores que producción no conoce).
 * Claves de API, historial y contador se comparten tal cual.
 * Al pasar la beta a producción este archivo se elimina.
 */
(function () {
    const PROTECTED = new Set(['custom_dict', 'custom_dict_meta', 'user_macros', 'user_templates',
        'custom_dict_pending', 'custom_dict_rejected', 'custom_dict_versions',
        // Motor elegido: la beta tiene motores que producción no conoce (AssemblyAI, Gemini Live, Oak-1).
        'selected_engine']);
    const PREFIX = 'beta__';
    const proto = Storage.prototype;
    const _get = proto.getItem, _set = proto.setItem, _rem = proto.removeItem;
    let ls = null;
    try { ls = window.localStorage; } catch (e) { return; }

    proto.getItem = function (k) {
        if (this === ls && PROTECTED.has(k)) {
            const v = _get.call(this, PREFIX + k);
            return v !== null ? v : _get.call(this, k);
        }
        return _get.call(this, k);
    };
    proto.setItem = function (k, v) {
        if (this === ls && PROTECTED.has(k)) return _set.call(this, PREFIX + k, v);
        return _set.call(this, k, v);
    };
    proto.removeItem = function (k) {
        if (this === ls && PROTECTED.has(k)) return _rem.call(this, PREFIX + k);
        return _rem.call(this, k);
    };

    document.title = '[BETA] ' + document.title;
    document.addEventListener('DOMContentLoaded', () => {
        const b = document.createElement('div');
        b.id = 'beta-badge';
        b.textContent = 'BETA';
        document.body.appendChild(b);
    });
})();
