/**
 * GTX-STT · ENVÍOS PROGRAMADOS DE LOTES  (Google Apps Script)
 * ------------------------------------------------------------
 * GTX-STT deja el correo del lote como BORRADOR en Gmail con la cabecera
 *   X-GTX-Programado: 2026-10-20T11:00:00.000Z
 * Este script revisa los borradores cada 5 minutos y envía los que ya cumplieron su hora.
 * Funciona aunque el computador esté apagado (corre en los servidores de Google).
 *
 * INSTALACIÓN (una sola vez, con la cuenta drgtinformes@gmail.com):
 *  1. Entra a https://script.google.com  ->  "Nuevo proyecto".
 *  2. Borra lo que aparece y pega TODO este archivo. Ponle de nombre "GTX envíos programados".
 *  3. Arriba elige la función "instalar" y presiona "Ejecutar".
 *  4. Acepta los permisos (Gmail). Si aparece "Google no verificó esta app":
 *     "Configuración avanzada" -> "Ir a GTX envíos programados" -> "Permitir".
 *  Listo. Para desinstalar: ejecuta "desinstalar".
 *
 * Para revisar qué hizo: menú "Ejecuciones" del proyecto.
 */

const CABECERA = 'X-GTX-Programado';

function enviarProgramados() {
  const ahora = Date.now();
  const borradores = GmailApp.getDrafts();
  for (const d of borradores) {
    let msg;
    try { msg = d.getMessage(); } catch (e) { continue; }
    const marca = msg.getHeader(CABECERA);
    if (!marca) continue;
    const hora = Date.parse(marca);
    if (isNaN(hora) || hora > ahora) continue;
    try {
      d.send();
      console.log('Enviado: "' + msg.getSubject() + '" a ' + msg.getTo() + ' (programado ' + marca + ')');
    } catch (e) {
      console.error('No se pudo enviar "' + msg.getSubject() + '": ' + e);
    }
  }
}

function instalar() {
  desinstalar();
  ScriptApp.newTrigger('enviarProgramados').timeBased().everyMinutes(5).create();
  enviarProgramados();
  console.log('Instalado: se revisarán los borradores programados cada 5 minutos.');
}

function desinstalar() {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'enviarProgramados'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
}
