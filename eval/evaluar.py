#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Evaluador del prompt de formateo (GTX-STT).

Mide cuanto se parece la salida de la IA (aplicando el SYSTEM_PROMPT actual de
prompt.js) a tus informes reales. Sirve para saber, de forma objetiva, si un
cambio en el prompt mejora o empeora el resultado.

USO (en la carpeta del proyecto):
    # 1) Pon tu clave de Gemini en una variable de entorno:
    #    Windows (CMD):     set GEMINI_API_KEY=tu_clave
    #    Windows (PowerShell): $env:GEMINI_API_KEY="tu_clave"
    # 2) Ejecuta:
    python eval/evaluar.py
    python eval/evaluar.py --modelo gemini-2.0-flash --n 10

Requiere: eval/casos_prueba.jsonl  y  prompt.js
Guarda el detalle en: eval/resultados.jsonl
Nota: el SYSTEM_PROMPT se prueba SIN el diccionario dinamico (eso lo agrega la
app aparte). Mide la calidad del prompt en si.
"""
import os, sys, json, re, time, argparse, difflib, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PROMPT_JS = os.path.join(ROOT, 'prompt.js')
CASOS = os.path.join(HERE, 'casos_prueba.jsonl')
SALIDA = os.path.join(HERE, 'resultados.jsonl')

INSTRUCCION_USUARIO = ("DICTADO DEL USUARIO A FORMATEAR (Aplica tus reglas "
                       "estrictamente, sin saludos ni formato markdown):\n\n")

def cargar_system_prompt():
    src = open(PROMPT_JS, encoding='utf-8').read()
    partes = src.split('`')
    if len(partes) < 3:
        sys.exit('ERROR: no pude extraer el SYSTEM_PROMPT de prompt.js (esperaba un template literal).')
    return partes[1]

def llamar_gemini(system_prompt, dictado, api_key, modelo):
    url = ('https://generativelanguage.googleapis.com/v1beta/models/'
           f'{modelo}:generateContent?key={api_key}')
    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user",
                      "parts": [{"text": INSTRUCCION_USUARIO + dictado}]}],
        "generationConfig": {"temperature": 0.2},
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data,
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=90) as resp:
        j = json.loads(resp.read().decode('utf-8'))
    return j['candidates'][0]['content']['parts'][0]['text']

# ---------- metricas ----------
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
    # Alinea el "gold standard" con la convencion acordada (MAXILAR/MANDIBULA).
    return t.replace('MAXILAR SUPERIOR:', 'MAXILAR:').replace('MAXILAR INFERIOR:', 'MANDÍBULA:')

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
    }
    return sim, checks

# ---------- main ----------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--modelo', default='gemini-2.0-flash')
    ap.add_argument('--n', type=int, default=0, help='limitar numero de casos (0 = todos)')
    ap.add_argument('--pausa', type=float, default=1.0, help='segundos entre llamadas (evitar cuota)')
    args = ap.parse_args()

    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        sys.exit('ERROR: define la variable de entorno GEMINI_API_KEY con tu clave de Gemini.')
    if not os.path.exists(CASOS):
        sys.exit(f'ERROR: no existe {CASOS}. Genera primero los casos de prueba.')

    system_prompt = cargar_system_prompt()
    casos = [json.loads(l) for l in open(CASOS, encoding='utf-8')]
    if args.n > 0:
        casos = casos[:args.n]

    print(f'Evaluando {len(casos)} casos con modelo {args.modelo}...\n')
    print(f'{"ID":>3}  {"CATEGORIA":<26} {"SIM%":>5}  CHECKS')
    print('-' * 70)

    sims = []
    acum = {}
    fout = open(SALIDA, 'w', encoding='utf-8')
    for c in casos:
        try:
            salida = llamar_gemini(system_prompt, c['dictado'], api_key, args.modelo)
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
        sys.exit('\nNo se evaluo ningun caso (revisa errores arriba).')
    print('\n' + '=' * 70)
    print(f'SIMILITUD MEDIA: {sum(sims)/len(sims)*100:.1f}%   (casos: {len(sims)})')
    print('TASA DE CUMPLIMIENTO POR REGLA:')
    for k, (ok, tot) in acum.items():
        print(f'  {k:<24} {ok}/{tot}  ({ok/tot*100:.0f}%)')
    peores = sorted(range(len(sims)), key=lambda i: sims[i])[:5]
    print(f'\nDetalle completo guardado en: {SALIDA}')
    print('Revisa los casos de menor similitud ahi para ver donde mejorar el prompt.')

if __name__ == '__main__':
    main()
