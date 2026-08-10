/**
 * Todo se ve bien en un celular.
 *
 * Recorre las pantallas del colaborador a dos tamaños de teléfono y comprueba
 * en cada una cuatro cosas que, cuando fallan, dejan la pantalla inservible:
 *
 *   1. Que la página no se desplace en horizontal.
 *   2. Que ningún texto quede cortado dentro de su caja.
 *   3. Que todo lo que se puede pulsar mida al menos 40 px (el dedo).
 *   4. Que la barra del simulador no se coma la pantalla.
 *
 * La cuarta salió de un fallo real: al añadir el botón «Reacomodar» pasaron a
 * haber cinco controles en la barra, el título dejó de recortarse y «Módulo 3 —
 * Proceso de venta pago con efectivo» se partía en cinco líneas.
 *
 *   node tests/e2e-movil.mjs
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
import { CAMINOS, MODULOS } from './solver.mjs';

/** Los dos teléfonos que importan: un Android pequeño y un iPhone corriente. */
const TELEFONOS = [
  { nombre: 'Android 360×740', width: 360, height: 740 },
  { nombre: 'iPhone 390×844', width: 390, height: 844 },
];

/** Alto máximo de la barra del simulador. Más que esto le roba sitio al POS. */
const ALTO_MAXIMO_BARRA = 72;
/** Lado mínimo de algo que se pulsa con el dedo. */
const LADO_MINIMO_TACTIL = 40;

const problemas = [];
const anota = (telefono, pantalla, queja) => problemas.push(`${telefono} · ${pantalla}: ${queja}`);

/** Las cuatro comprobaciones, sobre lo que haya en pantalla ahora mismo. */
async function revisar(page, telefono, pantalla, { conBarra = false } = {}) {
  const informe = await page.evaluate(
    ({ ladoMinimo }) => {
      const raiz = document.documentElement;
      const desborde = raiz.scrollWidth - raiz.clientWidth;

      // Texto cortado: la caja es más estrecha que su contenido. Se ignora lo
      // que desborda a propósito (scroll horizontal declarado y el `truncate`,
      // que corta con puntos suspensivos porque así se ha decidido).
      const cortados = [];
      for (const el of document.querySelectorAll('h1,h2,h3,p,span,button,a,li,label')) {
        const estilo = getComputedStyle(el);
        if (estilo.overflowX === 'auto' || estilo.overflowX === 'scroll') continue;
        if (estilo.textOverflow === 'ellipsis') continue;
        if (estilo.display === 'none' || estilo.visibility === 'hidden') continue;
        if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
          cortados.push(`${el.tagName.toLowerCase()}«${(el.textContent || '').trim().slice(0, 30)}»`);
        }
      }

      // Objetivos táctiles. Solo los del marco de entrenamiento: las pantallas
      // del POS replican el sistema real y se usan con zoom, a propósito.
      const pequenos = [];
      for (const el of document.querySelectorAll('button, a[href]')) {
        // Las pantallas del POS replican el sistema real y se usan con zoom:
        // agrandarles los botones sería falsear justo lo que se enseña.
        if (el.closest('[data-pos]')) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.height < ladoMinimo - 0.5 || r.width < ladoMinimo - 0.5) {
          pequenos.push(`«${(el.textContent || '').trim().slice(0, 24)}» ${Math.round(r.width)}×${Math.round(r.height)}`);
        }
      }

      const barra = document.querySelector('[data-barra-simulador]');
      return {
        desborde,
        cortados: cortados.slice(0, 5),
        pequenos: pequenos.slice(0, 5),
        altoBarra: barra ? Math.round(barra.getBoundingClientRect().height) : null,
      };
    },
    { ladoMinimo: LADO_MINIMO_TACTIL }
  );

  if (informe.desborde > 1) anota(telefono, pantalla, `la página se desplaza ${informe.desborde} px en horizontal`);
  if (informe.cortados.length) anota(telefono, pantalla, `texto cortado en ${informe.cortados.join(', ')}`);
  if (informe.pequenos.length) anota(telefono, pantalla, `botones por debajo de ${LADO_MINIMO_TACTIL} px: ${informe.pequenos.join(', ')}`);
  if (conBarra && informe.altoBarra !== null && informe.altoBarra > ALTO_MAXIMO_BARRA) {
    anota(telefono, pantalla, `la barra del simulador mide ${informe.altoBarra} px (máximo ${ALTO_MAXIMO_BARRA})`);
  }

  const marca = `${telefono.replace(/[^\w]/g, '')}-${pantalla}`;
  await page.screenshot({ path: `tests/movil/${marca}.png`, fullPage: true }).catch(() => {});
  console.log(`    ${pantalla}`);
}

/** Atraviesa el aviso de «Gira tu teléfono», que en vertical sale a propósito. */
async function entrarAlSistema(page) {
  const seguir = page.getByRole('button', { name: 'Continuar así de todos modos' });
  if (await visible(seguir, 2500)) await seguir.click();
}

const servidor = await arrancarServidor();
const navegador = await abrirNavegador();

