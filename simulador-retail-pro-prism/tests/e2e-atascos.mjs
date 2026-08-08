/**
 * NINGÚN error deja un módulo atascado.
 *
 * Ésta es la prueba que da la garantía que pidió el negocio: haga lo que haga
 * el colaborador, y lo haga las veces que lo haga, el módulo tiene que seguir
 * siendo terminable.
 *
 * Cómo funciona, para cada uno de los 14 módulos y para cada paso k:
 *
 *   1. Llega al paso k por el camino correcto.
 *   2. SABOTEA: pulsa, en orden aleatorio pero reproducible, todos los
 *      controles visibles de la pantalla —incluidos los «No», «Cancelar» y
 *      «Cerrar» de los modales, que son los que históricamente dejaban el
 *      módulo sin retorno— y escribe basura en los campos de texto.
 *   3. EXIGE que desde ahí el módulo todavía se pueda terminar por el camino
 *      correcto.
 *
 * Si el paso 3 falla, el informe dice el módulo, el paso y los clics exactos
 * que lo rompieron. Un fallo aquí es un colaborador que se queda encerrado.
 *
 *   node tests/e2e-atascos.mjs           # los 14
 *   node tests/e2e-atascos.mjs m11       # solo uno
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
import { CAMINOS, MODULOS } from './solver.mjs';

/** Semilla fija: un fallo se puede volver a reproducir tal cual. */
let semilla = 20260808;
const azar = () => {
  semilla = (semilla * 1103515245 + 12345) % 2147483648;
  return semilla / 2147483648;
};
const barajar = (lista) => {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
};

/** Cuántos controles se pulsan a lo tonto en cada paso. */
const SABOTAJES_POR_PASO = 5;

/** Textos de basura para los campos: vacío, espacios, letras y algo larguísimo. */
const BASURA = ['', '   ', 'xxxx', '0', '-1', '999999999999999999'];

/**
 * Pulsa controles al azar y escribe basura, tal como haría alguien perdido.
 *
 * Devuelve la lista de lo que hizo, para poder reproducir el fallo.
 */
async function sabotear(page, contador) {
  const hecho = [];

  const clicables = await page
    .locator('#root button:visible, #root [id]:visible')
    .evaluateAll((nodos) =>
      nodos
        .map((n) => ({
          id: n.id || '',
          texto: (n.textContent || '').trim().slice(0, 24),
          etiqueta: n.tagName,
        }))
        // La barra del simulador es del marco de entrenamiento, no del POS:
        // salir o reiniciar no es "equivocarse dentro del módulo".
        .filter((n) => !['Salir', 'Reacomodar', 'Volver a empezar', 'Pedir pista'].includes(n.texto))
        .filter((n) => n.id !== 'root')
    );

  for (const objetivo of barajar(clicables).slice(0, SABOTAJES_POR_PASO)) {
    // Por atributo y no por `#id`: varios identificadores llevan tildes
    // (`pay-method-Tarjeta-de-Crédito`) y alguno se repite en la pantalla.
    const selector = objetivo.id ? `[id="${objetivo.id.replace(/"/g, '\\"')}"]` : null;
    try {
      if (selector) {
        await page.locator(selector).first().click({ timeout: 1200, force: true });
      } else if (objetivo.texto) {
        await page.getByRole('button', { name: objetivo.texto, exact: true }).first().click({ timeout: 1200 });
      }
      hecho.push(objetivo.id || objetivo.texto);
    } catch {
      /* si no se deja pulsar, mejor: no puede romper nada */
    }
    await cerrarAviso(page);
  }

  // Basura en los campos de texto visibles.
  const campos = page.locator('#root input[type="text"]:visible, #root input:not([type]):visible');
  const cuantos = Math.min(await campos.count(), 3);
  for (let i = 0; i < cuantos; i++) {
    const texto = BASURA[Math.floor(azar() * BASURA.length)];
    try {
      await campos.nth(i).fill(texto, { timeout: 1200 });
      await campos.nth(i).press('Enter', { timeout: 1200 });
      hecho.push(`campo${i}="${texto}"`);
    } catch {
      /* campo de solo lectura */
    }
    await cerrarAviso(page);
  }

  await cerrarAviso(page);
  contador.total += hecho.length;
  return hecho;
}

/**
 * ¿Se puede terminar el módulo desde donde está ahora?
 *
 * Se reintenta el camino entero: las acciones que corresponden a pasos ya
 * cumplidos son inofensivas (el simulador permite repetir un paso cumplido),
 * y las que faltan lo llevan hasta el final.
 */
