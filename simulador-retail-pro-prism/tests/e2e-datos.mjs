/**
 * Qué se guarda por perfil, qué es de todos, y quién puede tocar qué.
 *
 * Habla directamente con la API, sin navegador: lo que se comprueba aquí son
 * reglas del servidor, y son las que tienen que aguantar aunque alguien llame a
 * la API por su cuenta.
 */
import { arrancarServidor, BASE, pararServidor } from './util.mjs';

const pruebas = [];
const comprobar = (nombre, condicion, detalle = '') => {
  pruebas.push({ nombre, ok: !!condicion, detalle });
  console.log(`  ${condicion ? 'ok   ' : 'FALLA'} ${nombre}${condicion || !detalle ? '' : ` — ${detalle}`}`);
};

const json = async (ruta, opciones = {}) => {
  const res = await fetch(BASE + ruta, opciones);
  let cuerpo = null;
  try {
    cuerpo = await res.json();
  } catch {
    /* respuesta vacía */
  }
  return { estado: res.status, cuerpo };
};

const comoJson = (cuerpo, token) => ({
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify(cuerpo),
});

const conToken = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

const servidor = await arrancarServidor();

try {
  // --- Sesiones ---
  const admin = await json('/api/login', comoJson({ username: 'admin', password: 'adminadmin1' }));
  const entrenador = await json('/api/login', comoJson({ username: 'entrenador', password: 'entrenador1' }));
  comprobar('el administrador entra', admin.cuerpo?.success, JSON.stringify(admin.cuerpo));
  comprobar('el entrenador entra', entrenador.cuerpo?.success, JSON.stringify(entrenador.cuerpo));

  const tAdmin = admin.cuerpo.token;
  const tEntrenador = entrenador.cuerpo.token;

  // Un segundo entrenador, para comprobar qué se comparte y qué no.
  await json('/api/users', comoJson({ username: 'entrenador2', password: 'entrenador2', name: 'Otro' }, tAdmin));
  const segundo = await json('/api/login', comoJson({ username: 'entrenador2', password: 'entrenador2' }));
  const tSegundo = segundo.cuerpo?.token;
  comprobar('se puede crear un segundo entrenador', !!tSegundo);

  // --- Google Sheets: solo el administrador ---
  console.log('\n  Google Sheets');
  const leerSheetEntrenador = await json('/api/admin/sheet', conToken(tEntrenador));
  comprobar('un entrenador NO puede leer la conexión', leerSheetEntrenador.estado === 403, `HTTP ${leerSheetEntrenador.estado}`);

  const escribirSheetEntrenador = await json(
    '/api/admin/sheet',
    comoJson({ googleWebhookUrl: 'https://malicioso.example/exec' }, tEntrenador)
  );
  comprobar('un entrenador NO puede cambiar la conexión', escribirSheetEntrenador.estado === 403, `HTTP ${escribirSheetEntrenador.estado}`);

  const probarEntrenador = await json('/api/admin/test-sync', { method: 'POST', ...conToken(tEntrenador) });
  comprobar('un entrenador NO puede probar la conexión', probarEntrenador.estado === 403, `HTTP ${probarEntrenador.estado}`);

  const reintentarEntrenador = await json('/api/admin/retry-sync', { method: 'POST', ...conToken(tEntrenador) });
  comprobar('un entrenador NO puede reenviar a la hoja', reintentarEntrenador.estado === 403, `HTTP ${reintentarEntrenador.estado}`);

  const escribirSheetAdmin = await json(
    '/api/admin/sheet',
    comoJson({ googleWebhookUrl: 'https://script.google.com/macros/s/PRUEBA/exec' }, tAdmin)
  );
  comprobar('el administrador SÍ puede cambiarla', escribirSheetAdmin.cuerpo?.success, `HTTP ${escribirSheetAdmin.estado}`);

  const infoEntrenador = await json('/api/admin/sheet-info', conToken(tEntrenador));
  comprobar('el entrenador ve que está conectada, sin la URL', infoEntrenador.cuerpo?.conectada === true && infoEntrenador.cuerpo?.googleWebhookUrl === undefined);

  // --- Catálogo: compartido por todas las cuentas ---
  console.log('\n  Productos y clientes (compartidos)');
  const catalogoNuevo = {
    products: [{ sku: 'SKU-COMPARTIDO', ean: 'SKU-COMPARTIDO', desc: 'Producto de prueba', price: 10, stock: 1 }],
    customers: [{ id: '1', doc: '11111111', name: 'CLIENTE COMPARTIDO', email: 'a@b.c' }],
    cardTypes: ['Visa'],
    returnDocument: { id: 'X-1', date: '', customerDoc: '11111111', total: '10', docType: '03-BOL ELECT' },
    fondoCajaInicial: '150.00',
  };
  await json('/api/admin/step-data', comoJson({ stepData: {}, catalog: catalogoNuevo }, tEntrenador));

  const catalogoDelSegundo = await json('/api/admin/step-data', conToken(tSegundo));
  comprobar(
    'el catálogo que guarda uno lo ve el otro',
    catalogoDelSegundo.cuerpo?.catalog?.products?.[0]?.sku === 'SKU-COMPARTIDO',
    JSON.stringify(catalogoDelSegundo.cuerpo?.catalog?.products?.[0])
  );

  // --- Datos de los módulos: de cada entrenador ---
  console.log('\n  Datos de los módulos (por entrenador)');
  await json('/api/admin/step-data', comoJson({ stepData: { 'm3-s2': { targetValue: 'SOLO-MIO' } } }, tEntrenador));
  const datosDelSegundo = await json('/api/admin/step-data', conToken(tSegundo));
  comprobar(
    'los datos de un entrenador NO los ve el otro',
    datosDelSegundo.cuerpo?.stepData?.['m3-s2'] === undefined,
    JSON.stringify(datosDelSegundo.cuerpo?.stepData)
  );

  const datosPropios = await json('/api/admin/step-data', conToken(tEntrenador));
  comprobar('cada entrenador conserva los suyos', datosPropios.cuerpo?.stepData?.['m3-s2']?.targetValue === 'SOLO-MIO');

  // --- Nota: de cada entrenador ---
  console.log('\n  Nota y calificación (por entrenador)');
  await json('/api/admin/config', comoJson({ passingScore: 17 }, tEntrenador));
  const notaSegundo = await json('/api/admin/config', conToken(tSegundo));
  comprobar('la nota mínima de uno no cambia la del otro', notaSegundo.cuerpo?.passingScore !== 17, `del segundo: ${notaSegundo.cuerpo?.passingScore}`);

  const notaPropia = await json('/api/admin/config', conToken(tEntrenador));
  comprobar('la nota mínima propia se guarda', notaPropia.cuerpo?.passingScore === 17);
  comprobar('la nota ya no expone la URL de la hoja', notaPropia.cuerpo?.googleWebhookUrl === undefined);

  // --- Personajes: globales, y solo el administrador los toca ---
  console.log('\n  Personajes (globales, solo administrador)');
  // Un webp mínimo de verdad, para que pase el filtro de "esto es una imagen".
  const IMAGEN = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';

  const intentoEntrenador = await json(
    '/api/admin/personajes',
    comoJson({ personajes: [{ id: 'sube-1', url: IMAGEN }] }, tEntrenador)
  );
  comprobar('un entrenador NO puede subir personajes', intentoEntrenador.estado === 403, `respondió ${intentoEntrenador.estado}`);

  const sinSesion = await json('/api/admin/personajes', comoJson({ personajes: [] }));
  comprobar('sin sesión tampoco', sinSesion.estado === 401, `respondió ${sinSesion.estado}`);

  const comoAdmin = await json('/api/admin/personajes', comoJson({ personajes: [{ id: 'sube-1', url: IMAGEN }] }, tAdmin));
  comprobar('el administrador sí puede', comoAdmin.estado === 200 && comoAdmin.cuerpo?.personajes?.length === 1, JSON.stringify(comoAdmin.cuerpo)?.slice(0, 80));

  // Lo que no es una imagen no entra: el `src` de esto se pinta en la pantalla
  // de todos los colaboradores.
  const conBasura = await json(
    '/api/admin/personajes',
    comoJson({ personajes: [{ id: 'malo', url: 'javascript:alert(1)' }] }, tAdmin)
  );
  comprobar('un "personaje" que no es imagen se rechaza', conBasura.estado === 400, `respondió ${conBasura.estado}`);

  // Y le llegan al colaborador por la misma llamada que ya hace al entrar.
  const publico = await json('/api/step-data?teacher=entrenador');
  comprobar(
    'el colaborador recibe los personajes con su configuración',
    Array.isArray(publico.cuerpo?.personajes) && publico.cuerpo.personajes.length === 1,
    JSON.stringify(publico.cuerpo?.personajes)?.slice(0, 60)
  );
} finally {
  pararServidor(servidor);
}

const fallos = pruebas.filter((p) => !p.ok).length;
console.log(`\n${pruebas.length - fallos}/${pruebas.length} comprobaciones correctas.`);
process.exit(fallos === 0 ? 0 : 1);
