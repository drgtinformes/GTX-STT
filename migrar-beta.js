/**
 * PASO DE LA BETA A PRODUCCIÓN (una sola vez por navegador)
 * ------------------------------------------------------------
 * La beta guardaba el diccionario, las macros y las plantillas subidas en copias propias
 * (claves "beta__…") para no tocar la versión oficial. Al pasar la beta a producción,
 * esas copias se traen a las claves oficiales para no perder lo hecho en la beta:
 *   - Diccionario (y su meta / pendientes / rechazados / versiones): se adopta el de la beta.
 *     El diccionario oficial anterior queda como una versión más en el historial del
 *     Diccionario, por si hay que volver a él.
 *   - Macros y plantillas: se unen (si un mismo id existe en ambas, gana la beta).
 * Luego se borran las copias "beta__…" para que la beta vuelva a partir desde producción.
 * Debe cargarse ANTES de main.js.
 */
(function () {
    'use strict';
    const FLAG = 'gtx_beta_promovida';
    const P = 'beta__';
    let ls;
    try { ls = window.localStorage; if (ls.getItem(FLAG)) return; } catch (e) { return; }

    const get = (k) => ls.getItem(k);
    const parse = (s, d) => { try { const v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } };
    const KEYS = ['custom_dict', 'custom_dict_meta', 'custom_dict_pending', 'custom_dict_rejected',
        'custom_dict_versions', 'user_macros', 'user_templates'];

    if (!KEYS.some(k => get(P + k) !== null)) { try { ls.setItem(FLAG, String(Date.now())); } catch (e) { /* noop */ } return; }

    const out = {};   // clave oficial -> nuevo valor (string)

    // --- Diccionario ---
    const bDict = get(P + 'custom_dict');
    if (bDict !== null) {
        const oDict = get('custom_dict');
        const vers = parse(get(P + 'custom_dict_versions'), null) || parse(get('custom_dict_versions'), []) || [];
        if (oDict && oDict !== bDict) {
            vers.unshift({ ts: Date.now(), motivo: 'diccionario oficial antes de pasar la beta a producción', n: Object.keys(parse(oDict, {})).length, dict: oDict });
        }
        out.custom_dict_versions = JSON.stringify(vers.slice(0, 20));   // primero el historial (con el oficial anterior)
        out.custom_dict = bDict;
    } else if (get(P + 'custom_dict_versions') !== null) {
        out.custom_dict_versions = get(P + 'custom_dict_versions');
    }
    const bMeta = get(P + 'custom_dict_meta');
    if (bMeta !== null) {
        const o = parse(get('custom_dict_meta'), {}), b = parse(bMeta, {});
        out.custom_dict_meta = (o && typeof o === 'object' && !Array.isArray(o) && b && typeof b === 'object' && !Array.isArray(b))
            ? JSON.stringify({ ...o, ...b }) : bMeta;
    }
    for (const k of ['custom_dict_pending', 'custom_dict_rejected']) {
        if (get(P + k) !== null) out[k] = get(P + k);
    }

    // --- Macros (arreglo por id) ---
    const bMac = get(P + 'user_macros');
    if (bMac !== null) {
        const o = parse(get('user_macros'), []), b = parse(bMac, []);
        if (Array.isArray(o) && Array.isArray(b)) {
            const ids = new Set(b.map(m => m && m.id));
            out.user_macros = JSON.stringify([...o.filter(m => !ids.has(m && m.id)), ...b]);
        } else out.user_macros = bMac;
    }

    // --- Plantillas (objeto por id) ---
    const bTpl = get(P + 'user_templates');
    if (bTpl !== null) {
        const o = parse(get('user_templates'), {}), b = parse(bTpl, {});
        out.user_templates = (o && typeof o === 'object' && b && typeof b === 'object') ? JSON.stringify({ ...o, ...b }) : bTpl;
    }

    try {
        for (const [k, v] of Object.entries(out)) ls.setItem(k, v);
        for (const k of KEYS) ls.removeItem(P + k);
        ls.setItem(FLAG, String(Date.now()));
        console.info('[GTX] Configuración de la beta traída a producción:', Object.keys(out).join(', '));
    } catch (e) {
        // Sin espacio u otro error: no se marca como hecho y no se borran las copias beta (se reintenta al recargar)
        console.error('[GTX] No se pudo traer la configuración de la beta', e);
    }
})();
