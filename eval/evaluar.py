#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Evaluador del prompt de formateo (GTX-STT).

Mide cuanto se parece la salida de la IA (aplicando el SYSTEM_PROMPT actual de
prompt.js) a tus informes reales.

USO (en la carpeta del proyecto):
    # PowerShell:  $env:GEMINI_API_KEY="tu_clave"
    # CMD:         set GEMINI_API_KEY=tu_clave
    python eval/evaluar.py                  # autodetecta el modelo disponible
    python eval/evaluar.py --listar-modelos # ver que modelos tiene tu clave
    python eval/evaluar.py --modelo gemini-2.5-flash --n 10

El modelo se AUTODETECTA desde tu cuenta (Google retira modelos viejos cada
tanto). El SYSTEM_PROMPT se prueba sin el diccionario dinamico (eso lo agrega
la app aparte). Resultados detallados en: eval/resultados.jsonl
"""
import os, sys, json, re, time, argparse, difflib, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PROMPT_JS = os.path.join(ROOT, 'prompt.js')
CASOS = os.path.join(HERE, 'casos_prueba.jsonl')
SALIDA = os.path.join(HERE, 'resultados.jsonl')
API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

INSTRUCCION_USUARIO = ("DICTADO DEL USUARIO A FORMATEAR (Aplica tus reglas "
                       "estrictamente, sin saludos ni formato markdown):\n\n")

def cargar_system_prompt():
    src = open(PROMPT_JS, encoding='utf-8').read()
    partes = src.split('`')
    if len(partes) < 3:
        sys.exit('ERROR: no pude extraer el SYSTEM_PROMPT de prompt.js.')
    return partes[1]

def listar_modelos(api_key):
    url = f'{API_BASE}/models?key={api_key}'
    with urllib.request.urlopen(url, timeout=30) as r:
        j = json.loads(r.read().decode('utf-8'))
    out = []
    for m in j.get('models', []):
        if 'generateContent' in m.get('supportedGenerationMethods', []):
            out.append(m['name'].replace('models/', ''))
    return out

def elegir_modelo(modelos):
    def descartar(n):
        return any(x in n for x in ('embedding','aqa','imagen','veo','tts','vision','thinking','learnlm'))
    utiles = [m for m in modelos if not descartar(m)]
    flash = [m for m in utiles if 'flash' in m and 'lite' not in m and '8b' not in m]
    for m in flash:
        if 'flash-latest' in m:
            return m
    if flash:
        return sorted(flash)[-1]
    if utiles:
        return sorted(utiles)[-1]
    return modelos[0] if modelos else None

def llamar_gemini(system_prompt, dictado, api_key, modelo):
    url = f'{API_BASE}/models/{modelo}:generateContent?key={api_key}'
    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": INSTRUCCION_USUARIO + dictado}]}],
        "generationConfig": {"temperature": 0.2},
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=90) as resp:
        j = json.loads(resp.read().decode('utf-8'))
    return j['candidates'][0]['content']['parts'][0]['text']

def norm(t):
    return re.sub(r'\s+', ' ', t).strip().lower()

TOOTH = re.compile(r'\b[1-4]\.[1-8]\b')
def dientes(t):
    return set(TOOTH.findall(t))

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
    # Si el informe esperado NO se divide en arcadas (p. ej. CBCT de un solo maxilar),
    # la salida tampoco debe inventar encabezados MAXILAR:/MANDÍBULA:/ARCADA.
    if ARCADA.search(esperado):
        return True  # no aplica: el caso si lleva division por arcadas
    return ARCADA.search(salida) is None

ALTURA = re.compile(r'altura ósea en relación a (.+?) es\s*:', re.I)
REFS = re.compile(r'fosa nasal|seno maxilar|canal mandibular', re.I)
def altura_osea_literal(esperado, salida):
    # El subtitulo de altura osea no debe inventar referencias anatomicas no dictadas.
    me = ALTURA.search(esperado)
    if not me:
        return True  # no aplica
    ms = ALTURA.search(salida)
    if not ms:
        return False
    refs_e = set(r.lower() for r in REFS.findall(me.group(1)))
    refs_s = set(r.lower() for r in REFS.findall(ms.group(1)))
    return refs_s.issubset(refs_e)

def perla_no_perdida(esperado, salida):
    # "perla de esmalte" es una entidad real; no debe degradarse a "perdida de esmalte".
    if 'perla de esmalte' not in esperado.lower():
        return True  # no aplica
    return 'pérdida de esmalte' not in salida.lower()

def evaluar_caso(esperado, salida, dictado):
    esperado = normalizar_encabezados(esperado)
    sim = difflib.SequenceMatcher(None, norm(esperado), norm(salida)).ratio()
    te, ts, td = dientes(esperado), dientes(salida), dientes(dictado)
    checks = {
        'sin_markdown': '*' not in salida,
        'encabezados_ok': set(HEADER.findall(esperado)).issubset(set(HEADER.findall(salida))),
        'sin_maxilar_superior': ('MAXILAR SUPERIOR:' not in salida and 'MAXILAR INFERIOR:' not in salida),
        'tipo_literal': tipo_valor(esperado) == tipo_valor(salida),
        'sin_dientes_omitidos': te.issubset(ts),
        'sin_dientes_inventados': ts.issubset(te | td),
        'sin_encabezado_sobrante': sin_encabezado_sobrante(esperado, salida),
        'altura_osea_literal': altura_osea_literal(esperado, salida),
        'perla_no_perdida': perla_no_perdida(esperado, salida),
    }
    return sim, checks

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--modelo', default='', help='modelo Gemini; vacio = autodetectar')
    ap.add_argument('--n', type=int, default=0, help='limitar numero de casos (0 = todos)')
    ap.add_argument('--pausa', type=float, default=1.0, help='segundos entre llamadas')
    ap.add_argument('--listar-modelos', action='store_true', help='solo listar modelos y salir')
    args = ap.parse_args()

    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        sys.exit('ERROR: define la variable de entorno GEMINI_API_KEY con tu clave de Gemini.')

    try:
        disponibles = listar_modelos(api_key)
    except Exception as e:
        sys.exit(f'ERROR al consultar modelos: {e}')

    if args.listar_modelos:
        print('Modelos disponibles para tu clave (soportan generateContent):')
        for m in disponibles:
            print('  ', m)
        return

    modelo = args.modelo or elegir_modelo(disponibles)
    if not modelo:
        sys.exit('ERROR: no encontre un modelo de texto. Prueba --listar-modelos.')

    if not os.path.exists(CASOS):
        sys.exit(f'ERROR: no existe {CASOS}.')
    system_prompt = cargar_system_prompt()
    casos = [json.loads(l) for l in open(CASOS, encoding='utf-8')]
    if args.n > 0:
        casos = casos[:args.n]

    print(f'Modelo: {modelo}   |   Casos: {len(casos)}\n')
    print(f'{"ID":>3}  {"CATEGORIA":<26} {"SIM%":>5}  CHECKS')
    print('-' * 70)

    sims = []
    acum = {}
    fout = open(SALIDA, 'w', encoding='utf-8')
    for c in casos:
        try:
            salida = llamar_gemini(system_prompt, c['dictado'], api_key, modelo)
        except urllib.error.HTTPError as e:
            msg = e.read().decode('utf-8', 'ignore')[:200]
            print(f'{c["id"]:>3}  {c["categoria"]:<26}  ERROR HTTP {e.code}: {msg}')
            time.sleep(args.pausa)
            continue
        except Exception as e:
            print(f'{c["id"]:>3}  {c["categoria"]:<26}  ERROR: {e}')
            time.sleep(args.pausa)
            continue
        sim, checks = evaluar_caso(c['esperado'], salida, c['dictado'])
        sims.append(sim)
        for k, v in checks.items():
            acum.setdefault(k, [0, 0])
            acum[k][0] += 1 if v else 0
            acum[k][1] += 1
        fallos = [k for k, v in checks.items() if not v]
        marca = 'OK' if not fallos else ('falla: ' + ', '.join(fallos))
        print(f'{c["id"]:>3}  {c["categoria"]:<26} {sim*100:5.1f}  {marca}')
        fout.write(json.dumps({'id': c['id'], 'categoria': c['categoria'],
                               'sim': sim, 'checks': checks, 'salida': salida},
                              ensure_ascii=False) + '\n')
        time.sleep(args.pausa)
    fout.close()

    if not sims:
        sys.exit('\nNo se evaluo ningun caso (revisa los errores de arriba).')
    print('\n' + '=' * 70)
    print(f'SIMILITUD MEDIA: {sum(sims)/len(sims)*100:.1f}%   (casos: {len(sims)})')
    print('CUMPLIMIENTO POR REGLA:')
    for k, (ok, tot) in acum.items():
        print(f'  {k:<24} {ok}/{tot}  ({ok/tot*100:.0f}%)')
    print(f'\nDetalle en: {SALIDA}')

if __name__ == '__main__':
    main()