try {
  for (const telefono of TELEFONOS) {
    console.log(`\n  ${telefono.nombre}`);
    const contexto = await navegador.newContext({
      viewport: { width: telefono.width, height: telefono.height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await contexto.newPage();
    const dni = String(70000000 + telefono.width);

    // --- Identificarse ---
    await page.goto(`${BASE}/?teacher=entrenador`, { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Ej: Ana').fill('Carlos');
    await page.getByPlaceholder('Ej: Torres').fill('Córdova');
    await page.getByPlaceholder('Ej: 71234567').fill(dni);
    await page.getByPlaceholder('Ej: SP15 Mayolo').fill('SP15 Mayolo');
    await revisar(page, telefono.nombre, 'identificarse');
    await page.getByRole('button', { name: 'Continuar' }).click();

    // --- Elección de personaje ---
    await visible(page.locator('[data-personaje]').first(), 6000);
    await revisar(page, telefono.nombre, 'elegir-personaje');
    await page.locator('[data-personaje="base-1"]').click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // --- Preámbulo del relato ---
    await visible(page.getByRole('button', { name: 'Empezar el turno' }), 6000);
    await revisar(page, telefono.nombre, 'preambulo');
    await page.getByRole('button', { name: 'Empezar el turno' }).click();
    await page.getByRole('heading', { name: 'Tu turno en la caja' }).waitFor({ timeout: 8000 });

    // --- Menú ---
    await page.waitForTimeout(600);
    await revisar(page, telefono.nombre, 'menu');

    // --- Ranking (vacío al principio) ---
    await page.getByRole('button', { name: 'Ver el ranking' }).click();
    await page.waitForTimeout(900);
    await revisar(page, telefono.nombre, 'ranking-vacio');
    await page.getByRole('button', { name: '← Volver a los módulos' }).click();
    await page.waitForTimeout(500);

    // --- Ficha del caso ---
    await page.locator('button[aria-label^="Módulo 3 "]').first().click();
    await visible(page.getByRole('button', { name: 'Entrar al sistema' }), 6000);
    await revisar(page, telefono.nombre, 'ficha');

    // --- Dentro del simulador ---
    await page.getByRole('button', { name: 'Entrar al sistema' }).click();
    await page.waitForTimeout(900);
    await revisar(page, telefono.nombre, 'simulador-aviso-rotar', { conBarra: true });
    await entrarAlSistema(page);
    await page.waitForTimeout(600);
    await revisar(page, telefono.nombre, 'simulador', { conBarra: true });

    // El menú «⋯» tiene que dar acceso a la salida garantizada en dos toques.
    const mas = page.getByRole('button', { name: 'Más opciones' });
    if (await visible(mas, 2000)) {
      await mas.click();
      await page.waitForTimeout(300);
      const reacomodar = page.getByRole('button', { name: /Reacomodar pantallas/ });
      if (!(await visible(reacomodar, 2000))) {
        anota(telefono.nombre, 'simulador', 'el menú «⋯» no ofrece «Reacomodar pantallas»');
      }
      await revisar(page, telefono.nombre, 'simulador-menu', { conBarra: true });
      await page.keyboard.press('Escape').catch(() => {});
      await page.mouse.click(5, 400).catch(() => {});
      await page.waitForTimeout(300);
    } else {
      anota(telefono.nombre, 'simulador', 'no aparece el menú «⋯» en pantalla estrecha');
    }

    // --- Cajón de la situación ---
    await page.getByRole('button', { name: 'Caso' }).click();
    await page.waitForTimeout(600);
    await revisar(page, telefono.nombre, 'cajon-situacion');
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await page.waitForTimeout(400);

    // --- Módulo completado ---
    for (const accion of CAMINOS.m3) {
      await ejecutar(page, accion);
      await cerrarAviso(page);
    }
    await estaCompletado(page);
    await revisar(page, telefono.nombre, 'modulo-completado');
    await page.getByRole('button', { name: /Volver a los módulos|Volver e intentarlo otra vez/ }).click();
    await page.getByRole('heading', { name: 'Tu turno en la caja' }).waitFor({ timeout: 8000 });

    // --- Ranking ya con alguien dentro ---
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Ver el ranking' }).click();
    await page.waitForTimeout(1200);
    await revisar(page, telefono.nombre, 'ranking');
    await page.getByRole('button', { name: '← Volver a los módulos' }).click();
    await page.waitForTimeout(500);

    // --- El resto del turno, para llegar al cierre ---
    for (const moduleId of MODULOS.filter((m) => m !== 'm3')) {
      await entrarAlModulo(page, moduleId);
      await entrarAlSistema(page);
      for (const accion of CAMINOS[moduleId]) {
        await ejecutar(page, accion);
        await cerrarAviso(page);
      }
      await estaCompletado(page);
      await page.getByRole('button', { name: /Volver a los módulos|Volver e intentarlo otra vez/ }).click();
      await page.getByRole('heading', { name: 'Tu turno en la caja' }).waitFor({ timeout: 10000 });
    }

    // --- Aviso de cierre y telón final ---
    await page.waitForTimeout(800);
    await revisar(page, telefono.nombre, 'aviso-cierre');
    await page.getByRole('button', { name: 'Cerrar el turno' }).click();
    await page.waitForTimeout(2600);
    await revisar(page, telefono.nombre, 'telon-final');

    await contexto.close();
  }
} finally {
  await navegador.close();
  pararServidor(servidor);
}

console.log('');
if (problemas.length === 0) {
  console.log('Todas las pantallas se ven bien en los dos teléfonos.');
  process.exit(0);
}
for (const p of problemas) console.log(`  FALLA ${p}`);
console.log(`\n${problemas.length} problema(s) de visualización en celular.`);
process.exit(1);
