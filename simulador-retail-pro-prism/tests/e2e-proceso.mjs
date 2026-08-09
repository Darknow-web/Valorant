/**
 * No se aprueba un módulo haciendo el proceso equivocado.
 *
 * Antes, los pedidos de Rappi y Pedidos Ya se podían cerrar cobrando en
 * EFECTIVO: el paso final no comprobaba nada y su `allowedTargets` permitía
 * aplicar cualquier pago. El colaborador aprobaba un módulo de aplicativo sin
 * haberle cobrado nunca al agregador, que es justo lo contrario de lo que su
 * caso le pide.
 *
 * Aquí se intenta hacer trampa a propósito y se exige que el sistema NO deje.
 *
 *   node tests/e2e-proceso.mjs
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
  visible,
} from './util.mjs';
import { CAMINOS } from './solver.mjs';

const pruebas = [];
const comprobar = (nombre, condicion, detalle = '') => {
  pruebas.push({ nombre, ok: !!condicion });
  console.log(`  ${condicion ? 'ok   ' : 'FALLA'} ${nombre}${condicion || !detalle ? '' : ` — ${detalle}`}`);
};

const servidor = await arrancarServidor();
const navegador = await abrirNavegador();

try {
  // ------------------------------------------------------------------
  // Rappi y Pedidos Ya cobrando en efectivo
  // ------------------------------------------------------------------
  for (const [moduleId, agregador, dni] of [
    ['m7', 'Rappi', '65000001'],
    ['m8', 'Pedidos Ya', '65000002'],
  ]) {
    console.log(`\n  ${moduleId} · intentar cerrarlo cobrando en efectivo`);
    const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await contexto.newPage();
    const camino = CAMINOS[moduleId];

    try {
      await entrarComoColaborador(page, { dni });
      await entrarAlModulo(page, moduleId);

      // Todo el caso hasta llegar a la pantalla de cobro, sin tocar el agregador.
      const hastaElCobro = camino.slice(0, camino.findIndex((a) => a.id === 'pay-btn-rappi-pedidos'));
      for (const accion of hastaElCobro) {
        await ejecutar(page, accion);
        await cerrarAviso(page);
      }

      // La trampa: cobrar el total en efectivo y mandar a imprimir.
      await ejecutar(page, { tipo: 'clic', id: 'pay-btn-apply' });
      await cerrarAviso(page);
      await ejecutar(page, { tipo: 'clic', id: 'pay-btn-print-update' });
      await cerrarAviso(page);

      const cerro = await estaCompletado(page, 2500);
      comprobar(`${moduleId}: cobrando en efectivo NO se cierra el módulo`, !cerro);

      // Y ahora, corrigiéndolo como se corrige en una caja: se anula el pago
      // equivocado y se cobra bien. Si no se anula, el cobro al agregador
      // entraría por importe 0, porque ya no queda nada pendiente.
      const anular = page.getByRole('button', { name: 'Anular', exact: true }).first();
      if (await visible(anular, 3000)) await anular.click();
      await page.waitForTimeout(500);

      for (const accion of camino.slice(camino.findIndex((a) => a.id === 'pay-btn-rappi-pedidos'))) {
        await ejecutar(page, accion);
        await cerrarAviso(page);
      }
      comprobar(`${moduleId}: cobrando a ${agregador} sí se cierra`, await estaCompletado(page));
    } catch (e) {
      comprobar(`${moduleId}: recorrido`, false, e.message.split('\n')[0]);
      await page.screenshot({ path: `tests/proceso-${moduleId}.png`, fullPage: true }).catch(() => {});
    } finally {
      await contexto.close();
    }
  }

  // ------------------------------------------------------------------
  // Módulo 4: la venta con tarjeta no se cierra cobrando en efectivo
  // ------------------------------------------------------------------
  console.log('\n  m4 · intentar cerrarlo sin usar la tarjeta');
  {
    const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await contexto.newPage();
    const camino = CAMINOS.m4;

    try {
      await entrarComoColaborador(page, { dni: '65000003' });
      await entrarAlModulo(page, 'm4');

      const hastaElPago = camino.slice(0, camino.findIndex((a) => a.tipo === 'abrirDesplegable'));
      for (const accion of hastaElPago) {
        await ejecutar(page, accion);
        await cerrarAviso(page);
      }

      // Los clics pueden ni siquiera prosperar (el botón de imprimir no existe
      // mientras el documento no esté cubierto): da igual, lo que se comprueba
      // es que el módulo no se dé por terminado.
      await ejecutar(page, { tipo: 'clic', id: 'pay-btn-apply' }).catch(() => {});
      await cerrarAviso(page);
      await ejecutar(page, { tipo: 'clic', id: 'pay-btn-print-update' }).catch(() => {});
      await cerrarAviso(page);

      comprobar('m4: cobrando en efectivo NO se cierra el módulo', !(await estaCompletado(page, 2500)));
    } catch (e) {
      comprobar('m4: recorrido', false, e.message.split('\n')[0]);
    } finally {
      await contexto.close();
    }
  }

  // ------------------------------------------------------------------
  // El código de autorización tiene que ser el del caso
  // ------------------------------------------------------------------
  console.log('\n  m7 · el código de autorización inventado no vale');
  {
    const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await contexto.newPage();
    const camino = CAMINOS.m7;

    try {
      await entrarComoColaborador(page, { dni: '65000004' });
      await entrarAlModulo(page, 'm7');

      const hastaElCodigo = camino.slice(0, camino.findIndex((a) => a.tipo === 'escribirEtiqueta'));
      for (const accion of hastaElCodigo) {
        await ejecutar(page, accion);
        await cerrarAviso(page);
      }

      // Un código inventado. Antes bastaba con que el campo no estuviera vacío.
      await ejecutar(page, { tipo: 'escribirEtiqueta', etiqueta: 'Código de autorización', valor: '000000' });
      await ejecutar(page, { tipo: 'clic', id: 'modal-auth-ok' });
      await page.waitForTimeout(700);

      // Sigue pidiendo el código: la ventana no se cerró y se contó un error.
      const ventanaAbierta = await visible(page.getByText('Ingrese código de autorización'), 3000);
      const conError = await visible(page.getByText(/Errores 1/), 3000);
      comprobar('m7: un código inventado no deja avanzar', ventanaAbierta && conError, `ventana=${ventanaAbierta} error=${conError}`);
      await cerrarAviso(page);

      // Con el del caso, sí.
      await ejecutar(page, { tipo: 'escribirEtiqueta', etiqueta: 'Código de autorización', valor: '884512' });
      await ejecutar(page, { tipo: 'clic', id: 'modal-auth-ok' });
      await cerrarAviso(page);
      await ejecutar(page, { tipo: 'clic', id: 'pay-btn-print-update' });
      await cerrarAviso(page);
      comprobar('m7: con el código del caso sí se cierra', await estaCompletado(page));
    } catch (e) {
      comprobar('m7 código: recorrido', false, e.message.split('\n')[0]);
      await page.screenshot({ path: 'tests/proceso-m7-codigo.png', fullPage: true }).catch(() => {});
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
