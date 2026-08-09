/**
 * Repetir un paso correcto no puede romper nada.
 *
 * Es la regla del simulador: los puntos se descuentan por equivocarse, y volver
 * a hacer algo que ya estaba bien no suma puntos, así que tampoco puede costar
 * nada. El colaborador lo aprovecha sin miedo — vuelve a pasar el producto,
 * vuelve a contestar una ventana — y ahí es donde aparecía la familia de fallos
 * del caso de Rappi: acciones que CREAN algo (una línea del documento, un pago,
 * un recargo de precio) y que repetidas creaban el doble, sin ninguna forma de
 * quitar lo que sobraba una vez en la pantalla de cobro.
 *
 * Esta prueba hace dos cosas:
 *
 *   1. Recorre los 14 módulos por el camino correcto ejecutando CADA paso dos
 *      veces. La segunda solo si el control sigue a la vista: que el sistema no
 *      ofrezca repetir algo también es una respuesta válida.
 *   2. Insiste donde de verdad se puede insistir: sin salir de la pantalla de
 *      venta, busca el mismo artículo tres veces y vuelve a contestar la ventana
 *      del nivel de precio, y comprueba que el documento no crece ni se encarece.
 *
 * En los dos casos se exige lo mismo: el módulo se termina y el contador marca
 * CERO errores.
 *
 * Nota de lo que NO hace falta probar: las pantallas las manda el paso en curso,
 * no el clic, así que no se puede volver a una pantalla que quedó atrás. Rehacer
 * la devolución entera —que sobre el papel duplicaría la nota de crédito— es un
 * camino que el simulador no permite recorrer.
 *
 *   node tests/e2e-repetir.mjs [m7]
 */
import {
  abrirNavegador,
  arrancarServidor,
  cerrarAviso,
  ejecutar,
  entrarAlModulo,
  entrarComoColaborador,
  estaCompletado,
  pararServidor,
} from './util.mjs';
import { CAMINOS, MODULOS } from './solver.mjs';

/** Al repetir, muchos controles ya no están: no tiene sentido esperarlos 6 s. */
const PACIENCIA_REPETICION = 1200;

const pruebas = [];
const comprobar = (nombre, condicion, detalle = '') => {
  pruebas.push({ nombre, ok: !!condicion });
  console.log(`  ${condicion ? 'ok   ' : 'FALLA'} ${nombre}${condicion || !detalle ? '' : ` — ${detalle}`}`);
};

/**
 * El contador de la barra del simulador, o null si ya no está en pantalla
 * (al completarse el módulo la barra desaparece).
 */
async function errores(page) {
  const texto = await page.locator('text=/Errores \\d+/').first().textContent().catch(() => null);
  const n = texto?.match(/Errores (\d+)/)?.[1];
  return n === undefined ? null : Number(n);
}

/** Cuenta las líneas del documento, tal como las muestra la ficha de la derecha. */
async function lineasDelDocumento(page) {
  const texto = await page
    .locator('xpath=//span[normalize-space(text())="Cantidad de Linea"]/following-sibling::span[1]')
    .first()
    .textContent()
    .catch(() => null);
  return texto === null ? null : Number(texto.trim());
}

/** El importe del documento, tal como lo ve el colaborador. */
async function totalDelDocumento(page) {
  return page
    .locator('xpath=//span[normalize-space(text())="Total de Transacción"]/following-sibling::span[1]')
    .first()
    .textContent()
    .then((t) => t?.trim() ?? null)
    .catch(() => null);
}

/** Ejecuta una acción sin exigir que exista. Devuelve si llegó a hacerse. */
async function intentar(page, accion, paciencia = PACIENCIA_REPETICION) {
  try {
    await ejecutar(page, accion, paciencia);
    return true;
  } catch {
    return false;
  }
}

const soloEste = process.argv[2];
const modulos = soloEste ? [soloEste] : MODULOS;

const servidor = await arrancarServidor();
const navegador = await abrirNavegador();

