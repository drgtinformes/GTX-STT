# GTX Radiología — STT (App de Dictados)

Aplicación web para **dictado de informes radiológicos odontológicos/maxilofaciales** en español. Convierte voz a texto, lo estructura con IA siguiendo un formato clínico estricto y exporta el informe a Word con la plantilla del centro radiológico. Incluye análisis de radiografías con IA y envío por Gmail.

> Funciona 100% en el navegador. No hay backend: las claves y los datos viven en tu equipo (`localStorage`). El servidor de Python es **opcional** y solo añade el atajo global **F2**.

## Características

- **Dictado por voz** con 3 motores seleccionables:
  - *Navegador (gratis)* — `webkitSpeechRecognition`, requiere Chrome o Edge.
  - *Whisper (OpenAI)* — transcripción por archivo (`whisper-1`).
  - *Whisper Realtime (OpenAI)* — transcripción en vivo con contador de costo.
- **Procesamiento con IA** (Gemini / Claude) que reestructura el dictado según el formato radiológico definido en `prompt.js`.
- **Diccionario médico personalizado** con auto-aprendizaje a partir de tus correcciones.
- **Macros** de texto activables por clic o por voz.
- **Copiloto visual**: pega una radiografía, anótala (caries / lesión apical / soporte óseo) y la IA describe los hallazgos.
- **Exportación a Word** con plantilla por centro (`docxtemplater`).
- **Integración con Gmail**: busca el hilo del paciente y responde adjuntando el `.docx`.
- **Historial** de los últimos 50 informes (local).

## Requisitos

- **Navegador:** Chrome o Edge (el motor nativo de voz no funciona en Firefox).
- **Para el servidor opcional (F2 global):** Python 3 con las librerías `websockets` y `keyboard`:
  ```bash
  pip install websockets keyboard
  ```
  > En Windows, el atajo global F2 puede requerir ejecutar la consola **como administrador**.
- **Claves de API** (se ingresan en la app, no en el código):
  - **Gemini** (formato de texto e imágenes) — https://aistudio.google.com/app/apikey
  - **Anthropic / Claude** (opcional) — https://console.anthropic.com/
  - **OpenAI** (solo para los motores Whisper) — https://platform.openai.com/api-keys

## Cómo ejecutar

### Opción A — Con servidor Python (recomendada, habilita F2 global)
```bash
python servidor_dictado.py
```
Luego abre **http://localhost:9080** en el navegador. Con esto puedes presionar **F2** desde cualquier ventana (por ejemplo, tu visor DICOM) para iniciar/detener el dictado.

- Puerto web (HTTP): **9080**
- Puerto del WebSocket (F2): **8081**

### Opción B — Sin servidor
Abre `index.html` directamente en el navegador. Funciona todo **excepto** el atajo F2 global (los atajos dentro de la pestaña sí funcionan).

## Configuración de claves

1. Abre la app y haz clic en el ícono de engranaje (**Configurar IA**).
2. Pega tus claves de Gemini / Anthropic / OpenAI según los motores que uses.
3. Las claves se guardan **solo en tu navegador** (`localStorage`). No se suben a ningún servidor.

## Plantillas de Word

Las plantillas vienen embebidas en `templates.js` (base64) y se registran en `main.js` (clase `TemplateManager`). Actualmente incluidas: **QVA, TALCA, MP, CENTALIS, HMS**.

Para agregar una nueva, puedes subir tu `.docx` desde la propia app (botón *Gestionar Plantillas*), usando etiquetas como `{PACIENTE}`, `{DIAGNOSTICO}`, etc. También puedes dejarla como predeterminada embebiéndola en `templates.js` y añadiéndola a `this.defaults` en `main.js`.

## Estructura del proyecto

| Archivo | Rol |
|---|---|
| `index.html` | Interfaz y modales |
| `main.js` | Lógica principal (STT, IA, diccionario, macros, copiloto visual, Word, WebSocket) |
| `prompt.js` | Prompt de sistema para el formateo de informes |
| `templates.js` | Plantillas `.docx` embebidas en base64 |
| `style.css` | Estilos (tema oscuro) |
| `gmail-integration.js` | Autenticación y envío por Gmail |
| `secrets.js` | Claves de Google (**no se versiona**, ver Seguridad) |
| `servidor_dictado.py` | Servidor HTTP + WebSocket + atajo global F2 |
| `diccionario_radiologico.json` | Correcciones fonéticas base |
| `PLANTILLA *.docx` | Plantillas fuente por centro |

## Seguridad

- `secrets.js` (CLIENT_ID y API_KEY de Google) está en `.gitignore` y **no debe subirse** al repositorio.
- Las claves de IA (Gemini/Anthropic/OpenAI) se guardan en `localStorage`; no uses la app en equipos compartidos.
- Las llamadas a Anthropic se hacen desde el navegador con `anthropic-dangerous-direct-browser-access`, por lo que la clave queda expuesta a scripts de la página. Acéptalo solo para uso personal/local.
- Si la `API_KEY` de Google estuvo alguna vez en el historial del repositorio, conviene **rotarla y restringirla** por dominio (HTTP referrer) en Google Cloud Console.

## Notas y limitaciones

- Verifica que los identificadores de modelo en `main.js` (Anthropic `claude-opus-4-7`, OpenAI `gpt-realtime-whisper`) sigan vigentes en cada proveedor; si cambian, esas llamadas fallan.
- El motor de voz nativo solo está disponible en navegadores basados en Chromium.
