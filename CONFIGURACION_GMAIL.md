# Configuración del envío por Gmail

Guía para dejar funcionando el botón rojo **Gmail** de la app (responde al correo
del paciente adjuntando el informe `.docx`).

---

## Qué se arregló en el código (29-jun-2026)

**Síntoma:** al pulsar *Gmail* salía
`Error al enviar por Gmail: Cannot set properties of undefined (setting 'callback')`.

**Causa:** `secrets.js` está en `.gitignore`, así que **no existe en GitHub Pages**.
En producción las claves quedaban vacías → `initTokenClient({client_id: ''})`
fallaba → `tokenClient` quedaba `undefined` → la app reventaba al hacer clic.

**Solución (ya aplicada):**

- `gmail-integration.js` ahora trae el `CLIENT_ID` y el `API_KEY` incrustados como
  valor por defecto. `secrets.js` se sigue respetando como *override* si existe
  (desarrollo local). Esto es seguro: en una app 100 % de navegador estas claves
  **no se pueden ocultar**; se protegen por dominio (ver Seguridad abajo).
- `authenticateGmail()` ya no revienta: si Google todavía no cargó, muestra un
  mensaje claro en vez del `TypeError`.

> Tras subir los cambios (ver el final), **estos pasos del código ya están listos**.
> Lo que falta es la configuración en Google Cloud, que es cosa tuya y solo se
> hace una vez.

---

## Lo que TIENES que hacer en Google Cloud Console (una sola vez)

Inicia sesión en la consola con la cuenta dueña del proyecto (la del
`drgtinformes`). Proyecto número `635192566350`.

### 1. Habilitar la Gmail API

Abre 👉 https://console.cloud.google.com/apis/library/gmail.googleapis.com
y pulsa **Habilitar** (si ya aparece "Administrar", está hecho).

### 2. Autorizar tu dominio en el Client ID  ← *el paso clave*

Abre 👉 https://console.cloud.google.com/apis/credentials
→ en **ID de clientes de OAuth 2.0** haz clic en tu cliente
(`635192566350-...apps.googleusercontent.com`).

En **Orígenes autorizados de JavaScript** agrega exactamente:

```
https://drgtinformes.github.io
```

> Solo el dominio: **sin** `/GTX-STT` y **sin** barra al final.
> Si también la abres en local, añade además `http://localhost:9080`.

No hace falta tocar "URIs de redireccionamiento". Guarda. Los cambios pueden
tardar **unos minutos** en propagarse.

### 3. Pantalla de consentimiento + usuarios de prueba

Abre 👉 https://console.cloud.google.com/apis/credentials/consent

- Tipo de usuario: **Externo**.
- Estado de publicación: déjalo en **Prueba (Testing)**.
- En **Usuarios de prueba** pulsa *Agregar usuarios* y añade **todas** las
  cuentas desde las que vayas a enviar (mínimo `drgtinformes@gmail.com`).

> Los permisos que pide la app (`gmail.send` y `gmail.modify`) son "sensibles".
> En modo **Prueba** funcionan sin verificación de Google para los usuarios de
> prueba. La primera vez Google mostrará *"Google no ha verificado esta app"*:
> entra en **Configuración avanzada → Ir a GTX (no seguro)** y continúa. Es
> normal para una app personal; no necesitas pasar el proceso de verificación.

### 4. (Recomendado) Restringir el API_KEY

Como el `API_KEY` queda visible en el repo público, conviene limitarlo para que
solo funcione desde tu sitio:

https://console.cloud.google.com/apis/credentials → clic en la API key →

- **Restricciones de aplicación:** *Sitios web (Referentes HTTP)* → agrega
  `https://drgtinformes.github.io/*`
- **Restricciones de API:** restringe a *Gmail API*.

Si esa key alguna vez estuvo expuesta sin restringir, lo más limpio es
**rotarla** (crear una nueva, restringirla y reemplazarla en
`gmail-integration.js`).

---

## Cómo probar

1. Sube los cambios (comando al final) y espera 1–2 min a que GitHub Pages
   publique.
2. Abre https://drgtinformes.github.io/GTX-STT/ y **recarga con `Ctrl+F5`**.
3. Genera un informe, elige la plantilla y pulsa **Gmail**.
4. Debe abrirse la ventana de Google para elegir cuenta y dar permisos.
5. Acepta → la app busca el correo del paciente y, tras confirmar, envía el
   `.docx` como respuesta.

---

## Cómo funciona el flujo (para que no te sorprenda)

- La app **responde a un correo existente** del paciente: busca en tu Gmail un
  hilo reciente cuyo asunto o adjunto coincida con el **nombre del paciente**.
- El filtro actual es `newer_than:1d` (solo correos del **último día**). Si el
  correo del paciente es más viejo, no lo encontrará. Si quieres ampliar la
  ventana (p. ej. a 7 días), se cambia en `findPatientThread()`
  (`newer_than:1d` → `newer_than:7d`). Avísame y lo ajusto.
- El token de Google dura ~1 hora y se guarda en tu navegador. Al expirar, te
  volverá a pedir iniciar sesión (es lo normal en apps sin servidor).

---

## Seguridad — por qué es correcto incrustar las claves

- El **CLIENT_ID de OAuth es público por diseño**. Su seguridad no viene de
  ocultarlo, sino de los *orígenes autorizados* (paso 2): aunque alguien lo
  copie, Google solo permite usarlo desde `drgtinformes.github.io`.
- El **API_KEY** se protege por *referente HTTP* (paso 4): solo sirve desde tu
  dominio y solo para Gmail.
- Las claves de IA (Gemini/Anthropic/OpenAI) **no** están aquí; siguen en
  `localStorage`, como antes.
