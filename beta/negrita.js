/**
 * NEGRITA EN RÓTULOS DEL CUERPO (al generar el Word)
 * ------------------------------------------------------------
 * Misma regla que se aplicaba a mano en cada revisión de tanda, para todas las plantillas:
 *  - Encabezados de sección en mayúsculas y en línea propia: "MAXILAR:", "MANDÍBULA:",
 *    "ATM DERECHA:", "BITE-WING IZQUIERDA:", "IMPRESIÓN DIAGNÓSTICA", "DIAGNÓSTICO:" …
 *  - Rótulos de diente, SOLO hasta los dos puntos: "Diente 1.6:", "Dientes 1.7-1.5-2.5 y 2.7:",
 *    "Dientes 4.3 a 3.3:", "Zona diente 3.6:", "Diente 30:".
 * No se tocan los campos de la plantilla, la frase de apertura, la firma ni las líneas del
 * bloque de implantes ("Zona diente 1.4 (corte 29) 7,64 mm." no lleva dos puntos).
 *
 * Funcionamiento: prepareDocument marca el texto del cuerpo ({DIAGNOSTICO}/{INFORME}) con dos
 * caracteres invisibles (inicio/fin). Después de docxtemplater se buscan esas marcas en
 * word/document.xml, se ponen en negrita los rótulos (partiendo el run en el límite del
 * rótulo y conservando fuente y tamaño) y se quitan las marcas. Si algo falla, el Word sale
 * igual que antes, sin negrita, pero nunca con las marcas.
 */
