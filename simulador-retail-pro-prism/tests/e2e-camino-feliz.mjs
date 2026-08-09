/**
 * Los 14 módulos se pueden terminar haciendo lo correcto.
 *
 * Es la base de todo lo demás: si esta prueba falla, la prueba anti-atascos no
 * significa nada, porque no sabría distinguir "se atascó" de "el camino que
 * conozco ya no existe".
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

const soloEste = process.argv[2];
const modulos = soloEste ? [soloEste] : MODULOS;

const servidor = await arrancarServidor();
const navegador = await abrirNavegador();
let fallos = 0;

try {
  for (const moduleId of modulos) {
    const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await contexto.newPage();
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));

    try {
      // Un DNI distinto por módulo: cada uno empieza con sus dos intentos intactos.
      await entrarComoColaborador(page, { dni: `9000${moduleId.replace('m', '').padStart(2, '0')}` });
      await entrarAlModulo(page, moduleId);

      for (const accion of CAMINOS[moduleId]) {
        await ejecutar(page, accion);
        await cerrarAviso(page);
      }

      // El contador de errores se lee ANTES de que salga la pantalla de
      // resumen. Hacer el módulo bien tiene que costar cero: si el conteo
      // estricto marca errores en el camino correcto, es que se pasó de frenada
      // y estaría bajando notas por hacer las cosas bien.
      const cabecera = await page.locator('text=/Errores \\d+/').first().textContent().catch(() => '');
      const erroresEnElCamino = Number(cabecera?.match(/Errores (\d+)/)?.[1] ?? 0);

      const listo = await estaCompletado(page);
      if (listo && erroresEnElCamino > 0) {
        fallos++;
        console.log(`  FALLA ${moduleId} — se completó, pero el camino correcto marcó ${erroresEnElCamino} error(es)`);
      } else if (listo) {
        console.log(`  ok   ${moduleId} — 0 errores`);
      } else {
        fallos++;
        console.log(`  FALLA ${moduleId} — no llegó a completarse`);
      }
      if (errores.length) console.log(`       errores de página: ${errores.join(' | ')}`);
    } catch (e) {
      fallos++;
      console.log(`  FALLA ${moduleId} — ${e.message.split('\n')[0]}`);
      await page.screenshot({ path: `tests/fallo-${moduleId}.png`, fullPage: true }).catch(() => {});
    } finally {
      await contexto.close();
    }
  }
} finally {
  await navegador.close();
  pararServidor(servidor);
}

console.log(fallos === 0 ? `\n${modulos.length}/${modulos.length} módulos completables.` : `\n${fallos} módulo(s) con problemas.`);
process.exit(fallos === 0 ? 0 : 1);
