/**
 * Retail Pro Prism — Webhook de Google Sheets
 *
 * CÓMO INSTALARLO (los cuatro pasos importan; el 3 es donde suele fallar)
 *  1. Abre la hoja de cálculo donde quieres los resultados.
 *  2. Extensiones ▸ Apps Script. Borra todo lo que haya y pega este archivo.
 *  3. Implementar ▸ Nueva implementación ▸ Aplicación web:
 *       - Ejecutar como: Yo
 *       - Quién tiene acceso: CUALQUIER USUARIO   ← si aquí eliges otra cosa,
 *         Google responde con su página de inicio de sesión y no se escribe nada.
 *     Cada vez que cambies este archivo hay que crear una implementación NUEVA
 *     (o editar la existente y subir la versión): guardar no basta.
 *  4. Copia la URL que termina en /exec y pégala en el panel del entrenador,
 *     en «Google Sheets y nota ▸ URL del Webhook».
 *
 * IMPORTANTE: la hoja se configura POR ENTRENADOR. Si la pegas mientras estás
 * en la sesión de "admin", los colaboradores que entren con el enlace de otro
 * entrenador no van a llegar a esta hoja.
 *
 * Este script escribe POR NOMBRE DE COLUMNA: lee la fila de títulos de tu hoja
 * y coloca cada dato debajo del título que le corresponde, sin importar en qué
 * orden estén. Si falta alguna columna, la agrega al final. Así el orden nunca
 * vuelve a descuadrar las filas.
 */

/**
 * Versión de ESTE archivo. El panel del entrenador la lee al pulsar «Probar
 * conexión»: si no llega, es que la URL sigue sirviendo una implementación
 * antigua (guardar el código no basta, hay que publicar una versión nueva).
 */
var VERSION = 3;

/**
 * Pestaña donde se escriben los resultados.
 *
 * Si tu hoja ya venía recibiendo datos en otra pestaña (por ejemplo «Hoja 1»),
 * el script sigue escribiendo ahí en vez de crear una nueva: partir los
 * resultados en dos pestañas es peor que respetar la que ya usabas.
 */
var SHEET_NAME = 'Resultados';

/** Título de la columna ▸ nombre del dato que envía la aplicación. */
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

var COLUMNA_ID = 'ID de intento';

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);

    var body = parseBody(e);
    if (!body) return json({ ok: false, error: 'Cuerpo vacío o ilegible.' });

    var data = body.data;
    if (!data && body.row) data = rowToData(body.row);
    if (!data) return json({ ok: false, error: 'Falta el objeto "data".' });

    var sheet = getSheet();
    var headers = ensureHeaders(sheet);

    // Envío de prueba desde el panel: confirma que todo funciona sin ensuciar
    // la hoja con una fila falsa.
    if (body.action === 'test' || data.esPrueba) {
      return json({
        ok: true,
        prueba: true,
        version: VERSION,
        hoja: SHEET_NAME,
        documento: SpreadsheetApp.getActiveSpreadsheet().getName(),
        columnas: headers.length
      });
    }

    if (!String(data.cajero || '').trim() || !String(data.modulo || '').trim()) {
      return json({ ok: false, error: 'La fila no trae cajero o módulo; no se escribe.' });
    }

    var intentoId = String(data.intentoId || '');
    if (intentoId && yaRegistrado(sheet, headers, intentoId)) {
      return json({ ok: true, duplicate: true });
    }

    sheet.appendRow(construirFila(headers, data));
    return json({ ok: true, fila: sheet.getLastRow() });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

function doGet() {
  return json({ ok: true, service: 'Retail Pro Prism webhook', version: VERSION, hoja: SHEET_NAME });
}

