/**
 * Dos intentos por módulo, y salir a medias no cuesta ninguno.
 *
 * Las tres reglas que se comprueban, con el navegador de verdad:
 *
 *   1. Salir al menú a mitad de un módulo GUARDA el avance y no gasta intento;
 *      al volver, se retoma en el mismo paso, con los mismos errores.
 *   2. «Volver a empezar» sí gasta un intento (porque borra los errores), y
 *      deja de ofrecerse cuando ya no quedan.
 *   3. Con los dos intentos gastados el módulo se cierra, y el servidor rechaza
 *      un tercero aunque se le pida directamente.
 */
import {
  abrirNavegador,
  arrancarServidor,
  BASE,
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

const progreso = async (dni) => {
  const res = await fetch(`${BASE}/api/my-progress?teacher=entrenador&dni=${dni}`);
  return res.json();
};

const servidor = await arrancarServidor();
const navegador = await abrirNavegador();

try {
  // ------------------------------------------------------------------
  // 1. Salir a medias guarda el avance y no gasta intento
  // ------------------------------------------------------------------
  console.log('\n  Salir a medias');
  {
    const dni = '61000001';
    const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await contexto.newPage();

    await entrarComoColaborador(page, { dni });
    await entrarAlModulo(page, 'm3');

    // Tres pasos del camino y fuera.
    for (const accion of CAMINOS.m3.slice(0, 3)) {
      await ejecutar(page, accion);
      await cerrarAviso(page);
    }
    await page.getByRole('button', { name: 'Salir al menú guardando el avance' }).click();
    await page.getByRole('heading', { name: 'Tu turno en la caja' }).waitFor({ timeout: 8000 });
    await page.waitForTimeout(700);

    const p = await progreso(dni);
    comprobar('salir a medias NO gasta intento', (p.intentos?.m3 || 0) === 0, `intentos=${p.intentos?.m3}`);
    comprobar('el servidor guarda el módulo a medias', !!p.aMedias?.m3, JSON.stringify(p.aMedias));
    comprobar(
      'guarda el paso exacto en el que iba',
      p.aMedias?.m3?.currentStepIndex === 3,
      `paso guardado=${p.aMedias?.m3?.currentStepIndex}`
    );

    comprobar('la tarjeta del menú lo anuncia', await visible(page.getByText(/A medias · paso 4 de/), 4000));

    // Al volver a entrar, se retoma donde quedó y se puede terminar.
    await page.locator('button[aria-label^="Módulo 3 "]').first().click();
    comprobar('la ficha ofrece retomar', await visible(page.getByRole('button', { name: 'Retomar donde lo dejé' }), 5000));
    await page.getByRole('button', { name: 'Retomar donde lo dejé' }).click();
    await page.waitForTimeout(700);
    comprobar('retoma en el mismo paso', await visible(page.getByText(/Paso 4 ·/), 5000));

    for (const accion of CAMINOS.m3.slice(3)) {
      await ejecutar(page, accion);
      await cerrarAviso(page);
    }
    comprobar('el módulo retomado se puede terminar', await estaCompletado(page));

    const p2 = await progreso(dni);
    comprobar('terminarlo sí gasta un intento', (p2.intentos?.m3 || 0) === 1, `intentos=${p2.intentos?.m3}`);
    comprobar('al terminar ya no queda nada a medias', !p2.aMedias?.m3);

    await contexto.close();
  }

  // ------------------------------------------------------------------
  // 2. «Volver a empezar» gasta un intento y borra los errores
  // ------------------------------------------------------------------
  console.log('\n  Volver a empezar');
  {
    const dni = '61000002';
    const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await contexto.newPage();

    await entrarComoColaborador(page, { dni });
    await entrarAlModulo(page, 'm12');

    // Un error a propósito, para ver si el reinicio lo borra.
    await page.locator('#menu-btn-customers').first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    await cerrarAviso(page);
    comprobar('el error se contabiliza', await visible(page.getByText(/Errores 1/), 4000));

    await page.getByRole('button', { name: 'Volver a empezar el módulo desde cero' }).click();
    comprobar(
      'la confirmación avisa de que gasta la repetición',
      await visible(page.getByText(/Gasta tu repetición/), 4000)
    );
    await page.getByRole('button', { name: 'Volver a empezar', exact: true }).click();
    await page.waitForTimeout(900);

    comprobar('reiniciar borra los errores del intento', await visible(page.getByText(/Errores 0/), 4000));

    const p = await progreso(dni);
    comprobar('reiniciar gasta un intento', (p.intentos?.m12 || 0) === 1, `intentos=${p.intentos?.m12}`);

    // Con un intento gastado, reiniciar otra vez dejaría el módulo sin partida
    // que jugar: el botón desaparece.
    comprobar(
      'ya no se ofrece volver a empezar otra vez',
      (await page.getByRole('button', { name: 'Volver a empezar el módulo desde cero' }).count()) === 0
    );
    comprobar(
      'pero «Reacomodar» sigue disponible',
      (await page.getByRole('button', { name: 'Reacomodar las pantallas' }).count()) === 1
    );

    await contexto.close();
  }

  // ------------------------------------------------------------------
  // 3. Con los dos intentos gastados, el módulo se cierra
  // ------------------------------------------------------------------
  console.log('\n  Límite de dos intentos');
  {
    const dni = '61000003';
    const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await contexto.newPage();

    await entrarComoColaborador(page, { dni });

    for (const vuelta of [1, 2]) {
      await entrarAlModulo(page, 'm12');
      for (const accion of CAMINOS.m12) {
        await ejecutar(page, accion);
        await cerrarAviso(page);
      }
      await estaCompletado(page);
      await page.getByRole('button', { name: /Volver a los módulos|Volver e intentarlo otra vez/ }).click();
      await page.getByRole('heading', { name: 'Tu turno en la caja' }).waitFor({ timeout: 8000 });
      await page.waitForTimeout(600);

      const p = await progreso(dni);
      comprobar(`tras la vuelta ${vuelta} hay ${vuelta} intento(s) gastado(s)`, (p.intentos?.m12 || 0) === vuelta, `intentos=${p.intentos?.m12}`);
    }

    comprobar('la tarjeta avisa de que ya no quedan', await visible(page.getByText(/Sin oportunidades/), 5000));
    comprobar(
      'la tarjeta queda deshabilitada',
      await page.locator('button[aria-label^="Módulo 12 "]').first().isDisabled()
    );

    // Y el servidor no acepta un tercer intento aunque se le pida a mano.
    const tercero = await fetch(`${BASE}/api/submit-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attemptId: 'intento-de-cuela',
        studentName: 'Ana Torres',
        studentDni: dni,
        storeName: 'SP15',
        moduleId: 'm12',
        moduleTitle: 'Módulo 12 — Arqueo de caja',
        teacherUsername: 'entrenador',
        mistakeLog: [],
        processSteps: [],
        totalSeconds: 10,
      }),
    });
    comprobar('el servidor rechaza un tercer intento', tercero.status === 409, `HTTP ${tercero.status}`);

    await contexto.close();
  }
} finally {
  await navegador.close();
  pararServidor(servidor);
}

const fallos = pruebas.filter((p) => !p.ok).length;
console.log(`\n${pruebas.length - fallos}/${pruebas.length} comprobaciones correctas.`);
process.exit(fallos === 0 ? 0 : 1);
