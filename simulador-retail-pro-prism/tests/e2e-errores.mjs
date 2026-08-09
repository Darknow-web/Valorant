/**
 * Qué resta puntos y qué no.
 *
 * El conteo pasó a ser estricto: cualquier acción que se salga del flujo
 * descuenta. Eso obliga a comprobar las dos caras:
 *
 *   - Que un clic equivocado reste **UNO**, no dos. Medio centenar de elementos
 *     de las pantallas llaman a `handleInteract` dos veces por clic (desde el
 *     envoltorio `Interactive` y desde el `onClick` del botón). Antes no se
 *     notaba porque el error bloqueaba el clic; ahora que se deja pasar, sin
 *     antirrebote cada equivocación costaría el doble.
 *   - Que repetir un paso ya cumplido, rellenar datos o reacomodar la pantalla
 *     no resten nada.
 *
 *   node tests/e2e-errores.mjs
 */
import {
  abrirNavegador,
  arrancarServidor,
  cerrarAviso,
  ejecutar,
  entrarAlModulo,
  entrarComoColaborador,
  pararServidor,
  visible,
} from './util.mjs';
import { CAMINOS } from './solver.mjs';

const pruebas = [];
const comprobar = (nombre, condicion, detalle = '') => {
  pruebas.push({ nombre, ok: !!condicion });
  console.log(`  ${condicion ? 'ok   ' : 'FALLA'} ${nombre}${condicion || !detalle ? '' : ` — ${detalle}`}`);
};

/** El contador de errores de la barra del simulador. */
async function errores(page) {
  const texto = await page.locator('text=/Errores \\d+/').first().textContent().catch(() => '');
  return Number(texto?.match(/Errores (\d+)/)?.[1] ?? -1);
}

const servidor = await arrancarServidor();
const navegador = await abrirNavegador();

try {
  const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await contexto.newPage();

  await entrarComoColaborador(page, { dni: '66000001' });
  await entrarAlModulo(page, 'm3');

  // Paso 1 del Módulo 3: toca «Nueva Transacción» en el menú del punto de venta.
  console.log('\n  Un clic fuera del flujo');
  comprobar('empieza con 0 errores', (await errores(page)) === 0);

  // La pestaña «Clientes» no pinta nada aquí: es un clic fuera del flujo. Se
  // elige a propósito uno que no abre ninguna ventana, para medir el contador
  // sin que nada tape la pantalla.
  await page.locator('#menu-btn-customers').first().click();
  await page.waitForTimeout(700);
  await cerrarAviso(page);
  const trasUnClic = await errores(page);
  comprobar('un clic equivocado resta UNO, no dos', trasUnClic === 1, `contó ${trasUnClic}`);

  // Volver al camino y comprobar que rellenar y repetir no cuestan.
  console.log('\n  Lo que NO resta');
  await ejecutar(page, CAMINOS.m3[0]); // pos-menu-new-trans
  await cerrarAviso(page);
  await ejecutar(page, CAMINOS.m3[1]); // buscar el SKU
  await cerrarAviso(page);
  const trasVolverAlCamino = await errores(page);
  comprobar('seguir el camino correcto no suma errores', trasVolverAlCamino === 1, `contó ${trasVolverAlCamino}`);

  // Repetir un paso ya cumplido: buscar otra vez el mismo producto.
  await ejecutar(page, CAMINOS.m3[1]);
  await cerrarAviso(page);
  comprobar('repetir un paso ya cumplido no resta', (await errores(page)) === 1, `contó ${await errores(page)}`);

  // Escribir en un campo que no toca ahora mismo.
  const campoCliente = page.locator('#pos-search-customer').locator('input').first();
  await campoCliente.fill('99999999');
  await page.waitForTimeout(400);
  await cerrarAviso(page);
  comprobar('rellenar un campo sin confirmar no resta', (await errores(page)) === 1, `contó ${await errores(page)}`);

  // Reacomodar las pantallas: la salida garantizada, siempre gratis.
  await page.getByRole('button', { name: 'Reacomodar las pantallas' }).click();
  await page.waitForTimeout(600);
  await cerrarAviso(page);
  comprobar('reacomodar las pantallas no resta', (await errores(page)) === 1, `contó ${await errores(page)}`);

  // Y que el castigo se acumule de verdad con clics distintos.
  console.log('\n  Se acumula');
  // «Pagar Transacción» estando aún en la búsqueda del cliente: otra acción
  // fuera del flujo, y esta sí existe en la pantalla en la que estamos ahora.
  await page.locator('#pos-btn-pay').first().click();
  await page.waitForTimeout(700);
  await cerrarAviso(page);
  const trasSegundoClic = await errores(page);
  comprobar('un segundo clic fuera del flujo suma otro', trasSegundoClic === 2, `contó ${trasSegundoClic}`);

  await contexto.close();
} finally {
  await navegador.close();
  pararServidor(servidor);
}

const fallos = pruebas.filter((p) => !p.ok).length;
console.log(`\n${pruebas.length - fallos}/${pruebas.length} comprobaciones correctas.`);
process.exit(fallos === 0 ? 0 : 1);