(function (root) {
    'use strict';

    const INI = '⁣';   // INVISIBLE SEPARATOR
    const FIN = '⁤';   // INVISIBLE PLUS
    const CFG_KEY = 'gtx_negrita_rotulos';   // 'off' para desactivar

    const INICIO = /la impresi[oó]n diagn[oó]stica es la siguiente|TIPO DE ESTUDIO|Ubicaci[oó]n:|Examen:/i;
    const HEADER = /^[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ \-]{2,}:?\s*$/;
    const DIENTE = /^(?:Zona\s+)?[Dd]ientes?\s[^:\n]{1,80}?:/;

    function activa() {
        try { return (root.localStorage && root.localStorage.getItem(CFG_KEY)) !== 'off'; } catch (e) { return true; }
    }

    /** Largo del rótulo (en caracteres) a poner en negrita en cada línea; 0 = nada. */
    function rotulos(texto) {
        const lines = String(texto || '').split('\n');
        const conMarca = lines.some(l => INICIO.test(l));
        let on = !conMarca, fin = false;
        return lines.map(line => {
            const s = line.trim();
            if (fin) return 0;
            if (/^Atentamente/i.test(s)) { fin = true; return 0; }
            if (INICIO.test(line)) { on = true; return 0; }
            if (!on || !s) return 0;
            const lead = line.length - line.replace(/^\s+/, '').length;
            const m = DIENTE.exec(line.slice(lead));
            if (m) return lead + m[0].length;
            if (HEADER.test(s)) return line.replace(/\s+$/, '').length;
            return 0;
        });
    }

    /** Envuelve el valor del cuerpo con las marcas (solo si la negrita está activa). */
    function marcar(texto) {
        if (!activa() || !texto) return texto;
        return INI + texto + FIN;
    }

    const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    function rPrNegrita(rPr) {
        if (!rPr) return '<w:rPr><w:b/><w:bCs/></w:rPr>';
        let inner = rPr.replace(/^<w:rPr>/, '').replace(/<\/w:rPr>$/, '');
        inner = inner.replace(/<w:b(?:\s[^>]*)?\/>/g, '').replace(/<w:bCs(?:\s[^>]*)?\/>/g, '');
        // Orden del esquema: rStyle, rFonts, b, bCs, …
        const m = /^((?:<w:rStyle[^>]*\/>)?(?:<w:rFonts[^>]*\/>)?)/.exec(inner);
        const pre = m ? m[1] : '';
        return '<w:rPr>' + pre + '<w:b/><w:bCs/>' + inner.slice(pre.length) + '</w:rPr>';
    }

    const RE_RUN = /<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g;
    const RE_RUN_SIMPLE = /^(<w:r(?:\s[^>]*)?>)(<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t(?:\s[^>]*)?(?:\/>|>([\s\S]*?)<\/w:t>)<\/w:r>$/;

    /** Aplica la negrita a un segmento de XML (los runs del cuerpo). Devuelve el segmento nuevo. */
    function procesarSegmento(seg, largos, hits) {
        let linea = 0;
        const restante = largos.slice();
        return seg.replace(RE_RUN, (run) => {
            if (/<w:br\b/.test(run) && !/<w:t\b/.test(run)) { linea++; return run; }
            const n = restante[linea] || 0;
            if (!n) return run;
            const m = RE_RUN_SIMPLE.exec(run);
            if (!m) { restante[linea] = 0; return run; }   // run con estructura inesperada: no se toca
            const [, abre, rPr, tEsc] = m;
            const t = unesc(tEsc || '');
            if (!t) return run;
            const k = Math.min(n, t.length);
            restante[linea] = n - k;
            if (hits) hits.push(t.slice(0, k).trim());
            const tt = (s) => '<w:t xml:space="preserve">' + esc(s) + '</w:t>';
            let out = abre + rPrNegrita(rPr) + tt(t.slice(0, k)) + '</w:r>';
            if (k < t.length) out += abre + (rPr || '') + tt(t.slice(k)) + '</w:r>';
            return out;
        });
    }

    /**
     * Procesa document.xml: busca cada cuerpo marcado, aplica negrita y quita las marcas.
     * @param {string} xml
     * @param {string} texto  el valor (sin marcas) que se insertó en el cuerpo
     */
    function aplicarXml(xml, texto, hits) {
        const largos = rotulos(texto);
        let out = '', pos = 0;
        for (;;) {
            const i = xml.indexOf(INI, pos);
            if (i < 0) break;
            const j = xml.indexOf(FIN, i);
            if (j < 0) break;
            // Inicio del run que contiene la marca de inicio; fin del run que contiene la de fin
            const runIni = Math.max(xml.lastIndexOf('<w:r>', i), xml.lastIndexOf('<w:r ', i));
            const runFin = xml.indexOf('</w:r>', j);
            if (runIni < pos || runFin < 0 || xml.slice(i, j).includes('</w:p>')) {
                out += xml.slice(pos, j + 1); pos = j + 1; continue;   // estructura rara: solo se quitan marcas abajo
            }
            const seg = xml.slice(runIni, runFin + 6).split(INI).join('').split(FIN).join('');
            out += xml.slice(pos, runIni) + procesarSegmento(seg, largos, hits);
            pos = runFin + 6;
        }
        out += xml.slice(pos);
        return out.split(INI).join('').split(FIN).join('');
    }

    /** Aplica sobre el zip de PizZip ya renderizado. Nunca deja las marcas. */
    function aplicarZip(zip, texto) {
        const hits = [];
        const nombres = Object.keys(zip.files).filter(n => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n));
        for (const n of nombres) {
            const xml = zip.file(n).asText();
            if (!xml.includes(INI) && !xml.includes(FIN)) continue;
            let nuevo;
            try { nuevo = aplicarXml(xml, texto, hits); }
            catch (e) {
                console.warn('Negrita: no se pudo aplicar, el Word sale sin negrita', e);
                nuevo = xml.split(INI).join('').split(FIN).join('');
            }
            zip.file(n, nuevo);
        }
        return hits;
    }

    const api = { marcar, aplicarZip, aplicarXml, rotulos, activa, INI, FIN, CFG_KEY };
    root.GTXNegrita = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