try {
  // ------------------------------------------------------------------
  // 1. Cada paso, dos veces
  // ------------------------------------------------------------------
  console.log('\n  Cada paso del camino correcto, hecho dos veces\n');
  for (const moduleId of modulos) {
    const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await contexto.newPage();
    const erroresDePagina = [];
    page.on('pageerror', (e) => erroresDePagina.push(e.message));

    try {
      await entrarComoColaborador(page, { dni: `7100${moduleId.replace('m', '').padStart(2, '0')}` });
      await entrarAlModulo(page, moduleId);

      // El contador se lee sobre la marcha: cuando el módulo se completa la
      // barra desaparece y leerlo al final daría siempre cero, que es como no
      // comprobar nada.
      let ultimoContador = 0;
      for (const accion of CAMINOS[moduleId]) {
        await ejecutar(page, accion);
        await cerrarAviso(page);
        // Abrir un desplegable y elegir la opción son dos tiempos de un mismo
        // gesto: repetir solo el primero lo CIERRA, que es lo que debe hacer, y
        // repetir solo el segundo busca una opción que ya no está en pantalla.
        // Ninguna de las dos cosas es "repetir un paso correcto".
        if (accion.tipo !== 'abrirDesplegable' && accion.tipo !== 'elegirOpcion') {
          await intentar(page, accion);
          await cerrarAviso(page);
        }
        const n = await errores(page);
        if (n !== null) ultimoContador = n;
      }

      const listo = await estaCompletado(page);
      comprobar(`${moduleId}: se completa repitiendo cada paso`, listo);
      comprobar(`${moduleId}: repetir no costó errores`, ultimoContador === 0, `contó ${ultimoContador}`);
      if (erroresDePagina.length) console.log(`       errores de página: ${erroresDePagina.join(' | ')}`);
    } catch (e) {
      comprobar(`${moduleId}: recorrido`, false, e.message.split('\n')[0]);
      await page.screenshot({ path: `tests/repetir-${moduleId}.png`, fullPage: true }).catch(() => {});
    } finally {
      await contexto.close();
    }
  }

  // ------------------------------------------------------------------
  // 2. Insistir sin salir de la pantalla de venta
  // ------------------------------------------------------------------
  // Aquí el colaborador SÍ puede insistir cuanto quiera: la pantalla de venta se
  // queda puesta durante varios pasos. Volver a pasar el artículo y volver a
  // contestar la ventana del nivel de precio son gestos naturales de quien no
  // está seguro de que le haya entrado, y antes cada repetición añadía otra
  // línea al documento o le subía otro 5% al precio, sin forma de deshacerlo una
  // vez en la pantalla de cobro.
  console.log('\n  Insistir en la pantalla de venta\n');
  for (const [moduleId, dni] of [
    ['m3', '71002003'],
    ['m7', '71002007'],
  ]) {
    if (soloEste && soloEste !== moduleId) continue;
    const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await contexto.newPage();

    try {
      const camino = CAMINOS[moduleId];
      const buscarArticulo = camino.find((a) => a.id === 'pos-search-item');
      const buscarCliente = camino.find((a) => a.id === 'pos-search-customer');
      // Hasta tener artículo y cliente: a partir de ahí seguimos en la misma
      // pantalla y todo lo que viene se puede repetir a voluntad.
      const corte = camino.indexOf(buscarCliente) + 1;

      await entrarComoColaborador(page, { dni });
      await entrarAlModulo(page, moduleId);

      for (const accion of camino.slice(0, corte)) {
        await ejecutar(page, accion);
        await cerrarAviso(page);
      }

      // En los módulos de agregador, buscar al cliente abre la ventana del nivel
      // de precio; hay que contestarla antes de poder mirar el documento.
      const restoDelCamino = camino.slice(corte);
      const finDeLaVentana = restoDelCamino.findIndex((a) => a.id === 'modal-price-level-yes');
      const cerrarVentana = finDeLaVentana === -1 ? [] : restoDelCamino.slice(0, finDeLaVentana + 1);
      for (const accion of cerrarVentana) {
        await ejecutar(page, accion);
        await cerrarAviso(page);
      }

      const lineasAntes = await lineasDelDocumento(page);
      const totalAntes = await totalDelDocumento(page);

      // Dos veces más el mismo artículo, y otra vez el cliente. Si es un
      // agregador, eso vuelve a abrir la ventana del nivel de precio y se
      // contesta igual que la primera vez.
      await ejecutar(page, buscarArticulo);
      await cerrarAviso(page);
      await ejecutar(page, buscarArticulo);
      await cerrarAviso(page);
      await ejecutar(page, buscarCliente);
      await cerrarAviso(page);
      for (const accion of cerrarVentana) {
        await ejecutar(page, accion);
        await cerrarAviso(page);
      }

      comprobar(
        `${moduleId}: insistir no agrega líneas al documento`,
        (await lineasDelDocumento(page)) === lineasAntes,
        `${lineasAntes} antes, ${await lineasDelDocumento(page)} después`
      );
      comprobar(
        `${moduleId}: insistir no cambia el importe`,
        (await totalDelDocumento(page)) === totalAntes,
        `${totalAntes} antes, ${await totalDelDocumento(page)} después`
      );
      const contadorTrasInsistir = await errores(page);
      comprobar(`${moduleId}: insistir no costó errores`, contadorTrasInsistir === 0, `contó ${contadorTrasInsistir}`);

      for (const accion of restoDelCamino.slice(cerrarVentana.length)) {
        await ejecutar(page, accion);
        await cerrarAviso(page);
      }
      comprobar(`${moduleId}: después de insistir, el módulo termina`, await estaCompletado(page));
    } catch (e) {
      comprobar(`${moduleId} insistir: recorrido`, false, e.message.split('\n')[0]);
      await page.screenshot({ path: `tests/repetir-insistir-${moduleId}.png`, fullPage: true }).catch(() => {});
    } finally {
      await contexto.close();
    }
  }
} finally {
  await navegador.close();
  pararServidor(servidor);
}

const fallos = pruebas.filter((p) => !p.ok).length;
console.log(`\n${pruebas.length - fallos}/${pruebas.length} comprobaciones correctas.`);
process.exit(fallos === 0 ? 0 : 1);
