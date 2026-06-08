#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Comparador de modelos para el prompt de formateo (GTX-STT).

Corre los MISMOS casos de prueba por VARIOS modelos (Claude y/o Gemini),
aplica las mismas verificaciones que evaluar.py y emite una tabla comparativa
para decidir cual es el mas preciso: menos omisiones / invenciones de dientes,
mejor cumplimiento de reglas y mayor similitud con tus informes reales.

USO (en la carpeta del proyecto):
    # Define las claves que necesites segun los modelos a comparar:
    #   PowerShell:  $env:ANTHROPIC_API_KEY="sk-ant-..."; $env:GEMINI_API_KEY="AIza..."
    #   CMD:         set ANTHROPIC_API_KEY=sk-ant-...  &&  set GEMINI_API_KEY=AIza...

    python eval/comparar_modelos.py
    python eval/comparar_modelos.py --modelos "claude-opus-4-8,claude-sonnet-4-6,gemini-auto"
    python eval/comparar_modelos.py --n 10 --modelos "claude-opus-4-8,gemini-2.5-flash"
    python eval/comparar_modelos.py --simular     # prueba la mecanica SIN llamar a las APIs

Reglas de proveedor:
  - Un modelo que empieza con "claude"  -> API de Anthropic  (ANTHROPIC_API_KEY)
  - "gemini-auto"                       -> autodetecta un modelo Gemini de tu clave
  - Cualquier otro                      -> API de Gemini      (GEMINI_API_KEY)

Salidas:
  - Tabla en consola
  - eval/comparacion_modelos.md  y  eval/comparacion_modelos.csv
  - Detalle por modelo: eval/resultados_<modelo>.jsonl
