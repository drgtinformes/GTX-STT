# Revisión exhaustiva — GTX Radiología STT (App de Dictados)

> Revisión técnica inicial para comenzar a trabajar. Fecha: 31 de mayo de 2026.

## 1. Resumen ejecutivo

**Qué es:** una aplicación web 100% del lado del cliente (sin backend real) para dictado de informes radiológicos odontológicos/maxilofaciales en español de Chile. Convierte voz a texto, lo estructura con IA siguiendo un formato clínico muy específico, y exporta el informe a Word usando plantillas por centro radiológico. Incluye envío por Gmail y un "copiloto visual" que analiza radiografías con IA.

**Estado general:** funcional y con muchísimas funcionalidades, pero es un proyecto de un solo desarrollador sin estructura de ingeniería: todo en archivos sueltos, sin documentación, sin gestión de dependencias y con un `main.js` monolítico de ~4.100 líneas. Hay **un problema de seguridad real** (clave de Google en el historial público de GitHub), **posible exposición de datos de pacientes**, y varios **riesgos técnicos** a verificar antes de seguir construyendo.

**Veredicto:** base sólida y muy avanzada en producto, pero necesita una pasada de saneamiento (seguridad + orden) antes de añadir más funcionalidad.

## 2. Arquitectura y stack

- **Frontend:** HTML + CSS + JavaScript vanilla, sin framework, sin build. Se abre directamente o se sirve con un servidor estático.
- **Sin backend propio:** toda la lógica corre en el navegador. Las llamadas a IA van directo desde el navegador a las APIs de Google (Gemini), Anthropic (Claude) y OpenAI (Whisper).
- **Servidor opcional (`servidor_dictado.py`):** un pequeño servidor en Python que (a) sirve los archivos por HTTP en `:8080` y (b) abre un WebSocket en `:8081` para detectar la tecla **F2 de forma global** (incluso fuera del navegador, p. ej. trabajando en un visor DICOM) y disparar el dictado. Usa las librerías `keyboard` y `websockets`.
- **Librerías externas (CDN):** `pizzip`, `docxtemplater` (generar Word), `mammoth` (leer Word), `html2pdf`, `FileSaver`, `lucide` (íconos) y las librerías de Google API.
- **Almacenamiento:** todo en `localStorage` del navegador (claves API, diccionario, macros, historial de 50 informes, token de Gmail).

## 3. Inventario de archivos

| Archivo | Tamaño | Rol |
|---|---|---|
| `index.html` | 32 KB | Interfaz y todos los modales |
| `main.js` | **164 KB (~4.100 líneas)** | Toda la lógica: STT, IA, diccionario, macros, copiloto visual, Word, WebSocket |
| `prompt.js` | 38 KB | Prompt de sistema gigante para formatear informes + 13 ejemplos |
| `templates.js` | **997 KB** | Plantillas .docx embebidas en base64 (QVA, TALCA, PLANTILLA_MP) |
| `style.css` | 21 KB | Estilos (tema oscuro "glass") |
| `gmail-integration.js` | 7 KB | Autenticación y envío por Gmail API |
| `secrets.js` | 225 B | CLIENT_ID + API_KEY de Google (ignorado por git) |
| `servidor_dictado.py` | 2,7 KB | Servidor HTTP + WebSocket + hotkey F2 |
| `diccionario_radiologico.json` | 5 KB | ~180 correcciones fonéticas base |
| `PLANTILLA *.docx` (×5) | — | CENTALIS, HMS, MP, QVA, TALCA |
| `backup_antes_de_opus.zip` | 793 KB | Backup dentro del repo |
| `add_template.ps1` | 336 B | Script PowerShell auxiliar |

No existen `README`, `package.json` ni `LICENSE`.

## 4. Funcionalidades detectadas

1. **Dictado por voz** con 3 motores: navegador nativo (`webkitSpeechRecognition`, `es-CL`), Whisper de OpenAI (`whisper-1`) y Whisper Realtime (con contador de costo en vivo).
2. **Procesamiento con IA** (Gemini / Claude) que reestructura el dictado según el prompt clínico.
3. **Diccionario médico personalizado** con auto-aprendizaje de correcciones a partir de las ediciones del usuario.
4. **Macros** de texto activables por clic o por voz.
5. **Copiloto visual:** se pega una radiografía, se anota (caries / lesión apical / soporte óseo) y la IA describe los hallazgos.
6. **Exportación a Word** con `docxtemplater` y plantilla por centro radiológico.
7. **Integración con Gmail:** busca el hilo del paciente y responde adjuntando el .docx.
8. **Historial** de los últimos 50 informes.
9. **Atajos de teclado** (F2 dictar, F3 pausar) incluso globales vía el servidor Python.

## 5. Hallazgos

### 5.1 Seguridad (prioridad alta)

