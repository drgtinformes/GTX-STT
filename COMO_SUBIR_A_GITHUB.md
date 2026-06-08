# Cómo subir los cambios a GitHub

Guía rápida para Windows. Repo: `github.com/drgtinformes/GTX-STT` (remoto `origin`, rama `main`).

> Estado actual: ya hay un commit hecho y listo para subir
> (`Corrige 4 errores de procesado IA + checks de eval`). Solo falta el push.

## Subir el commit que ya está hecho

1. Abre la carpeta del proyecto en el Explorador de archivos:
   `C:\Users\diego\Desktop\CLAUDE PROYECTS\dictation-app`

2. Abre una terminal ahí mismo: haz clic en la **barra de direcciones** del
   Explorador (arriba, donde aparece la ruta), escribe `powershell` y presiona
   Enter. La terminal se abre ya ubicada en esa carpeta.

3. Sube el commit:
   ```
   git push origin main
   ```

4. Si te pide identificarte, la primera vez se abre una ventana de GitHub para
   iniciar sesión o autorizar. Acepta y el push continúa solo.

5. Para confirmar que subió:
   ```
   git log --oneline -1
   ```
   Debe mostrar "Corrige 4 errores de procesado IA…". También puedes mirarlo en
   GitHub.

## Si sale un error de "lock"

Si el paso 3 muestra algo como
`Unable to create '.git/index.lock': File exists` (o `HEAD.lock`):

- **Cierra la app de Claude** (eso libera los archivos bloqueados) y repite
  desde el paso 2. El commit ya está guardado, no pierdes nada.

## Atajo sin terminal

Si tienes **GitHub Desktop**: abre el repo y haz clic en **"Push origin"**
(arriba a la derecha). Hace lo mismo.

## Para subir cambios futuros (cuando edites algo)

En la terminal, dentro de la carpeta del proyecto:

```
git add -A
git commit -m "Describe aquí el cambio"
git push origin main
```

- `git add -A` prepara todos los archivos modificados.
- `git commit -m "..."` guarda el cambio con una descripción.
- `git push origin main` lo sube a GitHub.

> Nota: el archivo `eval/casos_prueba.jsonl` no se sube a propósito (está en
> `.gitignore` porque contiene informes reales de pacientes).