"""
import os, sys, json, re, time, argparse, difflib, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PROMPT_JS = os.path.join(ROOT, 'prompt.js')
CASOS_DEFAULT = os.path.join(HERE, 'casos_prueba.jsonl')
GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'
ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

INSTRUCCION_USUARIO = ("DICTADO DEL USUARIO A FORMATEAR (Aplica tus reglas "
                       "estrictamente, sin saludos ni formato markdown):\n\n")

# ----------------------- Carga del system prompt -----------------------
def cargar_system_prompt():
    src = open(PROMPT_JS, encoding='utf-8').read()
    partes = src.split('`')
    if len(partes) < 3:
        sys.exit('ERROR: no pude extraer el SYSTEM_PROMPT de prompt.js (revisa el archivo).')
    return partes[1]

# ----------------------- Llamadas a las APIs -----------------------
def llamar_gemini(system_prompt, dictado, api_key, modelo):
    url = f'{GEMINI_BASE}/models/{modelo}:generateContent?key={api_key}'
    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": INSTRUCCION_USUARIO + dictado}]}],
        "generationConfig": {"temperature": 0.2},
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as resp:
        j = json.loads(resp.read().decode('utf-8'))
    return j['candidates'][0]['content']['parts'][0]['text']

def llamar_anthropic(system_prompt, dictado, api_key, modelo):
    payload = {
        "model": modelo,
        "max_tokens": 4096,
        "system": system_prompt,
        "messages": [{"role": "user", "content": INSTRUCCION_USUARIO + dictado}],
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(ANTHROPIC_URL, data=data, headers={
        'content-type': 'application/json',
        'x-api-key': api_key,
        'anthropic-version': '2023-06-01',
    })
    with urllib.request.urlopen(req, timeout=180) as resp:
        j = json.loads(resp.read().decode('utf-8'))
    return ''.join(b.get('text', '') for b in j.get('content', []) if b.get('type') == 'text')

def listar_modelos_gemini(api_key):
    url = f'{GEMINI_BASE}/models?key={api_key}'
    with urllib.request.urlopen(url, timeout=30) as r:
        j = json.loads(r.read().decode('utf-8'))
    return [m['name'].replace('models/', '') for m in j.get('models', [])
            if 'generateContent' in m.get('supportedGenerationMethods', [])]

def elegir_gemini(modelos):
    def descartar(n):
        return any(x in n for x in ('embedding','aqa','imagen','veo','tts','vision','thinking','learnlm'))
    utiles = [m for m in modelos if not descartar(m)]
    pro = [m for m in utiles if 'pro' in m]
    if pro: return sorted(pro)[-1]
    flash = [m for m in utiles if 'flash' in m and 'lite' not in m and '8b' not in m]
    if flash: return sorted(flash)[-1]
    return sorted(utiles)[-1] if utiles else (modelos[0] if modelos else None)

def proveedor(modelo):
    return 'anthropic' if modelo.lower().startswith('claude') else 'gemini'

# ----------------------- Verificaciones (identicas a evaluar.py) -----------------------
def norm(t): return re.sub(r'\s+', ' ', t).strip().lower()
TOOTH = re.compile(r'\b[1-4]\.[1-8]\b')
def dientes(t): return set(TOOTH.findall(t))
HEADER = re.compile(
    r'^(MAXILAR|MANDÍBULA|ATM DERECHA|ATM IZQUIERDA|ARCADA SUPERIOR|'
    r'ARCADA INFERIOR|BITE-WING DERECHA|BITE-WING IZQUIERDA|'
    r'TELERRADIOGRAFÍA LATERAL DE CRÁNEO|ESTUDIO PARA IMPLANTES):', re.M)
def tipo_valor(t):
    m = re.search(r'TIPO DE ESTUDIO\s*[:|\t ]+\s*(.+)', t)
    return re.sub(r'\s+', ' ', m.group(1)).strip().rstrip('.') if m else ''
def normalizar_encabezados(t):
    return t.replace('MAXILAR SUPERIOR:', 'MAXILAR:').replace('MAXILAR INFERIOR:', 'MANDÍBULA:')
ARCADA = re.compile(r'^(MAXILAR|MANDÍBULA|ARCADA SUPERIOR|ARCADA INFERIOR):', re.M)
def sin_encabezado_sobrante(esperado, salida):
    if ARCADA.search(esperado): return True
    return ARCADA.search(salida) is None
ALTURA = re.compile(r'altura ósea en relación a (.+?) es\s*:', re.I)
REFS = re.compile(r'fosa nasal|seno maxilar|canal mandibular', re.I)
def altura_osea_literal(esperado, salida):
    me = ALTURA.search(esperado)
    if not me: return True
    ms = ALTURA.search(salida)
    if not ms: return False
    refs_e = set(r.lower() for r in REFS.findall(me.group(1)))
    refs_s = set(r.lower() for r in REFS.findall(ms.group(1)))
    return refs_s.issubset(refs_e)
def perla_no_perdida(esperado, salida):
    if 'perla de esmalte' not in esperado.lower(): return True
    return 'pérdida de esmalte' not in salida.lower()

CHECK_KEYS = ['sin_dientes_omitidos','sin_dientes_inventados','encabezados_ok','tipo_literal',
              'sin_markdown','sin_maxilar_superior','sin_encabezado_sobrante',
              'altura_osea_literal','perla_no_perdida']

def evaluar_caso(esperado, salida, dictado):
    esperado = normalizar_encabezados(esperado)
    sim = difflib.SequenceMatcher(None, norm(esperado), norm(salida)).ratio()
    te, ts, td = dientes(esperado), dientes(salida), dientes(dictado)
    checks = {
        'sin_dientes_omitidos': te.issubset(ts),
        'sin_dientes_inventados': ts.issubset(te | td),
        'encabezados_ok': set(HEADER.findall(esperado)).issubset(set(HEADER.findall(salida))),
        'tipo_literal': tipo_valor(esperado) == tipo_valor(salida),
        'sin_markdown': '*' not in salida,
        'sin_maxilar_superior': ('MAXILAR SUPERIOR:' not in salida and 'MAXILAR INFERIOR:' not in salida),
        'sin_encabezado_sobrante': sin_encabezado_sobrante(esperado, salida),
        'altura_osea_literal': altura_osea_literal(esperado, salida),
        'perla_no_perdida': perla_no_perdida(esperado, salida),
    }
    return sim, checks, sorted(te - ts), sorted(ts - (te | td))

# ----------------------- Salida simulada (modo --simular, sin API) -----------------------
def salida_simulada(esperado, idx):
    if idx == 0:
        return esperado                      # modelo "perfecto"
    s = esperado
    m = TOOTH.search(s)                       # idx>=1: omite el primer diente
    if m: s = s[:m.start()] + 'X.X' + s[m.end():]
    if idx >= 2: s += "\n* nota markdown"     # idx>=2: ademas mete markdown
    return s

# ----------------------- Ejecucion por modelo -----------------------
def correr_modelo(modelo, idx, casos, system_prompt, keys, pausa, simular):
    real = modelo
    if not simular and modelo == 'gemini-auto':
        real = elegir_gemini(listar_modelos_gemini(keys['gemini']))
        print(f'   gemini-auto -> {real}')
    filas, detalle = [], []
    for c in casos:
        try:
            if simular:
                salida = salida_simulada(c['esperado'], idx)
            elif proveedor(real) == 'anthropic':
                salida = llamar_anthropic(system_prompt, c['dictado'], keys['anthropic'], real)
            else:
                salida = llamar_gemini(system_prompt, c['dictado'], keys['gemini'], real)
        except urllib.error.HTTPError as e:
            err = e.read().decode('utf-8', 'ignore')[:160]
            print(f'      caso {c["id"]}: ERROR HTTP {e.code}: {err}')
            filas.append(None); detalle.append({'id': c['id'], 'error': f'HTTP {e.code}: {err}'})
            time.sleep(pausa); continue
        except Exception as e:
            print(f'      caso {c["id"]}: ERROR {e}')
            filas.append(None); detalle.append({'id': c['id'], 'error': str(e)[:160]})
            time.sleep(pausa); continue
        sim, checks, omit, inv = evaluar_caso(c['esperado'], salida, c['dictado'])
        filas.append((sim, checks, omit, inv))
        detalle.append({'id': c['id'], 'categoria': c.get('categoria',''), 'sim': round(sim,4),
                        'checks': checks, 'dientes_omitidos': omit, 'dientes_inventados': inv,
                        'salida': salida})
        if not simular: time.sleep(pausa)
    return real, filas, detalle

def agregar(filas):
    ok = [f for f in filas if f is not None]
    n = len(ok)
    res = {'n_eval': n, 'n_error': len(filas) - n}
    if n == 0:
        return res
    res['sim'] = sum(f[0] for f in ok) / n
    res['perfectos'] = sum(1 for f in ok if all(f[1].values())) / n
    for k in CHECK_KEYS:
        res[k] = sum(1 for f in ok if f[1][k]) / n
    res['omitidos'] = sum(len(f[2]) for f in ok)
    res['inventados'] = sum(len(f[3]) for f in ok)
    return res

# ----------------------- Tabla / archivos -----------------------
FILAS_TABLA = [
    ('Casos evaluados',          lambda r: f"{r.get('n_eval',0)}" + (f" (+{r['n_error']} err)" if r.get('n_error') else '')),
    ('Similitud media',          lambda r: f"{r['sim']*100:.1f}%" if 'sim' in r else '-'),
    ('Casos perfectos',          lambda r: f"{r['perfectos']*100:.0f}%" if 'perfectos' in r else '-'),
    ('Sin dientes omitidos',     lambda r: f"{r['sin_dientes_omitidos']*100:.0f}%" if 'sin_dientes_omitidos' in r else '-'),
    ('Sin dientes inventados',   lambda r: f"{r['sin_dientes_inventados']*100:.0f}%" if 'sin_dientes_inventados' in r else '-'),
    ('Encabezados OK',           lambda r: f"{r['encabezados_ok']*100:.0f}%" if 'encabezados_ok' in r else '-'),
    ('Tipo de estudio literal',  lambda r: f"{r['tipo_literal']*100:.0f}%" if 'tipo_literal' in r else '-'),
    ('Sin markdown',             lambda r: f"{r['sin_markdown']*100:.0f}%" if 'sin_markdown' in r else '-'),
    ('Sin MAXILAR SUPERIOR',     lambda r: f"{r['sin_maxilar_superior']*100:.0f}%" if 'sin_maxilar_superior' in r else '-'),
    ('Sin encabezado sobrante',  lambda r: f"{r['sin_encabezado_sobrante']*100:.0f}%" if 'sin_encabezado_sobrante' in r else '-'),
    ('Altura osea literal',      lambda r: f"{r['altura_osea_literal']*100:.0f}%" if 'altura_osea_literal' in r else '-'),
    ('Perla no -> perdida',      lambda r: f"{r['perla_no_perdida']*100:.0f}%" if 'perla_no_perdida' in r else '-'),
    ('Dientes omitidos (total)', lambda r: f"{r.get('omitidos','-')}"),
    ('Dientes inventados (tot)', lambda r: f"{r.get('inventados','-')}"),
]

def imprimir_tabla(orden, resumen):
    etiq_w = max(len(e) for e, _ in FILAS_TABLA)
    cols = [resumen[m][0] for m in orden]           # nombres reales de modelo
    col_w = max(14, max(len(c) for c in cols))
    head = ' ' * etiq_w + '  ' + '  '.join(c.ljust(col_w) for c in cols)
    print('\n' + head)
    print('-' * len(head))
    for etiq, fn in FILAS_TABLA:
        celdas = [fn(resumen[m][1]).ljust(col_w) for m in orden]
        print(etiq.ljust(etiq_w) + '  ' + '  '.join(celdas))

def escribir_md_csv(orden, resumen, base, simular):
    cols = [resumen[m][0] for m in orden]
    titulo = 'Comparacion de modelos' + (' (SIMULACION)' if simular else '')
    with open(base + '.md', 'w', encoding='utf-8') as f:
        f.write(f'# {titulo}\n\n')
        f.write('| Metrica | ' + ' | '.join(cols) + ' |\n')
        f.write('|' + '---|' * (len(cols) + 1) + '\n')
        for etiq, fn in FILAS_TABLA:
            f.write(f'| {etiq} | ' + ' | '.join(fn(resumen[m][1]) for m in orden) + ' |\n')
    with open(base + '.csv', 'w', encoding='utf-8') as f:
        f.write('metrica,' + ','.join(cols) + '\n')
        for etiq, fn in FILAS_TABLA:
            f.write(etiq + ',' + ','.join(fn(resumen[m][1]).replace(',', ';') for m in orden) + '\n')

def safe(nombre):
    return re.sub(r'[^a-zA-Z0-9._-]', '_', nombre)

# ----------------------- main -----------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--modelos', default='claude-opus-4-8,claude-sonnet-4-6,gemini-auto',
                    help='lista separada por comas')
    ap.add_argument('--n', type=int, default=0, help='limitar numero de casos (0 = todos)')
    ap.add_argument('--pausa', type=float, default=1.0, help='segundos entre llamadas')
    ap.add_argument('--casos', default=CASOS_DEFAULT, help='ruta a casos_prueba.jsonl')
    ap.add_argument('--simular', action='store_true', help='no llama a las APIs; prueba la mecanica')
    args = ap.parse_args()

    if not os.path.exists(args.casos):
        sys.exit(f'ERROR: no existe {args.casos}.')
    casos = [json.loads(l) for l in open(args.casos, encoding='utf-8')]
    if args.n > 0:
        casos = casos[:args.n]

    keys = {'gemini': os.environ.get('GEMINI_API_KEY'),
            'anthropic': os.environ.get('ANTHROPIC_API_KEY')}
    modelos = [m.strip() for m in args.modelos.split(',') if m.strip()]
    system_prompt = None if args.simular else cargar_system_prompt()

    print(('MODO SIMULACION (sin llamadas a API)\n' if args.simular else '') +
          f'Casos: {len(casos)}   |   Modelos: {", ".join(modelos)}')

    resumen, orden = {}, []
    for idx, modelo in enumerate(modelos):
        prov = proveedor(modelo if modelo != 'gemini-auto' else 'gemini')
        if not args.simular and not keys.get(prov):
            var = 'ANTHROPIC_API_KEY' if prov == 'anthropic' else 'GEMINI_API_KEY'
            print(f'\n[{modelo}] OMITIDO: falta {var} en el entorno.')
            continue
        print(f'\n[{modelo}] procesando {len(casos)} casos...')
        real, filas, detalle = correr_modelo(modelo, idx, casos, system_prompt, keys, args.pausa, args.simular)
        with open(os.path.join(HERE, f'resultados_{safe(real)}.jsonl'), 'w', encoding='utf-8') as fo:
            for d in detalle:
                fo.write(json.dumps(d, ensure_ascii=False) + '\n')
        resumen[modelo] = (real, agregar(filas))
        orden.append(modelo)

    if not orden:
        sys.exit('\nNo se evaluo ningun modelo (revisa claves o el modo --simular).')

    imprimir_tabla(orden, resumen)
    base = os.path.join(HERE, 'comparacion_modelos' + ('_SIMULACION' if args.simular else ''))
    escribir_md_csv(orden, resumen, base, args.simular)
    print(f'\nResumen guardado en: {base}.md  y  {base}.csv')
    print(f'Detalle por modelo: {HERE}/resultados_<modelo>.jsonl')

if __name__ == '__main__':
    main()
