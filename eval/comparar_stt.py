#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Comparador de MOTORES DE DICTADO (speech-to-text) para GTX-STT.

Pasa TUS audios reales por varios motores y mide cuantos errores comete cada
uno, poniendo el foco en lo que importa en un informe: los TERMINOS CLINICOS
(agenesia, basilar, atricion, reabsorcion...) y los NUMEROS DE PIEZA FDI.

PREPARACION
  1. Crea la carpeta  eval/audios_stt/
  2. Pon ahi tus dictados (wav, mp3, m4a, webm, ogg, flac) y, junto a cada uno,
     un .txt con el MISMO nombre que contenga lo que dijiste, bien escrito
     (el texto dictado corregido a mano, NO el informe ya formateado por la IA).
        eval/audios_stt/dictado01.webm
        eval/audios_stt/dictado01.txt
     Con 10 dictados variados (panoramica, CBCT, ATM, periapical...) ya se
     ven diferencias claras.
  3. (Opcional) eval/terminos_clinicos.txt: un termino por linea para sumar
     a la lista de terminos que se miden y se le "sugieren" a los motores.

CLAVES (solo las de los motores que quieras probar; los demas se saltan)
  PowerShell:  $env:SONIOX_API_KEY="..."; $env:SPEECHMATICS_API_KEY="..."; $env:OPENAI_API_KEY="sk-..."; $env:DEEPGRAM_API_KEY="..."
               $env:ASSEMBLYAI_API_KEY="..."; $env:GEMINI_API_KEY="..."
  CMD:         set SONIOX_API_KEY=...  &&  set SPEECHMATICS_API_KEY=...  (etc.)

USO (desde la carpeta del proyecto)
  python eval/comparar_stt.py
  python eval/comparar_stt.py --motores "soniox,speechmatics,gpt-transcribe"
  python eval/comparar_stt.py --n 3            # solo los 3 primeros audios
  python eval/comparar_stt.py --sin-terminos   # motores "a pelo", sin vocabulario sugerido
  python eval/comparar_stt.py --simular        # prueba la mecanica SIN llamar a las APIs

MOTORES (mismo modelo y vocabulario que usa la app)
  soniox            stt-async-v5 + contexto de dominio (general + ejemplo) + terminos
  speechmatics      Enhanced Medical en espanol (domain: medical) + additional_vocab
  speechmatics-oak  Oak-1 (medico multilingue, language: multi; sin diccionario propio)
  assemblyai        Universal-3.5 Pro + modo medico (domain: medical-v1) + keyterms
  gemini            Gemini 3.5 Transcribe (es-419) + customVocabulary
  gpt-transcribe    OpenAI gpt-transcribe + prompt + keywords
  deepgram          Nova-3 espanol + keyterms
  Nota: se usa la version para ARCHIVOS de cada motor; el dictado en vivo puede rendir algo peor.

SALIDAS
  - Tabla en consola
  - eval/comparacion_stt.md  y  eval/comparacion_stt.csv
  - Texto de cada motor:  eval/stt_resultados/<motor>/<audio>.txt
  (todo esto queda fuera de git: contiene dictados reales)

METRICAS
  - Error clinico: % de apariciones de terminos clinicos del texto correcto que
    el motor NO transcribio bien. Es la metrica principal.
  - Piezas FDI: % de numeros de pieza (1.6, 3.8...) que el motor acerto.
  - WER: tasa de error por palabra de todo el texto (sin tildes ni puntuacion,
    para no castigar diferencias de formato).