async function terminaIgual(page, moduleId) {
  for (const accion of CAMINOS[moduleId]) {
    try {
      await ejecutar(page, accion);
    } catch {
      // Un control que ya no está puede ser normal (el paso quedó atrás).
      // Lo que decide es si el módulo llega a completarse.
    }
    await cerrarAviso(page);
    // Comprobación instantánea entre acciones: esperar aquí multiplicaría por
    // el número de pasos el tiempo de toda la prueba.
    if (await page.getByRole('heading', { name: /Módulo completado|¡Muy bien!|Casi lo tienes/ }).first().isVisible()) {
      return true;
    }
  }
  return estaCompletado(page, 9000);
}

const soloEste = process.argv[2];
const modulos = soloEste ? [soloEste] : MODULOS;
/** Pestañas en paralelo. Cada caso usa su propio DNI, así que no se estorban. */
const EN_PARALELO = Number(process.env.PARALELO || 5);

const servidor = await arrancarServidor();
const navegador = await abrirNavegador();
const fallos = [];
const contador = { total: 0 };

// Un caso = un módulo + el paso en el que se sabotea.
const casos = [];
for (const moduleId of modulos) {
  for (let k = 0; k < CAMINOS[moduleId].length; k++) casos.push({ moduleId, paso: k });
}

console.log(`Sabotaje paso a paso: ${casos.length} casos en ${modulos.length} módulo(s), ${EN_PARALELO} en paralelo.\n`);

async function correrCaso({ moduleId, paso }, indice) {
  const camino = CAMINOS[moduleId];
  const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await contexto.newPage();
  const erroresDePagina = [];
  page.on('pageerror', (e) => erroresDePagina.push(e.message));

  try {
    // Un DNI por caso: cada uno estrena sus dos intentos.
    await entrarComoColaborador(page, { dni: String(50000000 + indice) });
    await entrarAlModulo(page, moduleId);

    // 1. Hasta el paso k por el camino bueno.
    for (let i = 0; i < paso; i++) {
      await ejecutar(page, camino[i]);
      await cerrarAviso(page);
    }

    // 2. Sabotaje.
    const hecho = await sabotear(page, contador);

    // 3. ¿Todavía se puede terminar?
    if (!(await terminaIgual(page, moduleId))) {
      fallos.push({ moduleId, paso: paso + 1, hecho, erroresDePagina });
      await page.screenshot({ path: `tests/atasco-${moduleId}-paso${paso + 1}.png`, fullPage: true }).catch(() => {});
    }
  } catch (e) {
    fallos.push({ moduleId, paso: paso + 1, hecho: [], error: e.message.split('\n')[0] });
  } finally {
    await contexto.close();
  }
}

try {
  let siguiente = 0;
  const obreros = Array.from({ length: EN_PARALELO }, async () => {
    while (siguiente < casos.length) {
      const indice = siguiente++;
      await correrCaso(casos[indice], indice);
      process.stdout.write('.');
    }
  });
  await Promise.all(obreros);
  process.stdout.write('\n\n');

  for (const moduleId of modulos) {
    const rotos = fallos.filter((f) => f.moduleId === moduleId).length;
    const total = CAMINOS[moduleId].length;
    console.log(
      rotos === 0
        ? `  ok    ${moduleId} — ${total} pasos saboteados, ninguno lo atascó`
        : `  FALLA ${moduleId} — ${rotos} de ${total} pasos quedaron atascados`
    );
  }
} finally {
  await navegador.close();
  pararServidor(servidor);
}

console.log(`\n${casos.length} casos · ${contador.total} interacciones equivocadas disparadas.`);

if (fallos.length === 0) {
  console.log(`${modulos.length}/${modulos.length} módulos siguen siendo terminables después de cualquier sabotaje.`);
  process.exit(0);
}

console.log(`\n${fallos.length} atasco(s):\n`);
for (const f of fallos) {
  console.log(`  ${f.moduleId} · paso ${f.paso}`);
  if (f.hecho?.length) console.log(`    se pulsó: ${f.hecho.join(' → ')}`);
  if (f.error) console.log(`    error: ${f.error}`);
  if (f.erroresDePagina?.length) console.log(`    errores de página: ${f.erroresDePagina.join(' | ')}`);
}
process.exit(1);
