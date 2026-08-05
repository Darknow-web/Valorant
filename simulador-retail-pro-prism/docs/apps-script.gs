/**
 * Retail Pro Prism — Webhook de Google Sheets
 *
 * Cómo instalarlo:
 *  1. Abre la hoja de cálculo donde quieres los resultados.
 *  2. Extensiones ▸ Apps Script. Borra todo lo que haya y pega este archivo.
 *  3. Implementar ▸ Nueva implementación ▸ Aplicación web.
 *       - Ejecutar como: Yo
 *       - Quién tiene acceso: Cualquier usuario
 *  4. Copia la URL que termina en /exec y pégala en el panel del entrenador,
 *     en "URL del Webhook (Apps Script)".
 *
 * Qué recibe: {"action":"appendRow","data":{...},"row":[...]}
 * Lee los campos POR NOMBRE desde `data`. Esa es la corrección: la versión
 * anterior recibía solo un array sin nombres, no encontraba nada y escribía
 * sus valores por defecto ("Desconocido", "N/A", 0) en todas las filas.
 *
 * Además ignora los intentos repetidos usando `intentoId`, así una recarga o
 * un reintento no vuelve a escribir la misma fila.
 */

var SHEET_NAME = 'Resultados';

var COLUMNS = [
  { header: 'Fecha',               key: 'fecha' },
  { header: 'Cajero',              key: 'cajero' },
  { header: 'DNI',                 key: 'dni' },
  { header: 'Tienda',              key: 'tienda' },
  { header: 'Módulo',              key: 'modulo' },
  { header: 'Puntaje',             key: 'puntaje' },
  { header: 'Tiempo (s)',          key: 'tiempoSeg' },
  { header: 'Errores',             key: 'errores' },
  { header: 'Ayudas',              key: 'ayudas' },
  { header: 'Aprobado',            key: 'aprobado' },
  { header: 'Calificación',        key: 'calificacion' },
  { header: 'Entrenador',          key: 'entrenador' },
  { header: 'Detalle de errores',  key: 'detalleErrores' },
  { header: 'Detalle del proceso', key: 'detalleProceso' },
  { header: 'ID de intento',       key: 'intentoId' }
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);

    var body = parseBody(e);
    if (!body) return json({ ok: false, error: 'Cuerpo vacío o ilegible.' });

    var data = body.data;
    if (!data && body.row) data = rowToData(body.row);
    if (!data) return json({ ok: false, error: 'Falta el objeto "data".' });

    if (!String(data.cajero || '').trim() || !String(data.modulo || '').trim()) {
      return json({ ok: false, error: 'La fila no trae cajero o módulo; no se escribe.' });
    }

    var sheet = getSheet();
    ensureHeaders(sheet);

    var intentoId = String(data.intentoId || '');
    if (intentoId && alreadyStored(sheet, intentoId)) {
      return json({ ok: true, duplicate: true });
    }

    sheet.appendRow(COLUMNS.map(function (c) {
      var v = data[c.key];
      return v === undefined || v === null ? '' : v;
    }));

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

function doGet() {
  return json({ ok: true, service: 'Retail Pro Prism webhook' });
}

/** El servidor envía text/plain, así que el cuerpo llega en e.postData.contents. */
function parseBody(e) {
  if (e && e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (err) { return null; }
  }
  if (e && e.parameter && e.parameter.data) {
    try { return JSON.parse(e.parameter.data); } catch (err) { return null; }
  }
  return null;
}

/** Compatibilidad con clientes antiguos que solo mandaban el array posicional. */
function rowToData(row) {
  var data = {};
  for (var i = 0; i < COLUMNS.length; i++) data[COLUMNS[i].key] = row[i];
  return data;
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() > 0) return;
  var headers = COLUMNS.map(function (c) { return c.header; });
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function alreadyStored(sheet, intentoId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var col = COLUMNS.length; // "ID de intento" es la última columna
  var values = sheet.getRange(2, col, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === intentoId) return true;
  }
  return false;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Utilidad manual: borra las filas basura que dejó la versión anterior
 * (cajero "Desconocido" o módulo "N/A"). Ejecútala una sola vez desde el editor.
 */
function limpiarFilasInvalidas() {
  var sheet = getSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var values = sheet.getRange(2, 1, lastRow - 1, COLUMNS.length).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    var cajero = String(values[i][1] || '').trim().toLowerCase();
    var modulo = String(values[i][4] || '').trim().toUpperCase();
    if (!cajero || cajero === 'desconocido' || !modulo || modulo === 'N/A') {
      sheet.deleteRow(i + 2);
    }
  }
}