- **Clave de Google en el historial público de GitHub.** El repo está en `github.com/drgtinformes/GTX-STT`. Aunque hoy `secrets.js` está en `.gitignore`, la `API_KEY` de Google (`AIzaSy…Op4co`) estuvo *hardcodeada* en `gmail-integration.js` en commits anteriores, por lo que **sigue presente en el historial de git** y, si el repo es público, es accesible. → **Rotar y restringir la clave** (por dominio/HTTP referrer) y limpiar el historial.
- **Posible exposición de datos de pacientes (PII médica).** `prompt.js` incluye ~13 informes de ejemplo con **nombres completos, edades y médicos tratantes** que parecen reales, y están versionados en GitHub. Esto puede infringir normativa de datos personales (en Chile, Ley 19.628). → Reemplazar por datos ficticios/anonimizados.
- **Claves de IA del usuario en el navegador.** Las claves de Gemini/Anthropic/OpenAI se guardan en `localStorage` y las llamadas a Anthropic usan `anthropic-dangerous-direct-browser-access: true`. Es aceptable para una herramienta personal/local, pero implica que las claves viajan desde el navegador y quedan expuestas a cualquier script de la página. No usar en equipos compartidos.

### 5.2 Bugs y riesgos técnicos (verificar antes de seguir)

- **Nombres de modelo a verificar.** El código llama a Anthropic con `model: "claude-opus-4-7"` y la UI lo etiqueta como `claude-4.7-opus` (inconsistencia UI vs. API). El motor realtime usa `model: "gpt-realtime-whisper"`, que no corresponde a la familia estándar de OpenAI. → **Confirmar que ambos identificadores existen hoy** en cada proveedor; si no, corregirlos (de lo contrario esas llamadas fallan con error de modelo).
- **Plantillas desincronizadas.** En `templates.js` solo hay 3 plantillas embebidas (QVA, TALCA, PLANTILLA_MP), pero en disco hay 5 `.docx`. CENTALIS y HMS son archivos **nuevos sin trackear** y no están embebidos, así que probablemente no aparezcan en el selector salvo que se suban manualmente. → Definir una única fuente de verdad para las plantillas.
- **Compatibilidad de navegador.** El motor nativo depende de `webkitSpeechRecognition`: funciona en Chrome/Edge, **no en Firefox**. Conviene documentarlo.
- **Dependencias CDN sin fijar del todo.** Algunas van con versión (`docxtemplater@3.49.0`) pero otras como `lucide@latest` no: un cambio upstream puede romper la app sin aviso.

### 5.3 Calidad y mantenibilidad

- **`main.js` monolítico** (~4.100 líneas, decenas de funciones globales). Difícil de mantener y de razonar. Candidato natural a dividir en módulos (stt, ia, word, vision, dict, gmail).
- **`templates.js` de ~1 MB** en base64 es ~35% del peso del proyecto y hace lento el versionado y la carga. Mejor cargar los `.docx` como archivos/fetch.
- **Mezcla de estilos:** muchos estilos *inline* en el HTML y `onclick` globales conviviendo con `addEventListener`. Conviene unificar.
- **Sin documentación ni gestión de dependencias** (`README`, `package.json`). Cuesta que otra persona (o tú en 3 meses) levante el proyecto.

### 5.4 Estado de git (desordenado)

- 6 archivos **modificados sin commitear** (`main.js`, `index.html`, `prompt.js`, `style.css`, `templates.js`, `diccionario_radiologico.json`).
- 3 archivos **sin trackear** (`PLANTILLA CENTALIS.docx`, `PLANTILLA HMS.docx`, `backup_antes_de_opus.zip`).
- Un **.zip de backup dentro del repo** (no debería versionarse; debería ir al `.gitignore`).
- Solo 3 commits en total; el trabajo reciente no está respaldado.

## 6. Recomendaciones priorizadas

**P0 — Antes de tocar nada más**
1. Rotar y restringir la `API_KEY` de Google; limpiar el historial de git si el repo es público.
2. Anonimizar los datos de pacientes en `prompt.js`.
3. Verificar/corregir los identificadores de modelo (`claude-opus-4-7`, `gpt-realtime-whisper`).
4. Hacer commit del trabajo pendiente y sacar el `.zip` del repo.

**P1 — Higiene del proyecto**
5. Añadir `README.md` (cómo levantar, requisitos, motores) y un `.gitignore` que incluya backups/zip.
6. Unificar la gestión de plantillas (incluir CENTALIS y HMS; decidir entre embebido vs. archivos).
7. Fijar versiones de todas las dependencias CDN.

**P2 — Refactor incremental (sin urgencia)**
8. Dividir `main.js` en módulos por dominio.
9. Sacar `templates.js` del bundle y cargar los `.docx` bajo demanda.
10. Mover estilos *inline* a `style.css`.

## 7. Preguntas abiertas para Diego

- ¿El repo de GitHub es **público o privado**? Define la urgencia del punto de seguridad.
- ¿Los nombres en los ejemplos de `prompt.js` son de **pacientes reales**?
- ¿Qué quieres hacer primero: **arreglar lo urgente (P0)**, **ordenar el proyecto (P1)** o **agregar/mejorar una funcionalidad** concreta?
- ¿Usas el **servidor Python** habitualmente o trabajas solo abriendo el HTML?
