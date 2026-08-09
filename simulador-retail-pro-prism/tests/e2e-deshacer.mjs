/**
 * Deshacer un cobro no puede matar el módulo.
 *
 * Es la prueba del fallo reportado: se cobra con Rappi, se anula el pago y ya no
 * había forma de volver a cobrarle al agregador. Dos causas se sumaban:
 *
 *   - El pago lo creaba la `action` del paso, y las acciones solo corren cuando
 *     el paso AVANZA, nunca al repetir uno ya cumplido.
 *   - Y dejaba la forma de pago en «RAPPI», mientras que los botones RAPPI y
 *     PEDIDOS YA solo se dibujan con Efectivo seleccionado: desaparecían.
 *
 * La misma familia afectaba al crédito de tienda del Módulo 11, donde anular el
 * pago evaporaba el saldo sin devolverlo.
 *
 *   node tests/e2e-deshacer.mjs
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

/** Pulsa el «Anular» de la primera fila de la lista de pagos. */
async function anularPrimerPago(page) {
  const anular = page.getByRole('button', { name: 'Anular', exact: true }).first();
  if (!(await visible(anular, 3000))) return false;
  await anular.click();
  await page.waitForTimeout(500);
  return true;
}

const servidor = await arrancarServidor();
const navegador = await abrirNavegador();