/** El servidor envía text/plain, así que el cuerpo llega en e.postData.contents. */
function parseBody(e) {
  if (e && e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (err) { return null; }
  }
  if (e && e.parameter && e.parameter.data) {
    try { return JSON.parse(e.parameter.data); } catch (err) { return null; }
  }
  // El servidor manda los mismos datos como parámetros sueltos, de respaldo.
  if (e && e.parameter && e.parameter.cajero) {
    return { action: 'appendRow', data: e.parameter };
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

  var preferida = ss.getSheetByName(SHEET_NAME);
  if (preferida) return preferida;

  // Antes de crear una pestaña nueva, se busca alguna que ya esté recibiendo
  // estos resultados (tiene «Cajero» y «Módulo» en su fila de títulos). Así, si
  // ya tenías historial en «Hoja 1», los datos nuevos siguen cayendo ahí.
  var hojas = ss.getSheets();
  for (var i = 0; i < hojas.length; i++) {
    var ancho = hojas[i].getLastColumn();
    if (ancho === 0) continue;
    var titulos = hojas[i].getRange(1, 1, 1, ancho).getValues()[0].map(function (t) {
      return String(t).trim();
    });
    if (titulos.indexOf('Cajero') !== -1 && titulos.indexOf('Módulo') !== -1) {
      SHEET_NAME = hojas[i].getName();
      return hojas[i];
    }
  }

  return ss.insertSheet(SHEET_NAME);
}

/**
 * Devuelve los títulos actuales de la hoja, creándolos si la hoja está vacía y
 * agregando al final los que falten. Nunca reordena ni borra lo que ya existe:
 * si tenías columnas propias, se quedan donde están.
 */
function ensureHeaders(sheet) {
  var ancho = sheet.getLastColumn();
  var headers = ancho > 0 ? sheet.getRange(1, 1, 1, ancho).getValues()[0].map(String) : [];
  var tieneTitulos = headers.some(function (h) { return String(h).trim() !== ''; });

  if (!tieneTitulos) {
    headers = COLUMNS.map(function (c) { return c.header; });
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return headers;
  }

  var faltantes = COLUMNS
    .map(function (c) { return c.header; })
    .filter(function (h) { return headers.indexOf(h) === -1; });

  if (faltantes.length) {
    sheet.getRange(1, headers.length + 1, 1, faltantes.length).setValues([faltantes]);
    sheet.getRange(1, headers.length + 1, 1, faltantes.length).setFontWeight('bold');
    headers = headers.concat(faltantes);
  }
  return headers;
}

/** Coloca cada dato bajo su título, en el orden que tenga la hoja. */
function construirFila(headers, data) {
  var porTitulo = {};
  COLUMNS.forEach(function (c) { porTitulo[c.header] = c.key; });

  return headers.map(function (titulo) {
    var key = porTitulo[String(titulo)];
    if (!key) return '';                       // columna tuya: no se toca
    var v = data[key];
    return v === undefined || v === null ? '' : v;
  });
}

/** Busca el ID del intento por NOMBRE de columna, no por posición. */
function yaRegistrado(sheet, headers, intentoId) {
  var col = headers.indexOf(COLUMNA_ID) + 1;
  if (col < 1) return false;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

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
 * Ejecútala a mano desde el editor (▶ diagnostico) para ver dónde va a escribir
 * y con qué columnas. Sale en Registro de ejecución.
 */
function diagnostico() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheet();
  var headers = ensureHeaders(sheet);
  Logger.log('Documento: %s', ss.getName());
  Logger.log('Pestaña donde se escribe: %s', SHEET_NAME);
  Logger.log('Filas con datos: %s', Math.max(0, sheet.getLastRow() - 1));
  Logger.log('Columnas: %s', headers.join(' | '));
  var faltan = COLUMNS.map(function (c) { return c.header; })
    .filter(function (h) { return headers.indexOf(h) === -1; });
  Logger.log(faltan.length ? 'FALTAN columnas: ' + faltan.join(', ') : 'Todas las columnas están.');
}

/**
 * Utilidad manual: borra las filas basura que dejaron versiones anteriores
 * (sin cajero, o con módulo "N/A"). Ejecútala una sola vez desde el editor.
 */
function limpiarFilasInvalidas() {
  var sheet = getSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  var colCajero = headers.indexOf('Cajero');
  var colModulo = headers.indexOf('Módulo');
  if (colCajero === -1 || colModulo === -1) {
    Logger.log('No encuentro las columnas Cajero y Módulo; no se borra nada.');
    return;
  }

  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  var borradas = 0;
  for (var i = values.length - 1; i >= 0; i--) {
    var cajero = String(values[i][colCajero] || '').trim().toLowerCase();
    var modulo = String(values[i][colModulo] || '').trim().toUpperCase();
    if (!cajero || cajero === 'desconocido' || !modulo || modulo === 'N/A') {
      sheet.deleteRow(i + 2);
      borradas++;
    }
  }
  Logger.log('Filas eliminadas: %s', borradas);
}