"""
import os, sys, json, re, time, argparse, csv, uuid, random, mimetypes, unicodedata
import urllib.request, urllib.error, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
AUDIO_DIR_DEFAULT = os.path.join(HERE, 'audios_stt')
OUT_DIR = os.path.join(HERE, 'stt_resultados')
AUDIO_EXT = ('.wav', '.mp3', '.m4a', '.webm', '.ogg', '.flac', '.mp4', '.mpeg', '.mpga')
MOTORES_TODOS = ['soniox', 'speechmatics', 'speechmatics-oak', 'assemblyai', 'gemini', 'gpt-transcribe', 'deepgram']
ENV_KEY = {
    'soniox': 'SONIOX_API_KEY',
    'speechmatics': 'SPEECHMATICS_API_KEY',
    'speechmatics-oak': 'SPEECHMATICS_API_KEY',
    'assemblyai': 'ASSEMBLYAI_API_KEY',
    'gemini': 'GEMINI_API_KEY',
    'gpt-transcribe': 'OPENAI_API_KEY',
    'deepgram': 'DEEPGRAM_API_KEY',
}
# Cuantos terminos recibe cada motor (igual que la app: buildSttTerms(n)).
LIMITE_TERMINOS = {'soniox': 250, 'speechmatics': 150, 'speechmatics-oak': 0, 'assemblyai': 150,
                   'gemini': 100, 'gpt-transcribe': 80, 'deepgram': 80}

# Mismos terminos base que STT_TERMINOS_BASE en main.js (oct-2026).
TERMINOS_BASE = [
    "agenesia", "atrición", "apiñamiento", "basilar", "reabsorción radicular", "reabsorción ósea",
    "periápice", "periapical", "radiolúcido", "radiopaco", "radiolucidez", "radiopacidad",
    "lámina dura", "ligamento periodontal", "furca", "lesión periapical", "periodontitis apical",
    "quiste dentígero", "quiste radicular", "odontoma", "hipercementosis", "osteítis condensante",
    "dilaceración radicular", "taurodontismo", "supernumerario", "mesiodens", "germen dentario",
    "rizogénesis", "estadio de Nolla", "erupción", "retenido", "tercer molar",
    "cóndilo mandibular", "cóndilo", "apófisis coronoides", "apófisis estiloides", "eminencia articular",
    "cavidad glenoidea", "conducto dentario inferior", "agujero mentoniano", "canal incisivo",
    "espina nasal anterior", "seno maxilar", "piso de seno", "neumatización", "engrosamiento mucoso",
    "tabique nasal", "fosa nasal", "cornete", "tuberosidad del maxilar", "reborde alveolar",
    "cresta ósea", "cortical ósea", "hueso trabecular", "rama mandibular", "sínfisis mandibular",
    "hueso hioides", "vértebras cervicales",
    "obturación endodóntica", "tratamiento de conductos", "perno muñón", "implante oseointegrado",
    "hiperostosis", "osteofito", "esclerosis subcondral", "remodelación condilar", "abfracción",
    "CBCT", "ATM", "FOV", "vóxel", "telerradiografía", "panorámica", "bite-wing", "Cone Beam",
]
# Terminos que ya dieron problemas en el dictado real (se miden siempre).
TERMINOS_EXTRA = ["agenesia", "basilar", "atrición", "apiñamiento", "alveolar", "mediante", "alineamiento"]

CONTEXTO = ('Dictado de un informe imagenológico de radiología maxilofacial y dental '
            '(panorámica, CBCT, periapical, bite-wing, telerradiografía, ATM) en español de Chile. '
            'Notación dental FDI (ej. pieza 1.6, 3.8).')

# Contexto de Soniox: mismo que buildSonioxContext() en main.js.
SONIOX_GENERAL = [
    {'key': 'domain', 'value': 'Radiología maxilofacial y dental'},
    {'key': 'topic', 'value': 'Dictado de informe imagenológico: panorámica, CBCT (Cone Beam), periapicales, bite-wing, telerradiografía, ATM'},
    {'key': 'language', 'value': 'Español de Chile, terminología odontológica y radiológica'},
    {'key': 'notation', 'value': 'Piezas dentales en notación FDI escritas como 1.6, 3.8, 5.5 (se dictan "uno punto seis")'},
    {'key': 'speaker', 'value': 'Radiólogo maxilofacial dictando hallazgos'},
]
SONIOX_TEXT = ('Ejemplo de dictado: Pieza 3.8 incluida en posición mesioangulada, en relación con el conducto dentario inferior. '
               'Reabsorción ósea horizontal leve generalizada. Lesión periapical radiolúcida en pieza 4.6 con tratamiento de conductos. '
               'Senos maxilares neumatizados, con engrosamiento mucoso basal en el seno maxilar derecho. Agenesia de piezas 1.2 y 2.2. '
               'Cóndilos mandibulares de morfología conservada.')


# ----------------------- Terminos clinicos -----------------------
def cargar_terminos():
    terms = list(TERMINOS_BASE) + TERMINOS_EXTRA
    for nombre in ('diccionario_radiologico.json', 'diccionario_ampliacion.json'):
        ruta = os.path.join(ROOT, nombre)
        if os.path.exists(ruta):
            try:
                d = json.load(open(ruta, encoding='utf-8'))
                terms += [v for v in d.values() if isinstance(v, str)]
            except Exception as e:
                print(f'  (aviso) no pude leer {nombre}: {e}')
    extra = os.path.join(HERE, 'terminos_clinicos.txt')
    if os.path.exists(extra):
        terms += [l.strip() for l in open(extra, encoding='utf-8') if l.strip() and not l.startswith('#')]
    # Mismo filtro que buildSttTerms() en main.js: letras, 3-40 chars, sin numeros, max 4 palabras.
    vistos, out = set(), []
    for t in terms:
        t = re.sub(r'\s+', ' ', t.strip())
        k = sin_tildes(t.lower())
        if (3 <= len(t) <= 40 and re.search(r'[a-záéíóúñ]', t.lower()) and not re.search(r'\d', t)
                and len(t.split()) <= 4) and k not in vistos:
            vistos.add(k); out.append(t)
    return out


def terminos_para_motor(terminos, limite=80):
    """Lo que se le 'sugiere' al motor (mismo tope que la app para ese motor)."""
    return [t for t in terminos][:limite]


# ----------------------- Normalizacion y metricas -----------------------
def sin_tildes(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')


def normalizar(s):
    s = sin_tildes(s.lower())
    s = re.sub(r'(\d)[.,](\d)', r'\1_\2', s)        # conserva 1.6 como un token
    s = re.sub(r'[^\w\s]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def wer(ref, hyp):
    r, h = normalizar(ref).split(), normalizar(hyp).split()
    if not r:
        return 0.0 if not h else 1.0
    prev = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        cur = [i] + [0] * len(h)
        for j in range(1, len(h) + 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (r[i - 1] != h[j - 1]))
        prev = cur
    return prev[-1] / len(r)


def contar(term_norm, texto_norm):
    return len(re.findall(r'(?<!\w)' + re.escape(term_norm) + r'(?!\w)', texto_norm))


def errores_terminos(ref, hyp, terminos):
    """Devuelve (apariciones_en_ref, fallidas, {termino: fallidas})."""
    rn, hn = normalizar(ref), normalizar(hyp)
    # Evita contar dos veces un termino contenido en otro mas largo ("condilo" en "condilo mandibular").
    ts = sorted({normalizar(t) for t in terminos if normalizar(t)}, key=len, reverse=True)
    total, fallos, detalle = 0, 0, {}
    for t in ts:
        cr = contar(t, rn)
        if not cr:
            continue
        ch = contar(t, hn)
        f = max(0, cr - ch)
        total += cr; fallos += f
        if f:
            detalle[t] = detalle.get(t, 0) + f
        rn = re.sub(r'(?<!\w)' + re.escape(t) + r'(?!\w)', ' ', rn)
        hn = re.sub(r'(?<!\w)' + re.escape(t) + r'(?!\w)', ' ', hn)
    return total, fallos, detalle


NUM_PAL = {'1': 'uno', '2': 'dos', '3': 'tres', '4': 'cuatro', '5': 'cinco', '6': 'seis', '7': 'siete', '8': 'ocho'}
FDI_RE = re.compile(r'(?<!\d)(?<!\d[.,])([1-8])[.,]([1-8])(?!\d|[.,]\d)')


def piezas_fdi(ref, hyp):
    """Numeros de pieza en el texto correcto (formato 1.6) y cuantos aparecen en el motor,
    aceptando 1.6 / 1,6 / 16 / 'uno seis' / 'uno punto seis'."""
    esperadas = FDI_RE.findall(ref)
    if not esperadas:
        return 0, 0
    h = ' ' + sin_tildes(hyp.lower()) + ' '
    aciertos = 0
    for a, b in esperadas:
        formas = [f'{a}.{b}', f'{a},{b}', f'{a}{b}', f'{NUM_PAL[a]} {NUM_PAL[b]}',
                  f'{NUM_PAL[a]} punto {NUM_PAL[b]}', f'{NUM_PAL[a]}.{NUM_PAL[b]}']
        for f in formas:
            m = re.search(r'(?<!\w)(?<!\d[.,])' + re.escape(f) + r'(?!\w|[.,]\d)', h)
            if m:
                aciertos += 1
                h = h[:m.start()] + ' ' + h[m.end():]   # cada aparicion cuenta una vez
                break
    return len(esperadas), aciertos


# ----------------------- HTTP helpers (sin dependencias) -----------------------
def http(method, url, headers=None, data=None, timeout=300):
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read()
            return r.status, body
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def multipart(campos, archivos):
    """campos: lista de (nombre, valor str); archivos: lista de (nombre, filename, bytes, mime)."""
    b = uuid.uuid4().hex
    partes = []
    for n, v in campos:
        partes.append(f'--{b}\r\nContent-Disposition: form-data; name="{n}"\r\n\r\n{v}\r\n'.encode('utf-8'))
    for n, fn, datos, mime in archivos:
        partes.append(f'--{b}\r\nContent-Disposition: form-data; name="{n}"; filename="{fn}"\r\n'
                      f'Content-Type: {mime}\r\n\r\n'.encode('utf-8') + datos + b'\r\n')
    partes.append(f'--{b}--\r\n'.encode('utf-8'))
    return b''.join(partes), f'multipart/form-data; boundary={b}'


def mime_de(ruta):
    return mimetypes.guess_type(ruta)[0] or 'application/octet-stream'


def err(status, body):
    txt = body.decode('utf-8', 'replace') if isinstance(body, bytes) else str(body)
    return RuntimeError(f'HTTP {status}: {txt[:300]}')


# ----------------------- Motores -----------------------
def motor_soniox(ruta, key, terms):
    base = 'https://api.soniox.com'
    auth = {'Authorization': f'Bearer {key}'}
    datos = open(ruta, 'rb').read()
    body, ct = multipart([], [('file', os.path.basename(ruta), datos, mime_de(ruta))])
    st, r = http('POST', f'{base}/v1/files', {**auth, 'Content-Type': ct}, body)
    if st >= 300: raise err(st, r)
    file_id = json.loads(r)['id']
    tr_id = None
    try:
        cfg = {'model': 'stt-async-v5', 'file_id': file_id, 'language_hints': ['es']}
        if terms is not None:
            cfg['context'] = {'general': SONIOX_GENERAL, 'text': SONIOX_TEXT, 'terms': terms}
        st, r = http('POST', f'{base}/v1/transcriptions', {**auth, 'Content-Type': 'application/json'},
                     json.dumps(cfg).encode('utf-8'))
        if st >= 300: raise err(st, r)
        tr_id = json.loads(r)['id']
        for _ in range(200):
            time.sleep(1.5)
            st, r = http('GET', f'{base}/v1/transcriptions/{tr_id}', auth)
            if st >= 300: continue
            j = json.loads(r)
            if j.get('status') == 'completed': break
            if j.get('status') == 'error': raise RuntimeError(j.get('error_message', 'error Soniox'))
        else:
            raise RuntimeError('Soniox no termino a tiempo')
        st, r = http('GET', f'{base}/v1/transcriptions/{tr_id}/transcript', auth)
        if st >= 300: raise err(st, r)
        return ''.join(t.get('text', '') for t in json.loads(r).get('tokens', [])).strip()
    finally:
        if tr_id: http('DELETE', f'{base}/v1/transcriptions/{tr_id}', auth)
        http('DELETE', f'{base}/v1/files/{file_id}', auth)


def motor_speechmatics(ruta, key, terms, oak=False):
    base = 'https://asr.api.speechmatics.com/v2'
    auth = {'Authorization': f'Bearer {key}'}
    datos = open(ruta, 'rb').read()

    def crear(con_vocab):
        if oak:   # Oak-1: medico multilingue, sin domain ni diccionario propio
            tc = {'model': 'oak-1', 'language': 'multi'}
        else:
            tc = {'language': 'es', 'operating_point': 'enhanced', 'domain': 'medical'}
        if con_vocab and terms and not oak:
            tc['additional_vocab'] = [{'content': t} for t in terms]
        cfg = {'type': 'transcription', 'transcription_config': tc}
        body, ct = multipart([('config', json.dumps(cfg))],
                             [('data_file', os.path.basename(ruta), datos, mime_de(ruta))])
        return http('POST', f'{base}/jobs/', {**auth, 'Content-Type': ct}, body)

    st, r = crear(True)
    if st >= 300 and terms and b'vocab' in r.lower():
        print('      (speechmatics rechazo additional_vocab con domain medical; reintento sin el)')
        st, r = crear(False)
    if st >= 300: raise err(st, r)
    job = json.loads(r)['id']
    for _ in range(300):
        time.sleep(2)
        st, r = http('GET', f'{base}/jobs/{job}', auth)
        if st >= 300: continue
        estado = json.loads(r).get('job', {}).get('status')
        if estado == 'done': break
        if estado in ('rejected', 'deleted', 'expired'):
            raise RuntimeError(f'Speechmatics job {estado}: {r[:300]!r}')
    else:
        raise RuntimeError('Speechmatics no termino a tiempo')
    st, r = http('GET', f'{base}/jobs/{job}/transcript?format=txt', auth)
    if st >= 300: raise err(st, r)
    http('DELETE', f'{base}/jobs/{job}', auth)
    return r.decode('utf-8').strip()


def motor_gpt_transcribe(ruta, key, terms):
    datos = open(ruta, 'rb').read()

    def enviar(modelo, con_keywords):
        campos = [('model', modelo), ('language', 'es'), ('response_format', 'json'), ('prompt', CONTEXTO)]
        if con_keywords and terms:
            campos += [('keywords[]', t.replace('<', ' ').replace('>', ' ')) for t in terms]
        body, ct = multipart(campos, [('file', os.path.basename(ruta), datos, mime_de(ruta))])
        return http('POST', 'https://api.openai.com/v1/audio/transcriptions',
                    {'Authorization': f'Bearer {key}', 'Content-Type': ct}, body)

    st, r = enviar('gpt-transcribe', True)
    if st in (400, 404):
        msg = r.decode('utf-8', 'replace').lower()
        if 'keyword' in msg:
            print('      (gpt-transcribe rechazo keywords; reintento sin ellas)')
            st, r = enviar('gpt-transcribe', False)
        elif 'model' in msg:
            print('      (gpt-transcribe no disponible; uso gpt-4o-transcribe)')
            st, r = enviar('gpt-4o-transcribe', False)
    if st >= 300: raise err(st, r)
    return json.loads(r).get('text', '').strip()


def motor_deepgram(ruta, key, terms):
    q = [('model', 'nova-3'), ('language', 'es'), ('smart_format', 'true')]
    q += [('keyterm', t) for t in (terms or [])]
    url = 'https://api.deepgram.com/v1/listen?' + urllib.parse.urlencode(q)
    st, r = http('POST', url, {'Authorization': f'Token {key}', 'Content-Type': mime_de(ruta)},
                 open(ruta, 'rb').read())
    if st >= 300: raise err(st, r)
    j = json.loads(r)
    return j['results']['channels'][0]['alternatives'][0].get('transcript', '').strip()


def motor_speechmatics_oak(ruta, key, terms):
    return motor_speechmatics(ruta, key, None, oak=True)


def motor_assemblyai(ruta, key, terms):
    base = 'https://api.assemblyai.com'
    auth = {'Authorization': key}
    st, r = http('POST', f'{base}/v2/upload', {**auth, 'Content-Type': 'application/octet-stream'},
                 open(ruta, 'rb').read())
    if st >= 300: raise err(st, r)
    audio_url = json.loads(r)['upload_url']
    cfg = {'audio_url': audio_url, 'speech_models': ['universal-3-5-pro'], 'language_code': 'es',
           'domain': 'medical-v1'}
    if terms:
        cfg['keyterms_prompt'] = [t for t in terms if len(t.split()) <= 6]
    # Si la API rechazara algun campo, se reintenta con una configuracion mas simple.
    intentos = [cfg,
                {k: v for k, v in cfg.items() if k != 'speech_models'},
                dict({k: v for k, v in cfg.items() if k not in ('speech_models', 'language_code')}, language_detection=True)]
    for i, c in enumerate(intentos):
        st, r = http('POST', f'{base}/v2/transcript', {**auth, 'Content-Type': 'application/json'},
                     json.dumps(c).encode('utf-8'))
        if st < 300: break
        if st != 400 or i == len(intentos) - 1: raise err(st, r)
        print(f'      (assemblyai rechazo la configuracion {i + 1}; reintento mas simple: {r[:120]!r})')
    tid = json.loads(r)['id']
    try:
        for _ in range(300):
            time.sleep(2)
            st, r = http('GET', f'{base}/v2/transcript/{tid}', auth)
            if st >= 300: continue
            j = json.loads(r)
            if j.get('status') == 'completed':
                return (j.get('text') or '').strip()
            if j.get('status') == 'error':
                raise RuntimeError('AssemblyAI: ' + str(j.get('error')))
        raise RuntimeError('AssemblyAI no termino a tiempo')
    finally:
        http('DELETE', f'{base}/v2/transcript/{tid}', auth)


def motor_gemini(ruta, key, terms):
    import base64
    datos = open(ruta, 'rb').read()
    if len(datos) > 19 * 1024 * 1024:
        raise RuntimeError('Gemini (inline): audio > 19 MB; usa un dictado mas corto')
    mime = mime_de(ruta)
    if mime == 'video/webm': mime = 'audio/webm'
    tc = {'languageCodes': ['es-419']}
    if terms:
        tc['customVocabulary'] = terms[:100]
    body = {'contents': [{'parts': [{'inlineData': {'mimeType': mime, 'data': base64.b64encode(datos).decode('ascii')}}]}],
            'generationConfig': {'audioTranscriptionConfig': tc}}
    url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-transcribe:generateContent'
    st, r = http('POST', url, {'x-goog-api-key': key, 'Content-Type': 'application/json'}, json.dumps(body).encode('utf-8'))
    if st == 400 and terms and b'ocabular' in r:
        print('      (gemini rechazo customVocabulary; reintento sin el)')
        tc.pop('customVocabulary', None)
        st, r = http('POST', url, {'x-goog-api-key': key, 'Content-Type': 'application/json'}, json.dumps(body).encode('utf-8'))
    if st >= 300: raise err(st, r)
    j = json.loads(r)
    partes = ((j.get('candidates') or [{}])[0].get('content') or {}).get('parts') or []
    return ' '.join(p.get('text', '') for p in partes if p.get('text')).strip()


MOTORES = {
    'soniox': motor_soniox,
    'speechmatics': motor_speechmatics,
    'speechmatics-oak': motor_speechmatics_oak,
    'assemblyai': motor_assemblyai,
    'gemini': motor_gemini,
    'gpt-transcribe': motor_gpt_transcribe,
    'deepgram': motor_deepgram,
}


def salida_simulada(ref, motor, terminos):
    """Estropea el texto correcto de forma distinta por motor para probar la mecanica."""
    rnd = random.Random(hash(motor) % 1000 + len(ref))
    tasa = {'soniox': 0.3, 'speechmatics': 0.15, 'speechmatics-oak': 0.12, 'assemblyai': 0.15, 'gemini': 0.2,
            'gpt-transcribe': 0.25, 'deepgram': 0.45}.get(motor, 0.3)
    h = ref
    for t in terminos:
        if rnd.random() < tasa:
            h = re.sub(re.escape(t), 'xxx', h, flags=re.IGNORECASE)
    if rnd.random() < tasa:
        h = FDI_RE.sub(lambda m: m.group(1) + m.group(2), h, count=1)  # 1.6 -> 16 (debe contarse como acierto)
    return h


# ----------------------- Programa principal -----------------------
def main():
    ap = argparse.ArgumentParser(description='Compara motores de dictado con tus audios reales.')
    ap.add_argument('--motores', default=','.join(MOTORES_TODOS))
    ap.add_argument('--carpeta', default=AUDIO_DIR_DEFAULT)
    ap.add_argument('--n', type=int, default=0, help='procesar solo los N primeros audios')
    ap.add_argument('--sin-terminos', action='store_true', help='no sugerir vocabulario a los motores')
    ap.add_argument('--simular', action='store_true', help='no llama a las APIs (prueba la mecanica)')
    a = ap.parse_args()

    if not os.path.isdir(a.carpeta):
        sys.exit(f'No existe {a.carpeta}. Crea la carpeta y pon tus audios + .txt (ver instrucciones al inicio del script).')
    casos = []
    for f in sorted(os.listdir(a.carpeta)):
        base, ext = os.path.splitext(f)
        if ext.lower() in AUDIO_EXT:
            txt = os.path.join(a.carpeta, base + '.txt')
            if os.path.exists(txt):
                casos.append((base, os.path.join(a.carpeta, f), open(txt, encoding='utf-8').read().strip()))
            else:
                print(f'  (aviso) {f} no tiene {base}.txt con el texto correcto; lo salto.')
    if a.n: casos = casos[:a.n]
    if not casos:
        sys.exit('No encontre pares audio + .txt en ' + a.carpeta)

    terminos = cargar_terminos()
    sugerir = lambda m: None if a.sin_terminos else terminos_para_motor(terminos, LIMITE_TERMINOS.get(m, 80))
    motores = [m.strip() for m in a.motores.split(',') if m.strip()]
    for m in motores:
        if m not in MOTORES: sys.exit(f'Motor desconocido: {m}. Opciones: {", ".join(MOTORES)}')

    print(f'{len(casos)} audios · {len(terminos)} terminos clinicos medidos · '
          f'vocabulario sugerido: {"no" if a.sin_terminos else "si (tope segun motor, como en la app)"}')
    resumen = []
    for m in motores:
        key = os.environ.get(ENV_KEY[m], '').strip()
        if not a.simular and not key:
            print(f'\n[{m}] sin {ENV_KEY[m]} -> se salta')
            continue
        print(f'\n[{m}]')
        os.makedirs(os.path.join(OUT_DIR, m), exist_ok=True)
        tot_t = fal_t = tot_p = ok_p = 0
        wers, segs, fallidos, errores = [], [], {}, 0
        for nombre, ruta, ref in casos:
            t0 = time.time()
            try:
                hyp = salida_simulada(ref, m, terminos) if a.simular else MOTORES[m](ruta, key, sugerir(m))
            except Exception as e:
                errores += 1
                print(f'  {nombre}: ERROR {e}')
                continue
            dt = time.time() - t0
            open(os.path.join(OUT_DIR, m, nombre + '.txt'), 'w', encoding='utf-8').write(hyp)
            t, f, det = errores_terminos(ref, hyp, terminos)
            p, ok = piezas_fdi(ref, hyp)
            w = wer(ref, hyp)
            tot_t += t; fal_t += f; tot_p += p; ok_p += ok; wers.append(w); segs.append(dt)
            for k, v in det.items(): fallidos[k] = fallidos.get(k, 0) + v
            print(f'  {nombre}: WER {w:.1%} · terminos fallados {f}/{t} · piezas {ok}/{p} · {dt:.1f}s')
        if not wers:
            continue
        peores = sorted(fallidos.items(), key=lambda x: -x[1])[:8]
        resumen.append({
            'motor': m,
            'audios': len(wers),
            'errores_api': errores,
            'error_clinico_pct': round(100 * fal_t / tot_t, 1) if tot_t else None,
            'terminos': f'{fal_t}/{tot_t}',
            'piezas_ok_pct': round(100 * ok_p / tot_p, 1) if tot_p else None,
            'piezas': f'{ok_p}/{tot_p}',
            'wer_pct': round(100 * sum(wers) / len(wers), 1),
            'seg_por_audio': round(sum(segs) / len(segs), 1),
            'terminos_mas_fallados': ', '.join(f'{k} ({v})' for k, v in peores),
        })

    if not resumen:
        sys.exit('\nNingun motor produjo resultados (revisa las claves).')

    resumen.sort(key=lambda r: (r['error_clinico_pct'] if r['error_clinico_pct'] is not None else 999, r['wer_pct']))
    fmt = lambda v, suf='%': '—' if v is None else f'{v}{suf}'
    lineas = [
        '# Comparación de motores de dictado (GTX-STT)',
        '',
        f'{len(casos)} audios · {time.strftime("%Y-%m-%d %H:%M")}' + (' · **SIMULADO**' if a.simular else ''),
        '',
        'Ordenado por error clínico (menor = mejor).',
        '',
        '| # | Motor | Error clínico | Términos fallados | Piezas FDI OK | WER | s/audio | Términos más fallados |',
        '|---|---|---|---|---|---|---|---|',
    ]
    for i, r in enumerate(resumen, 1):
        lineas.append(f"| {i} | {r['motor']} | {fmt(r['error_clinico_pct'])} | {r['terminos']} | "
                      f"{fmt(r['piezas_ok_pct'])} ({r['piezas']}) | {r['wer_pct']}% | {r['seg_por_audio']} | "
                      f"{r['terminos_mas_fallados'] or '—'} |")
    md = '\n'.join(lineas) + '\n'
    open(os.path.join(HERE, 'comparacion_stt.md'), 'w', encoding='utf-8').write(md)
    with open(os.path.join(HERE, 'comparacion_stt.csv'), 'w', encoding='utf-8', newline='') as fh:
        wr = csv.DictWriter(fh, fieldnames=list(resumen[0].keys()))
        wr.writeheader(); wr.writerows(resumen)

    print('\n' + md)
    print('Guardado: eval/comparacion_stt.md, eval/comparacion_stt.csv y eval/stt_resultados/')


if __name__ == '__main__':
    main()
