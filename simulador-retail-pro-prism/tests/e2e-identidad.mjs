/**
 * Quién dice ser el colaborador, y con qué cara.
 *
 * El documento es la LLAVE del colaborador: con él se guarda su avance, se le
 * reconoce al volver de otro equipo y se le identifica en el ranking. Un DNI mal
 * tecleado le crea sin querer un colaborador nuevo y le hace perder lo que
 * llevaba hecho, así que se valida de verdad:
 *
 *   - DNI: ni más ni menos de 8 dígitos.
 *   - Carnet de extranjería: 8 o más.
 *   - Nombre y apellido, los dos obligatorios.
 *
 * Y el personaje: que se pueda elegir, que sobreviva a recargar la página, que
 * se pueda cambiar desde el menú y que salga en el ranking.
 *
 *   node tests/e2e-identidad.mjs
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
  BASE,
} from './util.mjs';
import { CAMINOS } from './solver.mjs';

const pruebas = [];
const comprobar = (nombre, condicion, detalle = '') => {
  pruebas.push({ nombre, ok: !!condicion });
  console.log(`  ${condicion ? 'ok   ' : 'FALLA'} ${nombre}${condicion || !detalle ? '' : ` — ${detalle}`}`);
};

/** Rellena la ventana de identificación y responde si «Continuar» se habilitó. */
async function rellenar(page, { nombre, apellido, tipo, documento, tienda = 'SP15 Mayolo' }) {
  await page.goto(`${BASE}/?teacher=entrenador`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Ej: Ana').fill(nombre);
  await page.getByPlaceholder('Ej: Torres').fill(apellido);
  if (tipo === 'CE') await page.locator('select').first().selectOption('CE');
  await page.getByPlaceholder(/^Ej: (71234567|001234567)$/).fill(documento);
  await page.getByPlaceholder('Ej: SP15 Mayolo').fill(tienda);
  await page.waitForTimeout(250);
  return page.getByRole('button', { name: 'Continuar' }).isEnabled();
}

const servidor = await arrancarServidor();
const navegador = await abrirNavegador();

try {
  // ------------------------------------------------------------------
  // Las reglas del documento
  // ------------------------------------------------------------------
  console.log('\n  Reglas del documento\n');
  {
    const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await contexto.newPage();
    const base = { nombre: 'Ana', apellido: 'Torres' };

    const casos = [
      ['DNI de 7 dígitos NO deja pasar', { ...base, tipo: 'DNI', documento: '7123456' }, false],
      ['DNI de 8 dígitos sí', { ...base, tipo: 'DNI', documento: '71234567' }, true],
      ['CE de 7 dígitos NO deja pasar', { ...base, tipo: 'CE', documento: '0012345' }, false],
      ['CE de 8 dígitos sí', { ...base, tipo: 'CE', documento: '00123456' }, true],
      ['CE de 12 dígitos también', { ...base, tipo: 'CE', documento: '001234567890' }, true],
      ['sin apellido NO deja pasar', { nombre: 'Ana', apellido: '', tipo: 'DNI', documento: '71234567' }, false],
      ['sin nombre NO deja pasar', { nombre: '', apellido: 'Torres', tipo: 'DNI', documento: '71234567' }, false],
      ['sin tienda NO deja pasar', { ...base, tipo: 'DNI', documento: '71234567', tienda: '' }, false],
    ];

    for (const [titulo, datos, esperado] of casos) {
      const habilitado = await rellenar(page, datos);
      comprobar(titulo, habilitado === esperado, `el botón quedó ${habilitado ? 'habilitado' : 'deshabilitado'}`);
    }

    // El DNI no admite un noveno dígito: el campo lo corta, no lo acepta.
    await rellenar(page, { ...base, tipo: 'DNI', documento: '712345678' });
    const enPantalla = await page.getByPlaceholder('Ej: 71234567').inputValue();
    comprobar('el DNI se queda en 8 dígitos aunque se teclee más', enPantalla === '71234567', `quedó «${enPantalla}»`);

    // Cambiar de tipo limpia el número: si no, un DNI de 8 se colaba como carnet.
    await page.locator('select').first().selectOption('CE');
    await page.waitForTimeout(200);
    const trasCambiar = await page.getByPlaceholder('Ej: 001234567').inputValue();
    comprobar('cambiar de tipo de documento limpia el número', trasCambiar === '', `quedó «${trasCambiar}»`);

    await contexto.close();
  }

  // ------------------------------------------------------------------
  // El personaje
  // ------------------------------------------------------------------
  console.log('\n  El personaje\n');
  {
    const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await contexto.newPage();

    try {
      await entrarComoColaborador(page, { dni: '72000001', nombre: 'Rosa', apellido: 'Quispe', personaje: 'base-3' });
      comprobar('tras elegir personaje se llega al menú', await visible(page.getByRole('heading', { name: 'Tu turno en la caja' }), 5000));

      // Sobrevive a recargar: el avatar se guarda, no se vuelve a preguntar.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      const vuelveAPreguntar = await visible(page.locator('[data-personaje]').first(), 2500);
      comprobar('al recargar no vuelve a preguntar el personaje', !vuelveAPreguntar);

      // Y se ve en el menú, que es desde donde se cambia.
      const enElMenu = page.getByRole('button', { name: 'Cambiar mi personaje' });
      comprobar('el avatar se ve en el menú', await visible(enElMenu, 5000));

      // Cambiarlo: se abre la elección, se elige otro y se guarda.
      await enElMenu.click();
      await page.waitForTimeout(600);
      comprobar('tocar el avatar abre la elección', await visible(page.locator('[data-personaje]').first(), 4000));
      await page.locator('[data-personaje="base-5"]').click();
      await page.getByRole('button', { name: 'Guardar mi personaje' }).click();
      await page.waitForTimeout(900);
      comprobar('al guardar vuelve al menú', await visible(page.getByRole('heading', { name: 'Tu turno en la caja' }), 5000));

      // Y el cambio queda guardado en el servidor, no solo en esta pestaña.
      const guardado = await page.evaluate(async () => {
        const res = await fetch('/api/my-progress?teacher=entrenador&dni=72000001');
        return (await res.json()).personaje;
      });
      comprobar('el personaje queda guardado en el servidor', guardado === 'base-5', `guardó «${guardado}»`);
    } catch (e) {
      comprobar('personaje: recorrido', false, e.message.split('\n')[0]);
      await page.screenshot({ path: 'tests/identidad-personaje.png', fullPage: true }).catch(() => {});
    } finally {
      await contexto.close();
    }
  }

  // ------------------------------------------------------------------
  // El avatar en el ranking
  // ------------------------------------------------------------------
  console.log('\n  El avatar en el ranking\n');
  {
    const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await contexto.newPage();

    try {
      await entrarComoColaborador(page, { dni: '72000002', nombre: 'Luis', apellido: 'Ramos', personaje: 'base-2' });
      await entrarAlModulo(page, 'm3');
      for (const accion of CAMINOS.m3) {
        await ejecutar(page, accion);
        await cerrarAviso(page);
      }
      comprobar('el módulo se completa', await estaCompletado(page));

      await page.getByRole('button', { name: /Volver a los módulos/ }).click();
      await page.waitForTimeout(900);
      await page.getByRole('button', { name: 'Ver el ranking' }).click();
      await page.waitForTimeout(1400);

      // El podio dibuja el avatar de la persona, no la insignia genérica. Se
      // busca por `data-avatar` y no por el nombre del archivo: al compilar, la
      // imagen pasa a llamarse `/assets/2-DiciOrFL.webp` y la carpeta se pierde.
      const avatar = page.locator('[data-avatar="base-2"]');
      comprobar('el ranking muestra el avatar del colaborador', await visible(avatar, 4000));
    } catch (e) {
      comprobar('ranking: recorrido', false, e.message.split('\n')[0]);
      await page.screenshot({ path: 'tests/identidad-ranking.png', fullPage: true }).catch(() => {});
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