try {
  // ------------------------------------------------------------------
  // Rappi y Pedidos Ya: cobrar → anular → volver a cobrar
  // ------------------------------------------------------------------
  for (const [moduleId, agregador] of [['m7', 'RAPPI'], ['m8', 'PEDIDOS YA']]) {
    console.log(`\n  ${moduleId} · ${agregador}`);
    const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await contexto.newPage();
    const camino = CAMINOS[moduleId];
    // El camino termina en «Imprimir Actualizar»; aquí paramos justo antes.
    const hastaElCobro = camino.slice(0, camino.length - 1);

    try {
      await entrarComoColaborador(page, { dni: moduleId === 'm7' ? '64000001' : '64000002' });
      await entrarAlModulo(page, moduleId);

      for (const accion of hastaElCobro) {
        await ejecutar(page, accion);
        await cerrarAviso(page);
      }
      comprobar(`${moduleId}: el cobro al agregador queda registrado`, await visible(page.getByText(agregador).first(), 3000));

      // El botón del agregador tiene que seguir a la vista: antes desaparecía
      // en cuanto se cobraba, porque la forma de pago se quedaba en «RAPPI».
      comprobar(
        `${moduleId}: el botón ${agregador} sigue disponible después de cobrar`,
        await visible(page.getByRole('button', { name: agregador, exact: true }), 3000)
      );

      comprobar(`${moduleId}: se puede anular el pago`, await anularPrimerPago(page));

      // Y ahora lo que fallaba: volver a cobrarle al agregador.
      const indiceCobro = hastaElCobro.findIndex((a) => a.id === 'pay-btn-rappi-pedidos');
      for (const accion of hastaElCobro.slice(indiceCobro)) {
        await ejecutar(page, accion);
        await cerrarAviso(page);
      }
      comprobar(
        `${moduleId}: se puede VOLVER a cobrar al agregador tras anular`,
        await visible(page.getByText(agregador).first(), 3000)
      );

      // Y el módulo se termina.
      await ejecutar(page, camino[camino.length - 1]);
      await cerrarAviso(page);
      comprobar(`${moduleId}: el módulo se termina después de rehacer el cobro`, await estaCompletado(page));
    } catch (e) {
      comprobar(`${moduleId}: recorrido completo`, false, e.message.split('\n')[0]);
      await page.screenshot({ path: `tests/deshacer-${moduleId}.png`, fullPage: true }).catch(() => {});
    } finally {
      await contexto.close();
    }
  }

  // ------------------------------------------------------------------
  // Módulo 11: anular el crédito de tienda tiene que DEVOLVER el saldo
  // ------------------------------------------------------------------
  console.log('\n  m11 · crédito de tienda');
  {
    const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await contexto.newPage();
    const camino = CAMINOS.m11;

    try {
      await entrarComoColaborador(page, { dni: '64000003' });
      await entrarAlModulo(page, 'm11');

      // Hasta aplicar el crédito de tienda (el primer «Pago» tras aceptar el modal).
      const hastaElCredito = camino.slice(0, camino.findIndex((a) => a.id === 'modal-store-credit-yes') + 2);
      for (const accion of hastaElCredito) {
        await ejecutar(page, accion);
        await cerrarAviso(page);
      }

      const leerCredito = async () => {
        const campo = page
          .locator('xpath=//*[normalize-space(text())="Crédito Tienda Disponible"]/following-sibling::input[1]')
          .first();
        return (await visible(campo, 2000)) ? await campo.inputValue() : null;
      };

      comprobar('m11: el crédito se aplicó como pago', await visible(page.getByText('Crédito de Tienda').first(), 3000));

      await anularPrimerPago(page);

      // Tras anular, el saldo tiene que estar de vuelta. Antes se evaporaba: la
      // pantalla lo descontaba al aplicarlo y «Anular» no reponía nada, así que
      // el producto nuevo ya no se podía cubrir nunca.
      // Para verlo hay que volver a elegir «Crédito de Tienda» en el desplegable.
      await ejecutar(page, { tipo: 'abrirDesplegable', etiqueta: 'Metodo de Pago' });
      await ejecutar(page, { tipo: 'elegirOpcion', id: 'pay-method-Crédito-de-Tienda' });
      await cerrarAviso(page);

      const saldo = await leerCredito();
      // «S/.26.90» → 26.90. Quitar solo los no-dígitos dejaba «.26.90», que no
      // es un número: la prueba fallaba aunque el saldo estuviera devuelto.
      const importe = Number(String(saldo ?? '').replace(/^[^\d]*/, '').replace(/[^\d.]/g, ''));
      const devuelto = Number.isFinite(importe) && importe > 0;
      comprobar('m11: anular el crédito DEVUELVE el saldo', devuelto, `disponible: ${saldo}`);

      // Y con el saldo de vuelta, el módulo se puede terminar.
      for (const accion of camino.slice(camino.findIndex((a) => a.id === 'pay-btn-apply' && a.tipo === 'clic'))) {
        await ejecutar(page, accion);
        await cerrarAviso(page);
      }
      comprobar('m11: el módulo se termina tras devolver el crédito', await estaCompletado(page));
    } catch (e) {
      comprobar('m11: recorrido completo', false, e.message.split('\n')[0]);
      await page.screenshot({ path: 'tests/deshacer-m11.png', fullPage: true }).catch(() => {});
    } finally {
      await contexto.close();
    }
  }
  // ------------------------------------------------------------------
  // Módulo 5: cubrir todo el documento con la tarjeta y arreglarlo
  // ------------------------------------------------------------------
  // El pago mixto es el caso más fácil de hacer mal: si la tarjeta cubre el
  // documento entero, ya no queda saldo pendiente, así que aplicar el efectivo
  // que el caso pide no crea ningún pago y el paso de cierre —que exige los
  // dos— no se puede cumplir. La salida es anular y volver a cobrar en el orden
  // correcto, y el aviso del paso lo dice con esas palabras. Aquí se comprueba
  // que esa salida existe de verdad.
  console.log('\n  m5 · la tarjeta cubrió todo el documento');
  {
    const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await contexto.newPage();
    const camino = CAMINOS.m5;

    try {
      await entrarComoColaborador(page, { dni: '64000005' });
      await entrarAlModulo(page, 'm5');

      const desdeElEfectivo = camino.findIndex((a) => a.tipo === 'escribirEtiqueta');
      const trasElEfectivo = camino.findIndex((a) => a.id === 'pay-btn-apply') + 1;

      // El efectivo parcial, bien hecho. Hasta aquí todo correcto.
      for (const accion of camino.slice(0, trasElEfectivo)) {
        await ejecutar(page, accion);
        await cerrarAviso(page);
      }

      // Y ahora el descuido: lo anula. El paso del efectivo ya está dado por
      // bueno, así que el módulo pasa al de la tarjeta sin ningún pago hecho, y
      // la tarjeta se lleva el documento entero.
      comprobar('m5: se puede anular el efectivo ya aplicado', await anularPrimerPago(page));
      for (const accion of camino.slice(trasElEfectivo)) {
        await ejecutar(page, accion);
        await cerrarAviso(page);
      }
      comprobar('m5: con la tarjeta cubriéndolo todo NO se cierra', !(await estaCompletado(page, 2500)));
      await cerrarAviso(page);

      // La salida: anular ese pago y cobrar en el orden que pide el caso.
      comprobar('m5: se puede anular el pago de más', await anularPrimerPago(page));
      for (const accion of camino.slice(desdeElEfectivo)) {
        await ejecutar(page, accion);
        await cerrarAviso(page);
      }
      comprobar('m5: anulando y cobrando en orden, el módulo se termina', await estaCompletado(page));
    } catch (e) {
      comprobar('m5: recorrido completo', false, e.message.split('\n')[0]);
      await page.screenshot({ path: 'tests/deshacer-m5.png', fullPage: true }).catch(() => {});
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
