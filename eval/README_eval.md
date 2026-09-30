# Set de pruebas del prompt (eval)

Mide de forma objetiva cuánto se parece la salida de la IA (usando el `SYSTEM_PROMPT` actual de `prompt.js`) a tus informes reales. Sirve para saber si un cambio en el prompt **mejora o empeora** el resultado, en vez de adivinarlo.

## Qué hay aquí

- `evaluar.py` — el evaluador (se versiona, no tiene datos de pacientes).
- `casos_prueba.jsonl` — 40 casos de prueba (dictado simulado + informe esperado), variados por tipo de estudio. **Local, no se sube a GitHub** (contiene informes reales).
- `resultados.jsonl` — se genera al correr; el detalle de cada salida de la IA. **Local.**

## Cómo correrlo

1. Pon tu clave de Gemini en una variable de entorno:
   - Windows (CMD): `set GEMINI_API_KEY=tu_clave`
   - Windows (PowerShell): `$env:GEMINI_API_KEY="tu_clave"`
2. Desde la carpeta del proyecto:
   ```
   python eval/evaluar.py
   ```
   Opciones: `--modelo gemini-2.0-flash` (por defecto), `--n 10` (probar solo 10 casos), `--pausa 1.5` (segundos entre llamadas, para no agotar la cuota gratis).

## Qué mide

- **Similitud media**: qué tan parecida es la salida de la IA al informe real (0–100%).
- **Cumplimiento de reglas** (porcentaje de casos que pasan cada una):
  - `sin_markdown` — no usa asteriscos.
  - `encabezados_ok` — pone las secciones correctas (MAXILAR:, MANDÍBULA:, ATM…).
  - `sin_maxilar_superior` — respeta la convención acordada.
  - `tipo_literal` — transcribe el tipo de estudio igual.
  - `sin_dientes_omitidos` / `sin_dientes_inventados` — no pierde ni inventa piezas.

## Cómo usarlo para mejorar el prompt

1. Corre una vez para tener una **línea base** (anota la similitud media y los % de reglas).
2. Modifica `prompt.js`.
3. Vuelve a correr y compara. Si los números suben, el cambio ayudó; si bajan, conviene revertir.
4. Mira en `resultados.jsonl` los casos de **menor similitud** para ver dónde falla.

## Nota honesta sobre el método

El "dictado simulado" se genera quitándole a cada informe real sus encabezados de sección y la línea de apertura, para que la IA tenga que reconstruir la estructura. Es una **aproximación**: tu dictado real incluye muletillas de voz y errores fonéticos que aquí no están. Aun así, es un buen termómetro **relativo** para comparar versiones del prompt entre sí. Para subir la fidelidad, se pueden ir reemplazando casos por transcripciones de dictados reales tuyos.

---

# Comparador de motores de dictado (`comparar_stt.py`)

El evaluador de arriba mide el **formateo** (la IA). Este mide el paso anterior: **qué motor de voz transcribe mejor tu dictado**, con foco en términos clínicos y números de pieza FDI.

1. Crea `eval/audios_stt/` y pon ahí ~10 dictados reales (wav/mp3/m4a/webm/ogg) con un `.txt` del mismo nombre que contenga lo que dijiste, bien escrito (no el informe formateado).
2. Define las claves de los motores que quieras probar (los que no tengan clave se saltan):
   - PowerShell: `$env:SONIOX_API_KEY="..."; $env:SPEECHMATICS_API_KEY="..."; $env:OPENAI_API_KEY="sk-..."; $env:DEEPGRAM_API_KEY="..."`
3. Corre `python eval/comparar_stt.py` (o `--motores "soniox,speechmatics"`, `--n 3`, `--sin-terminos`, `--simular`).

Resultado: `eval/comparacion_stt.md` ordenado por **error clínico** (menor = mejor), con % de piezas FDI acertadas, WER y los términos que más falla cada motor. Los audios y salidas quedan fuera de git.

Opcional: `eval/terminos_clinicos.txt` (un término por línea) para medir y sugerir términos adicionales.
