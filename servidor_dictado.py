import http.server
import socketserver
import threading
import asyncio
import websockets
import keyboard
import json

HTTP_PORT = 8080
WS_PORT = 8081
CLIENTS = set()

# --- HTTP SERVER ---
def start_http_server():
    Handler = http.server.SimpleHTTPRequestHandler
    try:
        with socketserver.TCPServer(("", HTTP_PORT), Handler) as httpd:
            print(f"[*] Servidor web disponible en: http://localhost:{HTTP_PORT}")
            httpd.serve_forever()
    except OSError as e:
        print(f"[!] Error iniciando servidor HTTP (¿Puerto {HTTP_PORT} en uso?): {e}")

# --- WEBSOCKET SERVER ---
async def ws_handler(websocket):
    print("[+] Cliente web conectado al WebSocket")
    CLIENTS.add(websocket)
    try:
        await websocket.wait_closed()
    finally:
        CLIENTS.remove(websocket)
        print("[-] Cliente web desconectado")

async def broadcast_message(message):
    if CLIENTS:
        print(f"[*] Enviando señal a {len(CLIENTS)} pestañas...")
        for client in list(CLIENTS):
            try:
                await client.send(message)
            except websockets.exceptions.ConnectionClosed:
                pass

# --- HOTKEY LISTENER ---
def on_f2_pressed(loop):
    print("[!] Tecla F2 detectada globalmente")
    try:
        asyncio.run_coroutine_threadsafe(
            broadcast_message(json.dumps({"action": "toggle_record"})), 
            loop
        )
    except Exception as e:
        print(f"Error interno al enviar mensaje: {e}")

async def main():
    loop = asyncio.get_running_loop()
    
    try:
        keyboard.add_hotkey('f2', lambda: on_f2_pressed(loop))
        print("[*] Atajo global F2 registrado correctamente.")
    except ImportError as e:
        print("[!] Error: librería 'keyboard' no funciona como se esperaba.")
        print(e)
        
    print(f"[*] Servidor WebSocket escuchando en ws://localhost:{WS_PORT}")
    print("\n>>> Listo. Puedes usar tu visor DICOM y presionar F2 para dictar. <<<")
    print(">>> Presiona Ctrl+C en esta consola para cerrar. <<<\n")
    
    async with websockets.serve(ws_handler, "localhost", WS_PORT):
        await asyncio.Future()  # Mantener abierto por siempre

if __name__ == "__main__":
    print("="*50)
    print("   SERVIDOR DE DICTADO RADIOLÓGICO (F2 GLOBAL)   ")
    print("="*50)

    # Iniciar servidor HTTP en un hilo separado
    http_thread = threading.Thread(target=start_http_server, daemon=True)
    http_thread.start()

    # Iniciar event loop principal (WebSockets + Hotkeys)
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nSaliendo del servidor...")
    except Exception as e:
        print(f"[!] Error inesperado: {e}")
