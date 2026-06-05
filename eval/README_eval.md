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
